/**
 * Core client for NAMELESS Core media engine
 *
 * This module provides a TypeScript interface to the nameless-core binary
 * which handles screen capture, LiveKit connection, and annotations.
 * Communication is via socket IPC (Unix socket on macOS/Linux, TCP on Windows).
 */

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

// UnlistenFn is the return type of listen() - a function to call to stop listening
type UnlistenFn = () => void

// ============================================================================
// Types (matching Rust Core socket protocol)
// ============================================================================

export interface ScreenInfo {
  id: string
  name: string
  /** Display X position (for multi-monitor setups) */
  x: number
  /** Display Y position (for multi-monitor setups) */
  y: number
  width: number
  height: number
  is_primary: boolean
  /** Base64-encoded JPEG thumbnail (~320x180 pixels) */
  thumbnail?: string
}

// Note: WindowInfo was removed - only screen capture is supported.
// Window capture requires platform-specific APIs not yet implemented.

export interface ParticipantData {
  id: string
  name: string
  is_local: boolean
  role: 'host' | 'participant'
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export type PermissionStatus = 'granted' | 'denied' | 'not_determined' | 'restricted' | 'not_applicable'

export interface PermissionState {
  screen_recording: PermissionStatus
  microphone: PermissionStatus
  camera: PermissionStatus
  accessibility: PermissionStatus
}

export interface CaptureConfig {
  width: number
  height: number
  framerate: number
  bitrate: number
}

export type SourceType = 'screen' // Window capture not supported

export type FrameFormat = 'jpeg' | 'rgba' | 'nv12'

export interface VideoFrame {
  participant_id: string
  track_id: string
  width: number
  height: number
  timestamp: number
  format: FrameFormat
  frame_data: string // Base64 encoded
}

// ============================================================================
// Outgoing Messages (from Core to WebView)
// ============================================================================

export type CoreMessage =
  | { type: 'available_content'; screens: ScreenInfo[] }
  | { type: 'participant_joined'; participant: ParticipantData }
  | { type: 'participant_left'; participant_id: string }
  | { type: 'connection_state_changed'; state: ConnectionState }
  | { type: 'screen_share_started'; sharer_id: string }
  | { type: 'screen_share_stopped' }
  | { type: 'video_frame'; participant_id: string; track_id: string; width: number; height: number; timestamp: number; format: FrameFormat; frame_data: string }
  | { type: 'permission_state'; state: PermissionState }
  | { type: 'pong' }
  | { type: 'error'; code: string; message: string }

// ============================================================================
// Incoming Messages (from WebView to Core)
// ============================================================================

type IncomingMessage =
  | { type: 'join_room'; server_url: string; token: string }
  | { type: 'leave_room' }
  | { type: 'get_available_content' }
  | { type: 'start_screen_share'; source_id: string; source_type: SourceType; config?: CaptureConfig }
  | { type: 'stop_screen_share' }
  | { type: 'send_annotation'; stroke_id: string; tool: string; color: { r: number; g: number; b: number; a: number }; points: { x: number; y: number; pressure?: number }[] }
  | { type: 'delete_annotation'; stroke_id: string }
  | { type: 'clear_annotations' }
  | { type: 'cursor_move'; x: number; y: number }
  | { type: 'cursor_hide' }
  | { type: 'set_mic_muted'; muted: boolean }
  | { type: 'set_camera_enabled'; enabled: boolean }
  | { type: 'set_audio_input_device'; device_id: string }
  | { type: 'set_video_input_device'; device_id: string }
  | { type: 'check_permissions' }
  | { type: 'request_screen_recording_permission' }
  | { type: 'ping' }
  | { type: 'shutdown' }
  | { type: 'test_overlay' }

// ============================================================================
// Core Client
// ============================================================================

export type MessageHandler = (message: CoreMessage) => void

/**
 * Client for the NAMELESS Core media engine.
 *
 * Core handles:
 * - Screen capture (via LiveKit DesktopCapturer)
 * - LiveKit room connection
 * - Annotations (via DataTracks)
 * - Remote cursors
 *
 * Communication is via socket IPC. The Tauri layer emits 'core-message' events
 * when messages arrive from Core.
 */
export type TerminationHandler = (code: number | null) => void

export class CoreClient {
  private running = false
  private socketPath: string | null = null
  private messageHandlers: MessageHandler[] = []
  private terminationHandlers: TerminationHandler[] = []
  private unlisten: UnlistenFn | null = null
  private unlistenTermination: UnlistenFn | null = null
  private pendingRequests = new Map<string, {
    resolve: (value: unknown) => void
    reject: (reason: Error) => void
    timeout: ReturnType<typeof setTimeout>
  }>()
  private restartAttempts = 0
  private maxRestartAttempts = 3
  private restartDelayMs = 1000

  /**
   * Start the Core process
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Core already running')
    }

    // Spawn Core and connect via socket
    this.socketPath = await invoke<string>('spawn_core')
    this.running = true
    this.restartAttempts = 0

    // Listen for messages from Core (via Tauri events)
    this.unlisten = await listen<string>('core-message', (event) => {
      try {
        const message = JSON.parse(event.payload) as CoreMessage
        this.handleMessage(message)
      } catch (error) {
        console.error('Failed to parse Core message:', error)
      }
    })

    // Listen for Core termination events
    this.unlistenTermination = await listen<number | null>('core-terminated', (event) => {
      this.handleTermination(event.payload)
    })
  }

  /**
   * Handle Core termination (crash or unexpected exit)
   */
  private async handleTermination(code: number | null): Promise<void> {
    const wasRunning = this.running
    this.running = false
    this.socketPath = null

    console.warn(`Core terminated with code: ${code}`)

    // Notify termination handlers
    for (const handler of this.terminationHandlers) {
      try {
        handler(code)
      } catch (error) {
        console.error('Termination handler error:', error)
      }
    }

    // Attempt restart if it was an unexpected termination (non-zero code or signal)
    // Code 0 means graceful shutdown, null means killed by signal
    if (wasRunning && code !== 0 && this.restartAttempts < this.maxRestartAttempts) {
      this.restartAttempts++
      console.log(`Attempting Core restart (attempt ${this.restartAttempts}/${this.maxRestartAttempts})...`)

      // Wait before restart
      await new Promise(resolve => setTimeout(resolve, this.restartDelayMs))

      try {
        // Clean up old listeners
        if (this.unlisten) {
          this.unlisten()
          this.unlisten = null
        }
        if (this.unlistenTermination) {
          this.unlistenTermination()
          this.unlistenTermination = null
        }

        // Attempt restart
        await this.start()
        console.log('Core restarted successfully')
      } catch (error) {
        console.error('Failed to restart Core:', error)
        // Notify handlers about restart failure
        this.handleMessage({
          type: 'error',
          code: 'CORE_RESTART_FAILED',
          message: `Failed to restart Core after ${this.restartAttempts} attempts: ${error}`,
        })
      }
    } else if (wasRunning && code !== 0) {
      // Max restart attempts exceeded
      this.handleMessage({
        type: 'error',
        code: 'CORE_CRASHED',
        message: `Core crashed and could not be restarted after ${this.maxRestartAttempts} attempts`,
      })
    }
  }

  /**
   * Register a termination handler
   */
  onTermination(handler: TerminationHandler): () => void {
    this.terminationHandlers.push(handler)
    return () => {
      const index = this.terminationHandlers.indexOf(handler)
      if (index >= 0) {
        this.terminationHandlers.splice(index, 1)
      }
    }
  }

  /**
   * Stop the Core process
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return
    }

    // Unsubscribe from events
    if (this.unlisten) {
      this.unlisten()
      this.unlisten = null
    }
    if (this.unlistenTermination) {
      this.unlistenTermination()
      this.unlistenTermination = null
    }

    // Kill Core process
    await invoke('kill_core')
    this.running = false
    this.socketPath = null
    this.restartAttempts = 0

    // Clear pending requests
    for (const [, request] of this.pendingRequests) {
      clearTimeout(request.timeout)
      request.reject(new Error('Core stopped'))
    }
    this.pendingRequests.clear()
  }

  /**
   * Send a message to Core
   */
  private async sendMessage(message: IncomingMessage): Promise<void> {
    if (!this.running) {
      throw new Error('Core not running')
    }

    const json = JSON.stringify(message)
    console.log('%c[Core ←]', 'color: #4CAF50; font-weight: bold', message.type, message)
    await invoke('send_core_message', { message: json })
  }

  /**
   * Handle an incoming message from Core
   */
  private handleMessage(message: CoreMessage): void {
    // Log incoming message with color coding
    const color = message.type === 'error' ? '#f44336' : '#2196F3'
    console.log(`%c[Core →]`, `color: ${color}; font-weight: bold`, message.type, message)

    // Notify all handlers
    for (const handler of this.messageHandlers) {
      try {
        handler(message)
      } catch (error) {
        console.error('Message handler error:', error)
      }
    }
  }

  /**
   * Register a message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler)
    return () => {
      const index = this.messageHandlers.indexOf(handler)
      if (index >= 0) {
        this.messageHandlers.splice(index, 1)
      }
    }
  }

  /**
   * Check if Core is running
   */
  isRunning(): boolean {
    return this.running
  }

  /**
   * Get the socket path
   */
  getSocketPath(): string | null {
    return this.socketPath
  }

  // ========================================================================
  // Room Operations
  // ========================================================================

  /**
   * Join a LiveKit room
   */
  async joinRoom(serverUrl: string, token: string): Promise<void> {
    await this.sendMessage({
      type: 'join_room',
      server_url: serverUrl,
      token,
    })
  }

  /**
   * Leave the current room
   */
  async leaveRoom(): Promise<void> {
    await this.sendMessage({ type: 'leave_room' })
  }

  // ========================================================================
  // Screen Share Operations
  // ========================================================================

  /**
   * Get available screens and windows for capture
   */
  async getAvailableContent(): Promise<void> {
    await this.sendMessage({ type: 'get_available_content' })
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(
    sourceId: string,
    sourceType: SourceType,
    config?: Partial<CaptureConfig>
  ): Promise<void> {
    const fullConfig: CaptureConfig = {
      width: 1920,
      height: 1080,
      framerate: 60,
      bitrate: 6_000_000,
      ...config,
    }

    await this.sendMessage({
      type: 'start_screen_share',
      source_id: sourceId,
      source_type: sourceType,
      config: fullConfig,
    })
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    await this.sendMessage({ type: 'stop_screen_share' })
  }

  // ========================================================================
  // Permission Operations
  // ========================================================================

  /**
   * Check current permission state
   */
  async checkPermissions(): Promise<void> {
    await this.sendMessage({ type: 'check_permissions' })
  }

  /**
   * Request screen recording permission (macOS)
   */
  async requestScreenRecordingPermission(): Promise<void> {
    await this.sendMessage({ type: 'request_screen_recording_permission' })
  }

  // ========================================================================
  // Annotation Operations
  // ========================================================================

  /**
   * Send an annotation stroke
   */
  async sendAnnotation(
    strokeId: string,
    tool: 'pen' | 'highlighter' | 'eraser',
    color: { r: number; g: number; b: number; a: number },
    points: { x: number; y: number; pressure?: number }[]
  ): Promise<void> {
    await this.sendMessage({
      type: 'send_annotation',
      stroke_id: strokeId,
      tool,
      color,
      points,
    })
  }

  /**
   * Delete an annotation
   */
  async deleteAnnotation(strokeId: string): Promise<void> {
    await this.sendMessage({
      type: 'delete_annotation',
      stroke_id: strokeId,
    })
  }

  /**
   * Clear all annotations
   */
  async clearAnnotations(): Promise<void> {
    await this.sendMessage({ type: 'clear_annotations' })
  }

  // ========================================================================
  // Cursor Operations
  // ========================================================================

  /**
   * Send cursor position (normalized 0-1)
   */
  async moveCursor(x: number, y: number): Promise<void> {
    await this.sendMessage({ type: 'cursor_move', x, y })
  }

  /**
   * Hide cursor
   */
  async hideCursor(): Promise<void> {
    await this.sendMessage({ type: 'cursor_hide' })
  }

  // ========================================================================
  // Media Controls
  // ========================================================================

  /**
   * Set microphone muted state
   */
  async setMicMuted(muted: boolean): Promise<void> {
    await this.sendMessage({ type: 'set_mic_muted', muted })
  }

  /**
   * Set camera enabled state
   */
  async setCameraEnabled(enabled: boolean): Promise<void> {
    await this.sendMessage({ type: 'set_camera_enabled', enabled })
  }

  /**
   * Set audio input device
   */
  async setAudioInputDevice(deviceId: string): Promise<void> {
    await this.sendMessage({ type: 'set_audio_input_device', device_id: deviceId })
  }

  /**
   * Set video input device
   */
  async setVideoInputDevice(deviceId: string): Promise<void> {
    await this.sendMessage({ type: 'set_video_input_device', device_id: deviceId })
  }

  // ========================================================================
  // Utility
  // ========================================================================

  /**
   * Ping Core (for health check)
   */
  async ping(): Promise<void> {
    await this.sendMessage({ type: 'ping' })
  }

  // ========================================================================
  // Dev Mode
  // ========================================================================

  /**
   * Test overlay rendering (dev mode only)
   * Creates and shows the wgpu overlay with a test rectangle
   */
  async testOverlay(): Promise<void> {
    await this.sendMessage({ type: 'test_overlay' })
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let coreInstance: CoreClient | null = null

/**
 * Get the shared Core client instance
 */
export function getCoreClient(): CoreClient {
  if (!coreInstance) {
    coreInstance = new CoreClient()
  }
  return coreInstance
}

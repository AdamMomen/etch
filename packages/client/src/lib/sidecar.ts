/**
 * Sidecar client for native screen capture on macOS/Linux
 *
 * @deprecated Use getCoreClient() from '@/lib/core' instead.
 * This module is a compatibility layer that wraps the Core client.
 *
 * The old sidecar approach using xcap has been replaced with a Core-centric
 * architecture using Hopp's LiveKit fork with DesktopCapturer for 60fps capture.
 */

import { getCoreClient } from './core'
import type {
  CoreClient,
  CoreMessage,
  ScreenInfo,
  PermissionState,
  CaptureConfig,
} from './core'

// Re-export types for backward compatibility
export type { ScreenInfo, CaptureConfig }

// Note: Window capture not supported - only screens are enumerated
export interface SourcesResponse {
  screens: ScreenInfo[]
}

export interface PermissionStatus {
  granted: boolean
  platform: string
  can_request: boolean
}

export interface FrameData {
  data: string // Base64 encoded
  timestamp: number
  keyframe: boolean
  width: number
  height: number
}

export interface SidecarError {
  code: string
  message: string
  recoverable: boolean
}

// Pending request waiting for a response
interface PendingRequest<T> {
  resolve: (value: T) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

/**
 * @deprecated Use CoreClient from '@/lib/core' instead.
 * This class wraps CoreClient for backward compatibility.
 */
export class SidecarClient {
  private core: CoreClient
  private frameCallbacks: ((frame: FrameData) => void)[] = []
  private errorCallbacks: ((error: SidecarError) => void)[] = []
  private unsubscribe: (() => void) | null = null

  // Event-driven request tracking (no polling!)
  private pendingSourcesRequest: PendingRequest<SourcesResponse> | null = null
  private pendingPermissionRequest: PendingRequest<PermissionState> | null = null

  constructor() {
    this.core = getCoreClient()
  }

  /**
   * Start the Core process
   */
  async start(): Promise<void> {
    if (this.core.isRunning()) {
      return
    }

    await this.core.start()

    // Subscribe to messages - event-driven, no polling
    this.unsubscribe = this.core.onMessage((message: CoreMessage) => {
      this.handleMessage(message)
    })
  }

  /**
   * Handle incoming messages from Core - resolves pending Promises
   */
  private handleMessage(message: CoreMessage): void {
    switch (message.type) {
      case 'available_content':
        // Resolve pending sources request (window capture not supported)
        if (this.pendingSourcesRequest) {
          clearTimeout(this.pendingSourcesRequest.timeout)
          this.pendingSourcesRequest.resolve({
            screens: message.screens,
          })
          this.pendingSourcesRequest = null
        }
        break

      case 'permission_state':
        // Resolve pending permission request
        if (this.pendingPermissionRequest) {
          clearTimeout(this.pendingPermissionRequest.timeout)
          this.pendingPermissionRequest.resolve(message.state)
          this.pendingPermissionRequest = null
        }
        break

      case 'video_frame':
        // Stream video frames to callbacks
        const frameData: FrameData = {
          data: message.frame_data,
          timestamp: message.timestamp,
          keyframe: true,
          width: message.width,
          height: message.height,
        }
        this.frameCallbacks.forEach((cb) => cb(frameData))
        break

      case 'error':
        const error: SidecarError = {
          code: message.code,
          message: message.message,
          recoverable: true,
        }

        // Reject any pending requests on error
        if (this.pendingSourcesRequest) {
          clearTimeout(this.pendingSourcesRequest.timeout)
          this.pendingSourcesRequest.reject(new Error(message.message))
          this.pendingSourcesRequest = null
        }
        if (this.pendingPermissionRequest) {
          clearTimeout(this.pendingPermissionRequest.timeout)
          this.pendingPermissionRequest.reject(new Error(message.message))
          this.pendingPermissionRequest = null
        }

        // Notify error callbacks
        this.errorCallbacks.forEach((cb) => cb(error))
        break
    }
  }

  /**
   * Stop the Core process
   */
  async stop(): Promise<void> {
    if (!this.core.isRunning()) {
      return
    }

    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }

    // Reject any pending requests
    if (this.pendingSourcesRequest) {
      clearTimeout(this.pendingSourcesRequest.timeout)
      this.pendingSourcesRequest.reject(new Error('Core stopped'))
      this.pendingSourcesRequest = null
    }
    if (this.pendingPermissionRequest) {
      clearTimeout(this.pendingPermissionRequest.timeout)
      this.pendingPermissionRequest.reject(new Error('Core stopped'))
      this.pendingPermissionRequest = null
    }

    await this.core.stop()
    this.frameCallbacks = []
    this.errorCallbacks = []
  }

  /**
   * Enumerate available screens and windows
   * Uses event-driven Promise resolution - no polling
   */
  async enumerateSources(): Promise<SourcesResponse> {
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingSourcesRequest = null
        reject(new Error('Timeout waiting for available content'))
      }, 5000)

      // Store the pending request
      this.pendingSourcesRequest = { resolve, reject, timeout }

      // Send request to Core - response will arrive via handleMessage
      this.core.getAvailableContent().catch((err) => {
        clearTimeout(timeout)
        this.pendingSourcesRequest = null
        reject(err)
      })
    })
  }

  /**
   * Check screen recording permission
   * Uses event-driven Promise resolution - no polling
   */
  async checkPermission(): Promise<PermissionStatus> {
    const state = await new Promise<PermissionState>((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingPermissionRequest = null
        reject(new Error('Timeout waiting for permission state'))
      }, 5000)

      // Store the pending request
      this.pendingPermissionRequest = { resolve, reject, timeout }

      // Send request to Core - response will arrive via handleMessage
      this.core.checkPermissions().catch((err) => {
        clearTimeout(timeout)
        this.pendingPermissionRequest = null
        reject(err)
      })
    })

    return {
      granted: state.screen_recording === 'granted',
      platform: getPlatformName(),
      can_request: state.screen_recording === 'not_determined',
    }
  }

  /**
   * Request screen recording permission
   * Uses event-driven Promise resolution - no polling
   */
  async requestPermission(): Promise<PermissionStatus> {
    const state = await new Promise<PermissionState>((resolve, reject) => {
      // Set up timeout (longer for permission request as it may show dialog)
      const timeout = setTimeout(() => {
        this.pendingPermissionRequest = null
        reject(new Error('Timeout waiting for permission response'))
      }, 10000)

      // Store the pending request
      this.pendingPermissionRequest = { resolve, reject, timeout }

      // Send request to Core - response will arrive via handleMessage
      this.core.requestScreenRecordingPermission().catch((err) => {
        clearTimeout(timeout)
        this.pendingPermissionRequest = null
        reject(err)
      })
    })

    return {
      granted: state.screen_recording === 'granted',
      platform: getPlatformName(),
      can_request: false,
    }
  }

  /**
   * Start capturing from a source
   * Note: Only 'screen' type is supported - window capture is not yet implemented
   */
  async startCapture(
    sourceId: string,
    sourceType: 'screen',
    config?: Partial<CaptureConfig>
  ): Promise<void> {
    await this.core.startScreenShare(sourceId, sourceType, config)
  }

  /**
   * Stop the current capture
   */
  async stopCapture(): Promise<void> {
    await this.core.stopScreenShare()
  }

  /**
   * Register a callback for frame data (streaming)
   */
  onFrame(callback: (frame: FrameData) => void): () => void {
    this.frameCallbacks.push(callback)
    return () => {
      const index = this.frameCallbacks.indexOf(callback)
      if (index >= 0) {
        this.frameCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Register a callback for errors (streaming)
   */
  onError(callback: (error: SidecarError) => void): () => void {
    this.errorCallbacks.push(callback)
    return () => {
      const index = this.errorCallbacks.indexOf(callback)
      if (index >= 0) {
        this.errorCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Check if Core is running
   */
  isRunning(): boolean {
    return this.core.isRunning()
  }
}

// Helper to get platform name
function getPlatformName(): string {
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes('mac')) return 'macos'
  if (userAgent.includes('linux')) return 'linux'
  if (userAgent.includes('win')) return 'windows'
  return 'unknown'
}

// Singleton instance
let sidecarInstance: SidecarClient | null = null

/**
 * @deprecated Use getCoreClient() from '@/lib/core' instead.
 * Get the shared sidecar client instance (compatibility wrapper around Core)
 */
export function getSidecarClient(): SidecarClient {
  if (!sidecarInstance) {
    sidecarInstance = new SidecarClient()
  }
  return sidecarInstance
}

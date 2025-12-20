/**
 * BroadcastChannel-based communication layer for floating control bar (Story 3.7)
 *
 * Enables state sync and command passing between main window and floating window.
 * Main window owns LiveKit connection; floating window sends commands via this channel.
 */

import type { Participant } from '@nameless/shared'

// Channel name for cross-window communication
const CHANNEL_NAME = 'nameless-floating-bar'

// Message types
export type FloatingBarMessageType =
  // State sync (main -> floating)
  | 'STATE_SYNC'
  // Commands (floating -> main)
  | 'TOGGLE_MIC'
  | 'TOGGLE_CAMERA'
  | 'SWITCH_AUDIO_DEVICE'
  | 'SWITCH_VIDEO_DEVICE'
  | 'STOP_SHARING'
  // Lifecycle
  | 'FLOATING_READY'
  | 'FLOATING_CLOSED'

// State that gets synced from main to floating window
export interface FloatingBarState {
  isMuted: boolean
  isVideoOff: boolean
  isSharing: boolean
  localParticipant: Participant | null
  remoteParticipants: Participant[]
  selectedAudioDevice: string | null
  selectedVideoDevice: string | null
  audioDevices: Array<{ deviceId: string; label: string }>
  videoDevices: Array<{ deviceId: string; label: string }>
}

// Message payload types
export interface FloatingBarMessage {
  type: FloatingBarMessageType
  payload?: FloatingBarState | { deviceId: string } | undefined
  timestamp: number
}

// Callback types
export type StateUpdateCallback = (state: FloatingBarState) => void
export type CommandCallback = (command: FloatingBarMessageType, payload?: unknown) => void

class FloatingBarChannel {
  private channel: BroadcastChannel | null = null
  private stateListeners: Set<StateUpdateCallback> = new Set()
  private commandListeners: Set<CommandCallback> = new Set()
  private isMainWindow = false

  /**
   * Initialize channel as main window (sends state, receives commands)
   */
  initAsMain(): void {
    this.isMainWindow = true
    this.channel = new BroadcastChannel(CHANNEL_NAME)
    this.channel.onmessage = this.handleMessage.bind(this)
    console.log('[FloatingBarChannel] Initialized as main window')
  }

  /**
   * Initialize channel as floating window (receives state, sends commands)
   */
  initAsFloating(): void {
    this.isMainWindow = false
    this.channel = new BroadcastChannel(CHANNEL_NAME)
    this.channel.onmessage = this.handleMessage.bind(this)
    // Notify main window that floating bar is ready
    this.send({ type: 'FLOATING_READY', timestamp: Date.now() })
    console.log('[FloatingBarChannel] Initialized as floating window')
  }

  /**
   * Close the channel
   */
  close(): void {
    if (!this.isMainWindow) {
      this.send({ type: 'FLOATING_CLOSED', timestamp: Date.now() })
    }
    this.channel?.close()
    this.channel = null
    this.stateListeners.clear()
    this.commandListeners.clear()
    console.log('[FloatingBarChannel] Closed')
  }

  /**
   * Send state update to floating window (main window only)
   */
  syncState(state: FloatingBarState): void {
    if (!this.isMainWindow) {
      console.warn('[FloatingBarChannel] syncState should only be called from main window')
      return
    }
    this.send({ type: 'STATE_SYNC', payload: state, timestamp: Date.now() })
  }

  /**
   * Send command to main window (floating window only)
   */
  sendCommand(type: Exclude<FloatingBarMessageType, 'STATE_SYNC'>, payload?: { deviceId: string }): void {
    if (this.isMainWindow) {
      console.warn('[FloatingBarChannel] sendCommand should only be called from floating window')
      return
    }
    this.send({ type, payload, timestamp: Date.now() })
  }

  /**
   * Subscribe to state updates (floating window)
   */
  onStateUpdate(callback: StateUpdateCallback): () => void {
    this.stateListeners.add(callback)
    return () => this.stateListeners.delete(callback)
  }

  /**
   * Subscribe to commands (main window)
   */
  onCommand(callback: CommandCallback): () => void {
    this.commandListeners.add(callback)
    return () => this.commandListeners.delete(callback)
  }

  private send(message: FloatingBarMessage): void {
    if (!this.channel) {
      console.warn('[FloatingBarChannel] Channel not initialized')
      return
    }
    this.channel.postMessage(message)
  }

  private handleMessage(event: MessageEvent<FloatingBarMessage>): void {
    const { type, payload } = event.data

    if (type === 'STATE_SYNC' && !this.isMainWindow) {
      // Floating window receives state
      const state = payload as FloatingBarState
      this.stateListeners.forEach((cb) => cb(state))
    } else if (type !== 'STATE_SYNC' && this.isMainWindow) {
      // Main window receives commands
      this.commandListeners.forEach((cb) => cb(type, payload))
    }
  }
}

// Singleton instance
export const floatingBarChannel = new FloatingBarChannel()

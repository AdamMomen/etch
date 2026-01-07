/**
 * Floating windows API - Create/destroy separate Tauri windows for participants and toolbar
 *
 * These windows are always-on-top, frameless, and can be positioned anywhere on the screen.
 * Ideal for desktop multi-monitor setups and presenter workflows.
 */

import { invoke } from '@tauri-apps/api/core'

/**
 * Create the participants floating window
 * Shows participant video bubbles in a small draggable window
 */
export async function createParticipantsWindow(): Promise<void> {
  try {
    console.log('[FloatingWindows] Creating participants window')
    await invoke('create_participants_window')
    console.log('[FloatingWindows] Participants window created')
  } catch (error) {
    console.error('[FloatingWindows] Failed to create participants window:', error)
    throw error
  }
}

/**
 * Destroy the participants floating window
 */
export async function destroyParticipantsWindow(): Promise<void> {
  try {
    console.log('[FloatingWindows] Destroying participants window')
    await invoke('destroy_participants_window')
    console.log('[FloatingWindows] Participants window destroyed')
  } catch (error) {
    console.error('[FloatingWindows] Failed to destroy participants window:', error)
    throw error
  }
}

/**
 * Check if participants window is currently active
 */
export async function isParticipantsWindowActive(): Promise<boolean> {
  try {
    const active = await invoke<boolean>('is_participants_window_active')
    return active
  } catch (error) {
    console.error('[FloatingWindows] Failed to check participants window status:', error)
    return false
  }
}

/**
 * Create the annotation toolbar floating window
 * Shows annotation tool controls in a small draggable window
 */
export async function createToolbarWindow(): Promise<void> {
  try {
    console.log('[FloatingWindows] Creating toolbar window')
    await invoke('create_toolbar_window')
    console.log('[FloatingWindows] Toolbar window created')
  } catch (error) {
    console.error('[FloatingWindows] Failed to create toolbar window:', error)
    throw error
  }
}

/**
 * Destroy the annotation toolbar floating window
 */
export async function destroyToolbarWindow(): Promise<void> {
  try {
    console.log('[FloatingWindows] Destroying toolbar window')
    await invoke('destroy_toolbar_window')
    console.log('[FloatingWindows] Toolbar window destroyed')
  } catch (error) {
    console.error('[FloatingWindows] Failed to destroy toolbar window:', error)
    throw error
  }
}

/**
 * Check if toolbar window is currently active
 */
export async function isToolbarWindowActive(): Promise<boolean> {
  try {
    const active = await invoke<boolean>('is_toolbar_window_active')
    return active
  } catch (error) {
    console.error('[FloatingWindows] Failed to check toolbar window status:', error)
    return false
  }
}

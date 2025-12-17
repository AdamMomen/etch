import { useCallback, useState, useRef, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

/**
 * Bounds for the overlay window
 */
export interface OverlayBounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Return type for the useAnnotationOverlay hook
 */
export interface UseAnnotationOverlayReturn {
  /** Whether the overlay is currently active */
  isOverlayActive: boolean
  /** Create the overlay window at the specified bounds */
  createOverlay: (bounds: OverlayBounds) => Promise<void>
  /** Destroy the overlay window */
  destroyOverlay: () => Promise<void>
  /** Update the overlay position and size */
  updateBounds: (bounds: OverlayBounds) => Promise<void>
  /** Start tracking a window's position (for window shares) */
  startTracking: (windowId: string) => void
  /** Stop tracking window position */
  stopTracking: () => void
}

/**
 * Hook for managing the annotation overlay window lifecycle
 *
 * This hook creates and manages a transparent overlay window that sits
 * on top of shared content to display annotations. The overlay is:
 * - Transparent (click-through)
 * - Always-on-top
 * - Positioned exactly over the shared screen/window
 *
 * For window shares (not full screen), the overlay tracks the window's
 * position and updates accordingly.
 *
 * @example
 * ```tsx
 * const { createOverlay, destroyOverlay, isOverlayActive } = useAnnotationOverlay()
 *
 * // When screen share starts
 * await createOverlay({ x: 0, y: 0, width: 1920, height: 1080 })
 *
 * // When screen share stops
 * await destroyOverlay()
 * ```
 */
export function useAnnotationOverlay(): UseAnnotationOverlayReturn {
  const [isOverlayActive, setIsOverlayActive] = useState(false)
  const trackingIntervalRef = useRef<number | null>(null)

  // Create the overlay window
  const createOverlay = useCallback(async (bounds: OverlayBounds) => {
    try {
      await invoke('create_annotation_overlay', { bounds })
      setIsOverlayActive(true)
      console.log('[Overlay] Created at', bounds)
    } catch (error) {
      // If overlay already exists, just update position
      if (
        error instanceof Error &&
        error.message.includes('already exists')
      ) {
        console.log('[Overlay] Already exists, updating bounds')
        await invoke('update_overlay_bounds', { bounds })
        setIsOverlayActive(true)
      } else {
        console.error('[Overlay] Failed to create:', error)
        throw error
      }
    }
  }, [])

  // Destroy the overlay window
  const destroyOverlay = useCallback(async () => {
    // Stop tracking if active
    if (trackingIntervalRef.current) {
      window.clearInterval(trackingIntervalRef.current)
      trackingIntervalRef.current = null
    }

    try {
      await invoke('destroy_annotation_overlay')
      setIsOverlayActive(false)
      console.log('[Overlay] Destroyed')
    } catch (error) {
      // If overlay doesn't exist, that's fine
      if (
        error instanceof Error &&
        error.message.includes('does not exist')
      ) {
        console.log('[Overlay] Already destroyed')
        setIsOverlayActive(false)
      } else {
        console.error('[Overlay] Failed to destroy:', error)
        throw error
      }
    }
  }, [])

  // Update overlay bounds
  const updateBounds = useCallback(async (bounds: OverlayBounds) => {
    try {
      await invoke('update_overlay_bounds', { bounds })
    } catch (error) {
      console.error('[Overlay] Failed to update bounds:', error)
      throw error
    }
  }, [])

  // Start tracking a window's position
  // Uses polling at ~30fps to update overlay bounds when sharing a specific window
  const startTracking = useCallback(
    (windowTitle: string) => {
      // Stop any existing tracking
      if (trackingIntervalRef.current) {
        window.clearInterval(trackingIntervalRef.current)
      }

      console.log(`[Overlay] Starting window tracking for: ${windowTitle}`)

      // Poll for window bounds at ~30fps (33ms interval)
      // Note: get_window_bounds_by_title returns None until window tracking is implemented
      trackingIntervalRef.current = window.setInterval(async () => {
        try {
          const bounds = await invoke<OverlayBounds | null>(
            'get_window_bounds_by_title',
            { title: windowTitle }
          )
          if (bounds) {
            await invoke('update_overlay_bounds', { bounds })
          }
        } catch (error) {
          // Silently ignore tracking errors to avoid console spam
          // Window may have been closed or tracking not implemented
        }
      }, 33) // ~30fps
    },
    []
  )

  // Stop tracking window position
  const stopTracking = useCallback(() => {
    if (trackingIntervalRef.current) {
      window.clearInterval(trackingIntervalRef.current)
      trackingIntervalRef.current = null
      console.log('[Overlay] Tracking stopped')
    }
  }, [])

  // Check if overlay is active on mount (for resuming sessions)
  useEffect(() => {
    const checkOverlayStatus = async () => {
      try {
        const active = await invoke<boolean>('is_overlay_active')
        setIsOverlayActive(active)
      } catch {
        // Command may not exist yet, assume not active
        setIsOverlayActive(false)
      }
    }
    checkOverlayStatus()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trackingIntervalRef.current) {
        window.clearInterval(trackingIntervalRef.current)
      }
    }
  }, [])

  return {
    isOverlayActive,
    createOverlay,
    destroyOverlay,
    updateBounds,
    startTracking,
    stopTracking,
  }
}

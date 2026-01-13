import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAnnotationOverlay } from '@/hooks/useAnnotationOverlay'

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

// Mock Tauri event listener
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

const mockInvoke = vi.mocked(invoke)
const mockListen = vi.mocked(listen)

describe('useAnnotationOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock: overlay is not active
    mockInvoke.mockImplementation(async (cmd) => {
      if (cmd === 'is_overlay_active') {
        return false
      }
      return undefined
    })
    // Default mock: listen returns a no-op unlisten function
    mockListen.mockResolvedValue(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should check overlay status on mount', async () => {
      renderHook(() => useAnnotationOverlay())

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('is_overlay_active')
      })
    })

    it('should set isOverlayActive based on initial status', async () => {
      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'is_overlay_active') {
          return true
        }
        return undefined
      })

      const { result } = renderHook(() => useAnnotationOverlay())

      await waitFor(() => {
        expect(result.current.isOverlayActive).toBe(true)
      })
    })
  })

  describe('createOverlay', () => {
    it('should call create_annotation_overlay with correct bounds', async () => {
      mockInvoke.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAnnotationOverlay())

      const bounds = { x: 0, y: 0, width: 1920, height: 1080 }

      await act(async () => {
        await result.current.createOverlay(bounds)
      })

      expect(mockInvoke).toHaveBeenCalledWith('create_annotation_overlay', {
        bounds,
      })
    })

    it('should set isOverlayActive to true after successful creation', async () => {
      mockInvoke.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAnnotationOverlay())

      await act(async () => {
        await result.current.createOverlay({ x: 0, y: 0, width: 1920, height: 1080 })
      })

      expect(result.current.isOverlayActive).toBe(true)
    })

    it('should update bounds if overlay already exists', async () => {
      mockInvoke.mockImplementation(async (cmd, _args) => {
        if (cmd === 'create_annotation_overlay') {
          throw new Error('Annotation overlay already exists')
        }
        if (cmd === 'update_overlay_bounds') {
          return undefined
        }
        if (cmd === 'is_overlay_active') {
          return false
        }
        return undefined
      })

      const { result } = renderHook(() => useAnnotationOverlay())

      const bounds = { x: 100, y: 100, width: 800, height: 600 }

      await act(async () => {
        await result.current.createOverlay(bounds)
      })

      expect(mockInvoke).toHaveBeenCalledWith('update_overlay_bounds', { bounds })
      expect(result.current.isOverlayActive).toBe(true)
    })

    it('should throw error for other creation failures', async () => {
      mockInvoke.mockRejectedValue(new Error('Failed to create window'))

      const { result } = renderHook(() => useAnnotationOverlay())

      await expect(
        act(async () => {
          await result.current.createOverlay({ x: 0, y: 0, width: 1920, height: 1080 })
        })
      ).rejects.toThrow('Failed to create window')
    })
  })

  describe('destroyOverlay', () => {
    it('should call destroy_annotation_overlay', async () => {
      mockInvoke.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAnnotationOverlay())

      // First create the overlay
      await act(async () => {
        await result.current.createOverlay({ x: 0, y: 0, width: 1920, height: 1080 })
      })

      // Then destroy it
      await act(async () => {
        await result.current.destroyOverlay()
      })

      expect(mockInvoke).toHaveBeenCalledWith('destroy_annotation_overlay')
    })

    it('should set isOverlayActive to false after destruction', async () => {
      mockInvoke.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAnnotationOverlay())

      // Create overlay first
      await act(async () => {
        await result.current.createOverlay({ x: 0, y: 0, width: 1920, height: 1080 })
      })
      expect(result.current.isOverlayActive).toBe(true)

      // Destroy overlay
      await act(async () => {
        await result.current.destroyOverlay()
      })

      expect(result.current.isOverlayActive).toBe(false)
    })

    it('should handle overlay not existing gracefully', async () => {
      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'destroy_annotation_overlay') {
          throw new Error('Annotation overlay does not exist')
        }
        return undefined
      })

      const { result } = renderHook(() => useAnnotationOverlay())

      // Should not throw
      await act(async () => {
        await result.current.destroyOverlay()
      })

      expect(result.current.isOverlayActive).toBe(false)
    })

    it('should throw error for other destruction failures', async () => {
      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'destroy_annotation_overlay') {
          throw new Error('Failed to close window')
        }
        return undefined
      })

      const { result } = renderHook(() => useAnnotationOverlay())

      await expect(
        act(async () => {
          await result.current.destroyOverlay()
        })
      ).rejects.toThrow('Failed to close window')
    })
  })

  describe('updateBounds', () => {
    it('should call update_overlay_bounds with new bounds', async () => {
      mockInvoke.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAnnotationOverlay())

      const newBounds = { x: 100, y: 200, width: 1280, height: 720 }

      await act(async () => {
        await result.current.updateBounds(newBounds)
      })

      expect(mockInvoke).toHaveBeenCalledWith('update_overlay_bounds', {
        bounds: newBounds,
      })
    })

    it('should throw error if update fails', async () => {
      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'update_overlay_bounds') {
          throw new Error('Overlay not found')
        }
        return undefined
      })

      const { result } = renderHook(() => useAnnotationOverlay())

      await expect(
        act(async () => {
          await result.current.updateBounds({ x: 0, y: 0, width: 100, height: 100 })
        })
      ).rejects.toThrow('Overlay not found')
    })
  })

  describe('window tracking', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should start polling when startTracking is called', async () => {
      mockInvoke.mockResolvedValue(null) // get_window_bounds_by_title returns null

      const { result } = renderHook(() => useAnnotationOverlay())

      act(() => {
        result.current.startTracking('Test Window')
      })

      // Advance timer to trigger polling
      await act(async () => {
        vi.advanceTimersByTime(33) // ~30fps interval
      })

      expect(mockInvoke).toHaveBeenCalledWith('get_window_bounds_by_title', {
        title: 'Test Window',
      })
    })

    it('should update bounds when window tracking returns bounds', async () => {
      const mockBounds = { x: 50, y: 50, width: 800, height: 600 }
      mockInvoke.mockImplementation(async (cmd, _args) => {
        if (cmd === 'get_window_bounds_by_title') {
          return mockBounds
        }
        return undefined
      })

      const { result } = renderHook(() => useAnnotationOverlay())

      act(() => {
        result.current.startTracking('Test Window')
      })

      // Advance timer to trigger polling
      await act(async () => {
        vi.advanceTimersByTime(33)
      })

      expect(mockInvoke).toHaveBeenCalledWith('update_overlay_bounds', {
        bounds: mockBounds,
      })
    })

    it('should stop polling when stopTracking is called', async () => {
      mockInvoke.mockResolvedValue(null)

      const { result } = renderHook(() => useAnnotationOverlay())

      act(() => {
        result.current.startTracking('Test Window')
      })

      // Stop tracking
      act(() => {
        result.current.stopTracking()
      })

      // Clear previous calls
      mockInvoke.mockClear()

      // Advance timer - should not trigger any more calls
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Should not have called get_window_bounds_by_title after stopping
      expect(mockInvoke).not.toHaveBeenCalledWith(
        'get_window_bounds_by_title',
        expect.anything()
      )
    })

    it('should stop previous tracking when starting new tracking', async () => {
      mockInvoke.mockResolvedValue(null)

      const { result } = renderHook(() => useAnnotationOverlay())

      // Start tracking first window
      act(() => {
        result.current.startTracking('Window 1')
      })

      // Start tracking second window (should stop first)
      act(() => {
        result.current.startTracking('Window 2')
      })

      // Advance timer
      await act(async () => {
        vi.advanceTimersByTime(33)
      })

      // Should only be tracking Window 2
      expect(mockInvoke).toHaveBeenCalledWith('get_window_bounds_by_title', {
        title: 'Window 2',
      })
    })
  })

  describe('cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should cleanup tracking interval on unmount', async () => {
      mockInvoke.mockResolvedValue(null)

      const { result, unmount } = renderHook(() => useAnnotationOverlay())

      // Start tracking
      act(() => {
        result.current.startTracking('Test Window')
      })

      // Unmount hook
      unmount()

      // Clear mocks
      mockInvoke.mockClear()

      // Advance timer - should not trigger any calls after unmount
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(mockInvoke).not.toHaveBeenCalledWith(
        'get_window_bounds_by_title',
        expect.anything()
      )
    })
  })

  describe('error event handling', () => {
    it('should destroy overlay when core-capture-error event fires', async () => {
      // Store the event handler so we can trigger it
      let captureErrorHandler: ((event: { payload: string }) => void) | null = null

      mockListen.mockImplementation(async (eventName, handler) => {
        if (eventName === 'core-capture-error') {
          captureErrorHandler = handler as (event: { payload: string }) => void
        }
        return () => {} // Return unlisten function
      })

      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'is_overlay_active') return false
        if (cmd === 'create_annotation_overlay') return undefined
        if (cmd === 'destroy_annotation_overlay') return undefined
        return undefined
      })

      const { result } = renderHook(() => useAnnotationOverlay())

      // Wait for listeners to be set up
      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('core-capture-error', expect.any(Function))
      })

      // Create overlay first
      await act(async () => {
        await result.current.createOverlay({ x: 0, y: 0, width: 1920, height: 1080 })
      })
      expect(result.current.isOverlayActive).toBe(true)

      // Clear previous mocks
      mockInvoke.mockClear()

      // Trigger the capture error event
      expect(captureErrorHandler).not.toBeNull()
      await act(async () => {
        captureErrorHandler!({ payload: 'Capture permanent error source_id=2' })
        // Wait a tick for the async destroyOverlay to be called
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Verify destroyOverlay was called
      expect(mockInvoke).toHaveBeenCalledWith('destroy_annotation_overlay')
    })

    it('should destroy overlay when core-terminated event fires with non-zero code', async () => {
      let terminatedHandler: ((event: { payload: number | null }) => void) | null = null

      mockListen.mockImplementation(async (eventName, handler) => {
        if (eventName === 'core-terminated') {
          terminatedHandler = handler as (event: { payload: number | null }) => void
        }
        return () => {}
      })

      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'is_overlay_active') return false
        if (cmd === 'create_annotation_overlay') return undefined
        if (cmd === 'destroy_annotation_overlay') return undefined
        return undefined
      })

      const { result } = renderHook(() => useAnnotationOverlay())

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('core-terminated', expect.any(Function))
      })

      // Create overlay first
      await act(async () => {
        await result.current.createOverlay({ x: 0, y: 0, width: 1920, height: 1080 })
      })
      expect(result.current.isOverlayActive).toBe(true)

      mockInvoke.mockClear()

      // Trigger termination with non-zero code
      expect(terminatedHandler).not.toBeNull()
      await act(async () => {
        terminatedHandler!({ payload: 1 })
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Verify destroyOverlay was called
      expect(mockInvoke).toHaveBeenCalledWith('destroy_annotation_overlay')
    })

    it('should NOT destroy overlay when core-terminated fires with exit code 0', async () => {
      let terminatedHandler: ((event: { payload: number | null }) => void) | null = null

      mockListen.mockImplementation(async (eventName, handler) => {
        if (eventName === 'core-terminated') {
          terminatedHandler = handler as (event: { payload: number | null }) => void
        }
        return () => {}
      })

      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'is_overlay_active') return false
        if (cmd === 'create_annotation_overlay') return undefined
        return undefined
      })

      const { result } = renderHook(() => useAnnotationOverlay())

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('core-terminated', expect.any(Function))
      })

      // Create overlay first
      await act(async () => {
        await result.current.createOverlay({ x: 0, y: 0, width: 1920, height: 1080 })
      })
      expect(result.current.isOverlayActive).toBe(true)

      mockInvoke.mockClear()

      // Trigger termination with exit code 0 (graceful shutdown)
      expect(terminatedHandler).not.toBeNull()
      await act(async () => {
        terminatedHandler!({ payload: 0 })
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Verify destroyOverlay was NOT called
      expect(mockInvoke).not.toHaveBeenCalledWith('destroy_annotation_overlay')
    })

    it('should cleanup event listeners on unmount', async () => {
      const unlistenCaptureError = vi.fn()
      const unlistenTerminated = vi.fn()

      mockListen.mockImplementation(async (eventName) => {
        if (eventName === 'core-capture-error') {
          return unlistenCaptureError
        }
        if (eventName === 'core-terminated') {
          return unlistenTerminated
        }
        return () => {}
      })

      const { unmount } = renderHook(() => useAnnotationOverlay())

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('core-capture-error', expect.any(Function))
        expect(mockListen).toHaveBeenCalledWith('core-terminated', expect.any(Function))
      })

      // Unmount the hook
      unmount()

      // Verify both unlisten functions were called
      expect(unlistenCaptureError).toHaveBeenCalled()
      expect(unlistenTerminated).toHaveBeenCalled()
    })

    it('should handle destroy failure gracefully in error event handler', async () => {
      let captureErrorHandler: ((event: { payload: string }) => void) | null = null
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockListen.mockImplementation(async (eventName, handler) => {
        if (eventName === 'core-capture-error') {
          captureErrorHandler = handler as (event: { payload: string }) => void
        }
        return () => {}
      })

      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'is_overlay_active') return false
        if (cmd === 'create_annotation_overlay') return undefined
        if (cmd === 'destroy_annotation_overlay') {
          throw new Error('Failed to destroy overlay')
        }
        return undefined
      })

      const { result } = renderHook(() => useAnnotationOverlay())

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('core-capture-error', expect.any(Function))
      })

      // Create overlay first
      await act(async () => {
        await result.current.createOverlay({ x: 0, y: 0, width: 1920, height: 1080 })
      })

      // Trigger the capture error event
      expect(captureErrorHandler).not.toBeNull()
      await act(async () => {
        captureErrorHandler!({ payload: 'Capture permanent error' })
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Verify error was logged but didn't throw
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Overlay] Failed to destroy overlay after capture error:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })
})

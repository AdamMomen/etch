import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useOverlayAnnotationBridge } from '@/hooks/useOverlayAnnotationBridge'
import { useAnnotationStore } from '@/stores/annotationStore'
import { useRoomStore } from '@/stores/roomStore'
import type { Stroke } from '@nameless/shared'

// Mock Tauri event APIs
let mockListeners: Map<string, (event: { payload: unknown }) => void>

vi.mock('@tauri-apps/api/event', () => ({
  emit: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}))

import { emit, listen } from '@tauri-apps/api/event'

const mockEmit = emit as ReturnType<typeof vi.fn>
const mockListen = listen as ReturnType<typeof vi.fn>

// Test stroke factory
const createTestStroke = (overrides: Partial<Stroke> = {}): Stroke => ({
  id: `stroke-${Math.random().toString(36).slice(2)}`,
  participantId: 'test-participant',
  tool: 'pen',
  color: '#ff0000',
  points: [
    { x: 0.1, y: 0.1 },
    { x: 0.2, y: 0.2 },
    { x: 0.3, y: 0.3 },
  ],
  createdAt: Date.now(),
  isComplete: true,
  ...overrides,
})

describe('useOverlayAnnotationBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListeners = new Map()

    // Set up listen mock to store handlers
    mockListen.mockImplementation(async (event: string, handler: (e: { payload: unknown }) => void) => {
      mockListeners.set(event, handler)
      return () => {
        mockListeners.delete(event)
      }
    })

    // Reset stores
    useAnnotationStore.getState().clearAll()
    useRoomStore.setState({
      localParticipant: {
        id: 'local-participant',
        name: 'Test User',
        role: 'host',
        color: '#f97316',
        isLocal: true,
        isScreenSharing: false,
        isSpeaking: false,
        hasVideo: true,
      },
      remoteParticipants: [],
      currentRoom: null,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('when overlay is inactive', () => {
    it('should not set up event listeners', async () => {
      renderHook(() => useOverlayAnnotationBridge(false))

      await waitFor(() => {
        // No listeners should be set up when inactive
        expect(mockListen).not.toHaveBeenCalled()
      })
    })

    it('should not emit events when strokes change', async () => {
      renderHook(() => useOverlayAnnotationBridge(false))

      // Add a stroke to the store
      const stroke = createTestStroke()
      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      // Should not emit to overlay
      expect(mockEmit).not.toHaveBeenCalledWith('overlay://annotation', expect.anything())
    })
  })

  describe('when overlay becomes active', () => {
    it('should set up event listeners', async () => {
      renderHook(() => useOverlayAnnotationBridge(true))

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('overlay://request-state', expect.any(Function))
        expect(mockListen).toHaveBeenCalledWith('overlay://stroke-start', expect.any(Function))
        expect(mockListen).toHaveBeenCalledWith('overlay://stroke-point', expect.any(Function))
        expect(mockListen).toHaveBeenCalledWith('overlay://stroke-complete', expect.any(Function))
        expect(mockListen).toHaveBeenCalledWith('overlay://draw-mode-changed', expect.any(Function))
      })
    })

    it('should send full state after delay when overlay becomes active', async () => {
      vi.useFakeTimers()

      renderHook(() => useOverlayAnnotationBridge(true))

      // Add some strokes to the store
      const stroke = createTestStroke()
      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      // Fast forward past the delay
      await act(async () => {
        vi.advanceTimersByTime(600)
      })

      expect(mockEmit).toHaveBeenCalledWith('overlay://annotation', expect.objectContaining({
        type: 'full_state',
      }))

      vi.useRealTimers()
    })
  })

  describe('emitting annotation events to overlay', () => {
    it('should emit stroke_complete when new stroke is added', async () => {
      renderHook(() => useOverlayAnnotationBridge(true))

      const stroke = createTestStroke()

      await act(async () => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      await waitFor(() => {
        expect(mockEmit).toHaveBeenCalledWith('overlay://annotation', expect.objectContaining({
          type: 'stroke_complete',
          stroke,
        }))
      })
    })

    it('should emit stroke_delete when stroke is deleted', async () => {
      const stroke = createTestStroke()

      // Add stroke first
      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      renderHook(() => useOverlayAnnotationBridge(true))

      await act(async () => {
        useAnnotationStore.getState().deleteStroke(stroke.id)
      })

      await waitFor(() => {
        expect(mockEmit).toHaveBeenCalledWith('overlay://annotation', expect.objectContaining({
          type: 'stroke_delete',
          strokeId: stroke.id,
        }))
      })
    })

    it('should emit clear_all when all strokes are cleared', async () => {
      const stroke1 = createTestStroke()
      const stroke2 = createTestStroke()

      // Add strokes first
      act(() => {
        useAnnotationStore.getState().addStroke(stroke1)
        useAnnotationStore.getState().addStroke(stroke2)
      })

      renderHook(() => useOverlayAnnotationBridge(true))

      await act(async () => {
        useAnnotationStore.getState().clearAll()
      })

      await waitFor(() => {
        expect(mockEmit).toHaveBeenCalledWith('overlay://annotation', expect.objectContaining({
          type: 'clear_all',
        }))
      })
    })

    it('should emit stroke_update when active stroke changes', async () => {
      renderHook(() => useOverlayAnnotationBridge(true))

      const activeStroke = createTestStroke({ isComplete: false })

      await act(async () => {
        useAnnotationStore.getState().setActiveStroke(activeStroke)
      })

      await waitFor(() => {
        expect(mockEmit).toHaveBeenCalledWith('overlay://annotation', expect.objectContaining({
          type: 'stroke_update',
          stroke: activeStroke,
        }))
      })
    })
  })

  describe('receiving events from overlay', () => {
    it('should send full state when overlay requests it', async () => {
      const stroke = createTestStroke()

      act(() => {
        useAnnotationStore.getState().addStroke(stroke)
      })

      renderHook(() => useOverlayAnnotationBridge(true))

      // Wait for listeners to be set up
      await waitFor(() => {
        expect(mockListeners.has('overlay://request-state')).toBe(true)
      })

      // Trigger the request state event
      const handler = mockListeners.get('overlay://request-state')!
      await act(async () => {
        handler({ payload: {} })
      })

      await waitFor(() => {
        expect(mockEmit).toHaveBeenCalledWith('overlay://annotation', expect.objectContaining({
          type: 'full_state',
          strokes: expect.arrayContaining([stroke]),
        }))
      })
    })

    it('should handle stroke start from overlay (sharer drawing)', async () => {
      renderHook(() => useOverlayAnnotationBridge(true))

      await waitFor(() => {
        expect(mockListeners.has('overlay://stroke-start')).toBe(true)
      })

      const overlayStroke = createTestStroke({ participantId: 'local-participant' })
      const handler = mockListeners.get('overlay://stroke-start')!

      await act(async () => {
        handler({ payload: overlayStroke })
      })

      expect(useAnnotationStore.getState().activeStroke).toEqual(overlayStroke)
    })

    it('should handle stroke complete from overlay', async () => {
      renderHook(() => useOverlayAnnotationBridge(true))

      await waitFor(() => {
        expect(mockListeners.has('overlay://stroke-complete')).toBe(true)
      })

      const completedStroke = createTestStroke({ isComplete: true })
      const handler = mockListeners.get('overlay://stroke-complete')!

      await act(async () => {
        handler({ payload: completedStroke })
      })

      await waitFor(() => {
        const strokes = useAnnotationStore.getState().strokes
        expect(strokes.some(s => s.id === completedStroke.id)).toBe(true)
      })
    })
  })

  describe('participant info sync', () => {
    it('should send participant info when overlay becomes active', async () => {
      vi.useFakeTimers()

      renderHook(() => useOverlayAnnotationBridge(true))

      await act(async () => {
        vi.advanceTimersByTime(600)
      })

      expect(mockEmit).toHaveBeenCalledWith('overlay://participant-info', expect.objectContaining({
        participantId: 'local-participant',
        color: '#f97316',
        tool: expect.any(String),
      }))

      vi.useRealTimers()
    })

    it('should send participant info when tool changes', async () => {
      renderHook(() => useOverlayAnnotationBridge(true))

      mockEmit.mockClear()

      await act(async () => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      await waitFor(() => {
        expect(mockEmit).toHaveBeenCalledWith('overlay://participant-info', expect.objectContaining({
          tool: 'highlighter',
        }))
      })
    })
  })

  describe('cleanup', () => {
    it('should clean up listeners when overlay becomes inactive', async () => {
      const { rerender } = renderHook(
        ({ active }) => useOverlayAnnotationBridge(active),
        { initialProps: { active: true } }
      )

      await waitFor(() => {
        expect(mockListeners.size).toBeGreaterThan(0)
      })

      // Make overlay inactive
      rerender({ active: false })

      await waitFor(() => {
        expect(mockListeners.size).toBe(0)
      })
    })

    it('should clean up listeners on unmount', async () => {
      const { unmount } = renderHook(() => useOverlayAnnotationBridge(true))

      await waitFor(() => {
        expect(mockListeners.size).toBeGreaterThan(0)
      })

      unmount()

      await waitFor(() => {
        expect(mockListeners.size).toBe(0)
      })
    })
  })
})

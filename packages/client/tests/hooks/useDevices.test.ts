import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDevices } from '@/hooks/useDevices'

// Store the devicechange event listener
let deviceChangeCallback: (() => void) | null = null

// Mock navigator.mediaDevices
const mockEnumerateDevices = vi.fn()
const mockAddEventListener = vi.fn((event, callback) => {
  if (event === 'devicechange') {
    deviceChangeCallback = callback
  }
})
const mockRemoveEventListener = vi.fn((event, callback) => {
  if (event === 'devicechange' && deviceChangeCallback === callback) {
    deviceChangeCallback = null
  }
})

const mockMediaDevices = {
  enumerateDevices: mockEnumerateDevices,
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
}

describe('useDevices', () => {
  const mockDevices: MediaDeviceInfo[] = [
    {
      deviceId: 'audio1',
      label: 'Built-in Microphone',
      kind: 'audioinput',
      groupId: 'group1',
      toJSON: () => ({}),
    },
    {
      deviceId: 'audio2',
      label: 'External Microphone',
      kind: 'audioinput',
      groupId: 'group2',
      toJSON: () => ({}),
    },
    {
      deviceId: 'video1',
      label: 'Built-in Webcam',
      kind: 'videoinput',
      groupId: 'group3',
      toJSON: () => ({}),
    },
    {
      deviceId: 'video2',
      label: 'External Camera',
      kind: 'videoinput',
      groupId: 'group4',
      toJSON: () => ({}),
    },
    {
      deviceId: 'audioout1',
      label: 'Built-in Speakers',
      kind: 'audiooutput',
      groupId: 'group5',
      toJSON: () => ({}),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    deviceChangeCallback = null

    // Setup mock for navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: mockMediaDevices,
      writable: true,
      configurable: true,
    })

    mockEnumerateDevices.mockResolvedValue(mockDevices)
  })

  afterEach(() => {
    // Clean up
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  })

  describe('initial state', () => {
    it('returns loading state initially', () => {
      const { result } = renderHook(() => useDevices())

      expect(result.current.isLoading).toBe(true)
    })

    it('returns audio devices filtered by kind', async () => {
      const { result } = renderHook(() => useDevices())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.audioDevices).toHaveLength(2)
      expect(result.current.audioDevices[0].deviceId).toBe('audio1')
      expect(result.current.audioDevices[1].deviceId).toBe('audio2')
    })

    it('returns video devices filtered by kind', async () => {
      const { result } = renderHook(() => useDevices())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.videoDevices).toHaveLength(2)
      expect(result.current.videoDevices[0].deviceId).toBe('video1')
      expect(result.current.videoDevices[1].deviceId).toBe('video2')
    })

    it('excludes audio output devices', async () => {
      const { result } = renderHook(() => useDevices())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const allDeviceIds = [
        ...result.current.audioDevices.map((d) => d.deviceId),
        ...result.current.videoDevices.map((d) => d.deviceId),
      ]
      expect(allDeviceIds).not.toContain('audioout1')
    })
  })

  describe('device labels (AC-2.10.1, AC-2.10.3)', () => {
    it('preserves device labels from API', async () => {
      const { result } = renderHook(() => useDevices())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.audioDevices[0].label).toBe('Built-in Microphone')
      expect(result.current.videoDevices[0].label).toBe('Built-in Webcam')
    })

    it('generates fallback label when label is empty', async () => {
      mockEnumerateDevices.mockResolvedValue([
        {
          deviceId: 'audio-no-label',
          label: '', // Empty label (before permission granted)
          kind: 'audioinput',
          groupId: 'group1',
          toJSON: () => ({}),
        },
      ])

      const { result } = renderHook(() => useDevices())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.audioDevices[0].label).toContain('Microphone')
    })
  })

  describe('device change events (AC-2.10.6)', () => {
    it('subscribes to devicechange event on mount', async () => {
      renderHook(() => useDevices())

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith(
          'devicechange',
          expect.any(Function)
        )
      })
    })

    it('unsubscribes from devicechange event on unmount', async () => {
      const { unmount } = renderHook(() => useDevices())

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalled()
      })

      unmount()

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'devicechange',
        expect.any(Function)
      )
    })

    it('refreshes device list when devicechange event fires', async () => {
      const { result } = renderHook(() => useDevices())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Initial call
      expect(mockEnumerateDevices).toHaveBeenCalledTimes(1)

      // Update mock to return different devices
      const newDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'new-audio',
          label: 'New Microphone',
          kind: 'audioinput',
          groupId: 'group-new',
          toJSON: () => ({}),
        },
      ]
      mockEnumerateDevices.mockResolvedValue(newDevices)

      // Trigger devicechange event
      await act(async () => {
        deviceChangeCallback?.()
      })

      await waitFor(() => {
        expect(result.current.audioDevices[0].deviceId).toBe('new-audio')
      })
    })
  })

  describe('refresh function', () => {
    it('manually refreshes device list', async () => {
      const { result } = renderHook(() => useDevices())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockEnumerateDevices).toHaveBeenCalledTimes(1)

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockEnumerateDevices).toHaveBeenCalledTimes(2)
    })
  })

  describe('error handling', () => {
    it('sets error when enumerateDevices fails', async () => {
      mockEnumerateDevices.mockRejectedValue(new Error('Permission denied'))

      const { result } = renderHook(() => useDevices())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Permission denied')
    })

    it('sets error when mediaDevices is not supported', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useDevices())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Device enumeration not supported in this browser')
    })
  })
})

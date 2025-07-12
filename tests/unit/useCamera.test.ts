import { renderHook, act } from '@testing-library/react'
import { useCamera } from '@/hooks/useCamera'

// Mock getUserMedia and related APIs
const mockGetUserMedia = jest.fn()
const mockEnumerateDevices = jest.fn()
const mockTrack = { stop: jest.fn(), kind: 'video', enabled: true }
const mockStream = { getTracks: () => [mockTrack] }

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices,
  },
})

describe('useCamera Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockEnumerateDevices.mockResolvedValue([
      {
        deviceId: 'camera1',
        kind: 'videoinput',
        label: 'Front Camera',
      },
      {
        deviceId: 'camera2',
        kind: 'videoinput',
        label: 'Back Camera',
      },
    ])
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCamera())

      expect(result.current.stream).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.availableDevices).toEqual([])
      expect(result.current.selectedDeviceId).toBeNull()
    })

    it('should enumerate devices on mount', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useCamera())

      await waitForNextUpdate()

      expect(mockEnumerateDevices).toHaveBeenCalled()
      expect(result.current.availableDevices).toHaveLength(2)
      expect(result.current.availableDevices[0]).toEqual({
        deviceId: 'camera1',
        kind: 'videoinput',
        label: 'Front Camera',
      })
    })

    it('should auto-select first device when none specified', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useCamera())

      await waitForNextUpdate()

      expect(result.current.selectedDeviceId).toBe('camera1')
    })
  })

  describe('Camera Start/Stop', () => {
    it('should start camera successfully', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useCamera())

      await waitForNextUpdate() // Wait for device enumeration

      await act(async () => {
        await result.current.startCamera()
      })

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          deviceId: { exact: 'camera1' },
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      })
      expect(result.current.stream).toBe(mockStream)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle camera start errors', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useCamera())
      
      mockGetUserMedia.mockRejectedValueOnce(
        new Error('NotAllowedError')
      )

      await waitForNextUpdate()

      await act(async () => {
        await result.current.startCamera()
      })

      expect(result.current.stream).toBeNull()
      expect(result.current.error).toContain('Camera access denied')
    })

    it('should stop camera and cleanup tracks', () => {
      const { result } = renderHook(() => useCamera())

      // Simulate having a stream
      act(() => {
        result.current.startCamera()
      })

      act(() => {
        result.current.stopCamera()
      })

      expect(mockTrack.stop).toHaveBeenCalled()
      expect(result.current.stream).toBeNull()
    })
  })

  describe('Camera Switching', () => {
    it('should switch to different camera device', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useCamera())

      await waitForNextUpdate()

      // Start with first camera
      await act(async () => {
        await result.current.startCamera()
      })

      // Switch to second camera
      await act(async () => {
        await result.current.switchCamera('camera2')
      })

      expect(result.current.selectedDeviceId).toBe('camera2')
      expect(mockGetUserMedia).toHaveBeenCalledTimes(2)
    })

    it('should not restart camera when switching to same device', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useCamera())

      await waitForNextUpdate()

      await act(async () => {
        await result.current.startCamera()
      })

      const initialCallCount = mockGetUserMedia.mock.calls.length

      await act(async () => {
        await result.current.switchCamera('camera1') // Same device
      })

      expect(mockGetUserMedia).toHaveBeenCalledTimes(initialCallCount)
    })
  })

  describe('Device Management', () => {
    it('should refresh device list', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useCamera())

      await waitForNextUpdate()

      // Clear and add new devices
      mockEnumerateDevices.mockResolvedValueOnce([
        {
          deviceId: 'camera3',
          kind: 'videoinput',
          label: 'New Camera',
        },
      ])

      await act(async () => {
        await result.current.refreshDevices()
      })

      expect(result.current.availableDevices).toHaveLength(1)
      expect(result.current.availableDevices[0].deviceId).toBe('camera3')
    })

    it('should handle device enumeration errors', async () => {
      const { result } = renderHook(() => useCamera())

      mockEnumerateDevices.mockRejectedValueOnce(
        new Error('Device enumeration failed')
      )

      await act(async () => {
        await result.current.refreshDevices()
      })

      expect(result.current.error).toContain('Device enumeration failed')
    })
  })

  describe('Options and Configuration', () => {
    it('should use preferred device ID', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useCamera({ preferredDeviceId: 'camera2' })
      )

      await waitForNextUpdate()

      expect(result.current.selectedDeviceId).toBe('camera2')
    })

    it('should auto-start camera when enabled', async () => {
      const { waitForNextUpdate } = renderHook(() =>
        useCamera({ autoStart: true })
      )

      await waitForNextUpdate()

      expect(mockGetUserMedia).toHaveBeenCalled()
    })

    it('should use custom constraints', async () => {
      const customConstraints = {
        video: {
          width: { exact: 1280 },
          height: { exact: 720 },
        },
        audio: false,
      }

      const { result, waitForNextUpdate } = renderHook(() =>
        useCamera({ constraints: customConstraints })
      )

      await waitForNextUpdate()

      await act(async () => {
        await result.current.startCamera()
      })

      expect(mockGetUserMedia).toHaveBeenCalledWith(customConstraints)
    })
  })

  describe('Error Handling', () => {
    const errorCases = [
      {
        errorName: 'NotFoundError',
        expectedMessage: 'No camera devices found',
      },
      {
        errorName: 'NotReadableError',
        expectedMessage: 'Camera is already in use by another application',
      },
      {
        errorName: 'OverconstrainedError',
        expectedMessage: 'Camera does not support the required constraints',
      },
      {
        errorName: 'NotAllowedError',
        expectedMessage: 'Camera access denied. Please grant camera permissions',
      },
      {
        errorName: 'TypeError',
        expectedMessage: 'Camera constraints are not supported',
      },
    ]

    errorCases.forEach(({ errorName, expectedMessage }) => {
      it(`should handle ${errorName} correctly`, async () => {
        const { result, waitForNextUpdate } = renderHook(() => useCamera())

        const error = new Error('Test error')
        error.name = errorName
        mockGetUserMedia.mockRejectedValueOnce(error)

        await waitForNextUpdate()

        await act(async () => {
          await result.current.startCamera()
        })

        expect(result.current.error).toContain(expectedMessage)
      })
    })
  })

  describe('Cleanup', () => {
    it('should cleanup stream on unmount', () => {
      const { result, unmount } = renderHook(() => useCamera())

      // Simulate having a stream
      act(() => {
        result.current.startCamera()
      })

      unmount()

      expect(mockTrack.stop).toHaveBeenCalled()
    })
  })
})
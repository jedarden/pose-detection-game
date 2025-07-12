import { useState, useEffect, useCallback, useRef } from 'react'
// Using MediaDeviceInfo instead of custom CameraDevice type

interface UseCameraOptions {
  autoStart?: boolean
  preferredDeviceId?: string
  constraints?: MediaStreamConstraints
}

interface UseCameraReturn {
  stream: MediaStream | null
  isLoading: boolean
  error: string | null
  availableDevices: MediaDeviceInfo[]
  selectedDeviceId: string | null
  startCamera: (deviceId?: string) => Promise<void>
  stopCamera: () => void
  switchCamera: (deviceId: string) => Promise<void>
  refreshDevices: () => Promise<void>
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const {
    autoStart = false,
    preferredDeviceId,
    constraints: customConstraints,
  } = options

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(
    preferredDeviceId || null
  )

  const currentStreamRef = useRef<MediaStream | null>(null)

  const refreshDevices = useCallback(async () => {
    try {
      setError(null)
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')

      setAvailableDevices(videoDevices)

      // Set default device if none selected
      if (!selectedDeviceId && videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enumerate devices'
      setError(errorMessage)
      console.error('Error enumerating devices:', err)
    }
  }, [selectedDeviceId])

  const stopCamera = useCallback(() => {
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      currentStreamRef.current = null
      setStream(null)
    }
  }, [])

  const startCamera = useCallback(async (deviceId?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Stop current stream if exists
      stopCamera()

      const targetDeviceId = deviceId || selectedDeviceId
      
      const defaultConstraints: MediaStreamConstraints = {
        video: {
          deviceId: targetDeviceId ? { exact: targetDeviceId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      }

      const constraints = customConstraints || defaultConstraints
      const newStream = await navigator.mediaDevices.getUserMedia(constraints)

      currentStreamRef.current = newStream
      setStream(newStream)
      
      if (targetDeviceId) {
        setSelectedDeviceId(targetDeviceId)
      }
    } catch (err) {
      let errorMessage = 'Failed to access camera'
      
      if (err instanceof Error) {
        switch (err.name) {
          case 'NotFoundError':
          case 'DevicesNotFoundError':
            errorMessage = 'No camera devices found'
            break
          case 'NotReadableError':
          case 'TrackStartError':
            errorMessage = 'Camera is already in use by another application'
            break
          case 'OverconstrainedError':
            errorMessage = 'Camera does not support the required constraints'
            break
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            errorMessage = 'Camera access denied. Please grant camera permissions'
            break
          case 'TypeError':
            errorMessage = 'Camera constraints are not supported'
            break
          default:
            errorMessage = err.message
        }
      }

      setError(errorMessage)
      console.error('Error accessing camera:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedDeviceId, customConstraints, stopCamera])

  const switchCamera = useCallback(async (deviceId: string) => {
    if (deviceId === selectedDeviceId) return
    
    setSelectedDeviceId(deviceId)
    
    if (stream) {
      await startCamera(deviceId)
    }
  }, [selectedDeviceId, stream, startCamera])

  // Initialize devices on mount
  useEffect(() => {
    refreshDevices()
  }, [refreshDevices])

  // Auto-start camera if requested
  useEffect(() => {
    if (autoStart && availableDevices.length > 0 && !stream && !isLoading) {
      startCamera()
    }
  }, [autoStart, availableDevices.length, stream, isLoading, startCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return {
    stream,
    isLoading,
    error,
    availableDevices,
    selectedDeviceId,
    startCamera,
    stopCamera,
    switchCamera,
    refreshDevices,
  }
}
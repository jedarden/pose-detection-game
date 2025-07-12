import { useRef, useEffect } from 'react'
// CameraDevice type not defined, using local interface

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface CameraPreviewProps {
  stream: MediaStream | null
  isLoading: boolean
  error: string | null
  availableDevices: CameraDevice[]
  selectedDeviceId: string | null
  onDeviceChange: (deviceId: string) => void
  onStartCamera: () => void
  onStopCamera: () => void
  className?: string
}

export function CameraPreview({
  stream,
  isLoading,
  error,
  availableDevices,
  selectedDeviceId,
  onDeviceChange,
  onStartCamera,
  onStopCamera,
  className = '',
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const handleDeviceChange = (event: { target: { value: string } }) => {
    onDeviceChange(event.target.value)
  }

  return (
    <div className={`camera-preview ${className}`} data-testid="camera-preview">
      <div className="camera-controls" data-testid="camera-controls">
        <select
          value={selectedDeviceId || ''}
          onChange={handleDeviceChange}
          disabled={isLoading || availableDevices.length === 0}
          data-testid="camera-device-selector"
          aria-label="Select camera device"
        >
          <option value="">Select a camera</option>
          {availableDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>

        {stream ? (
          <button
            onClick={onStopCamera}
            disabled={isLoading}
            data-testid="stop-camera-button"
            aria-label="Stop camera"
            className="stop-button"
          >
            Stop Camera
          </button>
        ) : (
          <button
            onClick={onStartCamera}
            disabled={isLoading || !selectedDeviceId}
            data-testid="start-camera-button"
            aria-label="Start camera"
            className="start-button"
          >
            {isLoading ? 'Starting...' : 'Start Camera'}
          </button>
        )}
      </div>

      {error && (
        <div
          className="camera-error"
          data-testid="camera-error"
          role="alert"
          aria-live="polite"
        >
          <p>Camera Error: {error}</p>
          <button
            onClick={onStartCamera}
            data-testid="retry-camera-button"
            className="retry-button"
          >
            Retry
          </button>
        </div>
      )}

      <div className="video-container" data-testid="video-container">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            data-testid="camera-video"
            aria-label="Camera preview"
            className="camera-video"
          />
        ) : (
          <div
            className="video-placeholder"
            data-testid="video-placeholder"
            aria-label="Camera not active"
          >
            <p>Camera not active</p>
          </div>
        )}
      </div>

      <div className="camera-status" data-testid="camera-status">
        {isLoading && <span>Loading camera...</span>}
        {stream && !isLoading && <span>Camera Ready</span>}
        {!stream && !isLoading && !error && <span>Camera Stopped</span>}
      </div>
    </div>
  )
}
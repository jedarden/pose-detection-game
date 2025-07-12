import React from 'react'
import { render, screen, fireEvent } from '../utils/test-helpers'
import { CameraPreview } from '@/components/CameraPreview'
import type { CameraDevice } from '@/types'

describe('CameraPreview Component', () => {
  const mockDevices: CameraDevice[] = [
    { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera' },
    { deviceId: 'camera2', kind: 'videoinput', label: 'Back Camera' },
  ]

  const defaultProps = {
    stream: null,
    isLoading: false,
    error: null,
    availableDevices: mockDevices,
    selectedDeviceId: 'camera1',
    onDeviceChange: jest.fn(),
    onStartCamera: jest.fn(),
    onStopCamera: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render camera preview component', () => {
      render(<CameraPreview {...defaultProps} />)
      
      expect(screen.getByTestId('camera-preview')).toBeInTheDocument()
      expect(screen.getByTestId('camera-controls')).toBeInTheDocument()
      expect(screen.getByTestId('video-container')).toBeInTheDocument()
    })

    it('should render device selector with available devices', () => {
      render(<CameraPreview {...defaultProps} />)
      
      const selector = screen.getByTestId('camera-device-selector')
      expect(selector).toBeInTheDocument()
      
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(3) // "Select a camera" + 2 devices
      expect(options[1]).toHaveTextContent('Front Camera')
      expect(options[2]).toHaveTextContent('Back Camera')
    })

    it('should show start camera button when no stream', () => {
      render(<CameraPreview {...defaultProps} />)
      
      expect(screen.getByTestId('start-camera-button')).toBeInTheDocument()
      expect(screen.queryByTestId('stop-camera-button')).not.toBeInTheDocument()
    })

    it('should show stop camera button when stream is active', () => {
      const mockStream = { getTracks: () => [] } as MediaStream
      
      render(<CameraPreview {...defaultProps} stream={mockStream} />)
      
      expect(screen.getByTestId('stop-camera-button')).toBeInTheDocument()
      expect(screen.queryByTestId('start-camera-button')).not.toBeInTheDocument()
    })

    it('should show video placeholder when no stream', () => {
      render(<CameraPreview {...defaultProps} />)
      
      expect(screen.getByTestId('video-placeholder')).toBeInTheDocument()
      expect(screen.getByText('Camera not active')).toBeInTheDocument()
      expect(screen.queryByTestId('camera-video')).not.toBeInTheDocument()
    })

    it('should show video element when stream is active', () => {
      const mockStream = { getTracks: () => [] } as MediaStream
      
      render(<CameraPreview {...defaultProps} stream={mockStream} />)
      
      expect(screen.getByTestId('camera-video')).toBeInTheDocument()
      expect(screen.queryByTestId('video-placeholder')).not.toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading state', () => {
      render(<CameraPreview {...defaultProps} isLoading={true} />)
      
      expect(screen.getByText('Starting...')).toBeInTheDocument()
      expect(screen.getByText('Loading camera...')).toBeInTheDocument()
      
      const startButton = screen.getByTestId('start-camera-button')
      expect(startButton).toBeDisabled()
    })

    it('should disable device selector during loading', () => {
      render(<CameraPreview {...defaultProps} isLoading={true} />)
      
      const selector = screen.getByTestId('camera-device-selector')
      expect(selector).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should display error message', () => {
      const errorMessage = 'Camera access denied'
      
      render(<CameraPreview {...defaultProps} error={errorMessage} />)
      
      const errorElement = screen.getByTestId('camera-error')
      expect(errorElement).toBeInTheDocument()
      expect(errorElement).toHaveAttribute('role', 'alert')
      expect(errorElement).toHaveAttribute('aria-live', 'polite')
      expect(screen.getByText(`Camera Error: ${errorMessage}`)).toBeInTheDocument()
    })

    it('should show retry button on error', () => {
      render(<CameraPreview {...defaultProps} error="Camera error" />)
      
      expect(screen.getByTestId('retry-camera-button')).toBeInTheDocument()
    })

    it('should call onStartCamera when retry button is clicked', () => {
      const onStartCamera = jest.fn()
      
      render(
        <CameraPreview
          {...defaultProps}
          error="Camera error"
          onStartCamera={onStartCamera}
        />
      )
      
      fireEvent.click(screen.getByTestId('retry-camera-button'))
      expect(onStartCamera).toHaveBeenCalledTimes(1)
    })
  })

  describe('User Interactions', () => {
    it('should call onStartCamera when start button is clicked', () => {
      const onStartCamera = jest.fn()
      
      render(<CameraPreview {...defaultProps} onStartCamera={onStartCamera} />)
      
      fireEvent.click(screen.getByTestId('start-camera-button'))
      expect(onStartCamera).toHaveBeenCalledTimes(1)
    })

    it('should call onStopCamera when stop button is clicked', () => {
      const onStopCamera = jest.fn()
      const mockStream = { getTracks: () => [] } as MediaStream
      
      render(
        <CameraPreview
          {...defaultProps}
          stream={mockStream}
          onStopCamera={onStopCamera}
        />
      )
      
      fireEvent.click(screen.getByTestId('stop-camera-button'))
      expect(onStopCamera).toHaveBeenCalledTimes(1)
    })

    it('should call onDeviceChange when device is selected', () => {
      const onDeviceChange = jest.fn()
      
      render(
        <CameraPreview {...defaultProps} onDeviceChange={onDeviceChange} />
      )
      
      const selector = screen.getByTestId('camera-device-selector')
      fireEvent.change(selector, { target: { value: 'camera2' } })
      
      expect(onDeviceChange).toHaveBeenCalledWith('camera2')
    })

    it('should disable start button when no device selected', () => {
      render(<CameraPreview {...defaultProps} selectedDeviceId={null} />)
      
      const startButton = screen.getByTestId('start-camera-button')
      expect(startButton).toBeDisabled()
    })
  })

  describe('Status Display', () => {
    it('should show "Camera Ready" status when stream is active', () => {
      const mockStream = { getTracks: () => [] } as MediaStream
      
      render(<CameraPreview {...defaultProps} stream={mockStream} />)
      
      expect(screen.getByText('Camera Ready')).toBeInTheDocument()
    })

    it('should show "Camera Stopped" status when no stream and not loading', () => {
      render(<CameraPreview {...defaultProps} />)
      
      expect(screen.getByText('Camera Stopped')).toBeInTheDocument()
    })

    it('should show "Loading camera..." status when loading', () => {
      render(<CameraPreview {...defaultProps} isLoading={true} />)
      
      expect(screen.getByText('Loading camera...')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<CameraPreview {...defaultProps} />)
      
      expect(screen.getByLabelText('Select camera device')).toBeInTheDocument()
      expect(screen.getByLabelText('Start camera')).toBeInTheDocument()
      expect(screen.getByLabelText('Camera not active')).toBeInTheDocument()
    })

    it('should have proper ARIA labels for video when active', () => {
      const mockStream = { getTracks: () => [] } as MediaStream
      
      render(<CameraPreview {...defaultProps} stream={mockStream} />)
      
      expect(screen.getByLabelText('Camera preview')).toBeInTheDocument()
      expect(screen.getByLabelText('Stop camera')).toBeInTheDocument()
    })

    it('should use proper semantic HTML', () => {
      render(<CameraPreview {...defaultProps} error="Test error" />)
      
      const errorElement = screen.getByRole('alert')
      expect(errorElement).toBeInTheDocument()
    })
  })

  describe('Video Element Integration', () => {
    it('should set video srcObject when stream is provided', () => {
      const mockStream = { getTracks: () => [] } as MediaStream
      
      render(<CameraPreview {...defaultProps} stream={mockStream} />)
      
      const video = screen.getByTestId('camera-video') as HTMLVideoElement
      expect(video.srcObject).toBe(mockStream)
    })

    it('should have correct video attributes', () => {
      const mockStream = { getTracks: () => [] } as MediaStream
      
      render(<CameraPreview {...defaultProps} stream={mockStream} />)
      
      const video = screen.getByTestId('camera-video') as HTMLVideoElement
      expect(video).toHaveAttribute('autoplay')
      expect(video).toHaveAttribute('playsinline')
      expect(video).toHaveAttribute('muted')
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(<CameraPreview {...defaultProps} className="custom-class" />)
      
      const preview = screen.getByTestId('camera-preview')
      expect(preview).toHaveClass('camera-preview', 'custom-class')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty device list', () => {
      render(<CameraPreview {...defaultProps} availableDevices={[]} />)
      
      const selector = screen.getByTestId('camera-device-selector')
      expect(selector).toBeDisabled()
      
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(1) // Only "Select a camera"
    })

    it('should handle null selectedDeviceId', () => {
      render(<CameraPreview {...defaultProps} selectedDeviceId={null} />)
      
      const selector = screen.getByTestId('camera-device-selector') as HTMLSelectElement
      expect(selector.value).toBe('')
    })

    it('should handle stream and loading simultaneously', () => {
      const mockStream = { getTracks: () => [] } as MediaStream
      
      render(
        <CameraPreview
          {...defaultProps}
          stream={mockStream}
          isLoading={true}
        />
      )
      
      expect(screen.getByTestId('camera-video')).toBeInTheDocument()
      expect(screen.getByText('Camera Ready')).toBeInTheDocument()
    })
  })
})
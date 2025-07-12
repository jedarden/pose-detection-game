import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PoseDetector from './PoseDetector';
import type { PoseDetectorProps, DetectionConfig, CameraSettings } from '../types';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs', () => ({
  ready: jest.fn(() => Promise.resolve()),
}));

jest.mock('@tensorflow-models/pose-detection', () => ({
  SupportedModels: {
    MoveNet: 'MoveNet',
    BlazePose: 'BlazePose'
  },
  createDetector: jest.fn(() => Promise.resolve({
    estimatePoses: jest.fn(() => Promise.resolve([
      {
        keypoints: [
          { x: 100, y: 200, score: 0.9, name: 'nose' },
          { x: 150, y: 250, score: 0.8, name: 'left_eye' }
        ],
        score: 0.85
      }
    ]))
  }))
}));

const mockCameraSettings: CameraSettings = {
  deviceId: 'device1',
  facingMode: 'user',
  width: 640,
  height: 480
};

const mockDetectionConfig: DetectionConfig = {
  modelType: 'MoveNet',
  enableSmoothing: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
};

const defaultProps: PoseDetectorProps = {
  onPoseDetected: jest.fn(),
  config: mockDetectionConfig,
  cameraSettings: mockCameraSettings
};

// Mock getUserMedia
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() => Promise.resolve({
      getTracks: () => [{ stop: jest.fn() }]
    }))
  }
});

describe('PoseDetector Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders video element', () => {
    render(<PoseDetector {...defaultProps} />);
    
    const video = screen.getByTestId('pose-detector-video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('autoPlay');
    expect(video).toHaveAttribute('playsInline');
  });

  test('initializes camera stream on mount', async () => {
    render(<PoseDetector {...defaultProps} />);
    
    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: {
          deviceId: 'device1',
          facingMode: 'user',
          width: 640,
          height: 480
        }
      });
    });
  });

  test('calls onPoseDetected when pose is detected', async () => {
    const mockOnPoseDetected = jest.fn();
    
    render(
      <PoseDetector 
        {...defaultProps} 
        onPoseDetected={mockOnPoseDetected}
      />
    );
    
    await waitFor(() => {
      expect(mockOnPoseDetected).toHaveBeenCalledWith(
        expect.objectContaining({
          keypoints: expect.arrayContaining([
            expect.objectContaining({
              x: expect.any(Number),
              y: expect.any(Number),
              score: expect.any(Number)
            })
          ]),
          score: expect.any(Number)
        })
      );
    }, { timeout: 3000 });
  });

  test('handles camera permission denied', async () => {
    const mockGetUserMedia = jest.fn(() => 
      Promise.reject(new Error('Permission denied'))
    );
    
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia }
    });
    
    render(<PoseDetector {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Camera access denied')).toBeInTheDocument();
    });
  });

  test('displays loading state while initializing', () => {
    render(<PoseDetector {...defaultProps} />);
    
    expect(screen.getByText('Initializing pose detection...')).toBeInTheDocument();
  });

  test('updates when config changes', () => {
    const { rerender } = render(<PoseDetector {...defaultProps} />);
    
    const newConfig = {
      ...mockDetectionConfig,
      modelType: 'BlazePose' as const
    };
    
    rerender(
      <PoseDetector 
        {...defaultProps} 
        config={newConfig}
      />
    );
    
    // Component should reinitialize with new config
    expect(screen.getByTestId('pose-detector-video')).toBeInTheDocument();
  });
});
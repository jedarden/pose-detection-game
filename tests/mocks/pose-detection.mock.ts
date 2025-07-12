// Mock implementation for pose detection functionality

export class MockPoseDetector {
  private callbacks: { [key: string]: Function[] } = {}
  private isRunning = false
  private options: any = {}

  setOptions(options: any) {
    this.options = { ...this.options, ...options }
  }

  onResults(callback: Function) {
    if (!this.callbacks.results) {
      this.callbacks.results = []
    }
    this.callbacks.results.push(callback)
  }

  send(input: any) {
    if (this.isRunning && this.callbacks.results) {
      // Simulate pose detection results
      const mockResults = {
        poseLandmarks: this.generateMockLandmarks(),
        poseWorldLandmarks: [],
        segmentationMask: null,
      }
      
      this.callbacks.results.forEach(callback => callback(mockResults))
    }
  }

  start() {
    this.isRunning = true
  }

  stop() {
    this.isRunning = false
  }

  close() {
    this.isRunning = false
    this.callbacks = {}
  }

  private generateMockLandmarks() {
    // Generate realistic pose landmarks for testing
    const landmarks = []
    for (let i = 0; i < 33; i++) {
      landmarks.push({
        x: Math.random() * 0.6 + 0.2, // Keep within reasonable bounds
        y: Math.random() * 0.8 + 0.1,
        z: Math.random() * 0.1 - 0.05,
        visibility: Math.random() * 0.3 + 0.7, // High visibility
      })
    }
    return landmarks
  }
}

export const mockPoseDetectionHook = {
  isLoading: false,
  error: null,
  poseResults: null,
  startDetection: jest.fn(),
  stopDetection: jest.fn(),
  isDetecting: false,
}

export const mockCameraHook = {
  stream: null,
  isLoading: false,
  error: null,
  availableDevices: [
    { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera' },
    { deviceId: 'camera2', kind: 'videoinput', label: 'Back Camera' },
  ],
  selectedDeviceId: 'camera1',
  startCamera: jest.fn(),
  stopCamera: jest.fn(),
  switchCamera: jest.fn(),
}

export const mockGameEngine = {
  score: 0,
  level: 1,
  isPlaying: false,
  timeRemaining: 60,
  currentChallenge: null,
  updateScore: jest.fn(),
  nextLevel: jest.fn(),
  startGame: jest.fn(),
  pauseGame: jest.fn(),
  resetGame: jest.fn(),
  checkPoseMatch: jest.fn().mockReturnValue(true),
  generateChallenge: jest.fn(),
}

export const createMockWebcamRef = () => ({
  current: {
    video: {
      videoWidth: 640,
      videoHeight: 480,
      play: jest.fn(),
      pause: jest.fn(),
    },
    getScreenshot: jest.fn().mockReturnValue('data:image/jpeg;base64,...'),
  },
})

export const mockPerformanceMetrics = {
  fps: 30,
  processingTime: 16.67,
  memoryUsage: 50,
  accuracy: 0.95,
}
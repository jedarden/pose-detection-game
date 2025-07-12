import '@testing-library/jest-dom'

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs', () => ({
  ready: jest.fn().mockResolvedValue(undefined),
  loadLayersModel: jest.fn(),
  browser: {
    fromPixels: jest.fn(),
  },
  tensor: jest.fn(),
  dispose: jest.fn(),
}))

// Mock pose detection models
jest.mock('@tensorflow-models/pose-detection', () => ({
  SupportedModels: {
    MoveNet: 'MoveNet',
    PoseNet: 'PoseNet',
  },
  createDetector: jest.fn(),
}))

// Mock MediaDevices API
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [],
      getVideoTracks: () => [],
      getAudioTracks: () => [],
    }),
  },
})

// Mock HTMLVideoElement
Object.defineProperty(global.HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: jest.fn().mockResolvedValue(undefined),
})

// Mock Phaser
jest.mock('phaser', () => ({
  Game: jest.fn(),
  Scene: jest.fn(),
  AUTO: 'AUTO',
  Scale: {
    FIT: 'FIT',
    CENTER_BOTH: 'CENTER_BOTH',
  },
}))

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
}
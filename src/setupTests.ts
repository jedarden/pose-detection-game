import '@testing-library/jest-dom'
import 'jest-canvas-mock'

// Mock MediaPipe and TensorFlow.js modules
jest.mock('@mediapipe/pose', () => ({
  Pose: jest.fn().mockImplementation(() => ({
    setOptions: jest.fn(),
    onResults: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
  })),
  POSE_CONNECTIONS: [],
  POSE_LANDMARKS: {},
}))

jest.mock('@tensorflow/tfjs', () => ({
  loadLayersModel: jest.fn(),
  tensor: jest.fn(),
  dispose: jest.fn(),
  browser: {
    fromPixels: jest.fn(),
  },
  ready: jest.fn().mockResolvedValue(undefined),
  setBackend: jest.fn(),
}))

// Mock getUserMedia for camera testing
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [
        {
          stop: jest.fn(),
          kind: 'video',
          enabled: true,
        },
      ],
    }),
    enumerateDevices: jest.fn().mockResolvedValue([
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
    ]),
  },
})

// Mock HTMLVideoElement
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: jest.fn().mockResolvedValue(undefined),
})

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: jest.fn(),
})

// Mock HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Array(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Array(4) })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Performance testing setup
performance.mark = jest.fn()
performance.measure = jest.fn()
performance.getEntriesByName = jest.fn().mockReturnValue([{ duration: 16.67 }])

// Global test utilities
declare global {
  var testUtils: {
    mockPoseResults: any
    mockGameState: any
  }
}

global.testUtils = {
  mockPoseResults: {
    poseLandmarks: [
      { x: 0.5, y: 0.5, z: 0, visibility: 0.9 },
      { x: 0.4, y: 0.3, z: 0, visibility: 0.8 },
    ],
    poseWorldLandmarks: [],
    segmentationMask: null,
  },
  mockGameState: {
    score: 0,
    level: 1,
    isPlaying: false,
    timeRemaining: 60,
  },
}
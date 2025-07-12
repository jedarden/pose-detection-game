import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Testing utilities
export const createMockVideoElement = (): HTMLVideoElement => {
  const video = document.createElement('video')
  Object.defineProperty(video, 'videoWidth', { value: 640, writable: true })
  Object.defineProperty(video, 'videoHeight', { value: 480, writable: true })
  Object.defineProperty(video, 'readyState', { value: 4, writable: true })
  return video
}

export const createMockCanvasElement = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 480
  return canvas
}

export const createMockPoseResults = (overrides = {}) => ({
  poseLandmarks: [
    { x: 0.5, y: 0.5, z: 0, visibility: 0.9 },
    { x: 0.4, y: 0.3, z: 0, visibility: 0.8 },
    { x: 0.6, y: 0.7, z: 0, visibility: 0.85 },
  ],
  poseWorldLandmarks: [],
  segmentationMask: null,
  ...overrides,
})

export const mockCameraStream = () => ({
  getTracks: () => [
    {
      stop: jest.fn(),
      kind: 'video',
      enabled: true,
      getSettings: () => ({
        width: 640,
        height: 480,
        frameRate: 30,
      }),
    },
  ],
})

export const mockGameStateProvider = {
  score: 0,
  level: 1,
  isPlaying: false,
  timeRemaining: 60,
  setScore: jest.fn(),
  setLevel: jest.fn(),
  setIsPlaying: jest.fn(),
  setTimeRemaining: jest.fn(),
  resetGame: jest.fn(),
}

export const waitForPoseDetection = (timeout = 1000) => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, timeout)
  })
}

export const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now()
  await fn()
  const end = performance.now()
  return end - start
}

export const expectPerformance = (duration: number, maxDuration: number) => {
  expect(duration).toBeLessThan(maxDuration)
}
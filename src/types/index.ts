// Core type definitions for the pose detection game

export interface PosePoint {
  x: number
  y: number
  z: number
  visibility: number
}

export interface PoseResults {
  poseLandmarks: PosePoint[]
  poseWorldLandmarks: PosePoint[]
  segmentationMask: ImageData | null
}

export interface GameState {
  score: number
  level: number
  isPlaying: boolean
  timeRemaining: number
  currentChallenge: Challenge | null
}

export interface Challenge {
  id: string
  name: string
  description: string
  targetPose: PosePoint[]
  duration: number
  points: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface CameraDevice {
  deviceId: string
  kind: string
  label: string
}

export interface PerformanceMetrics {
  fps: number
  processingTime: number
  memoryUsage: number
  accuracy: number
}

export interface PoseDetectionConfig {
  modelComplexity: number
  enableSegmentation: boolean
  smoothLandmarks: boolean
  minDetectionConfidence: number
  minTrackingConfidence: number
}

export interface GameSettings {
  difficulty: 'easy' | 'medium' | 'hard'
  gameMode: 'timed' | 'endless' | 'challenge'
  soundEnabled: boolean
  showDebugInfo: boolean
}
import type { 
  PosePoint, 
  PoseResults, 
  GameState, 
  Challenge,
  PerformanceMetrics 
} from '@/types'

describe('Type Definitions', () => {
  describe('PosePoint', () => {
    it('should have the correct structure', () => {
      const posePoint: PosePoint = {
        x: 0.5,
        y: 0.3,
        z: 0.1,
        visibility: 0.9
      }

      expect(typeof posePoint.x).toBe('number')
      expect(typeof posePoint.y).toBe('number')
      expect(typeof posePoint.z).toBe('number')
      expect(typeof posePoint.visibility).toBe('number')
    })

    it('should accept valid coordinate ranges', () => {
      const validPoint: PosePoint = {
        x: 0.0,
        y: 1.0,
        z: -0.1,
        visibility: 0.0
      }

      expect(validPoint.x).toBeGreaterThanOrEqual(0)
      expect(validPoint.x).toBeLessThanOrEqual(1)
      expect(validPoint.y).toBeGreaterThanOrEqual(0)
      expect(validPoint.y).toBeLessThanOrEqual(1)
      expect(validPoint.visibility).toBeGreaterThanOrEqual(0)
      expect(validPoint.visibility).toBeLessThanOrEqual(1)
    })
  })

  describe('PoseResults', () => {
    it('should contain pose landmarks array', () => {
      const poseResults: PoseResults = {
        poseLandmarks: [
          { x: 0.5, y: 0.5, z: 0, visibility: 0.9 }
        ],
        poseWorldLandmarks: [],
        segmentationMask: null
      }

      expect(Array.isArray(poseResults.poseLandmarks)).toBe(true)
      expect(Array.isArray(poseResults.poseWorldLandmarks)).toBe(true)
    })
  })

  describe('GameState', () => {
    it('should have correct initial state structure', () => {
      const gameState: GameState = {
        score: 0,
        level: 1,
        isPlaying: false,
        timeRemaining: 60,
        currentChallenge: null
      }

      expect(typeof gameState.score).toBe('number')
      expect(typeof gameState.level).toBe('number')
      expect(typeof gameState.isPlaying).toBe('boolean')
      expect(typeof gameState.timeRemaining).toBe('number')
      expect(gameState.score).toBeGreaterThanOrEqual(0)
      expect(gameState.level).toBeGreaterThan(0)
    })
  })

  describe('Challenge', () => {
    it('should have valid difficulty levels', () => {
      const difficulties = ['easy', 'medium', 'hard'] as const
      
      difficulties.forEach(difficulty => {
        const challenge: Challenge = {
          id: 'test-challenge',
          name: 'Test Challenge',
          description: 'A test challenge',
          targetPose: [{ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }],
          duration: 30,
          points: 100,
          difficulty
        }

        expect(['easy', 'medium', 'hard']).toContain(challenge.difficulty)
      })
    })
  })

  describe('PerformanceMetrics', () => {
    it('should track performance correctly', () => {
      const metrics: PerformanceMetrics = {
        fps: 30,
        processingTime: 16.67,
        memoryUsage: 50,
        accuracy: 0.95
      }

      expect(metrics.fps).toBeGreaterThan(0)
      expect(metrics.processingTime).toBeGreaterThan(0)
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0)
      expect(metrics.accuracy).toBeGreaterThanOrEqual(0)
      expect(metrics.accuracy).toBeLessThanOrEqual(1)
    })
  })
})
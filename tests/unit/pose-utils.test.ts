import {
  calculateDistance,
  calculateAngle,
  isPointVisible,
  normalizePose,
  comparePoses,
  getKeyPoints,
  detectRaisedArms,
  calculateStability,
} from '@/utils/pose-utils'
import type { PosePoint, PoseResults } from '@/types'
import { createMockPoseResults } from '../utils/test-helpers'

describe('Pose Utilities', () => {
  const mockPoint1: PosePoint = { x: 0, y: 0, z: 0, visibility: 1 }
  const mockPoint2: PosePoint = { x: 1, y: 1, z: 0, visibility: 1 }
  const mockPoint3: PosePoint = { x: 0, y: 1, z: 0, visibility: 1 }

  describe('calculateDistance', () => {
    it('should calculate correct distance between two points', () => {
      const distance = calculateDistance(mockPoint1, mockPoint2)
      expect(distance).toBeCloseTo(Math.sqrt(2), 5)
    })

    it('should return 0 for identical points', () => {
      const distance = calculateDistance(mockPoint1, mockPoint1)
      expect(distance).toBe(0)
    })

    it('should handle 3D distances', () => {
      const point1: PosePoint = { x: 0, y: 0, z: 0, visibility: 1 }
      const point2: PosePoint = { x: 1, y: 1, z: 1, visibility: 1 }
      const distance = calculateDistance(point1, point2)
      expect(distance).toBeCloseTo(Math.sqrt(3), 5)
    })
  })

  describe('calculateAngle', () => {
    it('should calculate correct angle between three points', () => {
      const angle = calculateAngle(mockPoint1, mockPoint3, mockPoint2)
      expect(angle).toBeCloseTo(45, 1)
    })

    it('should return 90 degrees for perpendicular lines', () => {
      const point1: PosePoint = { x: 0, y: 0, z: 0, visibility: 1 }
      const vertex: PosePoint = { x: 1, y: 0, z: 0, visibility: 1 }
      const point2: PosePoint = { x: 1, y: 1, z: 0, visibility: 1 }
      
      const angle = calculateAngle(point1, vertex, point2)
      expect(angle).toBeCloseTo(90, 1)
    })

    it('should return 0 for collinear points', () => {
      const point1: PosePoint = { x: 0, y: 0, z: 0, visibility: 1 }
      const vertex: PosePoint = { x: 1, y: 0, z: 0, visibility: 1 }
      const point2: PosePoint = { x: 2, y: 0, z: 0, visibility: 1 }
      
      const angle = calculateAngle(point1, vertex, point2)
      expect(angle).toBeCloseTo(180, 1)
    })
  })

  describe('isPointVisible', () => {
    it('should return true for visible points', () => {
      const visiblePoint: PosePoint = { x: 0.5, y: 0.5, z: 0, visibility: 0.8 }
      expect(isPointVisible(visiblePoint)).toBe(true)
    })

    it('should return false for invisible points', () => {
      const invisiblePoint: PosePoint = { x: 0.5, y: 0.5, z: 0, visibility: 0.3 }
      expect(isPointVisible(invisiblePoint)).toBe(false)
    })

    it('should respect custom visibility threshold', () => {
      const point: PosePoint = { x: 0.5, y: 0.5, z: 0, visibility: 0.6 }
      expect(isPointVisible(point, 0.7)).toBe(false)
      expect(isPointVisible(point, 0.5)).toBe(true)
    })
  })

  describe('normalizePose', () => {
    it('should normalize pose to consistent scale', () => {
      const poseResults: PoseResults = {
        poseLandmarks: [
          { x: 0.2, y: 0.3, z: 0, visibility: 0.9 },
          { x: 0.8, y: 0.7, z: 0, visibility: 0.9 },
        ],
        poseWorldLandmarks: [],
        segmentationMask: null,
      }

      const normalized = normalizePose(poseResults)
      const landmarks = normalized.poseLandmarks

      expect(landmarks[0].x).toBeCloseTo(0, 2)
      expect(landmarks[0].y).toBeCloseTo(0, 2)
      expect(landmarks[1].x).toBeCloseTo(1, 2)
      expect(landmarks[1].y).toBeCloseTo(0.67, 2)
    })

    it('should handle empty pose results', () => {
      const emptyPose: PoseResults = {
        poseLandmarks: [],
        poseWorldLandmarks: [],
        segmentationMask: null,
      }

      const normalized = normalizePose(emptyPose)
      expect(normalized.poseLandmarks).toEqual([])
    })
  })

  describe('comparePoses', () => {
    it('should return high similarity for identical poses', () => {
      const pose1 = [mockPoint1, mockPoint2]
      const pose2 = [mockPoint1, mockPoint2]
      
      const similarity = comparePoses(pose1, pose2)
      expect(similarity).toBeCloseTo(1, 2)
    })

    it('should return low similarity for different poses', () => {
      const pose1 = [mockPoint1, mockPoint2]
      const pose2 = [mockPoint2, mockPoint3]
      
      const similarity = comparePoses(pose1, pose2)
      expect(similarity).toBeLessThan(0.5)
    })

    it('should return 0 for poses of different lengths', () => {
      const pose1 = [mockPoint1, mockPoint2]
      const pose2 = [mockPoint1]
      
      const similarity = comparePoses(pose1, pose2)
      expect(similarity).toBe(0)
    })
  })

  describe('getKeyPoints', () => {
    it('should extract key body landmarks', () => {
      // Create a full pose with 33 landmarks
      const landmarks = Array.from({ length: 33 }, (_, i) => ({
        x: Math.random(),
        y: Math.random(),
        z: 0,
        visibility: 0.9,
      }))

      const poseResults: PoseResults = {
        poseLandmarks: landmarks,
        poseWorldLandmarks: [],
        segmentationMask: null,
      }

      const keyPoints = getKeyPoints(poseResults)
      
      expect(keyPoints).toBeTruthy()
      expect(keyPoints?.nose).toBe(landmarks[0])
      expect(keyPoints?.leftShoulder).toBe(landmarks[11])
      expect(keyPoints?.rightShoulder).toBe(landmarks[12])
      expect(keyPoints?.leftWrist).toBe(landmarks[15])
      expect(keyPoints?.rightWrist).toBe(landmarks[16])
    })

    it('should return null for insufficient landmarks', () => {
      const poseResults: PoseResults = {
        poseLandmarks: [mockPoint1, mockPoint2], // Only 2 landmarks
        poseWorldLandmarks: [],
        segmentationMask: null,
      }

      const keyPoints = getKeyPoints(poseResults)
      expect(keyPoints).toBeNull()
    })
  })

  describe('detectRaisedArms', () => {
    it('should detect raised arms correctly', () => {
      // Create a pose with raised arms
      const landmarks = Array.from({ length: 33 }, (_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.9,
      }))

      // Set shoulders and wrists positions
      landmarks[11] = { x: 0.3, y: 0.4, z: 0, visibility: 0.9 } // left shoulder
      landmarks[12] = { x: 0.7, y: 0.4, z: 0, visibility: 0.9 } // right shoulder
      landmarks[15] = { x: 0.2, y: 0.2, z: 0, visibility: 0.9 } // left wrist (above shoulder)
      landmarks[16] = { x: 0.8, y: 0.2, z: 0, visibility: 0.9 } // right wrist (above shoulder)

      const poseResults: PoseResults = {
        poseLandmarks: landmarks,
        poseWorldLandmarks: [],
        segmentationMask: null,
      }

      expect(detectRaisedArms(poseResults)).toBe(true)
    })

    it('should not detect raised arms when arms are down', () => {
      const landmarks = Array.from({ length: 33 }, (_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.9,
      }))

      // Set shoulders and wrists positions
      landmarks[11] = { x: 0.3, y: 0.4, z: 0, visibility: 0.9 } // left shoulder
      landmarks[12] = { x: 0.7, y: 0.4, z: 0, visibility: 0.9 } // right shoulder
      landmarks[15] = { x: 0.2, y: 0.6, z: 0, visibility: 0.9 } // left wrist (below shoulder)
      landmarks[16] = { x: 0.8, y: 0.6, z: 0, visibility: 0.9 } // right wrist (below shoulder)

      const poseResults: PoseResults = {
        poseLandmarks: landmarks,
        poseWorldLandmarks: [],
        segmentationMask: null,
      }

      expect(detectRaisedArms(poseResults)).toBe(false)
    })
  })

  describe('calculateStability', () => {
    it('should return high stability for consistent poses', () => {
      const consistentPoses = Array.from({ length: 5 }, () => createMockPoseResults())
      const stability = calculateStability(consistentPoses)
      expect(stability).toBeGreaterThan(0.8)
    })

    it('should return low stability for varying poses', () => {
      const varyingPoses = Array.from({ length: 5 }, (_, i) => ({
        poseLandmarks: [
          { x: i * 0.2, y: i * 0.2, z: 0, visibility: 0.9 },
          { x: i * 0.1, y: i * 0.3, z: 0, visibility: 0.9 },
        ],
        poseWorldLandmarks: [],
        segmentationMask: null,
      }))

      const stability = calculateStability(varyingPoses)
      expect(stability).toBeLessThan(0.5)
    })

    it('should return 0 for insufficient pose history', () => {
      const singlePose = [createMockPoseResults()]
      const stability = calculateStability(singlePose)
      expect(stability).toBe(0)
    })
  })
})
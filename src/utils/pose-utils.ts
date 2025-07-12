import type { PosePoint, PoseResults } from '@/types'

/**
 * Calculate the distance between two pose points
 */
export function calculateDistance(point1: PosePoint, point2: PosePoint): number {
  const dx = point1.x - point2.x
  const dy = point1.y - point2.y
  const dz = point1.z - point2.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Calculate the angle between three pose points
 */
export function calculateAngle(
  point1: PosePoint,
  vertex: PosePoint,
  point2: PosePoint
): number {
  const vector1 = {
    x: point1.x - vertex.x,
    y: point1.y - vertex.y,
  }
  const vector2 = {
    x: point2.x - vertex.x,
    y: point2.y - vertex.y,
  }

  const dot = vector1.x * vector2.x + vector1.y * vector2.y
  const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y)
  const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y)

  if (mag1 === 0 || mag2 === 0) return 0

  const cos = dot / (mag1 * mag2)
  const angle = Math.acos(Math.max(-1, Math.min(1, cos)))
  return (angle * 180) / Math.PI
}

/**
 * Check if a pose point is visible and reliable
 */
export function isPointVisible(
  point: PosePoint,
  minVisibility = 0.5
): boolean {
  return point.visibility >= minVisibility
}

/**
 * Normalize pose points to a consistent scale
 */
export function normalizePose(poseResults: PoseResults): PoseResults {
  if (!poseResults.poseLandmarks || poseResults.poseLandmarks.length === 0) {
    return poseResults
  }

  // Find bounding box
  const validPoints = poseResults.poseLandmarks.filter(point => 
    isPointVisible(point)
  )

  if (validPoints.length === 0) return poseResults

  const minX = Math.min(...validPoints.map(p => p.x))
  const maxX = Math.max(...validPoints.map(p => p.x))
  const minY = Math.min(...validPoints.map(p => p.y))
  const maxY = Math.max(...validPoints.map(p => p.y))

  const width = maxX - minX
  const height = maxY - minY
  const scale = Math.max(width, height)

  if (scale === 0) return poseResults

  const normalizedLandmarks = poseResults.poseLandmarks.map(point => ({
    ...point,
    x: (point.x - minX) / scale,
    y: (point.y - minY) / scale,
  }))

  return {
    ...poseResults,
    poseLandmarks: normalizedLandmarks,
  }
}

/**
 * Compare two poses and return similarity score (0-1)
 */
export function comparePoses(
  pose1: PosePoint[],
  pose2: PosePoint[],
  threshold = 0.1
): number {
  if (pose1.length !== pose2.length) return 0

  let totalScore = 0
  let validComparisons = 0

  for (let i = 0; i < pose1.length; i++) {
    const point1 = pose1[i]
    const point2 = pose2[i]

    if (isPointVisible(point1) && isPointVisible(point2)) {
      const distance = calculateDistance(point1, point2)
      const score = Math.max(0, 1 - distance / threshold)
      totalScore += score
      validComparisons++
    }
  }

  return validComparisons > 0 ? totalScore / validComparisons : 0
}

/**
 * Get key pose points for gesture recognition
 */
export function getKeyPoints(poseResults: PoseResults) {
  if (!poseResults.poseLandmarks || poseResults.poseLandmarks.length < 33) {
    return null
  }

  const landmarks = poseResults.poseLandmarks

  return {
    // Head
    nose: landmarks[0],
    leftEye: landmarks[2],
    rightEye: landmarks[5],
    
    // Shoulders
    leftShoulder: landmarks[11],
    rightShoulder: landmarks[12],
    
    // Arms
    leftElbow: landmarks[13],
    rightElbow: landmarks[14],
    leftWrist: landmarks[15],
    rightWrist: landmarks[16],
    
    // Torso
    leftHip: landmarks[23],
    rightHip: landmarks[24],
    
    // Legs
    leftKnee: landmarks[25],
    rightKnee: landmarks[26],
    leftAnkle: landmarks[27],
    rightAnkle: landmarks[28],
  }
}

/**
 * Detect specific gestures
 */
export function detectRaisedArms(poseResults: PoseResults): boolean {
  const keyPoints = getKeyPoints(poseResults)
  if (!keyPoints) return false

  const { leftShoulder, rightShoulder, leftWrist, rightWrist } = keyPoints

  if (!isPointVisible(leftShoulder) || !isPointVisible(rightShoulder) ||
      !isPointVisible(leftWrist) || !isPointVisible(rightWrist)) {
    return false
  }

  // Check if both wrists are above shoulders
  return leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y
}

/**
 * Calculate pose stability over time
 */
export function calculateStability(
  poseHistory: PoseResults[],
  windowSize = 5
): number {
  if (poseHistory.length < 2) return 0

  const recentPoses = poseHistory.slice(-windowSize)
  if (recentPoses.length < 2) return 0

  let totalVariation = 0
  let comparisons = 0

  for (let i = 1; i < recentPoses.length; i++) {
    const pose1 = recentPoses[i - 1].poseLandmarks
    const pose2 = recentPoses[i].poseLandmarks

    if (pose1 && pose2) {
      const similarity = comparePoses(pose1, pose2, 0.05)
      totalVariation += 1 - similarity
      comparisons++
    }
  }

  return comparisons > 0 ? 1 - (totalVariation / comparisons) : 0
}
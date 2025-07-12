import type { 
  GameState, 
  Challenge, 
  PoseResults, 
  PosePoint, 
  PerformanceMetrics 
} from '@/types'
import { comparePoses, detectRaisedArms, calculateStability } from '@/utils/pose-utils'

export class GameEngine {
  private gameState: GameState
  private challenges: Challenge[]
  private poseHistory: PoseResults[] = []
  private gameTimer: NodeJS.Timeout | null = null
  private onStateChange?: (state: GameState) => void
  private onPerformanceUpdate?: (metrics: PerformanceMetrics) => void
  private performanceStartTime = 0
  private frameCount = 0

  constructor(onStateChange?: (state: GameState) => void) {
    this.gameState = this.createInitialState()
    this.challenges = this.generateChallenges()
    this.onStateChange = onStateChange
  }

  private createInitialState(): GameState {
    return {
      score: 0,
      level: 1,
      isPlaying: false,
      timeRemaining: 60,
      currentChallenge: null,
    }
  }

  private generateChallenges(): Challenge[] {
    return [
      {
        id: 'raised-arms',
        name: 'Raise Your Arms',
        description: 'Raise both arms above your shoulders',
        targetPose: [], // Will be populated based on detected gesture
        duration: 10,
        points: 100,
        difficulty: 'easy',
      },
      {
        id: 'star-pose',
        name: 'Star Pose',
        description: 'Stand with arms and legs spread wide',
        targetPose: [],
        duration: 15,
        points: 200,
        difficulty: 'medium',
      },
      {
        id: 'tree-pose',
        name: 'Tree Pose',
        description: 'Stand on one leg with arms up',
        targetPose: [],
        duration: 20,
        points: 300,
        difficulty: 'hard',
      },
    ]
  }

  public getGameState(): GameState {
    return { ...this.gameState }
  }

  public getCurrentChallenge(): Challenge | null {
    return this.gameState.currentChallenge
  }

  public startGame(): void {
    this.gameState = {
      ...this.gameState,
      isPlaying: true,
      timeRemaining: 60,
      score: 0,
      level: 1,
    }

    this.startNextChallenge()
    this.startGameTimer()
    this.notifyStateChange()
  }

  public pauseGame(): void {
    this.gameState = {
      ...this.gameState,
      isPlaying: false,
    }

    this.stopGameTimer()
    this.notifyStateChange()
  }

  public resumeGame(): void {
    this.gameState = {
      ...this.gameState,
      isPlaying: true,
    }

    this.startGameTimer()
    this.notifyStateChange()
  }

  public resetGame(): void {
    this.gameState = this.createInitialState()
    this.poseHistory = []
    this.stopGameTimer()
    this.frameCount = 0
    this.notifyStateChange()
  }

  private startNextChallenge(): void {
    const availableChallenges = this.challenges.filter(
      challenge => this.isChallengeSuitableForLevel(challenge, this.gameState.level)
    )

    if (availableChallenges.length === 0) {
      this.completeLevel()
      return
    }

    const randomChallenge = availableChallenges[
      Math.floor(Math.random() * availableChallenges.length)
    ]

    this.gameState.currentChallenge = randomChallenge
    this.notifyStateChange()
  }

  private isChallengeSuitableForLevel(challenge: Challenge, level: number): boolean {
    if (level <= 2) return challenge.difficulty === 'easy'
    if (level <= 4) return challenge.difficulty !== 'hard'
    return true
  }

  private completeLevel(): void {
    this.gameState = {
      ...this.gameState,
      level: this.gameState.level + 1,
      timeRemaining: Math.min(this.gameState.timeRemaining + 30, 120),
    }

    this.startNextChallenge()
  }

  private startGameTimer(): void {
    this.stopGameTimer()
    
    this.gameTimer = setInterval(() => {
      if (this.gameState.timeRemaining <= 0) {
        this.endGame()
        return
      }

      this.gameState = {
        ...this.gameState,
        timeRemaining: this.gameState.timeRemaining - 1,
      }

      this.notifyStateChange()
    }, 1000)
  }

  private stopGameTimer(): void {
    if (this.gameTimer) {
      clearInterval(this.gameTimer)
      this.gameTimer = null
    }
  }

  private endGame(): void {
    this.gameState = {
      ...this.gameState,
      isPlaying: false,
      currentChallenge: null,
    }

    this.stopGameTimer()
    this.notifyStateChange()
  }

  public processPoseResults(poseResults: PoseResults): void {
    if (!this.gameState.isPlaying || !this.gameState.currentChallenge) {
      return
    }

    // Add to pose history for stability calculation
    this.poseHistory.push(poseResults)
    if (this.poseHistory.length > 10) {
      this.poseHistory.shift()
    }

    // Update performance metrics
    this.updatePerformanceMetrics()

    // Check if current challenge is completed
    const challengeCompleted = this.checkChallengeCompletion(
      poseResults,
      this.gameState.currentChallenge
    )

    if (challengeCompleted) {
      this.completeChallenge()
    }
  }

  private checkChallengeCompletion(
    poseResults: PoseResults,
    challenge: Challenge
  ): boolean {
    switch (challenge.id) {
      case 'raised-arms':
        return detectRaisedArms(poseResults)
      
      case 'star-pose':
        return this.checkStarPose(poseResults)
      
      case 'tree-pose':
        return this.checkTreePose(poseResults)
      
      default:
        return false
    }
  }

  private checkStarPose(poseResults: PoseResults): boolean {
    if (!poseResults.poseLandmarks || poseResults.poseLandmarks.length < 33) {
      return false
    }

    const landmarks = poseResults.poseLandmarks
    const leftShoulder = landmarks[11]
    const rightShoulder = landmarks[12]
    const leftWrist = landmarks[15]
    const rightWrist = landmarks[16]
    const leftAnkle = landmarks[27]
    const rightAnkle = landmarks[28]

    // Check if arms are spread and legs are apart
    const armsSpread = 
      leftWrist.x < leftShoulder.x && 
      rightWrist.x > rightShoulder.x &&
      leftWrist.y < leftShoulder.y + 0.1 &&
      rightWrist.y < rightShoulder.y + 0.1

    const legsApart = Math.abs(leftAnkle.x - rightAnkle.x) > 0.3

    return armsSpread && legsApart
  }

  private checkTreePose(poseResults: PoseResults): boolean {
    if (!poseResults.poseLandmarks || poseResults.poseLandmarks.length < 33) {
      return false
    }

    const stability = calculateStability(this.poseHistory, 5)
    const armsRaised = detectRaisedArms(poseResults)
    
    // Simple tree pose detection: arms raised + good stability
    return armsRaised && stability > 0.8
  }

  private completeChallenge(): void {
    if (!this.gameState.currentChallenge) return

    const points = this.calculateChallengePoints(this.gameState.currentChallenge)
    
    this.gameState = {
      ...this.gameState,
      score: this.gameState.score + points,
      currentChallenge: null,
    }

    // Start next challenge after a brief delay
    setTimeout(() => {
      if (this.gameState.isPlaying) {
        this.startNextChallenge()
      }
    }, 2000)

    this.notifyStateChange()
  }

  private calculateChallengePoints(challenge: Challenge): number {
    const basePoints = challenge.points
    const levelMultiplier = 1 + (this.gameState.level - 1) * 0.2
    const stabilityBonus = this.poseHistory.length > 0 
      ? calculateStability(this.poseHistory) * 50 
      : 0

    return Math.round(basePoints * levelMultiplier + stabilityBonus)
  }

  private updatePerformanceMetrics(): void {
    this.frameCount++
    
    if (this.frameCount === 1) {
      this.performanceStartTime = performance.now()
    }

    if (this.frameCount % 30 === 0) { // Update every 30 frames
      const currentTime = performance.now()
      const elapsed = currentTime - this.performanceStartTime
      const fps = (this.frameCount / elapsed) * 1000

      const metrics: PerformanceMetrics = {
        fps: Math.round(fps),
        processingTime: elapsed / this.frameCount,
        memoryUsage: this.estimateMemoryUsage(),
        accuracy: this.calculateAccuracy(),
      }

      if (this.onPerformanceUpdate) {
        this.onPerformanceUpdate(metrics)
      }
    }
  }

  private estimateMemoryUsage(): number {
    // Estimate based on pose history and game state
    const poseHistorySize = this.poseHistory.length * 33 * 4 // Rough estimate
    const gameStateSize = 1000 // Rough estimate
    return (poseHistorySize + gameStateSize) / 1024 // KB
  }

  private calculateAccuracy(): number {
    if (this.poseHistory.length < 2) return 1.0
    
    const stability = calculateStability(this.poseHistory)
    return Math.min(1.0, stability + 0.1) // Bias towards high accuracy
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getGameState())
    }
  }

  public setPerformanceCallback(callback: (metrics: PerformanceMetrics) => void): void {
    this.onPerformanceUpdate = callback
  }

  public cleanup(): void {
    this.stopGameTimer()
    this.poseHistory = []
    this.frameCount = 0
  }
}
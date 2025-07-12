// Custom Cypress commands for pose detection game

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Start the camera with mock data
       */
      startMockCamera(): Chainable<void>
      
      /**
       * Simulate pose detection results
       */
      simulatePose(poseType: 'raised-arms' | 'star-pose' | 'tree-pose'): Chainable<void>
      
      /**
       * Check game state
       */
      checkGameState(expectedState: Partial<{
        score: number
        level: number
        isPlaying: boolean
        timeRemaining: number
      }>): Chainable<void>
      
      /**
       * Wait for pose detection to be ready
       */
      waitForPoseDetection(): Chainable<void>
      
      /**
       * Get performance metrics
       */
      getPerformanceMetrics(): Chainable<any>
      
      /**
       * Mock camera permissions
       */
      mockCameraPermissions(granted: boolean): Chainable<void>
    }
  }
}

Cypress.Commands.add('startMockCamera', () => {
  cy.window().then((win) => {
    // Trigger camera start
    cy.get('[data-testid="start-camera-button"]').click()
    
    // Wait for camera to be ready
    cy.get('[data-testid="camera-status"]').should('contain', 'Camera Ready')
  })
})

Cypress.Commands.add('simulatePose', (poseType: string) => {
  cy.window().then((win) => {
    // Dispatch custom event to simulate pose detection
    const poseData = {
      'raised-arms': {
        poseLandmarks: [
          { x: 0.3, y: 0.2, z: 0, visibility: 0.9 }, // Left wrist above shoulder
          { x: 0.7, y: 0.2, z: 0, visibility: 0.9 }, // Right wrist above shoulder
        ],
      },
      'star-pose': {
        poseLandmarks: [
          { x: 0.1, y: 0.3, z: 0, visibility: 0.9 }, // Left arm extended
          { x: 0.9, y: 0.3, z: 0, visibility: 0.9 }, // Right arm extended
          { x: 0.2, y: 0.9, z: 0, visibility: 0.9 }, // Left leg extended
          { x: 0.8, y: 0.9, z: 0, visibility: 0.9 }, // Right leg extended
        ],
      },
      'tree-pose': {
        poseLandmarks: [
          { x: 0.5, y: 0.1, z: 0, visibility: 0.9 }, // Arms up
          { x: 0.5, y: 0.9, z: 0, visibility: 0.9 }, // One leg down
        ],
      },
    }

    win.dispatchEvent(new CustomEvent('mock-pose-detected', {
      detail: poseData[poseType as keyof typeof poseData]
    }))
  })
})

Cypress.Commands.add('checkGameState', (expectedState) => {
  if (expectedState.score !== undefined) {
    cy.get('[data-testid="game-score"]').should('contain', expectedState.score.toString())
  }
  
  if (expectedState.level !== undefined) {
    cy.get('[data-testid="game-level"]').should('contain', expectedState.level.toString())
  }
  
  if (expectedState.isPlaying !== undefined) {
    const playingText = expectedState.isPlaying ? 'Playing' : 'Paused'
    cy.get('[data-testid="game-status"]').should('contain', playingText)
  }
  
  if (expectedState.timeRemaining !== undefined) {
    cy.get('[data-testid="time-remaining"]').should('contain', expectedState.timeRemaining.toString())
  }
})

Cypress.Commands.add('waitForPoseDetection', () => {
  cy.get('[data-testid="pose-detector-status"]', { timeout: 10000 })
    .should('contain', 'Ready')
})

Cypress.Commands.add('getPerformanceMetrics', () => {
  return cy.window().then((win) => {
    return win.performance.getEntriesByName('pose-processing')
  })
})

Cypress.Commands.add('mockCameraPermissions', (granted: boolean) => {
  cy.window().then((win) => {
    if (!granted) {
      Object.defineProperty(win.navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: cy.stub().rejects(new Error('Permission denied')),
          enumerateDevices: cy.stub().resolves([]),
        },
      })
    }
  })
})
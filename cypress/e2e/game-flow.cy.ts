describe('Pose Detection Game - Complete Flow', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  describe('Application Loading', () => {
    it('should load the application successfully', () => {
      cy.get('[data-testid="app-container"]').should('be.visible')
      cy.get('[data-testid="game-title"]').should('contain', 'Pose Detection Game')
    })

    it('should show camera setup interface', () => {
      cy.get('[data-testid="camera-setup"]').should('be.visible')
      cy.get('[data-testid="start-camera-button"]').should('be.visible')
    })
  })

  describe('Camera Setup Flow', () => {
    it('should start camera successfully', () => {
      cy.startMockCamera()
      cy.get('[data-testid="camera-preview"]').should('be.visible')
      cy.get('[data-testid="camera-status"]').should('contain', 'Camera Ready')
    })

    it('should handle camera permission denial', () => {
      cy.mockCameraPermissions(false)
      cy.get('[data-testid="start-camera-button"]').click()
      cy.get('[data-testid="camera-error"]').should('be.visible')
      cy.get('[data-testid="camera-error"]').should('contain', 'Permission denied')
    })

    it('should allow camera device switching', () => {
      cy.startMockCamera()
      
      cy.get('[data-testid="camera-device-selector"]').should('be.visible')
      cy.get('[data-testid="camera-device-selector"]').select('Mock Camera 2')
      
      cy.get('[data-testid="camera-status"]').should('contain', 'Camera Ready')
    })
  })

  describe('Pose Detection Setup', () => {
    beforeEach(() => {
      cy.startMockCamera()
    })

    it('should initialize pose detection', () => {
      cy.waitForPoseDetection()
      cy.get('[data-testid="pose-detector-status"]').should('contain', 'Ready')
    })

    it('should display pose landmarks when detected', () => {
      cy.waitForPoseDetection()
      cy.simulatePose('raised-arms')
      
      cy.get('[data-testid="pose-landmarks"]').should('be.visible')
      cy.get('[data-testid="pose-confidence"]').should('contain', '90%')
    })
  })

  describe('Game Flow', () => {
    beforeEach(() => {
      cy.startMockCamera()
      cy.waitForPoseDetection()
    })

    it('should start game successfully', () => {
      cy.get('[data-testid="start-game-button"]').click()
      
      cy.checkGameState({
        isPlaying: true,
        score: 0,
        level: 1,
        timeRemaining: 60
      })
      
      cy.get('[data-testid="current-challenge"]').should('be.visible')
    })

    it('should complete a challenge', () => {
      cy.get('[data-testid="start-game-button"]').click()
      
      // Wait for challenge to load
      cy.get('[data-testid="current-challenge"]').should('be.visible')
      
      // Simulate completing the raised arms challenge
      cy.simulatePose('raised-arms')
      
      // Check score increased
      cy.get('[data-testid="game-score"]').should('not.contain', '0')
      
      // Challenge should complete and new one should appear
      cy.get('[data-testid="challenge-completed"]', { timeout: 3000 }).should('be.visible')
    })

    it('should progress through levels', () => {
      cy.get('[data-testid="start-game-button"]').click()
      
      // Complete multiple challenges to progress levels
      for (let i = 0; i < 3; i++) {
        cy.get('[data-testid="current-challenge"]').should('be.visible')
        cy.simulatePose('raised-arms')
        cy.wait(2500) // Wait for challenge completion
      }
      
      // Should progress to level 2
      cy.get('[data-testid="game-level"]').should('contain', '2')
    })

    it('should handle game timer countdown', () => {
      cy.get('[data-testid="start-game-button"]').click()
      
      // Check initial time
      cy.checkGameState({ timeRemaining: 60 })
      
      // Wait and check time decreased
      cy.wait(3000)
      cy.get('[data-testid="time-remaining"]').should('not.contain', '60')
    })

    it('should pause and resume game', () => {
      cy.get('[data-testid="start-game-button"]').click()
      
      // Pause game
      cy.get('[data-testid="pause-game-button"]').click()
      cy.checkGameState({ isPlaying: false })
      
      // Resume game
      cy.get('[data-testid="resume-game-button"]').click()
      cy.checkGameState({ isPlaying: true })
    })

    it('should end game when time runs out', () => {
      cy.get('[data-testid="start-game-button"]').click()
      
      // Fast-forward time (this would need to be implemented in the app)
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('fast-forward-timer'))
      })
      
      cy.get('[data-testid="game-over"]', { timeout: 5000 }).should('be.visible')
      cy.get('[data-testid="final-score"]').should('be.visible')
    })
  })

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      cy.startMockCamera()
      cy.waitForPoseDetection()
    })

    it('should display performance metrics', () => {
      cy.get('[data-testid="start-game-button"]').click()
      
      // Enable debug mode to see performance
      cy.get('[data-testid="debug-toggle"]').click()
      
      cy.get('[data-testid="fps-counter"]').should('be.visible')
      cy.get('[data-testid="processing-time"]').should('be.visible')
    })

    it('should maintain acceptable frame rate', () => {
      cy.get('[data-testid="start-game-button"]').click()
      cy.get('[data-testid="debug-toggle"]').click()
      
      // Simulate multiple pose detections
      for (let i = 0; i < 10; i++) {
        cy.simulatePose('raised-arms')
        cy.wait(100)
      }
      
      cy.get('[data-testid="fps-counter"]')
        .invoke('text')
        .then((text) => {
          const fps = parseInt(text.replace(/\D/g, ''), 10)
          expect(fps).to.be.greaterThan(15)
        })
    })
  })

  describe('Error Handling', () => {
    it('should handle pose detection errors gracefully', () => {
      cy.startMockCamera()
      
      // Simulate pose detection error
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('pose-detection-error', {
          detail: { error: 'Model loading failed' }
        }))
      })
      
      cy.get('[data-testid="pose-detection-error"]').should('be.visible')
      cy.get('[data-testid="retry-pose-detection"]').should('be.visible')
    })

    it('should recover from camera disconnection', () => {
      cy.startMockCamera()
      cy.waitForPoseDetection()
      
      // Simulate camera disconnection
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('camera-disconnected'))
      })
      
      cy.get('[data-testid="camera-error"]').should('be.visible')
      cy.get('[data-testid="reconnect-camera"]').click()
      
      cy.get('[data-testid="camera-status"]').should('contain', 'Camera Ready')
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      cy.get('body').tab()
      cy.focused().should('have.attr', 'data-testid', 'start-camera-button')
      
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'camera-device-selector')
    })

    it('should have proper ARIA labels', () => {
      cy.get('[data-testid="start-camera-button"]')
        .should('have.attr', 'aria-label')
        .and('contain', 'Start camera')
      
      cy.get('[data-testid="game-score"]')
        .should('have.attr', 'aria-label')
        .and('contain', 'Current score')
    })

    it('should announce game state changes', () => {
      cy.startMockCamera()
      cy.waitForPoseDetection()
      
      cy.get('[data-testid="start-game-button"]').click()
      
      cy.get('[aria-live="polite"]')
        .should('contain', 'Game started')
    })
  })

  describe('Responsive Design', () => {
    it('should work on mobile viewport', () => {
      cy.viewport(375, 667) // iPhone SE
      
      cy.get('[data-testid="app-container"]').should('be.visible')
      cy.get('[data-testid="start-camera-button"]').should('be.visible')
      
      // UI should adapt to smaller screen
      cy.get('[data-testid="camera-preview"]').should('have.css', 'max-width')
    })

    it('should work on tablet viewport', () => {
      cy.viewport(768, 1024) // iPad
      
      cy.get('[data-testid="app-container"]').should('be.visible')
      cy.startMockCamera()
      
      // Should show side-by-side layout on larger screens
      cy.get('[data-testid="game-panel"]').should('be.visible')
      cy.get('[data-testid="camera-panel"]').should('be.visible')
    })
  })
})
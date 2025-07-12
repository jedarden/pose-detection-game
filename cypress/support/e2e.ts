// E2E support file
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Mock MediaDevices API for E2E tests
Cypress.on('window:before:load', (win) => {
  // Mock getUserMedia
  Object.defineProperty(win.navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: cy.stub().resolves({
        getTracks: () => [
          {
            stop: cy.stub(),
            kind: 'video',
            enabled: true,
            getSettings: () => ({
              width: 640,
              height: 480,
              frameRate: 30,
            }),
          },
        ],
      }),
      enumerateDevices: cy.stub().resolves([
        {
          deviceId: 'mock-camera-1',
          kind: 'videoinput',
          label: 'Mock Camera 1',
        },
        {
          deviceId: 'mock-camera-2',
          kind: 'videoinput',
          label: 'Mock Camera 2',
        },
      ]),
    },
  })

  // Mock performance API
  Object.defineProperty(win, 'performance', {
    writable: true,
    value: {
      ...win.performance,
      mark: cy.stub(),
      measure: cy.stub(),
      getEntriesByName: cy.stub().returns([{ duration: 16.67 }]),
    },
  })
})
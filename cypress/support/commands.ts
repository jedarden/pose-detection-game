/// <reference types="cypress" />

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to mock camera permissions
       * @example cy.mockCamera()
       */
      mockCamera(): Chainable<void>
      
      /**
       * Custom command to wait for game to load
       * @example cy.waitForGameLoad()
       */
      waitForGameLoad(): Chainable<void>
    }
  }
}

Cypress.Commands.add('mockCamera', () => {
  cy.window().then((win) => {
    cy.stub(win.navigator.mediaDevices, 'getUserMedia').resolves({
      getTracks: () => [],
      getVideoTracks: () => [{ 
        stop: () => {},
        getSettings: () => ({ width: 640, height: 480 })
      }],
      getAudioTracks: () => [],
    })
  })
})

Cypress.Commands.add('waitForGameLoad', () => {
  cy.get('[data-testid="game-container"]', { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="loading"]').should('not.exist')
})

export {}
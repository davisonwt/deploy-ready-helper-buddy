// Cypress support file for E2E tests
import 'cypress-axe';

// Custom commands
Cypress.Commands.add('injectAxe', () => {
  cy.injectAxe();
});

Cypress.Commands.add('checkA11y', () => {
  cy.checkA11y(null, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa'],
    },
  });
});

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err) => {
  // Return false to prevent test failure for certain errors
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
  return true;
});

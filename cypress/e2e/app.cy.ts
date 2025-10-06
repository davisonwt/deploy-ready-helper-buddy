// Full App QA Testing with Cypress
describe('Full App QA', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.intercept('**/auth/v1/token*', { fixture: 'login-success.json' }).as('login');
  });

  it('User journey: Register, browse orchards, navigate', () => {
    // Navigate to register
    cy.contains('Register').click();
    cy.url().should('include', '/register');
    
    // Fill registration form
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').first().type('password123');
    
    // Browse orchards
    cy.visit('/browse-orchards');
    cy.contains('Orchards').should('be.visible');
    
    // Check responsive navigation
    cy.viewport('iphone-x');
    cy.get('[aria-label="Open navigation menu"]').should('be.visible');
    
    cy.viewport(1280, 720);
    cy.get('aside').should('be.visible');
  });

  it('Dashboard loads without errors', () => {
    cy.visit('/dashboard');
    
    // Assert no console errors
    cy.window().then((win) => {
      cy.spy(win.console, 'error').as('consoleError');
    });
    
    cy.get('@consoleError').should('not.have.been.called');
  });

  it('Error handling: 404 page', () => {
    cy.visit('/non-existent-page', { failOnStatusCode: false });
    cy.contains('404').should('be.visible');
  });

  it('Accessibility: No violations on main pages', () => {
    // Test homepage
    cy.visit('/');
    cy.injectAxe();
    cy.checkA11y();
    
    // Test dashboard
    cy.visit('/dashboard');
    cy.injectAxe();
    cy.checkA11y();
  });

  it('Mobile responsiveness', () => {
    const viewports = ['iphone-x', 'ipad-2', [1920, 1080]] as const;
    
    viewports.forEach((viewport) => {
      cy.viewport(viewport);
      cy.visit('/');
      cy.get('main').should('be.visible');
    });
  });

  it('Navigation links work correctly', () => {
    cy.visit('/dashboard');
    
    // Test sidebar navigation
    cy.contains('Browse Orchards').click();
    cy.url().should('include', '/browse-orchards');
    
    cy.contains('Dashboard').click();
    cy.url().should('include', '/dashboard');
  });

  it('Form validation works', () => {
    cy.visit('/register');
    
    // Try to submit empty form
    cy.get('form').first().submit();
    
    // Should show validation errors
    cy.contains('required').should('be.visible');
  });
});

// Cypress commands for accessibility
declare global {
  namespace Cypress {
    interface Chainable {
      injectAxe(): Chainable<void>;
      checkA11y(): Chainable<void>;
    }
  }
}

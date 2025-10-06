# Testing Guide

This guide covers all testing strategies implemented in the project.

## Table of Contents
- [Unit & Integration Tests](#unit--integration-tests)
- [Accessibility Testing](#accessibility-testing)
- [E2E Testing with Cypress](#e2e-testing-with-cypress)
- [Load Testing with k6](#load-testing-with-k6)
- [Security Testing](#security-testing)

## Unit & Integration Tests

### Running Tests
```bash
npm test
```

### Writing Tests
Tests are located in `src/test/` directory. Use Vitest and React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { expect, it, describe } from 'vitest';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Accessibility Testing

### Automated Testing
The project uses `@axe-core/react` for automated accessibility testing in development mode.

### Running Accessibility Tests
```bash
npm test -- accessibility.test.ts
```

### Manual Testing
1. Use Chrome DevTools Lighthouse (Accessibility audit)
2. Use WAVE browser extension
3. Test keyboard navigation (Tab, Enter, Escape)
4. Test with screen readers (NVDA, JAWS, VoiceOver)

### Accessibility Checklist
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Keyboard navigation works
- [ ] Focus visible on all interactive elements
- [ ] Color contrast meets WCAG AA standards
- [ ] ARIA labels on icon-only buttons

## E2E Testing with Cypress

### Setup
```bash
npm install -D cypress cypress-axe
```

### Running Cypress Tests
```bash
# Open Cypress UI
npx cypress open

# Run headless
npx cypress run

# Run specific test
npx cypress run --spec "cypress/e2e/app.cy.ts"
```

### Writing E2E Tests
Tests are in `cypress/e2e/` directory:

```typescript
describe('User Flow', () => {
  it('completes registration', () => {
    cy.visit('/register');
    cy.get('input[type="email"]').type('user@example.com');
    cy.get('form').submit();
    cy.contains('Success').should('be.visible');
  });
});
```

### Accessibility Testing with Cypress
```typescript
it('has no accessibility violations', () => {
  cy.visit('/');
  cy.injectAxe();
  cy.checkA11y();
});
```

## Load Testing with k6

### Setup
```bash
# Install k6 (macOS)
brew install k6

# Or use Docker
docker pull grafana/k6
```

### Running Load Tests
```bash
# Basic run
k6 run load-test.js

# With environment variables
BASE_URL=https://yourapp.com k6 run load-test.js

# Save results
k6 run --out json=results.json load-test.js
```

### Load Test Configuration
Edit `load-test.js` to adjust:
- Number of virtual users (VUs)
- Test duration
- Ramp-up/down stages
- Performance thresholds

### Interpreting Results
- **http_req_duration**: Response time (aim for p95 < 500ms)
- **http_req_failed**: Failed requests (aim for < 1%)
- **http_reqs**: Requests per second

## Security Testing

### ESLint Security Rules
```bash
npm run lint
```

### Security Audit
```bash
# Check for vulnerable dependencies
npm audit

# Fix automatically
npm audit fix
```

### Manual Security Checks
1. **RLS Policies**: Verify in Supabase dashboard
2. **Input Validation**: Test with malicious inputs
3. **XSS**: Test with `<script>alert('xss')</script>`
4. **SQL Injection**: Test API endpoints
5. **CSRF**: Verify CSRF tokens

### Penetration Testing Tools
- OWASP ZAP
- Burp Suite
- Snyk for dependencies

## Pre-Deployment Checklist

### Performance
- [ ] Lighthouse score > 90
- [ ] Core Web Vitals pass
- [ ] Images optimized
- [ ] Bundle size < 500KB (initial)

### Security
- [ ] All RLS policies enabled
- [ ] No console errors/warnings
- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] npm audit passes

### Functionality
- [ ] All features work on mobile
- [ ] All features work on desktop
- [ ] Error handling works
- [ ] Loading states present
- [ ] Forms validate correctly

### Accessibility
- [ ] Lighthouse accessibility > 95
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast passes

### Testing
- [ ] All unit tests pass
- [ ] E2E tests pass
- [ ] Load tests pass (< 500ms p95)
- [ ] No accessibility violations

## Continuous Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run lint
      - run: npm test
      - run: npx cypress run
```

## Monitoring in Production

### Error Tracking
- Supabase error_logs table
- Browser console errors
- Failed API requests

### Performance Monitoring
- Web Vitals
- API response times
- Database query performance

### User Feedback
- Help modal feedback
- Error reports
- Analytics data

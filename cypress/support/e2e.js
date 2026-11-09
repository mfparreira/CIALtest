// Global support file – loaded automatically before every spec.
import './commands';

// Amazon's own scripts throw uncaught exceptions from time to time (ads, telemetry, A/B tests).
// They are unrelated to what we are testing, so they must not fail our tests.
Cypress.on('uncaught:exception', () => false);

const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://www.amazon.com',
    specPattern: 'cypress/e2e/**/*.cy.js',
    viewportWidth: 1440,
    viewportHeight: 900,
    defaultCommandTimeout: 15000,
    pageLoadTimeout: 60000,
    chromeWebSecurity: false,
    video: false,
    screenshotOnRunFailure: true,
    // Each test starts with clean cookies/storage (default in Cypress 12+),
    // which gives us an empty guest cart and keeps tests independent.
    testIsolation: true,
    retries: { runMode: 2, openMode: 0 },
    setupNodeEvents(on, config) {
      return config;
    },
  },
});

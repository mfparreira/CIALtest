// Custom commands shared across specs.

/**
 * Amazon sometimes serves a CAPTCHA / "robot check" page to automated browsers.
 * Failing loudly here avoids misleading "element not found" errors (no false positives/negatives).
 */
Cypress.Commands.add('failOnBotCheck', () => {
  // Work from the document (re-queried on every retry) so a page that is still swapping documents
  // gives a clear message instead of a bare "body not found".
  cy.document({ timeout: 30000 })
    .should((doc) => {
      expect(doc.body, `page should have finished loading a <body> (URL: ${doc.location.href})`).to.exist;
    })
    .then((doc) => {
      // Look at what the shopper SEES (innerText) plus CAPTCHA-only elements. textContent would also
      // include script/hidden text, which can contain these phrases on a perfectly normal page.
      const visible = doc.body.innerText || '';
      const textHit = visible.match(
        /Enter the characters you see below|Type the characters you see in this image|Sorry, we just need to make sure you're not a robot/i
      );
      const elHit = doc.querySelector('form[action*="validateCaptcha"], input#captchacharacters');
      const matched = textHit
        ? `visible text "${textHit[0]}"`
        : elHit
          ? `element <${elHit.tagName.toLowerCase()}>`
          : 'nothing';
      expect(
        Boolean(textHit || elHit),
        `Amazon bot-check (CAPTCHA) page was NOT served. Matched: ${matched} (URL: ${doc.location.href})`
      ).to.be.false;
    });
});

/**
 * Amazon sometimes shows a "Click the button below to continue shopping" interstitial before the page.
 * It is a one-click confirmation (not a character CAPTCHA), so click it like a shopper would. A real
 * CAPTCHA is not handled here and still fails in failOnBotCheck.
 */
Cypress.Commands.add('continueIfInterstitial', () => {
  const interstitial = /Click the button below to continue shopping/i;
  cy.document({ timeout: 30000 }).then((doc) => {
    if (!interstitial.test((doc.body && doc.body.innerText) || '')) return;

    cy.contains('button, input[type="submit"], a', /Continue shopping/i).click();
    cy.document({ timeout: 30000 }).should((d) => {
      expect(interstitial.test((d.body && d.body.innerText) || ''), 'interstitial should be gone after "Continue shopping"').to.be.false;
    });
  });
});

/** Visits a path and makes sure the real page (not a CAPTCHA) was loaded. */
Cypress.Commands.add('visitAmazon', (path = '/') => {
  // Force English so menu labels/messages match the test data regardless of the tester's locale.
  cy.visit(path, { headers: { 'Accept-Language': 'en-US,en;q=0.9' } });
  cy.continueIfInterstitial();
  cy.failOnBotCheck();
});
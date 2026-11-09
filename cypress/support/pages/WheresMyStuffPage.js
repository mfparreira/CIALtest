class WheresMyStuffPage {
  assertLoaded(expectedHeading) {
    cy.url().should('include', '/gp/help/customer/display.html');
    // The apostrophe in "Where's" may be straight or curly, so match flexibly.
    cy.get('h1').filter(':visible').first().invoke('text').then((text) => {
      const normalize = (s) => s.replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();
      expect(normalize(text)).to.equal(normalize(expectedHeading));
    });
    cy.contains(/Shipping and Delivery/i).should('be.visible');
    cy.contains(/Your Orders/i).should('exist');
  }
}

export default new WheresMyStuffPage();

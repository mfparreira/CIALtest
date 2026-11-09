class CustomerServicePage {
  get helpSearchInput() {
    return cy
      .get(
        'input#helpsearch, input[name="helpsearch"], input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]'
      )
      .not('#twotabsearchtextbox') // exclude the global site search in the header
      .filter(':visible')
      .first();
  }

  assertLoaded() {
    cy.url().should('include', '/gp/help/customer');
    // The landing heading differs between Amazon layouts/variants.
    cy.contains(
      'h1, h2',
      /Welcome to Amazon Customer Service|Help & Customer Service|Hello\. What can we help you with\?/i
    ).should('be.visible');
  }

  search(term) {
    this.helpSearchInput.clear().type(`${term}{enter}`);
  }

  /** Returns the first search-result link. */
  get firstResult() {
    // Only links whose text is the expected article. This also skips the page header links
    // ("Customer Service", "Home"), which share the same /gp/help/customer/display.html URL.
    return cy
      .get('a[href*="/gp/help/customer/display.html"]')
      .filter(':visible')
      .filter((_, el) => /where['’`]?s my stuff/i.test(el.innerText || el.textContent))
      .first();
  }

  clickFirstResult() {
    this.firstResult.click();
  }
}

export default new CustomerServicePage();

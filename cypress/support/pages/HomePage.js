class HomePage {
  // Top navigation bar below the header (Today's Deals / Customer Service / ...)
  get navBar() {
    return cy.get('#nav-xshop');
  }

  get searchBox() {
    return cy.get('#twotabsearchtextbox');
  }

  get searchButton() {
    return cy.get('#nav-search-submit-button');
  }

  get locationLink() {
    return cy.get('#nav-global-location-popover-link');
  }

  visit() {
    // ?language=en_US makes Amazon store English as the site language in a cookie.
    cy.visitAmazon('/?language=en_US');
    return this;
  }

  /** Normalizes menu text: straight/curly apostrophes, whitespace and case. */
  static normalize(text) {
    return (text || '')
      .replace(/[’‘`´]/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /** Normalized link texts of a jQuery collection. */
  static linkTexts($root) {
    return [...$root.find('a')]
      .map((el) => HomePage.normalize(el.innerText || el.textContent))
      .filter(Boolean);
  }

  /**
   * Opens the "All" (hamburger) menu if it is not already open.
   * In the current amazon.com layout, links such as "Customer Service" live here
   * (under "Help & Settings") instead of the top navigation bar.
   */
  openAllMenu() {
    cy.get('body').then(($body) => {
      if (!$body.find('#hmenu-content:visible').length) {
        cy.get('#nav-hamburger-menu').click();
      }
    });
    cy.get('#hmenu-content', { timeout: 15000 }).should('be.visible');
    cy.get('#hmenu-content a.hmenu-item').should('have.length.greaterThan', 0);
  }

  closeAllMenu() {
    cy.get('body').then(($body) => {
      if ($body.find('#hmenu-content:visible').length) {
        cy.get('#hmenu-canvas-background, #hmenu-close-icon, .hmenu-close-icon')
          .first()
          .click({ force: true });
      }
    });
  }

  /**
   * Accepted link texts for a menu entry. In the current amazon.com layout the
   * "Customer Service" shortcut is gone from the nav bar and "All" menu; the same
   * page (/gp/help/customer/display.html) is reached through the footer "Help" link.
   */
  static aliases(label) {
    const n = HomePage.normalize(label);
    return n === 'customer service' ? ['customer service', 'help'] : [n];
  }

  /**
   * Asserts every expected entry exists in the main menu (order independent).
   * Looks at the top nav bar first; entries not shown there are searched in the
   * "All" menu and in the page footer.
   */
  validateMainMenu(expectedItems) {
    const isPresent = (label, texts) => HomePage.aliases(label).some((a) => texts.includes(a));

    this.navBar.should('be.visible');
    this.navBar.find('a').should('have.length.greaterThan', 0);
    this.navBar.then(($nav) => {
      const navItems = HomePage.linkTexts($nav);
      const missing = expectedItems.filter((l) => !isPresent(l, navItems));
      if (!missing.length) return;

      this.openAllMenu();
      cy.get('#hmenu-content').then(($menu) => {
        cy.get('body').then(($body) => {
          const all = [
            ...navItems,
            ...HomePage.linkTexts($menu),
            ...HomePage.linkTexts($body.find('#navFooter, footer')),
          ];
          missing.forEach((label) => {
            expect(
              isPresent(label, all),
              `main menu should contain "${label}". Items found: ${JSON.stringify(all)}`
            ).to.be.true;
          });
        });
      });
      this.closeAllMenu();
    });
  }

  /** Clicks a menu entry: top navigation bar first, page footer as fallback. */
  clickMenuItem(label) {
    const targets = HomePage.aliases(label);
    const matches = (_, el) => targets.includes(HomePage.normalize(el.innerText || el.textContent));

    cy.get('body').then(($body) => {
      const $navLink = $body.find('#nav-xshop a').filter(matches);
      if ($navLink.length) {
        cy.wrap($navLink.first()).click();
        return;
      }
      cy.get('#navFooter a, footer a')
        .filter(matches)
        .filter('[href*="/gp/help/customer/display.html"]')
        .first()
        .scrollIntoView()
        // force: the footer link can still be flagged as "covered" by sticky/overlay layers.
        .click({ force: true });
    });
  }

  search(term) {
    this.searchBox.clear().type(`${term}{enter}`);
  }

  /** One attempt: open the "Deliver to" popover, pick the country and confirm. */
  chooseCountry(countryName) {
    this.locationLink.click();
    cy.get('#GLUXZipUpdateInput, #GLUXCountryList, #GLUXCountryListDropdown', { timeout: 15000 }).should('exist');

    // Click the country dropdown (native <select> or Amazon's custom dropdown, depending on A/B variant)
    cy.get('body').then(($body) => {
      if ($body.find('select#GLUXCountryList').length) {
        cy.get('select#GLUXCountryList').select(countryName, { force: true });
      } else {
        cy.get('#GLUXCountryListDropdown').click();
        cy.get('a.a-dropdown-link').contains(countryName).click({ force: true });
      }
    });

    cy.get('#GLUXConfirmClose, [name="glowDoneButton"], .a-popover-footer .a-button-primary input', {
      timeout: 15000,
    })
      .filter(':visible')
      .first()
      .click({ force: true });
  }

  /**
   * Polls the header for the country, for a bounded time, and yields true/false instead of failing,
   * so the caller can retry. (Amazon applies the change asynchronously and may reload the page.)
   */
  headerHasCountry(countryName, triesLeft = 12) {
    return cy.get('#glow-ingress-block', { timeout: 20000 }).then(($el) => {
      const ok = $el.text().includes(countryName);
      if (ok || triesLeft <= 0) return ok;
      cy.wait(1000); // bounded polling of an external page that changes on its own schedule
      return this.headerHasCountry(countryName, triesLeft - 1);
    });
  }

  /**
   * Sets the ship-to country through the "Deliver to" popover. The change sometimes is not applied
   * (the header keeps the previous location), so it is retried up to 3 times before failing.
   */
  setDeliveryCountry(countryName, attempt = 1) {
    this.chooseCountry(countryName);

    this.headerHasCountry(countryName).then((ok) => {
      if (!ok && attempt < 3) {
        cy.reload();
        this.setDeliveryCountry(countryName, attempt + 1);
        return;
      }
      expect(ok, `ship-to country should be "${countryName}" in the header (attempt ${attempt})`).to.be.true;

      // Reload once so the page is guaranteed stable (no late self-reload swallowing the next
      // typed search), then confirm the country was kept.
      cy.reload();
      cy.get('#glow-ingress-block', { timeout: 20000 }).should('contain.text', countryName);
      cy.get('#twotabsearchtextbox', { timeout: 20000 }).should('be.visible');
    });
  }
}

export default new HomePage();
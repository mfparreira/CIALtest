class ProductPage {
  get title() {
    return cy.get('#productTitle');
  }

  get addToCartButton() {
    return cy.get('#add-to-cart-button');
  }

  /**
   * Search results: open the first product whose text contains the title fragment
   * or the model number. If nothing matches, the error lists the titles that were found.
   */
  openFromSearchResults(titleFragment, { resultKeywords = [], modelNumber } = {}) {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    // Standard result card, or the generic result item that carries an ASIN (layout variants).
    const resultSelector =
      '[data-component-type="s-search-result"], div.s-result-item[data-asin]:not([data-asin=""])';

    // A CAPTCHA page would otherwise look like "no results".
    cy.failOnBotCheck();
    cy.get('body', { timeout: 20000 }).should(($body) => {
      const doc = $body[0].ownerDocument;
      expect(
        $body.find(resultSelector).length,
        `search results should be displayed. URL: ${doc.location.href} | page title: "${doc.title}"`
      ).to.be.greaterThan(0);
    });
    cy.get(resultSelector).then(($results) => {
      const titles = [...$results].map((el) => norm(el.textContent).slice(0, 110));

      // In some layouts the <h2> holds only the brand, so match on keywords found anywhere in the card.
      const keywords = (resultKeywords.length ? resultKeywords : [titleFragment]).map(norm);
      let $match = $results.filter((_, el) => keywords.every((k) => norm(el.textContent).includes(k)));

      // Prefer the card that also shows the exact model number, when there is one.
      const $exact = $match.filter((_, el) => modelNumber && norm(el.textContent).includes(norm(modelNumber)));
      if ($exact.length) $match = $exact;
      expect(
        $match.length,
        `"${titleFragment}" should be in the search results. Titles found: ${JSON.stringify(titles)}`
      ).to.be.greaterThan(0);

      cy.wrap($match.first()).find('h2 a, a.a-link-normal').first().click();
    });
    // Amazon retitles listings often, so verify the core keywords instead of the exact assignment title.
    const expected = (resultKeywords.length ? resultKeywords : [titleFragment]).map(norm);
    this.title.should(($t) => {
      const text = norm($t.text());
      expected.forEach((k) => {
        expect(text, `product page title should contain "${k}"`).to.include(k);
      });
    });
  }

  visitByPath(path) {
    cy.visitAmazon(path);
    this.title.should('be.visible');
  }

  /**
   * Clicks the color swatch named `optionName` and checks that the "Color: ..." text changed.
   * Swatches are image buttons, so the name can live in title / aria-label / the image alt.
   */
  selectColor(optionName) {
    // An empty/undefined name would match every swatch and silently select the wrong one.
    expect(optionName, 'selectColor needs a non-empty color name (check cypress/fixtures/testData.json)')
      .to.be.a('string')
      .and.not.be.empty;
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const target = norm(optionName);
    const areas = [
      '#twister_feature_div',
      '#twister-plus-inline-twister',
      '#inline-twister-row-color_name',
      '#variation_color_name',
      '#desktop-twister-feature-div',
    ].join(', ');
    const labelOf = (el) =>
      norm(
        [
          el.getAttribute('title'),
          el.getAttribute('aria-label'),
          el.getAttribute('data-value'),
          el.querySelector('img') && el.querySelector('img').getAttribute('alt'),
          el.innerText,
        ].join(' | ')
      );

    // The selected color is shown as "Color: <name>". Read only VISIBLE text (innerText) of short
    // elements, so another swatch's hidden label cannot satisfy the check (that was a false positive).
    const selectedColors = ($a) => {
      const shown = [];
      $a.find('*').each((_, el) => {
        const t = norm(el.innerText);
        const m = t.length <= 80 && t.match(/^color(?: name)?\s*:\s*(.+)$/);
        if (m) shown.push(m[1].trim());
      });
      return shown;
    };
    // The buy-box form carries the ASIN of the variant that "Add to Cart" will add.
    const readAsin = ($root) => {
      const v = $root.find('input#ASIN, input[name="ASIN"], input[name="asin"]').first().val();
      return v ? String(v) : undefined;
    };

    cy.get(areas, { timeout: 20000 }).should('have.length.greaterThan', 0);
    cy.get('body').then(($body) => {
      const asinBefore = readAsin($body);
      const $areas = $body.find(areas);

      const already = selectedColors($areas);
      if (already.length && already.every((s) => s.startsWith(target))) return; // nothing to click

      const $options = $areas.find('li, button, a, [role="radio"], [role="button"]');
      const labels = [...$options].map(labelOf).filter((l) => l.replace(/\|/g, '').trim());
      const $match = $options.filter((_, el) => labelOf(el).includes(target));
      expect(
        $match.length,
        `color option "${optionName}" should exist. Options found: ${JSON.stringify(labels)}`
      ).to.be.greaterThan(0);

      // Click what a shopper clicks: the image/button INSIDE the first matching swatch. Amazon's handler
      // listens on an inner element, so a forced click on the outer <li> does nothing (the variant stays).
      const $swatch = $match.first();
      const $inner = $swatch.find('img, input.a-button-input, button, a, .a-button-inner').filter(':visible').first();
      const $target = $inner.length ? $inner : $swatch;
      const describe = (el) => `<${el.tagName.toLowerCase()} class="${el.className}">`;
      const clicked = `${describe($target[0])} inside ${describe($swatch[0])}`;
      cy.wrap($target).scrollIntoView().click();

      // The "Color:" label changes immediately, but the buy-box switches variant only after an async
      // call. Clicking "Add to Cart" before that adds the PREVIOUS variant, so wait for the ASIN to change.
      if (asinBefore) {
        cy.get('body', { timeout: 20000 }).should(($b) => {
          const now = readAsin($b);
          expect(
            Boolean(now) && now !== asinBefore,
            `after selecting "${optionName}" the product variant (ASIN) should change from ${asinBefore} (now: ${now}). Clicked ${clicked}`
          ).to.be.true;
        });
      }
    });

    cy.get(areas).should(($a) => {
      const shown = selectedColors($a);
      expect(
        shown.length,
        `a visible "Color: ..." label should exist for the selected option. Found: ${JSON.stringify(shown)}`
      ).to.be.greaterThan(0);
      shown.forEach((s) => {
        expect(s.startsWith(target), `selected color should be "${optionName}" but the page shows "${s}"`).to.be.true;
      });
    });
  }

  addToCart() {
    // Amazon renders the real <input> with opacity 0.01 on top of a styled <span>, so Cypress
    // reports it as "not visible". Check it exists and is enabled, then click it directly.
    this.addToCartButton.should('exist').and('not.be.disabled').scrollIntoView().click({ force: true });
  }

  /**
   * Reads the side cart / confirmation panel from the visible page text:
   * "Cart Subtotal: $20.50" and "Proceed to checkout (1 item)".
   */
  static readCartPanel($body) {
    const text = ($body[0].innerText || '').replace(/\s+/g, ' ').trim();
    const sub = text.match(/cart subtotal\s*:?\s*(?:US)?\$\s*([\d,]+(?:\.\d{1,2})?)/i);
    const chk = text.match(/proceed to checkout\s*\(\s*(\d+)\s*items?\s*\)/i);
    return {
      subtotal: sub ? Number(sub[1].replace(/,/g, '')) : undefined,
      items: chk ? Number(chk[1]) : undefined,
      snippets: (text.match(/.{0,50}(?:subtotal|checkout).{0,50}/gi) || []).slice(0, 4),
    };
  }

  /**
   * Confirmation after "Add to Cart": the "Added to cart" text AND the side cart, which must show how
   * many items the cart holds ("Proceed to checkout (N items)") and a subtotal.
   * `subtotalAbove` makes sure the panel reflects the item just added, not the previous one.
   * Yields { subtotal, items } so the next step can compare against it.
   */
  assertAddedToCart({ items, subtotalAbove = -Infinity } = {}) {
    cy.contains(/Added to cart/i, { timeout: 20000 }).should('be.visible');
    return cy
      .get('body', { timeout: 20000 })
      .should(($b) => {
        const s = ProductPage.readCartPanel($b);
        const ctx = `Cart panel text found: ${JSON.stringify(s.snippets)}`;
        expect(Number.isFinite(s.subtotal), `side cart should show a "Cart Subtotal". ${ctx}`).to.be.true;
        expect(s.subtotal, `cart subtotal should be above $${subtotalAbove}. ${ctx}`).to.be.greaterThan(subtotalAbove);
        if (items !== undefined) {
          expect(s.items, `side cart should show "Proceed to checkout (${items} item(s))". ${ctx}`).to.equal(items);
        }
      })
      .then(($b) => ProductPage.readCartPanel($b));
  }
}

export default new ProductPage();
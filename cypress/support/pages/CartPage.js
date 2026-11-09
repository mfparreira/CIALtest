class CartPage {
  get items() {
    return cy.get('div.sc-list-item[data-asin], .sc-list-item[data-name="Active Items"] [data-asin]');
  }

  visit() {
    cy.visitAmazon('/gp/cart/view.html');
  }

  itemByAsin(asin) {
    return cy.get(`[data-asin="${asin}"]`).filter('.sc-list-item, [data-itemtype="active"]').first();
  }

  assertItemCount(count) {
    this.items.should('have.length', count);
  }

  /** Sentences about free shipping found on the page, to make failures easy to diagnose. */
  static shippingSnippets(text) {
    return (text.match(/[^.]{0,90}free[^.]{0,25}shipping[^.]{0,90}/gi) || []).slice(0, 6);
  }

  // Wording differs by ship-to country / layout, so accept the known variants.
  static get NOT_QUALIFIED() {
    return /add \$[\d.,]+ of eligible items (to your order )?(for|to qualify for) free (international )?shipping/i;
  }

  static get QUALIFIED() {
    return /(your order qualifies for|qualifies for|you've qualified for|you have qualified for) free (international )?shipping/i;
  }

  /** Parses a money string such as "1,234.50" into a number. */
  static money(str) {
    return Number(String(str).replace(/,/g, ''));
  }

  /**
   * Reads what decides free shipping from the rendered cart page:
   *  - subtotal   e.g. "Subtotal (2 items): $30.49"
   *  - threshold  e.g. "FREE Shipping to Hong Kong when you spend over $35"
   *  - whether the "qualifies" / "add $X to qualify" messages are shown
   * The threshold depends on ship-to country and changes over time, so it is read from the page
   * instead of being hard-coded (the assignment's $49 is the Israel value).
   */
  static readShipping($body) {
    const page = ($body[0].innerText || '').replace(/\s+/g, ' ').trim();
    const sub = page.match(/subtotal\s*\(\s*\d+\s*items?\s*\)\s*:?\s*(?:US)?\$\s*([\d,]+(?:\.\d{1,2})?)/i);
    const thr = page.match(/free[^$]{0,60}?(?:spend|orders?)\s+over\s+(?:US)?\$\s*([\d,]+(?:\.\d{1,2})?)/i);
    return {
      subtotal: sub ? CartPage.money(sub[1]) : undefined,
      threshold: thr ? CartPage.money(thr[1]) : undefined,
      qualifiesMsg: CartPage.QUALIFIED.test(page),
      notQualifiesMsg: CartPage.NOT_QUALIFIED.test(page),
      snippets: CartPage.shippingSnippets(page),
    };
  }

  /**
   * Step 10: the free-shipping message must agree with the cart numbers.
   * subtotal >= threshold -> "qualifies" message shown (and no "add $X" message);
   * subtotal <  threshold -> "add $X" message shown (and no "qualifies" message).
   * Yields the shipping state so a test can compare it with a later one.
   */
  assertFreeShippingMatchesSubtotal() {
    return cy
      .get('body', { timeout: 20000 })
      .should(($b) => {
        const s = CartPage.readShipping($b);
        const ctx = `Shipping text found: ${JSON.stringify(s.snippets)}`;
        expect(Number.isFinite(s.subtotal), `cart subtotal should be readable. ${ctx}`).to.be.true;
        expect(Number.isFinite(s.threshold), `free-shipping threshold should be readable. ${ctx}`).to.be.true;

        const eligible = s.subtotal >= s.threshold;
        expect(
          s.qualifiesMsg,
          `subtotal $${s.subtotal} vs threshold $${s.threshold}: "qualifies for FREE Shipping" should be ${
            eligible ? 'shown' : 'hidden'
          }. ${ctx}`
        ).to.equal(eligible);
        // Both messages are mutually exclusive: exactly the one matching the subtotal must be shown.
        expect(
          s.notQualifiesMsg,
          `subtotal $${s.subtotal} vs threshold $${s.threshold}: "add $X to qualify" should be ${
            eligible ? 'hidden' : 'shown'
          }. ${ctx}`
        ).to.equal(!eligible);
      })
      .then(($b) => CartPage.readShipping($b));
  }

  /**
   * Step 12: the cart qualifies for free shipping. `subtotalAbove` makes the check wait until the
   * subtotal has really been recalculated, so a stale (pre-update) page cannot pass.
   */
  assertQualifiedForFreeShipping({ subtotalAbove = -Infinity } = {}) {
    return cy
      .get('body', { timeout: 20000 })
      .should(($b) => {
        const s = CartPage.readShipping($b);
        const ctx = `Shipping text found: ${JSON.stringify(s.snippets)}`;
        expect(Number.isFinite(s.subtotal), `cart subtotal should be readable. ${ctx}`).to.be.true;
        expect(Number.isFinite(s.threshold), `free-shipping threshold should be readable. ${ctx}`).to.be.true;
        expect(s.subtotal, `subtotal should be recalculated above $${subtotalAbove}. ${ctx}`).to.be.greaterThan(
          subtotalAbove
        );
        expect(s.subtotal, `subtotal should reach the $${s.threshold} threshold. ${ctx}`).to.be.at.least(
          s.threshold
        );
        expect(s.qualifiesMsg, `"qualifies for FREE Shipping" should be shown. ${ctx}`).to.be.true;
        expect(s.notQualifiesMsg, `"add $X to qualify" should not be shown. ${ctx}`).to.be.false;
      })
      .then(($b) => CartPage.readShipping($b));
  }

  /** Quantity currently shown for a cart line (stepper value, input, select or dropdown text). */
  static readQuantity($item) {
    const raw =
      $item.find('[data-a-selector="value"]').first().text() ||
      $item.find('input[name*="uantity"]').first().val() ||
      $item.find('select[name="quantity"]').first().val() ||
      $item.find('.a-dropdown-prompt').first().text() ||
      '';
    return parseInt(String(raw).replace(/\D+/g, ''), 10);
  }

  /**
   * Sets a line's quantity. Supports the old <select> and the current stepper (trash / number / "+").
   * The final check reads the quantity shown on the line, so it cannot pass if nothing changed.
   */
  setQuantity(asin, quantity) {
    this.itemByAsin(asin).then(($item) => {
      const $select = $item.find('select[name="quantity"]');
      if ($select.length) {
        cy.wrap($select.first()).select(String(quantity), { force: true });
      } else {
        this.stepQuantity(asin, quantity);
      }
    });
    this.itemByAsin(asin).should(($item) => {
      expect(CartPage.readQuantity($item), `quantity of ${asin} should be ${quantity}`).to.equal(quantity);
    });
  }

  /** Clicks "+" until the line shows `target`, waiting for the cart to update after each click. */
  stepQuantity(asin, target) {
    this.itemByAsin(asin).then(($item) => {
      const current = CartPage.readQuantity($item);
      expect(Number.isFinite(current), 'current quantity should be readable from the cart line').to.be.true;
      if (current >= target) return;

      const $plus = $item.find(
        'button[data-a-selector="increment"], [data-a-selector="increment"] button, button[aria-label*="ncrease"]'
      );
      expect($plus.length, 'cart line should have a "+" (increase quantity) button').to.be.greaterThan(0);
      cy.wrap($plus.first()).click({ force: true });

      this.itemByAsin(asin).should(($i) => {
        expect(CartPage.readQuantity($i), 'quantity should grow after clicking "+"').to.be.greaterThan(current);
      });
      this.stepQuantity(asin, target);
    });
  }

  /** Deletes every line in the cart and verifies the cart ends up empty. */
  emptyCart() {
    // Both tests finish on the cart page, so clean up right there. Re-visiting the same URL right
    // after the test was the unstable step; only open the cart if the test ended somewhere else
    // (for example after an earlier failure).
    cy.location('pathname').then((path) => {
      if (!/\/cart(\/|$)|\/gp\/cart/i.test(path)) {
        this.visit();
      }
    });
    // Log where we ended up (a redirect or a stuck navigation shows here) and wait for the real
    // cart area instead of assuming the page is ready.
    cy.location('href').then((href) => Cypress.log({ name: 'cart url', message: href }));
    // (No fixed container id: the cart markup varies, so wait for line items or the empty message.)
    cy.get('body', { timeout: 30000 }).should(($b) => {
      const hasItems = CartPage.activeItems($b).length > 0;
      const isEmpty = /Your (Amazon )?Cart is empty/i.test($b[0].innerText || '');
      expect(hasItems || isEmpty, `cart page should show line items or the empty-cart message (URL: ${$b[0].ownerDocument.location.href})`).to.be.true;
    });
    this.deleteNext();

    // Strict: no active cart line may remain. The empty-cart wording varies between layouts, so it is
    // not accepted as a substitute for checking the actual lines.
    cy.get('body', { timeout: 20000 }).should(($body) => {
      expect(CartPage.activeItems($body).length, 'active cart lines left after cleanup').to.equal(0);
    });
  }

  /**
   * Cart lines that are still in the cart. After "Delete", Amazon keeps the block on the page
   * and replaces its content with "... was removed from Shopping Cart", so those are excluded.
   */
  static activeItems($body) {
    // Every cart line carries a HIDDEN "removed" template, so only a VISIBLE one means "deleted".
    return $body.find('div.sc-list-item[data-asin]').filter((_, el) => {
      const removed =
        el.getAttribute('data-removed') === 'true' ||
        Cypress.$(el).find('[class*="removed-msg"]:visible').length > 0;
      return !removed;
    });
  }

  /** Lower-cased text of a cart line, without the hidden "removed" template. */
  static itemText(el) {
    const clone = el.cloneNode(true);
    // Drop inline CSS/JS (their text, e.g. "color: var(--...)", is not product text) and the removed template.
    clone.querySelectorAll('style, script, [class*="removed-msg"]').forEach((n) => n.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  /** Active cart lines whose text contains every keyword. */
  static itemsWithKeywords($body, keywords) {
    const ks = keywords.map((k) => k.toLowerCase());
    return CartPage.activeItems($body)
      .toArray()
      .filter((el) => ks.every((k) => CartPage.itemText(el).includes(k)));
  }

  assertHasItemWithKeywords(keywords) {
    cy.get('body').should(($b) => {
      // Short summary per line: title start + its "Color: ..." value.
      const found = CartPage.activeItems($b)
        .toArray()
        .map((el) => {
          const t = CartPage.itemText(el);
          const color = (t.match(/color:\s*.{0,30}/) || ['(no color line)'])[0];
          return `${t.replace(/^opens in a new tab\s*/, '').slice(0, 70)} | ${color}`;
        });
      expect(
        CartPage.itemsWithKeywords($b, keywords).length,
        `cart should contain an item with: ${JSON.stringify(keywords)}. Cart items: ${JSON.stringify(found)}`
      ).to.be.greaterThan(0);
    });
  }

  /** Yields the data-asin of the first active cart line that matches all keywords. */
  asinByKeywords(keywords) {
    return cy.get('body').then(($b) => {
      const [el] = CartPage.itemsWithKeywords($b, keywords);
      expect(el, `cart should contain an item with: ${JSON.stringify(keywords)}`).to.exist;
      return el.getAttribute('data-asin');
    });
  }

  deleteNext() {
    cy.get('body').then(($body) => {
      const $active = CartPage.activeItems($body);
      if (!$active.length) return;

      const $delete = $active
        .first()
        .find(
          'input[data-action="delete"], input[value="Delete"], ' +
            '[data-feature-id="item-delete-button"] input, [data-action="delete"] input'
        );
      expect(
        $delete.length,
        `active cart line should have a Delete control. Line: ${CartPage.itemText($active[0]).slice(0, 80)}`
      ).to.be.greaterThan(0);

      const before = $active.length;
      cy.wrap($delete.first()).click({ force: true });
      // Wait until the active item count drops (the removed block stays in the DOM).
      cy.get('body', { timeout: 20000 }).should(($b) => {
        expect(CartPage.activeItems($b).length).to.be.lessThan(before);
      });
      this.deleteNext();
    });
  }
}

export default new CartPage();
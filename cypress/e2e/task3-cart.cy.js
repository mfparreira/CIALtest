import homePage from '../support/pages/HomePage';
import productPage from '../support/pages/ProductPage';
import cartPage from '../support/pages/CartPage';

describe('Task 3 - Shopping cart & free shipping', () => {
  let data;
  let sharpener;
  let scissors;

  before(() => {
    cy.fixture('testData').then((d) => {
      data = d;
      sharpener = d.products.sharpener;
      scissors = d.products.scissors;
    });
  });

  // Steps 1 - 9: every test starts with the two products in the cart
  beforeEach(() => {
    // 1. Navigate to amazon.com (ship-to country: Hong Kong)
    homePage.visit();
    homePage.setDeliveryCountry(data.shipping.country);

    // 2-4. Search for the pencil sharpener, add it to the cart and verify confirmation
    homePage.search(sharpener.searchQuery);
    productPage.openFromSearchResults(sharpener.titleFragment, sharpener);
    // The assignment's product is the Gray one (EPS4-KTGRAY); other colors cost more and change
    // whether the cart reaches the free-shipping threshold.
    productPage.selectColor(sharpener.color);
    productPage.addToCart();
    // Confirmation + side cart: 1 item and a subtotal.
    productPage.assertAddedToCart({ items: 1 }).as('afterSharpener');

    // 5-8. Open the scissors, pick the color option, add to cart and verify confirmation
    productPage.visitByPath(scissors.url);
    productPage.selectColor(scissors.colorOption);
    productPage.addToCart();
    // Confirmation + side cart: now 2 items and a larger subtotal than after the sharpener.
    cy.get('@afterSharpener').then((first) => {
      productPage.assertAddedToCart({ items: 2, subtotalAbove: first.subtotal });
    });

    // 9. Both products are in the cart
    cartPage.visit();
    cartPage.assertItemCount(2);
    // Lines are matched by title and color below, not by ASIN: the cart holds the ASIN of the SELECTED
    // variant, which differs from the ASIN in the product URL (the default variant).
    // The cart line itself must show the requested variants (end-to-end check of the color steps).
    // (Cart titles are shorter than product-page titles, so the cart uses its own keyword list.)
    cartPage.assertHasItemWithKeywords([...sharpener.cartKeywords, `color: ${sharpener.color}`]);
    cartPage.assertHasItemWithKeywords([scissors.titleFragment, `color: ${scissors.colorOption}`]);
  });

  // Leave the cart empty so tests stay independent (and can run in parallel)
  afterEach(() => {
    cartPage.emptyCart();
  });

  // Step 10. The assignment expects "does not qualify yet" ($49 threshold, Israel). With Hong Kong the
  // threshold and prices differ, so instead of hard-coding the outcome we check that the free-shipping
  // message agrees with the subtotal and threshold shown on the page. See README ("Deviation: step 10").
  it('10. free-shipping status matches the subtotal of the two initial products', () => {
    cartPage.assertFreeShippingMatchesSubtotal();
  });

  it('11-12. qualifies for free shipping after ordering 3 additional pencil sharpeners', () => {
    // 10. Initial state: message consistent with subtotal / threshold
    cartPage.assertFreeShippingMatchesSubtotal().then((initial) => {
      // 11. Order 3 additional pencil sharpeners (quantity 1 + 3)
      cartPage.asinByKeywords(sharpener.cartKeywords).then((sharpenerAsin) => {
        cartPage.setQuantity(sharpenerAsin, 1 + sharpener.additionalUnits);
      });

      // 12. Subtotal grew past the threshold -> qualifies for free shipping
      cartPage.assertQualifiedForFreeShipping({ subtotalAbove: initial.subtotal });
    });
  });
});
# Amazon – Cypress QA Automation Assignment

Automated tests for amazon.com built with [Cypress](https://www.cypress.io/) using the Page Object pattern.

## Project structure

```
.
├── cypress.config.js              # baseUrl, timeouts, retries
├── package.json
├── docs/
│   ├── task1-test-cases.pdf       # Task 1 (English + Portuguese): 5 test titles + 1 full test case
│   ├── task1-test-cases.md        # same content, English
│   └── task1-test-cases.pt-BR.md  # same content, Portuguese
└── cypress/
    ├── e2e/
    │   ├── task2-customer-service.cy.js   # Task 2
    │   └── task3-cart.cy.js               # Task 3 (beforeEach / afterEach)
    ├── fixtures/
    │   └── testData.json                  # test data (products, country, menu items)
    └── support/
        ├── commands.js                    # visitAmazon, continueIfInterstitial, failOnBotCheck
        ├── e2e.js
        └── pages/                         # Page objects
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm (bundled with Node.js)
- Google Chrome (recommended) – Electron also works

## Setup

```bash
git clone <repository-url>
cd amazon-cypress-challenge
npm install
```

## Running the tests

```bash
# Interactive mode (Cypress Test Runner)
npm run cy:open

# Headless – all specs
npm run cy:run

# Headless – a single task
npm run test:task2
npm run test:task3

# Using Chrome
npx cypress run --browser chrome
```

## Test data

All data lives in `cypress/fixtures/testData.json`: ship-to country (Hong Kong), expected main menu items, search terms, product search query and keywords, product URL, color options and the number of extra sharpeners.

## Design notes

- **Independent tests:** Task 3 uses `beforeEach` to add the two products and `afterEach` to empty the cart. Cypress clears cookies between tests (`testIsolation`), so each test starts with an empty guest cart and the suite can run in parallel.
- **No false positives:** assertions check real text/elements (cart lines matched by title and color, free-shipping message vs. subtotal/threshold, selected color label and variant). No hard-coded prices.
- **Bot protection:** Amazon sometimes shows a "Click the button below to continue shopping" interstitial; `cy.continueIfInterstitial()` clicks "Continue shopping" like a shopper would. `cy.failOnBotCheck()` still fails with a clear message (what matched + URL) if a real CAPTCHA is served, so a blocked page is never reported as a product defect.
- **Strict cleanup:** `afterEach` fails if any active cart line remains; the empty-cart message is not accepted as a substitute. If an active line has no detectable Delete control, cleanup fails with a diagnostic message.
- **Side cart check:** after each "Add to Cart" the test asserts the confirmation panel ("Cart Subtotal" and "Proceed to checkout (N items)"): 1 item after the sharpener, 2 items and a larger subtotal after the scissors.
- **Retries:** failed tests are retried twice in `run` mode to absorb network flakiness.

## Deviations from the assignment (and why)

amazon.com is a live site: layout, catalog, prices and shipping rules change per country and over time. The assignment screenshots were taken with a different ship-to country (Israel) and an older layout, so a few steps cannot be reproduced literally. Each deviation below keeps the intent of the step and still fails when the behaviour is wrong.

### Task 3, step 10 – "you do not qualify for free shipping"

- **Assignment:** with the two initial products, the cart shows *"Add $26.50 of eligible items to your order for FREE Shipping"* (threshold **$49**, Israel). Step 12 then expects the order to qualify after 3 more sharpeners.
- **What we observed (ship-to Hong Kong, as the assignment allows):** the free-shipping threshold is **$35**, shown on the page as *"FREE Shipping to Hong Kong when you spend over $35"*, and the cart with the two initial products can already show *"Your order qualifies for FREE Shipping"* depending on the variant prices. A test that hard-codes "does not qualify" fails for a reason unrelated to a defect, i.e. a false negative.
- **What the test does instead** (`CartPage.assertFreeShippingMatchesSubtotal`): it reads the **subtotal** and the **threshold** from the page and checks both sides of the rule – when `subtotal >= threshold` the "qualifies" message must be shown and the "add $X" message hidden; when below, the "add $X" message must be shown and "qualifies" hidden. A missing message fails. Nothing is hard-coded, so the same test is valid for any country, price or threshold.
- **Step 12** (`assertQualifiedForFreeShipping`) stays strict: after raising the sharpener quantity to 4 the subtotal must be **greater than the initial subtotal** (so a stale page cannot pass), reach the threshold, and show the "qualifies" message.
- **Trade-off:** step 10 no longer *forces* a "not eligible" starting state. If a strict "not eligible" check is required, run with a ship-to country whose threshold is above the two products' subtotal (the assignment's Israel/$49 scenario) and tighten step 10 to expect the "add $X" message.

### Task 2 – main menu and "Customer service"

- The top bar depends on country and season. In one observed layout (US, holiday) it shows *Holiday Gifts, Prime, Today's Deals, Registry, Gift Cards…* and **"Sell" / "Customer Service" are not in the bar or in the "All" menu**; in another (ship-to Hong Kong) both are present. So "Sell" is not asserted, and "Customer Service" is clicked in the bar when present, otherwise through the equivalent footer **"Help"** link, which opens the same `/gp/help/customer/display.html` page (now headed *"Welcome to Amazon Customer Service"*).
- The page language is forced to English (`?language=en_US` and an `Accept-Language` header) so text assertions do not depend on the tester's locale.

### Task 3 – products

- The sharpener's listing title changes often, so search results and the product page are matched on stable keywords (`bostitch`, `electric pencil sharpener`, `stall-free motor`, model `EPS4-KTGRAY`) and the **Gray** option is selected explicitly, as in the assignment.
- Amazon renders the real "Add to Cart" `<input>` with `opacity: 0.01` over a styled button; the test checks it exists and is enabled and clicks it directly. "Added to cart" is then asserted, so a failed add still fails the test.
- The cart keeps a hidden "removed from cart" template inside every line, and keeps the line (with that message visible) after "Delete". Cart helpers therefore only count lines **without a visible removed message**.

## Known limitations

- Amazon changes its markup, A/B variants and prices frequently, and may show a CAPTCHA to automated traffic. If a selector breaks, update it in the matching page object under `cypress/support/pages/`.
- Delivery-location selectors in `HomePage.setDeliveryCountry` cover the two known variants of the "Deliver to" popover.
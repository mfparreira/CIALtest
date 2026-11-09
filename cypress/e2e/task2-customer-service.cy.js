import homePage from '../support/pages/HomePage';
import customerServicePage from '../support/pages/CustomerServicePage';
import wheresMyStuffPage from '../support/pages/WheresMyStuffPage';

describe('Task 2 - Main menu and Customer Service', () => {
  let data;

  before(() => {
    cy.fixture('testData').then((d) => {
      data = d;
    });
  });

  it('navigates from the main menu to "Where\'s My Stuff?" via Customer Service search', () => {
    // 2.1 Navigate to amazon.com
    homePage.visit();

    // 2.2 Validate the main menu
    homePage.validateMainMenu(data.mainMenu);

    // 2.3 Go to the "Customer Service" page through the menu
    homePage.clickMenuItem('Customer Service');
    customerServicePage.assertLoaded();

    // 2.4 Search "where is my stuff"
    customerServicePage.search(data.customerService.searchTerm);

    // 2.5 Click the first result and validate the destination page
    customerServicePage.clickFirstResult();
    wheresMyStuffPage.assertLoaded(data.customerService.pageHeading);
  });
});

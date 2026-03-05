const OnboardingPage = require('../../pageobjects/Onboarding.page');
const AuthPage = require('../../pageobjects/Auth.page');
const HomePage = require('../../pageobjects/Home.page');
const users = require('../../fixtures/users.json');

describe('Smoke - Home', () => {
  before(async () => {
    await driver.pause(2000);
    await OnboardingPage.skipOnboarding();
    await AuthPage.login(users.demo.email, users.demo.password);
    await driver.pause(3000);
  });

  it('shows home screen', async () => {
    await HomePage.waitForVisible('~tab_home');
  });
});

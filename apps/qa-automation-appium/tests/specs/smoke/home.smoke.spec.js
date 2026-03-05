const OnboardingPage = require('../../pageobjects/Onboarding.page');
const AuthPage = require('../../pageobjects/Auth.page');
const HomePage = require('../../pageobjects/Home.page');
const users = require('../../fixtures/users.json');

describe('Smoke - Home', () => {
  before(async () => {
    await OnboardingPage.skipOnboarding();
    await AuthPage.login(users.demo.email, users.demo.password);
  });

  it('shows home screen', async () => {
    // Wait for the feed tab to be loaded and visible
    await HomePage.waitForVisible('~tab_feed', 20000);
  });
});

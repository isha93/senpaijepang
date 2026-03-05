const OnboardingPage = require('../../pageobjects/Onboarding.page');
const AuthPage = require('../../pageobjects/Auth.page');
const HomePage = require('../../pageobjects/Home.page');
const ProfilePage = require('../../pageobjects/Profile.page');
const users = require('../../fixtures/users.json');

describe('Smoke - Profile', () => {
  before(async () => {
    await OnboardingPage.skipOnboarding();
    await AuthPage.login(users.demo.email, users.demo.password);
  });

  it('shows profile view', async () => {
    await HomePage.goToProfile();
    await ProfilePage.waitForVisible('~profile_header_name');
  });
});

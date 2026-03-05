const OnboardingPage = require('../../pageobjects/Onboarding.page');
const AuthPage = require('../../pageobjects/Auth.page');
const HomePage = require('../../pageobjects/Home.page');
const FeedPage = require('../../pageobjects/Feed.page');
const users = require('../../fixtures/users.json');

describe('Smoke - Feed', () => {
  before(async () => {
    await OnboardingPage.skipOnboarding();
    await AuthPage.login(users.demo.email, users.demo.password);
  });

  it('shows feed list', async () => {
    await HomePage.goToFeed();
    await FeedPage.waitForVisible('~feed_header_title', 30000);
  });
});

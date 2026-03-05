const OnboardingPage = require('../../pageobjects/Onboarding.page');
const AuthPage = require('../../pageobjects/Auth.page');
const HomePage = require('../../pageobjects/Home.page');
const JobsPage = require('../../pageobjects/Jobs.page');
const users = require('../../fixtures/users.json');

describe('Smoke - Jobs', () => {
  before(async () => {
    await OnboardingPage.skipOnboarding();
    await AuthPage.login(users.demo.email, users.demo.password);
  });

  it('shows jobs list', async () => {
    await HomePage.goToJobs();
    await JobsPage.waitForJobsList();
  });

  it('opens first job detail', async () => {
    await JobsPage.openFirstJob();
    await JobsPage.waitForJobDetail();
  });
});

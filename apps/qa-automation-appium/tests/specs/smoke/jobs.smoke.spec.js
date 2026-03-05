const OnboardingPage = require('../../pageobjects/Onboarding.page');
const AuthPage = require('../../pageobjects/Auth.page');
const HomePage = require('../../pageobjects/Home.page');
const JobsPage = require('../../pageobjects/Jobs.page');
const users = require('../../fixtures/users.json');

describe('Smoke - Jobs', () => {
  before(async () => {
    await driver.pause(2000);
    await OnboardingPage.skipOnboarding();
    await AuthPage.login(users.demo.email, users.demo.password);
    await driver.pause(3000);
  });

  it('shows jobs list and opens first job detail', async () => {
    await HomePage.goToJobs();
    await JobsPage.waitForVisible('~jobs_list');
    await JobsPage.openFirstJob();
    await JobsPage.waitForVisible('~job_detail_title');
  });
});

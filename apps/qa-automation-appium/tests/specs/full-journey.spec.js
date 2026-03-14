const OnboardingPage = require('../pageobjects/Onboarding.page');
const AuthPage = require('../pageobjects/Auth.page');
const HomePage = require('../pageobjects/Home.page');
const ProfilePage = require('../pageobjects/Profile.page');
const JobsPage = require('../pageobjects/Jobs.page');
const JobApplicationPage = require('../pageobjects/JobApplication.page');
const JourneyPage = require('../pageobjects/Journey.page');
const {
  buildUniqueRegistrationUser,
  fetchVerificationCodeForRegistration,
  isRegistrationE2EEnabled,
  registrationSkipReason
} = require('../support/registration');
const {
  getLatestApplication,
  loginUser,
  progressApplicationToHired,
  provisionVerifiedCandidate,
  requireJourneyE2EConfig
} = require('../support/apiJourney');

const BUNDLE_ID = 'com.senpaijepang.SenpaiJepang';

describe('Full iOS Candidate Journey', function fullJourneySuite() {
  this.timeout(10 * 60 * 1000);

  const candidate = buildUniqueRegistrationUser();

  async function relaunchApp() {
    try {
      await driver.terminateApp(BUNDLE_ID);
    } catch (_error) {
      // App may not be running yet.
    }

    await driver.activateApp(BUNDLE_ID);
    await HomePage.waitForVisible('~tab_feed', 30000);
  }

  it('completes register, verify, KYC approval, apply, and reach hired journey state', async function fullJourneyTest() {
    if (!isRegistrationE2EEnabled()) {
      console.warn(`[full-journey] skipped: ${registrationSkipReason()}`);
      this.skip();
    }

    const { adminApiKey } = requireJourneyE2EConfig();

    await OnboardingPage.skipOnboarding();
    await AuthPage.openRegistration();
    await AuthPage.fillRegistrationAccountInfo(candidate);
    await AuthPage.continueRegistrationAccountInfo();

    const verificationCode = await fetchVerificationCodeForRegistration(candidate.email);
    await AuthPage.enterVerificationCode(verificationCode);
    await AuthPage.submitVerificationCode();
    await AuthPage.waitForRegistrationPreferencesStep(20000);
    await AuthPage.createRegistrationAccount();
    await AuthPage.goToDashboardAfterRegistration();

    await HomePage.waitForVisible('~tab_feed', 30000);
    await HomePage.goToProfile();
    await ProfilePage.waitForProfile();

    const candidateSession = await loginUser(candidate.email, candidate.password);
    const accessToken = candidateSession.accessToken;

    await provisionVerifiedCandidate({
      accessToken,
      adminApiKey
    });

    await relaunchApp();
    await HomePage.goToProfile();
    await ProfilePage.waitForProfile();
    await ProfilePage.waitForVerifiedStatus(20000);

    await HomePage.goToJobs();
    await JobsPage.waitForJobsList();
    await JobsPage.openFirstJob();
    await JobsPage.waitForJobDetail();
    await JobsPage.openApplyFlow();
    await JobApplicationPage.waitForOpen();
    await JobApplicationPage.advanceStep();
    await JobApplicationPage.fillCoverLetter(
      `Applied via full iOS Appium journey automation on ${new Date().toISOString()}`
    );
    await JobApplicationPage.advanceStep();
    await JobApplicationPage.advanceStep();

    const completion = await JobApplicationPage.waitForCompletionState(60000);
    expect(['success', 'already_applied']).toContain(completion.state);

    let latestApplication;
    await browser.waitUntil(async () => {
      try {
        latestApplication = await getLatestApplication(accessToken);
        return Boolean(latestApplication?.id);
      } catch (_error) {
        return false;
      }
    }, {
      timeout: 30000,
      interval: 1000,
      timeoutMsg: 'latest application was not created in time'
    });

    await progressApplicationToHired({
      applicationId: latestApplication.id,
      accessToken,
      adminApiKey
    });

    await relaunchApp();
    await HomePage.goToJourney();
    await JourneyPage.waitForOpen(30000);
    const stepCounter = await JourneyPage.waitForFinalStep(30000);
    const stepCounterText = await stepCounter.getText();
    expect(stepCounterText).toContain('5');

    const jobTitle = await (await JourneyPage.waitForJobTitle()).getText();
    expect(String(jobTitle || '').trim().length).toBeGreaterThan(0);
  });
});

const OnboardingPage = require('../../pageobjects/Onboarding.page');
const AuthPage = require('../../pageobjects/Auth.page');
const {
  buildUniqueRegistrationUser,
  fetchVerificationCodeForRegistration,
  isRegistrationE2EEnabled,
  registrationSkipReason
} = require('../../support/registration');

describe('Regression - Registration', function () {
  it('registers a new account and completes email verification on non-production backend', async function () {
    if (!isRegistrationE2EEnabled()) {
      console.log(`[skip] ${registrationSkipReason()}`);
      this.skip();
    }

    const user = buildUniqueRegistrationUser();

    await OnboardingPage.skipOnboarding();
    await AuthPage.openRegistration();
    await AuthPage.fillRegistrationAccountInfo(user);
    await AuthPage.continueRegistrationAccountInfo();
    const verifyView = await AuthPage.registrationVerifyView;
    await verifyView.waitForDisplayed({ timeout: 30000 });

    const verificationCode = await fetchVerificationCodeForRegistration(user.email);

    await AuthPage.enterVerificationCode(verificationCode);
    await AuthPage.submitVerificationCode();
    await AuthPage.registrationPreferencesView.waitForDisplayed({ timeout: 30000 });
    await AuthPage.continueRegistrationPreferences();
    await AuthPage.goToDashboardAfterRegistration();

    const feedTab = await $('~tab_feed');
    await feedTab.waitForDisplayed({ timeout: 30000 });
    expect(await feedTab.isDisplayed()).toBe(true);
  });
});

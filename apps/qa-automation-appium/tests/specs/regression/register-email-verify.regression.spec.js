const OnboardingPage = require('../../pageobjects/Onboarding.page');
const AuthPage = require('../../pageobjects/Auth.page');

const runRegisterVerify = process.env.RUN_REGISTER_VERIFY === '1';
const regressionDescribe = runRegisterVerify ? describe : describe.skip;

regressionDescribe('Regression - Register Email Verify (UI)', () => {
    before(async () => {
        await OnboardingPage.skipOnboarding();
    });

    it('completes register 4-step and verifies email in UI flow', async () => {
        await AuthPage.signUpLinkButton.waitForDisplayed({ timeout: 15000 });
        await AuthPage.openRegistration();

        const uniqueSuffix = Date.now();
        await AuthPage.fillRegistrationAccountInfo({
            fullName: `QA Verify ${uniqueSuffix}`,
            email: `qa.verify.${uniqueSuffix}@senpaijepang.test`,
            password: 'Password123!'
        });

        await AuthPage.continueRegistrationPreferences();
        await AuthPage.verifyEmailView.waitForDisplayed({ timeout: 15000 });

        expect(await AuthPage.verifyEmailSubmitButton.isEnabled()).toBe(false);
        await AuthPage.enterVerificationCode('123456');
        await driver.pause(300);
        expect(await AuthPage.verifyEmailSubmitButton.isEnabled()).toBe(true);

        await AuthPage.verifyEmailSubmitButton.click();
        await AuthPage.registerSuccessTitle.waitForDisplayed({ timeout: 15000 });
        expect(await AuthPage.registerSuccessTitle.isDisplayed()).toBe(true);
    });
});

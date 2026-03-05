const OnboardingPage = require('../../pageobjects/Onboarding.page');
const AuthPage = require('../../pageobjects/Auth.page');
const users = require('../../fixtures/users.json');

describe('Regression - Auth', () => {
    before(async () => {
        await OnboardingPage.skipOnboarding();
    });

    it('shows error on invalid login', async () => {
        // Use an invalid email format to trigger immediate client-side validation error
        await AuthPage.login('invalid-email-format', 'WrongPassword1!');
        // Wait for error text to appear
        const errorEl = await $('~auth_error_text');
        await errorEl.waitForDisplayed({ timeout: 15000 });
        expect(await errorEl.isDisplayed()).toBe(true);
    });

    it('logs in successfully with valid credentials', async () => {
        await AuthPage.login(users.demo.email, users.demo.password);
        const tab = await $('~tab_feed');
        await tab.waitForDisplayed({ timeout: 15000 });
        expect(await tab.isDisplayed()).toBe(true);
    });
});

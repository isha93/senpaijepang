const OnboardingPage = require('../../pageobjects/Onboarding.page');
const AuthPage = require('../../pageobjects/Auth.page');
const HomePage = require('../../pageobjects/Home.page');
const ProfilePage = require('../../pageobjects/Profile.page');
const users = require('../../fixtures/users.json');

describe('Regression - Profile', () => {
    before(async () => {
        await OnboardingPage.skipOnboarding();
        await AuthPage.login(users.demo.email, users.demo.password);
        await HomePage.waitForVisible('~tab_feed', 15000);
        await HomePage.goToProfile();
    });

    it('displays profile header name', async () => {
        await ProfilePage.waitForProfile();
        const name = await $('~profile_header_name');
        expect(await name.isDisplayed()).toBe(true);
    });

    it('shows completion card', async () => {
        const card = await $('~profile_completion_card');
        await card.waitForDisplayed({ timeout: 10000 });
        expect(await card.isDisplayed()).toBe(true);
    });

    it('taps edit profile button', async () => {
        const settings = await ProfilePage.tapEdit();
        expect(await settings.isDisplayed()).toBe(true);
    });
});

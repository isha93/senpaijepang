const OnboardingPage = require('../../pageobjects/Onboarding.page');
const AuthPage = require('../../pageobjects/Auth.page');
const HomePage = require('../../pageobjects/Home.page');
const ProfilePage = require('../../pageobjects/Profile.page');
const users = require('../../fixtures/users.json');

describe('Regression - Home', () => {
    before(async () => {
        await OnboardingPage.skipOnboarding();
        await AuthPage.login(users.demo.email, users.demo.password);
        await HomePage.waitForVisible('~tab_feed');
    });

    it('interacts with search input', async () => {
        const searchInput = await HomePage.searchInput;
        await searchInput.waitForDisplayed({ timeout: 15000 });

        // Tap search to focus
        await searchInput.click();
        await searchInput.setValue('Visa');
        // Clear value to resume
        await searchInput.clearValue();
        if (driver.isIOS) {
            await driver.keys(['\n']);
            await driver.pause(1000); // Wait for keyboard to dismiss fully
        }
    });

    it('opens profile from home shortcut and taps back to home', async () => {
        const profileBtn = await HomePage.profileButton;
        await profileBtn.waitForDisplayed({ timeout: 10000 });
        await profileBtn.click();

        // Verify it opened Profile view
        await ProfilePage.waitForVisible('~profile_header_name');

        // Nav back to home feature via tab
        const tabFeed = await HomePage.tabFeed;
        await tabFeed.click();
        await HomePage.waitForVisible('~tab_feed');
    });

    it('opens notifications', async () => {
        await HomePage.openNotifications();
        const tabFeed = await HomePage.tabFeed;
        await tabFeed.click();
        await HomePage.waitForVisible('~tab_feed', 10000);
    });
});

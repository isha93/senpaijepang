const OnboardingPage = require('../pageobjects/Onboarding.page');
const AuthPage = require('../pageobjects/Auth.page');
const users = require('../fixtures/users.json');

describe('Senpai Jepang - Smoke', () => {
  it('launches app and reaches home feed tab', async () => {
    await OnboardingPage.skipOnboarding();

    const feedTab = await $('~tab_feed');
    const emailInput = await $('~auth_email_input');

    const isFeedVisible = await feedTab.isExisting() && await feedTab.isDisplayed();
    if (!isFeedVisible) {
      await emailInput.waitForDisplayed({ timeout: 15000 });
      await AuthPage.login(users.demo.email, users.demo.password);
    }

    await feedTab.waitForDisplayed({ timeout: 20000 });
    expect(await feedTab.isDisplayed()).toBe(true);
  });
});

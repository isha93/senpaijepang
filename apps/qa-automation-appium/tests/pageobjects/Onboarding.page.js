const BasePage = require('./Base.page');

class OnboardingPage extends BasePage {
    get nextButton() { return $('~onboarding_next_button'); }
    get agreeCheckbox() { return $('~onboarding_agree_checkbox'); }

    /**
     * Attempts to skip onboarding. If onboarding is not shown
     * (e.g. already completed in a previous session), this is a no-op.
     */
    async skipOnboarding() {
        try {
            const btn = await this.nextButton;
            const isDisplayed = await btn.waitForDisplayed({ timeout: 5000 });
            if (!isDisplayed) return;
        } catch (e) {
            // Onboarding not shown, skip
            return;
        }

        // Step 1-3: tap Next button 3 times
        for (let i = 0; i < 3; i++) {
            const btn = await this.nextButton;
            await btn.waitForDisplayed({ timeout: 5000 });
            await btn.click();
            await driver.pause(500);
        }
        // Step 4: agree to terms, then tap final button
        const checkbox = await this.agreeCheckbox;
        await checkbox.waitForDisplayed({ timeout: 5000 });
        await checkbox.click();
        await driver.pause(300);
        const finalBtn = await this.nextButton;
        await finalBtn.click();
        await driver.pause(1000);
    }
}

module.exports = new OnboardingPage();

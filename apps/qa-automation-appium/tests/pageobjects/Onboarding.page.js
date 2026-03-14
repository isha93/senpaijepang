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

        const checkbox = await this.agreeCheckbox;
        let attempts = 0;

        while (attempts < 5) {
            try {
                if (await checkbox.isDisplayed()) break;
            } catch (e) { }

            const btn = await this.nextButton;
            await btn.click();
            await driver.pause(1200); // Wait for transition
            attempts++;
        }

        await checkbox.waitForDisplayed({ timeout: 5000 });
        await checkbox.click();
        await driver.pause(500);
        const finalBtn = await this.nextButton;
        await finalBtn.click();
        await driver.pause(1500);
    }
}

module.exports = new OnboardingPage();

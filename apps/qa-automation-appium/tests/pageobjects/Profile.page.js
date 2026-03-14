const BasePage = require('./Base.page');

class ProfilePage extends BasePage {
  get headerName() { return $('~profile_header_name'); }
  get editButton() { return $('~profile_edit_button'); }
  get completionCard() { return $('~profile_completion_card'); }
  get statusValue() { return $('~profile_status_value'); }
  get verificationCTA() { return $('~profile_verification_cta'); }
  get logoutButton() { return $('~profile_logout_button'); }
  get settingsView() { return $('~settings_view'); }

  async waitForProfile(timeout = 20000) {
    const name = await this.headerName;
    await name.waitForDisplayed({ timeout });
    return name;
  }

  async tapEdit() {
    const btn = await this.editButton;
    await btn.waitForDisplayed({ timeout: 10000 });
    await btn.click();
    const view = await this.settingsView;
    await view.waitForDisplayed({ timeout: 15000 });
    return view;
  }

  async tapLogout() {
    const btn = await this.logoutButton;
    await btn.waitForDisplayed({ timeout: 10000 });
    await btn.click();
    await driver.pause(2000);
  }

  async waitForVerificationCTA(timeout = 10000) {
    const cta = await this.verificationCTA;
    await cta.waitForDisplayed({ timeout });
    return cta;
  }

  async waitForVerifiedStatus(timeout = 15000) {
    const status = await this.statusValue;
    await status.waitForDisplayed({ timeout });
    await browser.waitUntil(async () => {
      const text = await status.getText();
      return /verified|terverifikasi/i.test(String(text || ''));
    }, {
      timeout,
      interval: 500,
      timeoutMsg: 'profile status did not update to verified'
    });
    return status;
  }
}

module.exports = new ProfilePage();

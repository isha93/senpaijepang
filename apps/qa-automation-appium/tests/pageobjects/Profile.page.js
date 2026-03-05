const BasePage = require('./Base.page');

class ProfilePage extends BasePage {
  get headerName() { return $('~profile_header_name'); }
  get editButton() { return $('~profile_edit_button'); }
  get completionCard() { return $('~profile_completion_card'); }
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
}

module.exports = new ProfilePage();

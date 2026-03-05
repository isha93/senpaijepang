const BasePage = require('./Base.page');

class AuthPage extends BasePage {
  get emailInput() { return $('~auth_email_input'); }
  get passwordInput() { return $('~auth_password_input'); }
  get loginButton() { return $('~auth_login_button'); }
  get errorText() { return $('~auth_error_text'); }

  async login(email, password) {
    await this.emailInput.waitForDisplayed({ timeout: 15000 });
    await this.passwordInput.waitForDisplayed({ timeout: 15000 });
    await this.emailInput.clearValue();
    await this.passwordInput.clearValue();
    await this.emailInput.setValue(email);
    await this.passwordInput.setValue(password);
    await this.loginButton.click();
  }
}

module.exports = new AuthPage();

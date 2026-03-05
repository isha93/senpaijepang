const BasePage = require('./Base.page');

class AuthPage extends BasePage {
  get emailInput() { return $('~auth_email_input'); }
  get passwordInput() { return $('~auth_password_input'); }
  get loginButton() { return $('~auth_login_button'); }
  get errorText() { return $('~auth_error_text'); }
  get signUpLinkButton() { return $('~auth_sign_up_link_button'); }
  get registerFullNameInput() { return $('~auth_register_full_name_input'); }
  get registerEmailInput() { return $('~auth_register_email_input'); }
  get registerPasswordInput() { return $('~auth_register_password_input'); }
  get registerButton() { return $('~auth_register_button'); }
  get registerPreferencesNextButton() { return $('~auth_register_preferences_next_button'); }
  get verifyEmailView() { return $('~auth_verify_email_view'); }
  get verifyEmailCodeInput() { return $('~auth_verify_email_code_input'); }
  get verifyEmailSubmitButton() { return $('~auth_verify_email_submit_button'); }
  get registerSuccessTitle() { return $('~auth_register_success_title'); }

  async login(email, password) {
    await this.emailInput.waitForDisplayed({ timeout: 15000 });
    await this.passwordInput.waitForDisplayed({ timeout: 15000 });
    await this.emailInput.clearValue();
    await this.passwordInput.clearValue();
    await this.emailInput.setValue(email);
    await this.passwordInput.setValue(password);
    await this.loginButton.click();
  }

  async openRegistration() {
    await this.signUpLinkButton.waitForDisplayed({ timeout: 15000 });
    await this.signUpLinkButton.click();
  }

  async fillRegistrationAccountInfo({ fullName, email, password }) {
    await this.registerFullNameInput.waitForDisplayed({ timeout: 15000 });
    await this.registerEmailInput.waitForDisplayed({ timeout: 15000 });
    await this.registerPasswordInput.waitForDisplayed({ timeout: 15000 });

    await this.registerFullNameInput.clearValue();
    await this.registerEmailInput.clearValue();
    await this.registerPasswordInput.clearValue();

    await this.registerFullNameInput.setValue(fullName);
    await this.registerEmailInput.setValue(email);
    await this.registerPasswordInput.setValue(password);
    await this.registerButton.click();
  }

  async continueRegistrationPreferences() {
    await this.registerPreferencesNextButton.waitForDisplayed({ timeout: 15000 });
    await this.registerPreferencesNextButton.click();
  }

  async enterVerificationCode(code) {
    await this.verifyEmailCodeInput.waitForDisplayed({ timeout: 15000 });
    await this.verifyEmailCodeInput.setValue(code);
  }
}

module.exports = new AuthPage();

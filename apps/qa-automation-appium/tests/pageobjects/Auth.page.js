const BasePage = require('./Base.page');

class AuthPage extends BasePage {
  get emailInput() { return $('~auth_email_input'); }
  get passwordInput() { return $('~auth_password_input'); }
  get loginButton() { return $('~auth_login_button'); }
  get errorText() { return $('~auth_error_text'); }
  get registrationFullNameInput() { return $('~registration_full_name_input'); }
  get registrationEmailInput() { return $('~registration_email_input'); }
  get registrationPasswordInput() { return $('~registration_password_input'); }
  get registrationConfirmPasswordInput() { return $('~registration_confirm_password_input'); }
  get registrationContinueButton() { return $('~registration_continue_button'); }
  get registrationCreateAccountButton() { return $('~registration_create_account_button'); }
  get registrationVerifyView() { return $('~registration_verify_view'); }
  get registrationVerifyCodeInput() { return $('~registration_verify_code_input'); }
  get registrationVerifyEmailButton() { return $('~registration_verify_email_button'); }
  get registrationResendCodeButton() { return $('~registration_resend_code_button'); }
  get registrationChangeEmailButton() { return $('~registration_change_email_button'); }

  async login(email, password) {
    await this.emailInput.waitForDisplayed({ timeout: 15000 });
    await this.passwordInput.waitForDisplayed({ timeout: 15000 });
    await this.emailInput.clearValue();
    await this.passwordInput.clearValue();
    await this.emailInput.setValue(email);
    await this.passwordInput.setValue(password);
    await this.loginButton.click();
  }

  async fillRegistrationAccountInfo({ fullName, email, password, confirmPassword = password }) {
    await this.registrationFullNameInput.waitForDisplayed({ timeout: 15000 });
    await this.registrationFullNameInput.clearValue();
    await this.registrationEmailInput.clearValue();
    await this.registrationPasswordInput.clearValue();
    await this.registrationConfirmPasswordInput.clearValue();
    await this.registrationFullNameInput.setValue(fullName);
    await this.registrationEmailInput.setValue(email);
    await this.registrationPasswordInput.setValue(password);
    await this.registrationConfirmPasswordInput.setValue(confirmPassword);
  }

  async continueRegistrationAccountInfo() {
    await this.registrationContinueButton.waitForDisplayed({ timeout: 15000 });
    await this.registrationContinueButton.click();
  }

  async createRegistrationAccount() {
    await this.registrationCreateAccountButton.waitForDisplayed({ timeout: 15000 });
    await this.registrationCreateAccountButton.click();
  }

  async enterVerificationCode(code) {
    await this.registrationVerifyCodeInput.waitForDisplayed({ timeout: 15000 });
    await this.registrationVerifyCodeInput.setValue(code);
  }

  async submitVerificationCode() {
    await this.registrationVerifyEmailButton.waitForDisplayed({ timeout: 15000 });
    await this.registrationVerifyEmailButton.click();
  }
}

module.exports = new AuthPage();

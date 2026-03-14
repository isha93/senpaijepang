const BasePage = require('./Base.page');

class AuthPage extends BasePage {
  get emailInput() { return $('~auth_email_input'); }
  get passwordInput() { return $('~auth_password_input'); }
  get loginButton() { return $('~auth_login_button'); }
  get openRegistrationButton() { return $('~auth_open_registration_button'); }
  get errorText() { return $('~auth_error_text'); }
  get registrationBackButton() { return $('~registration_back_button'); }
  get registrationHeaderTitle() { return $('~registration_header_title'); }
  get registrationAccountView() { return $('~registration_account_view'); }
  get registrationPreferencesView() { return $('~registration_preferences_view'); }
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
  get registrationErrorText() { return $('~registration_error_text'); }
  get registrationInfoText() { return $('~registration_info_text'); }

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
    await this.openRegistrationButton.waitForDisplayed({ timeout: 15000 });
    await this.openRegistrationButton.click();
    await this.registrationFullNameInput.waitForDisplayed({ timeout: 15000 });
  }

  async fillRegistrationAccountInfo({ fullName, email, password, confirmPassword = password }) {
    await this.registrationFullNameInput.waitForDisplayed({ timeout: 15000 });
    await this.setInputValue(this.registrationFullNameInput, fullName);
    await this.setInputValue(this.registrationEmailInput, email);
    await this.setInputValue(this.registrationPasswordInput, password);
    await driver.pause(500);

    // Explicitly focus and set Confirm Password to ensure it registers
    await this.registrationConfirmPasswordInput.click();
    await this.registrationConfirmPasswordInput.clearValue();
    await this.registrationConfirmPasswordInput.setValue(confirmPassword + '\\n'); // Add newline to trigger dismiss/commit

    try {
      await driver.hideKeyboard();
    } catch (_error) {
      // Keyboard may already be dismissed on some simulator states.
    }
    await this.dismissRegistrationKeyboard();
  }

  async continueRegistrationAccountInfo() {
    await this.registrationAccountView.waitForDisplayed({ timeout: 15000 });
    await this.dismissRegistrationKeyboard();

    // Scroll down to ensure the Continue button is visible
    try {
      await driver.execute('mobile: scroll', { direction: 'down' });
    } catch (_e) {
      // Ignored if already at bottom or scroll fails
    }

    try {
      await this.registrationContinueButton.waitForDisplayed({ timeout: 15000 });
      await this.registrationContinueButton.click();
    } catch (error) {
      // If the button is still not visible natively, try to find it by name using an iOS class chain or predicate 
      // and tap it directly. Wait a moment first.
      await driver.pause(1000);
      const continueBtn = await driver.$(`-ios predicate string:name == "registration_continue_button"`);
      await continueBtn.click();
    }

    const transitioned = await this.waitForRegistrationVerifyStep(5000);
    if (!transitioned) {
      await this.dismissRegistrationKeyboard();
      await this.registrationContinueButton.waitForDisplayed({ timeout: 5000 });
      await this.registrationContinueButton.click();
      const errorText = await this.getRegistrationErrorText();
      if (errorText) {
        throw new Error(`registration did not advance to verify email: ${errorText}`);
      }
    }
    await this.registrationVerifyView.waitForDisplayed({ timeout: 15000 });
  }

  async continueRegistrationPreferences() {
    await this.registrationPreferencesView.waitForDisplayed({ timeout: 15000 });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (await this.registrationCreateAccountButton.isDisplayed()) {
        await this.registrationCreateAccountButton.click();
        return;
      }
      await driver.pause(500);
    }

    const errorText = await this.getRegistrationErrorText();
    throw new Error(errorText || 'element (~registration_create_account_button) not displayed on preferences screen');
  }

  async createRegistrationAccount() {
    await this.continueRegistrationPreferences();
  }

  async enterVerificationCode(code) {
    await this.registrationVerifyCodeInput.waitForDisplayed({ timeout: 15000 });
    await this.registrationVerifyCodeInput.setValue(code);
  }

  async submitVerificationCode() {
    await this.registrationVerifyEmailButton.waitForDisplayed({ timeout: 15000 });
    await this.registrationVerifyEmailButton.click();
  }

  async goBackFromRegistration() {
    await this.registrationBackButton.waitForDisplayed({ timeout: 15000 });
    await this.registrationBackButton.click();
  }

  async dismissRegistrationKeyboard() {
    try {
      await driver.hideKeyboard();
      return;
    } catch (_error) {
      // Fall back to tapping outside the active text field.
    }

    try {
      if (await this.registrationHeaderTitle.isDisplayed()) {
        await this.registrationHeaderTitle.click();
        await driver.pause(300);
      }
    } catch (_error) {
      // Header may not be hittable during transition.
    }
  }

  async waitForRegistrationPreferencesStep(timeout = 10000) {
    try {
      await this.registrationPreferencesView.waitForDisplayed({ timeout });
      return true;
    } catch (_error) {
      return false;
    }
  }

  async waitForRegistrationVerifyStep(timeout = 10000) {
    try {
      await this.registrationVerifyView.waitForDisplayed({ timeout });
      return true;
    } catch (_error) {
      return false;
    }
  }

  async getRegistrationErrorText() {
    const matches = await $$('~registration_error_text');
    if (!matches.length || !(await matches[0].isDisplayed())) {
      return null;
    }
    return matches[0].getText();
  }

  async setInputValue(elementPromise, value) {
    const element = await elementPromise;
    await element.waitForDisplayed({ timeout: 15000 });
    await element.click();
    try {
      await element.clearValue();
    } catch (_error) {
      // Some iOS text fields ignore clearValue until focused.
    }
    await element.setValue(value);
  }
}

module.exports = new AuthPage();

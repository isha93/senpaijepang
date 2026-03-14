const fs = require('fs');
const path = require('path');
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
  get registrationPasswordVisibilityButton() { return $('~registration_password_visibility_button'); }
  get registrationConfirmPasswordVisibilityButton() { return $('~registration_confirm_password_visibility_button'); }
  get registrationContinueButton() { return $('~registration_continue_button'); }
  get registrationCreateAccountButton() { return $('~registration_create_account_button'); }
  get registrationVerifyView() { return $('~registration_verify_view'); }
  get registrationVerifyCodeInput() { return $('~registration_verify_code_input'); }
  get registrationVerifyEmailButton() { return $('-ios predicate string:type == "XCUIElementTypeButton" AND label == "Verify Email"'); }
  get registrationResendCodeButton() { return $('~registration_resend_code_button'); }
  get registrationChangeEmailButton() { return $('~registration_change_email_button'); }
  get registrationGoToDashboardButton() { return $('-ios predicate string:type == "XCUIElementTypeButton" AND label == "Go to Dashboard"'); }
  get registrationTokyoQuickPrefectureButton() { return $('-ios predicate string:type == "XCUIElementTypeButton" AND label == "Tokyo"'); }
  get registrationPreferencesContinueButton() { return $('-ios predicate string:type == "XCUIElementTypeButton" AND label == "Continue"'); }
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
    await this.ensureRegistrationPasswordInputsVisible();
    await this.setInputValueVerified(this.registrationPasswordInput, password);
    await this.setInputValueVerified(this.registrationConfirmPasswordInput, confirmPassword);
    await this.dismissRegistrationKeyboard();
  }

  async continueRegistrationAccountInfo() {
    await this.registrationAccountView.waitForDisplayed({ timeout: 15000 });
    await this.dismissRegistrationKeyboard();

    try {
      const continueButton = await this.findVisibleWithSwipe('~registration_continue_button', {
        maxSwipes: 4,
        pauseMs: 400,
        direction: 'up'
      });
      await continueButton.click();
    } catch (error) {
      // If the button is still not visible natively, try to find it by name using an iOS predicate
      // and tap it directly after a short pause.
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
    await this.selectRegistrationQuickPrefecture();
    await this.dismissRegistrationKeyboard();

    try {
      const continueButton = await this.findVisibleWithSwipe('~registration_create_account_button', {
        maxSwipes: 3,
        pauseMs: 300,
        direction: 'up'
      });
      await continueButton.click();
    } catch (_error) {
      try {
        const continueButton = await this.findVisibleWithSwipe('-ios predicate string:type == "XCUIElementTypeButton" AND name == "registration_create_account_button"', {
          maxSwipes: 2,
          pauseMs: 300,
          direction: 'up'
        });
        await continueButton.click();
      } catch (_nestedError) {
        try {
          const continueButton = await this.findVisibleWithSwipe('-ios predicate string:type == "XCUIElementTypeButton" AND label == "Continue"', {
            maxSwipes: 2,
            pauseMs: 300,
            direction: 'up'
          });
          await continueButton.click();
        } catch (_fallbackError) {
          const button = await this.registrationPreferencesContinueButton;
          if (await button.isExisting()) {
            await button.click();
          }
        }
      }
    }

    const transitioned = await this.waitForRegistrationSuccessStep(5000);
    if (transitioned) {
      return;
    }

    await this.captureRegistrationDebugState('preferences-continue-no-transition');
    const errorText = await this.getRegistrationErrorText();
    throw new Error(errorText || 'preferences did not advance to success step');
  }

  async createRegistrationAccount() {
    await this.continueRegistrationPreferences();
  }

  async enterVerificationCode(code) {
    await this.registrationVerifyCodeInput.waitForDisplayed({ timeout: 15000 });
    await this.registrationVerifyCodeInput.setValue(code);
  }

  async submitVerificationCode() {
    await this.dismissRegistrationKeyboard();

    try {
      const verifyButton = await this.findVisibleWithSwipe('-ios predicate string:type == "XCUIElementTypeButton" AND label == "Verify Email"', {
        maxSwipes: 3,
        pauseMs: 300,
        direction: 'up'
      });
      await verifyButton.click();
      return;
    } catch (_error) {
      // Fall back to a direct lookup when the footer button exists but swipe heuristics miss it.
    }

    const verifyButton = await this.registrationVerifyEmailButton;
    if (await verifyButton.isExisting()) {
      await verifyButton.click();
      return;
    }

    await this.captureRegistrationDebugState('verify-email-button-missing');
    throw new Error('registration verify email button not found in accessibility tree');
  }

  async waitForRegistrationSuccessStep(timeout = 15000) {
    try {
      await this.registrationGoToDashboardButton.waitForDisplayed({ timeout });
      return true;
    } catch (_error) {
      return false;
    }
  }

  async goToDashboardAfterRegistration() {
    const transitioned = await this.waitForRegistrationSuccessStep();
    if (!transitioned) {
      await this.captureRegistrationDebugState('success-button-missing');
      throw new Error('registration success step did not appear');
    }

    await this.registrationGoToDashboardButton.click();
  }

  async goBackFromRegistration() {
    await this.registrationBackButton.waitForDisplayed({ timeout: 15000 });
    await this.registrationBackButton.click();
  }

  async dismissRegistrationKeyboard() {
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

  async selectRegistrationQuickPrefecture() {
    const quickPrefectureButton = await this.registrationTokyoQuickPrefectureButton;
    if ((await quickPrefectureButton.isExisting()) && (await quickPrefectureButton.isDisplayed())) {
      await quickPrefectureButton.click();
      await driver.pause(300);
    }
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

  async setSecureInputValue(elementPromise, value) {
    const element = await elementPromise;
    await element.waitForDisplayed({ timeout: 15000 });
    await element.click();
    await driver.pause(200);

    try {
      await element.clearValue();
      await driver.pause(150);
    } catch (_error) {
      // Some iOS SecureField implementations ignore clearValue when empty.
    }

    await element.setValue(value);
    await driver.pause(250);
  }

  async setInputValueVerified(elementPromise, value) {
    const element = await elementPromise;
    await element.waitForDisplayed({ timeout: 15000 });
    await element.click();
    await driver.pause(200);

    try {
      await element.clearValue();
      await driver.pause(150);
    } catch (_error) {
      // Some iOS text fields ignore clearValue when empty.
    }

    await element.setValue(value);
    await driver.pause(300);

    let actualValue = await this.readElementValue(element);
    if (actualValue === value) {
      return;
    }

    try {
      await element.clearValue();
      await driver.pause(150);
    } catch (_error) {
      // Best effort before retrying with slower typing.
    }

    for (const character of String(value)) {
      await element.addValue(character);
      await driver.pause(40);
    }
    await driver.pause(300);

    actualValue = await this.readElementValue(element);
    if (actualValue !== value) {
      const selector = element.selector || 'field';
      throw new Error(`failed to set input value reliably for ${selector}: expected "${value}" got "${actualValue}"`);
    }
  }

  async readElementValue(element) {
    try {
      const value = await element.getValue();
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    } catch (_error) {
      // Fall back to other iOS element properties.
    }

    try {
      const value = await element.getAttribute('value');
      if (typeof value === 'string') {
        return value;
      }
    } catch (_error) {
      // Fall back to text.
    }

    try {
      const text = await element.getText();
      if (typeof text === 'string') {
        return text;
      }
    } catch (_error) {
      // Ignore final fallback failure.
    }

    return '';
  }

  async captureRegistrationDebugState(label) {
    const artifactDir = path.resolve(__dirname, '../../artifacts/debug');
    fs.mkdirSync(artifactDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');

    try {
      const source = await driver.getPageSource();
      fs.writeFileSync(path.join(artifactDir, `${label}-${stamp}.xml`), source, 'utf8');
    } catch (_error) {
      // Ignore debug capture failures.
    }

    try {
      await driver.saveScreenshot(path.join(artifactDir, `${label}-${stamp}.png`));
    } catch (_error) {
      // Ignore debug capture failures.
    }
  }

  async ensureRegistrationPasswordInputsVisible() {
    if (await this.registrationPasswordVisibilityButton.isDisplayed()) {
      await this.registrationPasswordVisibilityButton.click();
      await driver.pause(200);
    }

    if (await this.registrationConfirmPasswordVisibilityButton.isDisplayed()) {
      await this.registrationConfirmPasswordVisibilityButton.click();
      await driver.pause(200);
    }
  }
}

module.exports = new AuthPage();

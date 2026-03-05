const BasePage = require('./Base.page');

class JobApplicationPage extends BasePage {
  get container() { return $('~job_application_view'); }
  get backButton() { return $('~job_application_back_button'); }
  get cvUploadButton() { return $('~job_application_cv_upload_button'); }
  get cvFileName() { return $('~job_application_cv_file_name'); }
  get coverLetterInput() { return $('~job_application_cover_letter_input'); }
  get primaryButton() { return $('~job_application_primary_button'); }
  get successTitle() { return $('~job_application_success_title'); }
  get errorMessage() { return $('~job_application_error_message'); }
  get successTextFallback() {
    return $('//XCUIElementTypeStaticText[contains(@name, "Lamaran Berhasil") or contains(@label, "Lamaran Berhasil") or contains(@name, "Application Submitted") or contains(@label, "Application Submitted")]');
  }
  get successPrimaryButtonFallback() {
    return $('//XCUIElementTypeButton[@name="Kembali ke Beranda" or @label="Kembali ke Beranda" or @name="Back to Home" or @label="Back to Home" or @name="Lihat Status Lamaran" or @label="Lihat Status Lamaran" or @name="View Application Status" or @label="View Application Status"]');
  }

  async waitForOpen(timeout = 20000) {
    const view = await this.container;
    await view.waitForDisplayed({ timeout });
    return view;
  }

  async waitForPrimaryButton(timeout = 15000) {
    const selectors = [
      '~job_application_primary_button',
      '//XCUIElementTypeButton[@name="Lanjutkan" or @label="Lanjutkan" or @name="Review Lamaran" or @label="Review Lamaran" or contains(@name, "Kirim Lamaran") or contains(@label, "Kirim Lamaran")]',
    ];
    const intervalMs = 250;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      for (const selector of selectors) {
        const button = await $(selector);
        if ((await button.isExisting()) && (await button.isDisplayed())) {
          return button;
        }
      }
      await driver.pause(intervalMs);
    }

    throw new Error('Primary action button not visible on Job Application screen');
  }

  async advanceStep() {
    if (driver.isIOS) {
      try { await driver.keys(['\n']); } catch {}
    }
    const button = await this.waitForPrimaryButton(15000);
    await button.click();
  }

  async fillCoverLetter(text) {
    const input = await this.coverLetterInput;
    await input.waitForDisplayed({ timeout: 15000 });
    await input.click();
    await input.setValue(text);
    if (driver.isIOS) {
      try { await driver.keys(['\n']); } catch {}
    }
  }

  isAlreadyAppliedMessage(message) {
    const normalized = String(message || '').toLowerCase();
    return /already|sudah|duplicate|exists|existing|applied|status code:\s*400|status code:\s*409/.test(normalized);
  }

  async waitForCompletionState(timeout = 45000) {
    const deadline = Date.now() + timeout;
    const intervalMs = 300;
    let lastSubmitTapAt = 0;

    while (Date.now() < deadline) {
      const success = await this.successTitle;
      const successFallbackText = await this.successTextFallback;
      const successFallbackButton = await this.successPrimaryButtonFallback;
      if (
        ((await success.isExisting()) && (await success.isDisplayed())) ||
        ((await successFallbackText.isExisting()) && (await successFallbackText.isDisplayed())) ||
        ((await successFallbackButton.isExisting()) && (await successFallbackButton.isDisplayed()))
      ) {
        return { state: 'success' };
      }

      const error = await this.errorMessage;
      if ((await error.isExisting()) && (await error.isDisplayed())) {
        const message = await error.getText();
        if (this.isAlreadyAppliedMessage(message)) {
          return { state: 'already_applied', message };
        }
        throw new Error(`Job application failed: ${message || 'unknown error'}`);
      }

      // If we are still on the application view and submit CTA is visible, retry submit tap.
      const primary = await this.waitForPrimaryButton(1200).catch(() => null);
      if (primary) {
        let label = '';
        try { label = await primary.getText(); } catch {}
        const normalized = String(label || '').toLowerCase();
        const shouldSubmitTap = /kirim lamaran|submit|send/i.test(normalized);
        if (shouldSubmitTap && Date.now() - lastSubmitTapAt > 2500) {
          await primary.click();
          lastSubmitTapAt = Date.now();
        }
      }

      const container = await this.container;
      if (!(await container.isExisting())) {
        return { state: 'dismissed' };
      }

      await driver.pause(intervalMs);
    }

    const source = await driver.getPageSource();
    await browser.saveScreenshot('/tmp/wdio-job-application-timeout.png');
    throw new Error(`Neither success nor already-applied state appeared. Debug source head: ${source.slice(0, 1200)} | screenshot: /tmp/wdio-job-application-timeout.png`);
  }
}

module.exports = new JobApplicationPage();

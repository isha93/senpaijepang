const BasePage = require('./Base.page');
const fs = require('fs');
const path = require('path');

class JourneyPage extends BasePage {
  get container() { return $('~journey_view'); }
  get emptyView() { return $('~journey_empty_view'); }
  get statusCard() { return $('~journey_status_card'); }
  get jobTitle() { return $('~journey_job_title'); }
  get stepCounter() { return $('~journey_step_counter'); }
  get stepCounterByLabel() {
    return $(`-ios predicate string:type == "XCUIElementTypeOther" AND label CONTAINS "Step" AND label CONTAINS "of"`);
  }

  async waitForOpen(timeout = 20000) {
    const view = await this.container;
    await view.waitForDisplayed({ timeout });
    return view;
  }

  async waitForJobTitle(timeout = 15000) {
    const title = await this.jobTitle;
    await title.waitForDisplayed({ timeout });
    return title;
  }

  async waitForFinalStep(timeout = 20000) {
    let stepCounter = await this.stepCounter;
    try {
      await stepCounter.waitForDisplayed({ timeout });
    } catch (_error) {
      stepCounter = await this.stepCounterByLabel;
      try {
        await stepCounter.waitForDisplayed({ timeout: 5000 });
      } catch (fallbackError) {
        await this.captureJourneyDebugState('journey-final-step-missing');
        throw fallbackError;
      }
    }
    await browser.waitUntil(async () => {
      const text = await stepCounter.getText();
      return /5/.test(String(text || ''));
    }, {
      timeout,
      interval: 500,
      timeoutMsg: 'journey step counter did not reach the final step'
    });
    return stepCounter;
  }

  async captureJourneyDebugState(label) {
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
}

module.exports = new JourneyPage();

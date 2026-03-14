const BasePage = require('./Base.page');

class HomePage extends BasePage {
  get tabJobs() { return $('~tab_jobs'); }
  get tabFeed() { return $('~tab_feed'); }
  get tabJourney() { return $('~tab_journey'); }
  get tabProfile() { return $('~tab_profile'); }
  get searchInput() { return $('~home_search_input'); }
  get notificationButton() { return $('~home_notification_button'); }
  get profileButton() { return $('~home_profile_button'); }
  get notificationsView() { return $('~notifications_view'); }
  get notificationsHeader() { return $('~notifications_header'); }
  get notificationsHeaderTitle() { return $('~notifications_header_title'); }
  get notificationsBackButton() { return $('~notifications_back_button'); }

  async goToJobs() {
    const tab = await this.tabJobs;
    await tab.waitForDisplayed({ timeout: 10000 });
    await tab.click();
    await driver.pause(1000);
  }

  async goToFeed() {
    const tab = await this.tabFeed;
    await tab.waitForDisplayed({ timeout: 10000 });
    await tab.click();
    await driver.pause(1000);
  }

  async goToProfile() {
    const tab = await this.tabProfile;
    await tab.waitForDisplayed({ timeout: 10000 });
    await tab.click();
    await driver.pause(1000);
  }

  async goToJourney() {
    const tab = await this.tabJourney;
    await tab.waitForDisplayed({ timeout: 10000 });
    await tab.click();
    await driver.pause(1000);
  }

  async openNotifications() {
    const selectors = [
      '~notifications_view',
      '~notifications_header',
      '~notifications_header_title',
      '~notifications_back_button',
      '//XCUIElementTypeStaticText[@name="Notifications" or @label="Notifications"]',
      '//XCUIElementTypeStaticText[@name="Notifikasi" or @label="Notifikasi"]',
      '//XCUIElementTypeStaticText[@name="通知" or @label="通知"]',
    ];

    const button = await this.notificationButton;
    await button.waitForDisplayed({ timeout: 10000 });

    const timeoutMs = 25000;
    const intervalMs = 250;
    const reTapEveryMs = 2000;
    const deadline = Date.now() + timeoutMs;
    let lastTapAt = 0;

    while (Date.now() < deadline) {
      if (Date.now() - lastTapAt >= reTapEveryMs) {
        if ((await button.isExisting()) && (await button.isDisplayed())) {
          await button.click();
          lastTapAt = Date.now();
          await driver.pause(350);
        }
      }

      for (const selector of selectors) {
        const element = await $(selector);
        if ((await element.isExisting()) && (await element.isDisplayed())) {
          return element;
        }
      }

      // Fallback: toolbar buttons disappear when a new stacked screen is opened.
      const homeNotification = await this.notificationButton;
      const homeProfile = await this.profileButton;
      const tabFeed = await this.tabFeed;
      const transitionedAwayFromHome =
        !(await homeNotification.isExisting()) &&
        !(await homeProfile.isExisting()) &&
        (await tabFeed.isExisting());
      if (transitionedAwayFromHome) {
        return tabFeed;
      }

      if (driver.isIOS) {
        const possibleAlertButtons = [
          '//XCUIElementTypeButton[@name="Allow" or @label="Allow"]',
          '//XCUIElementTypeButton[@name="Izinkan" or @label="Izinkan"]',
          '//XCUIElementTypeButton[@name="OK" or @label="OK"]',
          '//XCUIElementTypeButton[@name="Don’t Allow" or @label="Don’t Allow"]',
          '//XCUIElementTypeButton[@name="Jangan Izinkan" or @label="Jangan Izinkan"]',
        ];
        for (const selector of possibleAlertButtons) {
          const alertButton = await $(selector);
          if ((await alertButton.isExisting()) && (await alertButton.isDisplayed())) {
            await alertButton.click();
            await driver.pause(600);
            break;
          }
        }
      }

      await driver.pause(intervalMs);
    }

    const pageSource = await driver.getPageSource();
    const screenshotB64 = await driver.takeScreenshot();
    await browser.saveScreenshot('/tmp/wdio-notifications-timeout.png');
    await browser.pause(50);
    throw new Error(`Notifications screen did not appear after tapping notification button. Debug source head: ${pageSource.slice(0, 1000)} | screenshot: /tmp/wdio-notifications-timeout.png | screenshotB64Prefix: ${screenshotB64.slice(0, 32)}`);
  }
}

module.exports = new HomePage();

class BasePage {
  async waitForVisible(selector, timeout = 20000) {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout });
    return el;
  }

  async findVisibleWithSwipe(selector, { maxSwipes = 5, pauseMs = 400, direction = 'up' } = {}) {
    for (let index = 0; index <= maxSwipes; index += 1) {
      const elements = await $$(selector);
      if (elements.length > 0) {
        const element = elements[0];
        if (await element.isDisplayed()) {
          return element;
        }
      }

      if (index < maxSwipes) {
        await driver.execute('mobile: swipe', { direction });
        await driver.pause(pauseMs);
      }
    }

    throw new Error(`element (${selector}) still not displayed after ${maxSwipes} swipe attempts`);
  }
}

module.exports = BasePage;

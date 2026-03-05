class BasePage {
  async waitForVisible(selector, timeout = 20000) {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout });
    return el;
  }
}

module.exports = BasePage;

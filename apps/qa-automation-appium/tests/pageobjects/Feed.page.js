const BasePage = require('./Base.page');

class FeedPage extends BasePage {
  get headerTitle() { return $('~feed_header_title'); }
  get feedList() { return $('~feed_list'); }
  get articleDetailView() { return $('~article_detail_view'); }
  get articleBackButton() { return $('~article_detail_back_button'); }
  get articleSaveButton() { return $('~article_detail_save_button'); }
  get articleShareButton() { return $('~article_detail_share_button'); }

  feedItem(id) { return $(`~feed_item_${id}`); }
  feedSaveButton(id) { return $(`~feed_item_save_${id}`); }

  async openFirstFeedItem() {
    const byKnownId = await this.feedItem('f1');
    if (await byKnownId.isExisting()) {
      await byKnownId.waitForDisplayed({ timeout: 20000 });
      await byKnownId.click();
      return;
    }

    const items = await $$('//*[starts-with(@name, "feed_item_") and not(starts-with(@name, "feed_item_save_"))]');
    if (items.length === 0) {
      throw new Error('No feed items found');
    }
    await items[0].waitForDisplayed({ timeout: 20000 });
    await items[0].click();
  }

  async toggleSaveFirstFeedItem() {
    const byKnownId = await this.feedSaveButton('f1');
    if (await byKnownId.isExisting()) {
      await byKnownId.waitForDisplayed({ timeout: 15000 });
      await byKnownId.click();
      return byKnownId;
    }

    const buttons = await $$('//*[starts-with(@name, "feed_item_save_")]');
    if (buttons.length === 0) {
      throw new Error('No feed save buttons found');
    }
    await buttons[0].waitForDisplayed({ timeout: 15000 });
    await buttons[0].click();
    return buttons[0];
  }

  async goBackFromArticleDetail() {
    const byKnownId = await this.articleBackButton;
    if (await byKnownId.isExisting()) {
      await byKnownId.waitForDisplayed({ timeout: 10000 });
      await byKnownId.click();
      return;
    }

    const candidates = await $$(
      '//XCUIElementTypeButton[@name="arrow.left" or @label="arrow.left" or contains(@name, "Back") or contains(@label, "Back")]'
    );
    if (candidates.length === 0) {
      throw new Error('No article detail back button found');
    }
    await candidates[0].waitForDisplayed({ timeout: 10000 });
    await candidates[0].click();
  }

  async tapArticleShare() {
    const byKnownId = await this.articleShareButton;
    if (await byKnownId.isExisting()) {
      await byKnownId.waitForDisplayed({ timeout: 10000 });
      await byKnownId.click();
      return;
    }

    const candidates = await $$(
      '//XCUIElementTypeButton[@name="square.and.arrow.up" or @label="square.and.arrow.up"]'
    );
    if (candidates.length === 0) {
      throw new Error('No article detail share button found');
    }
    await candidates[0].waitForDisplayed({ timeout: 10000 });
    await candidates[0].click();
  }

  async tapArticleSave() {
    const byKnownId = await this.articleSaveButton;
    if (await byKnownId.isExisting()) {
      await byKnownId.waitForDisplayed({ timeout: 10000 });
      await byKnownId.click();
      return;
    }

    const candidates = await $$(
      '//XCUIElementTypeButton[@name="bookmark" or @label="bookmark" or @name="bookmark.fill" or @label="bookmark.fill"]'
    );
    if (candidates.length === 0) {
      throw new Error('No article detail save button found');
    }
    await candidates[0].waitForDisplayed({ timeout: 10000 });
    await candidates[0].click();
  }
}

module.exports = new FeedPage();

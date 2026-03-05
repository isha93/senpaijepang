const BasePage = require('./Base.page');

class FeedPage extends BasePage {
  get feedList() { return $('~feed_list'); }
}

module.exports = new FeedPage();

const BasePage = require('./Base.page');

class HomePage extends BasePage {
  get tabHome() { return $('~tab_home'); }
  get tabJobs() { return $('~tab_jobs'); }
  get tabFeed() { return $('~tab_feed'); }
  get tabProfile() { return $('~tab_profile'); }
  get searchInput() { return $('~home_search_input'); }

  async goToJobs() { await this.tabJobs.click(); }
  async goToFeed() { await this.tabFeed.click(); }
  async goToProfile() { await this.tabProfile.click(); }
}

module.exports = new HomePage();

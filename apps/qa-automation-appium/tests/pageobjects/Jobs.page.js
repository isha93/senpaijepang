const BasePage = require('./Base.page');

class JobsPage extends BasePage {
  get jobsList() { return $('~jobs_list'); }
  get firstJobCard() { return $('~job_card_0'); }

  async openFirstJob() { await this.firstJobCard.click(); }
}

module.exports = new JobsPage();

const BasePage = require('./Base.page');

class JobsPage extends BasePage {
  get jobsList() { return $('~jobs_list'); }
  get firstJobCard() { return $('~job_card_0'); }
  get jobDetailTitle() { return $('~job_detail_title'); }
  get applyButton() { return $('~job_apply_button'); }
  get saveButton() { return $('~job_save_button'); }
  get jobApplicationView() { return $('~job_application_view'); }
  get jobApplicationPrimaryButton() { return $('~job_application_primary_button'); }
  get jobApplicationCoverLetterInput() { return $('~job_application_cover_letter_input'); }
  get jobApplicationSuccessTitle() { return $('~job_application_success_title'); }

  async waitForJobsList(timeout = 30000) {
    const list = await this.jobsList;
    await list.waitForDisplayed({ timeout });
    return list;
  }

  async openFirstJob() {
    const card = await this.firstJobCard;
    await card.waitForDisplayed({ timeout: 30000 });
    await card.click();
    await driver.pause(2000);
  }

  async waitForJobDetail(timeout = 30000) {
    const saveBtn = await this.saveButton;
    await saveBtn.waitForDisplayed({ timeout });
    return saveBtn;
  }

  async openApplyFlow() {
    const applyBtn = await this.applyButton;
    await applyBtn.waitForDisplayed({ timeout: 20000 });
    await applyBtn.click();
    const view = await this.jobApplicationView;
    await view.waitForDisplayed({ timeout: 20000 });
    return view;
  }
}

module.exports = new JobsPage();

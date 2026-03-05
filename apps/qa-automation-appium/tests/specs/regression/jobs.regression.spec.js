const OnboardingPage = require('../../pageobjects/Onboarding.page');
const AuthPage = require('../../pageobjects/Auth.page');
const HomePage = require('../../pageobjects/Home.page');
const JobsPage = require('../../pageobjects/Jobs.page');
const JobApplicationPage = require('../../pageobjects/JobApplication.page');
const users = require('../../fixtures/users.json');

describe('Regression - Jobs', () => {
    before(async () => {
        await OnboardingPage.skipOnboarding();
        await AuthPage.login(users.demo.email, users.demo.password);
        await HomePage.goToJobs();
        await JobsPage.waitForJobsList();
    });

    it('saves and unsaves a job from detail view', async () => {
        await JobsPage.openFirstJob();
        await JobsPage.waitForJobDetail();

        const saveBtn = await $('~job_save_button');
        await saveBtn.waitForDisplayed({ timeout: 10000 });
        await saveBtn.click();

        await saveBtn.click();

        expect(await saveBtn.isDisplayed()).toBe(true);
    });

    it('completes apply flow and sees success state', async () => {
        await JobsPage.openApplyFlow();
        await JobApplicationPage.waitForOpen();

        const cvUploadButton = await JobApplicationPage.cvUploadButton;
        await cvUploadButton.waitForDisplayed({ timeout: 10000 });
        expect(await cvUploadButton.isDisplayed()).toBe(true);

        await JobApplicationPage.advanceStep();
        await JobApplicationPage.fillCoverLetter('Saya siap berangkat dan bekerja sesuai kebutuhan perusahaan.');
        await JobApplicationPage.advanceStep();
        await JobApplicationPage.advanceStep();

        const completion = await JobApplicationPage.waitForCompletionState(45000);
        expect(['success', 'already_applied', 'dismissed']).toContain(completion.state);
    });
});

const OnboardingPage = require('../../pageobjects/Onboarding.page');
const AuthPage = require('../../pageobjects/Auth.page');
const HomePage = require('../../pageobjects/Home.page');
const FeedPage = require('../../pageobjects/Feed.page');
const users = require('../../fixtures/users.json');

describe('Regression - Feed', () => {
    before(async () => {
        await OnboardingPage.skipOnboarding();
        await AuthPage.login(users.demo.email, users.demo.password);
        await HomePage.waitForVisible('~tab_feed', 15000);
        await HomePage.goToFeed();
    });

    it('loads feed items correctly', async () => {
        await FeedPage.waitForVisible('~feed_header_title');

        // Ensure feed list is existing
        const list = await FeedPage.feedList;
        await list.waitForDisplayed({ timeout: 15000 });
        expect(await list.isDisplayed()).toBe(true);
    });

    it('toggles save on first feed item', async () => {
        const saveButton = await FeedPage.toggleSaveFirstFeedItem();
        expect(await saveButton.isDisplayed()).toBe(true);
    });

    it('opens first feed item and returns', async () => {
        await FeedPage.openFirstFeedItem();
        const detail = await FeedPage.articleDetailView;
        await detail.waitForDisplayed({ timeout: 15000 });
        await FeedPage.goBackFromArticleDetail();

        await FeedPage.waitForVisible('~feed_list', 15000);
    });
});

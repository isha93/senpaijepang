describe('Senpai Jepang - Smoke', () => {
  it('launches app and shows home screen (basic)', async () => {
    await driver.pause(3000);
    const feedTab = await $('~tab_feed');
    await feedTab.waitForDisplayed({ timeout: 15000 });
    expect(await feedTab.isDisplayed()).toBe(true);
  });
});

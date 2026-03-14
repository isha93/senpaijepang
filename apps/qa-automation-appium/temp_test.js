const { remote } = require('webdriverio');

async function main() {
    const driver = await remote({
        path: '/',
        port: 4723,
        capabilities: {
            platformName: 'iOS',
            'appium:automationName': 'XCUITest',
            'appium:app': '/Users/ichsan/Documents/senpaijepang/apps/mobile-ios/build/Build/Products/Debug-iphonesimulator/SenpaiJepang.app'
        }
    });

    const btn = await driver.$('~registration_create_account_button');
    console.log("Create Account btn:", btn);

    const source = await driver.getPageSource();

    const fs = require('fs');
    fs.writeFileSync('page_source.xml', source);
    console.log("Saved page source to page_source.xml");

    await driver.deleteSession();
}

main().catch(console.error);

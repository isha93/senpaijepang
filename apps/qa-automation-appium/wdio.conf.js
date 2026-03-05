const path = require('path');

const PLATFORM = (process.env.PLATFORM || 'ios').toLowerCase();
const IOS_APP_PATH = process.env.IOS_APP_PATH || path.resolve(__dirname, 'apps/ios/SenpaiJepang.app');
const ANDROID_APP_PATH = process.env.ANDROID_APP_PATH || path.resolve(__dirname, 'apps/android/SenpaiJepang.apk');

const isIOS = PLATFORM === 'ios';

exports.config = {
  runner: 'local',
  port: 4723,
  path: '/',
  specs: ['./tests/specs/smoke/**/*.spec.js'],
  maxInstances: 1,
  logLevel: 'info',
  waitforTimeout: 20000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 2,
  framework: 'mocha',
  reporters: ['spec'],
  services: [['appium', { command: 'appium', args: { address: '127.0.0.1', port: 4723 } }]],
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000
  },
  capabilities: [
    isIOS
      ? {
        platformName: 'iOS',
        'appium:automationName': 'XCUITest',
        'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone 15',
        'appium:platformVersion': process.env.IOS_PLATFORM_VERSION || '17.5',
        'appium:app': IOS_APP_PATH,
        'appium:noReset': false,
        'appium:newCommandTimeout': 120
      }
      : {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
        'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION || '14',
        'appium:app': ANDROID_APP_PATH,
        'appium:noReset': false,
        'appium:newCommandTimeout': 120
      }
  ]
};

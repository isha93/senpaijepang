const path = require('path');
const { execSync } = require('child_process');

const PLATFORM = (process.env.PLATFORM || 'ios').toLowerCase();
const IOS_APP_PATH = process.env.IOS_APP_PATH || path.resolve(__dirname, 'apps/ios/SenpaiJepang.app');
const ANDROID_APP_PATH = process.env.ANDROID_APP_PATH || path.resolve(__dirname, 'apps/android/SenpaiJepang.apk');
const IOS_PLATFORM_VERSION = process.env.IOS_PLATFORM_VERSION || detectLatestIOSRuntimeVersion() || '18.4';

const isIOS = PLATFORM === 'ios';

function compareVersion(left, right) {
  const leftParts = String(left).split('.').map((part) => Number(part) || 0);
  const rightParts = String(right).split('.').map((part) => Number(part) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }
  return 0;
}

function detectLatestIOSRuntimeVersion() {
  try {
    const result = execSync('xcrun simctl list runtimes --json', {
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString();
    const payload = JSON.parse(result);
    const versions = (payload.runtimes || [])
      .filter((runtime) => String(runtime.platform || '').toLowerCase() === 'ios')
      .filter((runtime) => runtime.isAvailable !== false)
      .map((runtime) => String(runtime.version || '').trim())
      .filter(Boolean)
      .sort((left, right) => compareVersion(right, left));
    return versions[0] || null;
  } catch (_error) {
    return null;
  }
}

exports.config = {
  runner: 'local',
  port: 4723,
  path: '/',
  specs: ['./tests/specs/**/*.spec.js'],
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
    timeout: 180000
  },
  capabilities: [
    isIOS
      ? {
        platformName: 'iOS',
        'appium:automationName': 'XCUITest',
        'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone 15',
        'appium:platformVersion': IOS_PLATFORM_VERSION,
        'appium:app': IOS_APP_PATH,
        'appium:noReset': false,
        'appium:newCommandTimeout': 120,
        'wdio:maxInstances': 1
      }
      : {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
        'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION || '14',
        'appium:app': ANDROID_APP_PATH,
        'appium:noReset': false,
        'appium:newCommandTimeout': 120,
        'wdio:maxInstances': 1
      }
  ]
};

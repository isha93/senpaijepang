const path = require('path');
const fs = require('fs');
const { execSync, execFileSync, spawn } = require('child_process');

const PLATFORM = (process.env.PLATFORM || 'ios').toLowerCase();
const IOS_APP_PATH = process.env.IOS_APP_PATH || path.resolve(__dirname, 'apps/ios/SenpaiJepang.app');
const ANDROID_APP_PATH = process.env.ANDROID_APP_PATH || path.resolve(__dirname, 'apps/android/SenpaiJepang.apk');
const IOS_PLATFORM_VERSION = process.env.IOS_PLATFORM_VERSION || detectLatestIOSRuntimeVersion() || '18.4';

const isIOS = PLATFORM === 'ios';
const RECORD_VIDEO_MODE = String(process.env.APPIUM_RECORD_VIDEO || 'failed').toLowerCase();
const RECORD_VIDEO_ENABLED = ['failed', 'all'].includes(RECORD_VIDEO_MODE);
const VIDEO_ROOT_DIR = process.env.APPIUM_VIDEO_DIR || path.resolve(__dirname, 'reports/videos');
const VIDEO_RUN_ID = process.env.APPIUM_VIDEO_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-');

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeForFilename(value) {
  return String(value || 'unnamed')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'unnamed';
}

function buildSpecLabel(specs) {
  const firstSpec = Array.isArray(specs) && specs.length > 0 ? specs[0] : 'session';
  const baseName = path.basename(firstSpec).replace(/\.[^.]+$/, '');
  return sanitizeForFilename(baseName);
}

function getBootedIOSUdid() {
  try {
    const output = execSync('xcrun simctl list devices', {
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString();
    const match = output.match(/\(([0-9A-F-]{36})\)\s+\(Booted\)/);
    return match?.[1] || null;
  } catch (_error) {
    return null;
  }
}

function getFirstAndroidDeviceId() {
  try {
    const output = execFileSync('adb', ['devices'], {
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString();
    const lines = output.split('\n').map((line) => line.trim());
    const deviceLine = lines.find((line) => /\tdevice$/.test(line));
    return deviceLine?.split('\t')[0] || null;
  } catch (_error) {
    return null;
  }
}

async function stopRecordingProcess(recordingProcess) {
  if (!recordingProcess || recordingProcess.killed) return;

  await new Promise((resolve) => {
    let settled = false;
    const finalize = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    recordingProcess.once('exit', finalize);
    recordingProcess.once('close', finalize);

    try {
      recordingProcess.kill('SIGINT');
    } catch (_error) {
      finalize();
      return;
    }

    setTimeout(() => {
      try {
        if (!recordingProcess.killed) recordingProcess.kill('SIGKILL');
      } catch (_error) {
        // ignore cleanup errors
      }
      finalize();
    }, 4000);
  });
}

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
  before: async function (capabilities, specs) {
    if (!RECORD_VIDEO_ENABLED) {
      return;
    }

    const platformName = sanitizeForFilename(String(capabilities.platformName || PLATFORM).toLowerCase());
    const outDir = path.resolve(VIDEO_ROOT_DIR, platformName, VIDEO_RUN_ID);
    ensureDirectory(outDir);

    const specLabel = buildSpecLabel(specs);
    const sessionLabel = sanitizeForFilename(browser.sessionId || 'session');
    const filePath = path.resolve(outDir, `${specLabel}__${sessionLabel}.mp4`);

    if (platformName === 'ios') {
      const udid = capabilities['appium:udid'] || capabilities.udid || getBootedIOSUdid();
      if (!udid) return;

      const processRef = spawn('xcrun', ['simctl', 'io', String(udid), 'recordVideo', filePath], {
        stdio: 'ignore'
      });
      browser.__externalVideoRecording = {
        platformName,
        filePath,
        process: processRef
      };
      return;
    }

    if (platformName === 'android') {
      const deviceId = capabilities['appium:udid'] || capabilities.udid || getFirstAndroidDeviceId();
      if (!deviceId) return;

      const remotePath = `/sdcard/${sessionLabel}.mp4`;
      const processRef = spawn('adb', ['-s', String(deviceId), 'shell', 'screenrecord', '--time-limit', '1800', remotePath], {
        stdio: 'ignore'
      });
      browser.__externalVideoRecording = {
        platformName,
        filePath,
        process: processRef,
        deviceId: String(deviceId),
        remotePath
      };
    }
  },
  after: async function (result) {
    if (!RECORD_VIDEO_ENABLED) {
      return;
    }

    const videoRecording = browser.__externalVideoRecording;
    if (!videoRecording) {
      return;
    }

    await stopRecordingProcess(videoRecording.process);

    if (videoRecording.platformName === 'android' && videoRecording.deviceId && videoRecording.remotePath) {
      try {
        execFileSync('adb', ['-s', videoRecording.deviceId, 'pull', videoRecording.remotePath, videoRecording.filePath], {
          stdio: ['ignore', 'ignore', 'ignore']
        });
      } catch (_error) {
        // ignore pull errors to keep run stable
      } finally {
        try {
          execFileSync('adb', ['-s', videoRecording.deviceId, 'shell', 'rm', '-f', videoRecording.remotePath], {
            stdio: ['ignore', 'ignore', 'ignore']
          });
        } catch (_error) {
          // ignore cleanup errors
        }
      }
    }

    const shouldKeep = RECORD_VIDEO_MODE === 'all' || Number(result) > 0;
    if (!shouldKeep) {
      try {
        fs.unlinkSync(videoRecording.filePath);
      } catch (_error) {
        // ignore delete errors
      }
      return;
    }

    console.log(`[video] saved: ${videoRecording.filePath}`);
  },
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

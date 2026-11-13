#!/usr/bin/env node

const {spawnSync} = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const gradleCommand = isWindows ? 'gradlew.bat' : './gradlew';
const result = spawnSync(
  gradleCommand,
  ['clean', 'assembleRelease', '--no-daemon'],
  {
    cwd: path.join(__dirname, '..', 'android'),
    stdio: 'inherit',
    shell: isWindows,
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

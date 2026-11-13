#!/usr/bin/env node
/**
 * Single source of truth: version.json
 * Syncs package.json, Android versionName/versionCode, iOS MARKETING_VERSION / CURRENT_PROJECT_VERSION.
 *
 * Usage:
 *   node scripts/sync-version.js              # apply version.json → platforms
 *   node scripts/sync-version.js set 1.2.0    # set version, bump versionCode, sync
 *   node scripts/sync-version.js bump patch   # bump semver (patch|minor|major), bump versionCode, sync
 *
 * CodePush / Revopush: release against the same binary version (package.json + native).
 *   yarn code-push:prodAndroid
 *   yarn code-push:prod
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const versionPath = path.join(root, 'version.json');
const packagePath = path.join(root, 'package.json');
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
const pbxPath = path.join(root, 'ios', 'Reeplay.xcodeproj', 'project.pbxproj');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

function parseSemver(v) {
  const m = String(v).trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) {
    throw new Error(`Invalid semver "${v}" (expected x.y.z)`);
  }
  return {major: +m[1], minor: +m[2], patch: +m[3]};
}

function formatSemver({major, minor, patch}) {
  return `${major}.${minor}.${patch}`;
}

function bumpSemver(version, kind) {
  const s = parseSemver(version);
  if (kind === 'major') {
    s.major += 1;
    s.minor = 0;
    s.patch = 0;
  } else if (kind === 'minor') {
    s.minor += 1;
    s.patch = 0;
  } else if (kind === 'patch') {
    s.patch += 1;
  } else {
    throw new Error(`Unknown bump kind "${kind}" (use patch|minor|major)`);
  }
  return formatSemver(s);
}

function syncPlatforms(version, versionCode) {
  parseSemver(version);
  if (!Number.isInteger(versionCode) || versionCode < 1) {
    throw new Error(`Invalid versionCode "${versionCode}"`);
  }

  const pkg = readJson(packagePath);
  pkg.version = version;
  writeJson(packagePath, pkg);

  let gradle = fs.readFileSync(gradlePath, 'utf8');
  if (!/versionCode\s+\d+/.test(gradle) || !/versionName\s+"[^"]+"/.test(gradle)) {
    throw new Error(
      'Could not find versionCode/versionName in android/app/build.gradle',
    );
  }
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);
  fs.writeFileSync(gradlePath, gradle);

  let pbx = fs.readFileSync(pbxPath, 'utf8');
  if (!/MARKETING_VERSION = /.test(pbx) || !/CURRENT_PROJECT_VERSION = /.test(pbx)) {
    throw new Error(
      'Could not find MARKETING_VERSION/CURRENT_PROJECT_VERSION in iOS pbxproj',
    );
  }
  pbx = pbx.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
  pbx = pbx.replace(
    /CURRENT_PROJECT_VERSION = [^;]+;/g,
    `CURRENT_PROJECT_VERSION = ${versionCode};`,
  );
  fs.writeFileSync(pbxPath, pbx);

  console.log(
    `Synced version ${version} (code ${versionCode}) → package.json, Android, iOS`,
  );
}

function main() {
  const [, , cmd, arg] = process.argv;
  let data = readJson(versionPath);

  if (cmd === 'set') {
    if (!arg) {
      throw new Error('Usage: sync-version.js set x.y.z');
    }
    parseSemver(arg);
    data = {
      ...data,
      version: arg,
      versionCode: Number(data.versionCode || 0) + 1,
    };
    writeJson(versionPath, data);
  } else if (cmd === 'bump') {
    const kind = arg || 'patch';
    data = {
      ...data,
      version: bumpSemver(data.version, kind),
      versionCode: Number(data.versionCode || 0) + 1,
    };
    writeJson(versionPath, data);
  } else if (cmd) {
    throw new Error(`Unknown command "${cmd}". Use set|bump or no args to sync.`);
  }

  syncPlatforms(data.version, data.versionCode);
}

main();

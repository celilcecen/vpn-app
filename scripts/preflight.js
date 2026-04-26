#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = process.cwd();
const checks = [];

function ok(name, details) {
  checks.push({ status: 'ok', name, details });
}

function warn(name, details) {
  checks.push({ status: 'warn', name, details });
}

function fail(name, details) {
  checks.push({ status: 'fail', name, details });
}

function readJson(relativePath) {
  const abs = path.join(root, relativePath);
  const content = fs.readFileSync(abs, 'utf8');
  return JSON.parse(content);
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function checkCommand(command) {
  try {
    const out = execSync(command, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: String(e.message || e) };
  }
}

function parseEnvFile(filePath) {
  const env = {};
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  }
  return env;
}

function main() {
  // app.json checks
  let app;
  try {
    app = readJson('app.json');
    ok('app.json exists', 'Loaded successfully');
  } catch (e) {
    fail('app.json exists', `Cannot parse app.json: ${e.message}`);
    return printAndExit();
  }

  const expo = app.expo || {};
  const ios = expo.ios || {};
  const plugins = expo.plugins || [];
  const iosBundle = ios.bundleIdentifier;
  const teamId = ios.appleTeamId;
  if (iosBundle && iosBundle !== 'com.vpn.app') {
    ok('iOS bundle identifier', iosBundle);
  } else {
    fail('iOS bundle identifier', 'Set a unique bundle identifier in app.json');
  }
  if (teamId) {
    ok('ios.appleTeamId', teamId);
  } else {
    warn('ios.appleTeamId', 'Missing; Apple targets plugin may fail in CI/build');
  }

  if (plugins.includes('react-native-wireguard-vpn')) {
    ok('react-native-wireguard-vpn plugin', 'Configured');
  } else {
    fail('react-native-wireguard-vpn plugin', 'Missing in app.json plugins');
  }
  if (plugins.includes('@bacons/apple-targets')) {
    ok('@bacons/apple-targets plugin', 'Configured');
  } else {
    fail('@bacons/apple-targets plugin', 'Missing in app.json plugins');
  }

  // target files
  if (exists('targets/network-packet-tunnel/expo-target.config.js')) {
    ok('Packet tunnel target config', 'targets/network-packet-tunnel/expo-target.config.js');
  } else {
    fail('Packet tunnel target config', 'Missing expo target config file');
  }
  if (exists('targets/network-packet-tunnel/PacketTunnelProvider.swift')) {
    ok('PacketTunnelProvider.swift', 'Extension entrypoint file exists');
  } else {
    fail('PacketTunnelProvider.swift', 'Missing packet tunnel provider file');
  }

  // backend env checks
  const backendEnvPath = path.join(root, 'backend/.env');
  if (!fs.existsSync(backendEnvPath)) {
    fail('backend/.env', 'Missing backend/.env. Copy from backend/.env.example');
  } else {
    ok('backend/.env', 'Found');
    const env = parseEnvFile(backendEnvPath);
    const required = [
      'JWT_SECRET',
      'DATABASE_URL',
      'ADMIN_SETUP_TOKEN',
      'BILLING_WEBHOOK_SECRET',
      'WG_RUNTIME_ENABLED',
      'WG_INTERFACE',
      'WG_BIN',
    ];
    for (const key of required) {
      if (env[key]) ok(`env:${key}`, 'set');
      else fail(`env:${key}`, 'missing');
    }
  }

  // local machine/tooling checks
  const wg = checkCommand('wg --version');
  if (wg.ok) ok('wg binary', wg.out.split('\n')[0]);
  else warn('wg binary', 'Not available on this machine (required on VPN server host)');

  const psql = checkCommand('psql --version');
  if (psql.ok) ok('psql client', psql.out.split('\n')[0]);
  else warn('psql client', 'Not available on this machine');

  const xcode = checkCommand('xcodebuild -version');
  if (xcode.ok) ok('xcodebuild', xcode.out.split('\n')[0]);
  else warn('xcodebuild', 'Not available. iOS native wiring must run on macOS + Xcode');

  printAndExit();
}

function printAndExit() {
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const okCount = checks.filter((c) => c.status === 'ok').length;

  for (const c of checks) {
    const icon = c.status === 'ok' ? 'OK  ' : c.status === 'warn' ? 'WARN' : 'FAIL';
    console.log(`[${icon}] ${c.name} - ${c.details}`);
  }

  console.log('\nSummary:', { ok: okCount, warn: warnCount, fail: failCount });
  if (failCount > 0) {
    process.exitCode = 1;
  }
}

main();

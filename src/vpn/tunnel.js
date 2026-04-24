/**
 * VPN tüneli — wireguard-native-bridge (Expo native modülü).
 * Expo Go’da modül yoktur; gerçek bağlantı için: npx expo prebuild && npx expo run:ios|android
 */
import { Platform } from 'react-native';

let WG = null;
let legacyWG = null;
let initialized = false;
try {
  WG = require('react-native-wireguard-vpn')?.default || null;
} catch (_) {
  WG = null;
}
try {
  legacyWG = require('wireguard-native-bridge');
} catch (_) {
  legacyWG = null;
}

function parseWireGuardConfig(configString) {
  const lines = String(configString || '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter((x) => x && !x.startsWith('#'));

  let section = '';
  const iface = {};
  const peer = {};
  for (const line of lines) {
    if (line.startsWith('[') && line.endsWith(']')) {
      section = line.slice(1, -1).toLowerCase();
      continue;
    }
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (section === 'interface') iface[key] = value;
    if (section === 'peer') peer[key] = value;
  }
  if (!iface.privatekey || !peer.publickey || !peer.endpoint) {
    throw new Error('WireGuard config eksik veya gecersiz');
  }
  const [serverAddress, serverPortRaw] = peer.endpoint.split(':');
  const serverPort = Number(serverPortRaw || 51820);
  if (!serverAddress || Number.isNaN(serverPort)) {
    throw new Error('WireGuard endpoint gecersiz');
  }
  return {
    privateKey: iface.privatekey,
    publicKey: peer.publickey,
    presharedKey: peer.presharedkey || undefined,
    serverAddress,
    serverPort,
    address: iface.address || '10.64.0.1/32',
    allowedIPs: String(peer.allowedips || '0.0.0.0/0, ::/0')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    dns: String(iface.dns || '1.1.1.1')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    mtu: Number(iface.mtu || 1280),
  };
}

export async function prepare() {
  if (WG && typeof WG.initialize === 'function') {
    await WG.initialize();
    initialized = true;
    return;
  }
  if (legacyWG && typeof legacyWG.prepareVPN === 'function') {
    if (Platform.OS === 'android') await legacyWG.prepareVPN();
    return;
  }
  throw new Error('NATIVE_MODULE_MISSING');
}

export async function connect(configString) {
  try {
    if (WG && typeof WG.connect === 'function') {
      if (!initialized && typeof WG.initialize === 'function') {
        await WG.initialize();
        initialized = true;
      }
      const parsed = parseWireGuardConfig(configString);
      await WG.connect(parsed);
      return;
    }
    if (legacyWG && typeof legacyWG.startTunnel === 'function') {
      await legacyWG.startTunnel(configString);
      return;
    }
    throw new Error('NATIVE_MODULE_MISSING');
  } catch (e) {
    const msg = String((e && e.message) || e || '');
    if (
      msg === 'NATIVE_MODULE_MISSING' ||
      /undefined is not a function/i.test(msg) ||
      /doesn't seem to be linked|TurboModuleRegistry|Native module.*[Ww]ireguard|Unimplemented component|cannot find native module/i.test(
        msg
      )
    ) {
      throw new Error('NATIVE_MODULE_MISSING');
    }
    throw e;
  }
}

export async function disconnect() {
  try {
    if (WG && typeof WG.disconnect === 'function') {
      await WG.disconnect();
      return;
    }
    if (legacyWG && typeof legacyWG.stopTunnel === 'function') {
      await legacyWG.stopTunnel();
    }
  } catch (_) {
    // no-op
  }
}

export function isNativeAvailable() {
  const hasNew = !!WG && typeof WG.connect === 'function';
  const hasLegacy = !!legacyWG && typeof legacyWG.startTunnel === 'function';
  return hasNew || hasLegacy;
}

export async function getStatus() {
  try {
    if (WG && typeof WG.getStatus === 'function') {
      const state = await WG.getStatus();
      const tunnelState = String(state?.tunnelState || state?.status || 'UNKNOWN').toUpperCase();
      if (tunnelState === 'ACTIVE') return 'UP';
      if (tunnelState === 'INACTIVE') return 'DOWN';
      return tunnelState;
    }
    if (legacyWG && typeof legacyWG.getTunnelStatus === 'function') {
      const state = await legacyWG.getTunnelStatus();
      return String(state || 'UNKNOWN').toUpperCase();
    }
    return 'UNKNOWN';
  } catch (_) {
    return 'UNKNOWN';
  }
}

export async function waitUntilUp(timeoutMs = 12000, intervalMs = 500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getStatus();
    if (status === 'UP' || status === 'CONNECTED') return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

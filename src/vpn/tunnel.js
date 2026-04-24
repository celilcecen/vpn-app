/**
 * VPN tüneli — wireguard-native-bridge (Expo native modülü).
 * Expo Go’da modül yoktur; gerçek bağlantı için: npx expo prebuild && npx expo run:ios|android
 */
import { Platform } from 'react-native';

let WG = null;
try {
  WG = require('wireguard-native-bridge');
} catch (_) {
  WG = null;
}

export async function prepare() {
  if (!WG || typeof WG.prepareVPN !== 'function') {
    throw new Error('NATIVE_MODULE_MISSING');
  }
  if (Platform.OS === 'android') {
    await WG.prepareVPN();
  }
}

export async function connect(configString) {
  if (!WG || typeof WG.startTunnel !== 'function') {
    throw new Error('NATIVE_MODULE_MISSING');
  }
  try {
    await WG.startTunnel(configString);
  } catch (e) {
    const msg = String((e && e.message) || e || '');
    if (
      msg === 'NATIVE_MODULE_MISSING' ||
      /undefined is not a function/i.test(msg) ||
      /TurboModuleRegistry|Native module.*[Ww]ireguard|Unimplemented component|cannot find native module/i.test(
        msg
      )
    ) {
      throw new Error('NATIVE_MODULE_MISSING');
    }
    throw e;
  }
}

export async function disconnect() {
  if (WG && WG.stopTunnel) {
    try {
      await WG.stopTunnel();
    } catch (_) {}
  }
}

export function isNativeAvailable() {
  return !!WG && typeof WG.startTunnel === 'function';
}

export async function getStatus() {
  if (!WG || typeof WG.getTunnelStatus !== 'function') return 'UNKNOWN';
  try {
    const state = await WG.getTunnelStatus();
    return String(state || 'UNKNOWN').toUpperCase();
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

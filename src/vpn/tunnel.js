/**
 * VPN tüneli - wireguard-native-bridge kullanır.
 * Expo Go'da native modül yok; development build gerekir (npx expo prebuild && npx expo run:android)
 */
let WG = null;
try {
  WG = require('wireguard-native-bridge');
} catch (_) {
  WG = null;
}

export async function prepare() {
  if (!WG) throw new Error('NATIVE_MODULE_MISSING');
  try {
    await WG.prepareVPN();
  } catch (_) {}
}

export async function connect(configString) {
  if (!WG || !WG.startTunnel) throw new Error('NATIVE_MODULE_MISSING');
  try {
    await WG.startTunnel(configString);
  } catch (e) {
    const msg = (e && e.message) || '';
    if (msg.includes('null') || msg.includes('not found') || msg.includes('Native')) {
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
  return !!WG && !!WG.startTunnel;
}

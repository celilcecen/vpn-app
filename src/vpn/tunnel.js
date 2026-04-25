/**
 * VPN tüneli — react-native-wireguard-vpn (+ wireguard-native-bridge yedek).
 */
import { NativeModules, Platform } from 'react-native';

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

function splitKeyValue(line) {
  const eq = line.indexOf('=');
  if (eq <= 0) return null;
  const key = line
    .slice(0, eq)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  const value = line.slice(eq + 1).trim();
  if (!key) return null;
  return { key, value };
}

function parseEndpointValue(endpoint) {
  const s = String(endpoint || '').trim();
  if (!s) throw new Error('WireGuard endpoint bos');

  const v6 = s.match(/^\[(.+)\]:(\d{1,5})$/);
  if (v6) {
    const port = Number(v6[2]);
    if (!v6[1] || !Number.isFinite(port) || port < 1 || port > 65535) {
      throw new Error('WireGuard endpoint gecersiz');
    }
    return { host: v6[1].trim(), port };
  }

  const colon = s.lastIndexOf(':');
  if (colon <= 0 || colon === s.length - 1) {
    throw new Error('WireGuard endpoint gecersiz (host:port bekleniyor)');
  }
  const host = s.slice(0, colon).trim();
  const port = Number(s.slice(colon + 1).trim());
  if (!host || !Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error('WireGuard endpoint gecersiz');
  }
  return { host, port };
}

/**
 * Sunucudan gelen WireGuard metnini native modülün beklediği düz nesneye çevirir.
 * RN köprüsü için undefined içermez; sayılar tam sayı port olarak gider (Android getInt).
 */
export function parseWireGuardConfig(configString) {
  const text = String(configString || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = text
    .split('\n')
    .map((x) => (x.split('#')[0] ?? '').trim())
    .filter(Boolean);

  let section = '';
  const iface = {};
  const peer = {};

  for (const line of lines) {
    if (line.startsWith('[') && line.endsWith(']')) {
      section = line
        .slice(1, -1)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');
      continue;
    }
    const kv = splitKeyValue(line);
    if (!kv) continue;
    if (section === 'interface') iface[kv.key] = kv.value;
    if (section === 'peer') peer[kv.key] = kv.value;
  }

  if (!iface.privatekey || !peer.publickey || !peer.endpoint) {
    throw new Error('WireGuard config eksik veya gecersiz');
  }

  const { host: serverAddress, port: serverPort } = parseEndpointValue(peer.endpoint);

  let allowedIPs = String(peer.allowedips || '0.0.0.0/0, ::/0')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.replace(/^::0\/0$/i, '::/0'));

  if (!allowedIPs.length) allowedIPs = ['0.0.0.0/0'];

  const dnsRaw = iface.dns ? String(iface.dns) : '1.1.1.1';
  const dns = dnsRaw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const address = String(iface.address || '10.64.0.1/32').trim();
  const mtuRaw = Number(iface.mtu || 1280);
  const mtu = Math.min(65535, Math.max(576, Math.trunc(Number.isFinite(mtuRaw) ? mtuRaw : 1280)));

  const portInt = Math.trunc(Number(serverPort));
  if (!Number.isFinite(portInt) || portInt < 1 || portInt > 65535) {
    throw new Error('Gecersiz sunucu portu');
  }

  const bundle = {
    serverAddress: String(serverAddress).trim(),
    serverPort: portInt,
    endpoint: `${String(serverAddress).trim()}:${portInt}`,
    privateKey: String(iface.privatekey).trim(),
    publicKey: String(peer.publickey).trim(),
    allowedIPs,
    address,
    dns: dns.length ? dns : ['1.1.1.1'],
    mtu,
  };

  if (peer.presharedkey) {
    bundle.presharedKey = String(peer.presharedkey).trim();
  }

  if (!bundle.serverAddress || !bundle.privateKey || !bundle.publicKey) {
    throw new Error('VPN sunucu adresi veya anahtarlar eksik');
  }

  return JSON.parse(JSON.stringify(bundle));
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
      const nativeConfig = parseWireGuardConfig(configString);
      const mod = NativeModules.WireGuardVpnModule;
      const payload = JSON.stringify(nativeConfig);
      if (Platform.OS === 'ios' && mod && typeof mod.connectFromJSON === 'function') {
        try {
          await mod.connectFromJSON(payload);
        } catch (iosErr) {
          await WG.connect(nativeConfig);
        }
      } else {
        await WG.connect(nativeConfig);
      }
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

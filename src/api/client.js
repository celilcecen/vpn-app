import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BASE_URL_KEY = 'vpn.baseUrl';
const DEFAULT_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://api.guardline.online';
let BASE_URL = DEFAULT_BASE_URL.replace(/\/$/, '');
const DEVICE_ID_KEY = 'vpn.deviceId';
const LEGACY_HOSTS = new Set(['35.163.17.141', 'api.guardline.online']);

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export function getBaseUrl() {
  return BASE_URL;
}

function validateBaseUrl(url) {
  const normalized = String(url || '').trim();
  if (!normalized) throw new Error('API adresi boş olamaz');
  const parsed = new URL(normalized);
  const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  const isPrivateIp = /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(parsed.hostname);
  if (parsed.protocol !== 'https:' && !__DEV__ && !isLocalHost && !isPrivateIp) {
    throw new Error('Canlı kullanımda HTTPS API zorunludur');
  }
  return normalized.replace(/\/$/, '');
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e) {
    const err = new Error(e?.message || 'network request failed');
    err.status = 0;
    err.cause = e;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'İstek başarısız');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function makeDeviceId() {
  return `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getOrCreateDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = makeDeviceId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export const api = {
  async login(email, password) {
    return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  async register(email, password) {
    return request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  async forgotPassword(email) {
    return request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  },
  async getServers() {
    return request('/servers');
  },
  async getConfig(serverId, options = {}) {
    const deviceId = await getOrCreateDeviceId();
    const sid = serverId == null || serverId === '' ? serverId : String(serverId);
    return request('/vpn/config', {
      method: 'POST',
      body: JSON.stringify({
        serverId: sid,
        deviceId,
        platform: Platform.OS,
        routeMode: options.routeMode || 'full',
        dnsLeakProtection: options.dnsLeakProtection !== false,
      }),
    });
  },
  async getPlans() {
    return request('/billing/plans');
  },
  async getRuntimeStatus() {
    return request('/setup/runtime');
  },
  async getPeerStatus(publicKey) {
    return request('/vpn/peer-status', {
      method: 'POST',
      body: JSON.stringify({ publicKey }),
    });
  },
  async pingHealth(timeoutMs = 6000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const url = `${BASE_URL}/health?ts=${Date.now()}`;
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' } });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok && !!data.ok };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    } finally {
      clearTimeout(t);
    }
  },
  async getMySubscription() {
    return request('/billing/me');
  },
  async purchasePlan(planId) {
    return request('/billing/purchase', { method: 'POST', body: JSON.stringify({ planId }) });
  },
  async getPublicIpInfo() {
    const ipRes = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipRes.json().catch(() => ({}));
    const ip = ipData.ip || null;
    if (!ip) return { ip: null, country: null, city: null };

    const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
    const geo = await geoRes.json().catch(() => ({}));
    return {
      ip,
      country: geo.country_name || geo.country || null,
      city: geo.city || null,
      countryCode: geo.country_code || null,
    };
  },
};

export async function initApiConfig() {
  try {
    const saved = await AsyncStorage.getItem(BASE_URL_KEY);
    if (!saved) {
      BASE_URL = DEFAULT_BASE_URL.replace(/\/$/, '');
      if (!__DEV__) {
        await AsyncStorage.setItem(BASE_URL_KEY, BASE_URL);
      }
      return;
    }
    const normalized = validateBaseUrl(saved);
    const parsed = new URL(normalized);
    const isLegacyIp = parsed.hostname === '35.163.17.141';
    const isLegacyApiDomain = parsed.hostname === 'api.guardline.online' && parsed.protocol !== 'https:';
    const isLegacyHttp = LEGACY_HOSTS.has(parsed.hostname) && parsed.protocol !== 'https:';
    const mustUseProdApi = !__DEV__ && parsed.hostname !== 'api.guardline.online';
    if (isLegacyIp || isLegacyApiDomain || isLegacyHttp || mustUseProdApi) {
      BASE_URL = DEFAULT_BASE_URL.replace(/\/$/, '');
      await AsyncStorage.setItem(BASE_URL_KEY, BASE_URL);
    } else {
      BASE_URL = normalized;
    }
  } catch (_) {}
}

export async function setBaseUrl(url) {
  BASE_URL = validateBaseUrl(url);
  await AsyncStorage.setItem(BASE_URL_KEY, BASE_URL);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// iPhone/telefon test: bilgisayar IP'si (aynı Wi-Fi gerekli). Simülatör için localhost kullanın.
let BASE_URL = 'http://192.168.1.4:3000';
const DEVICE_ID_KEY = 'vpn.deviceId';

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(url, { ...options, headers });
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
  async getConfig(serverId) {
    const deviceId = await getOrCreateDeviceId();
    return request('/vpn/config', {
      method: 'POST',
      body: JSON.stringify({
        serverId,
        deviceId,
        platform: Platform.OS,
      }),
    });
  },
  async getPlans() {
    return request('/billing/plans');
  },
  async getMySubscription() {
    return request('/billing/me');
  },
  async purchasePlan(planId) {
    return request('/billing/purchase', { method: 'POST', body: JSON.stringify({ planId }) });
  },
};

export function setBaseUrl(url) {
  BASE_URL = url.replace(/\/$/, '');
}

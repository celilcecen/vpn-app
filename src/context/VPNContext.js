import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { api } from '../api/client';
import * as tunnel from '../vpn/tunnel';

const VPNContext = createContext(null);

const FALLBACK_SERVERS = [
  { id: 'auto', country: 'Otomatik', code: '🌐', ping: 12 },
  { id: 'tr', country: 'Türkiye', code: '🇹🇷', ping: 8 },
  { id: 'de', country: 'Almanya', code: '🇩🇪', ping: 18 },
  { id: 'nl', country: 'Hollanda', code: '🇳🇱', ping: 22 },
  { id: 'us', country: 'ABD', code: '🇺🇸', ping: 95 },
];

const DEFAULT_SERVER = FALLBACK_SERVERS[0];

function getServerList(servers) {
  const list = servers && servers.length ? servers : FALLBACK_SERVERS;
  const auto = list.find((s) => s.id === 'auto') || { id: 'auto', country: 'Otomatik', code: '🌐', ping: 12 };
  return [auto, ...list.filter((s) => s.id !== 'auto')];
}

function isTurkeyServer(server) {
  const id = String(server?.id || '').toLowerCase();
  const country = String(server?.country || '').toLowerCase();
  const code = String(server?.code || '').toLowerCase();
  return id === 'tr' || country.includes('türkiye') || country.includes('turkey') || code === 'tr';
}

function pickBestServer(list, mode) {
  const real = (list || []).filter((s) => s.id !== 'auto');
  if (!real.length) return 'tr';
  if (mode === 'us_only') {
    const us = real.find((s) => String(s.id).toLowerCase() === 'us');
    return us?.id || real[0].id;
  }
  if (mode === 'non_tr') {
    const nonTr = real.find((s) => !isTurkeyServer(s));
    return nonTr?.id || real[0].id;
  }
  return real[0].id;
}

export function VPNProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedServer, setSelectedServer] = useState(DEFAULT_SERVER);
  const [servers, setServers] = useState(FALLBACK_SERVERS);
  const [autoConnect, setAutoConnect] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [killSwitch, setKillSwitch] = useState(true);
  const [dnsLeakProtection, setDnsLeakProtection] = useState(true);
  const [routeMode, setRouteMode] = useState('non_tr'); // non_tr | us_only | manual
  const [tunnelStatus, setTunnelStatus] = useState('DOWN');
  const [exitInfo, setExitInfo] = useState({ ip: null, country: null, city: null, countryCode: null });

  const loadServers = useCallback(async () => {
    try {
      const list = await api.getServers();
      setServers(getServerList(list));
    } catch (_) {
      setServers(FALLBACK_SERVERS);
    }
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const toggleConnection = useCallback(async () => {
    if (connecting) return;
    setConnectionError(null);

    if (connected) {
      try {
        await tunnel.disconnect();
      } catch (_) {}
      setConnected(false);
      setTunnelStatus('DOWN');
      setExitInfo({ ip: null, country: null, city: null, countryCode: null });
      setConnecting(false);
      return;
    }

    const serverId =
      routeMode === 'manual'
        ? selectedServer.id === 'auto'
          ? pickBestServer(servers, 'non_tr')
          : selectedServer.id
        : pickBestServer(servers, routeMode);

    setConnecting(true);
    setTunnelStatus('CONNECTING');
    try {
      const data = await api.getConfig(serverId);
      const config = data?.config;
      if (typeof config !== 'string' || !config.trim()) {
        throw new Error('Sunucudan geçerli WireGuard yapılandırması alınamadı.');
      }
      await tunnel.prepare();
      await tunnel.connect(config.trim());

      const up = await tunnel.waitUntilUp(12000, 500);
      if (!up) {
        throw new Error('VPN tüneli zamanında aktif olmadı. Lütfen tekrar deneyin.');
      }

      setConnected(true);
      setTunnelStatus('UP');
      try {
        const ip = await api.getPublicIpInfo();
        setExitInfo(ip);
      } catch (_) {}
    } catch (err) {
      const msg = String(err?.message || err || '');
      setConnected(false);
      setTunnelStatus('DOWN');
      const nativeMissing =
        msg === 'NATIVE_MODULE_MISSING' ||
        msg.includes('NATIVE_MODULE_MISSING') ||
        /native module is not available|TurboModuleRegistry|could not be found/i.test(msg);

      if (nativeMissing) {
        setConnectionError(
          'VPN yalnızca yerel derlenmiş uygulamada çalışır. Expo Go’da gerçek tünel yok. Bilgisayarda: npx expo prebuild sonra npx expo run:ios veya run:android.'
        );
      } else if (err.status === 402) {
        setConnectionError('Aktif abonelik bulunamadı. Lütfen aboneliğinizi yenileyin.');
      } else if (err.status === 429) {
        setConnectionError(
          'Bu sunucu şu an dolu veya cihaz limitine ulaştınız. Lütfen farklı sunucu deneyin.'
        );
      } else if (err.status === 404) {
        setConnectionError('Seçilen sunucu bulunamadı. Sunucu listesini yenileyip tekrar deneyin.');
      } else if (err.status === 401) {
        setConnectionError('Oturum süresi dolmuş olabilir. Çıkış yapıp tekrar giriş yapın.');
      } else {
        setConnectionError(msg || 'Bağlantı başarısız.');
      }
    } finally {
      setConnecting(false);
    }
  }, [connected, connecting, selectedServer, servers, routeMode]);

  const selectServer = useCallback((server) => {
    setSelectedServer(server);
  }, []);

  const value = {
    connected,
    connecting,
    toggleConnection,
    selectedServer,
    servers,
    selectServer,
    autoConnect,
    setAutoConnect,
    killSwitch,
    setKillSwitch,
    dnsLeakProtection,
    setDnsLeakProtection,
    routeMode,
    setRouteMode,
    tunnelStatus,
    exitInfo,
    connectionError,
    clearConnectionError: () => setConnectionError(null),
    isNativeAvailable: tunnel.isNativeAvailable(),
    demoMode: !tunnel.isNativeAvailable(),
  };

  return <VPNContext.Provider value={value}>{children}</VPNContext.Provider>;
}

export function useVPN() {
  const ctx = useContext(VPNContext);
  if (!ctx) throw new Error('useVPN must be used within VPNProvider');
  return ctx;
}

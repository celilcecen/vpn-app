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

export function VPNProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedServer, setSelectedServer] = useState(DEFAULT_SERVER);
  const [servers, setServers] = useState(FALLBACK_SERVERS);
  const [autoConnect, setAutoConnect] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

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
      return;
    }
    setConnecting(true);
    try {
      const serverId = selectedServer.id === 'auto' ? (servers[1]?.id || 'tr') : selectedServer.id;
      const { config } = await api.getConfig(serverId);
      try {
        await tunnel.prepare();
      } catch (_) {}
      await tunnel.connect(config);
      setConnected(true);
    } catch (err) {
      const msg = err.message || '';
      const isExpoGo = msg === 'NATIVE_MODULE_MISSING' || msg.includes('prepareVPN') || msg.includes('not found') || msg.includes('Native');
      if (isExpoGo) {
        // Expo Go'da demo modu - gerçek tünel yok ama arayüz çalışsın
        setTimeout(() => {
          setConnecting(false);
          setConnected(true);
        }, 1500);
      } else {
        if (err.status === 402) {
          setConnectionError('Aktif abonelik bulunamadı. Lütfen aboneliğinizi yenileyin.');
        } else if (err.status === 429) {
          setConnectionError('Bu sunucu şu an dolu veya cihaz limitine ulaştınız. Lütfen farklı sunucu deneyin.');
        } else {
          setConnectionError(msg || 'Bağlantı başarısız.');
        }
        setConnecting(false);
      }
    } finally {
      if (!tunnel.isNativeAvailable() && !connectionError) return;
      setConnecting(false);
    }
  }, [connected, connecting, selectedServer, servers]);

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

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken, getAuthToken } from '../api/client';

const TOKEN_KEY = '@vpn_token';
const AuthContext = createContext(null);

function mapAuthError(err, mode) {
  const status = err?.status;
  const fallback = mode === 'register' ? 'Kayıt başarısız.' : 'Giriş başarısız.';

  if (status === 400) return err?.message || 'Email veya şifre formatı geçersiz.';
  if (status === 401) return 'Email veya şifre hatalı.';
  if (status === 409) return 'Bu email zaten kayıtlı.';
  if (status >= 500) return 'Sunucu hatası. Lütfen tekrar deneyin.';
  return err?.message || fallback;
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStored = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      if (stored) {
        const { token: t, email: e } = JSON.parse(stored);
        if (t && e) {
          setAuthToken(t);
          setTokenState(t);
          setEmail(e);
        } else {
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
      }
    } catch (_) {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStored();
  }, [loadStored]);

  const login = useCallback(async (emailArg, password) => {
    try {
      const { token: t, email: e } = await api.login(emailArg, password);
      setAuthToken(t);
      setTokenState(t);
      setEmail(e);
      await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify({ token: t, email: e }));
    } catch (err) {
      throw new Error(mapAuthError(err, 'login'));
    }
  }, []);

  const register = useCallback(async (emailArg, password) => {
    try {
      const { token: t, email: e } = await api.register(emailArg, password);
      setAuthToken(t);
      setTokenState(t);
      setEmail(e);
      await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify({ token: t, email: e }));
    } catch (err) {
      throw new Error(mapAuthError(err, 'register'));
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setTokenState(null);
    setEmail(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }, []);

  const value = { token, email, loading, login, register, logout, isLoggedIn: !!token };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { api } from '../api/client';

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const e = email.trim().toLowerCase();
    const p = password.trim();
    if (!e || (!forgotMode && !p)) {
      Alert.alert('Hata', forgotMode ? 'Email girin.' : 'Email ve şifre girin.');
      return;
    }
    if (!validateEmail(e)) {
      Alert.alert('Hata', 'Geçerli bir email adresi girin.');
      return;
    }
    if (!forgotMode) {
      if (p.length < 6) {
        Alert.alert('Hata', 'Şifre en az 6 karakter olmalı.');
        return;
      }
      if (p.length > 128) {
        Alert.alert('Hata', 'Şifre çok uzun.');
        return;
      }
    }
    setLoading(true);
    try {
      if (forgotMode) {
        const result = await api.forgotPassword(e);
        Alert.alert('Başarılı', result.message || 'Şifre sıfırlama bağlantısı gönderildi.');
        setForgotMode(false);
      } else if (isRegister) {
        await register(e, p);
      } else {
        await login(e, p);
      }
    } catch (err) {
      Alert.alert('Hata', err.message || 'Giriş / kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 40 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.brand}>GuardLane</Text>
      <Text style={styles.subtitle}>
        {forgotMode
          ? 'Hesabınızı kurtarmak için email adresinizi girin'
          : isRegister
            ? 'Premium güvenlik için hesabınızı oluşturun'
            : 'Güvenli bağlantıya devam edin'}
      </Text>

      <View style={styles.formCard}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          editable={!loading}
          returnKeyType="next"
        />
        {!forgotMode ? (
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCorrect={false}
            textContentType={isRegister ? 'newPassword' : 'password'}
            editable={!loading}
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
          />
        ) : null}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>
              {forgotMode ? 'Sıfırlama Bağlantısı Gönder' : isRegister ? 'Kayıt ol' : 'Giriş yap'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {!forgotMode ? (
        <TouchableOpacity style={styles.switch} onPress={() => setForgotMode(true)} disabled={loading}>
          <Text style={styles.switchText}>Şifremi unuttum</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.switch} onPress={() => setForgotMode(false)} disabled={loading}>
          <Text style={styles.switchText}>Giriş ekranına dön</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.switch}
        onPress={() => {
          setForgotMode(false);
          setIsRegister(!isRegister);
        }}
        disabled={loading}
      >
        <Text style={styles.switchText}>
          {isRegister ? 'Zaten hesabınız var mı? Giriş yapın' : 'Hesabınız yok mu? Kayıt olun'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  brand: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 28,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    padding: 18,
  },
  input: {
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: colors.text,
    marginBottom: 14,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.background,
  },
  switch: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 15,
    color: colors.primary,
  },
});

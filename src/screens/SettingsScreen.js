import React from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVPN } from '../context/VPNContext';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { autoConnect, setAutoConnect } = useVPN();
  const { email, logout } = useAuth();

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + 16 }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Ayarlar</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bağlantı</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Otomatik bağlan</Text>
          <Switch
            value={autoConnect}
            onValueChange={setAutoConnect}
            trackColor={{ false: colors.cardBorder, true: colors.primaryDim }}
            thumbColor={autoConnect ? colors.primary : colors.textMuted}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hesap</Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Email</Text>
          <Text style={styles.cardValue} numberOfLines={1}>{email}</Text>
        </View>
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={() => navigation.navigate('Purchase')}
        >
          <Text style={styles.purchaseText}>Abonelik / Satın Al</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Çıkış yap</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Uygulama</Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Sürüm</Text>
          <Text style={styles.cardValue}>1.0.0</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>VPN • Güvenli ve hızlı bağlantı</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 28,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  logoutButton: {
    marginTop: 12,
    backgroundColor: colors.card,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  purchaseButton: {
    marginTop: 12,
    backgroundColor: colors.card,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  purchaseText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});

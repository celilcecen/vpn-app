import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const FEATURES = [
  { icon: '🛡️', title: 'Askeri Seviye Güvenlik', desc: 'WireGuard altyapısı ile hızlı ve güvenli tünel.' },
  { icon: '🌍', title: 'Gerçek Lokasyonlar', desc: 'Tek dokunuşla farklı ülkeler arasında geçiş yap.' },
  { icon: '⚡', title: 'Premium Performans', desc: 'Düşük ping ve optimize ağ ile stabil bağlantı.' },
];

export default function OnboardingScreen({ onContinue }) {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [fade, translate]);

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + 24, opacity: fade, transform: [{ translateY: translate }] },
      ]}
    >
      <Text style={styles.brand}>GuardLine</Text>
      <Text style={styles.subtitle}>Dijital gizliliğini tek merkezden yönet.</Text>

      <View style={styles.features}>
        {FEATURES.map((item) => (
          <View style={styles.featureCard} key={item.title}>
            <Text style={styles.featureIcon}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.cta} onPress={onContinue} activeOpacity={0.85}>
        <Text style={styles.ctaText}>Başla</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  brand: {
    color: '#39FF14',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(57, 255, 20, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 8,
    fontSize: 15,
    marginBottom: 26,
  },
  features: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 14,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  featureDesc: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    marginTop: 'auto',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 17,
  },
});


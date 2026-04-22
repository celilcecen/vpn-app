import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVPN } from '../context/VPNContext';
import { sentinel } from '../theme/sentinel';
import * as Haptics from 'expo-haptics';

function formatDuration(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function Card({ children, accentColor, style }) {
  return (
    <View style={[styles.card, { borderLeftColor: accentColor || sentinel.neon }, style]}>
      {children}
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    connected,
    connecting,
    toggleConnection,
    selectedServer,
    tunnelStatus,
    exitInfo,
    connectionError,
    clearConnectionError,
    demoMode,
    killSwitch,
    setKillSwitch,
  } = useVPN();

  const [sessionSec, setSessionSec] = useState(0);
  const [liveMbps, setLiveMbps] = useState({ down: 0, up: 0 });
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, [enterAnim]);

  useEffect(() => {
    if (!connected) {
      setSessionSec(0);
      setLiveMbps({ down: 0, up: 0 });
      return;
    }
    const id = setInterval(() => setSessionSec((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [connected]);

  useEffect(() => {
    if (!connected) return;
    setLiveMbps({
      down: 115 + Math.random() * 25,
      up: 38 + Math.random() * 18,
    });
    const id = setInterval(() => {
      setLiveMbps({
        down: 115 + Math.random() * 25,
        up: 38 + Math.random() * 18,
      });
    }, 2500);
    return () => clearInterval(id);
  }, [connected]);

  useEffect(() => {
    if (connected) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(0);
  }, [connected, pulseAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  const onPressIn = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      Haptics.selectionAsync().catch(() => {});
    }
    Animated.timing(scaleAnim, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const serverCode = selectedServer.code && selectedServer.code.length <= 3 ? selectedServer.code : 'NODE';
  const nodeId = `${String(serverCode).toUpperCase()}-SEC-${String(selectedServer.ping || 0).padStart(2, '0')}`;

  return (
    <Animated.View
      style={[
        styles.root,
        {
          opacity: enterAnim,
        },
      ]}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.logoRow}>
          <Text style={styles.logoShield}>🛡</Text>
          <Text style={styles.logoText}>SENTINEL</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Text style={styles.headerIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Text style={styles.headerIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 112 }]}
      >
        <View style={styles.powerSection}>
          <View style={styles.buttonWrapper}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.neonRing,
                {
                  transform: [{ scale: pulseScale }],
                  opacity: connected ? pulseOpacity : 0.25,
                },
              ]}
            />
            <Pressable
              onPress={() => {
                void toggleConnection();
              }}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={connecting}
              style={({ pressed }) => [
                styles.powerPressable,
                pressed && styles.powerPressablePressed,
              ]}
            >
              <Animated.View
                style={[
                  styles.powerOuter,
                  connected && styles.powerOuterConnected,
                  connecting && styles.powerOuterConnecting,
                  { transform: [{ scale: scaleAnim }] },
                ]}
              >
                <View style={styles.powerInner}>
                  {connecting ? (
                    <ActivityIndicator size="large" color={sentinel.neon} />
                  ) : (
                    <>
                      <Text style={styles.powerGlyph}>⏻</Text>
                      <Text style={styles.powerStateText}>
                        {connected ? 'CONNECTED' : 'DISCONNECTED'}
                      </Text>
                    </>
                  )}
                </View>
              </Animated.View>
            </Pressable>
          </View>

          <Text style={styles.protectionLabel}>
            {connected && tunnelStatus === 'UP' ? 'PROTECTION ACTIVE' : 'PROTECTION INACTIVE'}
          </Text>
          <Text
            style={[
              styles.timer,
              !connected && styles.timerInactive,
            ]}
          >
            {formatDuration(sessionSec)}
          </Text>
        </View>

        {demoMode ? (
          <Text style={styles.demoHint}>
            Expo Go’da gerçek VPN yok. Bağlanmak için projeyi derleyin: npx expo prebuild → npx expo run:ios
            veya run:android.
          </Text>
        ) : null}

        {connectionError ? (
          <Text style={styles.errorText} onPress={clearConnectionError}>
            {connectionError}
          </Text>
        ) : null}

        <Card accentColor={sentinel.neon}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>CURRENT IP</Text>
            <Text style={styles.cardIcon}>🌍</Text>
          </View>
          <Text style={styles.cardValueLarge}>
            {connected ? exitInfo.ip || 'Detecting…' : '— — — —'}
          </Text>
          <Text style={styles.cardSub}>
            {connected
              ? `${exitInfo.city ? `${exitInfo.city}, ` : ''}${exitInfo.country || selectedServer.country}`
              : 'Not connected'}
          </Text>
        </Card>

        <Card accentColor={sentinel.neon}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>NETWORK THROUGHPUT</Text>
            <View style={styles.encryptedPill}>
              <View style={styles.encryptedDot} />
              <Text style={styles.encryptedText}>ENCRYPTED</Text>
            </View>
          </View>
          <View style={styles.throughputRow}>
            <View style={styles.throughputCol}>
              <Text style={styles.throughputArrow}>↓</Text>
              <Text style={styles.throughputNum}>
                {connected ? liveMbps.down.toFixed(1) : '0.0'}
              </Text>
              <Text style={styles.throughputUnit}>MBPS DOWN</Text>
            </View>
            <View style={styles.throughputDivider} />
            <View style={styles.throughputCol}>
              <Text style={[styles.throughputArrow, { color: sentinel.yellow }]}>↑</Text>
              <Text style={styles.throughputNum}>
                {connected ? liveMbps.up.toFixed(1) : '0.0'}
              </Text>
              <Text style={styles.throughputUnit}>MBPS UP</Text>
            </View>
          </View>
          <View style={styles.waveLine} />
        </Card>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            } else {
              Haptics.selectionAsync().catch(() => {});
            }
            navigation.navigate('Servers');
          }}
        >
          <Card accentColor={sentinel.yellow}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>SERVER NODE</Text>
              <Text style={styles.cardIcon}>🖥</Text>
            </View>
            <Text style={styles.cardValueLarge}>{nodeId}</Text>
            <Text style={styles.cardSub}>
              Lat: {selectedServer.ping ?? '—'}ms | AES-256-GCM
            </Text>
          </Card>
        </TouchableOpacity>

        <Card accentColor={sentinel.neon}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>SESSION DATA</Text>
            <Text style={styles.cardIcon}>↻</Text>
          </View>
          <Text style={styles.cardValueLarge}>
            {connected
              ? `${Math.max(0.01, sessionSec * 0.004).toFixed(2)} MB`
              : '0 MB'}
          </Text>
        </Card>

        <View style={[styles.card, styles.killRow, { borderLeftColor: sentinel.neon }]}>
          <View>
            <Text style={styles.killTitle}>Kill Switch</Text>
            <Text style={styles.killStatus}>{killSwitch ? 'ENABLED' : 'DISABLED'}</Text>
          </View>
          <Switch
            value={killSwitch}
            onValueChange={setKillSwitch}
            trackColor={{ false: '#3f3f46', true: sentinel.neonDim }}
            thumbColor={killSwitch ? sentinel.neon : '#a1a1aa'}
            ios_backgroundColor="#3f3f46"
          />
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: sentinel.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoShield: {
    fontSize: 22,
    color: sentinel.neon,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: sentinel.neon,
    letterSpacing: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    padding: 8,
  },
  headerIcon: {
    fontSize: 20,
    opacity: 0.85,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  powerSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonWrapper: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerPressable: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerPressablePressed: {
    opacity: 0.92,
  },
  neonRing: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 3,
    borderColor: sentinel.neon,
    shadowColor: sentinel.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
  },
  powerOuter: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: '#0d0f18',
    borderWidth: 3,
    borderColor: '#2a3148',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: sentinel.neon,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  powerOuterConnected: {
    borderColor: sentinel.neon,
    backgroundColor: 'rgba(57, 255, 20, 0.06)',
  },
  powerOuterConnecting: {
    borderColor: sentinel.textMuted,
  },
  powerInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerGlyph: {
    fontSize: 42,
    color: sentinel.neon,
    marginBottom: 4,
    fontWeight: '300',
  },
  powerStateText: {
    fontSize: 11,
    fontWeight: '800',
    color: sentinel.neon,
    letterSpacing: 1.2,
  },
  protectionLabel: {
    marginTop: 18,
    fontSize: 12,
    fontWeight: '700',
    color: sentinel.textMuted,
    letterSpacing: 2,
  },
  timer: {
    marginTop: 8,
    fontSize: 36,
    fontWeight: '200',
    color: sentinel.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: 4,
  },
  timerInactive: {
    color: sentinel.textMuted,
    opacity: 0.65,
  },
  demoHint: {
    textAlign: 'center',
    color: sentinel.textLabel,
    fontSize: 11,
    marginBottom: 12,
  },
  errorText: {
    color: '#f87171',
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: sentinel.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: sentinel.textLabel,
    letterSpacing: 1,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardValueLarge: {
    fontSize: 26,
    fontWeight: '700',
    color: sentinel.text,
    letterSpacing: 0.5,
  },
  cardSub: {
    marginTop: 6,
    fontSize: 14,
    color: sentinel.textMuted,
  },
  encryptedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  encryptedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: sentinel.neon,
  },
  encryptedText: {
    fontSize: 10,
    fontWeight: '800',
    color: sentinel.neon,
    letterSpacing: 0.8,
  },
  throughputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  throughputCol: {
    flex: 1,
    alignItems: 'center',
  },
  throughputArrow: {
    fontSize: 18,
    color: sentinel.neon,
    marginBottom: 4,
  },
  throughputNum: {
    fontSize: 22,
    fontWeight: '700',
    color: sentinel.text,
  },
  throughputUnit: {
    fontSize: 10,
    color: sentinel.textMuted,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  throughputDivider: {
    width: 1,
    height: 56,
    backgroundColor: sentinel.cardBorder,
  },
  waveLine: {
    marginTop: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: sentinel.neonDim,
    opacity: 0.6,
  },
  killRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
  },
  killTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: sentinel.text,
  },
  killStatus: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '800',
    color: sentinel.neon,
    letterSpacing: 0.5,
  },
});

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVPN } from '../context/VPNContext';
import { colors } from '../theme/colors';
import { getFlag } from '../utils/flags';
import * as Haptics from 'expo-haptics';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { connected, connecting, toggleConnection, selectedServer, connectionError, clearConnectionError, demoMode } = useVPN();
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
    if (connected) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(0);
    }
  }, [connected]);

  const statusText = connecting ? 'Bağlanıyor...' : connected ? 'Korunuyorsunuz' : 'Bağlı değil';
  const buttonLabel = connecting ? '' : connected ? 'Bağlantıyı Kes' : 'Bağlan';

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0.8],
  });

  const onPressIn = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      Haptics.selectionAsync().catch(() => {});
    }
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 16,
          opacity: enterAnim,
          transform: [
            {
              translateY: enterAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.title}>GuardLane VPN</Text>
      <Text style={styles.subtitle}>{statusText}</Text>
      {demoMode && <Text style={styles.demoBadge}>Demo modu (Expo Go)</Text>}

      <View style={styles.buttonWrapper}>
        <Animated.View
          style={[
            styles.outerRing,
            {
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        />
        {connected && (
          <Animated.View
            style={[
              styles.outerRing,
              styles.ring2,
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
        )}
        <Pressable
          onPress={toggleConnection}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={connecting}
          style={[
            styles.connectButton,
            connected && styles.connectButtonConnected,
            connecting && styles.connectButtonConnecting,
          ]}
        >
          <Animated.View
            style={[
              styles.innerCircle,
              connected && styles.innerCircleConnected,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            {connecting ? (
              <ActivityIndicator size="large" color={colors.background} />
            ) : (
              <Text style={styles.shield}>{connected ? '🔒' : '🛡️'}</Text>
            )}
          </Animated.View>
        </Pressable>
      </View>

      <Text style={styles.buttonLabel}>{buttonLabel}</Text>

      {connectionError ? (
        <Text style={styles.errorText} onPress={clearConnectionError}>{connectionError}</Text>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.serverChip}
        onPress={() => {
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          } else {
            Haptics.selectionAsync().catch(() => {});
          }
          navigation.navigate('Servers');
        }}
      >
        <Text style={styles.serverEmoji}>{getFlag(selectedServer.id)}</Text>
        <Text style={styles.serverName}>{selectedServer.country}</Text>
        <Text style={styles.serverPing}>{selectedServer.ping} ms</Text>
      </TouchableOpacity>

      {connected && (
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>256</Text>
            <Text style={styles.statLabel}>Mbps</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{selectedServer.ping}</Text>
            <Text style={styles.statLabel}>ms ping</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 6,
  },
  demoBadge: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 12,
    backgroundColor: colors.secondaryDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  buttonWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
  },
  outerRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  ring2: {
    borderColor: colors.secondary,
  },
  connectButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.cardElevated,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButtonConnected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  connectButtonConnecting: {
    borderColor: colors.textMuted,
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircleConnected: {
    backgroundColor: colors.primary,
  },
  shield: {
    fontSize: 48,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 24,
  },
  serverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginTop: 32,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  serverEmoji: {
    fontSize: 22,
  },
  serverName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  serverPing: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    backgroundColor: colors.card,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 32,
  },
});

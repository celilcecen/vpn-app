import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useVPN } from '../context/VPNContext';
import { sentinel } from '../theme/sentinel';
import { getFlag } from '../utils/flags';
import { displayForServer } from '../utils/serverDisplay';

function activeNodeCount(serverCount) {
  const n = Math.max(1, serverCount);
  return n * 81;
}

export default function ServersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { servers, selectedServer, selectServer } = useVPN();
  const [favorites, setFavorites] = useState({});

  const locationServers = useMemo(
    () => servers.filter((s) => s.id !== 'auto'),
    [servers]
  );

  const autoServer = useMemo(
    () => servers.find((s) => s.id === 'auto') || servers[0],
    [servers]
  );

  const nodesLabel = useMemo(
    () => `${activeNodeCount(locationServers.length)} ACTIVE NODES`,
    [locationServers.length]
  );

  const toggleFavorite = useCallback((id) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const onSmartConnect = useCallback(() => {
    if (autoServer) selectServer(autoServer);
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    navigation.navigate('Home');
  }, [autoServer, navigation, selectServer]);

  const renderItem = useCallback(
    ({ item }) => {
      const isSelected = selectedServer.id === item.id;
      const { city, countryLine } = displayForServer(item);
      const fav = !!favorites[item.id];

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.row, isSelected && styles.rowSelected]}
          onPress={() => {
            if (Platform.OS === 'ios') {
              Haptics.selectionAsync().catch(() => {});
            }
            selectServer(item);
          }}
        >
          {isSelected ? <View style={styles.rowAccent} /> : null}
          <View style={styles.flagCircle}>
            <Text style={styles.flagEmoji}>{getFlag(item.id)}</Text>
          </View>
          <View style={styles.rowMain}>
            <Text style={styles.cityText} numberOfLines={1}>
              {city}
            </Text>
            <Text style={styles.detailText} numberOfLines={1}>
              {countryLine}
            </Text>
          </View>
          <View style={styles.latencyCol}>
            <Text style={styles.latencyLabel}>LATENCY</Text>
            <Text style={[styles.latencyMs, isSelected && styles.latencyMsActive]}>
              {item.ping ?? '—'}ms
            </Text>
          </View>
          <TouchableOpacity
            style={styles.starBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => toggleFavorite(item.id)}
          >
            <Text style={[styles.star, fav && styles.starOn]}>{fav ? '★' : '☆'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [favorites, selectedServer.id, selectServer, toggleFavorite]
  );

  const listHeader = (
    <>
      <LinearGradient
        colors={[sentinel.neon, '#2ae610', sentinel.neon]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroTitle}>SMART CONNECT</Text>
        <Text style={styles.heroSub}>INSTANTLY SECURE YOUR DATA STREAM</Text>
        <TouchableOpacity style={styles.heroBtn} activeOpacity={0.88} onPress={onSmartConnect}>
          <Text style={styles.heroBtnText}>CONNECT</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionLeft}>AVAILABLE LOCATIONS</Text>
        <Text style={styles.sectionRight}>{nodesLabel}</Text>
      </View>
    </>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.logoRow}>
          <Text style={styles.logoShield}>🛡</Text>
          <Text style={styles.logoText}>SENTINEL</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} activeOpacity={0.7}>
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={locationServers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 102 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No locations available.</Text>
          </View>
        }
      />
    </View>
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
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: sentinel.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 18,
    opacity: 0.85,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  heroCard: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: sentinel.neon,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: sentinel.bg,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  heroSub: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(18, 20, 32, 0.75)',
    letterSpacing: 0.8,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  heroBtn: {
    marginTop: 18,
    backgroundColor: sentinel.bg,
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 14,
    minWidth: 160,
    alignItems: 'center',
  },
  heroBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: sentinel.neon,
    letterSpacing: 2,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionLeft: {
    fontSize: 11,
    fontWeight: '800',
    color: sentinel.textMuted,
    letterSpacing: 0.8,
  },
  sectionRight: {
    fontSize: 10,
    fontWeight: '800',
    color: sentinel.neon,
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: sentinel.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  rowSelected: {
    borderColor: sentinel.neonDim,
    backgroundColor: 'rgba(57, 255, 20, 0.04)',
  },
  rowAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: sentinel.neon,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  flagCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: sentinel.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
  },
  flagEmoji: {
    fontSize: 26,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  cityText: {
    fontSize: 15,
    fontWeight: '800',
    color: sentinel.text,
    letterSpacing: 0.6,
  },
  detailText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: sentinel.textLabel,
    letterSpacing: 0.4,
  },
  latencyCol: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  latencyLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: sentinel.textLabel,
    letterSpacing: 0.5,
  },
  latencyMs: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: sentinel.text,
  },
  latencyMsActive: {
    color: sentinel.neon,
  },
  starBtn: {
    paddingVertical: 4,
    paddingLeft: 4,
  },
  star: {
    fontSize: 22,
    color: sentinel.textLabel,
  },
  starOn: {
    color: sentinel.yellow,
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: sentinel.textMuted,
    fontSize: 14,
  },
});

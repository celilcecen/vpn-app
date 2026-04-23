import React from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVPN } from '../context/VPNContext';
import { useAuth } from '../context/AuthContext';
import { sentinel } from '../theme/sentinel';

const switchTrack = { false: '#3f3f46', true: sentinel.neonDim };
const switchThumbOn = sentinel.neon;
const switchThumbOff = '#a1a1aa';

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    autoConnect,
    setAutoConnect,
    killSwitch,
    setKillSwitch,
    dnsLeakProtection,
    setDnsLeakProtection,
    routeMode,
    setRouteMode,
  } = useVPN();
  const { email, logout } = useAuth();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.logoRow}>
          <Text style={styles.logoShield}>🛡</Text>
          <Text style={styles.logoText}>GuardLine</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} activeOpacity={0.7}>
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Security Settings</Text>
        <Text style={styles.pageSub}>ENHANCED ENCRYPTION & TUNNELING CONTROLS</Text>

        <View style={styles.coreCard}>
          <Text style={styles.watermark}>🛡</Text>
          <View style={styles.coreHeader}>
            <View style={styles.coreDot} />
            <Text style={styles.coreHeaderText}>CORE SHIELD ACTIVE</Text>
          </View>
          <Text style={styles.coreTitle}>Maximum Protection Protocol</Text>
          <Text style={styles.coreDesc}>
            Your traffic is wrapped in AES-256 encryption with modern AEAD ciphers. DNS queries are
            routed through the tunnel to reduce leak risk while connected.
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>⚡</Text>
              <Text style={styles.badgeText}>WIREGUARD</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>🔒</Text>
              <Text style={styles.badgeText}>AES-256-GCM</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={styles.cardLabelCaps}>ENCRYPTION STRENGTH</Text>
            <Text style={styles.optimalTag}>OPTIMAL</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.progressPct}>99.9%</Text>
          <View style={styles.obfuscationRow}>
            <View>
              <Text style={styles.cardLabelCaps}>DATA OBFUSCATION</Text>
              <View style={styles.activeRow}>
                <Text style={styles.activeHuge}>ACTIVE</Text>
                <View style={styles.stealthPill}>
                  <Text style={styles.stealthText}>STEALTH</Text>
                </View>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.auditBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Logs')}
          >
            <Text style={styles.auditBtnText}>VIEW AUDIT LOG</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toggleCard}>
          <View style={styles.toggleTop}>
            <Text style={styles.smallIcon}>✕</Text>
            <Switch
              value={killSwitch}
              onValueChange={setKillSwitch}
              trackColor={switchTrack}
              thumbColor={killSwitch ? switchThumbOn : switchThumbOff}
              ios_backgroundColor="#3f3f46"
            />
          </View>
          <Text style={styles.toggleTitle}>Kill Switch</Text>
          <Text style={styles.toggleDesc}>
            Blocks internet access if the VPN tunnel drops, reducing accidental exposure of your IP.
          </Text>
        </View>

        <View style={styles.toggleCard}>
          <View style={styles.toggleTop}>
            <Text style={styles.smallIcon}>🖥</Text>
            <Switch
              value={dnsLeakProtection}
              onValueChange={setDnsLeakProtection}
              trackColor={switchTrack}
              thumbColor={dnsLeakProtection ? switchThumbOn : switchThumbOff}
              ios_backgroundColor="#3f3f46"
            />
          </View>
          <Text style={styles.toggleTitle}>DNS Leak Protection</Text>
          <Text style={styles.toggleDesc}>
            Prefer routing DNS through GuardLine while connected so resolvers align with the tunnel.
          </Text>
        </View>

        <View style={styles.splitCard}>
          <View style={styles.splitHeader}>
            <Text style={styles.smallIcon}>⑂</Text>
            <TouchableOpacity style={styles.configureBtn} activeOpacity={0.8}>
              <Text style={styles.configureBtnText}>CONFIGURE</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.toggleTitle}>Split Tunneling</Text>
          <Text style={styles.toggleDesc}>
            Choose which apps use the VPN tunnel. Per-app routing is managed on supported platforms.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.toggleTitle}>Exit Route Policy</Text>
          <Text style={styles.toggleDesc}>
            Choose where traffic exits by default when you press Connect.
          </Text>
          <View style={styles.segment}>
            <TouchableOpacity
              style={[styles.segmentHalf, routeMode === 'non_tr' && styles.segmentHalfOn]}
              onPress={() => setRouteMode('non_tr')}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, routeMode === 'non_tr' && styles.segmentTextOn]}>
                NON-TR AUTO
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentHalf, routeMode === 'us_only' && styles.segmentHalfOn]}
              onPress={() => setRouteMode('us_only')}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, routeMode === 'us_only' && styles.segmentTextOn]}>
                US ONLY
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentHalf, routeMode === 'manual' && styles.segmentHalfOn]}
              onPress={() => setRouteMode('manual')}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, routeMode === 'manual' && styles.segmentTextOn]}>
                MANUAL
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.warnCard}>
          <Text style={styles.warnIcon}>⚠</Text>
          <View style={styles.warnBody}>
            <Text style={styles.warnTitle}>SECURITY RECOMMENDATION</Text>
            <Text style={styles.warnText}>
              Keep Kill Switch enabled on untrusted networks. If it is off, a brief disconnect could
              expose your real IP before the tunnel restores.
            </Text>
          </View>
        </View>

        <Text style={styles.accountSectionLabel}>ACCOUNT</Text>
        <View style={styles.accountCard}>
          <Text style={styles.accountLabel}>Email</Text>
          <Text style={styles.accountValue} numberOfLines={1}>
            {email}
          </Text>
        </View>
        <View style={styles.accountRow}>
          <Text style={styles.accountLabel}>Auto-connect</Text>
          <Switch
            value={autoConnect}
            onValueChange={setAutoConnect}
            trackColor={switchTrack}
            thumbColor={autoConnect ? switchThumbOn : switchThumbOff}
            ios_backgroundColor="#3f3f46"
          />
        </View>
        <TouchableOpacity
          style={styles.primaryOutlineBtn}
          onPress={() => navigation.navigate('Purchase')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryOutlineText}>Subscription / Purchase</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
        <Text style={styles.version}>GuardLine • v1.0.0</Text>
      </ScrollView>
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
    color: '#39FF14',
    letterSpacing: 2,
    textShadowColor: 'rgba(57, 255, 20, 0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
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
  scroll: {
    paddingHorizontal: 20,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: sentinel.text,
    letterSpacing: 0.3,
  },
  pageSub: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 10,
    fontWeight: '700',
    color: sentinel.textLabel,
    letterSpacing: 1,
  },
  coreCard: {
    backgroundColor: sentinel.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
    padding: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    right: -8,
    bottom: -16,
    fontSize: 120,
    opacity: 0.06,
  },
  coreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  coreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: sentinel.neon,
  },
  coreHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: sentinel.neon,
    letterSpacing: 1,
  },
  coreTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: sentinel.text,
    marginBottom: 10,
  },
  coreDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: sentinel.textMuted,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: sentinel.bg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
  },
  badgeIcon: {
    fontSize: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: sentinel.textMuted,
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: sentinel.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabelCaps: {
    fontSize: 10,
    fontWeight: '800',
    color: sentinel.textLabel,
    letterSpacing: 0.8,
  },
  optimalTag: {
    fontSize: 10,
    fontWeight: '800',
    color: sentinel.neon,
    letterSpacing: 0.6,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: sentinel.bg,
    overflow: 'hidden',
  },
  progressFill: {
    width: '99.9%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: sentinel.neon,
  },
  progressPct: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: sentinel.text,
  },
  obfuscationRow: {
    marginTop: 18,
    marginBottom: 16,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  activeHuge: {
    fontSize: 28,
    fontWeight: '800',
    color: sentinel.text,
    letterSpacing: 1,
  },
  stealthPill: {
    backgroundColor: sentinel.yellowDim,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: sentinel.yellow,
  },
  stealthText: {
    fontSize: 10,
    fontWeight: '800',
    color: sentinel.yellow,
    letterSpacing: 0.6,
  },
  auditBtn: {
    backgroundColor: sentinel.bg,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
  },
  auditBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: sentinel.text,
    letterSpacing: 1.2,
  },
  toggleCard: {
    backgroundColor: sentinel.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  toggleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  smallIcon: {
    fontSize: 18,
    color: sentinel.textMuted,
    fontWeight: '700',
  },
  toggleTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: sentinel.text,
    marginBottom: 8,
  },
  toggleDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: sentinel.textMuted,
  },
  splitCard: {
    backgroundColor: sentinel.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  configureBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: sentinel.neon,
  },
  configureBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: sentinel.neon,
    letterSpacing: 0.6,
  },
  segment: {
    flexDirection: 'row',
    marginTop: 14,
    backgroundColor: sentinel.bg,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
  },
  segmentHalf: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentHalfOn: {
    backgroundColor: sentinel.neonDim,
    borderWidth: 1,
    borderColor: sentinel.neon,
  },
  segmentText: {
    fontSize: 10,
    fontWeight: '800',
    color: sentinel.textLabel,
    letterSpacing: 0.4,
  },
  segmentTextOn: {
    color: sentinel.neon,
  },
  warnCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: sentinel.yellow,
    padding: 16,
    marginBottom: 24,
  },
  warnIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  warnBody: {
    flex: 1,
  },
  warnTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: sentinel.yellow,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  warnText: {
    fontSize: 13,
    lineHeight: 19,
    color: sentinel.textMuted,
  },
  accountSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: sentinel.textLabel,
    letterSpacing: 1,
    marginBottom: 10,
  },
  accountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: sentinel.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
    padding: 16,
    marginBottom: 10,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: sentinel.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  accountLabel: {
    fontSize: 14,
    color: sentinel.textMuted,
  },
  accountValue: {
    flex: 1,
    marginLeft: 16,
    fontSize: 14,
    fontWeight: '600',
    color: sentinel.text,
    textAlign: 'right',
  },
  primaryOutlineBtn: {
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: sentinel.neon,
    backgroundColor: 'rgba(57, 255, 20, 0.06)',
  },
  primaryOutlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: sentinel.neon,
  },
  logoutBtn: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.5)',
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f87171',
  },
  version: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
    color: sentinel.textLabel,
  },
});


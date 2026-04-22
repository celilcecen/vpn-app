import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sentinel } from '../theme/sentinel';
import { useVPN } from '../context/VPNContext';
import { cityTitleCase, nodeCodeForServer } from '../utils/serverDisplay';

function formatDuration(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatClock() {
  const d = new Date();
  return d.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const BAR_HEIGHTS = [0.42, 0.68, 0.5, 0.82, 0.55, 0.74, 0.38, 0.62];
const BAR_COLORS = [
  'rgba(57, 255, 20, 0.35)',
  'rgba(57, 255, 20, 0.55)',
  'rgba(57, 255, 20, 0.45)',
  'rgba(57, 255, 20, 0.85)',
  'rgba(57, 255, 20, 0.5)',
  'rgba(57, 255, 20, 0.7)',
  'rgba(57, 255, 20, 0.4)',
  'rgba(57, 255, 20, 0.6)',
];

const STATIC_LOGS = [
  {
    key: 'scan',
    time: '13:58:12',
    icon: '🛡',
    iconTint: '#60a5fa',
    title: 'Security scan complete',
    body: 'Deep packet inspection performed. 0 threats detected in current session.',
  },
  {
    key: 'ip',
    time: '13:45:00',
    icon: '⇄',
    iconTint: sentinel.yellow,
    title: 'IP changed to 192.168.1.1',
    body: 'Dynamic IP rotation triggered by Stealth-Guard. Virtual identity updated successfully.',
  },
  {
    key: 'handshake',
    time: '13:43:05',
    icon: '🔒',
    iconTint: sentinel.neon,
    title: 'Handshake established',
    body: 'AES-256-GCM encryption tunnel initialized with primary gateway.',
  },
];

export default function LogsScreen() {
  const insets = useSafeAreaInsets();
  const { connected, selectedServer } = useVPN();
  const [sessionSec, setSessionSec] = useState(0);

  useEffect(() => {
    if (!connected) {
      setSessionSec(0);
      return;
    }
    const id = setInterval(() => setSessionSec((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [connected]);

  const timeline = useMemo(() => {
    const rows = [];
    if (connected && selectedServer.id !== 'auto') {
      rows.push({
        key: 'live',
        time: formatClock(),
        icon: '✓',
        iconTint: sentinel.neon,
        title: `Connected to ${cityTitleCase(selectedServer)}`,
        body: `Node ${nodeCodeForServer(selectedServer)} assigned via WireGuard protocol. Latency: ${selectedServer.ping ?? '—'}ms.`,
      });
    } else if (connected) {
      rows.push({
        key: 'live-auto',
        time: formatClock(),
        icon: '✓',
        iconTint: sentinel.neon,
        title: 'Connected (Smart route)',
        body: `Best node assigned via WireGuard protocol. Latency: ${selectedServer.ping ?? '—'}ms.`,
      });
    }
    STATIC_LOGS.forEach((e) => rows.push(e));
    return rows;
  }, [connected, selectedServer, sessionSec]);

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>AUDIT TRAIL</Text>
        <Text style={styles.title}>System Logs</Text>

        <View style={styles.healthCard}>
          <View style={styles.healthAccent} />
          <View style={styles.healthRow}>
            <View style={styles.healthCol}>
              <Text style={styles.healthLabel}>SESSION DURATION</Text>
              <Text style={styles.healthValue}>{formatDuration(sessionSec)}</Text>
            </View>
            <View style={styles.healthCol}>
              <Text style={styles.healthLabel}>INTEGRITY SCORE</Text>
              <Text style={styles.healthValue}>99.8%</Text>
            </View>
          </View>
          <View style={styles.healthFooter}>
            <Text style={styles.healthFooterIcon}>🛡</Text>
            <Text style={styles.healthFooterText}>SECURE KERNEL ACTIVE</Text>
          </View>
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.cardSectionLabel}>ACTIVITY TIMELINE</Text>
          {timeline.map((item, index) => (
            <View key={item.key} style={styles.timelineRow}>
              <View style={styles.timelineRail}>
                <View style={[styles.timelineDot, { borderColor: item.iconTint }]} />
                {index < timeline.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>
              <View style={styles.timelineMain}>
                <Text style={styles.timelineTime}>{item.time}</Text>
                <View style={styles.timelineTitleRow}>
                  <Text style={[styles.timelineIcon, { color: item.iconTint }]}>{item.icon}</Text>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                </View>
                <Text style={styles.timelineDesc}>{item.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.cardSectionLabel}>ENCRYPTION LOAD</Text>
          <View style={styles.chartRow}>
            {BAR_HEIGHTS.map((h, i) => (
              <View key={i} style={styles.chartBarWrap}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: Math.max(10, Math.round(78 * h)),
                      backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <View style={styles.statGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>TOTAL LOGS</Text>
              <Text style={styles.statValue}>1,284</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>ALERTS</Text>
              <Text style={[styles.statValue, styles.statAlert]}>0</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>DATA OUT</Text>
              <Text style={styles.statValue}>4.2 GB</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>DATA IN</Text>
              <Text style={styles.statValue}>1.8 GB</Text>
            </View>
          </View>
        </View>
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: sentinel.textLabel,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: sentinel.text,
    marginBottom: 20,
  },
  healthCard: {
    backgroundColor: sentinel.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
    padding: 16,
    paddingLeft: 18,
    marginBottom: 14,
    overflow: 'hidden',
  },
  healthAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: sentinel.neon,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  healthCol: {
    flex: 1,
  },
  healthLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: sentinel.textLabel,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  healthValue: {
    fontSize: 22,
    fontWeight: '800',
    color: sentinel.neon,
    fontVariant: ['tabular-nums'],
  },
  healthFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: sentinel.cardBorder,
  },
  healthFooterIcon: {
    fontSize: 14,
    color: sentinel.neon,
  },
  healthFooterText: {
    fontSize: 11,
    fontWeight: '800',
    color: sentinel.neon,
    letterSpacing: 0.6,
  },
  timelineCard: {
    backgroundColor: sentinel.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  cardSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: sentinel.textLabel,
    letterSpacing: 1,
    marginBottom: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineRail: {
    width: 22,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: sentinel.bg,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: sentinel.cardBorder,
    marginTop: 2,
    marginBottom: -4,
  },
  timelineMain: {
    flex: 1,
    paddingBottom: 18,
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: '600',
    color: sentinel.textMuted,
    fontVariant: ['tabular-nums'],
    marginBottom: 6,
  },
  timelineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  timelineIcon: {
    fontSize: 16,
  },
  timelineTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: sentinel.text,
  },
  timelineDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: sentinel.textMuted,
  },
  statsCard: {
    backgroundColor: sentinel.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
    padding: 16,
    marginBottom: 24,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 88,
    gap: 6,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  chartBarWrap: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    minHeight: 8,
    borderRadius: 4,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCell: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: sentinel.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: sentinel.cardBorder,
    padding: 14,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: sentinel.textLabel,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: sentinel.text,
    fontVariant: ['tabular-nums'],
  },
  statAlert: {
    color: sentinel.yellow,
  },
});

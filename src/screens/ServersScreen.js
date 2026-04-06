import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVPN } from '../context/VPNContext';
import { colors } from '../theme/colors';
import { getFlag } from '../utils/flags';

export default function ServersScreen() {
  const insets = useSafeAreaInsets();
  const { servers, selectedServer, selectServer } = useVPN();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>Konum Seçimi</Text>
      <Text style={styles.subtitle}>Gerçek lokasyonlar arasından en hızlı node'u seçin</Text>

      <FlatList
        data={servers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelected = selectedServer.id === item.id;
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => selectServer(item)}
            >
              <Text style={styles.flag}>{getFlag(item.id)}</Text>
              <View style={styles.rowContent}>
                <Text style={styles.country}>{item.country}</Text>
                <Text style={styles.ping}>{item.ping} ms</Text>
              </View>
              {isSelected && (
                <View style={styles.check}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 24,
  },
  list: {
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  flag: {
    fontSize: 28,
    marginRight: 16,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  country: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  ping: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500',
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
});

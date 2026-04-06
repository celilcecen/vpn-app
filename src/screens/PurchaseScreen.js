import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { colors } from '../theme/colors';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

function formatPrice(value, currency) {
  return `${value.toFixed(2)} ${currency}`;
}

export default function PurchaseScreen() {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buyingPlanId, setBuyingPlanId] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdReady, setHoldReady] = useState(false);
  const skeletonPulse = useRef(new Animated.Value(0.45)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const holdAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(Array.from({ length: 14 }, () => new Animated.Value(0))).current;
  const { width: screenWidth } = Dimensions.get('window');

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(skeletonPulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [skeletonPulse]);

  useEffect(() => {
    Animated.timing(sheetAnim, {
      toValue: sheetVisible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
    if (!sheetVisible) {
      holdAnim.setValue(0);
      setHoldProgress(0);
      setHoldReady(false);
    }
  }, [sheetAnim, sheetVisible]);

  useEffect(() => {
    const id = holdAnim.addListener(({ value }) => {
      setHoldProgress(Math.max(0, Math.min(1, value)));
    });
    return () => holdAnim.removeListener(id);
  }, [holdAnim]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, mySub] = await Promise.all([api.getPlans(), api.getMySubscription()]);
      setPlans(plansData || []);
      setSubscription(mySub?.subscription || null);
    } catch (err) {
      Alert.alert('Hata', err.message || 'Satın alma bilgileri alınamadı.');
    } finally {
      setLoading(false);
      Animated.timing(contentFade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runConfetti = () => {
    setShowConfetti(true);
    confettiAnims.forEach((anim) => anim.setValue(0));
    Animated.parallel(
      confettiAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        })
      )
    ).start(() => setShowConfetti(false));
  };

  const openPlanSheet = async (plan) => {
    setSelectedPlan(plan);
    setSheetVisible(true);
    try {
      if (Platform.OS === 'ios') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        await Haptics.selectionAsync();
      }
    } catch (_) {}
  };

  const closeSheet = () => {
    setSheetVisible(false);
  };

  const onPurchase = async (planId) => {
    setBuyingPlanId(planId);
    try {
      const result = await api.purchasePlan(planId);
      try {
        if (Platform.OS === 'ios') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch (_) {}
      runConfetti();
      Alert.alert('Başarılı', result?.message || 'Plan satın alındı.');
      await load();
      closeSheet();
    } catch (err) {
      try {
        if (Platform.OS === 'ios') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
      } catch (_) {}
      Alert.alert('Hata', err.message || 'Satın alma başarısız.');
    } finally {
      setBuyingPlanId(null);
    }
  };

  const beginHoldConfirm = () => {
    if (!selectedPlan || buyingPlanId) return;
    setHoldReady(false);
    holdAnim.setValue(0);
    Animated.timing(holdAnim, {
      toValue: 1,
      duration: 950,
      useNativeDriver: false,
    }).start(async ({ finished }) => {
      if (!finished || !selectedPlan) return;
      setHoldReady(true);
      try {
        if (Platform.OS === 'ios') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
        } else {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch (_) {}
      onPurchase(selectedPlan.id);
    });
  };

  const cancelHoldConfirm = () => {
    holdAnim.stopAnimation();
    holdAnim.setValue(0);
    setHoldProgress(0);
    setHoldReady(false);
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + 16 }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Satın Al</Text>
      <Text style={styles.subtitle}>Planını seç, bağlantını kesintisiz ve premium hale getir.</Text>

      <Animated.View style={[styles.statusCard, loading ? { opacity: skeletonPulse } : null]}>
        <Text style={styles.statusTitle}>Abonelik Durumu</Text>
        {loading ? (
          <View>
            <View style={styles.skeletonLineLarge} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLineShort} />
          </View>
        ) : (
          <>
            <Text style={styles.statusValue}>
              {subscription?.status === 'active' ? 'Aktif' : 'Pasif'}
            </Text>
            <Text style={styles.statusMeta}>
              Sağlayıcı: {subscription?.provider || 'Yok'}{'\n'}
              Yenileme: {subscription?.renew_at ? new Date(subscription.renew_at).toLocaleDateString() : '-'}
            </Text>
          </>
        )}
      </Animated.View>

      {loading ? (
        <>
          {[1, 2, 3].map((i) => (
            <Animated.View key={i} style={[styles.planCard, { opacity: skeletonPulse }]}>
              <View style={styles.skeletonLineLarge} />
              <View style={styles.skeletonLine} />
              <View style={styles.skeletonLineShort} />
              <View style={[styles.skeletonButton]} />
            </Animated.View>
          ))}
        </>
      ) : (
        <Animated.View style={{ opacity: contentFade }}>
          {plans.map((plan) => (
            <View key={plan.id} style={styles.planCard}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <Text style={styles.planPrice}>{formatPrice(plan.price, plan.currency)}</Text>
              <Text style={styles.planMeta}>
                Dönem: {plan.period === 'year' ? 'Yıllık' : 'Aylık'} • Maks cihaz: {plan.maxDevices}
              </Text>
              <TouchableOpacity
                style={[styles.buyButton, buyingPlanId === plan.id && styles.buyButtonDisabled]}
                disabled={buyingPlanId === plan.id}
                onPress={() => openPlanSheet(plan)}
              >
                {buyingPlanId === plan.id ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.buyText}>Satın Al</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </Animated.View>
      )}

      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
      >
        <BlurView intensity={22} tint="dark" style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeSheet} />
        </BlurView>
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                {
                  translateY: sheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [320, 0],
                  }),
                },
              ],
              opacity: sheetAnim,
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Planı Onayla</Text>
          {selectedPlan ? (
            <View style={styles.sheetPlanCard}>
              <Text style={styles.planTitle}>{selectedPlan.title}</Text>
              <Text style={styles.planPrice}>{formatPrice(selectedPlan.price, selectedPlan.currency)}</Text>
              <Text style={styles.planMeta}>
                Dönem: {selectedPlan.period === 'year' ? 'Yıllık' : 'Aylık'} • Maks cihaz: {selectedPlan.maxDevices}
              </Text>
            </View>
          ) : null}
          <Pressable
            style={[styles.holdButton, (!selectedPlan || !!buyingPlanId) && styles.buyButtonDisabled]}
            disabled={!selectedPlan || !!buyingPlanId}
            onPressIn={beginHoldConfirm}
            onPressOut={cancelHoldConfirm}
          >
            <View style={[styles.holdProgressBar, { width: `${holdProgress * 100}%` }]} />
            {buyingPlanId ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.buyText}>{holdReady ? 'Onaylandı' : 'Basılı Tut ve Onayla'}</Text>
            )}
          </Pressable>
        </Animated.View>
      </Modal>

      {showConfetti ? (
        <View pointerEvents="none" style={styles.confettiLayer}>
          {confettiAnims.map((anim, i) => {
            const left = (i / confettiAnims.length) * screenWidth;
            const rotate = i % 2 === 0 ? '18deg' : '-18deg';
            return (
              <Animated.View
                key={`conf-${i}`}
                style={[
                  styles.confetti,
                  {
                    left,
                    backgroundColor: i % 3 === 0 ? colors.primary : i % 3 === 1 ? colors.secondary : colors.accent,
                    transform: [
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-30, 520 + i * 6],
                        }),
                      },
                      {
                        translateX: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, (i % 2 === 0 ? 1 : -1) * 40],
                        }),
                      },
                      { rotate },
                    ],
                    opacity: anim.interpolate({
                      inputRange: [0, 0.8, 1],
                      outputRange: [1, 1, 0],
                    }),
                  },
                ]}
              />
            );
          })}
        </View>
      ) : null}
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
    paddingBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    color: colors.textSecondary,
    fontSize: 15,
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  statusTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  statusValue: {
    color: colors.success,
    fontSize: 20,
    fontWeight: '700',
  },
  statusMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  planTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  planPrice: {
    color: colors.accent,
    marginTop: 6,
    fontSize: 22,
    fontWeight: '700',
  },
  planMeta: {
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 12,
  },
  buyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buyButtonDisabled: {
    opacity: 0.75,
  },
  buyText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  skeletonLineLarge: {
    height: 20,
    borderRadius: 8,
    backgroundColor: colors.cardBorder,
    marginBottom: 10,
    width: '65%',
  },
  skeletonLine: {
    height: 14,
    borderRadius: 8,
    backgroundColor: colors.cardBorder,
    marginBottom: 8,
    width: '90%',
  },
  skeletonLineShort: {
    height: 14,
    borderRadius: 8,
    backgroundColor: colors.cardBorder,
    width: '50%',
  },
  skeletonButton: {
    marginTop: 14,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.cardBorder,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    marginTop: 'auto',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 99,
    backgroundColor: colors.textMuted,
    marginBottom: 12,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sheetPlanCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
  },
  sheetCta: {
    marginTop: 14,
  },
  holdButton: {
    marginTop: 14,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  holdProgressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(7,11,20,0.2)',
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  confetti: {
    position: 'absolute',
    top: -20,
    width: 10,
    height: 16,
    borderRadius: 2,
  },
});

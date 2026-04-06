import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { VPNProvider } from './src/context/VPNContext';
import HomeScreen from './src/screens/HomeScreen';
import ServersScreen from './src/screens/ServersScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LoginScreen from './src/screens/LoginScreen';
import PurchaseScreen from './src/screens/PurchaseScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { colors } from './src/theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const ONBOARDING_KEY = '@vpn_onboarding_seen';

function TabIcon({ name, focused }) {
  const icons = { Home: '🛡️', Servers: '🌐', Settings: '⚙️' };
  return <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icons[name]}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Ana Sayfa' }} />
      <Tab.Screen name="Servers" component={ServersScreen} options={{ tabBarLabel: 'Sunucular' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Ayarlar' }} />
    </Tab.Navigator>
  );
}

function MainApp() {
  const { token, loading } = useAuth();
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((seen) => {
        if (!active) return;
        setShowOnboarding(!seen);
      })
      .finally(() => {
        if (!active) return;
        setOnboardingReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  };

  if (loading || !onboardingReady) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (showOnboarding) {
    return <OnboardingScreen onContinue={completeOnboarding} />;
  }
  if (!token) {
    return <LoginScreen />;
  }
  return (
    <VPNProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
            animationDuration: 260,
          }}
        >
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Purchase"
            component={PurchaseScreen}
            options={{ title: 'Satın Al' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </VPNProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.cardBorder,
    borderTopWidth: 1,
    paddingTop: 10,
    height: 76,
    paddingBottom: 10,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabIcon: {
    fontSize: 21,
    opacity: 0.65,
  },
  tabIconFocused: {
    opacity: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

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
import LogsScreen from './src/screens/LogsScreen';
import { sentinel } from './src/theme/sentinel';
import { initApiConfig } from './src/api/client';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const ONBOARDING_KEY = '@vpn_onboarding_seen';

function TabIcon({ name, focused }) {
  const icons = {
    Home: '📊',
    Servers: '🌐',
    Security: '🛡️',
    Logs: '📋',
  };
  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused, focused && styles.tabIconActive]}>
      {icons[name]}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: sentinel.neon,
        tabBarInactiveTintColor: sentinel.textLabel,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'DASHBOARD' }} />
      <Tab.Screen name="Servers" component={ServersScreen} options={{ tabBarLabel: 'SERVERS' }} />
      <Tab.Screen name="Security" component={SettingsScreen} options={{ tabBarLabel: 'SECURITY' }} />
      <Tab.Screen name="Logs" component={LogsScreen} options={{ tabBarLabel: 'LOGS' }} />
    </Tab.Navigator>
  );
}

function MainApp() {
  const { token, loading } = useAuth();
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(ONBOARDING_KEY), initApiConfig()])
      .then(([seen]) => {
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
        <ActivityIndicator size="large" color={sentinel.neon} />
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
            headerStyle: { backgroundColor: sentinel.bg },
            headerTintColor: sentinel.text,
            contentStyle: { backgroundColor: sentinel.bg },
            animation: 'slide_from_right',
            animationDuration: 260,
          }}
        >
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
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
    backgroundColor: sentinel.tabBar,
    borderTopColor: sentinel.cardBorder,
    borderTopWidth: 1,
    paddingTop: 12,
    height: 86,
    paddingBottom: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.55,
  },
  tabIconFocused: {
    opacity: 1,
  },
  tabIconActive: {
    textShadowColor: sentinel.neonGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sentinel.bg,
  },
});

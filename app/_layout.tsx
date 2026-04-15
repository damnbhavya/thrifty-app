import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProfileProvider, useProfile } from '@/contexts/ProfileContext';
import { OverridesProvider } from '@/contexts/OverridesContext';
import { TransactionsProvider } from '@/contexts/TransactionsContext';
import { MockBankProvider } from '@/contexts/MockBankContext';
import { Colors } from '@/constants/Colors';
import AnimatedSplash from '@/components/AnimatedSplash';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ProfileProvider>
        <OverridesProvider>
          <MockBankProvider>
            <TransactionsProvider>
              <RootLayoutNav />
              <StatusBar style="light" />
            </TransactionsProvider>
          </MockBankProvider>
        </OverridesProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { user, loading: authLoading } = useAuth();
  const { hasCompletedOnboarding, loading: profileLoading } = useProfile();
  const segments = useSegments();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const hasNavigated = useRef(false);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  const isLoading = authLoading || (user ? profileLoading : false);

  // Navigate after auth + profile are resolved (happens silently behind the splash screen)
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onOnboarding = segments[0] === 'onboarding';

    if (!user) {
      // Not logged in → go to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      hasNavigated.current = true;
    } else if (!hasCompletedOnboarding) {
      // Logged in but hasn't onboarded → go to onboarding
      if (!onOnboarding) {
        router.replace('/onboarding');
      }
      hasNavigated.current = true;
    } else {
      // Logged in + onboarded → go to home
      if (inAuthGroup || onOnboarding) {
        router.replace('/(tabs)');
      } else if (!hasNavigated.current) {
        router.replace('/(tabs)');
      }
      hasNavigated.current = true;
    }
  }, [user, isLoading, showSplash, segments, hasCompletedOnboarding]);

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
          animationDuration: 150,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="pay" />
      </Stack>

      {/* Splash covers everything until auth + profile resolve */}
      {(showSplash || isLoading) && <AnimatedSplash onFinish={handleSplashFinish} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

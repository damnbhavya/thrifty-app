import { Stack } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';

/**
 * Auth group layout — Login, Sign Up screens.
 * No tab bar, clean stack navigation.
 */
export default function AuthLayout() {
  const C = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}

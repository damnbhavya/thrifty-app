import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';

/**
 * Auth group layout — Login, Sign Up screens.
 * No tab bar, clean stack navigation with dark theme.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}

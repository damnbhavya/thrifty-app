import { Stack } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';

export default function PayLayout() {
  const C = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.background },
        animation: 'fade',
        animationDuration: 150,
      }}
    >
      <Stack.Screen
        name="processing"
        options={{ gestureEnabled: false }}
      />
    </Stack>
  );
}

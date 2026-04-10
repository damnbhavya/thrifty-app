import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function PayLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'fade',
        animationDuration: 150,
      }}
    />
  );
}

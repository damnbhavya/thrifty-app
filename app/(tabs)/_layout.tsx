import React from 'react';
import { Tabs } from 'expo-router';
import { Fonts, FontSizes } from '@/constants/Typography';
import { useColors } from '@/contexts/ThemeContext';
import AnimatedTabBar from '@/components/AnimatedTabBar';

export default function TabLayout() {
  const C = useColors();
  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        lazy: false,
        headerStyle: {
          backgroundColor: C.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        },
        headerTitleStyle: {
          fontFamily: Fonts.bold,
          fontSize: FontSizes.md,
          color: C.textPrimary,
        },
        headerTintColor: C.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ title: 'Analytics' }}
      />
      <Tabs.Screen
        name="transactions"
        options={{ title: 'Transactions' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile' }}
      />
    </Tabs>
  );
}

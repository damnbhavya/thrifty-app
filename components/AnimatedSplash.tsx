import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  interpolateColor,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Logo from '@/components/Logo';
import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashProps {
  onFinish: () => void;
}

/**
 * Animated splash screen:
 * 1. Logo appears centered on dark background
 * 2. Logo scales up slightly
 * 3. Background transitions from dark (#111111) → lime (#CDF12B)
 * 4. Logo color changes to dark as background goes lime
 * 5. Whole screen fades out
 */
export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  // Animation progress: 0 = dark bg, 1 = lime bg
  const bgProgress = useSharedValue(0);
  // Logo scale
  const logoScale = useSharedValue(0.8);
  // Overall opacity for fade out
  const fadeOut = useSharedValue(1);

  useEffect(() => {
    // Phase 1: Logo scales in (0 → 400ms)
    logoScale.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });

    // Phase 2: Hold for a moment, then background transitions to lime (600ms → 1400ms)
    bgProgress.value = withDelay(
      600,
      withTiming(1, {
        duration: 800,
        easing: Easing.inOut(Easing.cubic),
      })
    );

    // Phase 3: Fade everything out (1800ms → 2300ms)
    fadeOut.value = withDelay(
      1800,
      withTiming(0, {
        duration: 500,
        easing: Easing.in(Easing.cubic),
      }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      })
    );
  }, []);

  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      [Colors.background, Colors.primary]
    ),
    opacity: fadeOut.value,
  }));

  const logoContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  // Logo color: lime on dark bg → dark on lime bg
  const logoColor = useSharedValue(Colors.primary);

  const animatedLogoStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      bgProgress.value,
      [0, 1],
      [Colors.primary, Colors.primaryText]
    );
    return { color };
  });

  return (
    <Animated.View style={[styles.container, backgroundStyle]}>
      <Animated.View style={[styles.logoContainer, logoContainerStyle]}>
        <LogoWithAnimatedColor bgProgress={bgProgress} />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Wrapper to animate the SVG logo color based on background transition.
 * Since SVG fill can't be directly animated via useAnimatedStyle,
 * we use a crossfade approach with two logos.
 */
function LogoWithAnimatedColor({ bgProgress }: { bgProgress: Animated.SharedValue<number> }) {
  // Lime logo (visible on dark bg) fades out
  const limeLogoStyle = useAnimatedStyle(() => ({
    opacity: 1 - bgProgress.value,
    position: 'absolute' as const,
  }));

  // Dark logo (visible on lime bg) fades in
  const darkLogoStyle = useAnimatedStyle(() => ({
    opacity: bgProgress.value,
    position: 'absolute' as const,
  }));

  return (
    <View style={styles.logoStack}>
      <Animated.View style={limeLogoStyle}>
        <Logo size={80} color={Colors.primary} />
      </Animated.View>
      <Animated.View style={darkLogoStyle}>
        <Logo size={80} color={Colors.primaryText} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    elevation: 999,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoStack: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

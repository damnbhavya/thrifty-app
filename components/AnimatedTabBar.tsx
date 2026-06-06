import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '@/constants/Colors';
import { useColors } from '@/contexts/ThemeContext';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const TAB_ICONS: IconName[] = ['home', 'insights', 'receipt-long', 'person'];
const ICON_SIZE = 26;
const PILL_HEIGHT = 40;
const PILL_BORDER_RADIUS = 20;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const pillX = useSharedValue(0);
  const tabWidth = useSharedValue(0);

  // Measure tab width on layout
  const onBarLayout = (e: LayoutChangeEvent) => {
    const totalWidth = e.nativeEvent.layout.width - 32; // minus horizontal padding
    const singleTab = totalWidth / state.routes.length;
    tabWidth.value = singleTab;
    // Set initial pill position without animation
    pillX.value = state.index * singleTab;
  };

  // Animate pill to active tab
  useEffect(() => {
    if (tabWidth.value > 0) {
      pillX.value = withSpring(state.index * tabWidth.value, SPRING_CONFIG);
    }
  }, [state.index]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: tabWidth.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: C.tabBar, paddingBottom: insets.bottom, borderTopColor: C.tabBarBorder }]}>
      <View style={styles.bar} onLayout={onBarLayout}>
        {/* Animated pill background */}
        <Animated.View style={[styles.pillContainer, pillStyle]}>
          <View style={styles.pill} />
        </Animated.View>

        {/* Tab buttons */}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
            >
              <MaterialIcons
                name={TAB_ICONS[index]}
                size={ICON_SIZE}
                color={isFocused ? C.primary : C.textMuted}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: Colors.tabBarBorder,
  },
  bar: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pillContainer: {
    position: 'absolute',
    top: 0,
    left: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pill: {
    width: '65%',
    height: PILL_HEIGHT,
    borderRadius: PILL_BORDER_RADIUS,
    backgroundColor: 'rgba(205, 241, 43, 0.15)',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

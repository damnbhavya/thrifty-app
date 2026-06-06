import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, StyleProp, ViewStyle } from 'react-native';
import { useColors } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

export interface ThriftyModalProps {
  visible: boolean;
  title: string;
  message: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onClose?: () => void;
  icon?: React.ReactNode;
}

export default function ThriftyModal({
  visible,
  title,
  message,
  primaryActionLabel = 'OK',
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  onClose,
  icon,
}: ThriftyModalProps) {
  const C = useColors();

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose || onSecondaryAction || onPrimaryAction}
    >
      <View style={styles.overlay}>
        <Animated.View 
          entering={SlideInDown.duration(300).springify()} 
          style={[styles.container, { backgroundColor: C.surface, borderColor: C.border }]}
        >
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          
          <Text style={[styles.title, { color: C.textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: C.textSecondary }]}>{message}</Text>
          
          <View style={styles.actions}>
            {secondaryActionLabel && (
              <Pressable
                style={({ pressed }) => [
                  styles.button, 
                  styles.secondaryButton,
                  { borderColor: C.border },
                  pressed && { backgroundColor: C.surfaceElevated }
                ]}
                onPress={onSecondaryAction}
              >
                <Text style={[styles.secondaryButtonText, { color: C.textSecondary }]}>{secondaryActionLabel}</Text>
              </Pressable>
            )}
            
            <Pressable
              style={({ pressed }) => [
                styles.button, 
                styles.primaryButton,
                { backgroundColor: C.primary },
                pressed && { backgroundColor: C.primaryDark }
              ]}
              onPress={onPrimaryAction}
            >
              <Text style={[styles.primaryButtonText, { color: C.primaryText }]}>{primaryActionLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
  },
  primaryButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
});

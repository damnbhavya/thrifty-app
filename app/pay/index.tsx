import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { Fonts, FontSizes } from '@/constants/Typography';
import { fetchCurrentMonthReport } from '@/lib/api';
import type { Transaction } from '@/lib/api';

export default function PayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [upiId, setUpiId] = useState('');
  const [recentPayees, setRecentPayees] = useState<string[]>([]);

  useEffect(() => {
    loadRecentPayees();
  }, []);

  const loadRecentPayees = async () => {
    try {
      const report = await fetchCurrentMonthReport();
      if (report?.transactions) {
        // Extract unique merchant names
        const seen = new Set<string>();
        const payees: string[] = [];
        for (const txn of report.transactions) {
          const name = txn.merchant;
          if (!seen.has(name)) {
            seen.add(name);
            payees.push(name);
          }
          if (payees.length >= 10) break;
        }
        setRecentPayees(payees);
      }
    } catch (error) {
      console.error('Error loading recent payees:', error);
    }
  };

  const handlePayWithUpi = () => {
    if (!upiId.trim()) return;
    router.push({
      pathname: '/pay/confirm',
      params: { payee: upiId.trim(), upiId: upiId.trim() },
    });
  };

  const handleSelectPayee = (payeeName: string) => {
    router.push({
      pathname: '/pay/confirm',
      params: { payee: payeeName, upiId: '' },
    });
  };

  const handleScanQR = () => {
    router.push('/pay/scan');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Pay</Text>
        <View style={styles.backButton} />
      </View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInUp.duration(300).delay(100)} style={styles.actionsRow}>
        <Pressable
          style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          onPress={handleScanQR}
        >
          <View style={styles.actionIconCircle}>
            <MaterialIcons name="qr-code-scanner" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.actionTitle}>Scan QR Code</Text>
          <Text style={styles.actionHint}>Point camera at a UPI QR</Text>
        </Pressable>
      </Animated.View>

      {/* UPI ID Input */}
      <Animated.View entering={FadeInUp.duration(300).delay(200)} style={styles.section}>
        <Text style={styles.sectionLabel}>ENTER UPI ID</Text>
        <View style={styles.upiInputRow}>
          <View style={styles.upiInputWrapper}>
            <MaterialIcons name="alternate-email" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.upiInput}
              placeholder="name@upi or phone@paytm"
              placeholderTextColor={Colors.textMuted}
              value={upiId}
              onChangeText={setUpiId}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="go"
              onSubmitEditing={handlePayWithUpi}
            />
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.goButton,
              pressed && styles.goButtonPressed,
              !upiId.trim() && styles.goButtonDisabled,
            ]}
            onPress={handlePayWithUpi}
            disabled={!upiId.trim()}
          >
            <MaterialIcons name="arrow-forward" size={20} color={Colors.primaryText} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Recent Payees */}
      {recentPayees.length > 0 && (
        <Animated.View entering={FadeInUp.duration(300).delay(300)} style={styles.recentSection}>
          <Text style={styles.sectionLabel}>RECENT PAYEES</Text>
          <FlatList
            data={recentPayees}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.payeeRow,
                  pressed && styles.payeeRowPressed,
                ]}
                onPress={() => handleSelectPayee(item)}
              >
                <View style={styles.payeeAvatar}>
                  <Text style={styles.payeeAvatarText}>
                    {item.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.payeeName} numberOfLines={1}>{item}</Text>
                <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
              </Pressable>
            )}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
  },
  actionsRow: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
  },
  actionCardPressed: {
    backgroundColor: Colors.surfaceElevated,
    transform: [{ scale: 0.98 }],
  },
  actionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(205, 241, 43, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  actionHint: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.84,
    marginBottom: 12,
  },
  upiInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  upiInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  upiInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    paddingVertical: 14,
  },
  goButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.95 }],
  },
  goButtonDisabled: {
    opacity: 0.4,
  },
  recentSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  payeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  payeeRowPressed: {
    opacity: 0.7,
  },
  payeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payeeAvatarText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  payeeName: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
});

import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { Fonts, FontSizes } from '@/constants/Typography';
import { CATEGORIES, CATEGORY_MAP } from '@/constants/Categories';
import { useProfile } from '@/contexts/ProfileContext';
import { useOverrides } from '@/contexts/OverridesContext';
import { useTransactions } from '@/contexts/TransactionsContext';
import UpiAppLauncher, { LaunchResult } from '@lokal-dev/react-native-upi-app-launcher';
import { fetchWithAuth } from '@/lib/api';

function formatCurrency(amount: number): string {
  return '₹ ' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function ConfirmPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ payee: string; upiId: string; amount?: string }>();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { getCategoryForMerchant } = useOverrides();
  const { addTransaction } = useTransactions();

  const payeeName = params.payee || 'Unknown';
  const payeeUpi = params.upiId || '';

  const [amount, setAmount] = useState(params.amount || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('other');
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);

  // Resolve category: override > default
  useEffect(() => {
    const override = getCategoryForMerchant(payeeName);
    if (override) {
      setSelectedCategory(override);
    }
  }, [payeeName, getCategoryForMerchant]);

  // Budget calculations
  const budget = profile?.global_budget || 0;
  const amountNum = parseFloat(amount.replace(/,/g, '')) || 0;
  const remaining = Math.max(budget - amountNum, 0);
  const wouldExceed = amountNum > 0 && budget > 0 && amountNum > budget;

  // Animated balance drain
  const balanceOpacity = useSharedValue(1);
  const balanceScale = useSharedValue(1);

  useEffect(() => {
    if (wouldExceed) {
      balanceOpacity.value = withTiming(1, { duration: 200 });
      balanceScale.value = withTiming(1.02, { duration: 200 });
    } else {
      balanceOpacity.value = withTiming(1, { duration: 200 });
      balanceScale.value = withTiming(1, { duration: 200 });
    }
  }, [wouldExceed]);

  const balanceAnimStyle = useAnimatedStyle(() => ({
    opacity: balanceOpacity.value,
    transform: [{ scale: balanceScale.value }],
  }));

  const handlePay = async () => {
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount');
      return;
    }

    setProcessing(true);

    try {
      // 1. Launch Native UPI Choose
      const upiUrl = `upi://pay?pa=${encodeURIComponent(payeeUpi)}&pn=${encodeURIComponent(payeeName)}&am=${amountNum}&cu=INR&tn=Payment via Thrifty`;
      
      const result = await UpiAppLauncher.launchUpiApp({ url: upiUrl });
      
      // We process success or submitted (if pending). 
      // If it failed or cancelled, we alert the user instead of recording a failed payment immediately.
      if (result.result !== LaunchResult.Success && result.result !== LaunchResult.Submitted) {
        Alert.alert('Payment Cancelled', 'The transaction was cancelled or failed.');
        setProcessing(false);
        return;
      }

      // 2. Report to backend
      const response = await fetchWithAuth('/pay/log', {
        method: 'POST',
        body: JSON.stringify({
          amount: amountNum,
          paid_to: payeeName,
          category: selectedCategory,
          note: note,
          transaction_ref: result.transactionId || '',
          status: result.result === LaunchResult.Success ? 'success' : 'pending'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log transaction on server');
      }

      // 3. Fallback tracking logic if they don't have realtime yet
      addTransaction({
        merchant: payeeName,
        amount: amountNum,
        type: 'debit',
        category: selectedCategory,
      });

      // Navigate to success
      router.replace({
        pathname: '/pay/result',
        params: {
          status: result.result === LaunchResult.Success ? 'success' : 'pending',
          amount: amountNum.toString(),
          payee: payeeName,
          category: selectedCategory,
        },
      });

    } catch (error) {
      console.error('Error during native payment:', error);
      Alert.alert('Error', 'Payment failed to process on device.');
    } finally {
      setProcessing(false);
    }
  };

  const selectedCatConfig = CATEGORY_MAP[selectedCategory] || CATEGORY_MAP['other'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Payee Info */}
        <Animated.View entering={FadeInUp.duration(300).delay(100)} style={styles.payeeCard}>
          <View style={styles.payeeAvatar}>
            <Text style={styles.payeeAvatarText}>
              {payeeName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.payeeName}>{payeeName}</Text>
          {payeeUpi ? <Text style={styles.payeeUpi}>{payeeUpi}</Text> : null}
        </Animated.View>

        {/* Amount Input */}
        <Animated.View entering={FadeInUp.duration(300).delay(200)} style={styles.amountCard}>
          <Text style={styles.sectionLabel}>AMOUNT</Text>
          <View style={styles.amountRow}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              autoFocus
            />
          </View>

          {/* Balance drain indicator */}
          {budget > 0 && amountNum > 0 && (
            <Animated.View style={[styles.balanceDrain, balanceAnimStyle]}>
              <View style={styles.balanceDrainRow}>
                <Text style={styles.balanceDrainLabel}>Remaining after payment</Text>
                <Text
                  style={[
                    styles.balanceDrainValue,
                    wouldExceed && styles.balanceDrainDanger,
                  ]}
                >
                  {formatCurrency(remaining)}
                </Text>
              </View>
              {wouldExceed && (
                <View style={styles.warningBanner}>
                  <MaterialIcons name="warning" size={16} color={Colors.danger} />
                  <Text style={styles.warningText}>
                    This payment exceeds your monthly budget
                  </Text>
                </View>
              )}
            </Animated.View>
          )}
        </Animated.View>

        {/* Category Selector */}
        <Animated.View entering={FadeInUp.duration(300).delay(300)}>
          <Text style={[styles.sectionLabel, styles.sectionLabelPadded]}>CATEGORY</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = cat.key === selectedCategory;
              return (
                <Pressable
                  key={cat.key}
                  style={[
                    styles.chip,
                    isSelected && { backgroundColor: cat.color + '20', borderColor: cat.color },
                  ]}
                  onPress={() => setSelectedCategory(cat.key)}
                >
                  <MaterialIcons
                    name={cat.icon as any}
                    size={16}
                    color={isSelected ? cat.color : Colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && { color: cat.color, fontFamily: Fonts.semiBold },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Note */}
        <Animated.View entering={FadeInUp.duration(300).delay(400)} style={styles.noteSection}>
          <Text style={styles.sectionLabel}>NOTE (OPTIONAL)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Add a note..."
            placeholderTextColor={Colors.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={100}
          />
        </Animated.View>
      </ScrollView>

      {/* Pay Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          style={({ pressed }) => [
            styles.payButton,
            pressed && styles.payButtonPressed,
            processing && styles.payButtonDisabled,
            wouldExceed && styles.payButtonWarning,
          ]}
          onPress={handlePay}
          disabled={processing || !amountNum}
        >
          {processing ? (
            <ActivityIndicator color={Colors.primaryText} size="small" />
          ) : (
            <>
              <MaterialIcons name="lock" size={18} color={Colors.primaryText} />
              <Text style={styles.payButtonText}>
                {amountNum > 0 ? `Pay ${formatCurrency(amountNum)}` : 'Enter Amount'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  // Payee
  payeeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  payeeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  payeeAvatarText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.textSecondary,
  },
  payeeName: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  payeeUpi: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  // Amount
  amountCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.84,
    marginBottom: 12,
  },
  sectionLabelPadded: {
    paddingHorizontal: 0,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rupeeSymbol: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes['3xl'],
    color: Colors.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: FontSizes['4xl'],
    color: Colors.textPrimary,
    paddingVertical: 4,
  },
  balanceDrain: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  balanceDrainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceDrainLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  balanceDrainValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.success,
  },
  balanceDrainDanger: {
    color: Colors.danger,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  warningText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.danger,
    flex: 1,
  },
  // Categories
  chipsRow: {
    paddingBottom: 4,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  chipText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  // Note
  noteSection: {
    marginTop: 20,
  },
  noteInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  payButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonWarning: {
    backgroundColor: Colors.danger,
  },
  payButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.primaryText,
  },
});

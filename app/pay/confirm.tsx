import { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useColors } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';
import { CATEGORIES, CATEGORY_MAP } from '@/constants/Categories';
import { useProfile } from '@/contexts/ProfileContext';
import { useOverrides } from '@/contexts/OverridesContext';
import UPI from '@/lib/upi';

function formatCurrency(amount: number): string {
  return '₹ ' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function ConfirmPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ payee: string; upiId: string; amount?: string }>();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { getCategoryForMerchant } = useOverrides();
  const C = useColors();

  const payeeName = params.payee || 'Unknown';
  const payeeUpi = params.upiId || '';

  const [amount, setAmount] = useState(params.amount || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('other');
  const [note, setNote] = useState('');
  const [navigating, setNavigating] = useState(false);

  useFocusEffect(useCallback(() => { setNavigating(false); }, []));

  useEffect(() => {
    const override = getCategoryForMerchant(payeeName);
    if (override) setSelectedCategory(override);
  }, [payeeName, getCategoryForMerchant]);

  const budget = profile?.global_budget || 0;
  const amountNum = parseFloat(amount.replace(/,/g, '')) || 0;
  const remaining = Math.max(budget - amountNum, 0);
  const wouldExceed = amountNum > 0 && budget > 0 && amountNum > budget;

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
    if (navigating) return;
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount');
      return;
    }

    setNavigating(true);
    router.push({
      pathname: '/pay/processing',
      params: { 
        amount: amountNum.toString(), 
        payee: payeeName, 
        upiId: payeeUpi, 
        category: selectedCategory, 
        note
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={C.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Payment</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Payee */}
        <Animated.View entering={FadeInUp.duration(300).delay(100)} style={[styles.payeeCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.payeeAvatar, { backgroundColor: C.surfaceElevated }]}>
            <Text style={[styles.payeeAvatarText, { color: C.textSecondary }]}>{payeeName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.payeeName, { color: C.textPrimary }]}>{payeeName}</Text>
          {payeeUpi ? <Text style={[styles.payeeUpi, { color: C.textMuted }]}>{payeeUpi}</Text> : null}
        </Animated.View>


        {/* Amount */}
        <Animated.View entering={FadeInUp.duration(300).delay(200)} style={[styles.amountCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.sectionLabel, { color: C.primary }]}>AMOUNT</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.rupeeSymbol, { color: C.primary }]}>₹</Text>
            <TextInput style={[styles.amountInput, { color: C.textPrimary }]} placeholder="0" placeholderTextColor={C.textMuted} value={amount} onChangeText={setAmount} keyboardType="numeric" autoFocus />
          </View>

          {amountNum > 0 && (
            <Animated.View style={[styles.balanceDrain, { borderTopColor: C.border }, balanceAnimStyle]}>
              {budget > 0 && (
                <View style={[styles.balanceDrainRow, { marginTop: 0 }]}>
                  <Text style={[styles.balanceDrainLabel, { color: C.textSecondary }]}>Budget remaining</Text>
                  <Text style={[styles.balanceDrainValue, { color: wouldExceed ? C.danger : C.success }]}>{formatCurrency(remaining)}</Text>
                </View>
              )}
              {wouldExceed && (
                <View style={styles.warningBanner}>
                  <MaterialIcons name="warning" size={16} color={C.danger} />
                  <Text style={[styles.warningText, { color: C.danger }]}>This payment exceeds your monthly budget</Text>
                </View>
              )}
            </Animated.View>
          )}
        </Animated.View>

        {/* Category */}
        <Animated.View entering={FadeInUp.duration(300).delay(300)}>
          <Text style={[styles.sectionLabel, styles.sectionLabelPadded, { color: C.primary }]}>CATEGORY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {CATEGORIES.map((cat) => {
              const isSelected = cat.key === selectedCategory;
              return (
                <Pressable key={cat.key} style={[styles.chip, { backgroundColor: C.surface, borderColor: C.border }, isSelected && { backgroundColor: cat.color + '20', borderColor: cat.color }]} onPress={() => setSelectedCategory(cat.key)}>
                  <MaterialIcons name={cat.icon as any} size={16} color={isSelected ? cat.color : C.textMuted} />
                  <Text style={[styles.chipText, { color: C.textSecondary }, isSelected && { color: cat.color, fontFamily: Fonts.semiBold }]}>{cat.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Note */}
        <Animated.View entering={FadeInUp.duration(300).delay(400)} style={styles.noteSection}>
          <Text style={[styles.sectionLabel, { color: C.primary }]}>NOTE (OPTIONAL)</Text>
          <TextInput style={[styles.noteInput, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]} placeholder="Add a note..." placeholderTextColor={C.textMuted} value={note} onChangeText={setNote} multiline maxLength={100} />
        </Animated.View>
      </ScrollView>

      {/* Pay Button */}
      <View style={[styles.bottomBar, { backgroundColor: C.background, borderTopColor: C.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          style={({ pressed }) => [
            styles.payButton, { backgroundColor: C.primary },
            pressed && { backgroundColor: C.primaryDark, transform: [{ scale: 0.98 }] },
            navigating && styles.payButtonDisabled,
            wouldExceed && { backgroundColor: C.danger },
          ]}
          onPress={handlePay}
          disabled={navigating || !amountNum}
        >
          <MaterialIcons name="lock" size={18} color={C.primaryText} />
          <Text style={[styles.payButtonText, { color: C.primaryText }]}>
            {amountNum > 0 ? `Pay ${formatCurrency(amountNum)}` : 'Enter Amount'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
  payeeCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 16 },
  payeeAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  payeeAvatarText: { fontFamily: Fonts.bold, fontSize: FontSizes.xl },
  payeeName: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, marginBottom: 2 },
  payeeUpi: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  amountCard: { borderRadius: 16, borderWidth: 1, padding: 24, marginBottom: 20 },
  sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.84, marginBottom: 12 },
  sectionLabelPadded: { paddingHorizontal: 0 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  rupeeSymbol: { fontFamily: Fonts.bold, fontSize: FontSizes['3xl'], marginRight: 8 },
  amountInput: { flex: 1, fontFamily: Fonts.bold, fontSize: FontSizes['4xl'], paddingVertical: 4 },
  phoneInputRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)', paddingVertical: 6 },
  phoneInput: { flex: 1, fontSize: FontSizes.md, paddingVertical: 4, letterSpacing: 1.5 },
  balanceDrain: { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  balanceDrainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceDrainLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  balanceDrainValue: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  warningBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 77, 77, 0.1)', borderRadius: 8, padding: 10, marginTop: 10, gap: 8 },
  warningText: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, flex: 1 },
  chipsRow: { paddingBottom: 4, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  chipText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  noteSection: { marginTop: 20 },
  noteInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontFamily: Fonts.regular, fontSize: FontSizes.base, minHeight: 60, textAlignVertical: 'top' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12 },
  payButton: { flexDirection: 'row', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  payButtonDisabled: { opacity: 0.5 },
  payButtonText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
});

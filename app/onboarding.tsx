import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Fonts, FontSizes } from '@/constants/Typography';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { updateProfile } = useProfile();

  const [income, setIncome] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = user?.user_metadata?.name || 'there';

  const handleSubmit = async () => {
    const incomeNum = income ? parseFloat(income.replace(/,/g, '')) : 0;
    const budgetNum = parseFloat(budget.replace(/,/g, ''));

    if (income && (isNaN(incomeNum) || incomeNum < 0)) {
      setError('Please enter a valid income amount');
      return;
    }

    if (!budget || isNaN(budgetNum) || budgetNum <= 0) {
      setError('Please enter a valid budget');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await updateProfile({
      monthly_income: incomeNum,
      global_budget: budgetNum,
      has_completed_onboarding: true,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Logo size={48} />
          <Text style={styles.welcomeTitle}>
            Welcome, <Text style={styles.nameHighlight}>{displayName}</Text>
          </Text>
          <Text style={styles.welcomeSubtext}>
            Let's set up your budget to help you{'\n'}track spending and save more.
          </Text>
        </View>

        {/* Setup Form */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>FINANCIAL SETUP</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monthly Income</Text>
            <Text style={styles.hint}>Optional — leave blank if not applicable</Text>
            <View style={styles.currencyInputWrapper}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.currencyInput}
                placeholder="50,000"
                placeholderTextColor={Colors.textMuted}
                value={income}
                onChangeText={setIncome}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monthly Budget</Text>
            <Text style={styles.hint}>How much you want to limit spending to</Text>
            <View style={styles.currencyInputWrapper}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.currencyInput}
                placeholder="30,000"
                placeholderTextColor={Colors.textMuted}
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
          </View>
        </View>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.primaryText} size="small" />
          ) : (
            <Text style={styles.buttonText}>Get Started</Text>
          )}
        </Pressable>

        <Text style={styles.footnote}>
          You can change these anytime in Settings
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    marginTop: 20,
    textAlign: 'center',
  },
  nameHighlight: {
    color: Colors.primary,
  },
  welcomeSubtext: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
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
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.danger,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  hint: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  currencyInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    marginRight: 8,
  },
  currencyInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.primaryText,
  },
  footnote: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
});

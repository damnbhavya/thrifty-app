import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { updateProfile } = useProfile();
  const C = useColors();

  const [income, setIncome] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const displayName = user?.user_metadata?.name || 'there';

  const handleSubmit = async () => {
    const incomeNum = income ? parseFloat(income.replace(/,/g, '')) : 0;
    const budgetNum = parseFloat(budget.replace(/,/g, ''));
    if (income && (isNaN(incomeNum) || incomeNum < 0)) { setError('Please enter a valid income amount'); return; }
    if (!budget || isNaN(budgetNum) || budgetNum <= 0) { setError('Please enter a valid budget'); return; }
    setLoading(true); setError(null);
    const { error: updateError } = await updateProfile({ monthly_income: incomeNum, global_budget: budgetNum, has_completed_onboarding: true });
    if (updateError) { setError(updateError.message); setLoading(false); } else { router.replace('/(tabs)'); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Logo size={48} />
          <Text style={[styles.welcomeTitle, { color: C.textPrimary }]}>
            Welcome, <Text style={{ color: C.primary }}>{displayName}</Text>
          </Text>
          <Text style={[styles.welcomeSubtext, { color: C.textSecondary }]}>
            Let's set up your budget to help you{'\n'}track spending and save more.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.sectionLabel, { color: C.primary }]}>FINANCIAL SETUP</Text>
          {error && (<View style={[styles.errorContainer, { borderColor: C.danger }]}><Text style={[styles.errorText, { color: C.danger }]}>{error}</Text></View>)}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: C.textPrimary }]}>Monthly Income</Text>
            <Text style={[styles.hint, { color: C.textMuted }]}>Optional — leave blank if not applicable</Text>
            <View style={[styles.currencyInputWrapper, { backgroundColor: C.background, borderColor: C.border }]}>
              <Text style={[styles.currencySymbol, { color: C.primary }]}>₹</Text>
              <TextInput style={[styles.currencyInput, { color: C.textPrimary }]} placeholder="50,000" placeholderTextColor={C.textMuted} value={income} onChangeText={setIncome} keyboardType="numeric" returnKeyType="next" />
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: C.textPrimary }]}>Monthly Budget</Text>
            <Text style={[styles.hint, { color: C.textMuted }]}>How much you want to limit spending to</Text>
            <View style={[styles.currencyInputWrapper, { backgroundColor: C.background, borderColor: C.border }]}>
              <Text style={[styles.currencySymbol, { color: C.primary }]}>₹</Text>
              <TextInput style={[styles.currencyInput, { color: C.textPrimary }]} placeholder="30,000" placeholderTextColor={C.textMuted} value={budget} onChangeText={setBudget} keyboardType="numeric" returnKeyType="done" onSubmitEditing={handleSubmit} />
            </View>
          </View>
        </View>

        <Pressable style={({ pressed }) => [styles.button, { backgroundColor: C.primary }, pressed && { backgroundColor: C.primaryDark, transform: [{ scale: 0.98 }] }, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={C.primaryText} size="small" /> : <Text style={[styles.buttonText, { color: C.primaryText }]}>Get Started</Text>}
        </Pressable>
        <Text style={[styles.footnote, { color: C.textMuted }]}>You can change these anytime in Settings</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  welcomeTitle: { fontFamily: Fonts.bold, fontSize: FontSizes['2xl'], marginTop: 20, textAlign: 'center' },
  welcomeSubtext: { fontFamily: Fonts.regular, fontSize: FontSizes.base, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  card: { borderRadius: 16, borderWidth: 1, padding: 24, marginBottom: 20 },
  sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.84, marginBottom: 20 },
  errorContainer: { backgroundColor: 'rgba(255, 77, 77, 0.1)', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  inputGroup: { marginBottom: 4 },
  label: { fontFamily: Fonts.semiBold, fontSize: FontSizes.base, marginBottom: 2 },
  hint: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, marginBottom: 10 },
  currencyInputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 16 },
  currencySymbol: { fontFamily: Fonts.semiBold, fontSize: FontSizes.lg, marginRight: 8 },
  currencyInput: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.lg, paddingVertical: 14 },
  divider: { height: 1, marginVertical: 16 },
  button: { borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.base },
  footnote: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, textAlign: 'center', marginTop: 16 },
});

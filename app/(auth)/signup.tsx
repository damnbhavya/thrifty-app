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
import { Link } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';
import Logo from '@/components/Logo';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const C = useColors();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signUpError } = await signUp(email, password, name);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={styles.successContainer}>
          <MaterialIcons name="mail-outline" size={48} color={C.primary} style={styles.successIcon} />
          <Text style={[styles.successTitle, { color: C.textPrimary }]}>Check your email</Text>
          <Text style={[styles.successText, { color: C.textSecondary }]}>
            We've sent a confirmation link to{'\n'}
            <Text style={{ color: C.primary, fontFamily: Fonts.semiBold }}>{email}</Text>
          </Text>
          <Text style={[styles.successHint, { color: C.textMuted }]}>
            Click the link in the email to activate your account, then come back to sign in.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable style={({ pressed }) => [styles.button, { backgroundColor: C.primary }, pressed && { backgroundColor: C.primaryDark, transform: [{ scale: 0.98 }] }]}>
              <Text style={[styles.buttonText, { color: C.primaryText }]}>Back to Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: C.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Logo size={40} />
          <Text style={[styles.logo, { color: C.primary }]}>Thrifty</Text>
        </View>

        <View style={[styles.form, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.textPrimary }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>Start tracking your spending</Text>

          {error && (
            <View style={[styles.errorContainer, { borderColor: C.danger }]}>
              <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: C.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.textPrimary }]}
              placeholder="Your name"
              placeholderTextColor={C.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: C.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.textPrimary }]}
              placeholder="you@example.com"
              placeholderTextColor={C.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: C.textSecondary }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.textPrimary }]}
              placeholder="Min. 6 characters"
              placeholderTextColor={C.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: C.textSecondary }]}>Confirm Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.textPrimary }]}
              placeholder="••••••••"
              placeholderTextColor={C.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: C.primary },
              pressed && { backgroundColor: C.primaryDark, transform: [{ scale: 0.98 }] },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.primaryText} size="small" />
            ) : (
              <Text style={[styles.buttonText, { color: C.primaryText }]}>Create Account</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: C.textSecondary }]}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={[styles.footerLink, { color: C.primary }]}>Sign In</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 36 },
  logo: { fontFamily: Fonts.bold, fontSize: FontSizes['3xl'], letterSpacing: -1 },
  form: { borderRadius: 16, borderWidth: 1, padding: 24 },
  title: { fontFamily: Fonts.bold, fontSize: FontSizes.xl, marginBottom: 4 },
  subtitle: { fontFamily: Fonts.regular, fontSize: FontSizes.base, marginBottom: 24 },
  errorContainer: { backgroundColor: 'rgba(255, 77, 77, 0.1)', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  inputGroup: { marginBottom: 16 },
  label: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontFamily: Fonts.regular, fontSize: FontSizes.base },
  button: { borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.base },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  footerLink: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.xl, marginBottom: 12 },
  successText: { fontFamily: Fonts.regular, fontSize: FontSizes.base, textAlign: 'center', lineHeight: 22 },
  successHint: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, textAlign: 'center', marginTop: 16, marginBottom: 32, lineHeight: 20 },
});

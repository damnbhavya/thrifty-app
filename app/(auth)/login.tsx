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
import { Link, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';
import Logo from '@/components/Logo';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const C = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: C.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Logo size={40} />
          <Text style={[styles.logo, { color: C.primary }]}>Thrifty</Text>
        </View>

        {/* Form */}
        <View style={[styles.form, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.textPrimary }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>Sign in to your account</Text>

          {error && (
            <View style={[styles.errorContainer, { borderColor: C.danger }]}>
              <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
            </View>
          )}

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
              placeholder="••••••••"
              placeholderTextColor={C.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: C.primary },
              pressed && { backgroundColor: C.primaryDark, transform: [{ scale: 0.98 }] },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.primaryText} size="small" />
            ) : (
              <Text style={[styles.buttonText, { color: C.primaryText }]}>Sign In</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: C.textSecondary }]}>Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <Pressable>
                <Text style={[styles.footerLink, { color: C.primary }]}>Sign Up</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 48,
  },
  logo: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes['3xl'],
    letterSpacing: -1,
  },
  form: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
  },
  footerLink: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
  },
});

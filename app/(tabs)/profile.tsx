import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import { useColors, useTheme } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

function formatCurrency(amount: number): string {
  if (!amount || amount === 0) return 'Not set';
  return '₹ ' + amount.toLocaleString('en-IN');
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { mode, setMode, isDark } = useTheme();
  const C = useColors();

  const displayName = profile?.name || user?.user_metadata?.name || 'User';
  const email = user?.email || '';

  // Edit state
  const [editingField, setEditingField] = useState<'income' | 'budget' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (field: 'income' | 'budget') => {
    const currentValue = field === 'income'
      ? profile?.monthly_income
      : profile?.global_budget;
    setEditValue(currentValue ? currentValue.toString() : '');
    setEditingField(field);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    const numValue = parseFloat(editValue.replace(/,/g, ''));
    if (isNaN(numValue) || numValue < 0) {
      Alert.alert('Invalid value', 'Please enter a valid amount');
      return;
    }

    setSaving(true);
    const data = editingField === 'income'
      ? { monthly_income: numValue }
      : { global_budget: numValue };

    const { error } = await updateProfile(data);
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setEditingField(null);
      setEditValue('');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={[styles.avatar, { backgroundColor: C.primary }]}>
          <Text style={[styles.avatarText, { color: C.primaryText }]}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: C.textPrimary }]}>{displayName}</Text>
        <Text style={[styles.email, { color: C.textSecondary }]}>{email}</Text>
      </View>

      {/* Financial Settings */}
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[styles.sectionLabel, { color: C.primary }]}>FINANCIAL SETTINGS</Text>

        {/* Monthly Income */}
        <Pressable style={styles.settingRow} onPress={() => startEdit('income')}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="account-balance-wallet" size={20} color={C.textMuted} />
            <Text style={[styles.settingLabel, { color: C.textPrimary }]}>Monthly Income</Text>
          </View>
          {editingField === 'income' ? (
            <View style={styles.editRow}>
              <TextInput
                style={[styles.editInput, { backgroundColor: C.background, borderColor: C.primary, color: C.textPrimary }]}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="numeric"
                autoFocus
                selectTextOnFocus
              />
              {saving ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <>
                  <Pressable onPress={saveEdit} style={styles.editButton}>
                    <MaterialIcons name="check" size={20} color={C.primary} />
                  </Pressable>
                  <Pressable onPress={cancelEdit} style={styles.editButton}>
                    <MaterialIcons name="close" size={20} color={C.textMuted} />
                  </Pressable>
                </>
              )}
            </View>
          ) : (
            <View style={styles.settingRight}>
              <Text style={[styles.settingValue, { color: C.textSecondary }]}>
                {formatCurrency(profile?.monthly_income || 0)}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
            </View>
          )}
        </Pressable>

        <View style={[styles.divider, { backgroundColor: C.border }]} />

        {/* Global Budget */}
        <Pressable style={styles.settingRow} onPress={() => startEdit('budget')}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="savings" size={20} color={C.textMuted} />
            <Text style={[styles.settingLabel, { color: C.textPrimary }]}>Monthly Budget</Text>
          </View>
          {editingField === 'budget' ? (
            <View style={styles.editRow}>
              <TextInput
                style={[styles.editInput, { backgroundColor: C.background, borderColor: C.primary, color: C.textPrimary }]}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="numeric"
                autoFocus
                selectTextOnFocus
              />
              {saving ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <>
                  <Pressable onPress={saveEdit} style={styles.editButton}>
                    <MaterialIcons name="check" size={20} color={C.primary} />
                  </Pressable>
                  <Pressable onPress={cancelEdit} style={styles.editButton}>
                    <MaterialIcons name="close" size={20} color={C.textMuted} />
                  </Pressable>
                </>
              )}
            </View>
          ) : (
            <View style={styles.settingRight}>
              <Text style={[styles.settingValue, { color: C.textSecondary }]}>
                {formatCurrency(profile?.global_budget || 0)}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
            </View>
          )}
        </Pressable>
      </View>
      {/* Preferences */}
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[styles.sectionLabel, { color: C.primary }]}>PREFERENCES</Text>

        {/* Theme Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <MaterialIcons name={isDark ? 'dark-mode' : 'light-mode'} size={20} color={C.textMuted} />
            <Text style={[styles.settingLabel, { color: C.textPrimary }]}>Theme</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Pressable
              onPress={() => setMode('light')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: mode === 'light' ? C.primary : C.surfaceElevated,
              }}
            >
              <Text style={{
                fontFamily: Fonts.semiBold,
                fontSize: FontSizes.xs,
                color: mode === 'light' ? C.primaryText : C.textMuted,
              }}>Light</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('dark')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: mode === 'dark' ? C.primary : C.surfaceElevated,
              }}
            >
              <Text style={{
                fontFamily: Fonts.semiBold,
                fontSize: FontSizes.xs,
                color: mode === 'dark' ? C.primaryText : C.textMuted,
              }}>Dark</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: C.border }]} />

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="notifications-none" size={20} color={C.textMuted} />
            <Text style={[styles.settingLabel, { color: C.textPrimary }]}>Notifications</Text>
          </View>
          <Text style={[styles.settingValueMuted, { color: C.textMuted }]}>Coming soon</Text>
        </View>
      </View>

      {/* Sign Out */}
      <Pressable
        style={({ pressed }) => [styles.logoutButton, { backgroundColor: C.surface, borderColor: C.danger }, pressed && { backgroundColor: 'rgba(255, 77, 77, 0.1)', transform: [{ scale: 0.98 }] }]}
        onPress={signOut}
      >
        <MaterialIcons name="logout" size={18} color={C.danger} style={styles.logoutIcon} />
        <Text style={[styles.logoutText, { color: C.danger }]}>Sign Out</Text>
      </Pressable>

      <Text style={[styles.version, { color: C.textMuted }]}>Thrifty v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes['2xl'],
    color: Colors.primaryText,
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  email: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.84,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    minHeight: 36,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  settingValue: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
  },
  settingValueMuted: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    width: 100,
    textAlign: 'right',
  },
  editButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    width: '100%',
    marginVertical: 14,
  },
  logoutButton: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.danger,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  logoutPressed: {
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    transform: [{ scale: 0.98 }],
  },
  logoutIcon: {
    marginTop: 1,
  },
  logoutText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.danger,
  },
  version: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
});

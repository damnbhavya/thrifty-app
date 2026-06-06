import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useColors } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';
import { fetchAllReports, fetchContacts, Contact } from '@/lib/api';

export default function PayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useColors();
  const [upiId, setUpiId] = useState('');
  const [recentPayees, setRecentPayees] = useState<string[]>([]);
  const [savedContacts, setSavedContacts] = useState<Contact[]>([]);

  useEffect(() => { 
    loadRecentPayees(); 
    loadSavedContacts();
  }, []);

  const loadSavedContacts = async () => {
    try {
      const contacts = await fetchContacts();
      setSavedContacts(contacts);
    } catch (error) {
      console.error('Error loading saved contacts:', error);
    }
  };

  const loadRecentPayees = async () => {
    try {
      const reports = await fetchAllReports();
      const mergedTransactions = reports.flatMap((report) => report.transactions || []);
      if (mergedTransactions.length > 0) {
        const seen = new Set<string>();
        const payees: string[] = [];
        for (const txn of mergedTransactions) {
          if (!seen.has(txn.merchant)) { seen.add(txn.merchant); payees.push(txn.merchant); }
          if (payees.length >= 10) break;
        }
        setRecentPayees(payees);
      }
    } catch (error) { console.error('Error loading recent payees:', error); }
  };

  const handlePayWithUpi = () => {
    if (!upiId.trim()) return;
    router.push({ pathname: '/pay/confirm', params: { payee: upiId.trim(), upiId: upiId.trim() } });
  };

  const handleSelectRecentPayee = (payeeName: string) => {
    // Recent payees don't have UPI IDs saved, so we leave it blank
    router.push({ pathname: '/pay/confirm', params: { payee: payeeName, upiId: '' } });
  };

  const handleSelectContact = (contact: Contact) => {
    // Saved contacts have UPI IDs! Bypass scanning entirely.
    router.push({ pathname: '/pay/confirm', params: { payee: contact.payee_name, upiId: contact.upi_id } });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><MaterialIcons name="arrow-back" size={24} color={C.textPrimary} /></Pressable>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Pay</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(300).delay(100)} style={styles.actionsRow}>
          <Pressable style={({ pressed }) => [styles.actionCard, { backgroundColor: C.surface, borderColor: C.border }, pressed && { backgroundColor: C.surfaceElevated, transform: [{ scale: 0.98 }] }]} onPress={() => router.push('/pay/scan')}>
            <View style={styles.actionIconCircle}><MaterialIcons name="qr-code-scanner" size={28} color={C.primary} /></View>
            <Text style={[styles.actionTitle, { color: C.textPrimary }]}>Scan QR Code</Text>
            <Text style={[styles.actionHint, { color: C.textMuted }]}>Point camera at a UPI QR</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(300).delay(200)} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: C.primary }]}>ENTER UPI ID</Text>
          <View style={styles.upiInputRow}>
            <View style={[styles.upiInputWrapper, { backgroundColor: C.surface, borderColor: C.border }]}>
              <MaterialIcons name="alternate-email" size={18} color={C.textMuted} />
              <TextInput style={[styles.upiInput, { color: C.textPrimary }]} placeholder="name@upi or phone@paytm" placeholderTextColor={C.textMuted} value={upiId} onChangeText={setUpiId} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" returnKeyType="go" onSubmitEditing={handlePayWithUpi} />
            </View>
            <Pressable style={({ pressed }) => [styles.goButton, { backgroundColor: C.primary }, pressed && { backgroundColor: C.primaryDark, transform: [{ scale: 0.95 }] }, !upiId.trim() && styles.goButtonDisabled]} onPress={handlePayWithUpi} disabled={!upiId.trim()}>
              <MaterialIcons name="arrow-forward" size={20} color={C.primaryText} />
            </Pressable>
          </View>
        </Animated.View>

        {savedContacts.length > 0 && (
          <Animated.View entering={FadeInUp.duration(300).delay(250)} style={styles.contactsSection}>
            <Text style={[styles.sectionLabel, { color: C.primary, marginHorizontal: 20 }]}>SAVED CONTACTS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contactsScroll}>
              {savedContacts.map((contact) => (
                <Pressable key={contact.id} style={({ pressed }) => [styles.contactCard, { backgroundColor: C.surface, borderColor: C.border }, pressed && { backgroundColor: C.surfaceElevated, transform: [{ scale: 0.95 }] }]} onPress={() => handleSelectContact(contact)}>
                  <View style={[styles.contactAvatar, { backgroundColor: 'rgba(205, 241, 43, 0.15)' }]}>
                    <Text style={[styles.contactAvatarText, { color: C.primary }]}>{contact.payee_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.contactName, { color: C.textPrimary }]} numberOfLines={1}>{contact.payee_name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {recentPayees.length > 0 && (
          <Animated.View entering={FadeInUp.duration(300).delay(300)} style={styles.recentSection}>
            <Text style={[styles.sectionLabel, { color: C.primary }]}>RECENT PAYEES</Text>
            {recentPayees.map((item, index) => (
              <Pressable key={`${item}-${index}`} style={({ pressed }) => [styles.payeeRow, pressed && styles.payeeRowPressed]} onPress={() => handleSelectRecentPayee(item)}>
                <View style={[styles.payeeAvatar, { backgroundColor: C.surfaceElevated }]}>
                  <Text style={[styles.payeeAvatarText, { color: C.textSecondary }]}>{item.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={[styles.payeeName, { color: C.textPrimary }]} numberOfLines={1}>{item}</Text>
                <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
              </Pressable>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  actionsRow: { paddingHorizontal: 20, paddingTop: 20 },
  actionCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center' },
  actionIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(205, 241, 43, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionTitle: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, marginBottom: 4 },
  actionHint: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.84, marginBottom: 12 },
  upiInputRow: { flexDirection: 'row', gap: 10 },
  upiInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, gap: 10 },
  upiInput: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.base, paddingVertical: 14 },
  goButton: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  goButtonDisabled: { opacity: 0.4 },
  recentSection: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  contactsSection: { paddingTop: 24 },
  contactsScroll: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
  contactCard: {
    width: 90,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactAvatarText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
  },
  contactName: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    textAlign: 'center',
  },
  payeeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  payeeRowPressed: { opacity: 0.7 },
  payeeAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  payeeAvatarText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  payeeName: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.base },
});

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import QRCode from 'react-native-qrcode-svg';
import { useColors } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

export default function MyQRScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { user } = useAuth();
  const { profile } = useProfile();

  const name = profile?.name || user?.user_metadata?.name || 'Thrifty User';
  const email = user?.email || '';
  const qrPayload = `upi://pay?pa=${email}&pn=${encodeURIComponent(name)}&cu=INR`;

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><MaterialIcons name="arrow-back" size={24} color={C.textPrimary} /></Pressable>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>My QR Code</Text>
        <View style={styles.backButton} />
      </View>
      <View style={styles.content}>
        <View style={[styles.qrCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.qrWrapper}>
            <QRCode value={qrPayload} size={220} backgroundColor="#FFFFFF" color="#111111" quietZone={16} />
          </View>
          <Text style={[styles.userName, { color: C.textPrimary }]}>{name}</Text>
          {email ? <Text style={[styles.userEmail, { color: C.textMuted }]}>{email}</Text> : null}
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <Text style={[styles.hint, { color: C.primary }]}>Show this QR code to receive payments</Text>
        </View>
        <Text style={[styles.footerHint, { color: C.textMuted }]}>Scan this code with any UPI app to pay you</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  qrCard: { borderRadius: 20, borderWidth: 1, padding: 32, alignItems: 'center', width: '100%' },
  qrWrapper: { borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  userName: { fontFamily: Fonts.bold, fontSize: FontSizes.xl, marginBottom: 4 },
  userEmail: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, marginBottom: 16 },
  divider: { width: '100%', height: 1, marginBottom: 16 },
  hint: { fontFamily: Fonts.medium, fontSize: FontSizes.sm },
  footerHint: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 20, textAlign: 'center' },
});

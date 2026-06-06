import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => { if (!permission?.granted) requestPermission(); }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    try {
      if (data.startsWith('upi://pay')) {
        const url = new URL(data);
        const pa = url.searchParams.get('pa') || '';
        const pn = url.searchParams.get('pn') || pa;
        const am = url.searchParams.get('am') || '';
        if (!pa) { Alert.alert('Invalid QR', 'Could not find a UPI ID in this QR code'); setScanned(false); return; }
        router.replace({ pathname: '/pay/confirm', params: { payee: pn, upiId: pa, ...(am ? { amount: am } : {}) } });
      } else {
        Alert.alert('Not a UPI QR', 'This QR code does not contain UPI payment information');
        setScanned(false);
      }
    } catch { Alert.alert('Invalid QR', 'Could not parse this QR code'); setScanned(false); }
  };

  if (!permission) return (<View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}><Text style={[styles.message, { color: C.textSecondary }]}>Requesting camera permission...</Text></View>);

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: C.background, paddingTop: insets.top }]}>
        <MaterialIcons name="photo-camera" size={48} color={C.textMuted} />
        <Text style={[styles.permTitle, { color: C.textPrimary }]}>Camera Access Needed</Text>
        <Text style={[styles.permSubtext, { color: C.textSecondary }]}>We need camera access to scan UPI QR codes</Text>
        <Pressable style={({ pressed }) => [styles.permButton, { backgroundColor: C.primary }, pressed && { backgroundColor: C.primaryDark, transform: [{ scale: 0.98 }] }]} onPress={requestPermission}>
          <Text style={[styles.permButtonText, { color: C.primaryText }]}>Grant Permission</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.cancelLink}><Text style={[styles.cancelText, { color: C.textMuted }]}>Go Back</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFillObject} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} />
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}><MaterialIcons name="arrow-back" size={24} color="#fff" /></Pressable>
          <Text style={styles.topBarTitle}>Scan QR Code</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.frameContainer}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL, { borderColor: C.primary }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: C.primary }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: C.primary }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: C.primary }]} />
          </View>
          <Text style={styles.scanHint}>Position the UPI QR code inside the frame</Text>
        </View>
      </View>
    </View>
  );
}

const FRAME_SIZE = 260;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  message: { fontFamily: Fonts.regular, fontSize: FontSizes.base, textAlign: 'center' },
  permTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.xl, marginTop: 16, marginBottom: 8 },
  permSubtext: { fontFamily: Fonts.regular, fontSize: FontSizes.base, textAlign: 'center', marginBottom: 24 },
  permButton: { borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32 },
  permButtonText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.base },
  cancelLink: { marginTop: 16, padding: 8 },
  cancelText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: '#fff' },
  frameContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: FRAME_SIZE, height: FRAME_SIZE, position: 'relative' },
  corner: { position: 'absolute', width: 32, height: 32 },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  scanHint: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', marginTop: 24 },
});

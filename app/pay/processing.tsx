import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, BackHandler, Alert, Pressable, Clipboard, AppState } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withDelay, withRepeat, withSequence, Easing, runOnJS,
  FadeInUp,
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';
import { useTransactions } from '@/contexts/TransactionsContext';
import { sendPayment } from '@/lib/api';
import UPI from '@/lib/upi';
import { logger } from '@/lib/paymentLogger';
import LogConsoleModal from '@/components/LogConsoleModal';
import ThriftyModal from '@/components/ThriftyModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GLOW_SIZE = SCREEN_WIDTH * 0.85;

function formatCurrency(amount: number): string {
  return '₹ ' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

type PaymentPhase = 'dialing' | 'ussd_dialed' | 'completing' | 'done';

export default function ProcessingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useColors();
  const params = useLocalSearchParams<{
    amount: string; payee: string; upiId: string; category: string; note: string; phone?: string;
  }>();

  const { addTransaction } = useTransactions();

  const amountNum = parseFloat(params.amount || '0');
  const payee = params.payee || 'Unknown';
  const upiId = params.upiId || '';
  const category = params.category || 'other';
  const note = params.note || '';

  const [phase, setPhase] = useState<PaymentPhase>('dialing');
  const [statusMessage, setStatusMessage] = useState('Initiating payment...');
  const [dots, setDots] = useState('');
  const [showLogsConsole, setShowLogsConsole] = useState(false);
  const [paymentPath, setPaymentPath] = useState<'fast' | 'fallback'>('fast');
  const [accessibilityGranted, setAccessibilityGranted] = useState<boolean | null>(null);
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);

  // Check accessibility permission and track when user returns from settings
  useEffect(() => {
    if (!UPI.isAvailable) return;
    const checkAccess = async () => {
      const granted = await UPI.isAccessibilityEnabled();
      setAccessibilityGranted(granted);
      if (granted) setPaymentPath('fast');
    };
    checkAccess();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkAccess();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    logger.clear();
    if (upiId) {
      logger.log(`Will auto-fill UPI ID: "${upiId}" via Accessibility Service.`, 'JS', 'success');
    }
    logger.log(`ProcessingScreen mounted. Initiating USSD payment flow to payee "${payee}" for ${amountNum}`, 'JS', 'info');
    logger.log(`Params: category=${category}, note=${note || 'none'}, upiId=${upiId}`, 'JS', 'info');
    logger.log(`Native UPI module available: ${UPI.isAvailable}`, 'SYSTEM', UPI.isAvailable ? 'info' : 'warn');
  }, [upiId, payee, amountNum, category, note]);

  // Animation shared values
  const slideY = useSharedValue(SCREEN_HEIGHT * 0.5);
  const floatY = useSharedValue(0);
  const svgOpacity = useSharedValue(0);
  const svgScale = useSharedValue(0.82);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.7);
  const textOpacity = useSharedValue(0);
  const textSlideY = useSharedValue(24);

  // Prevent back navigation during dialing
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase === 'dialing') {
        logger.log('Back button blocked during active dialing sequence.', 'JS', 'info');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [phase]);

  // Animated dots
  useEffect(() => {
    if (phase !== 'dialing') return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [phase]);

  const navigateToResult = useCallback((status: string) => {
    router.replace({
      pathname: '/pay/result',
      params: { status, amount: amountNum.toString(), payee, category, upiId },
    });
  }, [router, amountNum, payee, category, upiId]);

  // Entrance animations
  useEffect(() => {
    slideY.value = withSpring(0, { damping: 15, stiffness: 75, mass: 1 });
    svgOpacity.value = withTiming(1, { duration: 500 });
    svgScale.value = withSpring(1, { damping: 15, stiffness: 75 });

    glowOpacity.value = withDelay(300, withSequence(
      withTiming(0.2, { duration: 800 }),
      withRepeat(withSequence(
        withTiming(0.28, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.12, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      ), -1),
    ));
    glowScale.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 50 }));

    textOpacity.value = withDelay(600, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    textSlideY.value = withDelay(600, withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }));

    floatY.value = withDelay(1400, withRepeat(withSequence(
      withTiming(-7, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      withTiming(7, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
    ), -1));
  }, []);

  useEffect(() => {
    if (!UPI.isAvailable) {
      // Fallback for non-Android: use the backend API mock
      processViaBackend();
      return;
    }
    
    // Don't start until we know accessibility status
    if (accessibilityGranted === null) return;

    if (!accessibilityGranted) {
      setStatusMessage('Accessibility Service required');
      setShowAccessibilityModal(true);
      return;
    }

    setShowAccessibilityModal(false);

    // Subscribe to UPI 123Pay events
    const unsubStatus = UPI.addEventListener('onStatusUpdate', (data) => {
      logger.log(`[Native status] ${data.message}`, 'NATIVE', 'info');
      setStatusMessage(data.message || 'Processing...');
    });

    const unsubStarted = UPI.addEventListener('onCallStarted', (data) => {
      logger.log(`[Native status] Outgoing call placed. Commencing DTMF automation...`, 'NATIVE', 'info');
      setStatusMessage('Dialing gateway...');
    });

    const unsubPinRequired = UPI.addEventListener('onPinRequired', (data) => {
      logger.log(`[Native status] USSD Pin required. User must enter in system popup.`, 'NATIVE', 'success');
      setStatusMessage('Enter secure UPI PIN in the system popup');
    });

    const unsubComplete = UPI.addEventListener('onPaymentComplete', async (data) => {
      logger.log(`USSD payment successfully completed! Verified via on-screen detection. Syncing ledger...`, 'NATIVE', 'success');
      try {
        await sendPayment({
          amount: amountNum,
          paid_to: payee,
          category: category,
          note: 'Automated USSD Payment',
        });
      } catch (e) {
        logger.log(`API Warning: failed to sync to cloud: ${e}`, 'API', 'warn');
      }
      addTransaction({
        merchant: payee,
        amount: amountNum,
        type: 'debit',
        category: category,
      });
      navigateToResult('success');
    });

    const unsubFailed = UPI.addEventListener('onPaymentFailed', (data) => {
      logger.log(`USSD Dialing/Voice failed: ${data.error}`, 'NATIVE', 'error');
      setStatusMessage(`USSD payment failed: ${data.error}`);
      navigateToResult('cancelled');
    });

    // Start the USSD payment
    logger.log(`Dialing automated USSD code sequence.`, 'JS', 'info');
    UPI.startPayment(upiId, payee, amountNum.toString());

    return () => {
      // Force kill the native accessibility service if the user leaves this screen
      UPI.cancelPayment();
      unsubComplete();
      unsubFailed();
      unsubPinRequired();
      unsubStatus();
      unsubStarted();
    };
  }, [upiId, payee, amountNum, accessibilityGranted]);

  // Fallback: backend-only payment (for non-Android or testing)
  const processViaBackend = async () => {
    logger.log('Sandbox simulation active. Redirecting to mock USSD instructions screen...', 'JS', 'warn');
    await new Promise((r) => setTimeout(r, 2000));
    setPhase('ussd_dialed');
    setStatusMessage('Simulated USSD Dialogue Active');
  };

  const handleCancelPayment = () => {
    logger.log('USSD dialing aborted by user.', 'JS', 'warn');
    router.replace({
      pathname: '/pay/result',
      params: { status: 'cancelled', amount: amountNum.toString(), payee, category, upiId },
    });
  };

  const getPhaseConfig = () => {
    switch (phase) {
      case 'dialing':
        return {
          glowColor: C.secondary,
          ringBorderColor: C.primary,
          iconName: 'phone-in-talk',
          statusText: 'Initiating secure USSD payment channel...',
        };
      default:
        return {
          glowColor: C.primary,
          ringBorderColor: C.primary,
          iconName: 'security',
          statusText: 'USSD Dialogue Active',
        };
    }
  };

  const config = getPhaseConfig();
  const aura1Style = { opacity: 0.1 };
  const aura2Style = { opacity: 0.08 };


  // Render instructions screen once the USSD dialing complete
  if (phase === 'ussd_dialed') {
    return (
      <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
        {/* Dev Terminal Floating Action Button (FAB) */}
        <Pressable 
          style={({ pressed }) => [
            styles.devConsoleFab, 
            { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' },
            pressed && { backgroundColor: 'rgba(255, 255, 255, 0.12)' }
          ]} 
          onPress={() => setShowLogsConsole(true)}
        >
          <MaterialIcons name="terminal" size={14} color={C.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.devConsoleFabText, { color: C.textSecondary }]}>Logs</Text>
        </Pressable>

        <LogConsoleModal
          visible={showLogsConsole}
          onClose={() => setShowLogsConsole(false)}
          payeeName={payee}
          amount={amountNum.toString()}
          upiId={upiId}
        />

        <View style={styles.content}>
          <Animated.View entering={FadeInUp.duration(400)} style={[styles.statusCard, { backgroundColor: C.surface, borderColor: 'rgba(205, 241, 43, 0.3)' }]}>
            {/* Header Icon */}
            <View style={styles.loaderContainer}>
              <View style={[styles.avatarCircle, { backgroundColor: C.surfaceElevated }]}>
                <MaterialIcons name="security" size={48} color={C.primary} />
              </View>
            </View>

            {/* Instruction Title */}
            <Text style={[styles.ussdTitle, { color: C.textPrimary }]}>
              {paymentPath === 'fast' ? 'Secure PIN Prompt Active' : 'Secure USSD Dialog Active'}
            </Text>
            <Text style={[styles.ussdSubtitle, { color: C.textSecondary }]}>
              {paymentPath === 'fast' 
                ? 'All transaction fields pre-filled automatically!' 
                : 'Dialing *99# NUUP sequence on your phone...'}
            </Text>

            {/* Amount details */}
            <View style={[styles.amountBadge, { backgroundColor: C.surfaceElevated }]}>
              <Text style={[styles.amountLabel, { color: C.textMuted }]}>SENDING</Text>
              <Text style={[styles.amountVal, { color: C.primary }]}>{formatCurrency(amountNum)}</Text>
              <Text style={[styles.payeeVal, { color: C.textPrimary }]}>to {payee}</Text>
            </View>

            {paymentPath === 'fast' ? (
              /* Fast Pre-filled USSD Flow UI */
              <>
                <View style={styles.instructionsContainer}>
                  <View style={styles.instructionRow}>
                    <MaterialIcons name="touch-app" size={16} color={C.primary} style={styles.instructionIcon} />
                    <Text style={[styles.instructionText, { color: C.textSecondary }]}>
                      <Text style={{ fontFamily: Fonts.bold, color: C.textPrimary }}>Carrier Popup:</Text> Look at the official carrier dialogue overlaying your screen.
                    </Text>
                  </View>
                  <View style={styles.instructionRow}>
                    <MaterialIcons name="lock" size={16} color={C.primary} style={styles.instructionIcon} />
                    <Text style={[styles.instructionText, { color: C.textSecondary }]}>
                      <Text style={{ fontFamily: Fonts.bold, color: C.textPrimary }}>Enter UPI PIN:</Text> Type your secure bank <Text style={{ fontFamily: Fonts.bold, color: C.textPrimary }}>UPI PIN</Text> in that popup and click Send.
                    </Text>
                  </View>
                  <View style={styles.instructionRow}>
                    <MaterialIcons name="verified" size={16} color={C.primary} style={styles.instructionIcon} />
                    <Text style={[styles.instructionText, { color: C.textSecondary }]}>
                      <Text style={{ fontFamily: Fonts.bold, color: C.textPrimary }}>Auto-Sync:</Text> Once completed, Thrifty will automatically verify and log the transaction. No need to click anything!
                    </Text>
                  </View>
                </View>

                <View style={[styles.securityShieldContainer, { backgroundColor: C.surfaceElevated, borderColor: 'rgba(205, 241, 43, 0.12)', borderWidth: 1 }]}>
                  <MaterialIcons name="verified-user" size={16} color={C.primary} style={{ marginTop: 1 }} />
                  <Text style={[styles.securityShieldText, { color: C.textSecondary }]}>
                    <Text style={{ fontFamily: Fonts.bold, color: C.textPrimary }}>Bank-Grade Isolated PIN: </Text>
                    Your UPI PIN is entered directly into the secure system telecom layer. Thrifty has fully pre-filled the routing, amount, and skip-codes for you. Your secure bank PIN is completely isolated and never captured by Thrifty.
                  </Text>
                </View>
              </>
            ) : (
              /* Fallback Copy-Paste USSD Flow UI */
              <>
                {/* Auto-Copied Status Badge */}
                <View style={[styles.autoCopyBadge, { backgroundColor: 'rgba(205, 241, 43, 0.1)', borderColor: 'rgba(205, 241, 43, 0.2)' }]}>
                  <MaterialIcons name="check-circle" size={14} color={C.primary} />
                  <Text style={[styles.autoCopyText, { color: C.primary }]}>UPI ID Auto-Copied to Clipboard</Text>
                </View>

                {/* Quick Copy Chips */}
                <View style={styles.copyChipsRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.copyChip,
                      { backgroundColor: C.surfaceElevated, borderColor: C.border },
                      pressed && { backgroundColor: C.border }
                    ]}
                    onPress={() => {
                      Clipboard.setString(upiId);
                      Alert.alert('Copied', 'UPI ID copied to clipboard! Long-press in system pop-up to paste.');
                    }}
                  >
                    <MaterialIcons name="content-copy" size={12} color={C.primary} />
                    <Text style={[styles.copyChipText, { color: C.textSecondary }]}>Copy UPI ID</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.copyChip,
                      { backgroundColor: C.surfaceElevated, borderColor: C.border },
                      pressed && { backgroundColor: C.border }
                    ]}
                    onPress={() => {
                      Clipboard.setString(amountNum.toString());
                      Alert.alert('Copied', 'Amount copied to clipboard!');
                    }}
                  >
                    <MaterialIcons name="content-copy" size={12} color={C.primary} />
                    <Text style={[styles.copyChipText, { color: C.textSecondary }]}>Copy Amount</Text>
                  </Pressable>
                </View>

                {/* Step checklist */}
                <View style={styles.instructionsContainer}>
                  <View style={styles.instructionRow}>
                    <MaterialIcons name="content-paste" size={16} color={C.primary} style={styles.instructionIcon} />
                    <Text style={[styles.instructionText, { color: C.textSecondary }]}>
                      <Text style={{ fontFamily: Fonts.bold, color: C.textPrimary }}>Paste UPI ID:</Text> Long-press the input field in the system popup and paste the auto-copied UPI ID, then click Send.
                    </Text>
                  </View>
                  <View style={styles.instructionRow}>
                    <MaterialIcons name="payments" size={16} color={C.primary} style={styles.instructionIcon} />
                    <Text style={[styles.instructionText, { color: C.textSecondary }]}>
                      <Text style={{ fontFamily: Fonts.bold, color: C.textPrimary }}>Enter Amount:</Text> Type the amount <Text style={{ fontFamily: Fonts.bold, color: C.textPrimary }}>₹{amountNum}</Text> when prompted.
                    </Text>
                  </View>
                  <View style={styles.instructionRow}>
                    <MaterialIcons name="forward" size={16} color={C.primary} style={styles.instructionIcon} />
                    <Text style={[styles.instructionText, { color: C.textSecondary }]}>
                      <Text style={{ fontFamily: Fonts.bold, color: C.textPrimary }}>Skip Remark:</Text> Type <Text style={{ fontFamily: Fonts.bold, color: C.textPrimary }}>1</Text> and send to skip the remark page.
                    </Text>
                  </View>
                  <View style={styles.instructionRow}>
                    <MaterialIcons name="lock" size={16} color={C.primary} style={styles.instructionIcon} />
                    <Text style={[styles.instructionText, { color: C.textSecondary }]}>
                      <Text style={{ fontFamily: Fonts.bold, color: C.textPrimary }}>Authorize:</Text> Type your secure bank <Text style={{ fontFamily: Fonts.bold, color: C.textPrimary }}>UPI PIN</Text> in the final system popup.
                    </Text>
                  </View>
                </View>
              </>
            )}
          </Animated.View>
        </View>

        {/* Security badge at very bottom */}
        <View style={[styles.bottomHint, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.securityRow}>
            <MaterialIcons name="verified-user" size={14} color={C.textMuted} />
            <Text style={[styles.hintText, { color: C.textMuted }]}>Thrifty Secure Encrypted Sandbox</Text>
          </View>
        </View>
      </View>
    );
  }

  // === DIALING Loader View ===
  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <ThriftyModal
        visible={showAccessibilityModal}
        title="Action Required"
        message="To automate USSD payments securely, Thrifty needs its Accessibility Service enabled. This allows Thrifty to auto-fill the payee details for you."
        primaryActionLabel="Enable in Settings"
        secondaryActionLabel="Cancel"
        onPrimaryAction={() => {
          setShowAccessibilityModal(false);
          UPI.openAccessibilitySettings();
        }}
        onSecondaryAction={() => {
          setShowAccessibilityModal(false);
          handleCancelPayment();
        }}
      />
      {/* Dev Terminal Floating Action Button (FAB) */}
      <Pressable 
        style={({ pressed }) => [
          styles.devConsoleFab, 
          { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' },
          pressed && { backgroundColor: 'rgba(255, 255, 255, 0.12)' }
        ]} 
        onPress={() => setShowLogsConsole(true)}
      >
        <MaterialIcons name="terminal" size={14} color={C.textSecondary} style={{ marginRight: 4 }} />
        <Text style={[styles.devConsoleFabText, { color: C.textSecondary }]}>Logs</Text>
      </Pressable>

      <LogConsoleModal
        visible={showLogsConsole}
        onClose={() => setShowLogsConsole(false)}
        payeeName={payee}
        amount={amountNum.toString()}
        upiId={upiId}
      />

      {/* Background Glowing Aura 1 — Sleek Deep Blue (Top Right) */}
      <Animated.View style={[
        styles.glow1, 
        aura1Style, 
        { backgroundColor: C.secondary }
      ]} />

      {/* Background Glowing Aura 2 — Brand Neon Lime (Bottom Left) */}
      <Animated.View style={[
        styles.glow2, 
        aura2Style, 
        { backgroundColor: C.primary }
      ]} />

      <View style={styles.content}>
        {/* Central Status Loader Card */}
        <Animated.View style={[
          styles.statusCard, 
          { 
            backgroundColor: C.surface, 
            borderColor: 'rgba(205, 241, 43, 0.3)'
          }
        ]}>
          {/* Animated Loader Circle */}
          <View style={styles.loaderContainer}>
            <View style={[styles.avatarCircle, { backgroundColor: C.surfaceElevated }]}>
              <MaterialIcons name={config.iconName as any} size={42} color={C.primary} />
            </View>
          </View>

          {/* Payment Info */}
          <View style={styles.infoContainer}>
            <Text style={[styles.amountText, { color: C.primary }]}>{formatCurrency(amountNum)}</Text>
            <Text style={[styles.payeeText, { color: C.textSecondary }]}>
              Dialing {payee}{dots}
            </Text>
            
            {upiId ? (
              <View style={[styles.upiBadge, { backgroundColor: C.surfaceElevated }]}>
                <Text style={[styles.upiBadgeText, { color: C.textMuted }]}>{upiId}</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Dynamic Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: C.surfaceElevated, borderColor: C.border, borderWidth: 1 }]}>
          <Text style={[styles.statusText, { color: C.textPrimary }]}>{statusMessage}</Text>
        </View>

        {/* Cancel Button */}
        <View style={styles.cancelContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              { borderColor: C.border, backgroundColor: 'rgba(255, 255, 255, 0.02)' },
              pressed && { backgroundColor: 'rgba(255, 77, 77, 0.1)', borderColor: 'rgba(255, 77, 77, 0.3)', transform: [{ scale: 0.97 }] }
            ]}
            onPress={handleCancelPayment}
          >
            <MaterialIcons name="close" size={16} color={C.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.cancelText, { color: C.textSecondary }]}>Cancel Payment</Text>
          </Pressable>

        </View>
      </View>

      {/* Bottom Security Footer */}
      <View style={[styles.bottomHint, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.securityRow}>
          <MaterialIcons name="security" size={14} color={C.textMuted} />
          <Text style={[styles.hintText, { color: C.textMuted }]}>
            Thrifty Secure USSD Channel
          </Text>
        </View>
      </View>
    </View>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  glow1: { 
    position: 'absolute', 
    width: GLOW_SIZE, 
    height: GLOW_SIZE, 
    borderRadius: GLOW_SIZE / 2, 
    right: -GLOW_SIZE * 0.2, 
    top: GLOW_SIZE * 0.05,
    opacity: 0.15,
  },
  glow2: { 
    position: 'absolute', 
    width: GLOW_SIZE, 
    height: GLOW_SIZE, 
    borderRadius: GLOW_SIZE / 2, 
    left: -GLOW_SIZE * 0.2, 
    bottom: GLOW_SIZE * 0.05,
    opacity: 0.12,
  },
  statusCard: {
    width: '100%',
    borderRadius: 36,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  loaderContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  pulseRing: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 6,
  },
  rotatingRing: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  infoContainer: { alignItems: 'center', width: '100%' },
  amountText: { fontFamily: Fonts.bold, fontSize: FontSizes['4xl'], marginBottom: 8 },
  payeeText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.lg, textAlign: 'center', marginBottom: 6 },
  upiBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  upiBadgeText: { fontFamily: Fonts.regular, fontSize: FontSizes.xs },
  statusBanner: {
    marginTop: 32,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    maxWidth: '90%',
  },
  statusText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  cancelContainer: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  cancelText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.xs,
  },
  bottomHint: { alignItems: 'center', paddingHorizontal: 20 },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintText: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, letterSpacing: 0.3 },
  devConsoleFab: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  devConsoleFabText: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
  },
  ussdTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    textAlign: 'center',
    marginBottom: 6,
  },
  ussdSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    textAlign: 'center',
    marginBottom: 20,
  },
  amountBadge: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  amountVal: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    marginBottom: 2,
  },
  payeeVal: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
  },
  instructionsContainer: {
    width: '100%',
    gap: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  instructionIcon: {
    marginTop: 2,
  },
  instructionText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    lineHeight: 16,
  },
  ussdActions: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  btnDone: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnDoneText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
  },
  btnCancel: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  btnCancelText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
  },
  copyChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  copyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  copyChipText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
  },
  autoCopyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  autoCopyText: {
    fontFamily: Fonts.semiBold,
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  securityShieldContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    marginTop: 20,
    width: '100%',
  },
  securityShieldText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 9.5,
    lineHeight: 14,
  },
});

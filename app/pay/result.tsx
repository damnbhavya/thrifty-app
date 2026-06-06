import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import LogConsoleModal from '@/components/LogConsoleModal';
import Animated, { FadeIn, ZoomIn, FadeInUp } from 'react-native-reanimated';
import { useColors } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';
import { CATEGORY_MAP } from '@/constants/Categories';
import { useTransactions } from '@/contexts/TransactionsContext';
import { sendPayment, saveContact } from '@/lib/api';
import { logger } from '@/lib/paymentLogger';

import ThriftyModal from '@/components/ThriftyModal';

function formatCurrency(amount: number): string {
  return '₹ ' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function PaymentResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useColors();
  const params = useLocalSearchParams<{ status: string; amount: string; payee: string; category: string; upiId: string }>();

  const [status, setStatus] = useState(params.status || 'pending');
  const [contactSaved, setContactSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const { addTransaction } = useTransactions();

  const amount = parseFloat(params.amount || '0');
  const payee = params.payee || 'Unknown';
  const upiId = params.upiId || '';
  const category = CATEGORY_MAP[params.category || 'other'] || CATEGORY_MAP['other'];
  const [showLogsConsole, setShowLogsConsole] = useState(false);

  const isCheck = status === 'check';
  const isSuccess = status === 'success';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';

  const handleSuccess = async () => {
    setIsSubmitting(true);
    logger.log('User confirmed USSD payment success. Syncing local ledger with Thrifty backend...', 'JS', 'info');
    
    try {
      const res = await sendPayment({
        amount,
        paid_to: payee,
        category: params.category || 'other',
        note: 'USSD Offline Payment',
      });
      if (res.success) {
        logger.log('API Success: USSD payment successfully logged to cloud database.', 'API', 'success');
      } else {
        logger.log(`API Warning: cloud ledger synchronization returned error: ${res.error}`, 'API', 'warn');
      }
    } catch (err: any) {
      logger.log(`API Error: failed to log payment to cloud: ${err.message}`, 'API', 'error');
    }

    addTransaction({
      merchant: payee,
      amount,
      type: 'debit',
      category: params.category || 'other',
    });

    setIsSubmitting(false);
    setStatus('success');
  };

  const handleSaveContact = async () => {
    logger.log(`Saving payee "${payee}" to Thrifty Contact List...`, 'JS', 'info');
    if (upiId) {
      const { error } = await saveContact(payee, upiId);
      if (error) {
        logger.log(`Failed to save contact: ${error.message}`, 'API', 'error');
      } else {
        logger.log(`Contact saved successfully to database!`, 'API', 'success');
      }
    }
    setShowContactModal(true);
  };

  const statusColor = isSuccess ? C.success : (isFailed || isCancelled) ? C.danger : isCheck ? C.primary : C.warning;
  const statusIcon = isSuccess ? 'check-circle' : (isFailed || isCancelled) ? 'cancel' : isCheck ? 'verified-user' : 'schedule';
  const statusTitle = isSuccess ? 'Payment Successful' : isCancelled ? 'Payment Cancelled' : isFailed ? 'Payment Failed' : isCheck ? 'Verify Transaction' : 'Processing...';
  const statusMessage = isSuccess
    ? `You paid ${formatCurrency(amount)} to ${payee}.\nYou will receive a confirmation SMS from your bank.`
    : isCancelled
    ? 'The payment was cancelled before completion.'
    : isFailed
    ? 'Something went wrong. Please try again.'
    : isCheck
    ? 'Did the carrier-level USSD payment succeed on your device?'
    : 'Waiting for payment confirmation...';

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
        amount={amount.toString()}
        upiId=""
      />

      <ThriftyModal
        visible={showContactModal}
        title="Contact Saved!"
        message={`${payee} has been added to your Thrifty quick contacts list.`}
        primaryActionLabel="Awesome"
        onPrimaryAction={() => {
          setShowContactModal(false);
          setContactSaved(true);
        }}
        icon={<MaterialIcons name="person-add" size={32} color={C.primary} />}
      />

      <View style={styles.content}>
        <Animated.View entering={ZoomIn.duration(400).springify()} style={[styles.iconCircle, { backgroundColor: statusColor + '18' }]}>
          <MaterialIcons name={statusIcon as any} size={64} color={statusColor} />
        </Animated.View>
        <Animated.View entering={FadeIn.duration(300).delay(200)}>
          <Text style={[styles.statusTitle, { color: statusColor }]}>{statusTitle}</Text>
          <Text style={[styles.statusMessage, { color: C.textSecondary }]}>{statusMessage}</Text>
        </Animated.View>

        {isCheck && (
          <Animated.View entering={FadeIn.duration(300).delay(400)} style={[styles.detailsCard, { backgroundColor: C.surface, borderColor: C.border, padding: 22 }]}>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <MaterialIcons name="sms" size={18} color={C.primary} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: C.textSecondary }}>
                  Verify that the secure pop-up prompt appeared and processed your input.
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <MaterialIcons name="lock" size={18} color={C.primary} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: C.textSecondary }}>
                  Confirm you entered your UPI PIN for ₹{amount} to {payee}.
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {isSuccess && (
          <Animated.View entering={FadeIn.duration(300).delay(400)} style={[styles.detailsCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: C.textSecondary }]}>Amount</Text>
              <Text style={[styles.detailValue, { color: C.textPrimary }]}>{formatCurrency(amount)}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: C.border }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: C.textSecondary }]}>To</Text>
              <Text style={[styles.detailValue, { color: C.textPrimary }]}>{payee}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: C.border }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: C.textSecondary }]}>Category</Text>
              <View style={styles.categoryBadge}>
                <MaterialIcons name={category.icon as any} size={14} color={category.color} />
                <Text style={[styles.categoryText, { color: category.color }]}>{category.label}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Save Payee Contact Card Questionnaire */}
        {isSuccess && !contactSaved && (
          <Animated.View entering={FadeInUp.duration(400).delay(500)} style={[styles.contactCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <MaterialIcons name="person-add" size={20} color={C.primary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactTitle, { color: C.textPrimary }]}>Save Contact?</Text>
              <Text style={[styles.contactDesc, { color: C.textMuted }]}>Add {payee} to your Thrifty contact list</Text>
            </View>
            <View style={styles.contactActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.contactBtnSave,
                  { backgroundColor: C.primary },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={handleSaveContact}
              >
                <Text style={[styles.contactBtnSaveText, { color: C.primaryText }]}>Save</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.contactBtnDismiss,
                  { borderColor: C.border },
                  pressed && { backgroundColor: C.surfaceElevated }
                ]}
                onPress={() => setContactSaved(true)}
              >
                <Text style={[styles.contactBtnDismissText, { color: C.textSecondary }]}>Exit</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>

      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        {isCheck ? (
          <View style={{ gap: 12, width: '100%' }}>
            <Pressable 
              style={({ pressed }) => [
                styles.primaryButton, 
                { backgroundColor: C.primary }, 
                isSubmitting && { opacity: 0.7 },
                pressed && { backgroundColor: C.primaryDark, transform: [{ scale: 0.98 }] }
              ]} 
              onPress={handleSuccess}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={C.primaryText} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: C.primaryText }]}>Yes, Payment Successful</Text>
              )}
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.secondaryButton, 
                { backgroundColor: C.surface, borderColor: C.border }, 
                pressed && { backgroundColor: C.surfaceElevated, transform: [{ scale: 0.98 }] }
              ]} 
              onPress={() => setStatus('failed')}
            >
              <Text style={[styles.secondaryButtonText, { color: C.danger }]}>No, Payment Failed</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 12, width: '100%' }}>
            <Pressable style={({ pressed }) => [styles.primaryButton, { backgroundColor: C.primary }, pressed && { backgroundColor: C.primaryDark, transform: [{ scale: 0.98 }] }]} onPress={() => router.replace('/(tabs)')}>
              <Text style={[styles.primaryButtonText, { color: C.primaryText }]}>Back to Home</Text>
            </Pressable>
            {(isFailed || isCancelled) && (
              <Pressable style={({ pressed }) => [styles.secondaryButton, { backgroundColor: C.surface, borderColor: C.border }, pressed && { backgroundColor: C.surfaceElevated }]} onPress={() => router.back()}>
                <Text style={[styles.secondaryButtonText, { color: C.textPrimary }]}>Try Again</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  statusTitle: { fontFamily: Fonts.bold, fontSize: FontSizes['2xl'], textAlign: 'center', marginBottom: 8 },
  statusMessage: { fontFamily: Fonts.regular, fontSize: FontSizes.base, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  detailsCard: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  detailLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.base },
  detailValue: { fontFamily: Fonts.semiBold, fontSize: FontSizes.base },
  divider: { height: 1, marginVertical: 12 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryText: { fontFamily: Fonts.medium, fontSize: FontSizes.sm },
  bottomActions: { paddingHorizontal: 20, gap: 12 },
  primaryButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  secondaryButton: { borderRadius: 14, borderWidth: 1, paddingVertical: 16, alignItems: 'center' },
  secondaryButtonText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
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
  contactCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
  },
  contactTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
  },
  contactDesc: {
    fontFamily: Fonts.regular,
    fontSize: 10,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 6,
  },
  contactBtnSave: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  contactBtnSaveText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.xs,
  },
  contactBtnDismiss: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  contactBtnDismissText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
  },
});

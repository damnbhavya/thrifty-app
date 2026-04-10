import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { Fonts, FontSizes } from '@/constants/Typography';
import { CATEGORY_MAP } from '@/constants/Categories';

function formatCurrency(amount: number): string {
  return '₹ ' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function PaymentResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    status: string;
    amount: string;
    payee: string;
    category: string;
  }>();

  const status = params.status || 'pending';
  const amount = parseFloat(params.amount || '0');
  const payee = params.payee || 'Unknown';
  const category = CATEGORY_MAP[params.category || 'other'] || CATEGORY_MAP['other'];

  const isSuccess = status === 'success';
  const isFailed = status === 'failed';

  const statusColor = isSuccess ? Colors.success : isFailed ? Colors.danger : Colors.warning;
  const statusIcon = isSuccess ? 'check-circle' : isFailed ? 'cancel' : 'schedule';
  const statusTitle = isSuccess ? 'Payment Successful' : isFailed ? 'Payment Failed' : 'Processing...';
  const statusMessage = isSuccess
    ? `You paid ${formatCurrency(amount)} to ${payee}`
    : isFailed
    ? 'Something went wrong. Please try again.'
    : 'Waiting for payment confirmation...';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Status Icon */}
        <Animated.View
          entering={ZoomIn.duration(400).springify()}
          style={[styles.iconCircle, { backgroundColor: statusColor + '18' }]}
        >
          <MaterialIcons name={statusIcon as any} size={64} color={statusColor} />
        </Animated.View>

        {/* Status Text */}
        <Animated.View entering={FadeIn.duration(300).delay(200)}>
          <Text style={[styles.statusTitle, { color: statusColor }]}>{statusTitle}</Text>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </Animated.View>

        {/* Payment Details */}
        {isSuccess && (
          <Animated.View entering={FadeIn.duration(300).delay(400)} style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>{formatCurrency(amount)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To</Text>
              <Text style={styles.detailValue}>{payee}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <View style={styles.categoryBadge}>
                <MaterialIcons name={category.icon as any} size={14} color={category.color} />
                <Text style={[styles.categoryText, { color: category.color }]}>
                  {category.label}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.primaryButtonText}>Back to Home</Text>
        </Pressable>

        {isFailed && (
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>Try Again</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes['2xl'],
    textAlign: 'center',
    marginBottom: 8,
  },
  statusMessage: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
  },
  bottomActions: {
    paddingHorizontal: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.primaryText,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonPressed: {
    backgroundColor: Colors.surfaceElevated,
  },
  secondaryButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
});

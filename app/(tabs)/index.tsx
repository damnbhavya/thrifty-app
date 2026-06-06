import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { useColors } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useTransactions } from '@/contexts/TransactionsContext';
import { fetchAllReports, fetchCurrentMonthReport } from '@/lib/api';
import type { Transaction } from '@/lib/api';
import Logo from '@/components/Logo';
import TransactionItem from '@/components/TransactionItem';

function formatCurrency(amount: number): string {
  return '₹ ' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function getBudgetColor(percentage: number): string {
  if (percentage >= 100) return Colors.danger;
  if (percentage >= 80) return Colors.warning;
  return Colors.primary;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { localTransactions, localSpentThisMonth } = useTransactions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const C = useColors();

  const [apiTransactions, setApiTransactions] = useState<Transaction[]>([]);
  const [apiSpent, setApiSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const totalSpent = apiSpent + localSpentThisMonth;
  const budget = profile?.global_budget || 0;
  const remaining = Math.max(budget - totalSpent, 0);
  const spentPercentage = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
  const budgetColor = getBudgetColor(spentPercentage);

  const loadData = useCallback(async () => {
    try {
      const currentReport = await fetchCurrentMonthReport();
      if (currentReport) {
        const totals = currentReport.category_totals || {};
        const spent = Object.values(totals).reduce((sum, val) => sum + (val || 0), 0);
        setApiSpent(spent);
      } else {
        setApiSpent(0);
      }

      const reports = await fetchAllReports();
      const mergedTransactions = reports.flatMap((report) => report.transactions || []);
      if (mergedTransactions.length > 0) {
        const sorted = [...mergedTransactions].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setApiTransactions(sorted);
      } else {
        setApiTransactions([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Merge local + API transactions, sorted by date, show latest 5
  const allTransactions = [...localTransactions, ...apiTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const recentTransactions = allTransactions.slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Top Bar — Logo + Search */}
      <View style={[styles.topBar, { borderBottomColor: C.border }]}>
        <Logo size={32} />
        <View style={[styles.searchContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
          <MaterialIcons name="search" size={20} color={C.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: C.textPrimary }]}
            placeholder="Search phone number to pay"
            placeholderTextColor={C.textMuted}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
          refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
            progressBackgroundColor={C.surface}
          />
        }
      >
        {/* Quick Actions */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, { backgroundColor: C.surface, borderColor: C.border }, pressed && { backgroundColor: C.surfaceElevated, transform: [{ scale: 0.97 }] }]}
            onPress={() => router.push('/pay/scan')}
          >
            <View style={styles.actionIconContainer}>
              <MaterialIcons name="qr-code-scanner" size={24} color={C.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: C.textSecondary }]}>Scan QR{'\n'}Code</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionButton, { backgroundColor: C.surface, borderColor: C.border }, pressed && { backgroundColor: C.surfaceElevated, transform: [{ scale: 0.97 }] }]}
            onPress={() => router.push('/pay')}
          >
            <View style={styles.actionIconContainer}>
              <MaterialIcons name="phone" size={24} color={C.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: C.textSecondary }]}>Pay{'\n'}Anyone</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionButton, { backgroundColor: C.surface, borderColor: C.border }, pressed && { backgroundColor: C.surfaceElevated, transform: [{ scale: 0.97 }] }]}
            onPress={() => router.push('/pay/myqr')}
          >
            <View style={styles.actionIconContainer}>
              <MaterialIcons name="qr-code" size={22} color={C.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: C.textSecondary }]}>Show Your{'\n'}QR Code</Text>
          </Pressable>
        </Animated.View>

        {/* Budget Card */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.sectionLabel, { color: C.primary }]}>REMAINING BUDGET</Text>
          <Text style={[styles.balanceAmount, { color: budgetColor === C.primary ? C.textPrimary : budgetColor }]}>
            {budget > 0 ? formatCurrency(remaining) : '₹ --,---'}
          </Text>

          {/* Progress bar */}
          {budget > 0 && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarTrack, { backgroundColor: C.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${spentPercentage}%`,
                      backgroundColor: budgetColor,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: budgetColor }]}>
                {spentPercentage.toFixed(0)}% used
              </Text>
            </View>
          )}

          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Budget</Text>
              <Text style={[styles.statValue, { color: C.textPrimary }]}>
                {budget > 0 ? formatCurrency(budget) : 'Not set'}
              </Text>
            </View>
            <View style={[styles.balanceDivider, { backgroundColor: C.border }]} />
            <View style={styles.balanceStat}>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Spent</Text>
              <Text style={[styles.statValue, { color: C.textPrimary }]}>{formatCurrency(totalSpent)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Recent Transactions */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: C.primary }]}>RECENT TRANSACTIONS</Text>
          </View>

          {loading ? (
            <View style={[styles.loadingState, { backgroundColor: C.surface, borderColor: C.border }]}>
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          ) : recentTransactions.length > 0 ? (
            <View style={[styles.transactionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              {recentTransactions.map((txn, index) => (
                <View key={`${txn.merchant}-${txn.date}-${index}`}>
                  {index > 0 && <View style={[styles.transactionDivider, { backgroundColor: C.border }]} />}
                  <TransactionItem transaction={txn} />
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: C.surface, borderColor: C.border }]}>
              <MaterialIcons name="inbox" size={32} color={C.textMuted} style={styles.emptyIcon} />
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No transactions yet</Text>
              <Text style={[styles.emptySubtext, { color: C.textSecondary }]}>
                Upload a UPI statement on the website{'\n'}or make a payment to see data here.
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 20,
    alignItems: 'center',
  },
  actionPressed: {
    backgroundColor: Colors.surfaceElevated,
    transform: [{ scale: 0.97 }],
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(205, 241, 43, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Budget Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.84,
    marginBottom: 8,
  },
  balanceAmount: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes['4xl'],
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  // Progress bar
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    marginTop: 6,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceStat: {
    flex: 1,
  },
  balanceDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  // Transactions
  transactionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
  },
  transactionDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  loadingState: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 32,
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

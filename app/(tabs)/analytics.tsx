import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { Fonts, FontSizes } from '@/constants/Typography';
import { CATEGORY_MAP } from '@/constants/Categories';
import { useProfile } from '@/contexts/ProfileContext';
import { useOverrides } from '@/contexts/OverridesContext';
import { useTransactions } from '@/contexts/TransactionsContext';
import { fetchCurrentMonthReport } from '@/lib/api';
import type { Transaction } from '@/lib/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

function formatCurrency(amount: number): string {
  return '₹ ' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

interface CategoryBreakdown {
  key: string;
  label: string;
  color: string;
  icon: string;
  amount: number;
  percentage: number;
}

interface TopPayee {
  name: string;
  amount: number;
  count: number;
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { getCategoryForMerchant } = useOverrides();

  const { localTransactions, localSpentThisMonth } = useTransactions();

  const [apiTotalSpent, setApiTotalSpent] = useState(0);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [topPayees, setTopPayees] = useState<TopPayee[]>([]);
  const [dayBreakdown, setDayBreakdown] = useState<number[]>(new Array(7).fill(0));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const totalSpent = apiTotalSpent + localSpentThisMonth;
  const budget = profile?.global_budget || 0;
  const income = profile?.monthly_income || 0;
  const savings = income > 0 ? income - totalSpent : 0;
  const savingsRate = income > 0 ? Math.max(0, Math.round((savings / income) * 100)) : 0;

  const loadData = useCallback(async () => {
    try {
      const report = await fetchCurrentMonthReport();
      if (!report && localTransactions.length === 0) {
        setLoading(false);
        return;
      }

      // Merge API + local transactions
      const apiTransactions = report?.transactions || [];
      const allTransactions = [...localTransactions, ...apiTransactions];
      const totals = report?.category_totals || {};

      // Total spent from API
      const apiSpent = Object.values(totals).reduce((sum, val) => sum + (val || 0), 0);
      setApiTotalSpent(apiSpent);

      // Category breakdown (accounting for overrides)
      const catMap: Record<string, number> = {};
      for (const txn of allTransactions) {
        const effective = getCategoryForMerchant(txn.merchant) || txn.category;
        catMap[effective] = (catMap[effective] || 0) + Math.abs(txn.amount);
      }

      const catBreakdown: CategoryBreakdown[] = Object.entries(catMap)
        .map(([key, amount]) => {
          const config = CATEGORY_MAP[key] || CATEGORY_MAP['other'];
          const allSpent = apiSpent + localSpentThisMonth;
          return {
            key,
            label: config.label,
            color: config.color,
            icon: config.icon,
            amount,
            percentage: allSpent > 0 ? (amount / allSpent) * 100 : 0,
          };
        })
        .sort((a, b) => b.amount - a.amount);
      setCategories(catBreakdown);

      // Top payees
      const payeeMap: Record<string, { amount: number; count: number }> = {};
      for (const txn of allTransactions) {
        if (!payeeMap[txn.merchant]) {
          payeeMap[txn.merchant] = { amount: 0, count: 0 };
        }
        payeeMap[txn.merchant].amount += Math.abs(txn.amount);
        payeeMap[txn.merchant].count += 1;
      }
      const topP = Object.entries(payeeMap)
        .map(([name, { amount, count }]) => ({ name, amount, count }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      setTopPayees(topP);

      // Day of week breakdown
      const days = new Array(7).fill(0);
      for (const txn of allTransactions) {
        try {
          const day = new Date(txn.date).getDay();
          days[day] += Math.abs(txn.amount);
        } catch {}
      }
      setDayBreakdown(days);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [getCategoryForMerchant]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const maxDayAmount = Math.max(...dayBreakdown, 1);
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (totalSpent === 0 && categories.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialIcons name="insights" size={32} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No data yet</Text>
        <Text style={styles.emptySubtext}>
          Upload a UPI statement on the website{'\n'}or make payments to see analytics.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
          progressBackgroundColor={Colors.surface}
        />
      }
    >
      {/* Summary Cards Row */}
      <Animated.View entering={FadeInUp.duration(300).delay(100)} style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Spent</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalSpent)}</Text>
        </View>

        {income > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Savings</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: savings >= 0 ? Colors.success : Colors.danger },
              ]}
            >
              {savingsRate}%
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Budget Progress */}
      {budget > 0 && (
        <Animated.View entering={FadeInUp.duration(300).delay(200)} style={styles.card}>
          <Text style={styles.cardTitle}>Budget Usage</Text>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetSpent}>{formatCurrency(totalSpent)}</Text>
            <Text style={styles.budgetOf}>of {formatCurrency(budget)}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min((totalSpent / budget) * 100, 100)}%`,
                  backgroundColor:
                    totalSpent / budget >= 1
                      ? Colors.danger
                      : totalSpent / budget >= 0.8
                      ? Colors.warning
                      : Colors.primary,
                },
              ]}
            />
          </View>
        </Animated.View>
      )}

      {/* Category Breakdown */}
      <Animated.View entering={FadeInUp.duration(300).delay(300)} style={styles.card}>
        <Text style={styles.cardTitle}>Category Breakdown</Text>
        {categories.map((cat) => (
          <View key={cat.key} style={styles.categoryRow}>
            <View style={[styles.catDot, { backgroundColor: cat.color }]} />
            <MaterialIcons name={cat.icon as any} size={16} color={cat.color} />
            <Text style={styles.catLabel} numberOfLines={1}>{cat.label}</Text>
            <Text style={styles.catAmount}>{formatCurrency(cat.amount)}</Text>
            <Text style={styles.catPercent}>{cat.percentage.toFixed(0)}%</Text>
          </View>
        ))}

        {/* Simplified bar chart */}
        <View style={styles.barChartContainer}>
          {categories.slice(0, 6).map((cat) => (
            <View key={cat.key} style={styles.barRow}>
              <Text style={styles.barLabel} numberOfLines={1}>
                {cat.label.split(' ')[0]}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Day of Week Heatmap */}
      <Animated.View entering={FadeInUp.duration(300).delay(400)} style={styles.card}>
        <Text style={styles.cardTitle}>Spending by Day</Text>
        <View style={styles.heatmapRow}>
          {dayLabels.map((label, i) => {
            const amount = dayBreakdown[i];
            const intensity = maxDayAmount > 0 ? amount / maxDayAmount : 0;
            const bgColor =
              intensity > 0.75
                ? Colors.primary
                : intensity > 0.5
                ? Colors.primary + '88'
                : intensity > 0.25
                ? Colors.primary + '44'
                : intensity > 0
                ? Colors.primary + '22'
                : Colors.border;
            return (
              <View key={label} style={styles.heatmapCell}>
                <View style={[styles.heatmapBlock, { backgroundColor: bgColor }]} />
                <Text style={styles.heatmapLabel}>{label}</Text>
              </View>
            );
          })}
        </View>
      </Animated.View>

      {/* Top Payees */}
      {topPayees.length > 0 && (
        <Animated.View entering={FadeInUp.duration(300).delay(500)} style={styles.card}>
          <Text style={styles.cardTitle}>Top Payees</Text>
          {topPayees.map((payee, index) => (
            <View key={payee.name} style={styles.payeeRow}>
              <View style={styles.payeeRank}>
                <Text style={styles.payeeRankText}>{index + 1}</Text>
              </View>
              <View style={styles.payeeDetails}>
                <Text style={styles.payeeName} numberOfLines={1}>{payee.name}</Text>
                <Text style={styles.payeeCount}>
                  {payee.count} transaction{payee.count !== 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={styles.payeeAmount}>{formatCurrency(payee.amount)}</Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Savings Card */}
      {income > 0 && (
        <Animated.View entering={FadeInUp.duration(300).delay(600)} style={styles.card}>
          <Text style={styles.cardTitle}>Savings Rate</Text>
          <View style={styles.savingsRow}>
            <View>
              <Text style={styles.savingsLabel}>Income</Text>
              <Text style={styles.savingsValue}>{formatCurrency(income)}</Text>
            </View>
            <MaterialIcons name="remove" size={20} color={Colors.textMuted} />
            <View>
              <Text style={styles.savingsLabel}>Spent</Text>
              <Text style={styles.savingsValue}>{formatCurrency(totalSpent)}</Text>
            </View>
            <MaterialIcons name="drag-handle" size={20} color={Colors.textMuted} />
            <View>
              <Text style={styles.savingsLabel}>Saved</Text>
              <Text style={[styles.savingsValue, { color: savings >= 0 ? Colors.success : Colors.danger }]}>
                {formatCurrency(Math.abs(savings))}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
  },
  emptyTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Summary Row
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  summaryLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
  },
  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.84,
    marginBottom: 16,
  },
  // Budget
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 10,
  },
  budgetSpent: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
  },
  budgetOf: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Category breakdown
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catLabel: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  catAmount: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    minWidth: 70,
    textAlign: 'right',
  },
  catPercent: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    width: 32,
    textAlign: 'right',
  },
  // Bar chart
  barChartContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    width: 50,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Heatmap
  heatmapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heatmapCell: {
    alignItems: 'center',
    gap: 6,
  },
  heatmapBlock: {
    width: (SCREEN_WIDTH - 32 - 40 - 72) / 7,
    height: (SCREEN_WIDTH - 32 - 40 - 72) / 7,
    borderRadius: 6,
  },
  heatmapLabel: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textMuted,
  },
  // Top payees
  payeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  payeeRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payeeRankText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.textMuted,
  },
  payeeDetails: {
    flex: 1,
  },
  payeeName: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  payeeCount: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  payeeAmount: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  // Savings
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savingsLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  savingsValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});

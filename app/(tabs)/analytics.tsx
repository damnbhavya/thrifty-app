import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useColors } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';
import { CATEGORY_MAP } from '@/constants/Categories';
import { useProfile } from '@/contexts/ProfileContext';
import { useOverrides } from '@/contexts/OverridesContext';
import { useTransactions } from '@/contexts/TransactionsContext';
import { fetchAllReports, fetchCurrentMonthReport } from '@/lib/api';
import type { Transaction } from '@/lib/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

function formatCurrency(amount: number): string {
  return '₹ ' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

interface CategoryBreakdown {
  key: string; label: string; color: string; icon: string; amount: number; percentage: number;
}
interface TopPayee { name: string; amount: number; count: number; }

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { getCategoryForMerchant } = useOverrides();
  const { localTransactions, localSpentThisMonth } = useTransactions();
  const C = useColors();

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
      const allReports = await fetchAllReports();
      const mergedApiTransactions = allReports.flatMap((r) => r.transactions || []);

      if (!report && mergedApiTransactions.length === 0 && localTransactions.length === 0) {
        setLoading(false);
        return;
      }

      const allTransactions = [...localTransactions, ...mergedApiTransactions];
      const totals = report?.category_totals || {};
      const apiSpent = Object.values(totals).reduce((sum, val) => sum + (val || 0), 0);
      setApiTotalSpent(apiSpent);

      const catMap: Record<string, number> = {};
      for (const txn of allTransactions) {
        const effective = getCategoryForMerchant(txn.merchant) || txn.category;
        catMap[effective] = (catMap[effective] || 0) + Math.abs(txn.amount);
      }

      const allSpent = apiSpent + localSpentThisMonth;
      const catBreakdown: CategoryBreakdown[] = Object.entries(catMap)
        .map(([key, amount]) => {
          const config = CATEGORY_MAP[key] || CATEGORY_MAP['other'];
          return {
            key, label: config.label, color: config.color, icon: config.icon, amount,
            percentage: allSpent > 0 ? (amount / allSpent) * 100 : 0,
          };
        })
        .sort((a, b) => b.amount - a.amount);
      setCategories(catBreakdown);

      const payeeMap: Record<string, { amount: number; count: number }> = {};
      for (const txn of allTransactions) {
        if (!payeeMap[txn.merchant]) payeeMap[txn.merchant] = { amount: 0, count: 0 };
        payeeMap[txn.merchant].amount += Math.abs(txn.amount);
        payeeMap[txn.merchant].count += 1;
      }
      setTopPayees(
        Object.entries(payeeMap)
          .map(([name, { amount, count }]) => ({ name, amount, count }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5)
      );

      const days = new Array(7).fill(0);
      for (const txn of allTransactions) {
        try { days[new Date(txn.date).getDay()] += Math.abs(txn.amount); } catch {}
      }
      setDayBreakdown(days);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [getCategoryForMerchant]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await loadData(); setRefreshing(false); }, [loadData]);

  const maxDayAmount = Math.max(...dayBreakdown, 1);
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: C.background }]}>
        <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading analytics...</Text>
      </View>
    );
  }

  if (totalSpent === 0 && categories.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: C.background }]}>
        <MaterialIcons name="insights" size={32} color={C.textMuted} />
        <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No data yet</Text>
        <Text style={[styles.emptySubtext, { color: C.textSecondary }]}>
          Upload a UPI statement on the website{'\n'}or make payments to see analytics.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.surface} />
      }
    >
      {/* Summary Cards */}
      <Animated.View entering={FadeInUp.duration(300).delay(100)} style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Total Spent</Text>
          <Text style={[styles.summaryValue, { color: C.textPrimary }]}>{formatCurrency(totalSpent)}</Text>
        </View>
        {income > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Savings</Text>
            <Text style={[styles.summaryValue, { color: savings >= 0 ? C.success : C.danger }]}>{savingsRate}%</Text>
          </View>
        )}
      </Animated.View>

      {/* Budget Progress */}
      {budget > 0 && (
        <Animated.View entering={FadeInUp.duration(300).delay(200)} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.primary }]}>Budget Usage</Text>
          <View style={styles.budgetRow}>
            <Text style={[styles.budgetSpent, { color: C.textPrimary }]}>{formatCurrency(totalSpent)}</Text>
            <Text style={[styles.budgetOf, { color: C.textMuted }]}>of {formatCurrency(budget)}</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
            <View style={[styles.progressFill, {
              width: `${Math.min((totalSpent / budget) * 100, 100)}%`,
              backgroundColor: totalSpent / budget >= 1 ? C.danger : totalSpent / budget >= 0.8 ? C.warning : C.primary,
            }]} />
          </View>
        </Animated.View>
      )}

      {/* Category Breakdown */}
      <Animated.View entering={FadeInUp.duration(300).delay(300)} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[styles.cardTitle, { color: C.primary }]}>Category Breakdown</Text>
        {categories.map((cat) => (
          <View key={cat.key} style={styles.categoryRow}>
            <View style={[styles.catDot, { backgroundColor: cat.color }]} />
            <MaterialIcons name={cat.icon as any} size={16} color={cat.color} />
            <Text style={[styles.catLabel, { color: C.textPrimary }]} numberOfLines={1}>{cat.label}</Text>
            <Text style={[styles.catAmount, { color: C.textPrimary }]}>{formatCurrency(cat.amount)}</Text>
            <Text style={[styles.catPercent, { color: C.textMuted }]}>{cat.percentage.toFixed(0)}%</Text>
          </View>
        ))}
        <View style={[styles.barChartContainer, { borderTopColor: C.border }]}>
          {categories.slice(0, 6).map((cat) => (
            <View key={cat.key} style={styles.barRow}>
              <Text style={[styles.barLabel, { color: C.textMuted }]} numberOfLines={1}>{cat.label.split(' ')[0]}</Text>
              <View style={[styles.barTrack, { backgroundColor: C.border }]}>
                <View style={[styles.barFill, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Day of Week */}
      <Animated.View entering={FadeInUp.duration(300).delay(400)} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[styles.cardTitle, { color: C.primary }]}>Spending by Day</Text>
        <View style={styles.heatmapRow}>
          {dayLabels.map((label, i) => {
            const amount = dayBreakdown[i];
            const intensity = maxDayAmount > 0 ? amount / maxDayAmount : 0;
            const bgColor = intensity > 0.75 ? C.primary : intensity > 0.5 ? C.primary + '88' : intensity > 0.25 ? C.primary + '44' : intensity > 0 ? C.primary + '22' : C.border;
            return (
              <View key={label} style={styles.heatmapCell}>
                <View style={[styles.heatmapBlock, { backgroundColor: bgColor }]} />
                <Text style={[styles.heatmapLabel, { color: C.textMuted }]}>{label}</Text>
              </View>
            );
          })}
        </View>
      </Animated.View>

      {/* Top Payees */}
      {topPayees.length > 0 && (
        <Animated.View entering={FadeInUp.duration(300).delay(500)} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.primary }]}>Top Payees</Text>
          {topPayees.map((payee, index) => (
            <View key={payee.name} style={styles.payeeRow}>
              <View style={[styles.payeeRank, { backgroundColor: C.surfaceElevated }]}>
                <Text style={[styles.payeeRankText, { color: C.textMuted }]}>{index + 1}</Text>
              </View>
              <View style={styles.payeeDetails}>
                <Text style={[styles.payeeName, { color: C.textPrimary }]} numberOfLines={1}>{payee.name}</Text>
                <Text style={[styles.payeeCount, { color: C.textMuted }]}>{payee.count} transaction{payee.count !== 1 ? 's' : ''}</Text>
              </View>
              <Text style={[styles.payeeAmount, { color: C.textPrimary }]}>{formatCurrency(payee.amount)}</Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Savings */}
      {income > 0 && (
        <Animated.View entering={FadeInUp.duration(300).delay(600)} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.primary }]}>Savings Rate</Text>
          <View style={styles.savingsRow}>
            <View>
              <Text style={[styles.savingsLabel, { color: C.textMuted }]}>Income</Text>
              <Text style={[styles.savingsValue, { color: C.textPrimary }]}>{formatCurrency(income)}</Text>
            </View>
            <MaterialIcons name="remove" size={20} color={C.textMuted} />
            <View>
              <Text style={[styles.savingsLabel, { color: C.textMuted }]}>Spent</Text>
              <Text style={[styles.savingsValue, { color: C.textPrimary }]}>{formatCurrency(totalSpent)}</Text>
            </View>
            <MaterialIcons name="drag-handle" size={20} color={C.textMuted} />
            <View>
              <Text style={[styles.savingsLabel, { color: C.textMuted }]}>Saved</Text>
              <Text style={[styles.savingsValue, { color: savings >= 0 ? C.success : C.danger }]}>{formatCurrency(Math.abs(savings))}</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loadingText: { fontFamily: Fonts.regular, fontSize: FontSizes.base },
  emptyTitle: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, marginTop: 12, marginBottom: 4 },
  emptySubtext: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 16 },
  summaryLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontFamily: Fonts.bold, fontSize: FontSizes.xl },
  card: { borderRadius: 14, borderWidth: 1, padding: 20, marginBottom: 12 },
  cardTitle: { fontFamily: Fonts.semiBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.84, marginBottom: 16 },
  budgetRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  budgetSpent: { fontFamily: Fonts.bold, fontSize: FontSizes.xl },
  budgetOf: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  catAmount: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, minWidth: 70, textAlign: 'right' },
  catPercent: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, width: 32, textAlign: 'right' },
  barChartContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, width: 50 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  heatmapRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heatmapCell: { alignItems: 'center', gap: 6 },
  heatmapBlock: { width: (SCREEN_WIDTH - 32 - 40 - 72) / 7, height: (SCREEN_WIDTH - 32 - 40 - 72) / 7, borderRadius: 6 },
  heatmapLabel: { fontFamily: Fonts.regular, fontSize: 10 },
  payeeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  payeeRank: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  payeeRankText: { fontFamily: Fonts.semiBold, fontSize: 11 },
  payeeDetails: { flex: 1 },
  payeeName: { fontFamily: Fonts.medium, fontSize: FontSizes.base, marginBottom: 2 },
  payeeCount: { fontFamily: Fonts.regular, fontSize: FontSizes.xs },
  payeeAmount: { fontFamily: Fonts.semiBold, fontSize: FontSizes.base },
  savingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  savingsLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginBottom: 4, textAlign: 'center' },
  savingsValue: { fontFamily: Fonts.semiBold, fontSize: FontSizes.base, textAlign: 'center' },
});

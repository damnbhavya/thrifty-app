import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  StyleSheet,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { Fonts, FontSizes } from '@/constants/Typography';
import { CATEGORIES, CATEGORY_MAP } from '@/constants/Categories';
import { useOverrides } from '@/contexts/OverridesContext';
import { useTransactions } from '@/contexts/TransactionsContext';
import { fetchCurrentMonthReport } from '@/lib/api';
import type { Transaction } from '@/lib/api';
import TransactionItem from '@/components/TransactionItem';

type FilterCategory = string | null;

function formatCurrency(amount: number): string {
  return '₹ ' + Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function TransactionsScreen() {
  const { getCategoryForMerchant } = useOverrides();
  const { localTransactions } = useTransactions();
  const [apiTransactions, setApiTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const report = await fetchCurrentMonthReport();
      if (report?.transactions) {
        const sorted = [...report.transactions].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setApiTransactions(sorted);
      } else {
        setApiTransactions([]);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Merge local + API transactions
  const transactions = useMemo(() => {
    return [...localTransactions, ...apiTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [localTransactions, apiTransactions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Apply category overrides and filter
  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // Search by merchant name
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((t) =>
        t.merchant.toLowerCase().includes(term)
      );
    }

    // Filter by category (accounting for overrides)
    if (filterCategory) {
      result = result.filter((t) => {
        const effective = getCategoryForMerchant(t.merchant) || t.category;
        return effective === filterCategory;
      });
    }

    return result;
  }, [transactions, search, filterCategory, getCategoryForMerchant]);

  // Summary stats
  const totalAmount = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [filteredTransactions]
  );

  const filterLabel = filterCategory
    ? CATEGORY_MAP[filterCategory]?.label || filterCategory
    : null;

  const renderTransaction = ({ item, index }: { item: Transaction; index: number }) => (
    <Animated.View entering={FadeInUp.duration(250).delay(Math.min(index * 30, 300))}>
      <TransactionItem transaction={item} />
      {index < filteredTransactions.length - 1 && <View style={styles.divider} />}
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Search & Filter Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrapper}>
          <MaterialIcons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by payee name"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={18} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[styles.filterButton, filterCategory && styles.filterButtonActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <MaterialIcons
            name="filter-list"
            size={20}
            color={filterCategory ? Colors.primaryText : Colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* Active filter chip */}
      {filterLabel && (
        <View style={styles.activeFilterRow}>
          <View style={styles.activeFilterChip}>
            <Text style={styles.activeFilterText}>{filterLabel}</Text>
            <Pressable onPress={() => setFilterCategory(null)}>
              <MaterialIcons name="close" size={14} color={Colors.primary} />
            </Pressable>
          </View>
          <Text style={styles.resultCount}>
            {filteredTransactions.length} transactions · {formatCurrency(totalAmount)}
          </Text>
        </View>
      )}

      {/* Transaction List */}
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Loading...</Text>
        </View>
      ) : filteredTransactions.length > 0 ? (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item, index) => `${item.merchant}-${item.date}-${index}`}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContent}
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
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="receipt-long" size={32} color={Colors.textMuted} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>
            {search || filterCategory ? 'No matches found' : 'No transactions yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {search || filterCategory
              ? 'Try adjusting your search or filters'
              : 'Upload a UPI statement on the website\nor make a payment to see data here.'}
          </Text>
        </View>
      )}

      {/* Category Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowFilterModal(false)}>
          <Pressable style={styles.filterSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.filterSheetTitle}>Filter by Category</Text>

            <Pressable
              style={[styles.filterItem, !filterCategory && styles.filterItemSelected]}
              onPress={() => { setFilterCategory(null); setShowFilterModal(false); }}
            >
              <View style={[styles.filterDot, { backgroundColor: Colors.textMuted }]} />
              <Text style={[styles.filterItemText, !filterCategory && styles.filterItemTextSelected]}>
                All Categories
              </Text>
              {!filterCategory && <MaterialIcons name="check" size={18} color={Colors.primary} />}
            </Pressable>

            <ScrollView showsVerticalScrollIndicator={false}>
              {CATEGORIES.map((cat) => {
                const isSelected = filterCategory === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    style={[styles.filterItem, isSelected && styles.filterItemSelected]}
                    onPress={() => { setFilterCategory(cat.key); setShowFilterModal(false); }}
                  >
                    <View style={[styles.filterDot, { backgroundColor: cat.color }]} />
                    <MaterialIcons
                      name={cat.icon as any}
                      size={16}
                      color={isSelected ? Colors.primary : Colors.textSecondary}
                    />
                    <Text style={[styles.filterItemText, isSelected && styles.filterItemTextSelected]}>
                      {cat.label}
                    </Text>
                    {isSelected && <MaterialIcons name="check" size={18} color={Colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    paddingVertical: 10,
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(205, 241, 43, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  activeFilterText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  resultCount: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
  // Filter modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  filterSheetTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 10,
  },
  filterItemSelected: {
    backgroundColor: 'rgba(205, 241, 43, 0.08)',
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterItemText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  filterItemTextSelected: {
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
  },
});

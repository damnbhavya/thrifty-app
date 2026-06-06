import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import { useColors } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';
import { CATEGORIES, CATEGORY_MAP } from '@/constants/Categories';
import { useOverrides } from '@/contexts/OverridesContext';
import type { Transaction } from '@/lib/api';

interface TransactionItemProps {
  transaction: Transaction;
  /** If true, allows tapping to change category (saves as merchant override) */
  editable?: boolean;
}

function formatAmount(amount: number): string {
  return '₹ ' + Math.abs(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate();
    const month = MONTHS[date.getMonth()];
    return `${day} ${month}`;
  } catch {
    return dateStr;
  }
}

export default function TransactionItem({ transaction, editable = true }: TransactionItemProps) {
  const { getCategoryForMerchant, saveOverride } = useOverrides();
  const C = useColors();
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Override takes priority over the transaction's own category
  const overriddenCategory = getCategoryForMerchant(transaction.merchant);
  const effectiveCategory = overriddenCategory || transaction.category;
  const category = CATEGORY_MAP[effectiveCategory] || CATEGORY_MAP['other'];
  const isOverridden = !!overriddenCategory && overriddenCategory !== transaction.category;
  const isDebit = transaction.type === 'debit' || transaction.amount > 0;

  const handleCategoryChange = async (newCategory: string) => {
    setSaving(true);
    await saveOverride(transaction.merchant, newCategory);
    setSaving(false);
    setShowPicker(false);
  };

  return (
    <>
      <Pressable
        style={styles.container}
        onPress={editable ? () => setShowPicker(true) : undefined}
      >
        {/* Category icon with color */}
        <View style={[styles.iconCircle, { backgroundColor: category.color + '18' }]}>
          <MaterialIcons
            name={category.icon as any}
            size={20}
            color={category.color}
          />
        </View>

        {/* Merchant & category */}
        <View style={styles.details}>
          <Text style={[styles.merchant, { color: C.textPrimary }]} numberOfLines={1}>
            {transaction.merchant}
          </Text>
          <View style={styles.categoryRow}>
            <Text style={[styles.categoryLabel, { color: C.textMuted }]}>{category.label}</Text>
            {isOverridden && (
              <MaterialIcons name="edit" size={10} color={C.primary} style={styles.overrideIcon} />
            )}
          </View>
        </View>

        {/* Amount & date */}
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: C.success }, isDebit && { color: C.textPrimary }]}>
            {isDebit ? '- ' : '+ '}{formatAmount(transaction.amount)}
          </Text>
          <Text style={[styles.date, { color: C.textMuted }]}>{formatDate(transaction.date)}</Text>
        </View>
      </Pressable>

      {/* Category picker modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowPicker(false)}>
          <Pressable style={[styles.pickerSheet, { backgroundColor: C.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: C.textPrimary }]}>Change Category</Text>
              <Text style={[styles.pickerSubtitle, { color: C.textSecondary }]} numberOfLines={1}>
                for "{transaction.merchant}"
              </Text>
            </View>

            <ScrollView
              style={styles.pickerList}
              showsVerticalScrollIndicator={false}
            >
              {CATEGORIES.map((cat) => {
                const isSelected = cat.key === effectiveCategory;
                return (
                  <Pressable
                    key={cat.key}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => handleCategoryChange(cat.key)}
                    disabled={saving}
                  >
                    <View style={[styles.pickerDot, { backgroundColor: cat.color }]} />
                    <MaterialIcons
                      name={cat.icon as any}
                      size={18}
                      color={isSelected ? C.primary : C.textSecondary}
                    />
                    <Text style={[styles.pickerLabel, { color: C.textPrimary }, isSelected && { fontFamily: Fonts.semiBold, color: C.primary }]}>
                      {cat.label}
                    </Text>
                    {isSelected && (
                      <MaterialIcons name="check" size={18} color={C.primary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.pickerHint, { color: C.textMuted }]}>
              This will apply to all transactions from this merchant
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
  },
  merchant: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  overrideIcon: {
    marginTop: 1,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.success,
    marginBottom: 2,
  },
  amountDebit: {
    color: Colors.textPrimary,
  },
  date: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  // Category picker modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  pickerHeader: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  pickerTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  pickerSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  pickerList: {
    paddingHorizontal: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 10,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(205, 241, 43, 0.08)',
  },
  pickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pickerLabel: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  pickerLabelSelected: {
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
  },
  pickerHint: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
  },
});

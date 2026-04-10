/**
 * Shared category config — 13 categories matching the Thrifty website.
 * Icons use Google Material Icons (@expo/vector-icons/MaterialIcons).
 */

export interface CategoryConfig {
  key: string;
  label: string;
  color: string;
  icon: string; // MaterialIcons icon name
  description: string;
}

export const CATEGORIES: CategoryConfig[] = [
  { key: 'food', label: 'Food & Dining', color: '#FF6B6B', icon: 'restaurant', description: 'Restaurant orders, food delivery, dining out' },
  { key: 'groceries', label: 'Groceries', color: '#00CEC9', icon: 'shopping-cart', description: 'Daily essentials, vegetables, dairy' },
  { key: 'transport', label: 'Transport', color: '#74B9FF', icon: 'directions-car', description: 'Cab rides, fuel, metro, tolls' },
  { key: 'subscriptions', label: 'Subscriptions', color: '#A29BFE', icon: 'repeat', description: 'Streaming, mobile recharges, recurring' },
  { key: 'entertainment', label: 'Entertainment', color: '#FD79A8', icon: 'movie', description: 'Movies, gaming, events' },
  { key: 'utilities', label: 'Utilities', color: '#FDCB6E', icon: 'bolt', description: 'Electricity, water, broadband' },
  { key: 'shopping', label: 'Shopping', color: '#00D2D3', icon: 'shopping-bag', description: 'Online/offline retail' },
  { key: 'health', label: 'Health', color: '#00B894', icon: 'favorite', description: 'Hospital, pharmacy, gym' },
  { key: 'education', label: 'Education', color: '#6C5CE7', icon: 'school', description: 'Courses, books, tuition' },
  { key: 'rent', label: 'Rent', color: '#E17055', icon: 'home', description: 'House rent, PG, society' },
  { key: 'transfers', label: 'Transfers', color: '#636E72', icon: 'swap-horiz', description: 'P2P, NEFT, IMPS' },
  { key: 'cash_withdrawal', label: 'Cash Withdrawal', color: '#B2BEC3', icon: 'local-atm', description: 'ATM, cash-out' },
  { key: 'other', label: 'Other', color: '#DFE6E9', icon: 'more-horiz', description: 'Miscellaneous' },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
);

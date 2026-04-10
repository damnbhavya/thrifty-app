import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Transaction } from '@/lib/api';

const STORAGE_KEY = 'thrifty_local_transactions';

interface TransactionsContextType {
  /** Locally-created transactions (from in-app payments) */
  localTransactions: Transaction[];
  /** Add a new transaction from an in-app payment */
  addTransaction: (txn: Omit<Transaction, 'date'>) => void;
  /** Get total spent from local transactions this month */
  localSpentThisMonth: number;
  /** Clear all local transactions */
  clearLocal: () => void;
  /** Load from storage on startup */
  loadFromStorage: () => Promise<void>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([]);

  const loadFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLocalTransactions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading local transactions:', error);
    }
  }, []);

  const persist = async (txns: Transaction[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(txns));
    } catch (error) {
      console.error('Error persisting transactions:', error);
    }
  };

  const addTransaction = (txn: Omit<Transaction, 'date'>) => {
    const newTxn: Transaction = {
      ...txn,
      date: new Date().toISOString(),
    };
    setLocalTransactions((prev) => {
      const updated = [newTxn, ...prev];
      persist(updated);
      return updated;
    });
  };

  // Calculate total spent this month from local transactions
  const localSpentThisMonth = (() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return localTransactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  })();

  const clearLocal = () => {
    setLocalTransactions([]);
    AsyncStorage.removeItem(STORAGE_KEY);
  };

  return (
    <TransactionsContext.Provider
      value={{
        localTransactions,
        addTransaction,
        localSpentThisMonth,
        clearLocal,
        loadFromStorage,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionsContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionsProvider');
  }
  return context;
}

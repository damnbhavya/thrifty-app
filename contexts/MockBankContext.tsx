import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BANK_STORAGE_KEY = 'thrifty_mock_bank';

interface BankAccount {
  balance: number;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

interface MockBankContextType {
  bank: BankAccount;
  isLoading: boolean;
  debit: (amount: number) => Promise<boolean>;
  setBalance: (amount: number) => Promise<void>;
  resetBalance: () => Promise<void>;
}

const defaultBank: BankAccount = {
  balance: 0,
  accountNumber: '',
  ifsc: 'SBIN0001234',
  bankName: 'State Bank of India',
};

function generateAccount(): BankAccount {
  // Random balance between ₹50,000 and ₹1,00,000
  const balance = Math.floor(Math.random() * 50000) + 50000;
  // Random 12-digit account number
  const accountNumber = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  const banks = [
    { name: 'State Bank of India', ifsc: 'SBIN0001234' },
    { name: 'HDFC Bank', ifsc: 'HDFC0000123' },
    { name: 'ICICI Bank', ifsc: 'ICIC0001234' },
    { name: 'Axis Bank', ifsc: 'UTIB0000123' },
    { name: 'Kotak Mahindra Bank', ifsc: 'KKBK0000123' },
  ];
  const bank = banks[Math.floor(Math.random() * banks.length)];
  return { balance, accountNumber, ifsc: bank.ifsc, bankName: bank.name };
}

const MockBankContext = createContext<MockBankContextType>({
  bank: defaultBank,
  isLoading: true,
  debit: async () => false,
  setBalance: async () => {},
  resetBalance: async () => {},
});

export function MockBankProvider({ children }: { children: React.ReactNode }) {
  const [bank, setBank] = useState<BankAccount>(defaultBank);
  const [isLoading, setIsLoading] = useState(true);

  // Load or generate bank account on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(BANK_STORAGE_KEY);
        if (stored) {
          setBank(JSON.parse(stored));
        } else {
          const newAccount = generateAccount();
          await AsyncStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(newAccount));
          setBank(newAccount);
        }
      } catch (e) {
        const newAccount = generateAccount();
        setBank(newAccount);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const debit = useCallback(async (amount: number): Promise<boolean> => {
    if (amount <= 0) return false;
    if (amount > bank.balance) return false;

    const updated = { ...bank, balance: bank.balance - amount };
    setBank(updated);
    await AsyncStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(updated));
    return true;
  }, [bank]);

  const resetBalance = useCallback(async () => {
    const newAccount = generateAccount();
    await AsyncStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(newAccount));
    setBank(newAccount);
  }, []);
  const setBalance = useCallback(async (amount: number) => {
    const updated = { ...bank, balance: amount };
    setBank(updated);
    await AsyncStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(updated));
  }, [bank]);

  return (
    <MockBankContext.Provider value={{ bank, isLoading, debit, setBalance, resetBalance }}>
      {children}
    </MockBankContext.Provider>
  );
}

export const useMockBank = () => useContext(MockBankContext);

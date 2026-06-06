import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors, type ThemeColors } from '@/constants/Colors';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = '@thrifty_theme_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  // Load saved preference on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') {
          setModeState(saved);
        }
      } catch {
        // Ignore — default to light
      }
    })();
  }, []);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // For now, 'system' resolves to light. Could use Appearance API later.
  const isDark = mode === 'dark';
  const colors = useMemo(() => (isDark ? DarkColors : LightColors), [isDark]);

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Shorthand: returns just the current colors.
 * Use this in components that only need colors.
 */
export function useColors(): ThemeColors {
  return useTheme().colors;
}

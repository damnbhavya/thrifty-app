import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const OFFLINE_QUEUE_KEY = 'thrifty_offline_payments_queue';
const CACHE_EXPIRY_MS = 1000 * 60 * 5; // 5 minutes TTL

interface Transaction {
  merchant: string;
  amount: number;
  type: string;
  category: string;
  date: string;
}

interface MonthlyReport {
  id: string;
  user_id: string;
  month: number;
  year: number;
  category_totals: Record<string, number>;
  transactions: Transaction[];
  personality: any;
  created_at: string;
}

interface ReportsResponse {
  report: MonthlyReport | null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Generic authenticated fetch wrapper.
 */
export async function fetchWithAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = await getAuthHeaders();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string> || {}),
      },
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    console.error('Network Error:', error);
    return {
      ok: false,
      status: 503,
      json: async () => ({ error: 'Network error or backend unreachable' }),
    } as any as Response;
  }
}

// ─── Caching Helpers ───
async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY_MS) return null; // Expired
    return data;
  } catch {
    return null;
  }
}

async function setCachedData(key: string, data: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.error('Cache set error:', e);
  }
}

// ─── Reports ───

export async function fetchReports(month: number, year: number): Promise<MonthlyReport | null> {
  const cacheKey = `thrifty_reports_${month}_${year}`;
  const cached = await getCachedData<MonthlyReport>(cacheKey);
  if (cached) return cached; // Return instantly if in cache

  try {
    const response = await fetchWithAuth(`/reports/${month}/${year}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      return null;
    }
    const json = await response.json();
    if (json.data) setCachedData(cacheKey, json.data);
    return json.data || null;
  } catch (error) {
    return null;
  }
}

export async function fetchAllReports(): Promise<MonthlyReport[]> {
  const cacheKey = 'thrifty_all_reports';
  const cached = await getCachedData<MonthlyReport[]>(cacheKey);
  
  // Stale-while-revalidate pattern: return cache if exists, but trigger background fetch
  const networkFetch = async () => {
    try {
      const response = await fetchWithAuth(`/reports`);
      if (response.ok) {
        const json = await response.json();
        if (Array.isArray(json.data)) {
          await setCachedData(cacheKey, json.data);
          return json.data;
        }
      }
    } catch (e) {}
    return [];
  };

  if (cached) {
    networkFetch(); // Fire and forget to update cache for next time
    return cached;
  }
  return await networkFetch();
}

export async function fetchCurrentMonthReport(): Promise<MonthlyReport | null> {
  const now = new Date();
  const current = await fetchReports(now.getMonth() + 1, now.getFullYear());
  if (current) return current;
  const allReports = await fetchAllReports();
  const latestWithTransactions = allReports.find(
    (report) => Array.isArray(report.transactions) && report.transactions.length > 0
  );
  return latestWithTransactions || allReports[0] || null;
}

// ─── Merchant Overrides ───

interface MerchantOverride {
  id: string;
  user_id: string;
  merchant_name: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export async function fetchOverrides(): Promise<MerchantOverride[]> {
  try {
    const response = await fetchWithAuth(`/overrides`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.overrides || [];
  } catch (error) {
    return [];
  }
}

export async function saveOverride(merchantName: string, category: string): Promise<{ error: Error | null }> {
  try {
    const response = await fetchWithAuth(`/overrides`, {
      method: 'PUT',
      body: JSON.stringify({ merchant_name: merchantName, category }),
    });
    if (!response.ok) {
      const data = await response.json();
      return { error: new Error(data.error || 'Failed to save override') };
    }
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function deleteOverride(merchantName: string): Promise<{ error: Error | null }> {
  try {
    const response = await fetchWithAuth(`/overrides`, {
      method: 'DELETE',
      body: JSON.stringify({ merchant_name: merchantName }),
    });
    if (!response.ok) {
      const data = await response.json();
      return { error: new Error(data.error || 'Failed to delete override') };
    }
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

// ─── Real Payments (UPI 123Pay) & Offline Queue ───

interface PaymentResult {
  success: boolean;
  data?: any;
  budgetWarnings?: Array<{
    category: string;
    limit: number;
    spent: number;
    percent: number;
    level: 'warning' | 'exceeded';
  }>;
  error?: string;
  queuedOffline?: boolean;
}

export async function enqueueOfflinePayment(payload: any) {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = existing ? JSON.parse(existing) : [];
    queue.push(payload);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log(`Payment added to offline queue. Total pending: ${queue.length}`);
  } catch (e) {
    console.error('Failed to enqueue offline payment', e);
  }
}

export async function processOfflineQueue() {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!existing) return;
    const queue = JSON.parse(existing);
    if (queue.length === 0) return;

    console.log(`Processing offline queue... (${queue.length} items)`);
    const newQueue = [];

    for (const payload of queue) {
      const response = await fetchWithAuth('/pay/log', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok && response.status === 503) {
        // Still offline, keep in queue
        newQueue.push(payload);
      } else {
        // Success or permanent error (400), remove from queue
        console.log(`Offline payment processed: ${payload.transaction_ref}`);
      }
    }

    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
  } catch (e) {
    console.error('Error processing offline queue', e);
  }
}

/**
 * Send a real payment to the backend.
 * If network fails, queues the payment offline and returns success=true.
 */
export async function sendPayment(params: {
  amount: number;
  paid_to: string;
  category: string;
  note?: string;
}): Promise<PaymentResult> {
  const txnRef = `UPI${Date.now().toString(36).toUpperCase()}`;
  const payload = {
    amount: params.amount,
    paid_to: params.paid_to,
    category: params.category,
    note: params.note || '',
    transaction_ref: txnRef,
    status: 'success',
  };

  try {
    const response = await fetchWithAuth('/pay/log', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 503) {
        // Network Error -> Offline Queue
        await enqueueOfflinePayment(payload);
        return { success: true, queuedOffline: true, data: payload };
      }
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data.error || `Payment failed (${response.status})` };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data,
      budgetWarnings: data.budgetWarnings || [],
    };
  } catch (error) {
    console.error('Payment error:', error);
    await enqueueOfflinePayment(payload);
    return { success: true, queuedOffline: true, data: payload };
  }
}

/**
 * Get AI-suggested category for a payee.
 */
export async function suggestCategory(payeeName: string, amount?: number): Promise<{ category: string; source: string } | null> {
  try {
    const response = await fetchWithAuth('/pay/suggest-category', {
      method: 'POST',
      body: JSON.stringify({ payee_name: payeeName, amount }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || null;
  } catch {
    return null;
  }
}

// ─── Contacts ───

export interface Contact {
  id: string;
  user_id: string;
  payee_name: string;
  upi_id: string;
  created_at: string;
}

export async function fetchContacts(): Promise<Contact[]> {
  const cacheKey = 'thrifty_saved_contacts';
  const cached = await getCachedData<Contact[]>(cacheKey);

  const networkFetch = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user_id = sessionData.session?.user.id;
      if (!user_id) return [];

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contacts:', error);
        return [];
      }
      if (data) await setCachedData(cacheKey, data);
      return data || [];
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
  };

  if (cached) {
    networkFetch();
    return cached;
  }
  return await networkFetch();
}

export async function saveContact(payee_name: string, upi_id: string): Promise<{ error: Error | null }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user_id = sessionData.session?.user.id;
    if (!user_id) return { error: new Error('User not logged in') };

    const { error } = await supabase
      .from('contacts')
      .upsert(
        { user_id, payee_name, upi_id },
        { onConflict: 'user_id, upi_id' }
      );

    if (error) {
      console.error('Error saving contact:', error);
      return { error: new Error(error.message) };
    }
    
    // Invalidate contacts cache
    await AsyncStorage.removeItem('thrifty_saved_contacts');
    
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export type { Transaction, MonthlyReport, MerchantOverride, PaymentResult };

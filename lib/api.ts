import { supabase } from '@/lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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
 * Usage: const res = await fetchWithAuth('/pay/log', { method: 'POST', body: ... })
 */
export async function fetchWithAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = await getAuthHeaders();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string> || {}),
    },
  });
}

/**
 * Fetch monthly report from the backend.
 * Reuses the existing /reports endpoint from the website.
 */
export async function fetchReports(
  month: number,
  year: number
): Promise<MonthlyReport | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/reports?month=${month}&year=${year}`,
      { headers }
    );

    if (!response.ok) {
      console.error('Reports API error:', response.status);
      return null;
    }

    const data: ReportsResponse = await response.json();
    return data.report || null;
  } catch (error) {
    console.error('Error fetching reports:', error);
    return null;
  }
}

/**
 * Fetch current month's report.
 */
export async function fetchCurrentMonthReport(): Promise<MonthlyReport | null> {
  const now = new Date();
  return fetchReports(now.getMonth() + 1, now.getFullYear());
}

export type { Transaction, MonthlyReport, MerchantOverride };

// ─── Merchant Overrides ───

interface MerchantOverride {
  id: string;
  user_id: string;
  merchant_name: string;
  category: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all merchant overrides for the current user.
 */
export async function fetchOverrides(): Promise<MerchantOverride[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/overrides`, { headers });

    if (!response.ok) {
      console.error('Overrides API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.overrides || [];
  } catch (error) {
    console.error('Error fetching overrides:', error);
    return [];
  }
}

/**
 * Save or update a merchant override (upsert).
 */
export async function saveOverride(
  merchantName: string,
  category: string
): Promise<{ error: Error | null }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/overrides`, {
      method: 'PUT',
      headers,
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

/**
 * Delete a merchant override.
 */
export async function deleteOverride(
  merchantName: string
): Promise<{ error: Error | null }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/overrides`, {
      method: 'DELETE',
      headers,
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

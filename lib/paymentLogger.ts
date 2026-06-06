import { Platform } from 'react-native';
import { fetchWithAuth } from './api';

export interface LogEntry {
  timestamp: string;
  category: 'SYSTEM' | 'NATIVE' | 'JS' | 'API';
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

class PaymentLogger {
  private logs: LogEntry[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.log('Payment logging system initialized', 'SYSTEM', 'info');
  }

  /**
   * Add a log entry.
   */
  log(message: string, category: 'SYSTEM' | 'NATIVE' | 'JS' | 'API', level: 'info' | 'warn' | 'error' | 'success' = 'info') {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      category,
      level,
      message,
    };
    
    // Print to console for terminal debugging
    const symbol = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`[ThriftyPay-${category}] ${symbol} ${message}`);
    
    this.logs.push(entry);
    
    // Keep max 500 logs to prevent memory leaks
    if (this.logs.length > 500) {
      this.logs.shift();
    }

    this.notifyListeners();
  }

  /**
   * Get all accumulated logs.
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear logs.
   */
  clear() {
    this.logs = [];
    this.log('Logs cleared', 'SYSTEM', 'info');
    this.notifyListeners();
  }

  /**
   * Generate a clean string representation of the logs, including device info.
   */
  exportLogs(payeeName?: string, amount?: string, upiId?: string): string {
    const header = [
      `========================================`,
      ` THRIFTY 123PAY TRANSACTION DEBUG LOG`,
      ` Generated: ${new Date().toLocaleString()}`,
      ` Platform: ${Platform.OS} (v${Platform.Version})`,
      ` Payee: ${payeeName || 'N/A'}`,
      ` Amount: ${amount || 'N/A'}`,
      ` UPI ID: ${upiId || 'N/A'}`,
      `========================================\n`
    ].join('\n');

    const logLines = this.logs.map(entry => {
      const time = entry.timestamp.split('T')[1].substring(0, 12); // HH:MM:SS.mmm
      const categoryPad = `[${entry.category}]`.padEnd(10);
      const levelPad = entry.level.toUpperCase().padEnd(8);
      return `${time} ${categoryPad} ${levelPad} ${entry.message}`;
    }).join('\n');

    return header + logLines;
  }

  /**
   * Send the logs to the Thrifty backend API.
   * This allows developers to see the logs directly without manual copy-paste.
   */
  async sendToServer(payeeName?: string, amount?: string, upiId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.log('Sending logs to Thrifty server...', 'API', 'info');
      const response = await fetchWithAuth('/pay/logs', {
        method: 'POST',
        body: JSON.stringify({
          deviceInfo: {
            platform: Platform.OS,
            version: Platform.Version,
            brand: Platform.select({ android: 'Android device', ios: 'iOS device', default: 'unknown' }),
          },
          transactionInfo: { payeeName, amount, upiId },
          logs: this.logs,
          rawExport: this.exportLogs(payeeName, amount, upiId)
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Server error ${response.status}`);
      }

      this.log('Logs successfully uploaded to Thrifty backend!', 'API', 'success');
      return { success: true };
    } catch (error: any) {
      this.log(`Failed to send logs to server: ${error.message}`, 'API', 'error');
      return { success: false, error: error.message };
    }
  }

  // --- Listeners for real-time UI updates ---

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => {
      try { l(); } catch (_) {}
    });
  }
}

export const logger = new PaymentLogger();

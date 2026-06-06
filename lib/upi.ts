/**
 * UPI Native Module — TypeScript wrapper for the Kotlin ThriftyPayModule.
 *
 * Provides a clean API for the React Native payment screens:
 * - startPayment(upiId, name, amount)
 * - cancelPayment()
 * - isAccessibilityEnabled() -> Promise<boolean>
 * - openAccessibilitySettings()
 *
 * Events (via NativeEventEmitter):
 * - onCallStarted
 * - onPinRequired({ payeeName, amount, upiId })
 * - onPaymentComplete({ payeeName, amount, upiId })
 * - onPaymentFailed({ error })
 * - onStatusUpdate({ message })
 */
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { ThriftyPayModule } = NativeModules;

// Gracefully handle missing native module (e.g. on iOS or web)
const isAvailable = Platform.OS === 'android' && !!ThriftyPayModule;

const emitter = isAvailable ? new NativeEventEmitter(ThriftyPayModule) : null;

export type UPIEvent =
  | 'onCallStarted'
  | 'onPinRequired'
  | 'onPaymentComplete'
  | 'onPaymentFailed'
  | 'onStatusUpdate';

export interface PinRequiredPayload {
  payeeName: string;
  amount: string;
  upiId: string;
}

export interface PaymentCompletePayload {
  payeeName: string;
  amount: string;
  upiId: string;
}

export interface PaymentFailedPayload {
  error: string;
}

export interface StatusUpdatePayload {
  message: string;
}

const UPI = {
  /**
   * Whether the native module is available (Android only).
   */
  isAvailable,

  /**
   * Check if the Thrifty Accessibility Service is enabled for USSD automation.
   */
  isAccessibilityEnabled: async (): Promise<boolean> => {
    if (!isAvailable) return false;
    return ThriftyPayModule.isAccessibilityEnabled();
  },

  /**
   * Open Android Accessibility Settings to allow the user to enable the service.
   */
  openAccessibilitySettings: (): void => {
    if (!isAvailable) return;
    ThriftyPayModule.openAccessibilitySettings();
  },

  /**
   * Start a USSD (*99#) payment flow.
   */
  startPayment: (upiId: string, name: string, amount: string): void => {
    if (!isAvailable) return;
    ThriftyPayModule.startUssdPayment(upiId, name, amount);
  },

  /**
   * Cancel any in-progress payment and hang up.
   */
  cancelPayment: (): void => {
    if (!isAvailable) return;
    ThriftyPayModule.cancelPayment();
  },

  /**
   * Subscribe to a UPI event.
   * Returns an unsubscribe function.
   */
  addEventListener: (event: UPIEvent, callback: (data: any) => void): (() => void) => {
    if (!emitter) return () => {};
    const subscription = emitter.addListener(event, callback);
    return () => subscription.remove();
  },
};

export default UPI;

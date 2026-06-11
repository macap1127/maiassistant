// RevenueCat (Google Play Billing + Apple IAP) integration for native builds.
// On web, all functions are no-ops — the web app continues to use Stripe.
import { Capacitor } from '@capacitor/core';

// RevenueCat API keys — these are PUBLISHABLE keys, safe to ship in client code.
// Get them from app.revenuecat.com → Project settings → API keys.
// Replace the placeholders below with your real keys.
const REVENUECAT_ANDROID_KEY = 'goog_gXRwdrJEkRXwcdUmSLRUAraaJgR';
const REVENUECAT_IOS_KEY = 'appl_YOUR_IOS_KEY_HERE';

// Map your in-app Product IDs (used in code) to RevenueCat entitlement IDs.
// In RevenueCat, you create "Entitlements" (e.g. "basic", "family", "family_plus")
// and attach store products to them.
export const ENTITLEMENTS = {
  basic: 'basic',
  family: 'family',
  family_plus: 'family_plus',
} as const;

export const isNative = () => Capacitor.isNativePlatform();

let initialized = false;

export async function initRevenueCat(appUserId?: string) {
  if (!isNative() || initialized) return;
  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
  await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
  const platform = Capacitor.getPlatform();
  const apiKey = platform === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
  await Purchases.configure({ apiKey, appUserID: appUserId });
  initialized = true;
}

export async function getOfferings() {
  if (!isNative()) return null;
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(rcPackage: any) {
  if (!isNative()) throw new Error('Native purchases only available on device');
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  return Purchases.purchasePackage({ aPackage: rcPackage });
}

export async function getActiveEntitlements(): Promise<string[]> {
  if (!isNative()) return [];
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const info = await Purchases.getCustomerInfo();
  return Object.keys(info.customerInfo.entitlements.active);
}

export async function restorePurchases() {
  if (!isNative()) return;
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  return Purchases.restorePurchases();
}

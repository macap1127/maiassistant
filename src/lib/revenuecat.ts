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

export const BILLING_BUILD_LABEL = 'Billing build v15';

export const getNativePlatform = (): 'android' | 'ios' | null => {
  const cap = (globalThis as any).Capacitor;
  const platform = cap?.getPlatform?.() ?? Capacitor.getPlatform?.();

  if (platform === 'android' || platform === 'ios') return platform;
  const nativePlatformReported = cap?.isNativePlatform?.() ?? Capacitor.isNativePlatform?.();
  if (nativePlatformReported) {
    const nativePlatform = cap?.getPlatform?.() ?? Capacitor.getPlatform();
    return nativePlatform === 'ios' ? 'ios' : 'android';
  }

  // Defensive fallback for release builds where the Capacitor bridge is slow or
  // not reported correctly on first render. Android native WebViews commonly
  // include `wv` in the UA and Capacitor serves bundled apps from localhost.
  if (typeof window !== 'undefined') {
    const ua = window.navigator.userAgent;
    const isAndroidWebView = /Android/i.test(ua) && (/\bwv\b/i.test(ua) || /Version\/\d+(?:\.\d+)*.*Chrome/i.test(ua));
    const isIosWebView = /iPad|iPhone|iPod/i.test(ua) && !/Safari/i.test(ua);
    const isCapacitorScheme = ['capacitor:', 'ionic:'].includes(window.location.protocol);
    const isCapacitorLocalhost = !!cap && window.location.hostname === 'localhost';
    if (isAndroidWebView) return 'android';
    if (isCapacitorScheme || isIosWebView) return 'ios';
    if (isCapacitorLocalhost) return /Android/i.test(ua) ? 'android' : 'ios';
  }

  return null;
};

export const isNative = () => getNativePlatform() !== null;

let initialized = false;

export async function initRevenueCat(appUserId?: string) {
  if (!isNative() || initialized) return;
  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
  await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
  const platform = getNativePlatform();
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

export async function logoutRevenueCat() {
  if (!isNative() || !initialized) return;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.logOut();
  } catch (e) {
    console.warn('[revenuecat] logout failed', e);
  }
  initialized = false;
}

// Map a RevenueCat Offering's packages to our internal price IDs.
// Assumes packages are configured in RC with the same identifiers as our Stripe
// lookup keys (mia_basic_monthly, mia_basic_yearly, etc.) OR with the standard
// RC identifiers ($rc_monthly / $rc_annual) when only one tier is exposed.
export type RcPackage = {
  identifier: string;
  product: { identifier: string; priceString: string; price: number };
};

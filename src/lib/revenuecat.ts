// RevenueCat (Google Play Billing + Apple IAP) integration for native builds.
// On web, all functions are no-ops — the web app continues to use Stripe.
import { Capacitor } from '@capacitor/core';

// RevenueCat API keys — these are PUBLISHABLE keys, safe to ship in client code.
// Get them from app.revenuecat.com → Project settings → API keys.
const REVENUECAT_ANDROID_KEY = 'goog_gXRwdrJEkRXwcdUmSLRUAraaJgR';
const REVENUECAT_IOS_KEY = 'appl_DuMXcyAUpKQmQBWCQYbxHHOscLw';

// Map your in-app Product IDs (used in code) to RevenueCat entitlement IDs.
// In RevenueCat, you create "Entitlements" (e.g. "basic", "family", "family_plus")
// and attach store products to them.
export const ENTITLEMENTS = {
  basic: 'basic',
  family: 'family',
  family_plus: 'family_plus',
} as const;

// Candidate App Store / Google Play product identifiers for each internal plan.
// RevenueCat will try these in order when purchasing directly by product ID.
// Update these if your actual App Store Connect product IDs differ.
export const PRODUCT_ID_CANDIDATES: Record<string, string[]> = {
  mia_basic_monthly: [
    'com.aiblueribbon.mia.basic.monthly',
    'com.aiblueribbon.mia.basic_monthly',
    'mia_basic_monthly',
    'mia.basic.monthly',
  ],
  mia_basic_yearly: [
    'com.aiblueribbon.mia.basic.yearly',
    'com.aiblueribbon.mia.basic_yearly',
    'mia_basic_yearly',
    'mia.basic.yearly',
  ],
  mia_family_monthly: [
    'com.aiblueribbon.mia.family.monthly',
    'com.aiblueribbon.mia.family_monthly',
    'mia_family_monthly',
    'mia.family.monthly',
  ],
  mia_family_yearly: [
    'com.aiblueribbon.mia.family.yearly',
    'com.aiblueribbon.mia.family_yearly',
    'mia_family_yearly',
    'mia.family.yearly',
  ],
  mia_family_plus_monthly: [
    'com.aiblueribbon.mia.familyplus.monthly',
    'com.aiblueribbon.mia.family_plus.monthly',
    'com.aiblueribbon.mia.family_plus_monthly',
    'mia_family_plus_monthly',
    'mia.familyplus.monthly',
  ],
  mia_family_plus_yearly: [
    'com.aiblueribbon.mia.familyplus.yearly',
    'com.aiblueribbon.mia.family_plus.yearly',
    'com.aiblueribbon.mia.family_plus_yearly',
    'mia_family_plus_yearly',
    'mia.familyplus.yearly',
  ],
};

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
let initPromise: Promise<void> | null = null;
let currentAppUserId: string | undefined;

async function doInit(appUserId?: string) {
  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
  await Purchases.setLogLevel({ level: LOG_LEVEL.INFO });
  const platform = getNativePlatform();
  const apiKey = platform === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
  await Purchases.configure({ apiKey, appUserID: appUserId });
  currentAppUserId = appUserId;
  initialized = true;
  console.log('[revenuecat] configured', { platform, appUserId: appUserId ?? '(anonymous)' });
}

/**
 * Configures RevenueCat exactly once. Safe to call from anywhere; concurrent
 * callers share the same in-flight promise so no purchase can ever run against
 * an unconfigured SDK. If a previous attempt failed, the next call retries.
 */
export async function initRevenueCat(appUserId?: string): Promise<void> {
  if (!isNative()) return;
  if (initialized) {
    // Identify the signed-in user if we configured anonymously earlier.
    if (appUserId && appUserId !== currentAppUserId) {
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        await Purchases.logIn({ appUserID: appUserId });
        currentAppUserId = appUserId;
      } catch (e) {
        console.warn('[revenuecat] logIn failed', e);
      }
    }
    return;
  }
  if (!initPromise) {
    initPromise = doInit(appUserId).catch((e) => {
      initPromise = null;
      throw e;
    });
  }
  return initPromise;
}

/** Guarantees the SDK is configured before any billing call. */
async function ensureConfigured() {
  if (!initialized) await initRevenueCat(currentAppUserId);
}

export async function getOfferings() {
  if (!isNative()) return null;
  await ensureConfigured();
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const offerings = await Purchases.getOfferings();
  console.log(
    '[revenuecat] offerings',
    offerings.current?.identifier,
    offerings.current?.availablePackages?.map((p: any) => `${p.identifier}:${p.product?.identifier}`),
  );
  return offerings.current;
}

export async function purchasePackage(rcPackage: any) {
  if (!isNative()) throw new Error('Native purchases only available on device');
  await ensureConfigured();
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  console.log('[revenuecat] purchasing package', rcPackage?.identifier, rcPackage?.product?.identifier);
  return Purchases.purchasePackage({ aPackage: rcPackage });
}

// Fallback path: buy a StoreKit / Play product directly by identifier when no
// RevenueCat Offering is configured (or the package is missing from it).
export async function purchaseProductById(productId: string) {
  if (!isNative()) throw new Error('Native purchases only available on device');
  await ensureConfigured();
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const candidates = Array.from(
    new Set([
      ...(PRODUCT_ID_CANDIDATES[productId] ?? [productId]),
      productId,
      productId.replace(/_/g, '.'),
      `com.aiblueribbon.mia.${productId}`,
    ]),
  );
  console.log('[revenuecat] looking up products:', candidates);
  let products: any[] = [];
  try {
    const res = await Purchases.getProducts({
      productIdentifiers: candidates,
      // @ts-expect-error type enum accepts string at runtime
      type: 'SUBS',
    });
    products = res.products ?? [];
  } catch (e) {
    console.warn('[revenuecat] getProducts(SUBS) failed, retrying without type', e);
  }
  if (products.length === 0) {
    const res = await Purchases.getProducts({ productIdentifiers: candidates });
    products = res.products ?? [];
  }
  console.log('[revenuecat] available products:', products.map((p: any) => p.identifier));
  const product =
    products.find((p: any) => candidates.includes(p.identifier)) ||
    products.find((p: any) => candidates.some((c) => p.identifier?.endsWith(c))) ||
    products[0];
  if (!product) {
    throw new Error(
      `This subscription isn't available from the store right now (${productId}). Please try again in a moment.`,
    );
  }
  console.log('[revenuecat] purchasing product:', product.identifier);
  return Purchases.purchaseStoreProduct({ product: product as any });
}

export async function getActiveEntitlements(): Promise<string[]> {
  if (!isNative()) return [];
  await ensureConfigured();
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const info = await Purchases.getCustomerInfo();
  return Object.keys(info.customerInfo.entitlements.active);
}

export async function restorePurchases() {
  if (!isNative()) return;
  await ensureConfigured();
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
  currentAppUserId = undefined;
}

// Map a RevenueCat Offering's packages to our internal price IDs.
// Assumes packages are configured in RC with the same identifiers as our Stripe
// lookup keys (mia_basic_monthly, mia_basic_yearly, etc.) OR with the standard
// RC identifiers ($rc_monthly / $rc_annual) when only one tier is exposed.
export type RcPackage = {
  identifier: string;
  product: { identifier: string; priceString: string; price: number };
};

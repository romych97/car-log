import Constants from "expo-constants";
import { Platform } from "react-native";
import Purchases, { type CustomerInfo } from "react-native-purchases";

import type { SQLiteDatabase } from "expo-sqlite";

import { getSettings, saveSettings } from "@/db/repositories/settings";

type ExtraConfig = {
  revenueCatAppleApiKey?: string;
  revenueCatGoogleApiKey?: string;
  revenueCatEntitlementId?: string;
};

function extra(): ExtraConfig {
  return (Constants.expoConfig?.extra ?? {}) as ExtraConfig;
}

export function isPurchasesConfigured(): boolean {
  if (Platform.OS === "web") return false;
  const { revenueCatAppleApiKey, revenueCatGoogleApiKey } = extra();
  if (Platform.OS === "ios") {
    return Boolean(revenueCatAppleApiKey?.trim());
  }
  if (Platform.OS === "android") {
    return Boolean(revenueCatGoogleApiKey?.trim());
  }
  return false;
}

function apiKeyForPlatform(): string | null {
  const { revenueCatAppleApiKey, revenueCatGoogleApiKey } = extra();
  if (Platform.OS === "ios") {
    return revenueCatAppleApiKey?.trim() || null;
  }
  if (Platform.OS === "android") {
    return revenueCatGoogleApiKey?.trim() || null;
  }
  return null;
}

function usesTestStoreKey(): boolean {
  const key = apiKeyForPlatform();
  return Boolean(key?.startsWith("test_"));
}

function configuredEntitlementId(): string {
  return extra().revenueCatEntitlementId?.trim() || "premium";
}

export function entitlementActive(info: CustomerInfo): boolean {
  const id = configuredEntitlementId();
  const active = info.entitlements.active;
  if (active[id] != null) {
    return true;
  }
  if (usesTestStoreKey()) {
    const ids = Object.keys(active);
    return ids.length > 0;
  }
  return false;
}

let configured = false;
let listenerAttached = false;

export async function configurePurchases(): Promise<void> {
  if (configured || !isPurchasesConfigured()) return;
  const key = apiKeyForPlatform();
  if (!key) return;
  Purchases.configure({ apiKey: key });
  configured = true;
}

export async function applyPremiumFromCustomerInfo(
  db: SQLiteDatabase,
  info: CustomerInfo,
): Promise<boolean> {
  const active = entitlementActive(info);
  const settings = await getSettings(db);
  if (settings.isPremium !== active) {
    await saveSettings(db, { ...settings, isPremium: active });
  }
  return active;
}

export async function syncPremiumToDatabase(
  db: SQLiteDatabase,
): Promise<boolean> {
  if (!isPurchasesConfigured()) {
    const settings = await getSettings(db);
    return settings.isPremium;
  }
  await configurePurchases();
  const info = await Purchases.getCustomerInfo();
  return applyPremiumFromCustomerInfo(db, info);
}

/** Keep Zustand in sync when RevenueCat pushes updated CustomerInfo. */
export function attachPremiumCustomerInfoListener(
  db: SQLiteDatabase,
  onPremiumChange: (active: boolean) => void,
): void {
  if (listenerAttached || !isPurchasesConfigured()) return;
  listenerAttached = true;
  void configurePurchases().then(() => {
    Purchases.addCustomerInfoUpdateListener((info) => {
      void applyPremiumFromCustomerInfo(db, info).then(onPremiumChange);
    });
  });
}

export type PurchaseErrorKind =
  | "user_cancelled"
  | "test_failure"
  | "unknown";

export type PurchaseAlertStrings = {
  premiumTestFailedTitle: string;
  premiumTestFailedHint: string;
  premiumPurchaseFailedTitle: string;
  premiumPurchaseFailedHint: string;
  premiumNoOfferingTitle: string;
  premiumNoOfferingHint: string;
  premiumNotConfigured: string;
  premiumRestoreFailedTitle: string;
  premiumRestoreFailedHint: string;
};

function purchasesErrorDetail(err: unknown): string | null {
  if (typeof err !== "object" || err == null) return null;
  const o = err as Record<string, unknown>;
  if (typeof o.underlyingErrorMessage === "string" && o.underlyingErrorMessage.trim()) {
    return o.underlyingErrorMessage.trim();
  }
  if (typeof o.message === "string" && o.message.trim()) {
    return o.message.trim();
  }
  return null;
}

/** User-facing alert copy for purchase / restore failures (not user cancel). */
export function getPurchaseFailureAlert(
  err: unknown,
  ss: PurchaseAlertStrings,
): { title: string; message: string } {
  if (err instanceof Error) {
    if (err.message === "no_offering") {
      return {
        title: ss.premiumNoOfferingTitle,
        message: ss.premiumNoOfferingHint,
      };
    }
    if (err.message === "purchases_not_configured") {
      return {
        title: ss.premiumPurchaseFailedTitle,
        message: ss.premiumNotConfigured,
      };
    }
  }

  const kind = classifyPurchaseError(err);
  if (kind === "test_failure") {
    return {
      title: ss.premiumTestFailedTitle,
      message: ss.premiumTestFailedHint,
    };
  }

  const detail = purchasesErrorDetail(err);
  const message = detail
    ? `${ss.premiumPurchaseFailedHint}\n\n${detail}`
    : ss.premiumPurchaseFailedHint;

  return {
    title: ss.premiumPurchaseFailedTitle,
    message,
  };
}

export function getRestoreFailureAlert(
  err: unknown,
  ss: PurchaseAlertStrings,
): { title: string; message: string } {
  const purchase = getPurchaseFailureAlert(err, ss);
  if (purchase.title !== ss.premiumPurchaseFailedTitle) {
    return purchase;
  }
  const detail = purchasesErrorDetail(err);
  return {
    title: ss.premiumRestoreFailedTitle,
    message: detail
      ? `${ss.premiumRestoreFailedHint}\n\n${detail}`
      : ss.premiumRestoreFailedHint,
  };
}

export function classifyPurchaseError(err: unknown): PurchaseErrorKind {
  if (typeof err !== "object" || err == null) return "unknown";
  const o = err as Record<string, unknown>;
  if (o.userCancelled === true || o.userCanceled === true) {
    return "user_cancelled";
  }
  const message = typeof o.message === "string" ? o.message : "";
  if (
    message.includes("Test purchase failure") ||
    message.includes("no real transaction occurred") ||
    o.code === 5 ||
    o.code === "5"
  ) {
    return "test_failure";
  }
  return "unknown";
}

export async function purchasePremiumPackage(): Promise<{
  success: boolean;
  userCanceled?: boolean;
}> {
  if (!isPurchasesConfigured()) {
    throw new Error("purchases_not_configured");
  }
  await configurePurchases();
  const offerings = await Purchases.getOfferings();
  const pkg =
    offerings.current?.availablePackages.find((p) => p.packageType === "MONTHLY") ??
    offerings.current?.availablePackages[0];
  if (!pkg) {
    throw new Error("no_offering");
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const fresh = await Purchases.getCustomerInfo();
    const info = entitlementActive(fresh) ? fresh : customerInfo;
    return { success: entitlementActive(info) };
  } catch (err: unknown) {
    if (classifyPurchaseError(err) === "user_cancelled") {
      return { success: false, userCanceled: true };
    }
    throw err;
  }
}

export async function restorePremiumPurchases(
  db: SQLiteDatabase,
): Promise<boolean> {
  if (!isPurchasesConfigured()) {
    throw new Error("purchases_not_configured");
  }
  await configurePurchases();
  const info = await Purchases.restorePurchases();
  return applyPremiumFromCustomerInfo(db, info);
}

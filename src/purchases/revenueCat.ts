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

function entitlementActive(info: CustomerInfo): boolean {
  const id = extra().revenueCatEntitlementId?.trim() || "premium";
  const ent = info.entitlements.active[id];
  return ent != null;
}

let configured = false;

export async function configurePurchases(): Promise<void> {
  if (configured || !isPurchasesConfigured()) return;
  const key = apiKeyForPlatform();
  if (!key) return;
  Purchases.configure({ apiKey: key });
  configured = true;
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
  const active = entitlementActive(info);
  const settings = await getSettings(db);
  if (settings.isPremium !== active) {
    await saveSettings(db, { ...settings, isPremium: active });
  }
  return active;
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
    return { success: entitlementActive(customerInfo) };
  } catch (err: unknown) {
    const canceled =
      typeof err === "object" &&
      err != null &&
      "userCancelled" in err &&
      (err as { userCancelled?: boolean }).userCancelled;
    if (canceled) {
      return { success: false, userCanceled: true };
    }
    throw err;
  }
}

export async function restorePremiumPurchases(): Promise<boolean> {
  if (!isPurchasesConfigured()) {
    throw new Error("purchases_not_configured");
  }
  await configurePurchases();
  const info = await Purchases.restorePurchases();
  return entitlementActive(info);
}

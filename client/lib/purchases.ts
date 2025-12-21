import Purchases, {
  PurchasesPackage,
  CustomerInfo,
} from "react-native-purchases";
import { Platform } from "react-native";
import Constants from "expo-constants";

// RevenueCat API Keys
const REVENUECAT_API_KEY_IOS = "appl_vMQWTMdLYvLemTIvZmHBBmIXChZ";
const REVENUECAT_API_KEY_ANDROID = ""; // Add Android key when Google Play is configured

// Entitlement identifier from RevenueCat dashboard
export const REC_YARD_ENTITLEMENT = "rec_yard_access";

// Product identifiers (must match RevenueCat dashboard and App Store Connect)
export const REC_YARD_PRODUCT = "rec_yard_monthly";

// Detect if running in Expo Go (no native store access)
const isExpoGo = Constants.appOwnership === "expo";

export interface SubscriptionStatus {
  isSubscribed: boolean;
  expirationDate: string | null;
  willRenew: boolean;
  productIdentifier: string | null;
}

/**
 * Initialize RevenueCat SDK
 * Call this early in app startup (e.g., in App.tsx)
 */
export async function initializePurchases(): Promise<void> {
  // Skip RevenueCat in Expo Go - it doesn't have native store access
  if (isExpoGo) {
    console.log(
      "[Purchases] Running in Expo Go - using development mode (subscriptions mocked)",
    );
    return;
  }

  try {
    const apiKey =
      Platform.OS === "ios"
        ? REVENUECAT_API_KEY_IOS
        : REVENUECAT_API_KEY_ANDROID;

    await Purchases.configure({ apiKey });
    console.log("[Purchases] RevenueCat initialized successfully");
  } catch (error) {
    console.error("[Purchases] Failed to initialize:", error);
  }
}

/**
 * Set user ID for RevenueCat (for cross-platform sync)
 */
export async function setUserId(userId: string): Promise<void> {
  if (isExpoGo) {
    console.log("[Purchases] Dev mode - user ID:", userId);
    return;
  }

  try {
    await Purchases.logIn(userId);
    console.log("[Purchases] User logged in:", userId);
  } catch (error) {
    console.error("[Purchases] Failed to log in user:", error);
  }
}

/**
 * Check if user has active Rec Yard subscription
 * In Expo Go, returns subscribed=true for testing
 */
export async function checkRecYardAccess(): Promise<SubscriptionStatus> {
  // In Expo Go, grant access for testing
  if (isExpoGo) {
    console.log("[Purchases] Dev mode - granting Rec Yard access for testing");
    return {
      isSubscribed: true,
      expirationDate: null,
      willRenew: true,
      productIdentifier: "dev_mode",
    };
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[REC_YARD_ENTITLEMENT];

    if (entitlement) {
      return {
        isSubscribed: true,
        expirationDate: entitlement.expirationDate,
        willRenew: entitlement.willRenew,
        productIdentifier: entitlement.productIdentifier,
      };
    }

    return {
      isSubscribed: false,
      expirationDate: null,
      willRenew: false,
      productIdentifier: null,
    };
  } catch (error) {
    console.error("[Purchases] Failed to check access:", error);
    return {
      isSubscribed: false,
      expirationDate: null,
      willRenew: false,
      productIdentifier: null,
    };
  }
}

/**
 * Get available packages for Rec Yard subscription
 */
export async function getRecYardPackages(): Promise<PurchasesPackage[]> {
  if (isExpoGo) {
    console.log("[Purchases] Dev mode - no packages available");
    return [];
  }

  try {
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings.current;

    if (currentOffering) {
      return currentOffering.availablePackages;
    }

    return [];
  } catch (error) {
    console.error("[Purchases] Failed to get packages:", error);
    return [];
  }
}

/**
 * Purchase Rec Yard subscription
 */
export async function purchaseRecYard(
  pkg?: PurchasesPackage,
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  if (isExpoGo) {
    console.log("[Purchases] Dev mode - simulating successful purchase");
    return { success: true };
  }

  if (!pkg) {
    return { success: false, error: "No package provided" };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    const hasAccess =
      customerInfo.entitlements.active[REC_YARD_ENTITLEMENT] !== undefined;

    if (hasAccess) {
      console.log("[Purchases] Rec Yard purchase successful!");
      return { success: true, customerInfo };
    } else {
      return {
        success: false,
        error: "Purchase completed but entitlement not found",
      };
    }
  } catch (error: unknown) {
    // Handle user cancellation gracefully
    if (
      error &&
      typeof error === "object" &&
      "userCancelled" in error &&
      error.userCancelled
    ) {
      return { success: false, error: "cancelled" };
    }
    console.error("[Purchases] Purchase failed:", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? (error as { message: string }).message
        : "Purchase failed";
    return { success: false, error: message };
  }
}

/**
 * Restore purchases (for users who reinstall or switch devices)
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  hasRecYard: boolean;
  error?: string;
}> {
  if (isExpoGo) {
    console.log("[Purchases] Dev mode - simulating restore with access");
    return { success: true, hasRecYard: true };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasAccess =
      customerInfo.entitlements.active[REC_YARD_ENTITLEMENT] !== undefined;

    return { success: true, hasRecYard: hasAccess };
  } catch (error: any) {
    console.error("[Purchases] Restore failed:", error);
    return { success: false, hasRecYard: false, error: error.message };
  }
}

/**
 * Format price from package
 */
export function formatPrice(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

/**
 * Get subscription period description
 */
export function getSubscriptionPeriod(pkg: PurchasesPackage): string {
  const period = pkg.product.subscriptionPeriod;
  if (!period) return "";

  switch (period) {
    case "P1M":
      return "per month";
    case "P1Y":
      return "per year";
    case "P1W":
      return "per week";
    default:
      return "";
  }
}

import Purchases, {
  PurchasesPackage,
  CustomerInfo,
} from "react-native-purchases";
import { Platform } from "react-native";

// RevenueCat API Keys
const REVENUECAT_API_KEY_IOS = "appl_vMQWTMdLYvLemTIvZmHBBmIXChZ";
const REVENUECAT_API_KEY_ANDROID = ""; // Add Android key when Google Play is configured

// Entitlement identifier from RevenueCat dashboard
export const REC_YARD_ENTITLEMENT = "rec_yard_access";

// Product identifiers
export const REC_YARD_MONTHLY = "rec_yard_monthly";

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
  try {
    await Purchases.logIn(userId);
    console.log("[Purchases] User logged in:", userId);
  } catch (error) {
    console.error("[Purchases] Failed to log in user:", error);
  }
}

/**
 * Check if user has active Rec Yard subscription
 */
export async function checkRecYardAccess(): Promise<SubscriptionStatus> {
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
  pkg: PurchasesPackage,
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
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
  } catch (error: any) {
    // Handle user cancellation gracefully
    if (error.userCancelled) {
      return { success: false, error: "cancelled" };
    }
    console.error("[Purchases] Purchase failed:", error);
    return { success: false, error: error.message || "Purchase failed" };
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

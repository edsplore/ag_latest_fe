import { doc, setDoc, getDoc, collection , getDocs } from "firebase/firestore";
import { db } from "./firebase";
// Creating user in Firestore
export const createUserInFirebase = async (
  email: string,
  userId: string,
): Promise<string | null> => {
  try {
    const stripeResponse = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/payment/create-customer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
        }),
      },
    );
    if (!stripeResponse.ok) {
      return null;
    }
    const stripeData = await stripeResponse.json();
    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
      { stripeCustomerId: stripeData.customerId },
      { merge: true },
    );
    return stripeData.customerId;
  } catch (error) {
    console.error("Error creating customer:", error);
    return null;
  }
};

// Fetching customerId of a user from Firebase
export const getCustomerId = async (userId: string): Promise<string | null> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists() && userDoc.data().stripeCustomerId) {
      return userDoc.data().stripeCustomerId;
    }

    return null;
  } catch (error) {
    console.error("Error retrieving Stripe customer ID:", error);
    return null;
  }
};

// Fetching the subscriptions of a user
export const getSubscriptions = async (customerId: string): Promise<any> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/payment/check-active-subscription?customerId=${customerId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );
    if (!response.ok) throw new Error("Something went wrong!");
    const data = await response.json();
    return data.hasSubscription
      ? data.subscriptionDetails
      : { active: false, message: data.message };
  } catch (error) {
    console.error("Error finding customer:", error);
    return null;
  }
};

// Setting up dynamic subscription payment method
export const setupMonthlyPlanPayment = async (
  userId: string,
  productId: string,
  customerId: string,
  email: string,
): Promise<string | null> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/payment/create-plan-subscription-session`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          productId,
          customerId,
          email: email,
          return_url:
            window.location.origin +
            "/dashboard/billing" +
            window.location.search,
        }),
      },
    );

    if (!response.ok) throw new Error("Failed to setup payment method");
    const data = await response.json();

    window.location.href = data.sessionUrl;
    return data.sessionId;
  } catch (error) {
    console.error("Error setting up payment:", error);
    return null;
  }
};

// Setting up dynamic subscription payment method
export const setupPaymentMethod = async (
  userId: string,
  email: string,
  customerId: string,
): Promise<string | null> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/payment/setup-subscription-payment-method`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          email: email,
          customerId,
          return_url:
            window.location.origin +
            "/dashboard/billing" +
            window.location.search,
        }),
      },
    );

    if (!response.ok) throw new Error("Failed to setup payment method");
    const data = await response.json();

    window.location.href = data.sessionUrl;
    return data.sessionId;
  } catch (error) {
    console.error("Error setting up payment:", error);
    return null;
  }
};

export const checkPaymentMethodSetup = async (
  customerId: string,
): Promise<any> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/payment/check-payment-method-setup?customerId=${customerId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) throw new Error("Failed to check payment method setup");

    const data = await response.json();

    if (!data.success) {
      return {
        hasValidPaymentMethod: false,
        hasDynamicSetup: false,
        message: data.error || "Could not retrieve payment information",
        paymentMethods: [],
      };
    }

    return {
      hasValidPaymentMethod: data.hasValidPaymentMethod,
      hasDynamicSetup: data.hasDynamicPaymentSetup,
      defaultPaymentMethod: data.defaultPaymentMethod,
      paymentMethods: data.paymentMethods || [],
      success: true,
    };
  } catch (error) {
    console.error("Error checking payment method setup:", error);
    return {
      hasValidPaymentMethod: false,
      hasDynamicSetup: false,
      message: "Failed to retrieve payment setup information",
      paymentMethods: [],
      success: false,
    };
  }
};

// Fetch customer invoices
export const fetchCustomerInvoices = async (
  customerId: string,
): Promise<any[]> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/payment/invoices/${customerId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) throw new Error("Failed to fetch invoices");
    const data = await response.json();

    return data.invoices || [];
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }
};
// Trigger top-up
export const setupOneTimeTopUp = async (
  userId: string,
  amount: number,
  customerId: string,
  email: string,
): Promise<void> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/payment/create-topup-session`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount,
          customerId,
          email,
          return_url: `${window.location.origin}/dashboard/billing${window.location.search}`,
        }),
      },
    );

    if (!response.ok) throw new Error("Failed to create top-up session");

    const data = await response.json();
    window.location.href = data.sessionUrl;
  } catch (error) {
    console.error("Error creating top-up session:", error);
    throw error;
  }
};

export const getUsageDetails = async (
  userId: string,
): Promise<{
  currentBalance: number;
  totalUsage: number;
  totalCalls: number;
  nextInvoiceDate: string;
}> => {
  try {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // console.log(currentMonthKey);

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    let currentBalance = 0;
    let totalUsage = 0;

    if (userSnap.exists()) {
      const userData = userSnap.data();
      totalUsage = userData.usage / 100 || 0;
      let balance: number = userData.balance || 0;
      currentBalance = balance - totalUsage || 0;
    }

    const invoiceRef = doc(db, "users", userId, "invoices", currentMonthKey);
    const invoiceSnap = await getDoc(invoiceRef);

    let totalCalls = 0;

    if (invoiceSnap.exists()) {
      const invoiceData = invoiceSnap.data();
      totalCalls = invoiceData.total_convs || 0;
    }

    // Next invoice is due on the 1st of next month
    const nextInvoiceDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      .toISOString()
      .split("T")[0];

    // console.log(currentBalance, totalUsage, totalCalls, nextInvoiceDate);

    return {
      currentBalance,
      totalUsage,
      totalCalls,
      nextInvoiceDate,
    };
  } catch (error) {
    console.error("Error fetching usage details:", error);
    return {
      currentBalance: 0,
      totalUsage: 0,
      totalCalls: 0,
      nextInvoiceDate: "",
    };
  }
};
export const getUserInvoices = async (
  userId: string
): Promise<{
  paidInvoices: any[];
  unpaidInvoices: any[];
}> => {
  try {
    const invoicesRef = collection(db, "users", userId, "invoices");
    const invoicesSnap = await getDocs(invoicesRef);

    const paidInvoices: any[] = [];
    const unpaidInvoices: any[] = [];

    invoicesSnap.forEach((doc) => {
      const data = doc.data();
      const invoice = { id: doc.id, ...data };

      if (data.invoiceStatus === "paid") {
        paidInvoices.push(invoice);
      } else {
        unpaidInvoices.push(invoice);
      }
    });

    return { paidInvoices, unpaidInvoices };
  } catch (error) {
    console.error("Error fetching user invoices:", error);
    return { paidInvoices: [], unpaidInvoices: [] };
  }
};
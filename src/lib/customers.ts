import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// Creating user in Firestore
export const createUserInFirebase = async (
  email: string,
  userId: string,
): Promise<string | null> => {
  try {
    const stripeResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/payment/create-customer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
      }),
    });
    if(!stripeResponse.ok){
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
    console.log({userId, userCID: userDoc.data().stripeCustomerId})
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
            window.location.origin + "/billing" + window.location.search,
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
            window.location.origin + "/billing" + window.location.search,
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
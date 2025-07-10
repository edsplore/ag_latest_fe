
import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { CheckCircle, CreditCard, Loader } from "lucide-react";
import { useNavigate } from "react-router-dom";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_your_key_here");

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

interface UserData {
  email: string;
  role: 'admin' | 'user';
  createdByAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  hasToppedUp?: boolean;
}

const PaymentForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const stripe = useStripe();
  const elements = useElements();
  const { getEffectiveUser } = useAuth();
  const user = getEffectiveUser();

  const handlePaymentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements || !user) {
      setError("Payment system not ready. Please try again.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError("Card information is required.");
        setIsProcessing(false);
        return;
      }

      // Create payment method
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

      if (paymentMethodError) {
        setError(paymentMethodError.message || "An error occurred while processing your payment.");
        setIsProcessing(false);
        return;
      }

      // Create payment intent on your backend
      const response = await fetch(`${BACKEND_URL}/create-payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          amount: 5000, // $50.00 in cents
          currency: "usd",
          payment_method_id: paymentMethod.id,
        }),
      });

      const { client_secret, error: backendError } = await response.json();

      if (backendError) {
        setError(backendError);
        setIsProcessing(false);
        return;
      }

      // Confirm payment
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(client_secret);

      if (confirmError) {
        setError(confirmError.message || "Payment failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent.status === "succeeded") {
        // Update user document in Firestore
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          hasToppedUp: true,
          updatedAt: new Date(),
        });

        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
        <p className="text-gray-300 text-center">
          Your account has been topped up with $50. Redirecting to dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Top Up Your Account</h2>
        <p className="text-gray-300">Add $50 to start using Xpress-voice</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-md">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handlePaymentSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Card Information
          </label>
          <div className="p-3 bg-gray-700 rounded-md border border-gray-600">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#ffffff",
                    "::placeholder": {
                      color: "#9ca3af",
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-gray-700 rounded-md p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Amount:</span>
            <span className="text-white font-bold text-xl">$50.00</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <>
              <Loader className="animate-spin w-4 h-4 mr-2" />
              Processing Payment...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay $50.00
            </>
          )}
        </button>
      </form>
    </div>
  );
};

const Payment: React.FC = () => {
  const [hasToppedUp, setHasToppedUp] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { getEffectiveUser } = useAuth();
  const navigate = useNavigate();
  const user = getEffectiveUser();

  useEffect(() => {
    checkUserToppedUpStatus();
  }, [user]);

  const checkUserToppedUpStatus = async () => {
    if (!user) return;

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        setHasToppedUp(userData.hasToppedUp || false);
      } else {
        setHasToppedUp(false);
      }
    } catch (error) {
      console.error("Error checking user topped up status:", error);
      setHasToppedUp(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setHasToppedUp(true);
    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  };

  const handleTopupClick = () => {
    setHasToppedUp(null); // Show payment form
  };

  if (loading) {
    return (
      <div className="w-screen h-screen flex justify-center items-center text-white bg-black">
        <div className="flex items-center space-x-2">
          <Loader className="animate-spin w-6 h-6" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex justify-center items-center text-white bg-black">
      <div className="flex flex-col items-center">
        {hasToppedUp === true ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Account Already Topped Up</h2>
            <p className="text-gray-300 mb-6">
              Your account has been topped up. You can now use all features of Xpress-voice.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-md transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : hasToppedUp === false ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <CreditCard className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Top Up Required</h2>
            <p className="text-gray-300 mb-6">
              To start using Xpress-voice, you need to top up your account with $50.
            </p>
            <button
              onClick={handleTopupClick}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-md transition-colors text-lg font-medium"
            >
              Top Up $50 to Start Using Xpress-voice
            </button>
          </div>
        ) : (
          <PaymentForm onSuccess={handlePaymentSuccess} />
        )}
      </div>
    </div>
  );
};

const PaymentWrapper: React.FC = () => {
  return (
    <Elements stripe={stripePromise}>
      <Payment />
    </Elements>
  );
};

export default PaymentWrapper;

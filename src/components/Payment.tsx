import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  CheckCircle,
  CreditCard,
  Loader,
  Sparkles,
  Shield,
  Zap,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  fetchCustomerInvoices,
  getCustomerId,
  setupMonthlyPlanPayment,
  getSubscriptions,
  checkPaymentMethodSetup,
  setupPaymentMethod,
  createUserInFirebase,
} from "../lib/customer";
import { plans } from "../lib/plans";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

interface UserData {
  email: string;
  role: "admin" | "user";
  createdByAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  hasToppedUp?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const PaymentForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const { getEffectiveUser } = useAuth();
  const user = getEffectiveUser();

  const handleCheckoutRedirect = async () => {
    if (!user) {
      setError("User not authenticated. Please log in and try again.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const stripe = await stripePromise;
      if (!stripe) {
        setError("Stripe failed to load. Please refresh and try again.");
        setIsProcessing(false);
        return;
      }

      // Create checkout session on your backend
      const response = await fetch(
        `${BACKEND_URL}/payment/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({
            amount: 5000, // $50.00 in cents
            currency: "usd",
            userId: user.uid,
            userEmail: user.email,
            successUrl: `${window.location.origin}/payment?success=true`,
            cancelUrl: `${window.location.origin}/payment?canceled=true`,
          }),
        },
      );

      const { sessionId, error: backendError } = await response.json();

      if (backendError) {
        setError(backendError);
        setIsProcessing(false);
        return;
      }

      // Redirect to Stripe Checkout
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: sessionId,
      });

      if (stripeError) {
        setError(
          stripeError.message ||
            "Failed to redirect to checkout. Please try again.",
        );
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <motion.div variants={childVariants} className="relative max-w-md w-full">
      {/* Background glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary-600/20 rounded-2xl blur-xl opacity-30" />

      <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Complete Your Setup
          </h2>
          <p className="text-gray-300">
            Add $50 to unlock all Xpress-voice features
          </p>
        </div>

        {/* Features preview */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mb-6 grid grid-cols-1 gap-3"
        >
          {[
            { icon: Zap, text: "Unlimited voice calls" },
            { icon: Shield, text: "Priority support" },
            { icon: Sparkles, text: "Advanced AI features" },
          ].map((feature, index) => (
            <motion.div
              key={index}
              variants={childVariants}
              className="flex items-center space-x-3 text-sm text-gray-300"
            >
              <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                <feature.icon className="w-3 h-3 text-primary" />
              </div>
              <span>{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
          >
            <p className="text-red-400 text-sm">{error}</p>
          </motion.div>
        )}

        <div className="space-y-6">
          <div className="bg-gradient-to-r from-primary/10 to-primary-600/10 rounded-xl p-4 border border-primary/20">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">Amount:</span>
              <div className="text-right">
                <span className="text-white font-bold text-2xl">$50.00</span>
                <p className="text-xs text-gray-400">One-time payment</p>
              </div>
            </div>
          </div>

          <motion.button
            onClick={handleCheckoutRedirect}
            disabled={isProcessing}
            whileHover={{ scale: isProcessing ? 1 : 1.02 }}
            whileTap={{ scale: isProcessing ? 1 : 0.98 }}
            className="w-full group relative px-6 py-4 rounded-xl bg-gradient-to-r from-primary to-primary-600 text-white font-semibold text-lg transition-all duration-300 overflow-hidden hover:shadow-2xl hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-center">
              {isProcessing ? (
                <>
                  <Loader className="animate-spin w-5 h-5 mr-3" />
                  <span>Redirecting to Checkout...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-3" />
                  <span>Pay $50.00 with Stripe</span>
                  <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
          </motion.button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Secured by Stripe • 256-bit SSL encryption
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const Payment: React.FC = () => {
  const [hasToppedUp, setHasToppedUp] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const { getEffectiveUser } = useAuth();
  const navigate = useNavigate();
  const user = getEffectiveUser();

  useEffect(() => {
    checkUserToppedUpStatus();
    checkPaymentStatus();
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

  const checkPaymentStatus = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const canceled = urlParams.get("canceled");

    if (success === "true") {
      setPaymentSuccess(true);
      handlePaymentSuccess();
    } else if (canceled === "true") {
      // User canceled payment, just stay on payment page
      console.log("Payment was canceled");
    }
  };

  const handlePaymentSuccess = async () => {
    if (!user) return;

    try {
      // Update user document in Firestore
      const userDocRef = doc(db, "users", user.uid);
      
      // Get current user data to update balance
      const userDoc = await getDoc(userDocRef);
      const currentData = userDoc.exists() ? userDoc.data() : {};
      const currentBalance = currentData.totalBalance || 0;
      
      await updateDoc(userDocRef, {
        hasToppedUp: true,
        totalBalance: currentBalance + 50, // Add $50 to balance
        updatedAt: new Date(),
      });

      setHasToppedUp(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (error) {
      console.error("Error updating user document:", error);
    }
  };

  const handleTopupClick = () => {
    setHasToppedUp(null); // Show payment form
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-300 flex justify-center items-center text-white relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary-600/5" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center space-x-3"
        >
          <Loader className="animate-spin w-8 h-8 text-primary" />
          <span className="text-lg font-medium">Loading your account...</span>
        </motion.div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-dark-300 text-white relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5" />

        <div className="relative flex justify-center items-center min-h-screen p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-12 text-center max-w-md"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative mb-6"
            >
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
              <CheckCircle className="w-20 h-20 text-green-500 relative" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold text-white mb-3"
            >
              Payment Successful! 🎉
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-gray-300 text-lg max-w-md mb-6"
            >
              Your account has been topped up with $50. Welcome to Xpress-voice!
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center space-x-2 text-green-400"
            >
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm">Redirecting to dashboard...</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-300 text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary-600/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl animate-pulse" />

      <div className="relative flex justify-center items-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          {hasToppedUp === true ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl" />
              <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="flex justify-center mb-6"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                </motion.div>
                <h2 className="text-2xl font-bold mb-3">All Set! 🚀</h2>
                <p className="text-gray-300 mb-8 leading-relaxed">
                  Your account is ready to use. Access all Xpress-voice features
                  and start building amazing voice experiences.
                </p>
                <motion.button
                  onClick={() => navigate("/dashboard")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-green-500/25"
                >
                  <div className="flex items-center justify-center">
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>
              </div>
            </motion.div>
          ) : hasToppedUp === false ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary-600/20 rounded-2xl blur-xl opacity-30" />
              <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="flex justify-center mb-6"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary-600/30 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </div>
                </motion.div>
                <h2 className="text-3xl font-bold mb-3">Almost There!</h2>
                <p className="text-gray-300 mb-8 leading-relaxed">
                  Unlock the full power of Xpress-voice with unlimited voice
                  calls, premium features, and priority support.
                </p>

                {/* Features list */}
                <div className="mb-8 space-y-3">
                  {[
                    {
                      icon: Zap,
                      text: "Unlimited voice calls & conversations",
                    },
                    {
                      icon: Shield,
                      text: "Enterprise-grade security & support",
                    },
                    { icon: Sparkles, text: "Advanced AI models & features" },
                  ].map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="flex items-center space-x-3 text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-gray-300">{feature.text}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.button
                  onClick={handleTopupClick}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group w-full px-8 py-4 bg-gradient-to-r from-primary to-primary-600 rounded-xl font-bold text-lg transition-all duration-300 hover:shadow-2xl hover:shadow-primary/25 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center justify-center">
                    <span>Top Up $50 to Get Started</span>
                    <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>

                <p className="mt-4 text-xs text-gray-400">
                  One-time payment • No subscription • Full access
                </p>
              </div>
            </motion.div>
          ) : (
            <PaymentForm onSuccess={handlePaymentSuccess} />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Payment;

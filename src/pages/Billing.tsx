

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Download, Plus, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  fetchCustomerInvoices,
  getCustomerId,
  setupMonthlyPlanPayment,
  getSubscriptions,
  checkPaymentMethodSetup,
  setupPaymentMethod,
  createUserInFirebase,
} from '../lib/customers';
import { plans } from '../lib/plans';

interface UserData {
  email: string;
  role: "admin" | "user";
  createdByAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  stripeCustomerId?: string;
}

const PaymentMethodButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ 
  children, 
  ...props 
}) => <button {...props}>{children}</button>;

const Billing: React.FC = () => {
  const { getEffectiveUser } = useAuth();
  const user = getEffectiveUser();
  
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [customerId, setCustomerId] = useState<string>("");
  const [pastInvoices, setPastInvoices] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [isLoadingPaymentMethod, setIsLoadingPaymentMethod] = useState(false);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      if (!user) return;
      
      try {
        // Get user data from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }

        // Initialize customer
        let id = await getCustomerId(user.uid);
        if (!id) {
          id = await createUserInFirebase(user.email ?? "", user.uid);
        }
        
        if (id) {
          setCustomerId(id);
          const [invoices, subscriptionData, paymentMethodStatus] = await Promise.all([
            fetchCustomerInvoices(id),
            getSubscriptions(id),
            checkPaymentMethodSetup(id),
          ]);
          
          setPastInvoices(invoices);
          setHasPaymentMethod(paymentMethodStatus?.hasDynamicSetup);
          
          if (subscriptionData?.active) {
            setCurrentPlan({
              name: subscriptionData.planName || 'Active Plan',
              price: `$${subscriptionData.amount || 0}`,
              status: "active",
              validUntil: new Date(subscriptionData.currentPeriodEnd * 1000),
            });
          }
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user]);

  const handlePlanSelect = (productId: string) => {
    setSelectedPlan(productId);
    setError("");
  };

  const handleMakePayment = async () => {
    if (!selectedPlan) {
      setError("Please select a plan to continue");
      return;
    }

    if (!user || !customerId) {
      setError("Something went wrong. Please try again.");
      return;
    }

    setError("");
    setIsProcessing(true);

    try {
      await setupMonthlyPlanPayment(
        user.uid,
        selectedPlan,
        customerId,
        user.email || "",
      );
    } catch (error) {
      console.error("Error setting up payment:", error);
      setError("Failed to setup payment. Please try again.");
      setIsProcessing(false);
    }
  };

  const handleSetupPaymentMethod = async () => {
    if (!user || !user.email) {
      console.error("User not found");
      return;
    }

    if (!customerId) {
      console.error("Customer ID not found");
      return;
    }

    setIsLoadingPaymentMethod(true);
    setPaymentMethodError(null);

    try {
      await setupPaymentMethod(user.uid, user.email, customerId);
    } catch (error) {
      console.error("Error setting up payment method:", error);
      setPaymentMethodError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoadingPaymentMethod(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center space-x-3"
        >
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-lg font-medium text-gray-700 dark:text-gray-200">Loading billing information...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Billing & Usage
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your subscriptions and view transaction history
          </p>
        </div>
        
        {hasPaymentMethod ? (
          <div className="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium border border-green-500/20">
            <span>✓ Payment method added</span>
          </div>
        ) : (
          <PaymentMethodButton
            className="bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 text-sm disabled:opacity-50 font-medium"
            onClick={!loading ? handleSetupPaymentMethod : undefined}
            disabled={loading || isLoadingPaymentMethod}
          >
            {isLoadingPaymentMethod ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Plus size={16} />
                Add Payment Method
              </>
            )}
          </PaymentMethodButton>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1"
        >
          <div className="bg-white dark:bg-dark-200 rounded-xl border border-gray-200 dark:border-dark-100 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Account Balance
              </h2>
            </div>
            <div className="text-center py-6">
              <p className="text-3xl font-bold text-primary">
                ${userData?.totalBalance || 0}.00
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Available balance
              </p>
            </div>
            <Link
              to="/payment"
              className="w-full bg-primary hover:bg-primary-600 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Add Funds
            </Link>
          </div>
        </motion.div>

        {/* Current Plan or Plan Selection */}
        <div className="lg:col-span-3">
          {currentPlan ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-dark-200 rounded-xl border border-gray-200 dark:border-dark-100 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Current Plan</h2>
              <div className="p-6 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white">{currentPlan.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Valid until: {currentPlan.validUntil.toLocaleDateString()}
                    </p>
                    <p className="text-green-600 dark:text-green-400 mt-2 font-medium">
                      Status: {currentPlan.status.charAt(0).toUpperCase() + currentPlan.status.slice(1)}
                    </p>
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {currentPlan.price}
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      /month
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-dark-200 rounded-xl border border-gray-200 dark:border-dark-100 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Choose a Plan</h2>
              
              {(error || paymentMethodError) && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-6">
                  {error || paymentMethodError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {plans.map((plan, idx) => {
                  const isSelected = selectedPlan === plan.productId;
                  const isEven = idx % 2 === 0;

                  return (
                    <div
                      key={plan.name}
                      className={`p-6 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                          ? "border-primary shadow-lg shadow-primary/20" 
                          : "border-gray-200 dark:border-dark-100 hover:border-primary/50"
                      }`}
                      style={{
                        backgroundColor: isEven ? "#155EEF" : "inherit",
                        opacity: isSelected ? 1 : 0.8,
                      }}
                      onClick={() => handlePlanSelect(plan.productId)}
                    >
                      <h3 className="text-xl font-bold text-white mb-4">{plan.name}</h3>
                      <div className="border-b border-white/20 mb-4"></div>
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-white/80">Price</p>
                        <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                          ${plan.price}
                          <span className="text-sm font-normal text-white/60">/month</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleMakePayment}
                  disabled={!selectedPlan || isProcessing}
                  className="bg-primary hover:bg-primary-600 text-white py-3 px-8 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                >
                  {isProcessing ? "Processing..." : "Complete Billing"}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Invoice History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-dark-200 rounded-xl border border-gray-200 dark:border-dark-100 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-100">
          <div className="flex items-center space-x-3">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Invoice History
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-100">
              {pastInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center">
                      <History className="w-12 h-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No invoices yet
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Your invoice history will appear here once you start using the service.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pastInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-dark-300/50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                      {new Date(invoice.period_end * 1000).toLocaleString(
                        "default",
                        { month: "long", year: "numeric" },
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                      ${(invoice.amount_paid / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {new Date(invoice.created * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          invoice.status === "paid"
                            ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                            : invoice.status === "open"
                              ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                        }`}
                      >
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-600 dark:hover:text-primary-400 flex items-center text-sm font-medium transition-colors"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Billing;


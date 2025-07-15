import React, { useState, useEffect } from "react";
import { Download, Plus, History } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import {
  getCustomerId,
  setupPaymentMethod,
  checkPaymentMethodSetup,
  fetchCustomerInvoices,
  createUserInFirebase,
  setupOneTimeTopUp,
  getUsageDetails,
  getUserInvoices,
} from "../../lib/customers";
import { db } from "../../lib/firebase";

interface UserData {
  email: string;
  role: "admin" | "user";
  createdByAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  stripeCustomerId?: string;
  hasToppedUp?: boolean;
}

const Billing: React.FC = () => {
  const { getEffectiveUser } = useAuth();
  const user = getEffectiveUser();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [customerId, setCustomerId] = useState<string>("");
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [isLoadingPaymentMethod, setIsLoadingPaymentMethod] = useState(false);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pastInvoices, setPastInvoices] = useState<any[]>([]);
  const [paidInvoices, setPaidInvoices] = useState<any[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [totalUsage, setTotalUsage] = useState<number>(0);
  const [totalCalls, setTotalCalls] = useState<number>(0);
  const [nextInvoiceDate, setNextInvoiceDate] = useState<string>("");
  const [hasToppedUp, setHasToppedUp] = useState<boolean>(false);

  const getCurrentMonthLabel = () => {
    const now = new Date();
    return " "+ now.toLocaleString("default", { month: "long", year: "numeric" })+ " ";
  };
  const formatDateToDDMMYYYY = (isoDate: string): string => {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  useEffect(() => {
    const initializeData = async () => {
      const effectiveUser = getEffectiveUser();
      if (!effectiveUser) return;

      // Reset hasToppedUp to false for each effective user by default
      setHasToppedUp(false);

      try {
        const userDocRef = doc(db, "users", effectiveUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          setUserData(data);
          // Set hasToppedUp based on the specific effective user's data, defaulting to false
          setHasToppedUp(data.hasToppedUp || false);
        }

        let id = await getCustomerId(effectiveUser.uid);
        if (!id) {
          id = await createUserInFirebase(effectiveUser.email ?? "", effectiveUser.uid);
        }

        if (id) {
          setCustomerId(id);

          const [invoices, paymentMethodStatus, usageDetails, userInvoices] = await Promise.all([
            fetchCustomerInvoices(id),
            checkPaymentMethodSetup(id),
            getUsageDetails(effectiveUser.uid),
            getUserInvoices(effectiveUser.uid),
          ]);

          setHasPaymentMethod(paymentMethodStatus?.hasDynamicSetup || false);
          setPastInvoices(invoices);
          setPaidInvoices(userInvoices.paidInvoices);
          setUnpaidInvoices(userInvoices.unpaidInvoices);
          setUserBalance(usageDetails.currentBalance ?? 0);
          setTotalUsage(usageDetails.totalUsage ?? 0);
          setTotalCalls(usageDetails.totalCalls ?? 0);
          setNextInvoiceDate(usageDetails.nextInvoiceDate || "");
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user, getEffectiveUser]);

  const handleSetupPaymentMethod = async () => {
    const effectiveUser = getEffectiveUser();
    if (!effectiveUser || !effectiveUser.email || !customerId) return;

    setIsLoadingPaymentMethod(true);
    setPaymentMethodError(null);

    try {
      await setupPaymentMethod(effectiveUser.uid, effectiveUser.email, customerId);
    } catch (error) {
      setPaymentMethodError(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsLoadingPaymentMethod(false);
    }
  };

  const handleTopUp = async () => {
    const effectiveUser = getEffectiveUser();
    if (!effectiveUser || !customerId) return;

    try {
      const amount = 50;
      await setupOneTimeTopUp(effectiveUser.uid, amount, customerId, effectiveUser.email || "");
    } catch (err) {
      console.error("Top-up failed", err);
      setError("Failed to process top-up. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage top-ups and usage</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-6 bg-white dark:bg-dark-200 p-6 rounded-xl border border-gray-200 dark:border-dark-100">
          {!hasToppedUp && (
            <div>
              <button
                onClick={handleTopUp}
                className="bg-primary hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold text-lg"
              >
                Add $50
              </button>
              {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
            </div>
          )}
          <div>
            {hasPaymentMethod ? (
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
                ✓ Payment method added
              </div>
            ) : (
              <button
                onClick={handleSetupPaymentMethod}
                disabled={isLoadingPaymentMethod}
                className="bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                {isLoadingPaymentMethod ? (
                  "Loading..."
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus size={16} /> Add Payment Method
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Unpaid Invoices Alert */}
      {unpaidInvoices.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-4">
            ⚠️ Unpaid Invoices
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unpaidInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white dark:bg-dark-200 p-4 rounded-lg border border-red-200 dark:border-red-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {invoice.id}
                  </h3>
                  <span className="text-sm px-2 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded">
                    {invoice.invoiceStatus || "Unpaid"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Amount: ${((invoice.total_amount || 0) / 100).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Usage: ${((invoice.total_usage || 0) / 100).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Calls: {invoice.total_convs || 0}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Balance and Usage Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Balance */}
        <div className="bg-white dark:bg-dark-200 p-6 rounded-xl border border-gray-200 dark:border-dark-100">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Current Balance</h2>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <p className="text-sm text-gray-500 mb-1">Balance</p>
              <p className="text-2xl font-semibold text-primary">${userBalance.toFixed(2)}</p>
            </div>
            <div className="h-12 border-l border-gray-300 dark:border-gray-600 mx-6"></div>
            <div className="flex-1 text-center">
              <p className="text-sm text-gray-500 mb-1">Next Invoice</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                {nextInvoiceDate ? formatDateToDDMMYYYY(nextInvoiceDate) : getCurrentMonthLabel()}
              </p>
            </div>
          </div>
        </div>

        {/* Usage + Calls */}
        <div className="bg-white dark:bg-dark-200 p-6 rounded-xl border border-gray-200 dark:border-dark-100">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Usage Summary ({getCurrentMonthLabel()}) </h2>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <p className="text-sm text-gray-500 mb-1">Total Usage</p>
              <p className="text-2xl font-semibold text-primary">${totalUsage.toFixed(2)}</p>
            </div>
            <div className="h-12 border-l border-gray-300 dark:border-gray-600 mx-6"></div>
            <div className="flex-1 text-center">
              <p className="text-sm text-gray-500 mb-1">Total Calls</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">{totalCalls}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <History size={18} /> Invoice History
        </h2>
        <div className="overflow-x-auto bg-white dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-100">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-dark-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {paidInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No paid invoices yet.
                  </td>
                </tr>
              ) : (
                paidInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 dark:hover:bg-dark-300/50"
                  >
                    <td className="px-6 py-4">
                      {invoice.id}
                    </td>
                    <td className="px-6 py-4">${((invoice.total_amount || 0) / 100).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      {invoice.created_at ? new Date(invoice.created_at.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 capitalize text-sm font-medium">
                      <span className="text-green-600 dark:text-green-400">
                        {invoice.invoiceStatus || "Paid"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Usage: ${((invoice.total_usage || 0) / 100).toFixed(2)} | Calls: {invoice.total_convs || 0}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Billing;
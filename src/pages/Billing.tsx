
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, History, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

const Billing: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              to="/dashboard"
              className="p-2 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Billing & Usage
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your account balance and view transaction history
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Account Balance
                </h2>
              </div>
              <div className="text-center py-6">
                <p className="text-3xl font-bold text-primary dark:text-primary-400">
                  $50.00
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Available balance
                </p>
              </div>
              <Link
                to="/payment"
                className="w-full bg-primary hover:bg-primary-600 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Add Funds
              </Link>
            </div>
          </motion.div>

          {/* Transaction History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-dark-100">
                <div className="flex items-center space-x-3">
                  <History className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Transaction History
                  </h2>
                </div>
              </div>
              <div className="p-6">
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No transactions yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Your transaction history will appear here once you start using the service.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Billing;

import React, { useState, useEffect } from 'react';
import { User, ChevronDown, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'super-admin';
}

const UserImpersonationDropdown: React.FC = () => {
  const { 
    impersonateUser, 
    stopImpersonation, 
    isImpersonating, 
    impersonatedUserData,
    user,
    userData 
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userData) {
      fetchAvailableUsers();
    }
  }, [userData]);

  const fetchAvailableUsers = async () => {
    if (!userData) return;

    setLoading(true);
    try {
      const usersData: UserOption[] = [];

      if (userData.role === 'super-admin') {
        // Super admin can see all users
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
          const allUsers: UserOption[] = [];
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            // Exclude current user
            if (doc.id !== user?.uid) {
              allUsers.push({
                id: doc.id,
                name: data.name || data.email?.split('@')[0] || 'Unknown',
                email: data.email || 'No email',
                role: data.role || 'user',
              });
            }
          });
          setAvailableUsers(allUsers);
          setLoading(false);
        });

        // Return cleanup function
        return () => unsubscribe();
      } else {
        // Regular users see only accepted requests
        if (userData.sentRequests) {
          const acceptedRequests = Object.entries(userData.sentRequests)
            .filter(([_, request]) => request.status === 'accepted');

          for (const [userId, _] of acceptedRequests) {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              const data = userDoc.data();
              usersData.push({
                id: userId,
                name: data.name || data.email?.split('@')[0] || 'Unknown',
                email: data.email || 'No email',
                role: data.role || 'user',
              });
            }
          }
        }
        setAvailableUsers(usersData);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching available users:', error);
      setError('Failed to load available users');
      setLoading(false);
    }
  };

  const handleImpersonate = async (userId: string) => {
    try {
      setError(null);
      await impersonateUser(userId);
      setIsOpen(false);
    } catch (error) {
      console.error('Error impersonating user:', error);
      setError('Failed to impersonate user');
    }
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    setIsOpen(false);
  };

  // Show for super-admins or users with accepted requests
  if (userData?.role !== 'super-admin') {
    if (!userData?.sentRequests || Object.keys(userData.sentRequests).length === 0) {
      return null;
    }

    const hasAcceptedRequests = Object.values(userData.sentRequests).some(req => req.status === 'accepted');
    if (!hasAcceptedRequests) {
      return null;
    }
  }

  return (
    <div className="relative">
      {/* Impersonation Banner */}
      <AnimatePresence>
        {isImpersonating && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-3 z-50 shadow-lg"
          >
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">
                  Workspace: {impersonatedUserData?.name || impersonatedUserData?.email}
                </span>
              </div>
              <button
                onClick={handleStopImpersonation}
                className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 px-3 py-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
                <span className="text-sm font-medium">Switch Back</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-dark-200 border border-gray-300 dark:border-dark-100 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
        >
          <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {isImpersonating ? 'Switch User' : 'Switch Workspace'}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 mt-2 w-80 bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-100 rounded-lg shadow-lg z-50 max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="p-3 border-b border-gray-200 dark:border-dark-100 flex-shrink-0">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Select User to Switch Workspace
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {userData?.role === 'super-admin' 
                    ? 'Switch to any user workspace' 
                    : 'Switch to users who have accepted your requests'
                  }
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {isImpersonating && (
                <div className="p-3 border-b border-gray-200 dark:border-dark-100">
                  <button
                    onClick={handleStopImpersonation}
                    className="w-full flex items-center space-x-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 rounded-md hover:bg-amber-200 dark:hover:bg-amber-900/30 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span className="text-sm font-medium">Switch Back</span>
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto min-h-0">
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading users...</p>
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No users available for workspace switching</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-dark-100">
                    {availableUsers.map((userOption) => (
                      <button
                        key={userOption.id}
                        onClick={() => handleImpersonate(userOption.id)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            userOption.role === 'admin' 
                              ? 'bg-amber-100 dark:bg-amber-900/20' 
                              : userOption.role === 'super-admin'
                              ? 'bg-purple-100 dark:bg-purple-900/20'
                              : 'bg-blue-100 dark:bg-blue-900/20'
                          }`}>
                            <User className={`w-4 h-4 ${
                              userOption.role === 'admin' 
                                ? 'text-amber-600 dark:text-amber-400' 
                                : userOption.role === 'super-admin'
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-blue-600 dark:text-blue-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {userOption.name}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {userOption.email}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default UserImpersonationDropdown;
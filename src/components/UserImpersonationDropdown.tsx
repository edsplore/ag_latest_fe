import React, { useState, useEffect } from 'react';
import { ChevronDown, User, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UserType {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'super-admin';
}

const UserImpersonationDropdown = () => {
  const { 
    user, 
    userData, 
    isImpersonating, 
    impersonatedUserData, 
    stopImpersonation, 
    impersonateUser 
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);

  // Get list of users based on role
  useEffect(() => {
    if (userData?.role === 'super-admin') {
      // Super admins can see all users
      const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const allUsers = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || data.email?.split('@')[0] || 'Unknown',
            email: data.email || 'No email',
            role: data.role || 'user',
          };
        }).filter(userItem => userItem.id !== user?.uid); // Exclude current user

        setUsers(allUsers);
      });

      return () => unsubscribe();
    } else if (userData?.sentRequests) {
      // Regular users can only see accepted requests
      const acceptedUsers = Object.entries(userData.sentRequests)
        .filter(([_, request]) => request.status === 'accepted')
        .map(([userId, request]) => ({
          id: userId,
          name: request.email.split('@')[0],
          email: request.email,
          role: 'user' as const
        }));
      setUsers(acceptedUsers);
    }
  }, [userData?.sentRequests, userData?.role, user?.uid]);

  if (!user || (!isImpersonating && users.length === 0)) {
    return null;
  }

  return (
    <div className="relative">
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-dark-200 border border-gray-300 dark:border-dark-100 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
      >
        {isImpersonating ? (
          <>
            <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Back to {userData?.name || userData?.email}
            </span>
          </>
        ) : (
          <>
            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Switch Workspace
            </span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <div className={`absolute right-0 mt-2 w-64 bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-100 rounded-lg shadow-lg overflow-hidden z-10 ${isOpen ? '' : 'hidden'}`}>
        <div className="py-2">
          {isImpersonating && (
            <button
              onClick={() => {
                stopImpersonation();
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-100 flex items-center justify-center">
                <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Back to {userData?.name || userData?.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Stop impersonating
                </p>
              </div>
            </button>
          )}
          {users.map((userItem) => (
                <button
                  key={userItem.id}
                  onClick={() => {
                    impersonateUser(userItem.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary dark:text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {userItem.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {userItem.email}
                    </p>
                    {userData?.role === 'super-admin' && (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mt-1 ${
                        userItem.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                        userItem.role === 'super-admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {userItem.role}
                      </span>
                    )}
                  </div>
                </button>
              ))}
        </div>
      </div>
    </div>
  );
};

export default UserImpersonationDropdown;

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, UserCheck, UserX, Crown, User, Plus, Eye, EyeOff, RefreshCw, X, Send, Check, Clock, MessageSquare } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { initializeApp } from 'firebase/app';
import { getAuth, signOut } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';

interface UserType {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdByAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  sentRequests?: {
    [targetUserId: string]: {
      status: "pending" | "accepted" | "rejected";
      email: string;
    };
  };
  receivedRequests?: {
    [requestingUserId: string]: {
      status: "pending" | "accepted" | "rejected";
      email: string;
    };
  };
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showCredentials, setShowCredentials] = useState<{[key: string]: boolean}>({});
  const [tempPasswords, setTempPasswords] = useState<{[key: string]: string}>({});
  const [addUserForm, setAddUserForm] = useState({
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user'
  });
  const [addingUser, setAddingUser] = useState(false);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(Date.now());
  const { user, userData } = useAuth();

  // Show notification when new requests are received
  useEffect(() => {
    if (!userData?.receivedRequests) return;

    const pendingRequests = Object.values(userData.receivedRequests).filter(
      (request: any) => request.status === 'pending'
    );

    if (pendingRequests.length > 0) {
      const now = Date.now();
      if (now - lastNotificationTime > 5000) { // Only show notification every 5 seconds
        setLastNotificationTime(now);
        
        // You can also add a toast notification here if you have a toast library
        console.log(`You have ${pendingRequests.length} pending access requests`);
      }
    }
  }, [userData?.receivedRequests, lastNotificationTime]);

  useEffect(() => {
    // Set up real-time listener for users collection
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      console.log('Real-time update: Total users found:', snapshot.docs.length);

      const usersData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Real-time user data:', doc.id, data);

        return {
          id: doc.id,
          name: data.name || data.email?.split('@')[0] || 'Unknown',
          email: data.email || 'No email',
          role: data.role || 'user',
          createdByAdmin: data.createdByAdmin || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          sentRequests: data.sentRequests || {},
          receivedRequests: data.receivedRequests || {},
        };
      }) as UserType[];

      console.log('Real-time processed users:', usersData);
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error('Error in real-time listener:', error);
      alert('Error fetching users: ' + error);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    if (!user) return;

    // Check if this is the last admin being demoted
    if (newRole === 'user') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount === 1) {
        alert('Cannot remove the last admin. There must be at least one admin in the system.');
        return;
      }

      // Confirm the demotion
      const confirmDemotion = window.confirm(
        'Are you sure you want to remove admin privileges from this user? They will lose access to admin features.'
      );
      if (!confirmDemotion) return;
    }

    setUpdating(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date(),
      });

      // No need to update local state - real-time listener will handle it
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role: ' + error);
    } finally {
      setUpdating(null);
    }
  };

  const sendImpersonationRequest = async (targetUserId: string, targetEmail: string) => {
    if (!user || !userData) return;

    setSendingRequest(targetUserId);
    try {
      // Update current user's sentRequests
      const currentUserRef = doc(db, 'users', user.uid);
      const newSentRequests = {
        ...userData.sentRequests,
        [targetUserId]: {
          status: 'pending' as const,
          email: targetEmail
        }
      };

      await updateDoc(currentUserRef, {
        sentRequests: newSentRequests,
        updatedAt: new Date()
      });

      // Update target user's receivedRequests
      const targetUserRef = doc(db, 'users', targetUserId);
      const targetUserDoc = await getDoc(targetUserRef);
      
      if (targetUserDoc.exists()) {
        const targetUserData = targetUserDoc.data();
        const newReceivedRequests = {
          ...targetUserData.receivedRequests,
          [user.uid]: {
            status: 'pending' as const,
            email: userData.email
          }
        };

        await updateDoc(targetUserRef, {
          receivedRequests: newReceivedRequests,
          updatedAt: new Date()
        });
      }

      // No need to update local state - real-time listener will handle it
      alert('Request sent successfully!');
    } catch (error) {
      console.error('Error sending request:', error);
      alert('Error sending request: ' + error);
    } finally {
      setSendingRequest(null);
    }
  };

  const respondToRequest = async (requestingUserId: string, response: 'accepted' | 'rejected') => {
    if (!user || !userData) return;

    setUpdating(requestingUserId);
    try {
      const requestingUser = users.find(u => u.id === requestingUserId);
      if (!requestingUser) return;

      // Update current user's receivedRequests
      const currentUserRef = doc(db, 'users', user.uid);
      const newReceivedRequests = {
        ...userData.receivedRequests,
        [requestingUserId]: {
          status: response,
          email: requestingUser.email
        }
      };

      await updateDoc(currentUserRef, {
        receivedRequests: newReceivedRequests,
        updatedAt: new Date()
      });

      // Update requesting user's sentRequests
      const requestingUserRef = doc(db, 'users', requestingUserId);
      const requestingUserDoc = await getDoc(requestingUserRef);
      
      if (requestingUserDoc.exists()) {
        const requestingUserData = requestingUserDoc.data();
        const newSentRequests = {
          ...requestingUserData.sentRequests,
          [user.uid]: {
            status: response,
            email: userData.email
          }
        };

        await updateDoc(requestingUserRef, {
          sentRequests: newSentRequests,
          updatedAt: new Date()
        });
      }

      // No need to update local state - real-time listener will handle it
      alert(`Request ${response} successfully!`);
    } catch (error) {
      console.error('Error responding to request:', error);
      alert('Error responding to request: ' + error);
    } finally {
      setUpdating(null);
    }
  };

  const removeAccess = async (requestingUserId: string) => {
    if (!user || !userData) return;

    const confirmRemoval = window.confirm(
      'Are you sure you want to remove access for this user? They will no longer be able to impersonate your account.'
    );
    if (!confirmRemoval) return;

    setUpdating(requestingUserId);
    try {
      const requestingUser = users.find(u => u.id === requestingUserId);
      if (!requestingUser) return;

      // Update current user's receivedRequests to rejected
      const currentUserRef = doc(db, 'users', user.uid);
      const newReceivedRequests = {
        ...userData.receivedRequests,
        [requestingUserId]: {
          status: 'rejected' as const,
          email: requestingUser.email
        }
      };

      await updateDoc(currentUserRef, {
        receivedRequests: newReceivedRequests,
        updatedAt: new Date()
      });

      // Update requesting user's sentRequests to rejected
      const requestingUserRef = doc(db, 'users', requestingUserId);
      const requestingUserDoc = await getDoc(requestingUserRef);
      
      if (requestingUserDoc.exists()) {
        const requestingUserData = requestingUserDoc.data();
        const newSentRequests = {
          ...requestingUserData.sentRequests,
          [user.uid]: {
            status: 'rejected' as const,
            email: userData.email
          }
        };

        await updateDoc(requestingUserRef, {
          sentRequests: newSentRequests,
          updatedAt: new Date()
        });
      }

      // No need to update local state - real-time listener will handle it
      alert('Access removed successfully!');
    } catch (error) {
      console.error('Error removing access:', error);
      alert('Error removing access: ' + error);
    } finally {
      setUpdating(null);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setAddingUser(true);
    try {
      // Create a secondary Firebase app instance to avoid signing out the current admin
      const secondaryApp = initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
      }, 'Secondary');

      const secondaryAuth = getAuth(secondaryApp);

      // Create user in Firebase Auth using secondary instance
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        addUserForm.email, 
        addUserForm.password
      );
      const newUser = userCredential.user;

      // Create user document in Firestore
      const userData = {
        name: newUser.email!.split('@')[0],
        email: newUser.email!,
        role: addUserForm.role,
        createdByAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        sentRequests: {},
        receivedRequests: {}
      };

      await setDoc(doc(db, 'users', newUser.uid), userData);

      // Sign out the new user from secondary auth to prevent them from being logged in
      await signOut(secondaryAuth);

      // Delete the secondary app
      await secondaryApp.delete();

      // Store temporary password for display
      setTempPasswords(prev => ({
        ...prev,
        [newUser.uid]: addUserForm.password
      }));

      // No need to update local state - real-time listener will handle it

      // Reset form and close modal
      setAddUserForm({ email: '', password: '', role: 'user' });
      setShowAddUserModal(false);

      alert('User created successfully!');
    } catch (error: any) {
      console.error('Error creating user:', error);
      let errorMessage = 'Failed to create user';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already in use';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
      alert(errorMessage);
    } finally {
      setAddingUser(false);
    }
  };

  const handleResetPassword = async (userEmail: string, userId: string) => {
    if (!user) return;

    setResettingPassword(userId);
    try {
      await sendPasswordResetEmail(auth, userEmail);
      alert(`Password reset email sent to ${userEmail}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      alert('Error sending password reset email');
    } finally {
      setResettingPassword(null);
    }
  };

  const toggleCredentialsVisibility = (userId: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const getRequestStatus = (targetUserId: string) => {
    return userData?.sentRequests?.[targetUserId]?.status;
  };

  const canSendRequest = (targetUserId: string) => {
    if (!user || targetUserId === user.uid) return false;
    const status = getRequestStatus(targetUserId);
    return !status; // Can send if no existing request
  };

  const filteredUsers = users.filter(userItem => {
    const email = userItem?.email || '';
    const name = userItem?.name || '';
    return email.toLowerCase().includes(searchTerm.toLowerCase()) || 
           name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const receivedRequests = userData?.receivedRequests || {};
  const sentRequests = userData?.sentRequests || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage users and workspace access requests ({users.length} total users)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 mb-6">
        <div className="flex border-b border-gray-200 dark:border-dark-100">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>All Users</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'requests'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Requests</span>
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Search and Stats */}
          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-dark-100 rounded-lg leading-5 bg-white dark:bg-dark-100 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Search users..."
                />
              </div>

              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="text-gray-500 dark:text-gray-400">
                    {users.filter(u => u.role === 'admin').length} Admins
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-500 dark:text-gray-400">
                    {users.filter(u => u.role === 'user').length} Users
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-dark-100">
              {filteredUsers.map((userItem, index) => (
                <motion.div
                  key={userItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        userItem.role === 'admin' 
                          ? 'bg-amber-100 dark:bg-amber-900/20' 
                          : 'bg-blue-100 dark:bg-blue-900/20'
                      }`}>
                        {userItem.role === 'admin' ? (
                          <Crown className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {userItem.name}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            userItem.role === 'admin'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          }`}>
                            {userItem.role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {userItem.email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Joined {userItem.createdAt.toLocaleDateString()}
                        </p>
                        {/* Request Status */}
                        {user && userItem.id !== user.uid && (
                          <div className="mt-1">
                            {getRequestStatus(userItem.id) === 'pending' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                                <Clock className="w-3 h-3 mr-1" />
                                Request Pending
                              </span>
                            )}
                            {getRequestStatus(userItem.id) === 'accepted' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                <Check className="w-3 h-3 mr-1" />
                                Access Granted
                              </span>
                            )}
                            {getRequestStatus(userItem.id) === 'rejected' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                                <X className="w-3 h-3 mr-1" />
                                Request Rejected
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Credentials Section */}
                      {tempPasswords[userItem.id] && (
                        <div className="flex items-center space-x-2 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <span className="text-sm text-yellow-800 dark:text-yellow-200">
                            Password: {showCredentials[userItem.id] ? tempPasswords[userItem.id] : '••••••••'}
                          </span>
                          <button
                            onClick={() => toggleCredentialsVisibility(userItem.id)}
                            className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200"
                          >
                            {showCredentials[userItem.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      )}

                      {/* Send Request Button */}
                      {user && canSendRequest(userItem.id) && (
                        <button
                          onClick={() => sendImpersonationRequest(userItem.id, userItem.email)}
                          disabled={sendingRequest === userItem.id}
                          className="inline-flex items-center px-3 py-2 border border-primary text-sm leading-4 font-medium rounded-md text-primary bg-white dark:bg-dark-100 hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-4 h-4 mr-1" />
                          {sendingRequest === userItem.id ? 'Sending...' : 'Send Request'}
                        </button>
                      )}

                      {/* Reset Password Button */}
                      <button
                        onClick={() => handleResetPassword(userItem.email, userItem.id)}
                        disabled={resettingPassword === userItem.id}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-dark-100 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-100 hover:bg-gray-50 dark:hover:bg-dark-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${resettingPassword === userItem.id ? 'animate-spin' : ''}`} />
                        {resettingPassword === userItem.id ? 'Sending...' : 'Reset Password'}
                      </button>

                      {/* Role Management - Only for admins */}
                      {userData?.role === 'admin' && (
                        <>
                          {userItem.role === 'user' ? (
                            <button
                              onClick={() => updateUserRole(userItem.id, 'admin')}
                              disabled={updating === userItem.id}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              {updating === userItem.id ? 'Updating...' : 'Make Admin'}
                            </button>
                          ) : (
                            <button
                              onClick={() => updateUserRole(userItem.id, 'user')}
                              disabled={updating === userItem.id}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-dark-100 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-100 hover:bg-gray-50 dark:hover:bg-dark-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <UserX className="w-4 h-4 mr-1" />
                              {updating === userItem.id ? 'Updating...' : 'Remove Admin'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No users found
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'Try adjusting your search term.' : 'No users have been registered yet.'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Received Requests */}
          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Received Requests
            </h3>
            {Object.keys(receivedRequests).length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No received requests</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(receivedRequests).map(([requestingUserId, request]) => {
                  const requestingUser = users.find(u => u.id === requestingUserId);
                  return (
                    <div key={requestingUserId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {requestingUser?.name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {request.email}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          request.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => respondToRequest(requestingUserId, 'accepted')}
                            disabled={updating === requestingUserId}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => respondToRequest(requestingUserId, 'rejected')}
                            disabled={updating === requestingUserId}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {request.status === 'accepted' && (
                        <button
                          onClick={() => removeAccess(requestingUserId)}
                          disabled={updating === requestingUserId}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          {updating === requestingUserId ? 'Removing...' : 'Remove Access'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sent Requests */}
          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Sent Requests
            </h3>
            {Object.keys(sentRequests).length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No sent requests</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(sentRequests).map(([targetUserId, request]) => {
                  const targetUser = users.find(u => u.id === targetUserId);
                  return (
                    <div key={targetUserId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {targetUser?.name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {request.email}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          request.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-dark-200 rounded-xl shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Add New User
                  </h3>
                  <button
                    onClick={() => setShowAddUserModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={addUserForm.email}
                      onChange={(e) => setAddUserForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-100 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        required
                        value={addUserForm.password}
                        onChange={(e) => setAddUserForm(prev => ({ ...prev, password: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-100 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setAddUserForm(prev => ({ ...prev, password: generateRandomPassword() }))}
                        className="px-3 py-2 border border-gray-300 dark:border-dark-100 rounded-lg bg-white dark:bg-dark-100 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role
                    </label>
                    <select
                      value={addUserForm.role}
                      onChange={(e) => setAddUserForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-100 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-100 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-100 hover:bg-gray-50 dark:hover:bg-dark-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingUser}
                      className="flex-1 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingUser ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;

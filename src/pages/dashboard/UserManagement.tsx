
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Crown, User, Send, Check, Clock, MessageSquare, X } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

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
    // Set up real-time listener for users collection only
    const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
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
    return () => usersUnsubscribe();
  }, []);

  

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

      // Real-time listener will handle state updates automatically
      console.log('Request sent successfully to', targetEmail);
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

      // Real-time listener will handle state updates automatically
      console.log(`Request ${response} successfully for user:`, requestingUserId);
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

      // Real-time listener will handle state updates automatically
      console.log('Access removed successfully for user:', requestingUserId);
    } catch (error) {
      console.error('Error removing access:', error);
      alert('Error removing access: ' + error);
    } finally {
      setUpdating(null);
    }
  };

  

  

  

  const getRequestStatus = (targetUserId: string) => {
    return userData?.sentRequests?.[targetUserId]?.status;
  };

  const canSendRequest = (targetUserId: string) => {
    if (!user || targetUserId === user.uid) return false;
    const status = getRequestStatus(targetUserId);
    return !status || status === 'rejected'; // Can send if no existing request or if rejected
  };

  const filteredUsers = users.filter(userItem => {
    // Filter out current user from the list
    if (user && userItem.id === user.uid) return false;
    
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
              {/* Notification dot for pending requests */}
              {Object.values(receivedRequests).filter(req => req.status === 'pending').length > 0 && (
                <span className="inline-flex items-center justify-center w-2 h-2 bg-red-500 rounded-full"></span>
              )}
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
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-gray-500 dark:text-gray-400">
                    {filteredUsers.length} Users Available
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
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 dark:bg-primary/20">
                        <User className="w-6 h-6 text-primary dark:text-primary-400" />
                      </div>

                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {userItem.name}
                          </h3>
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

      
    </div>
  );
};

export default UserManagement;

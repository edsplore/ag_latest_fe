import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserData {
  email: string;
  role: 'admin' | 'user';
  createdByAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  impersonatedUser: User | null;
  impersonatedUserData: UserData | null;
  isImpersonating: boolean;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => void;
  getEffectiveUser: () => User | null;
  getEffectiveUserData: () => UserData | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [impersonatedUserData, setImpersonatedUserData] = useState<UserData | null>(null);

  const fetchUserData = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data() as UserData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchUserData(user.uid);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/invalid-email':
            throw new Error('Invalid email address');
          case 'auth/user-disabled':
            throw new Error('This account has been disabled');
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            throw new Error('Invalid email or password');
          default:
            throw new Error('An error occurred during sign in');
        }
      }
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create the user document in Firestore
      const userData: UserData = {
        email: user.email!,
        role: 'user', // Default role is user
        createdByAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      setUserData(userData);
    } catch (error) {
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            throw new Error('This email is already registered');
          case 'auth/invalid-email':
            throw new Error('Invalid email address');
          case 'auth/operation-not-allowed':
            throw new Error('Email/password accounts are not enabled');
          case 'auth/weak-password':
            throw new Error('Password is too weak');
          default:
            throw new Error('An error occurred during sign up');
        }
      }
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      // Add custom parameters for better popup handling
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // Log current domain for debugging
      console.log('Current domain:', window.location.hostname);
      console.log('Current full URL:', window.location.href);

      let userCredential;
      try {
        // Try popup first
        console.log('Attempting popup sign-in...');
        userCredential = await signInWithPopup(auth, provider);
        console.log('Popup sign-in successful');
      } catch (popupError) {
        console.error('Popup failed, error details:', popupError);
        // If popup fails, throw the error to be handled by the calling function
        throw popupError;
      }

      const user = userCredential.user;

      // Check if user document exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create new user document if it doesn't exist
        const userData: UserData = {
          email: user.email!,
          role: 'user',
          createdByAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await setDoc(userDocRef, userData);
        setUserData(userData);
      } else {
        setUserData(userDoc.data() as UserData);
      }
    } catch (error) {
      console.error('Google sign-in detailed error:', error);

      if (error instanceof FirebaseError) {
        console.error('Firebase error code:', error.code);
        console.error('Firebase error message:', error.message);

        switch (error.code) {
          case 'auth/popup-closed-by-user':
            throw new Error('Sign-in popup was closed. Please try again.');
          case 'auth/popup-blocked':
            throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site.');
          case 'auth/cancelled-popup-request':
            throw new Error('Sign-in was cancelled.');
          case 'auth/unauthorized-domain':
            throw new Error('This domain is not authorized for Google sign-in. Please wait a few minutes for changes to take effect.');
          case 'auth/operation-not-allowed':
            throw new Error('Google sign-in is not enabled. Please contact support.');
          case 'auth/invalid-api-key':
            throw new Error('Invalid API key configuration.');
          case 'auth/network-request-failed':
            throw new Error('Network error. Please check your internet connection and try again.');
          default:
            console.error('Unhandled Google sign-in error:', error);
            throw new Error(`Google sign-in failed: ${error.message || 'Unknown error'}`);
        }
      }

      // Handle non-Firebase errors
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error(`Sign-in failed: ${error.message}`);
      }

      throw new Error('An unexpected error occurred during Google sign-in. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw new Error('Failed to log out');
    }
  };

  const isAdmin = () => {
    return userData?.role === 'admin';
  };

  const impersonateUser = async (userId: string) => {
    if (!isAdmin()) {
      throw new Error('Only admins can impersonate users');
    }

    try {
      // Fetch the impersonated user's data
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const impersonatedUserData = userDoc.data() as UserData;

      // Create a mock User object for the impersonated user
      const mockUser: User = {
        uid: userId,
        email: impersonatedUserData.email,
        emailVerified: true,
        isAnonymous: false,
        metadata: {
          creationTime: impersonatedUserData.createdAt.toString(),
          lastSignInTime: new Date().toString(),
        },
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => '',
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({}),
        displayName: null,
        phoneNumber: null,
        photoURL: null,
        providerId: 'firebase'
      };

      setImpersonatedUser(mockUser);
      setImpersonatedUserData(impersonatedUserData);
    } catch (error) {
      console.error('Error impersonating user:', error);
      throw error;
    }
  };

  const stopImpersonation = () => {
    setImpersonatedUser(null);
    setImpersonatedUserData(null);
  };

  const getEffectiveUser = () => {
    return impersonatedUser || user;
  };

  const getEffectiveUserData = () => {
    return impersonatedUserData || userData;
  };

  const isImpersonating = impersonatedUser !== null;

  const value = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    isAdmin,
    impersonatedUser,
    impersonatedUserData,
    isImpersonating,
    impersonateUser,
    stopImpersonation,
    getEffectiveUser,
    getEffectiveUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
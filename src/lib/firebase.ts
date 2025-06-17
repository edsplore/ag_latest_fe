import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDGOT76ox2Nv7XYy2Rp-3PC4VSHuHJHMo0",
  authDomain: "xpress-voice-236.firebaseapp.com",
  projectId: "xpress-voice-236",
  storageBucket: "xpress-voice-236.firebasestorage.app",
  messagingSenderId: "308421673474",
  appId: "1:308421673474:web:4cb53dd9c2b9f650409d1b",
  measurementId: "G-LZLZXJ3RKJ"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

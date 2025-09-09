// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { logError } from "./logger";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

// Fetch allowed emails from Firestore
export async function fetchAllowedEmails(): Promise<string[]> {
  const snapshot = await getDocs(collection(db, "allowedUsers"));
  return snapshot.docs.map((doc) => doc.data().email);
}

export function signIn() {
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}

export function onUserStateChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function isUserAllowed(user: User | null): Promise<boolean> {
  if (!user || !user.email) return false;

  try {
    // Use different base URL for development
    const response = await fetch("/.netlify/functions/checkAuth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    });

    const data = await response.json();
    return data.isAllowed;
  } catch (error) {
    logError("Error checking user authorization:", { error });
    return false;
  }
}

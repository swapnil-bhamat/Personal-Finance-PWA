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
import {
  getFirestore,
  collection,
  getDocs,
  Firestore,
} from "firebase/firestore";
import { logError } from "./logger";

let auth: ReturnType<typeof getAuth>;
let db: Firestore;

export const isFirebaseConfigured = () => {
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
};

export const initializeFirebase = () => {
  if (!isFirebaseConfigured()) {
    logError(
      "Firebase configuration is missing. Firebase will not be initialized."
    );
    return null;
  }

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  return db;
};

export const getAuthInstance = () => {
  if (!auth) {
    throw new Error("Firebase not initialized. Call init() first.");
  }
  return auth;
};

export const getFirestoreInstance = () => {
  if (!db) {
    throw new Error("Firebase not initialized. Call init() first.");
  }
  return db;
};

// Fetch allowed emails from Firestore
export async function fetchAllowedEmails(): Promise<string[]> {
  const snapshot = await getDocs(collection(db, "allowedUsers"));
  return snapshot.docs.map((doc) => doc.data().email);
}

export function signIn() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(getAuthInstance(), provider);
}

export function signOutUser() {
  return signOut(getAuthInstance());
}

export function onUserStateChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(getAuthInstance(), callback);
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

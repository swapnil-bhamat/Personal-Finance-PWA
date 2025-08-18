// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBZjXpqWkA39XXbTO9yCRMzlchNn0o7ZrM",
  authDomain: "personal-finance-ecbf6.firebaseapp.com",
  projectId: "personal-finance-ecbf6",
  storageBucket: "personal-finance-ecbf6.firebasestorage.app",
  messagingSenderId: "425046402600",
  appId: "1:425046402600:web:0d0320d3659ed0ef21371d",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();


// Fetch allowed emails from Firestore
export async function fetchAllowedEmails(): Promise<string[]> {
  const snapshot = await getDocs(collection(db, 'allowedUsers'));
  return snapshot.docs.map(doc => doc.data().email);
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
  const docRef = doc(db, 'allowedUsers', user.email);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}

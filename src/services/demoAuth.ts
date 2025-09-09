import { User } from 'firebase/auth';
import { logInfo } from './logger';

// Demo user data structure
const demoUser: User = {
  uid: 'demo-user',
  email: 'demo@example.com',
  displayName: 'Demo User',
  photoURL: 'https://ui-avatars.com/api/?name=Demo+User&background=random',
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: Date.now().toString(),
    lastSignInTime: Date.now().toString(),
  },
  providerData: [],
  refreshToken: 'demo-refresh-token',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'demo-token',
  getIdTokenResult: async () => ({
    token: 'demo-token',
    signInProvider: 'demo',
    signInSecondFactor: null,
    expirationTime: new Date(Date.now() + 3600000).toISOString(),
    issuedAtTime: new Date().toISOString(),
    authTime: new Date().toISOString(),
    claims: {}
  }),
  reload: async () => {},
  toJSON: () => ({ uid: 'demo-user' }),
  phoneNumber: null,
  providerId: 'demo',
};

// Use localStorage to persist demo mode state
let isDemoMode = localStorage.getItem('demoMode') === 'true';
let demoAuthStateCallback: ((user: User | null) => void) | null = null;

export const initDemoMode = () => {
  logInfo('Initializing demo mode');
  isDemoMode = true;
  localStorage.setItem('demoMode', 'true');
  
  // Ensure callback is called asynchronously to match Firebase behavior
  setTimeout(() => {
    if (demoAuthStateCallback) {
      logInfo('Calling demo auth callback with demo user');
      demoAuthStateCallback(demoUser);
    }
  }, 0);
};

export const exitDemoMode = () => {
  logInfo('Exiting demo mode');
  isDemoMode = false;
  localStorage.removeItem('demoMode');
  
  // Ensure callback is called asynchronously to match Firebase behavior
  setTimeout(() => {
    if (demoAuthStateCallback) {
      logInfo('Calling demo auth callback with null');
      demoAuthStateCallback(null);
    }
    // Reload the page to clear any demo data
    window.location.href = '/';
  }, 0);
};

export const isInDemoMode = () => isDemoMode;

export const onDemoAuthStateChanged = (callback: (user: User | null) => void) => {
  logInfo('Setting up demo auth state change listener');
  demoAuthStateCallback = callback;
  
  if (isDemoMode) {
    logInfo('Already in demo mode, calling callback immediately');
    callback(demoUser);
  }
  
  return () => {
    logInfo('Cleaning up demo auth state change listener');
    demoAuthStateCallback = null;
  };
};

export const getDemoUser = () => isDemoMode ? demoUser : null;

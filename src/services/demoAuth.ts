import { User } from "firebase/auth";
import { logInfo } from "./logger";
import { initializeDemoData } from "./demoData";

// Demo user data structure
const demoUser: User = {
  uid: "demo-user",
  email: "demo@example.com",
  displayName: "Demo User",
  photoURL: "https://ui-avatars.com/api/?name=Demo+User&background=random",
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: Date.now().toString(),
    lastSignInTime: Date.now().toString(),
  },
  providerData: [],
  refreshToken: "demo-refresh-token",
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => "demo-token",
  getIdTokenResult: async () => ({
    token: "demo-token",
    signInProvider: "demo",
    signInSecondFactor: null,
    expirationTime: new Date(Date.now() + 3600000).toISOString(),
    issuedAtTime: new Date().toISOString(),
    authTime: new Date().toISOString(),
    claims: {},
  }),
  reload: async () => {},
  toJSON: () => ({ uid: "demo-user" }),
  phoneNumber: null,
  providerId: "demo",
};

// Use localStorage to persist auth mode state
export const AUTH_MODE = {
  FIREBASE: "firebase",
  DEMO: "demo",
  NONE: "none",
} as const;

type AuthMode = (typeof AUTH_MODE)[keyof typeof AUTH_MODE];

// Initialize auth mode from localStorage
export const getCurrentAuthMode = (): AuthMode => {
  return localStorage.getItem("authMode") as AuthMode;
};

export const signInDemoMode = (callback: (user: User | null) => void) => {
  logInfo("Initializing demo mode");
  localStorage.setItem("authMode", AUTH_MODE.DEMO);
  initializeDemoData();
  if (callback) {
    logInfo("Calling demo auth callback with demo user");
    callback(demoUser);
  }
};

export const isInDemoMode = () => getCurrentAuthMode() === AUTH_MODE.DEMO;

export const onDemoAuthStateChanged = (
  callback: (user: User | null) => void
) => {
  logInfo("Setting up demo auth state change listener");

  if (isInDemoMode()) {
    logInfo("Already in demo mode, calling callback immediately");
    callback(demoUser);
  }

  return () => {
    logInfo("Cleaning up demo auth state change listener");
  };
};

export const getDemoUser = () => (isInDemoMode() ? demoUser : null);

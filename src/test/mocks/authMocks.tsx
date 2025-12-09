import React, { createContext, useContext, ReactNode } from "react";

// --- Mock AuthContext ---
const MockAuthContext = createContext<any>(null);

export const MockAuthProvider: React.FC<{
  children: ReactNode;
  initialUser?: any;
  initialAuthState?: string;
}> = ({ children, initialUser = { displayName: "Test User" }, initialAuthState = "signedIn" }) => {
  return (
    <MockAuthContext.Provider
      value={{
        user: initialUser,
        authState: initialAuthState,
        handleSignIn: async () => {},
        handleSignOut: async () => {},
      }}
    >
      {children}
    </MockAuthContext.Provider>
  );
};

// --- Mock BioLockContext ---
const MockBioLockContext = createContext<any>(null);

export const MockBioLockProvider: React.FC<{
  children: ReactNode;
  isLocked?: boolean;
}> = ({ children, isLocked = false }) => {
  return (
    <MockBioLockContext.Provider
      value={{
        isLocked,
        isEnabled: true,
        isSupported: true,
        register: async () => true,
        authenticate: async () => true,
        disable: () => {},
        lock: () => {},
      }}
    >
      {children}
    </MockBioLockContext.Provider>
  );
};

// --- Mock exports that match the real files' exports ---
// This allows us to use `vi.mock` effectively if needed, 
// or just wrap components with these providers in tests.

export { MockAuthContext as AuthContext };
export { MockBioLockContext as BioLockContext };

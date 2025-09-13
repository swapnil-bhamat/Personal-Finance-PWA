import React, { createContext, useCallback, useState, useEffect, type ReactNode } from 'react';
import type { User, AuthState } from './auth';
import { signInWithGoogleDrive, signOut, initializeGoogleDrive } from './googleDrive';
import { initializeDemoMode } from './demoMode';
import { initializeFromDrive, setupDriveSync, stopDriveSync } from './driveSync';
import { logError } from './logger';

export interface AuthContextType {
  user: User | null;
  authState: AuthState;
  handleGoogleSignIn: (shouldRestore?: boolean) => Promise<void>;
  handleDemoSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authState, setAuthState] = useState<AuthState>('checking');

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        // Try to restore Google Drive session without triggering auth
        const userInfo = await initializeGoogleDrive();
        if (userInfo) {
          setUser({
            displayName: userInfo.name || 'Google User',
            photoURL: userInfo.picture || '',
            email: userInfo.email
          });
          // Initialize sync with Drive
          await initializeFromDrive(true);
          setupDriveSync(false);
          setAuthState('signedIn');
        } else {
          setAuthState('signedOut');
        }
      } catch (error) {
        logError('Session restoration failed:', {error});
        setAuthState('signedOut');
      }
    };

    checkExistingSession();

    // Cleanup on unmount
    return () => {
      stopDriveSync();
    };
  }, []);

  const handleGoogleSignIn = useCallback(async (shouldRestore = false) => {
    try {
      setAuthState('checking');
      const googleUser = await signInWithGoogleDrive();
      setUser({
        displayName: googleUser.name || 'Google User',
        photoURL: googleUser.picture || '',
        email: googleUser.email
      });

      // Initialize data from Drive or create new file
      await initializeFromDrive(shouldRestore);
      setupDriveSync(false);
      setAuthState('signedIn');
    } catch (error) {
      logError('Google sign-in failed:', {error});
      setAuthState('error');
    }
  }, []);

  const handleDemoSignIn = useCallback(async () => {
    try {
      setAuthState('checking');
      await initializeDemoMode();
      setUser({
        displayName: 'Demo User',
        photoURL: '',
        email: 'demo@example.com'
      });
      setupDriveSync(true); // Demo mode, no sync
      setAuthState('signedIn');
    } catch (error) {
      logError('Demo sign-in failed:', {error});
      setAuthState('error');
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      setAuthState('checking');
      stopDriveSync();
      await signOut();
      setUser(null);
      setAuthState('signedOut');
    } catch (error) {
      logError('Sign-out failed:', {error});
      setAuthState('error');
    }
  }, []);

  const contextValue: AuthContextType = {
    user,
    authState,
    handleGoogleSignIn,
    handleDemoSignIn,
    handleSignOut
  };

  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    children
  );
};
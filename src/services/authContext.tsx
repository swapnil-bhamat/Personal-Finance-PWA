import React, { createContext, useCallback, useState, type ReactNode } from 'react';
import type { User, AuthState } from './auth';
import { signInWithGoogleDrive, signOut } from './googleDrive';
import { signInDemoMode } from './demoAuth';

export interface AuthContextType {
  user: User | null;
  authState: AuthState;
  handleGoogleSignIn: () => Promise<void>;
  handleDemoSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authState, setAuthState] = useState<AuthState>('signedOut');

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setAuthState('checking');
      const userData = await signInWithGoogleDrive();
      setUser({
        displayName: userData.name || 'Google User',
        photoURL: userData.picture || '',
        email: userData.email
      });
      setAuthState('signedIn');
    } catch (error) {
      console.error('Google sign-in failed:', error);
      setAuthState('error');
    }
  }, []);

  const handleDemoSignIn = useCallback(async () => {
    try {
      setAuthState('checking');
      const demoUser = await signInDemoMode();
      setUser(demoUser);
      setAuthState('signedIn');
    } catch (error) {
      console.error('Demo sign-in failed:', error);
      setAuthState('error');
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      setAuthState('checking');
      await signOut();
      setUser(null);
      setAuthState('signedOut');
    } catch (error) {
      console.error('Sign-out failed:', error);
      setAuthState('error');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, authState, handleGoogleSignIn, handleDemoSignIn, handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};
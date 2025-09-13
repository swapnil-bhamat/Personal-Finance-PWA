import { useState, useEffect, type ReactNode } from 'react';
import { logInfo } from './logger';
import { GoogleDriveContext } from './googleDriveContext';

interface GoogleDriveProviderProps {
  children: ReactNode;
}

export const GoogleDriveProvider = ({ children }: GoogleDriveProviderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = async () => {
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      setIsInitialized(true);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      
      await new Promise<void>((resolve, reject) => {
        script.onload = () => {
          setIsInitialized(true);
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.body.appendChild(script);
      });

      logInfo('Google Identity Services initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Google Identity Services';
      setError(errorMessage);
      logInfo('Failed to initialize Google Identity Services', { error: err });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initialize().catch(console.error);
  }, []);

  return (
    <GoogleDriveContext.Provider value={{ isLoading, isInitialized, error, initialize }}>
      {children}
    </GoogleDriveContext.Provider>
  );
};
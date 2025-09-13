import { createContext } from 'react';

export interface GoogleDriveContextType {
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
}

export const GoogleDriveContext = createContext<GoogleDriveContextType | null>(null);
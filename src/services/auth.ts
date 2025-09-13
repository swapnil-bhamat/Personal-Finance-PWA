import { signInWithGoogleDrive, signOut as signOutGoogleDrive } from "./googleDrive";
import { logInfo } from "./logger";
import { getDemoUser } from "./demoAuth";

export type AuthState = "checking" | "signedIn" | "signedOut" | "error";

export type User = {
  displayName: string;
  photoURL: string;
  email?: string;
  isDemo?: boolean;
};

export enum AuthMode {
  GOOGLE_DRIVE = "GOOGLE_DRIVE",
  DEMO = "DEMO"
}

let currentMode: AuthMode | null = null;

export const getCurrentAuthMode = () => currentMode;

export const signInWithGoogle = async (): Promise<User> => {
  try {
    await signInWithGoogleDrive();
    currentMode = AuthMode.GOOGLE_DRIVE;
    const user: User = {
      displayName: "Google Drive User",
      photoURL: "https://www.google.com/drive/images/drive-logo-lg.png",
      email: "googledrive@example.com" // Placeholder email
    };
    logInfo("Google Drive mode initiated");
    return user;
  } catch (error) {
    logInfo("Google Drive sign in failed", { error });
    throw error;
  }
};

export const signInDemo = async (): Promise<User | null> => {
  const demoUser = getDemoUser();
  currentMode = AuthMode.DEMO;
  logInfo("Demo mode initiated");
  return demoUser;
};

export const signOut = async () => {
  if (currentMode === AuthMode.GOOGLE_DRIVE) {
    await signOutGoogleDrive();
  }
  currentMode = null;
  logInfo("Signed out", { wasDemo: currentMode === AuthMode.DEMO });
};
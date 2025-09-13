import { logInfo } from "./logger";
import { type User } from "./auth";

export enum AuthMode {
  GOOGLE_DRIVE = "GOOGLE_DRIVE",
  DEMO = "DEMO"
}

// Demo user data
const demoUser: User = {
  displayName: "Demo User",
  photoURL: "https://ui-avatars.com/api/?name=Demo+User&background=random",
  email: "demo@example.com",
  isDemo: true
};

export const signInDemoMode = async (): Promise<User> => {
  logInfo("Initializing demo mode");
  localStorage.setItem("authMode", AuthMode.DEMO);
  // Initialize with default demo data if needed
  logInfo("Demo mode initialized");
  return demoUser;
};

export const getCurrentAuthMode = (): AuthMode => {
  return localStorage.getItem("authMode") as AuthMode || AuthMode.GOOGLE_DRIVE;
};

export const isInDemoMode = (): boolean => getCurrentAuthMode() === AuthMode.DEMO;

export const getDemoUser = (): User | null => (isInDemoMode() ? demoUser : null);

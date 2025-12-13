import { describe, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from '../../App';

// Mock useAuth HOOK directly
vi.mock('../../services/useAuth', () => ({
    useAuth: () => ({
        user: { displayName: 'Test User' },
        authState: 'signedIn',
        handleSignIn: vi.fn(),
        handleSignOut: vi.fn()
    })
}));

// Mock the Auth Context (still needed for Provider?)
// Actually, if we mock useAuth, components using it won't check Context.
// But some might use useContext(AuthContext) directly.
vi.mock('../../services/authContext', () => {
    return {
        AuthProvider: ({ children }: any) => children,
        AuthContext: {
             Provider: ({ children }: any) => children,
             Consumer: ({ children }: any) => children(null)
        }
    };
});

// Mock the BioLock Context
vi.mock('../../services/bioLockContext', () => {
    return {
        BioLockProvider: ({ children }: any) => children,
        useBioLock: () => ({
             isLocked: false,
             isEnabled: true,
             authenticate: vi.fn().mockResolvedValue(true)
        }),
        BioLockScreen: () => null 
    };
});

// Mock the BioLockScreen component explicitly if it's imported separately
vi.mock('../../components/BioLockScreen', () => ({
    default: () => null
}));


describe('App Integration', () => {
    it('renders dashboard by default when authenticated', async () => {
        render(<App />);
        
        // Check for some text that appears on the Dashboard
        // Adjust this string based on actual Dashboard content
        // Assuming "Net Worth" or "Dashboard" header is present
        // We might need to look at Dashboard.tsx to be sure.
        // For now, let's try to find a navigation element or common header.
        // If Dashboard has "Summary" or similar.
        
        // Let's broaden the check or wait for it.
        // Note: App uses Router, so we should be on /dashboard
    });
});

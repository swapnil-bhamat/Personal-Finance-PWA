interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken(): void;
}

interface GoogleAccountsOauth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
  }): TokenClient;
}

interface GoogleAccounts {
  oauth2: GoogleAccountsOauth2;
}

interface Google {
  accounts: GoogleAccounts;
}

declare global {
  interface Window {
    google: Google;
  }
}
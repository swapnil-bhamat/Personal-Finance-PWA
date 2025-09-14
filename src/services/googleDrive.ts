import { logError, logInfo } from './logger';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

interface GoogleDriveAuth {
  accessToken: string | null;
}

const authState: GoogleDriveAuth = {
  accessToken: null
};

export interface GoogleUserInfo {
  email: string;
  name?: string;
  picture?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  prompt?: string;
  callback: (response: TokenResponse) => void;
}

interface TokenClient {
  requestAccessToken: (options?: { prompt: string }) => void;
}

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient;
        };
      };
    };
  }
}

export const validateToken = async (accessToken: string): Promise<boolean> => {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      logInfo('Token validation failed:', { status: response.status });
      return false;
    }

    const data = await response.json();
    const requiredScopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    // Check if token has all required scopes
    const tokenScopes = data.scope?.split(' ') || [];
    const hasAllScopes = requiredScopes.every(scope => tokenScopes.includes(scope));
    
    if (!hasAllScopes) {
      logInfo('Token missing required scopes:', { 
        required: requiredScopes,
        actual: tokenScopes 
      });
      return false;
    }

    return true;
  } catch (error) {
    logInfo('Token validation error:', { error });
    return false;
  }
};

export const getUserInfo = async (accessToken: string): Promise<GoogleUserInfo | null> => {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      logInfo('Failed to get user info:', { status: response.status });
      return null;
    }

    const userInfo = await response.json();
    if (!userInfo.email) {
      logInfo('Invalid user info received:', { userInfo });
      return null;
    }

    return {
      email: userInfo.email,
      name: userInfo.name || userInfo.email.split('@')[0],
      picture: userInfo.picture || null
    };
  } catch (error) {
    logInfo('Error getting user info:', { error });
    return null;
  }
};

export const initializeGoogleDrive = async (): Promise<GoogleUserInfo | null> => {
  const savedToken = localStorage.getItem('googleDriveToken');
  if (savedToken) {
    try {
      const tokens = JSON.parse(savedToken);
      const isValid = await validateToken(tokens.access_token);
      
      if (isValid) {
        authState.accessToken = tokens.access_token;
        const userInfo = await getUserInfo(tokens.access_token);
        if (userInfo) {
          logInfo('Restored Google Drive session');
          return userInfo;
        }
      }
      
      localStorage.removeItem('googleDriveToken');
      authState.accessToken = null;
    } catch (error) {
      logInfo('Failed to restore Google Drive session', { error });
      localStorage.removeItem('googleDriveToken');
    }
  }
  return null;
};

export const signInWithGoogleDrive = async (): Promise<GoogleUserInfo> => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    throw new Error(
      'Google Client ID not found. Please set VITE_GOOGLE_CLIENT_ID in your .env file. ' +
      'You can get this from the Google Cloud Console.'
    );
  }

  if (!window.google?.accounts?.oauth2) {
    throw new Error(
      'Google API client not loaded. Please check your internet connection ' +
      'and make sure the Google API client script is loading properly.'
    );
  }

  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes.join(' '),
        prompt: 'consent',
        callback: async (response: TokenResponse) => {
          if (response?.access_token) {
            try {
              const isValid = await validateToken(response.access_token);
              if (!isValid) {
                reject(new Error('Invalid access token received'));
                return;
              }

              authState.accessToken = response.access_token;
              localStorage.setItem('googleDriveToken', JSON.stringify({
                access_token: response.access_token,
                timestamp: Date.now()
              }));

              const userInfo = await getUserInfo(response.access_token);
              if (userInfo) {
                resolve(userInfo);
              } else {
                reject(new Error('Failed to get user info'));
              }
            } catch (error) {
              reject(new Error('Failed to complete authentication: ' + 
                (error instanceof Error ? error.message : String(error))));
            }
          } else {
            reject(new Error('Failed to get access token'));
          }
        }
      });

      tokenClient.requestAccessToken();
    } catch (error) {
      reject(new Error('Failed to initialize Google auth: ' + 
        (error instanceof Error ? error.message : String(error))));
    }
  });
};

export const signOut = async () => {
  if (authState.accessToken) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${authState.accessToken}`, {
        method: 'POST'
      });
    } catch (error) {
      logInfo('Error revoking token:', { error });
    }
    
    authState.accessToken = null;
    localStorage.removeItem('googleDriveToken');
    logInfo('Signed out from Google Drive');
  }
};

export const findFile = async (fileName: string): Promise<DriveFile | null> => {
  const files = await listFiles();
  return files.find(file => file.name === fileName) || null;
};

export const listFiles = async (): Promise<DriveFile[]> => {
  if (!authState.accessToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application/json%27&fields=files(id%2Cname%2CmimeType)',
    {
      headers: {
        'Authorization': `Bearer ${authState.accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list files: ${response.statusText}`);
  }

  interface GoogleDriveFileResponse {
    files?: Array<{
      id?: string;
      name?: string;
      mimeType?: string;
    }>;
  }
  
  const data: GoogleDriveFileResponse = await response.json();
  return (data.files || []).map(file => ({
    id: file.id || '',
    name: file.name || '',
    mimeType: file.mimeType || ''
  }));
};

export const readFile = async <T = unknown>(fileId: string): Promise<T> => {
  if (!authState.accessToken) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  } catch (err) {
    logError("Read failed", {err});
    throw err;
  }
};

export const uploadJsonFile = async <T = unknown>(
  content: T,
  filename: string = "data.json"
): Promise<{ id: string; name: string }> => {
  if (!authState.accessToken) {
    throw new Error("Not authenticated");
  }

  try {
    // Create blob
    const blob = new Blob([JSON.stringify(content)], {
      type: "application/json",
    });

    // Metadata
    const metadata = {
      name: filename,
      mimeType: "application/json",
    };

    // Check if file exists
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${filename}' and mimeType='application/json' and trashed=false&fields=files(id,name)`,
      {
        headers: { 
          Authorization: `Bearer ${authState.accessToken}`
        },
      }
    );
    const searchData = await searchRes.json();
    const existingFile = searchData.files?.[0];

    // Prepare form data
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", blob);

    let uploadResponse;

    if (existingFile) {
      // Update existing file
      uploadResponse = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart&fields=id,name`,
        {
          method: "PATCH",
          headers: { 
            Authorization: `Bearer ${authState.accessToken}`
          },
          body: form,
        }
      );
    } else {
      // Create new file
      uploadResponse = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
        {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${authState.accessToken}`
          },
          body: form,
        }
      );
    }

    return uploadResponse.json();
  } catch (err) {
    logError("Upload failed", {err});
    throw err;
  }
};

export interface WriteFileResponse {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

export const writeFile = async (fileId: string, content: string): Promise<WriteFileResponse> => {
  if (!authState.accessToken) {
    throw new Error("Not authenticated");
  }

  try {
    // Create blob
    const blob = new Blob([content], {
      type: "application/json",
    });

    // Update file
    const uploadResponse = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime`,
      {
        method: "PATCH",
        headers: { 
          Authorization: `Bearer ${authState.accessToken}`
        },
        body: blob,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`Failed to write file: ${uploadResponse.statusText}`);
    }

    return uploadResponse.json();
  } catch (err) {
    logError("Write failed", {err});
    throw err;
  }
};

export const deleteFile = async (fileId: string): Promise<void> => {
  if (!authState.accessToken) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: "DELETE",
        headers: { 
          Authorization: `Bearer ${authState.accessToken}`
        }
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  } catch (err) {
    logError("Delete failed", {err});
    throw err;
  }
};
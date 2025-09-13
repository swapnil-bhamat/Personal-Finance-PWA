import { logInfo } from './logger';

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

export const deleteFile = async (fileId: string): Promise<void> => {
  if (!authState.accessToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authState.accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete file: ${response.statusText}`);
  }
};

export const initializeGoogleDrive = async () => {
  // Load saved token if exists
  const savedToken = localStorage.getItem('googleDriveToken');
  if (savedToken) {
    try {
      const tokens = JSON.parse(savedToken);
      authState.accessToken = tokens.access_token;
      logInfo('Restored Google Drive session');
      return true;
    } catch (error) {
      logInfo('Failed to restore Google Drive session', { error });
      localStorage.removeItem('googleDriveToken');
    }
  }
  return false;
};

interface GoogleUserInfo {
  email: string;
  name?: string;
  picture?: string;
}

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

  const scopes = ['https://www.googleapis.com/auth/drive.file'];
  
  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes.join(' '),
      callback: (response) => {
        if (response.access_token) {
          authState.accessToken = response.access_token;
          localStorage.setItem('googleDriveToken', JSON.stringify({
            access_token: response.access_token,
            expires_in: 3600
          }));
          authState.accessToken = response.access_token;
          // Fetch user info
          fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${response.access_token}`
            }
          })
            .then(response => response.json())
            .then(userInfo => {
              resolve({
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture
              });
            })
            .catch(error => {
              reject(new Error('Failed to fetch user info: ' + error.message));
            });
        } else {
          reject(new Error('Failed to get access token'));
        }
      },
    });

    tokenClient.requestAccessToken();
  });
};

export const signOut = async () => {
  if (authState.accessToken) {
    // Revoke the token
    await fetch(`https://oauth2.googleapis.com/revoke?token=${authState.accessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
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
};

export const writeFile = async <T = unknown>(
  name: string,
  content: T,
  fileId?: string
): Promise<DriveFile> => {
  if (!authState.accessToken) {
    throw new Error("Not authenticated");
  }

  const metadata = {
    name,
    mimeType: 'application/json',
    ...(fileId ? { id: fileId } : {})
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

  const method = fileId ? 'PATCH' : 'POST';
  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${authState.accessToken}`
    },
    body: form
  });

  if (!response.ok) {
    throw new Error(`Failed to write file: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType
  };
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
        headers: { Authorization: `Bearer ${authState.accessToken}` },
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
          headers: { Authorization: `Bearer ${authState.accessToken}` },
          body: form,
        }
      );
    } else {
      // Create new file
      uploadResponse = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${authState.accessToken}` },
          body: form,
        }
      );
    }

    return uploadResponse.json();
  } catch (err) {
    console.error("Upload failed", err);
    throw err;
  }
};
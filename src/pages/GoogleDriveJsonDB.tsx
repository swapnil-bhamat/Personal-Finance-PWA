"use client";
import { useState, useEffect } from "react";
import { Button, Container, Row, Col, Card, Spinner } from "react-bootstrap";

declare global {
  interface Window {
    google: any;
  }
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export default function GoogleDriveJSONCrud() {
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);

  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const SCOPES = "https://www.googleapis.com/auth/drive.file";

  // Load Google Identity Services
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => setGsiLoaded(true);
    document.body.appendChild(script);
  }, []);

  // Sign in to Google
  const handleSignIn = () => {
    if (!gsiLoaded) return;
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.access_token) {
          setAccessToken(resp.access_token);
          listFiles(resp.access_token);
        }
      },
    });
    tokenClient.requestAccessToken();
  };

  // List JSON files in Drive
  const listFiles = async (token: string) => {
    setLoading(true);
    const res = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=mimeType='application/json'&fields=files(id,name,mimeType)",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();
    setFiles(data.files || []);
    setLoading(false);
  };

  // Read a JSON file from Drive
  const readFile = async (fileId: string) => {
    if (!accessToken) return;
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const content = await res.json();
    alert("File content:\n" + JSON.stringify(content, null, 2));
  };

  // Delete a file
  const deleteFile = async (fileId: string) => {
    if (!accessToken) return;
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    listFiles(accessToken);
  };

  const uploadLocalJson = async () => {
    if (!accessToken) {
      alert("Please sign in first.");
      return;
    }
    try {
      // 1. Load file from public/data.json
      const response = await fetch("/data.json");
      const content = await response.json();

      // 2. Create blob
      const blob = new Blob([JSON.stringify(content)], {
        type: "application/json",
      });

      // 3. Metadata
      const metadata = {
        name: "data.json",
        mimeType: "application/json",
      };

      // 🔹 First, check if file already exists
      const searchRes = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=name='data.json' and mimeType='application/json' and trashed=false&fields=files(id,name)",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const searchData = await searchRes.json();
      const existingFile = searchData.files?.[0];

      let uploadResponse;

      if (existingFile) {
        // 🔹 Update existing file
        const form = new FormData();
        form.append(
          "metadata",
          new Blob([JSON.stringify(metadata)], { type: "application/json" })
        );
        form.append("file", blob);

        uploadResponse = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart&fields=id,name`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form,
          }
        );
      } else {
        // 🔹 Create new file
        const form = new FormData();
        form.append(
          "metadata",
          new Blob([JSON.stringify(metadata)], { type: "application/json" })
        );
        form.append("file", blob);

        uploadResponse = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form,
          }
        );
      }

      const result = await uploadResponse.json();
      alert(`File saved! ID: ${result.id}, Name: ${result.name}`);

      listFiles(accessToken);
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  return (
    <Container className="py-4">
      <Row className="mb-3">
        <Col>
          {!accessToken ? (
            <Button onClick={handleSignIn}>Sign in with Google</Button>
          ) : (
            <>
              <Button onClick={() => listFiles(accessToken)} className="me-2">
                Refresh Files
              </Button>
              <Button variant="success" onClick={uploadLocalJson}>
                Upload data.json
              </Button>
            </>
          )}
        </Col>
      </Row>

      {loading && <Spinner animation="border" />}

      <Row>
        {files.map((file) => (
          <Col md={4} key={file.id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>{file.name}</Card.Title>
                <Button
                  size="sm"
                  className="me-2"
                  onClick={() => readFile(file.id)}
                >
                  Read
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => deleteFile(file.id)}
                >
                  Delete
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

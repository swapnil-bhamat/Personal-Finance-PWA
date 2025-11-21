import { useState } from "react";
import { resetDatabase } from "../services/db";
import { Container, Card, Button, Alert, Form } from "react-bootstrap";
import { logError } from "../services/logger";
import { useBioLock } from "../services/bioLockContext";

export default function SettingsPage() {
  const { isEnabled, isSupported, register, disable } = useBioLock();
  const [isResetting, setIsResetting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset the database? This will remove all your data and restore default values."
      )
    ) {
      try {
        setIsResetting(true);
        setError(null);
        await resetDatabase();
        setShowSuccess(true);
        // Force page reload after reset
        window.location.reload();
      } catch (err) {
        logError("Reset failed:", { err });
        setError(err instanceof Error ? err.message : "Reset failed");
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <Container fluid className="py-4">
      <Card className="mb-4">
        <Card.Header>Security</Card.Header>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-1">Biometric Lock</h5>
              <p className="text-muted mb-0">
                Require fingerprint or face ID to access the app.
              </p>
              {!isSupported && (
                <small className="text-danger">
                  Biometric authentication is not supported on this device.
                </small>
              )}
            </div>
            <Form.Check
              type="switch"
              id="bio-lock-switch"
              label={isEnabled ? "Enabled" : "Disabled"}
              checked={isEnabled}
              disabled={!isSupported}
              onChange={async (e) => {
                if (e.target.checked) {
                  const success = await register();
                  if (!success) {
                    // Handle failure if needed, but register() logs errors
                    // You might want to show a toast here
                    alert("Failed to register biometric credential.");
                  }
                } else {
                  disable();
                }
              }}
            />
          </div>
        </Card.Body>
      </Card>

      <Card className="mb-4 border-danger">
        <Card.Header className="bg-danger text-white">Danger Zone</Card.Header>
        <Card.Body style={{ backgroundColor: "rgba(255, 0, 0, 0.05)" }}>
          <h5>Reset Database to Default Values?</h5>
          <p className="text-body-secondary">
            This will delete all your current data and restore the default
            values. This action cannot be undone.
          </p>
          <Button
            variant="outline-danger"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? "Resetting..." : "Reset Database"}
          </Button>
        </Card.Body>
      </Card>
      {showSuccess && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setShowSuccess(false)}
        >
          Database reset successfully
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Container>
  );
}

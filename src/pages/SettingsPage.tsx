import { useState } from "react";
import { resetDatabase } from "../services/db";
import { Container, Card, Button, Alert } from "react-bootstrap";

export default function SettingsPage() {
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
        console.error("Reset failed:", err);
        setError(err instanceof Error ? err.message : "Reset failed");
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <Container fluid className="py-4">
      <Card className="mb-4 border-danger">
        <Card.Header className="bg-danger text-white">Danger Zone</Card.Header>
        <Card.Body style={{ backgroundColor: "rgba(255, 0, 0, 0.05)" }}>
          <h5>Reset Database to Default Values?</h5>
          <p className="text-muted">
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

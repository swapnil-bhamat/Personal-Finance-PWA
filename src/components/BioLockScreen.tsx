import React, { useEffect } from "react";
import { Container, Button, Card } from "react-bootstrap";
import { useBioLock } from "../services/bioLockContext";
import { FaLock } from "react-icons/fa";

const BioLockScreen: React.FC = () => {
  const { authenticate, isLocked } = useBioLock();

  useEffect(() => {
    if (isLocked) {
      // Attempt to authenticate automatically on mount/lock
      // But maybe better to wait for user interaction to avoid annoying loops if it fails
      // authenticate(); 
    }
  }, [isLocked, authenticate]);

  if (!isLocked) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(33, 37, 41, 0.98)", // Dark background
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(10px)",
      }}
    >
      <Container style={{ maxWidth: "400px" }}>
        <Card className="text-center bg-dark text-white border-secondary shadow-lg">
          <Card.Body className="py-5">
            <div className="mb-4">
              <FaLock size={64} className="text-primary" />
            </div>
            <h2 className="mb-4">App Locked</h2>
            <p className="text-muted mb-4">
              Authentication is required to access your financial data.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-100 rounded-pill"
              onClick={() => authenticate()}
            >
              Unlock
            </Button>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default BioLockScreen;

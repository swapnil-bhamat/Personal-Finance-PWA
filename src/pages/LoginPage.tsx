import React, { useEffect, useState } from "react";
import {
  signIn,
  signOutUser,
  onUserStateChanged,
  isUserAllowed,
} from "../services/firebase";
import { initDemoMode, isInDemoMode } from "../services/demoAuth";
import { User } from "firebase/auth";
import { Container, Card, Button, Spinner, Alert } from "react-bootstrap";
import { BsGoogle, BsBoxArrowRight } from "react-icons/bs";

const LoginPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const unsubscribe = onUserStateChanged(async (firebaseUser) => {

      // Skip Firebase checks if in demo mode
      if (isInDemoMode()) {
        setChecking(false);
        return;
      }

      setChecking(true);
      setUser(firebaseUser);

      if (firebaseUser) {
        const isAllowed = await isUserAllowed(firebaseUser);
        setAllowed(isAllowed);

        if (!isAllowed) {
          setError("Access denied. Your email is not authorized.");
          signOutUser();
        } else {
          setError(null);
        }
      } else {
        setAllowed(false);
        setError(null);
      }

      setChecking(false);
    });
    return () => unsubscribe();
  }, []);

  if (checking) {
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status" />
        <span className="ms-2">Checking access...</span>
      </Container>
    );
  }

  if (user && allowed) {
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Card
          className="p-4 shadow-lg text-center"
          style={{ maxWidth: "400px", width: "100%" }}
        >
          <Card.Body>
            <h4 className="mb-3">Welcome</h4>
            <p className="fw-medium">{user.displayName || user.email}</p>
            <Button
              variant="outline-danger"
              onClick={() => signOutUser()}
              className="d-flex align-items-center justify-content-center gap-2 mt-3"
            >
              <BsBoxArrowRight /> Sign Out
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100">
      <Card
        className="p-4 shadow-lg text-center"
        style={{ maxWidth: "400px", width: "100%" }}
      >
        <Card.Body>
          <h4 className="mb-3">Personal Finance App</h4>
          <Alert variant="info">Google Sign-In will work only when you self host and configure the Firebase as per the documentation.</Alert>
          <div className="d-flex flex-column gap-3">
            <Button
              variant="outline-primary"
              onClick={() => signIn()}
              className="d-flex align-items-center justify-content-center gap-2 w-100"
            >
              <BsGoogle /> Sign in with Google
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => {
                initDemoMode();
              }}
              className="d-flex align-items-center justify-content-center gap-2 w-100"
            >
              Try Demo Mode
            </Button>
          </div>
          {error && (
            <Alert variant="danger" className="mt-3">
              {error}
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LoginPage;

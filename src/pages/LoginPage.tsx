import React, { useEffect, useState } from 'react';
import { signIn, signOutUser, onUserStateChanged, isUserAllowed } from '../services/firebase';
import { User } from 'firebase/auth';

const LoginPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const unsubscribe = onUserStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      setChecking(true);
      if (firebaseUser) {
        const isAllowed = await isUserAllowed(firebaseUser);
        setAllowed(isAllowed);
        if (!isAllowed) {
          setError('Access denied. Your email is not authorized.');
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
    return <div style={{ textAlign: 'center', marginTop: '20vh' }}><h2>Checking access...</h2></div>;
  }
  if (user && allowed) {
    return (
      <div>
        <h2>Welcome, {user.displayName || user.email}!</h2>
        <button onClick={() => signOutUser()}>Sign Out</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '20vh' }}>
      <h2>Sign in to Personal Finance App</h2>
      <button onClick={() => signIn()}>Sign in with Google</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default LoginPage;

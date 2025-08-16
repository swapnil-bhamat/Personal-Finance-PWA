import { useEffect, useState } from 'react';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { Spinner, Container } from 'react-bootstrap';
import Layout from './components/Layout';
import HoldersPage from './pages/HoldersPage';
import SwpPage from './pages/SwpPage';
import AccountsPage from './pages/AccountsPage';
import AssetClassesPage from './pages/AssetClassesPage';

const routes: RouteObject[] = [
  {
    path: '/',
    Component: Layout,
    children: [
      { path: '', Component: () => <Navigate to="/swp" replace /> },
      { path: 'swp', Component: SwpPage },
      { path: 'holders', Component: HoldersPage },
      { path: 'accounts', Component: AccountsPage },
      { path: 'asset-classes', Component: AssetClassesPage }
    ]
  }
];

const router = createBrowserRouter(routes);

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  if (!isInitialized) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return <RouterProvider router={router} />;
}

export default App;

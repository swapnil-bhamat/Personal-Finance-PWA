import { useEffect, useState } from 'react';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { Spinner, Container } from 'react-bootstrap';
import Layout from './components/Layout';
import HoldersPage from './pages/HoldersPage';
import SwpPage from './pages/SwpPage';
import AccountsPage from './pages/AccountsPage';
import AssetClassesPage from './pages/AssetClassesPage';
import AssetPurposePage from './pages/AssetPurposePage';
import LiabilitiesPage from './pages/LiabilitiesPage';
import LoanTypesPage from './pages/LoanTypesPage';
import ImportExportPage from './pages/ImportExportPage';
import ConfigsPage from './pages/ConfigsPage';
import CashFlowPage from './pages/CashFlowPage';
import IncomePage from './pages/IncomePage';
import SettingsPage from './pages/SettingsPage';
import Dashboard from './pages/Dashboard';
import SipTypesPage from './pages/SipTypesPage';
import AssetsHoldingsPage from './pages/AssetsHoldingsPage';
import QueryBuilderPage from './pages/QueryBuilderPage';
import BucketsPage from './pages/BucketsPage';
import GoalsPage from './pages/GoalsPage';
import ErrorBoundary from './components/ErrorBoundary';

const routes: RouteObject[] = [
  {
    path: '/',
    Component: Layout,
    children: [
      { path: '', Component: () => <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', Component: Dashboard },
      { path: 'swp', Component: SwpPage },
      { path: 'holders', Component: HoldersPage },
      { path: 'accounts', Component: AccountsPage },
      { path: 'asset-classes', Component: AssetClassesPage },
      { path: 'asset-purpose', Component: AssetPurposePage },
      { path: 'liabilities', Component: LiabilitiesPage },
      { path: 'loan-types', Component: LoanTypesPage },
      { path: 'import-export', Component: ImportExportPage },
      { path: 'configs', Component: ConfigsPage },
      { path: 'cash-flow', Component: CashFlowPage },
      { path: 'income', Component: IncomePage },
      { path: 'reset', Component: SettingsPage },
      { path: 'sip-types', Component: SipTypesPage },
      { path: 'assets-holdings', Component: AssetsHoldingsPage },
      { path: 'query-builder', Component: QueryBuilderPage },
      { path: 'buckets', Component: BucketsPage },
      { path: 'goals', Component: GoalsPage }
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

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;

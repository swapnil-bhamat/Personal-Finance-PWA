import { useEffect, useState } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme, CircularProgress, Box } from '@mui/material';
import { initializeDatabase, db } from './services/db';
import { validateDatabase, getDatabaseStats } from './services/dbUtils';
import ErrorBoundary from './components/ErrorBoundary';

// Import Layout and Pages
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ConfigsPage from './pages/ConfigsPage';
import AssetPurposePage from './pages/AssetPurposePage';
import LoanTypesPage from './pages/LoanTypesPage';
import HoldersPage from './pages/HoldersPage';
import SipTypesPage from './pages/SipTypesPage';
import BucketsPage from './pages/BucketsPage';
import AssetClassesPage from './pages/AssetClassesPage';
import AssetsHoldingsPage from './pages/AssetsHoldingsPage';
import GoalsPage from './pages/GoalsPage';
import AccountsPage from './pages/AccountsPage';
import IncomePage from './pages/IncomePage';
import CashFlowPage from './pages/CashFlowPage';
import LiabilitiesPage from './pages/LiabilitiesPage';
import ImportExportPage from './pages/ImportExportPage';
import QueryBuilderPage from './pages/QueryBuilderPage';
import SettingsPage from './pages/SettingsPage';
import SwpPage from './pages/SwpPage';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/swp', element: <SwpPage /> },
      { path: '/configs', element: <ConfigsPage /> },
      { path: '/asset-purposes', element: <AssetPurposePage /> },
      { path: '/loan-types', element: <LoanTypesPage /> },
      { path: '/holders', element: <HoldersPage /> },
      { path: '/sip-types', element: <SipTypesPage /> },
      { path: '/buckets', element: <BucketsPage /> },
      { path: '/asset-classes', element: <AssetClassesPage /> },
      { path: '/assets-holdings', element: <AssetsHoldingsPage /> },
      { path: '/goals', element: <GoalsPage /> },
      { path: '/accounts', element: <AccountsPage /> },
      { path: '/income', element: <IncomePage /> },
      { path: '/cash-flow', element: <CashFlowPage /> },
      { path: '/liabilities', element: <LiabilitiesPage /> },
      { path: '/import-export', element: <ImportExportPage /> },
      { path: '/query-builder', element: <QueryBuilderPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
]);



function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDb = async () => {
      try {
        // Check if we need to migrate due to schema changes
        const storedDbVersion = localStorage.getItem('dbVersion');
        
        // Delete database and reinitialize if version changed
        if (storedDbVersion && storedDbVersion !== '2') {
          console.log('Schema version changed, deleting old database...');
          const req = indexedDB.deleteDatabase('financeDb');
          await new Promise<void>((resolve, reject) => {
            req.onsuccess = () => resolve();
            req.onerror = () => reject();
            req.onblocked = () => {
              console.warn('Database deletion blocked');
              reject(new Error('Database deletion blocked'));
            };
          });
          localStorage.removeItem('dbInitialized');
          localStorage.removeItem('dbVersion');
          console.log('Old database deleted');
        }

        // Initialize database with fresh data if needed
        const isInitialized = localStorage.getItem('dbInitialized') === 'true';
        if (!isInitialized) {
          console.log('Initializing database...');
          const response = await fetch('/data.json');
          if (!response.ok) {
            throw new Error(`Failed to fetch data.json: ${response.statusText}`);
          }
          const data = await response.json();
          await initializeDatabase(data);
          localStorage.setItem('dbInitialized', 'true');
          localStorage.setItem('dbVersion', '2');
          
          const stats = await getDatabaseStats();
          console.log('Database initialized with data:', stats);
        } else {
          // Validate existing database
          const hasData = await validateDatabase();
          if (!hasData) {
            console.log('Database is empty, reinitializing...');
            const response = await fetch('/data.json');
            if (!response.ok) {
              throw new Error(`Failed to fetch data.json: ${response.statusText}`);
            }
            const data = await response.json();
            await initializeDatabase(data);
            localStorage.setItem('dbVersion', '2');
          } else {
            console.log('Database is ready');
          }
        }
      } catch (err) {
        console.error('Failed to initialize database:', err);
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setError(`${message}. Please try refreshing the page.`);
      } finally {
        setIsLoading(false);
      }
    };

    initDb();
  }, []);

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: 'error.main',
          p: 2,
          textAlign: 'center'
        }}
      >
        {error}
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RouterProvider router={router} />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

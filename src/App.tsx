import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
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
    ],
  },
]);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;

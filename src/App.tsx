import {
  RouterProvider,
  createBrowserRouter,
  Navigate,
} from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { AuthProvider } from "./services/authContext";

import Layout from "./components/Layout";
import ConfigurationsPage from "./pages/ConfigurationsPage";

import CashFlowPage from "./pages/CashFlowPage";
import IncomePage from "./pages/IncomePage";
import SettingsPage from "./pages/SettingsPage";
import Dashboard from "./pages/Dashboard";
import AssetsHoldingsPage from "./pages/AssetsHoldingsPage";
import GoalsPage from "./pages/GoalsPage";
import ErrorBoundary from "./components/ErrorBoundary";
import AboutPage from "./pages/AboutPage";
import FinanceRules from "./pages/FinanceRules";
import AssetAllocationProjectionPage from "./pages/AssetAllocationProjectionPage";
import { BioLockProvider } from "./services/bioLockContext";
import BioLockScreen from "./components/BioLockScreen";
import SwpPage from "./pages/SwpPage";
import LiabilitiesPage from "./pages/LiabilitiesPage";

const routes: RouteObject[] = [
  {
    path: "/",
    Component: Layout,
    children: [
      { path: "", Component: () => <Navigate to="/dashboard" replace /> },
      { path: "dashboard", Component: Dashboard },
      { path: "swp", Component: SwpPage },
      
      { path: "configuration", Component: ConfigurationsPage },

      { path: "liabilities", Component: LiabilitiesPage },
      
      { path: "cash-flow", Component: CashFlowPage },
      { path: "income", Component: IncomePage },

      { path: "settings", Component: SettingsPage },
      { path: "assets-holdings", Component: AssetsHoldingsPage },
      { path: "goals", Component: GoalsPage },
      { path: "about", Component: AboutPage },
      { path: "finance-rules", Component: FinanceRules },
      {
        path: "networth-projection",
        Component: AssetAllocationProjectionPage,
      },
    ],
  },
];

const router = createBrowserRouter(routes);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BioLockProvider>
          <BioLockScreen />
          <RouterProvider router={router} />
        </BioLockProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

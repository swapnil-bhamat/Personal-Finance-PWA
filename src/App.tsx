import {
  RouterProvider,
  createBrowserRouter,
  Navigate,
} from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { AuthProvider } from "./services/authContext";

import Layout from "./components/Layout";

import CashFlowPage from "./pages/CashFlowPage";
import IncomePage from "./pages/IncomePage";
import SettingsPage from "./pages/SettingsPage";
import ToolsPage from "./pages/ToolsPage";
import Dashboard from "./pages/Dashboard";
import AssetsHoldingsPage from "./pages/AssetsHoldingsPage";
import GoalsPage from "./pages/GoalsPage";
import ErrorBoundary from "./components/ErrorBoundary";
import AboutPage from "./pages/AboutPage";
import FinanceRules from "./pages/FinanceRules";
import AssetAllocationProjectionPage from "./pages/AssetAllocationProjectionPage";
import { BioLockProvider } from "./services/bioLockContext";
import { ThemeProvider } from "./services/themeContext";
import BioLockScreen from "./components/BioLockScreen";
import LiabilitiesPage from "./pages/LiabilitiesPage";

const routes: RouteObject[] = [
  {
    path: "/",
    Component: Layout,
    children: [
      { path: "", Component: () => <Navigate to="/dashboard" replace /> },
      { path: "dashboard", Component: Dashboard },
      { path: "liabilities", Component: LiabilitiesPage },
      
      { path: "cash-flow", Component: CashFlowPage },
      { path: "income", Component: IncomePage },

      { path: "settings", Component: SettingsPage },
      { path: "assets-holdings", Component: AssetsHoldingsPage },
      { path: "goals", Component: GoalsPage },
      { path: "about", Component: AboutPage },
      { path: "knowledge-centre", Component: FinanceRules },
      { path: "tools", Component: ToolsPage },
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
          <ThemeProvider>
            <BioLockScreen />
            <RouterProvider router={router} />
          </ThemeProvider>
        </BioLockProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

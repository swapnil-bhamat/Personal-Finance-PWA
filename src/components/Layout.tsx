import React, { useState, useEffect } from "react";
import {
  onUserStateChanged,
  isUserAllowed,
  signOutUser,
} from "../services/firebase";
import {
  initializeSync,
  stopSync,
  setupLocalChangeSync,
} from "../services/sync";
import { onDemoAuthStateChanged, isInDemoMode, exitDemoMode } from "../services/demoAuth";
import { initializeDemoData } from "../services/demoData";
import LoginPage from "../pages/LoginPage";
import { useLocation } from "react-router-dom";
import { Accordion } from "react-bootstrap";
import "./Layout.scss";
import { Link, Outlet } from "react-router-dom";
import { Nav, Offcanvas, Button, Image, Spinner } from "react-bootstrap";
import {
  BsSpeedometer,
  BsPeople,
  BsBucket,
  BsLayers,
  BsFlag,
  BsGraphUp,
  BsCreditCard2Back,
  BsFileEarmarkText,
  BsGear,
  BsList,
  BsArrowRepeat,
  BsPersonGear,
  BsLayersHalf,
  BsBank,
  BsDatabaseDown,
  BsFiletypeSql,
  BsBoxArrowRight,
} from "react-icons/bs";
import { PiHandWithdraw } from "react-icons/pi";
import { GiReceiveMoney, GiPayMoney, GiCash } from "react-icons/gi";
import { GoGoal } from "react-icons/go";
import { TiFlowMerge } from "react-icons/ti";
import { VscDebugLineByLine } from "react-icons/vsc";
import { logError, logInfo } from "../services/logger";
import { MdQuestionMark, MdEmail } from "react-icons/md";
import { BsGithub, BsLinkedin } from "react-icons/bs";

type MenuItem = {
  text: string;
  path?: string;
  icon: React.ReactElement;
  items?: MenuItem[];
};

export default function Layout() {
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(false);
  const handleClose = () => setShowSidebar(false);
  const handleShow = () => setShowSidebar(true);

  // Auth state
  const [user, setUser] = useState<import("firebase/auth").User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  // Initialize sync system after user is authenticated and allowed
  useEffect(() => {
    const initializeApp = async () => {
      // Skip sync initialization in demo mode
      if (isInDemoMode()) {
        logInfo('Demo mode: skipping sync initialization');
        return;
      }

      if (user && allowed === true) {
        logInfo('Initializing sync system...');
        try {
          await initializeSync();
          await setupLocalChangeSync();
          logInfo('Sync system initialized');
        } catch (error) {
          logError('Failed to initialize sync:', {error});
        }
      } else if (!user || allowed === false) {
        logInfo('Stopping sync...');
        stopSync();
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      if (!isInDemoMode()) {
        stopSync();
      }
    };
  }, [user, allowed]);

  useEffect(() => {
    const unsubscribeFirebase = onUserStateChanged(async (firebaseUser) => {
      // Skip Firebase auth if in demo mode
      if (isInDemoMode()) {
        logInfo('In demo mode, skipping Firebase auth');
        return;
      }

      logInfo('Firebase auth state changed:', firebaseUser ? 'logged in' : 'logged out');
      setUser(firebaseUser);
      setAuthChecked(true);

      if (firebaseUser) {
        setAllowed(null); // show loader while checking
        const isAllowed = await isUserAllowed(firebaseUser);
        setAllowed(isAllowed);
      } else {
        setAllowed(false);
      }
    });

    // Set up demo mode listener
    const unsubscribeDemo = onDemoAuthStateChanged(async (demoUser) => {
      logInfo('Demo auth state changed:', demoUser ? 'demo user active' : 'demo user inactive');
      
      if (demoUser) {
        try {
          // Load demo data when entering demo mode
          logInfo('Loading demo data...');
          await initializeDemoData();
          logInfo('Demo data loaded successfully');
        } catch (error) {
          logError('Failed to load demo data:', {error});
        }
      }

      setUser(demoUser);
      setAuthChecked(true);
      setAllowed(demoUser !== null);
    });

    return () => {
      unsubscribeFirebase();
      unsubscribeDemo();
    };
  }, []);

  const menuItems: MenuItem[] = [
    { text: "Dashboard", path: "/dashboard", icon: <BsSpeedometer /> },
    { text: "Income", path: "/income", icon: <GiReceiveMoney /> },
    { text: "Monthly Cash Flow", path: "/cash-flow", icon: <TiFlowMerge /> },
    { text: "Assets", path: "/assets-holdings", icon: <GiCash /> },
    {
      text: "Liabilities",
      path: "/liabilities",
      icon: <GiPayMoney />,
    },
    { text: "Goals", path: "/goals", icon: <GoGoal /> },
    { text: "SWP", path: "/swp", icon: <PiHandWithdraw /> },
    {
      text: "About",
      path: "/about",
      icon: <MdQuestionMark />,
    },
    {
      text: "Configuration",
      icon: <BsGear />,
      items: [
        { text: "Family Members", path: "/holders", icon: <BsPeople /> },
        { text: "Accounts", path: "/accounts", icon: <BsBank /> },
        {
          text: "Asset Types",
          path: "/asset-classes",
          icon: <BsLayersHalf />,
        },
        {
          text: "Asset Sub Types",
          path: "/asset-sub-classes",
          icon: <BsLayers />,
        },
        { text: "Asset Purpose", path: "/asset-purpose", icon: <BsFlag /> },
        { text: "Asset Buckets", path: "/buckets", icon: <BsBucket /> },
        { text: "SIP Types", path: "/sip-types", icon: <BsGraphUp /> },
        {
          text: "Loan Types",
          path: "/loan-types",
          icon: <BsFileEarmarkText />,
        },
        {
          text: "Other Configs",
          path: "/configs",
          icon: <BsPersonGear />,
        },
      ],
    },
    {
      text: "Tools",
      icon: <BsCreditCard2Back />,
      items: [
        {
          text: "Query Builder",
          path: "/query-builder",
          icon: <BsFiletypeSql />,
        },
        {
          text: "Data Import/Export",
          path: "/import-export",
          icon: <BsDatabaseDown />,
        },
        {
          text: "DB Logs",
          path: "/debug",
          icon: <VscDebugLineByLine />,
        },
      ],
    }
  ];

  const renderMenu = (onLinkClick?: () => void) => (
    <div className="d-flex flex-column gap-3">
      <Nav className="flex-column">
        {menuItems.map((menu: MenuItem, idx: number) =>
          menu.items ? (
            <Accordion flush key={menu.text} className="mb-2">
              <Accordion.Item eventKey={String(idx)}>
                <Accordion.Header className="bg-light text-dark fw-medium">
                  <span className="me-2">{menu.icon}</span>
                  {menu.text}
                </Accordion.Header>
                <Accordion.Body className="bg-light text-dark">
                  {menu.items.map((item: MenuItem) => (
                    <Nav.Item key={item.path}>
                      <Link
                        to={item.path!}
                        className="nav-link d-flex align-items-center gap-2 px-0 text-dark"
                        onClick={onLinkClick}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        {item.text}
                      </Link>
                    </Nav.Item>
                  ))}
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          ) : (
            <Nav.Item key={menu.path}>
              <Link
                to={menu.path!}
                className="nav-link d-flex align-items-center gap-2 py-2 text-dark"
                onClick={onLinkClick}
              >
                <span className="nav-icon">{menu.icon}</span>
                {menu.text}
              </Link>
            </Nav.Item>
          )
        )}
      </Nav>
      <div className="d-flex justify-content-center gap-2">
        <Button
          variant="outline-dark"
          size="sm"
          href="https://github.com/swapnil-bhamat"
          target="_blank"
          title="GitHub Profile"
        >
          <BsGithub />
        </Button>
        <Button
          variant="outline-primary"
          size="sm"
          href="https://www.linkedin.com/in/swapnil-bhamat"
          target="_blank"
          title="LinkedIn Profile"
        >
          <BsLinkedin />
        </Button>
        <Button
          variant="outline-danger"
          size="sm"
          href="mailto:swapnil.p.bhamat@gmail.com"
          title="Send Email"
        >
          <MdEmail />
        </Button>
      </div>
    </div>
  );

  // Show loader while checking auth/allowed
  if (!authChecked || allowed === null) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 vw-100">
        <h2 className="p-3 text-center text-secondary">
          <Spinner animation="border" role="status">
            <span className="visually-hidden"> Loading...</span>
          </Spinner>
          <span> Loading...</span>
        </h2>
      </div>
    );
  }
  // Show login if not authenticated or not allowed
  if (!user || !allowed) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout">
      {/* Sidebar for desktop */}
      <div className="sidebar d-none d-md-block bg-light">
        <div className="py-3 px-3">
          {user && (
            <div className="d-flex align-items-center justify-content-between border-bottom pb-3">
              <div className="d-flex align-items-center gap-2">
                <Image
                  src={user.photoURL!}
                  roundedCircle
                  width={32}
                  height={32}
                  alt={user.displayName!}
                />
                <span className="fw-medium">{user.displayName}</span>
              </div>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => {
                  if (isInDemoMode()) {
                    logInfo('Exiting demo mode...');
                    exitDemoMode();
                  } else {
                    signOutUser();
                  }
                }}
                title={isInDemoMode() ? "Exit Demo" : "Sign out"}
              >
                <BsBoxArrowRight />
              </Button>
            </div>
          )}
          {renderMenu()}
        </div>
      </div>

      {/* Offcanvas sidebar for mobile */}
      <Offcanvas
        show={showSidebar}
        onHide={handleClose}
        placement="start"
        className="bg-light text-dark"
      >
        <Offcanvas.Header closeVariant="dark" className="border-bottom">
          {user && (
            <div className="d-flex align-items-center justify-content-between w-100">
              <div
                className="d-flex align-items-center gap-2"
                onClick={handleClose}
              >
                <Image
                  src={user.photoURL!}
                  roundedCircle
                  width={32}
                  height={32}
                  alt={user.displayName!}
                />
                <span className="fw-medium">{user.displayName}</span>
              </div>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => {
                  if (isInDemoMode()) {
                    logInfo('Exiting demo mode...');
                    exitDemoMode();
                  } else {
                    signOutUser();
                  }
                }}
                title={isInDemoMode() ? "Exit Demo" : "Sign out"}
              >
                <BsBoxArrowRight />
              </Button>
            </div>
          )}
        </Offcanvas.Header>
        <Offcanvas.Body>{renderMenu(handleClose)}</Offcanvas.Body>
      </Offcanvas>

      <div className="main-content">
        {/* Page Header logic: get current route, find menu item, render icon and title */}
        {(() => {
          const path = location.pathname;
          const allItems = menuItems.flatMap((menu) =>
            menu.items ? menu.items : [menu]
          );
          const current = allItems.find((item) => item.path === path);
          if (current) {
            return (
              <div className="d-flex align-items-center gap-3 justify-content-md-start">
                <div className="d-md-none d-flex align-items-start">
                  <Button onClick={handleShow}>
                    <BsList />
                  </Button>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="fs-2 text-primary d-none d-md-block">
                    {current.icon}
                  </span>
                  <h3 className="mb-0 fw-bold text-center text-md-start">
                    {current.text}
                  </h3>
                </div>
              </div>
            );
          }
          return null;
        })()}
        <Outlet />
      </div>
    </div>
  );
}

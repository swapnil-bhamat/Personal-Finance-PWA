import React, { useState, useEffect } from "react";
import {
  signOutUser,
  initializeFirebase,
  isFirebaseConfigured,
  signIn,
} from "../services/firebase";
import {
  isInDemoMode,
  initDemoMode,
  getCurrentAuthMode,
  exitDemoMode,
} from "../services/demoAuth";
import { BsGoogle } from "react-icons/bs";

import { useLocation, Navigate } from "react-router-dom";
import { Accordion, Card, Container } from "react-bootstrap";
import "./Layout.scss";
import { Link, Outlet } from "react-router-dom";
import { Nav, Offcanvas, Button, Image, Alert } from "react-bootstrap";
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
import { logInfo } from "../services/logger";
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
  const [authState, setAuthState] = useState<
    "initializing" | "authenticated" | "unauthenticated"
  >("unauthenticated");

  useEffect(() => {
    // Initialize Firebase if configured
    if (isFirebaseConfigured()) {
      initializeFirebase();
      if (getCurrentAuthMode() === "firebase") {
        setAuthState("authenticated");
        logInfo("Firebase mode initiated from localStorage");
      }
    }

    if (isInDemoMode()) {
      initDemoMode((user) => setUser(user));
      setAuthState("authenticated");
      logInfo("Demo mode initiated from login page");
    }
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
    },
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
          href="https://github.com/swapnil-bhamat/Personal-Finance-PWA"
          target="_blank"
          title="GitHub"
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

  // Handle authentication states
  useEffect(() => {
    logInfo("Auth state changed", {
      state: authState,
      userEmail: user?.email || "none",
      isDemo: isInDemoMode(),
    });
  }, [authState, user]);

  if (authState === "initializing") {
    return null; // Remove loading indicator to prevent flash
  }

  // Redirect to dashboard if authenticated
  if (authState === "authenticated" && user && location.pathname === "/") {
    return <Navigate to="/dashboard" replace />;
  }

  // Show login page if not authenticated
  if (authState === "unauthenticated" || !user) {
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Card
          className="p-4 shadow-lg text-center"
          style={{ maxWidth: "400px", width: "100%" }}
        >
          <Card.Body>
            <h4 className="mb-3">Personal Finance App</h4>
            <div className="d-flex flex-column gap-3">
              <Button
                variant="outline-primary"
                onClick={() => signIn()}
                className="d-flex align-items-center justify-content-center gap-2 w-100"
                disabled={!isFirebaseConfigured()}
              >
                <BsGoogle /> Sign in with Google
                {!isFirebaseConfigured() && " (Not Configured)"}
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => {
                  initDemoMode((user) => setUser(user));
                  setAuthState("authenticated");
                  logInfo("Demo mode initiated from login page");
                }}
                className="d-flex align-items-center justify-content-center gap-2 w-100"
              >
                Try Demo Mode
              </Button>
            </div>
            {!isFirebaseConfigured() && (
              <Alert variant="info" className="mt-3">
                Firebase is not configured. You can use Demo Mode to try the
                application.
              </Alert>
            )}
          </Card.Body>
        </Card>
      </Container>
    );
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
                  setAuthState("unauthenticated");
                  setUser(null);
                  if (isInDemoMode()) {
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
                  setAuthState("unauthenticated");
                  setUser(null);
                  if (isInDemoMode()) {
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

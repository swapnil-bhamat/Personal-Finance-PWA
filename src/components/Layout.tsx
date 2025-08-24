import React, { useState, useEffect } from "react";
import { onUserStateChanged, isUserAllowed } from "../services/firebase";
import {
  initializeSync,
  stopSync,
  setupLocalChangeSync,
  syncToServer,
} from "../services/sync";
import LoginPage from "../pages/LoginPage";
import { useLocation } from "react-router-dom";
import { Accordion } from "react-bootstrap";
import "./Layout.scss";
import { Link, Outlet } from "react-router-dom";
import { Nav, Offcanvas, Button } from "react-bootstrap";
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
} from "react-icons/bs";
import { PiHandWithdraw } from "react-icons/pi";
import { GiReceiveMoney, GiPayMoney, GiCash } from "react-icons/gi";
import { GoGoal } from "react-icons/go";
import { TiFlowMerge } from "react-icons/ti";

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
    if (user && allowed === true) {
      // Initialize sync and local change tracking
      initializeSync().then(() => {
        setupLocalChangeSync();
      });
    } else if (!user || allowed === false) {
      // Stop sync when user logs out or is not allowed
      stopSync();
    }
    // Cleanup on unmount
    return () => {
      stopSync();
    };
  }, [user, allowed]);

  useEffect(() => {
    const unsubscribe = onUserStateChanged(async (firebaseUser) => {
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
    return () => unsubscribe();
  }, []);

  const menuItems: MenuItem[] = [
    { text: "Dashboard", path: "/dashboard", icon: <BsSpeedometer /> },
    { text: "Income", path: "/income", icon: <GiReceiveMoney /> },
    { text: "Cash Flow", path: "/cash-flow", icon: <TiFlowMerge /> },
    { text: "Assets", path: "/assets-holdings", icon: <GiCash /> },
    {
      text: "Liabilities",
      path: "/liabilities",
      icon: <GiPayMoney />,
    },
    { text: "Goals", path: "/goals", icon: <GoGoal /> },
    { text: "SWP", path: "/swp", icon: <PiHandWithdraw /> },
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
      <Button
        variant="outline-success"
        size="sm"
        onClick={syncToServer}
        title="Sync to Cloud"
      >
        <BsArrowRepeat /> Sync
      </Button>
    </div>
  );

  // Show loader while checking auth/allowed
  if (!authChecked || allowed === null) {
    return (
      <div style={{ textAlign: "center", marginTop: "20vh" }}>
        <h2>Loading...</h2>
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
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5>Personal Finance</h5>
          </div>
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
        <Offcanvas.Header closeButton closeVariant="dark">
          <Offcanvas.Title>Personal Finance</Offcanvas.Title>
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

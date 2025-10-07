import React, { useState, useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { Accordion, Form, Modal, Spinner } from "react-bootstrap";
import "./Layout.scss";
import { Link, Outlet } from "react-router-dom";
import { Nav, Offcanvas, Button, Image } from "react-bootstrap";
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
  BsGoogle,
} from "react-icons/bs";
import { PiHandWithdraw } from "react-icons/pi";
import { GiReceiveMoney, GiPayMoney, GiCash } from "react-icons/gi";
import { GoGoal } from "react-icons/go";
import { TiFlowMerge } from "react-icons/ti";
import { VscDebugLineByLine } from "react-icons/vsc";
import { logInfo } from "../services/logger";
import { MdQuestionMark, MdEmail } from "react-icons/md";
import { BsGithub, BsLinkedin } from "react-icons/bs";
import { useAuth } from "../services/useAuth";
import { FaBrain, FaMoon, FaRegThumbsUp, FaSun } from "react-icons/fa";
import DriveSyncButton from "./DriveSyncButton";
import NLModal from "./NLModal";

type MenuItem = {
  text: string;
  path?: string;
  icon: React.ReactElement;
  items?: MenuItem[];
};

export default function Layout() {
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMLModal, setShowMLModal] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const handleClose = () => setShowSidebar(false);
  const handleShow = () => setShowSidebar(true);

  const { user, authState, handleSignIn, handleSignOut } = useAuth();

  // Load saved theme
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    console.log("Saved theme:", saved);
    if (saved) setTheme(saved);
  }, []);

  // Apply theme to <body> and save
  useEffect(() => {
    if (theme) {
      document.body.setAttribute("data-bs-theme", theme);
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

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
      text: "Asset Allocation Projection (WIP)",
      path: "/asset-allocation-projection",
      icon: <BsGraphUp />,
    },
    { text: "Thumb Rules", path: "/finance-rules", icon: <FaRegThumbsUp /> },
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
                <Accordion.Header className="bg-body text-body fw-medium">
                  <span className="me-2">{menu.icon}</span>
                  {menu.text}
                </Accordion.Header>
                <Accordion.Body className="bg-body text-body">
                  {menu.items.map((item: MenuItem) => (
                    <Nav.Item key={item.path}>
                      <Link
                        to={item.path!}
                        className="nav-link d-flex align-items-center gap-2 px-0 text-body"
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
                className="nav-link d-flex align-items-center gap-2 py-2 text-body"
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
          variant="outline-primary"
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
          variant="outline-primary"
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
    });
  }, [authState, user]);

  // Redirect to dashboard if authenticated
  if (authState === "signedIn" && user && location.pathname === "/") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="app-layout">
      {/* Sidebar for desktop */}
      <div className="sidebar d-none d-md-block bg-body">
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
                onClick={handleSignOut}
                title="Sign out"
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
        className="bg-body text-body"
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
                onClick={handleSignOut}
                title="Sign out"
              >
                <BsBoxArrowRight />
              </Button>
            </div>
          )}
        </Offcanvas.Header>
        <Offcanvas.Body>{renderMenu(handleClose)}</Offcanvas.Body>
      </Offcanvas>

      <div className="main-content">
        {(() => {
          const path = location.pathname;
          const allItems = menuItems.flatMap((menu) =>
            menu.items ? menu.items : [menu]
          );
          const current = allItems.find((item) => item.path === path);
          if (current) {
            return (
              <div className="d-flex align-items-center justify-content-between mb-3">
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
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <Button
                    onClick={() => setShowMLModal(true)}
                    title="Ask via AI"
                    variant="outline-primary"
                  >
                    <FaBrain />
                  </Button>
                  <DriveSyncButton />
                  <Button
                    variant={
                      theme === "light" ? "outline-dark" : "outline-light"
                    }
                    title="Toggle Theme"
                    onClick={toggleTheme}
                  >
                    {theme === "light" ? <FaMoon /> : <FaSun />}
                  </Button>
                </div>
              </div>
            );
          }
          return null;
        })()}
        <Outlet />
      </div>
      {authState === "checking" && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-body bg-opacity-50" // just zIndex since Bootstrap doesn't provide a utility for this
          style={{ zIndex: 1050 }}
        >
          <Spinner
            animation="border"
            variant="light"
            role="status"
            className="spinner-border-lg"
          >
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}
      <Modal
        show={authState === "signedOut" || !user}
        backdrop="static"
        centered
        keyboard={false}
      >
        <Form>
          <Modal.Header className="border-0">
            <Modal.Title className="fw-bold text-center w-100">
              🔒 Authentication Required
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="text-center">
            <p className="mb-3">
              To continue using your <strong>Personal Finance App</strong>,
              please sign in securely with your Google account.
            </p>
            <p className="text-body-secondary small mb-4">
              We’ll only request the minimum access needed to store and sync
              your data safely in Google Drive. Your information remains private
              and secure in your drive only.
            </p>

            <Button
              variant="outline-primary"
              size="lg"
              onClick={(e) => {
                e.preventDefault();
                handleSignIn();
              }}
              className="d-flex align-items-center justify-content-center gap-2 w-100 fw-semibold py-2"
            >
              <BsGoogle size={20} /> Sign in with Google Drive
            </Button>
          </Modal.Body>
        </Form>
      </Modal>
      <NLModal show={showMLModal} setShow={setShowMLModal} />
    </div>
  );
}

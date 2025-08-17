import React, { useState } from 'react';
import { Accordion } from 'react-bootstrap';
import './Layout.scss';
import { Link, Outlet } from 'react-router-dom';
import { Nav, Offcanvas, Button } from 'react-bootstrap';
import {
  BsBarChartFill,
  BsPeople,
  BsCurrencyRupee,
  BsCashStack,
  BsCalculator,
  BsBullseye,
  BsBucket,
  BsLayers,
  BsPieChart,
  BsFlag,
  BsGraphUp,
  BsCreditCard2Back,
  BsFileEarmarkText,
  BsTable,
  BsDownload,
  BsArrowRepeat,
  BsGear
} from 'react-icons/bs';

type MenuItem = {
  text: string;
  path?: string;
  icon: React.ReactElement;
  items?: MenuItem[];
};

export default function Layout() {

  const [showSidebar, setShowSidebar] = useState(false);
  const handleClose = () => setShowSidebar(false);
  const handleShow = () => setShowSidebar(true);

  const menuItems: MenuItem[] = [
    { text: 'Dashboard', path: '/dashboard', icon: <BsBarChartFill /> },
    { text: 'Family Members', path: '/holders', icon: <BsPeople /> },
    { text: 'Income', path: '/income', icon: <BsCurrencyRupee /> },
    { text: 'Cash Flow', path: '/cash-flow', icon: <BsCashStack /> },
    {
      text: 'Goals',
      icon: <BsBullseye />,
      items: [
        { text: 'SWP Calculator', path: '/swp', icon: <BsCalculator /> },
        { text: 'Goals', path: '/goals', icon: <BsBullseye /> },
        { text: 'SWP Buckets', path: '/buckets', icon: <BsBucket /> },
      ],
    },
    {
      text: 'Assets',
      icon: <BsLayers />,
      items: [
        { text: 'Types', path: '/asset-classes', icon: <BsLayers /> },
        { text: 'Allocation', path: '/assets-holdings', icon: <BsPieChart /> },
        { text: 'Asset Purpose', path: '/asset-purpose', icon: <BsFlag /> },
        { text: 'SIP Types', path: '/sip-types', icon: <BsGraphUp /> },
      ],
    },
    {
      text: 'Liabilities',
      icon: <BsCreditCard2Back />,
      items: [
        { text: 'Liabilities', path: '/liabilities', icon: <BsCreditCard2Back /> },
        { text: 'Loan Types', path: '/loan-types', icon: <BsFileEarmarkText /> },
      ],
    },
    {
      text: 'Tools',
      icon: <BsGear />,
      items: [
        { text: 'Query Builder', path: '/query-builder', icon: <BsTable /> },
        { text: 'Import/Export', path: '/import-export', icon: <BsDownload /> },
        { text: 'Reset', path: '/reset', icon: <BsArrowRepeat /> },
      ],
    },
    {
      text: 'Configuration',
      path: '/configs',
      icon: <BsGear />,
    },
  ];

  const renderMenu = (onLinkClick?: () => void) => (
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
                      className="nav-link d-flex align-items-center gap-2 py-2 ms-3 text-dark"
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
  );

  return (
    <div className="app-layout">
      {/* Sidebar for desktop */}
      <div className="sidebar d-none d-md-block bg-light">
        <div className="py-3 px-3">
          <h5 className="mb-4">Personal Finance</h5>
          {renderMenu()}
        </div>
      </div>

      {/* Mobile menu button */}
      <Button
        variant="light"
        className="d-md-none menu-mobile-btn"
        onClick={handleShow}
      >
        &#9776;
      </Button>

      {/* Offcanvas sidebar for mobile */}
      <Offcanvas show={showSidebar} onHide={handleClose} placement="start" className="bg-light text-dark">
        <Offcanvas.Header closeButton closeVariant="dark">
          <Offcanvas.Title>Personal Finance</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {renderMenu(handleClose)}
        </Offcanvas.Body>
      </Offcanvas>

      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}

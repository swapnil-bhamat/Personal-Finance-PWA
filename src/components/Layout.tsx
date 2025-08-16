import { Link, Outlet } from 'react-router-dom';
import { Nav } from 'react-bootstrap';
import { BsDownload, BsPeople, BsBank, BsBarChartFill } from 'react-icons/bs';

export default function Layout() {

  const menuItems = [
    { text: 'SWP', icon: <BsDownload />, path: '/swp' },
    { text: 'Holders', icon: <BsPeople />, path: '/holders' },
    { text: 'Accounts', icon: <BsBank />, path: '/accounts' },
    { text: 'Asset Classes', icon: <BsBarChartFill />, path: '/asset-classes' }
  ];

  return (
    <div className="app-layout d-flex">
      <div className="sidebar bg-dark text-white" style={{ width: '250px', minHeight: '100vh', position: 'fixed' }}>
        <div className="py-3 px-3">
          <h5 className="mb-4">Personal Finance</h5>
          <Nav className="flex-column">
            {menuItems.map((item) => (
              <Nav.Item key={item.path}>
                <Link 
                  to={item.path} 
                  className="nav-link text-white d-flex align-items-center gap-2 py-2"
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.text}
                </Link>
              </Nav.Item>
            ))}
          </Nav>
        </div>
      </div>
      <div className="main-content" style={{ marginLeft: '250px', padding: '20px', width: 'calc(100% - 250px)' }}>
        <Outlet />
      </div>
    </div>
  );
}

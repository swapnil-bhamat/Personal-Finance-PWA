// Bootstrap Icons
import {
  BsFillHouseFill,
  BsPersonFill,
  BsGearFill,
  BsBellFill,
  BsExclamationTriangleFill
} from 'react-icons/bs';

// Material Design Icons
import {
  MdDashboard,
  MdAccountCircle,
  MdSettings,
  MdNotifications,
  MdWarning
} from 'react-icons/md';

// Font Awesome Icons
import {
  FaHome,
  FaUser,
  FaCog,
  FaBell,
  FaExclamationTriangle
} from 'react-icons/fa';

// Remix Icons (Modern, clean look)
import {
  RiHome5Fill as House,
  RiUserFill as User,
  RiSettings4Fill as Gear,
  RiBellFill as Bell,
  RiErrorWarningFill as Warning
} from 'react-icons/ri';

// Example usage with different sizes and colors
const IconExamples = () => {
  return (
    <div className="icon-examples">
      <h3>Icon Types and Styles</h3>
      
      <section>
        <h4>Bootstrap Icons (bs)</h4>
        <div className="icon-row">
          <div className="icon-item">
            <BsFillHouseFill className="icon" />
            <span>Home</span>
          </div>
          <div className="icon-item">
            <BsPersonFill className="icon" color="#007bff" />
            <span>User (Blue)</span>
          </div>
          <div className="icon-item">
            <BsGearFill className="icon" size={24} />
            <span>Settings (24px)</span>
          </div>
          <div className="icon-item">
            <BsBellFill className="icon" style={{ opacity: 0.5 }} />
            <span>Bell (50% opacity)</span>
          </div>
          <div className="icon-item">
            <BsExclamationTriangleFill className="icon" color="#dc3545" />
            <span>Warning (Red)</span>
          </div>
        </div>
      </section>

      <section>
        <h4>Material Design Icons (md)</h4>
        <div className="icon-row">
          <div className="icon-item">
            <MdDashboard className="icon" />
            <span>Dashboard</span>
          </div>
          <div className="icon-item">
            <MdAccountCircle className="icon" color="#28a745" />
            <span>Account (Green)</span>
          </div>
          <div className="icon-item">
            <MdSettings className="icon" size={28} />
            <span>Settings (28px)</span>
          </div>
          <div className="icon-item">
            <MdNotifications className="icon" style={{ opacity: 0.7 }} />
            <span>Notifications (70% opacity)</span>
          </div>
          <div className="icon-item">
            <MdWarning className="icon" color="#ffc107" />
            <span>Warning (Yellow)</span>
          </div>
        </div>
      </section>

      <section>
        <h4>Font Awesome Icons (fa)</h4>
        <div className="icon-row">
          <div className="icon-item">
            <FaHome className="icon" />
            <span>Home</span>
          </div>
          <div className="icon-item">
            <FaUser className="icon" color="#6f42c1" />
            <span>User (Purple)</span>
          </div>
          <div className="icon-item">
            <FaCog className="icon" size={20} className="spinning" />
            <span>Settings (Animated)</span>
          </div>
          <div className="icon-item">
            <FaBell className="icon" style={{ filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.2))' }} />
            <span>Bell (With Shadow)</span>
          </div>
          <div className="icon-item">
            <FaExclamationTriangle className="icon" color="#fd7e14" />
            <span>Warning (Orange)</span>
          </div>
        </div>
      </section>

      <section>
        <h4>Phosphor Icons (ph)</h4>
        <div className="icon-row">
          <div className="icon-item">
            <House className="icon" />
            <span>Home</span>
          </div>
          <div className="icon-item">
            <User className="icon" color="#0dcaf0" />
            <span>User (Blue)</span>
          </div>
          <div className="icon-item">
            <Gear className="icon" size={24} />
            <span>Settings (24px)</span>
          </div>
          <div className="icon-item">
            <Bell className="icon" style={{ opacity: 0.7 }} />
            <span>Bell (70% opacity)</span>
          </div>
          <div className="icon-item">
            <Warning className="icon" color="#d63384" />
            <span>Warning (Regular)</span>
          </div>
        </div>
      </section>

      <section>
        <h4>Icon Button Examples</h4>
        <div className="icon-row">
          <button className="btn btn-primary">
            <BsFillHouseFill className="me-2" /> Home
          </button>
          <button className="btn btn-success">
            <MdAccountCircle className="me-2" /> Profile
          </button>
          <button className="btn btn-warning">
            <FaBell className="me-2" /> Notifications
          </button>
          <button className="btn btn-danger">
            <Warning className="me-2" /> Alert
          </button>
        </div>
      </section>
    </div>
  );
};

export default IconExamples;

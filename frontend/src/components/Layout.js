import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">📋</span>
          <span className="brand-name">AttendTrack</span>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>

        <ul className="sidebar-nav">
          <li><NavLink to="/dashboard"  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>🏠 Dashboard</NavLink></li>
          <li><NavLink to="/attendance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>🗓️ Attendance</NavLink></li>
          <li><NavLink to="/tasks"      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>📋 Tasks</NavLink></li>
        </ul>

        <div className="sidebar-footer">
          <button className="btn btn-outline btn-full logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </nav>

      <main className="main-content">{children}</main>
    </div>
  );
}

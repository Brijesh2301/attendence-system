import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

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

          {/* ── Employee Menu ── */}
          <li style={{ fontSize: '11px', color: '#818cf8', padding: '8px 12px 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            My Menu
          </li>
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              🏠 Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/attendance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              🗓️ My Attendance
            </NavLink>
          </li>
          <li>
            <NavLink to="/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              📋 My Tasks
            </NavLink>
          </li>

          {/* ── Admin / Manager Menu ── */}
          {isAdminOrManager && (
            <>
              <li style={{
                fontSize: '11px', color: '#818cf8',
                padding: '16px 12px 4px',
                textTransform: 'uppercase', letterSpacing: '1px',
                borderTop: '1px solid #312e81', marginTop: '12px'
              }}>
                Admin Panel
              </li>
              <li>
                <NavLink to="/admin/attendance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  👥 All Attendance
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  📊 All Tasks
                </NavLink>
              </li>
            </>
          )}

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
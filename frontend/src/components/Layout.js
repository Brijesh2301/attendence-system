import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const styles = `
  /* ── Reset & Base ── */
  *, *::before, *::after { box-sizing: border-box; }

  .app-layout {
    display: flex;
    min-height: 100vh;
    background: #f1f5f9;
  }

  /* ══════════════════════════════
     SIDEBAR
  ══════════════════════════════ */
  .sidebar {
    width: 240px;
    min-width: 240px;
    background: #1e1b4b;
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: sticky;
    top: 0;
    overflow-y: auto;
    transition: transform 0.3s ease;
    z-index: 200;
  }

  /* ── Brand ── */
  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 16px 16px;
    border-bottom: 1px solid #312e81;
  }
  .brand-icon { font-size: 1.4rem; }
  .brand-name { font-size: 1.1rem; font-weight: 700; color: #fff; letter-spacing: 0.3px; }

  /* ── User ── */
  .sidebar-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid #312e81;
  }
  .user-avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: #4f46e5;
    color: #fff;
    font-weight: 700;
    font-size: 0.95rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .user-name { color: #e0e7ff; font-size: 0.875rem; font-weight: 600; line-height: 1.2; }
  .user-role { color: #818cf8; font-size: 0.72rem; text-transform: capitalize; margin-top: 2px; }

  /* ── Nav ── */
  .sidebar-nav { list-style: none; margin: 0; padding: 10px 0; flex: 1; }
  .sidebar-nav li { margin: 0; }

  .nav-section-label {
    font-size: 11px;
    color: #818cf8;
    padding: 8px 16px 4px;
    text-transform: uppercase;
    letter-spacing: 1px;
    display: block;
  }
  .nav-section-label.with-divider {
    border-top: 1px solid #312e81;
    margin-top: 12px;
    padding-top: 16px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    color: #c7d2fe;
    text-decoration: none;
    font-size: 0.875rem;
    border-radius: 0;
    transition: background 0.15s, color 0.15s;
    border-left: 3px solid transparent;
  }
  .nav-item:hover  { background: #312e81; color: #fff; }
  .nav-item.active { background: #3730a3; color: #fff; border-left-color: #818cf8; font-weight: 600; }

  /* ── Footer ── */
  .sidebar-footer { padding: 14px 16px; border-top: 1px solid #312e81; }
  .logout-btn {
    width: 100%;
    padding: 9px 12px;
    background: transparent;
    border: 1px solid #4338ca;
    border-radius: 7px;
    color: #c7d2fe;
    font-size: 0.85rem;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    transition: background 0.15s, color 0.15s;
  }
  .logout-btn:hover { background: #312e81; color: #fff; }

  /* ══════════════════════════════
     MAIN CONTENT
  ══════════════════════════════ */
  .main-content {
    flex: 1;
    overflow-y: auto;
    min-width: 0;
  }

  /* ══════════════════════════════
     MOBILE TOPBAR (hidden on desktop)
  ══════════════════════════════ */
  .mobile-topbar {
    display: none;
    align-items: center;
    justify-content: space-between;
    background: #1e1b4b;
    padding: 12px 16px;
    position: sticky;
    top: 0;
    z-index: 300;
  }
  .mobile-brand {
    display: flex; align-items: center; gap: 8px;
    color: #fff; font-weight: 700; font-size: 1rem;
  }
  .hamburger {
    background: none; border: none; cursor: pointer;
    display: flex; flex-direction: column; gap: 5px; padding: 4px;
  }
  .hamburger span {
    display: block; width: 22px; height: 2px;
    background: #c7d2fe; border-radius: 2px;
    transition: all 0.3s ease;
  }
  .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
  .hamburger.open span:nth-child(2) { opacity: 0; }
  .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

  /* ── Overlay ── */
  .sidebar-overlay {
    display: none;
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 150;
  }

  /* ══════════════════════════════
     RESPONSIVE
  ══════════════════════════════ */
  @media (max-width: 768px) {
    .mobile-topbar { display: flex; }

    .sidebar {
      position: fixed;
      top: 0; left: 0;
      height: 100vh;
      transform: translateX(-100%);
      box-shadow: 4px 0 24px rgba(0,0,0,0.3);
    }
    .sidebar.open { transform: translateX(0); }

    .sidebar-overlay.open { display: block; }

    .main-content { padding-top: 0; }

    .app-layout { flex-direction: column; }
  }
`;

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const navItem = (to, label) => (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      {label}
    </NavLink>
  );

  const SidebarContent = () => (
    <>
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
        <li><span className="nav-section-label">My Menu</span></li>
        <li>{navItem('/dashboard',  '🏠 Dashboard')}</li>
        <li>{navItem('/attendance', '🗓️ My Attendance')}</li>
        <li>{navItem('/tasks',      '📋 My Tasks')}</li>

        {isAdminOrManager && (
          <>
            <li><span className="nav-section-label with-divider">Admin Panel</span></li>
            <li>{navItem('/admin/attendance', '👥 All Attendance')}</li>
            <li>{navItem('/admin/tasks',      '📊 All Tasks')}</li>
          </>
        )}
      </ul>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      <style>{styles}</style>

      <div className="app-layout">
        {/* ── Mobile Top Bar ── */}
        <div className="mobile-topbar">
          <div className="mobile-brand">
            <span>📋</span> AttendTrack
          </div>
          <button
            className={`hamburger ${sidebarOpen ? 'open' : ''}`}
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>

        {/* ── Overlay ── */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* ── Sidebar ── */}
        <nav ref={sidebarRef} className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <SidebarContent />
        </nav>

        {/* ── Page Content ── */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </>
  );
}
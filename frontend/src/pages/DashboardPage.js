import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, tasksAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PRIORITY_COLOR = { low: '#6b7280', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };
const STATUS_COLOR   = { todo: '#6b7280', in_progress: '#3b82f6', completed: '#10b981', cancelled: '#ef4444' };

export default function DashboardPage() {
  const { user }  = useAuth();
  const [todayAtt, setTodayAtt]   = useState(null);
  const [stats, setStats]         = useState(null);
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [attLoading, setAttLoading] = useState(false);

  const load = async () => {
    try {
      const [a, s, t] = await Promise.all([
        attendanceAPI.getToday(),
        attendanceAPI.getStats(),
        tasksAPI.getAll({ limit: 5, status: 'in_progress' }),
      ]);
      setTodayAtt(a.data.data);
      setStats(s.data.data.stats);
      setTasks(t.data.data.tasks);
    } catch { toast.error('Failed to load dashboard'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCheckIn = async () => {
    setAttLoading(true);
    try { await attendanceAPI.checkIn(); toast.success('✅ Checked in!'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Check-in failed'); }
    finally   { setAttLoading(false); }
  };

  const handleCheckOut = async () => {
    setAttLoading(true);
    try { await attendanceAPI.checkOut(); toast.success('👋 Checked out!'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Check-out failed'); }
    finally   { setAttLoading(false); }
  };

  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; };

  if (loading) return <div className="loading-screen"><div className="spinner-lg" /><p>Loading...</p></div>;

  const isIn  = todayAtt?.isCheckedIn;
  const isOut = todayAtt?.isCheckedOut;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Good {greeting()}, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="text-muted">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <span className="badge badge-role">{user?.role}</span>
      </div>

      {/* Attendance Card */}
      <div className="card attendance-card">
        <div className="card-header">
          <h2>🕐 Today's Attendance</h2>
          {isIn && !isOut && <span className="badge badge-success">● Active</span>}
          {isOut && <span className="badge badge-grey">Completed</span>}
        </div>

        {isIn ? (
          <div className="attendance-info">
            <div className="time-info">
              <div>
                <span className="label">Check-in</span>
                <span className="time-value">{format(new Date(todayAtt.attendance.checkIn), 'hh:mm a')}</span>
              </div>
              {isOut && (
                <div>
                  <span className="label">Check-out</span>
                  <span className="time-value">{format(new Date(todayAtt.attendance.checkOut), 'hh:mm a')}</span>
                </div>
              )}
            </div>
            {!isOut && (
              <button className="btn btn-danger" onClick={handleCheckOut} disabled={attLoading}>
                {attLoading ? <><span className="spinner" /> Checking out...</> : '🚪 Check Out'}
              </button>
            )}
          </div>
        ) : (
          <div className="attendance-cta">
            <p className="text-muted">You haven't checked in yet today.</p>
            <button className="btn btn-primary btn-large" onClick={handleCheckIn} disabled={attLoading}>
              {attLoading ? <><span className="spinner" /> Checking in...</> : '✅ Mark Attendance'}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          {[
            { label: 'Present',  value: stats.present_days || 0, color: '#10b981' },
            { label: 'Half Day', value: stats.half_days    || 0, color: '#f59e0b' },
            { label: 'Leave',    value: stats.leave_days   || 0, color: '#3b82f6' },
            { label: 'Absent',   value: stats.absent_days  || 0, color: '#ef4444' },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Tasks */}
      <div className="card">
        <div className="card-header">
          <h2>📋 Active Tasks</h2>
          <Link to="/tasks" className="link">View all →</Link>
        </div>
        {tasks.length === 0 ? (
          <div className="empty-state"><p>No active tasks. <Link to="/tasks" className="link">Create one →</Link></p></div>
        ) : (
          <div className="task-list">
            {tasks.map((t) => (
              <div key={t._id} className="task-item">
                <div className="task-info">
                  <span className="task-title">{t.title}</span>
                  {t.dueDate && <span className="text-muted" style={{ fontSize: 12 }}>Due: {format(new Date(t.dueDate), 'MMM d')}</span>}
                </div>
                <div className="task-badges">
                  <span className="badge" style={{ background: PRIORITY_COLOR[t.priority] + '20', color: PRIORITY_COLOR[t.priority] }}>{t.priority}</span>
                  <span className="badge" style={{ background: STATUS_COLOR[t.status] + '20', color: STATUS_COLOR[t.status] }}>{t.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

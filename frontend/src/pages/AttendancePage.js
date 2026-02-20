import { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_STYLES = {
  present:  { bg: '#d1fae5', text: '#065f46', label: '✅ Present'  },
  absent:   { bg: '#fee2e2', text: '#dc2626', label: '❌ Absent'   },
  half_day: { bg: '#fef3c7', text: '#d97706', label: '⚡ Half Day' },
  leave:    { bg: '#dbeafe', text: '#1d4ed8', label: '🏖️ Leave'   },
};

const calcHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return '—';
  const diff  = new Date(checkOut) - new Date(checkIn);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
};

export default function AttendancePage() {
  const [records, setRecords]   = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ from: '', to: '' });
  const [page, setPage]         = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...filters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const [a, s] = await Promise.all([
        attendanceAPI.getAll(params),
        attendanceAPI.getStats({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }),
      ]);
      setRecords(a.data.data.attendance);
      setPagination(a.data.data.pagination);
      setStats(s.data.data.stats);
    } catch { toast.error('Failed to load attendance'); }
    finally  { setLoading(false); }
  };


useEffect(() => { load(); }, [filters, page]); 

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>🗓️ Attendance History</h1><p className="text-muted">{format(new Date(), 'MMMM yyyy')} — {pagination.total} records</p></div>
      </div>

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
              <div className="stat-label">{s.label} (this month)</div>
            </div>
          ))}
        </div>
      )}

      <div className="filter-bar">
        {['from', 'to'].map((field) => (
          <div key={field} className="form-group" style={{ margin: 0 }}>
            <label className="text-sm text-muted">{field === 'from' ? 'From' : 'To'}</label>
            <input type="date" className="form-input filter-select" value={filters[field]}
              onChange={(e) => { setFilters(f => ({ ...f, [field]: e.target.value })); setPage(1); }} />
          </div>
        ))}
        {(filters.from || filters.to) && (
          <button className="btn btn-outline btn-sm" onClick={() => setFilters({ from: '', to: '' })}>Clear</button>
        )}
      </div>

      <div className="card table-card">
        {loading ? <div className="loading-screen"><div className="spinner-lg" /></div> :
          records.length === 0 ? <div className="empty-state">No attendance records found.</div> : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const s = STATUS_STYLES[r.status] || STATUS_STYLES.present;
                    return (
                      <tr key={r._id}>
                        <td className="font-medium">{format(new Date(r.date + 'T00:00:00'), 'EEE, MMM d yyyy')}</td>
                        <td>{r.checkIn  ? format(new Date(r.checkIn),  'hh:mm a') : '—'}</td>
                        <td>{r.checkOut ? format(new Date(r.checkOut), 'hh:mm a') : '—'}</td>
                        <td>{calcHours(r.checkIn, r.checkOut)}</td>
                        <td><span className="badge" style={{ background: s.bg, color: s.text }}>{s.label}</span></td>
                        <td className="text-muted text-sm">{r.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="page-info">Page {page} of {pagination.totalPages}</span>
          <button className="btn btn-outline btn-sm" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

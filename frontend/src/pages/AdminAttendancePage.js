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

export default function AdminAttendancePage() {
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [date, setDate]             = useState('');
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (date) params.date = date;
      const { data } = await attendanceAPI.getAllAdmin(params);
      setRecords(data.data.attendance);
      setPagination(data.data.pagination);
    } catch { toast.error('Failed to load attendance'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, [date, page]); // eslint-disable-line

  const calcHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '—';
    const diff  = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>👥 All Employees Attendance</h1>
          <p className="text-muted">{pagination.total} total records</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="text-sm text-muted">Filter by Date</label>
          <input type="date" className="form-input filter-select" value={date}
            onChange={(e) => { setDate(e.target.value); setPage(1); }} />
        </div>
        {date && <button className="btn btn-outline btn-sm" onClick={() => setDate('')}>Clear</button>}
      </div>

      <div className="card table-card">
        {loading ? (
          <div className="loading-screen"><div className="spinner-lg" /></div>
        ) : records.length === 0 ? (
          <div className="empty-state">No attendance records found.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Email</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const s = STATUS_STYLES[r.status] || STATUS_STYLES.present;
                  return (
                    <tr key={r._id}>
                      <td className="font-medium">{r.user?.name || '—'}</td>
                      <td className="text-muted text-sm">{r.user?.email || '—'}</td>
                      <td>{format(new Date(r.date + 'T00:00:00'), 'EEE, MMM d yyyy')}</td>
                      <td>{r.checkIn  ? format(new Date(r.checkIn),  'hh:mm a') : '—'}</td>
                      <td>{r.checkOut ? format(new Date(r.checkOut), 'hh:mm a') : '—'}</td>
                      <td>{calcHours(r.checkIn, r.checkOut)}</td>
                      <td><span className="badge" style={{ background: s.bg, color: s.text }}>{s.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
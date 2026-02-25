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

/* ─── Inline responsive styles ─────────────────────────────────────────── */
const styles = `
  .att-page { padding: 1rem; max-width: 1200px; margin: 0 auto; box-sizing: border-box; }

  /* Header */
  .att-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem; }
  .att-header h1 { font-size: clamp(1.25rem, 4vw, 1.75rem); margin: 0; }
  .att-header p  { margin: 0.25rem 0 0; color: #6b7280; font-size: 0.875rem; }

  /* Stats grid: 4 cols → 2 → 1 */
  .att-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
  @media (max-width: 900px) { .att-stats { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 480px) { .att-stats { grid-template-columns: 1fr 1fr; gap: 0.5rem; } }

  .att-stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1rem; text-align: center; }
  .att-stat-val { font-size: clamp(1.5rem, 5vw, 2rem); font-weight: 700; line-height: 1; }
  .att-stat-lbl { font-size: 0.75rem; color: #6b7280; margin-top: 0.35rem; }

  /* Filter bar */
  .att-filters { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end; margin-bottom: 1rem; }
  .att-filter-group { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; min-width: 130px; }
  .att-filter-group label { font-size: 0.75rem; color: #6b7280; font-weight: 500; }
  .att-filter-group input { border: 1px solid #d1d5db; border-radius: 6px; padding: 0.45rem 0.6rem; font-size: 0.875rem; width: 100%; box-sizing: border-box; }
  .att-btn-clear { padding: 0.45rem 0.9rem; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; font-size: 0.85rem; white-space: nowrap; align-self: flex-end; }
  .att-btn-clear:hover { background: #f3f4f6; }

  /* Card / table */
  .att-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 1rem; }

  /* Desktop table */
  .att-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .att-table { width: 100%; border-collapse: collapse; min-width: 560px; }
  .att-table th { background: #f9fafb; text-align: left; padding: 0.65rem 1rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
  .att-table td { padding: 0.7rem 1rem; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; vertical-align: middle; }
  .att-table tr:last-child td { border-bottom: none; }
  .att-table tr:hover td { background: #f9fafb; }

  /* Mobile card list — hidden on desktop */
  .att-mobile-list { display: none; }
  @media (max-width: 640px) {
    .att-table-wrap { display: none; }
    .att-mobile-list { display: flex; flex-direction: column; gap: 0; }
  }

  .att-mobile-row { padding: 0.85rem 1rem; border-bottom: 1px solid #f3f4f6; }
  .att-mobile-row:last-child { border-bottom: none; }
  .att-mobile-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .att-mobile-date { font-weight: 600; font-size: 0.9rem; }
  .att-mobile-meta { display: flex; gap: 1rem; font-size: 0.8rem; color: #6b7280; flex-wrap: wrap; }
  .att-mobile-meta span::before { font-weight: 500; color: #374151; }

  /* Badge */
  .att-badge { display: inline-block; padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }

  /* Empty / loading */
  .att-empty  { text-align: center; padding: 3rem 1rem; color: #9ca3af; font-size: 0.9rem; }
  .att-loading { display: flex; justify-content: center; align-items: center; padding: 3rem; }
  .att-spinner { width: 2rem; height: 2rem; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Pagination */
  .att-pagination { display: flex; justify-content: center; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .att-page-btn { padding: 0.45rem 1rem; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; font-size: 0.85rem; }
  .att-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .att-page-btn:not(:disabled):hover { background: #f3f4f6; }
  .att-page-info { font-size: 0.85rem; color: #6b7280; }
`;

export default function AttendancePage() {
  const [records, setRecords]       = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [filters, setFilters]       = useState({ from: '', to: '' });
  const [page, setPage]             = useState(1);
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

  const STAT_DEFS = [
    { label: 'Present',  key: 'present_days', color: '#10b981' },
    { label: 'Half Day', key: 'half_days',    color: '#f59e0b' },
    { label: 'Leave',    key: 'leave_days',   color: '#3b82f6' },
    { label: 'Absent',   key: 'absent_days',  color: '#ef4444' },
  ];

  return (
    <>
      <style>{styles}</style>

      <div className="att-page">
        {/* Header */}
        <div className="att-header">
          <div>
            <h1>🗓️ Attendance History</h1>
            <p>{format(new Date(), 'MMMM yyyy')} — {pagination.total} records</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="att-stats">
            {STAT_DEFS.map(({ label, key, color }) => (
              <div key={label} className="att-stat">
                <div className="att-stat-val" style={{ color }}>{stats[key] ?? 0}</div>
                <div className="att-stat-lbl">{label} (this month)</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="att-filters">
          {['from', 'to'].map((field) => (
            <div key={field} className="att-filter-group">
              <label>{field === 'from' ? 'From' : 'To'}</label>
              <input
                type="date"
                value={filters[field]}
                onChange={(e) => { setFilters(f => ({ ...f, [field]: e.target.value })); setPage(1); }}
              />
            </div>
          ))}
          {(filters.from || filters.to) && (
            <button className="att-btn-clear" onClick={() => setFilters({ from: '', to: '' })}>Clear</button>
          )}
        </div>

        {/* Table card */}
        <div className="att-card">
          {loading ? (
            <div className="att-loading"><div className="att-spinner" /></div>
          ) : records.length === 0 ? (
            <div className="att-empty">No attendance records found.</div>
          ) : (
            <>
              {/* ── Desktop table ── */}
              <div className="att-table-wrap">
                <table className="att-table">
                  <thead>
                    <tr>
                      <th>Date</th><th>Check In</th><th>Check Out</th>
                      <th>Hours</th><th>Status</th><th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => {
                      const s = STATUS_STYLES[r.status] || STATUS_STYLES.present;
                      return (
                        <tr key={r._id}>
                          <td style={{ fontWeight: 500 }}>{format(new Date(r.date + 'T00:00:00'), 'EEE, MMM d yyyy')}</td>
                          <td>{r.checkIn  ? format(new Date(r.checkIn),  'hh:mm a') : '—'}</td>
                          <td>{r.checkOut ? format(new Date(r.checkOut), 'hh:mm a') : '—'}</td>
                          <td>{calcHours(r.checkIn, r.checkOut)}</td>
                          <td><span className="att-badge" style={{ background: s.bg, color: s.text }}>{s.label}</span></td>
                          <td style={{ color: '#6b7280', fontSize: '0.8rem' }}>{r.notes || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile card list ── */}
              <div className="att-mobile-list">
                {records.map((r) => {
                  const s = STATUS_STYLES[r.status] || STATUS_STYLES.present;
                  return (
                    <div key={r._id} className="att-mobile-row">
                      <div className="att-mobile-top">
                        <span className="att-mobile-date">
                          {format(new Date(r.date + 'T00:00:00'), 'EEE, MMM d yyyy')}
                        </span>
                        <span className="att-badge" style={{ background: s.bg, color: s.text }}>{s.label}</span>
                      </div>
                      <div className="att-mobile-meta">
                        <span>In: {r.checkIn  ? format(new Date(r.checkIn),  'hh:mm a') : '—'}</span>
                        <span>Out: {r.checkOut ? format(new Date(r.checkOut), 'hh:mm a') : '—'}</span>
                        <span>⏱ {calcHours(r.checkIn, r.checkOut)}</span>
                        {r.notes && <span style={{ color: '#9ca3af' }}>{r.notes}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="att-pagination">
            <button className="att-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span className="att-page-info">Page {page} of {pagination.totalPages}</span>
            <button className="att-page-btn" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </>
  );
}
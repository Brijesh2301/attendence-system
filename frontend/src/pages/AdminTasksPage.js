import { useState, useEffect } from 'react';
import { tasksAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PRI = { low: { bg: '#f3f4f6', text: '#6b7280' }, medium: { bg: '#dbeafe', text: '#1d4ed8' }, high: { bg: '#fef3c7', text: '#d97706' }, critical: { bg: '#fee2e2', text: '#dc2626' } };
const STA = { todo: { bg: '#f3f4f6', text: '#374151' }, in_progress: { bg: '#dbeafe', text: '#1d4ed8' }, completed: { bg: '#d1fae5', text: '#065f46' }, cancelled: { bg: '#fee2e2', text: '#dc2626' } };

export default function AdminTasksPage() {
  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState({ status: '', priority: '' });
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, ...filter };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const { data } = await tasksAPI.getAllAdmin(params);
      setTasks(data.data.tasks);
      setPagination(data.data.pagination);
    } catch { toast.error('Failed to load tasks'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter, page]); 

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>📊 All Employees Tasks</h1>
          <p className="text-muted">{pagination.total} total tasks</p>
        </div>
      </div>

      <div className="filter-bar">
        {[
          { name: 'status',   opts: ['todo','in_progress','completed','cancelled'], placeholder: 'All Status'   },
          { name: 'priority', opts: ['critical','high','medium','low'],             placeholder: 'All Priority' },
        ].map(({ name, opts, placeholder }) => (
          <select key={name} className="form-input filter-select" value={filter[name]}
            onChange={(e) => { setFilter(f => ({ ...f, [name]: e.target.value })); setPage(1); }}>
            <option value="">{placeholder}</option>
            {opts.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
          </select>
        ))}
      </div>

      <div className="card table-card">
        {loading ? (
          <div className="loading-screen"><div className="spinner-lg" /></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">No tasks found.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Assigned To</th>
                  <th>Created By</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t._id}>
                    <td className="font-medium">{t.title}</td>
                    <td className="text-muted text-sm">{t.assignedTo?.name || '—'}</td>
                    <td className="text-muted text-sm">{t.createdBy?.name  || '—'}</td>
                    <td><span className="badge" style={{ background: PRI[t.priority]?.bg, color: PRI[t.priority]?.text }}>{t.priority}</span></td>
                    <td><span className="badge" style={{ background: STA[t.status]?.bg,   color: STA[t.status]?.text   }}>{t.status.replace('_',' ')}</span></td>
                    <td className="text-muted text-sm">{t.dueDate ? format(new Date(t.dueDate), 'MMM d, yyyy') : '—'}</td>
                  </tr>
                ))}
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
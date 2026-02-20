import { useState, useEffect, useCallback } from 'react';
import { tasksAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PRI = { low: { bg: '#f3f4f6', text: '#6b7280' }, medium: { bg: '#dbeafe', text: '#1d4ed8' }, high: { bg: '#fef3c7', text: '#d97706' }, critical: { bg: '#fee2e2', text: '#dc2626' } };
const STA = { todo: { bg: '#f3f4f6', text: '#374151' }, in_progress: { bg: '#dbeafe', text: '#1d4ed8' }, completed: { bg: '#d1fae5', text: '#065f46' }, cancelled: { bg: '#fee2e2', text: '#dc2626' } };
const EMPTY = { title: '', description: '', priority: 'medium', status: 'todo', due_date: '' };

export default function TasksPage() {
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setModal]   = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState({ status: '', priority: '' });
  const [page, setPage]         = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, ...filter };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const { data } = await tasksAPI.getAll(params);
      setTasks(data.data.tasks);
      setPagination(data.data.pagination);
    } catch { toast.error('Failed to load tasks'); }
    finally  { setLoading(false); }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit   = (t) => {
    setEditing(t);
    setForm({ title: t.title, description: t.description || '', priority: t.priority, status: t.status, due_date: t.dueDate ? t.dueDate.split('T')[0] : '' });
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.due_date) delete payload.due_date;
      if (!payload.description) delete payload.description;
      if (editing) { await tasksAPI.update(editing._id, payload); toast.success('Task updated!'); }
      else         { await tasksAPI.create(payload);              toast.success('Task created!'); }
      setModal(false);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save'); }
    finally     { setSaving(false); }
  };

  const quickStatus = async (t, s) => {
    try { await tasksAPI.update(t._id, { status: s }); toast.success(`Marked as ${s.replace('_', ' ')}`); load(); }
    catch { toast.error('Update failed'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try { await tasksAPI.delete(id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>📋 My Tasks</h1><p className="text-muted">{pagination.total} total</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Task</button>
      </div>

      <div className="filter-bar">
        {[
          { name: 'status', opts: ['todo','in_progress','completed','cancelled'], placeholder: 'All Status' },
          { name: 'priority', opts: ['critical','high','medium','low'], placeholder: 'All Priority' },
        ].map(({ name, opts, placeholder }) => (
          <select key={name} className="form-input filter-select" value={filter[name]}
            onChange={(e) => { setFilter(f => ({ ...f, [name]: e.target.value })); setPage(1); }}>
            <option value="">{placeholder}</option>
            {opts.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
          </select>
        ))}
      </div>

      {loading ? <div className="loading-screen"><div className="spinner-lg" /></div> :
        tasks.length === 0 ? (
          <div className="card empty-state">
            <p>No tasks found.</p>
            <button className="btn btn-primary" onClick={openCreate}>Create your first task</button>
          </div>
        ) : (
          <div className="task-cards">
            {tasks.map((t) => (
              <div key={t._id} className="task-card">
                <div className="task-card-header">
                  <h3 className="task-card-title">{t.title}</h3>
                  <div className="task-card-badges">
                    <span className="badge" style={{ background: PRI[t.priority]?.bg, color: PRI[t.priority]?.text }}>{t.priority}</span>
                    <span className="badge" style={{ background: STA[t.status]?.bg,   color: STA[t.status]?.text   }}>{t.status.replace('_', ' ')}</span>
                  </div>
                </div>
                {t.description && <p className="task-description text-muted">{t.description}</p>}
                <div className="task-card-footer">
                  <div className="task-meta">
                    {t.dueDate && <span className="text-muted text-sm">📅 {format(new Date(t.dueDate), 'MMM d, yyyy')}</span>}
                    <span className="text-muted text-sm">By {t.createdBy?.name}</span>
                  </div>
                  <div className="task-actions">
                    {t.status !== 'completed' && <button className="btn btn-sm btn-success" onClick={() => quickStatus(t, 'completed')}>✓ Done</button>}
                    {t.status === 'todo' && <button className="btn btn-sm btn-secondary" onClick={() => quickStatus(t, 'in_progress')}>▶ Start</button>}
                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(t)}>✏️ Edit</button>
                    <button className="btn btn-sm btn-danger-outline" onClick={() => del(t._id)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="page-info">Page {page} of {pagination.totalPages}</span>
          <button className="btn btn-outline btn-sm" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Task' : 'Create Task'}</h2>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Title *</label>
                <input className="form-input" required placeholder="Task title" value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-input" rows={3} placeholder="Optional description" value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select className="form-input" value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {['low','medium','high','critical'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {editing && (
                  <div className="form-group">
                    <label>Status</label>
                    <select className="form-input" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
                      {['todo','in_progress','completed','cancelled'].map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input type="date" className="form-input" value={form.due_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Saving...</> : (editing ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

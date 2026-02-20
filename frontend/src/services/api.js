import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor ───────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor (Auto Token Refresh) ─────────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => { original.headers.Authorization = `Bearer ${token}`; return api(original); });
      }
      original._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) { localStorage.clear(); window.location.href = '/login'; return Promise.reject(error); }
      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data.tokens;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (e) {
        processQueue(e, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup:  (data) => api.post('/auth/signup', data),
  login:   (data) => api.post('/auth/login', data),
  logout:  (data) => api.post('/auth/logout', data),
  getMe:   ()     => api.get('/auth/me'),
};

export const attendanceAPI = {
  checkIn:  (notes) => api.post('/attendance/check-in', { notes }),
  checkOut: ()      => api.patch('/attendance/check-out'),
  getToday: ()      => api.get('/attendance/today'),
  getAll:   (p)     => api.get('/attendance', { params: p }),
  getStats: (p)     => api.get('/attendance/stats', { params: p }),
   getAllAdmin:   (p)     => api.get('/attendance/all', { params: p }), // ← Add karo
};

export const tasksAPI = {
  create:  (data)    => api.post('/tasks', data),
  getAll:  (params)  => api.get('/tasks', { params }),
  getById: (id)      => api.get(`/tasks/${id}`),
  update:  (id, d)   => api.patch(`/tasks/${id}`, d),
  delete:  (id)      => api.delete(`/tasks/${id}`),
   getAllAdmin:   (params)=> api.get('/tasks/all', { params }), // ← Add karo
};

export default api;

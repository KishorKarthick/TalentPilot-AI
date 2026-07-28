import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Turns every axios failure into a real Error with a human-readable `message`,
// so callers can rely on `err.message` instead of an arbitrary response body.
const normalizeError = (err) => {
  const data = err.response?.data;
  const fieldErrors = data?.details || data?.errors;
  const message =
    data?.message ||
    fieldErrors?.map((e) => e.msg || e.message).filter(Boolean).join(', ') ||
    (err.response
      ? `Request failed (${err.response.status})`
      : 'Cannot reach the server. Check your connection and try again.');

  const normalized = new Error(message);
  normalized.status = err.response?.status;
  normalized.details = fieldErrors;
  normalized.cause = err;
  return normalized;
};

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const normalized = normalizeError(err);
    console.error(`API ${err.config?.method?.toUpperCase()} ${err.config?.url} failed:`, normalized.message);

    // Only an expired/invalid session should bounce the user to the login page.
    if (normalized.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(normalized);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const jobsAPI = {
  getAll: (params) => api.get('/jobs', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
};

export const resumesAPI = {
  upload: (formData) => api.post('/resumes/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getByJob: (jobId, params) => api.get(`/resumes/job/${jobId}`, { params }),
  getById: (id) => api.get(`/resumes/${id}`),
  updateStatus: (id, status) => api.patch(`/resumes/${id}/status`, { status }),
  rescore: (id, jobId) => api.post(`/resumes/${id}/rescore`, { jobId }),
};

export const candidatesAPI = {
  getAll: (params) => api.get('/candidates', { params }),
  getById: (id) => api.get(`/candidates/${id}`),
  addNote: (id, text) => api.post(`/candidates/${id}/notes`, { text }),
  updateStatus: (id, data) => api.patch(`/candidates/${id}/status`, data),
};

export const interviewsAPI = {
  getAll: (params) => api.get('/interviews', { params }),
  getById: (id) => api.get(`/interviews/${id}`),
  create: (data) => api.post('/interviews', data),
  update: (id, data) => api.put(`/interviews/${id}`, data),
  submitFeedback: (id, data) => api.post(`/interviews/${id}/feedback`, data),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getJobAnalytics: (jobId) => api.get(`/analytics/jobs/${jobId}`),
};

export default api;

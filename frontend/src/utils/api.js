import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
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
  generateQuestions: (role) => api.post('/interviews/ai/generate-questions', { role }),
  evaluateAnswer: (role, question, answer) => api.post('/interviews/ai/evaluate', { role, question, answer }),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getJobAnalytics: (jobId) => api.get(`/analytics/jobs/${jobId}`),
};

export default api;

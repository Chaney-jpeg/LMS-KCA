import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth endpoints
export const authAPI = {
  login: (email, password) => api.post('/auth/login/', { email, password }),
  logout: () => api.post('/auth/logout/'),
  getCurrentUser: () => api.get('/auth/user/'),
};

// Admin endpoints
export const adminAPI = {
  getStats: () => api.get('/admin/stats/'),
  getUsers: () => api.get('/admin/users/'),
  getCourses: () => api.get('/admin/courses/'),
};

// Lecturer endpoints
export const lecturerAPI = {
  getDashboard: () => api.get('/lecturer/dashboard/'),
  getCourses: () => api.get('/lecturer/courses/'),
  getAssignments: () => api.get('/lecturer/assignments/'),
};

// Student endpoints
export const studentAPI = {
  getDashboard: () => api.get('/student/dashboard/'),
  getCourses: () => api.get('/student/courses/'),
  getAssignments: () => api.get('/student/assignments/'),
};

export default api;

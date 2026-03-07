import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

export const authAPI = {
  login: (email, password) => api.post('login/', { email, password }),
};

export const userAPI = {
  getUsers: () => api.get('users/'),
};

export const courseAPI = {
  getCourses: (lecturer_email) => api.get('courses/', { params: lecturer_email ? { lecturer_email } : {} }),
};

export const notifAPI = {
  getNotifications: (role) => api.get('notifs/', { params: { role } }),
};

export const kiraAPI = {
  chat: (role, message) => api.post('kira/', { role, message }),
};

export const libraryAPI = {
  getItems: () => api.get('library/items/'),
  getStudentBorrows: (student_email) => api.get('library/borrows/', { params: { student_email } }),
  borrowItem: (student_email, item_id) => api.post('library/borrow/', { student_email, item_id }),
  returnItem: (borrow_id) => api.post('library/return/', { borrow_id }),
};

export const materialAPI = {
  getMaterials: (course_id) => api.get(`courses/${course_id}/materials/`),
  postMaterial: (course_id, payload) => {
    if (payload && payload.file) {
      const fd = new FormData();
      Object.keys(payload).forEach((k) => {
        const v = payload[k];
        if (v === undefined || v === null) return;
        if (k === 'file') fd.append('file', v);
        else fd.append(k, v);
      });
      return api.post(`courses/${course_id}/materials/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.post(`courses/${course_id}/materials/`, payload);
  },
};


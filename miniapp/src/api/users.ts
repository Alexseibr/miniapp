import api from './axios';

export const getMe = () => api.get('/users/me').then((r) => r.data);

import axios from 'axios';
const api = axios.create({ baseURL: '/api' });

export const getSessions = () => api.get('/sessions');
export const createSession = (data) => api.post('/sessions', data);
export const updateSession = (id, data) => api.patch(`/sessions/${id}`, data);
export const startSession = (id) => api.post(`/sessions/${id}/start`);
export const stopSession = (id) => api.post(`/sessions/${id}/stop`);
export const finishSession = (id) => api.post(`/sessions/${id}/finish`);
export const getSessionData = (id) => api.get(`/sessions/${id}/data`);
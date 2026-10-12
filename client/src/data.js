import { api, localToday } from './api.js';
export const loadDashboard = () => api('/dashboard?today=' + localToday());

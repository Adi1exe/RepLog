import client from './client';

export const login = (data) => client.post('/auth/login', data);
export const register = (data) => client.post('/auth/register', data);
export const getMe = () => client.get('/auth/me');
export const updateMe = (data) => client.put('/auth/me', data);

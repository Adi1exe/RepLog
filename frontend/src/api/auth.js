import client from './client';

export const login = (data) => client.post('/auth/login', data);
export const register = (data) => client.post('/auth/register', data);
export const getMe = () => client.get('/auth/me');
export const updateMe = (data) => client.put('/auth/me', data);
export const verifyEmail = (data) => client.post('/auth/verify-email', data);
export const resendVerification = (data) => client.post('/auth/resend-verification', data);
export const oauthLogin = (data) => client.post('/auth/oauth', data);

import axios from 'axios';

const client = axios.create({
  withCredentials: true,
});

client.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config?.url !== '/auth/me') {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;

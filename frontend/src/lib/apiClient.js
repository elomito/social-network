import axios from 'axios';

if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  console.error('API_BASE_URL not set in environment variables');
  throw new Error('Missing API_BASE_URL environment variable');
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response || error.message);
    return Promise.reject(error);
  }
);

export default api;

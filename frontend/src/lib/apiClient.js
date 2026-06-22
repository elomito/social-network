import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

api.interceptors.response.use(
  response => response,
  error => {
    // Handle consistent error formatting here
    console.error('API Error:', error.response || error.message);
    return Promise.reject(error);
  }
);

export default api;

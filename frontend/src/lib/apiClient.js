import axios from 'axios';

// Validate environment variable
if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  console.error('API_BASE_URL not set in environment variables');
  throw new Error('Missing API_BASE_URL environment variable');
}

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

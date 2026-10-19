import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.token) {
        config.headers['Authorization'] = `Bearer ${user.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: log out only when the session is really invalid
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAuthRequest = (error.config?.url || '').startsWith('/auth/');
    // 401 = token missing/expired -> back to login.
    // But NOT for the login/register requests themselves: there a 401 just means "wrong password",
    // and the page must stay so the error message can be shown.
    // 403 = "your role can't do this" -> stay logged in, the page shows the error.
    if (status === 401 && !isAuthRequest) {
      console.log('[Auth] Session expired or invalid. Logging out.');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
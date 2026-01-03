import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
// strictly use production URL
const API_BASE_URL = 'https://badminton-slot-booking-app.onrender.com/api';

console.log(`[Config] Connecting to: ${API_BASE_URL}`);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, 
});

// Request Interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log requests in Development
    if (__DEV__) {
       console.log(`[Request] ${config.method.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const message = error.response?.data?.message || 'Something went wrong';

    if (__DEV__) {
       console.error(`[API Error] ${error.config?.url}:`, message);
    }

    // 401: Token Expired
    if (error.response?.status === 401) {
      await AsyncStorage.clear();
      // Optional: Navigate to login here if you have navigation reference
    }

    return Promise.reject(error);
  }
);

export default api;
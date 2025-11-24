import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// AUTOMATIC Environment Switching
// If running in development mode, use your Local IP. 
// If built for production (APK/AAB), use the Render URL.
const API_BASE_URL = 'https://badminton-slot-booking-app.onrender.com/api'; // YOUR PRODUCTION URL

console.log(`[Config] Connecting to: ${API_BASE_URL}`);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds is usually enough
});

// Request Interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Only log requests in Development mode
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

    // Only log errors in Development mode
    if (__DEV__) {
        console.error(`[API Error] ${error.config?.url}:`, message);
    }

    // 401: Token Expired
    if (error.response?.status === 401) {
      await AsyncStorage.clear();
      // You might want to trigger a navigation event to Login here
      // Or let the React Context handle the 'null' token state change
    }

    return Promise.reject(error);
  }
);

export default api;
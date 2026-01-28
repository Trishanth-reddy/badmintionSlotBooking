import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ✅ Import the helper to navigate safely
import * as RootNavigation from '../src/navigation/RootNavigation';
// Configuration
// strictly use production URL as you requested
// const API_BASE_URL = 'http://10.10.51.71:5000/api';
// ❌ DELETE THIS
// const API_BASE_URL = 'http://192.168.0.10:5000/api';

// ✅ USE THE PUBLIC TUNNEL LINK (Add /api at the end)
const API_BASE_URL = 'https://d9fb403e82d9.ngrok-free.app/api';

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
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      // ✅ Use the safe helper to go back to Login
      RootNavigation.reset('Auth');
    }

    return Promise.reject(error);
  }
);

export default api;
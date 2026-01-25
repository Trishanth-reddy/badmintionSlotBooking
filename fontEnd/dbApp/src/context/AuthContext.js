import React, { createContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to check if token is expired
  const isTokenValid = (token) => {
    if (!token) return false;
    try {
      const decoded = jwtDecode(token);
      return Date.now() < decoded.exp * 1000;
    } catch { 
      return false; 
    }
  };

  // Load User from Storage on App Start
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        
        if (token && isTokenValid(token)) {
          setUserToken(token);
          if (userData) {
            setUser(JSON.parse(userData));
          }
        } else {
          // Token invalid or missing, clear everything
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userData');
          setUserToken(null);
          setUser(null);
        }
      } catch (e) {
        console.error('Auth boot error', e);
      }
      setLoading(false);
    };

    bootstrapAsync();
  }, []);

  // Login Action
// Login Action
  const signIn = async (token, userData) => {
    console.log("🟢 AuthContext: signIn called!");
    console.log("🔑 Token received:", token ? "Yes (Length: " + token.length + ")" : "NO TOKEN");
    console.log("👤 User received:", userData);

    try {
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      console.log("💾 Storage Saved. Updating State...");
      setUserToken(token);
      setUser(userData);
    } catch (e) {
      console.error('🔴 Sign in error', e);
    }
  };

  // Logout Action
  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      setUserToken(null);
      setUser(null);
    } catch (e) {
      console.error('Sign out error', e);
    }
  };

  const authContextValue = useMemo(() => ({
    user,
    userToken,
    loading,
    signIn,
    signOut,
    setUser,      // Exposed if you need to update user data (e.g. profile edit)
    setUserToken, // Exposed if you need to refresh token
  }), [user, userToken, loading]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
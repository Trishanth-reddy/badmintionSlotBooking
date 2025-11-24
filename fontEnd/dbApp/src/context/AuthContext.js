import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // Instead of throwing error, return null if not available
  // This prevents crashes when used outside provider
  if (!context) {
    console.warn('useAuth called outside AuthProvider');
    return null;
  }
  
  return context;
};


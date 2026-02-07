import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { db } from '../services/mockDatabase';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (u: string, p: string, remember: boolean) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'eduequip_auth_user';
const AUTH_EXPIRY_KEY = 'eduequip_auth_expiry';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check persistence
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);

    if (storedUser && expiry) {
      if (new Date().getTime() < parseInt(expiry)) {
        setUser(JSON.parse(storedUser));
      } else {
        // Expired
        logout();
      }
    }
  }, []);

  const login = (usernameInput: string, passwordInput: string, remember: boolean) => {
    // Mock Auth: Password is 'admin' for admin, or same as username for others
    const validUser = db.findUser(usernameInput);

    if (validUser) {
      // Very basic mock password check
      const isValidPass = passwordInput === 'admin' || passwordInput === usernameInput;
      
      if (isValidPass) {
        setUser(validUser);
        
        // Persistence Logic
        const expiryTime = new Date().getTime() + (remember ? 3 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000); // 3 days or 1 day
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(validUser));
        localStorage.setItem(AUTH_EXPIRY_KEY, expiryTime.toString());
        
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
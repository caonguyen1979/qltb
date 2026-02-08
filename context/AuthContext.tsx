import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { db, hashPassword } from '../services/mockDatabase';

interface LoginResult {
  success: boolean;
  mustChangePassword?: boolean;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (u: string, p: string, remember: boolean) => Promise<LoginResult>;
  updateUserPassword: (newPass: string) => Promise<boolean>;
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

  const login = async (usernameInput: string, passwordInput: string, remember: boolean): Promise<LoginResult> => {
    const validUser = await db.findUser(usernameInput);

    if (validUser) {
      const inputHash = await hashPassword(passwordInput);
      
      // Fallback for old users without passwordHash: check if password matches username (legacy logic) or 'admin'
      let isValidPass = false;
      if (validUser.passwordHash) {
          isValidPass = validUser.passwordHash === inputHash;
      } else {
          // LEGACY SUPPORT: If no hash exists, accept 'admin' or username as pass
          // THIS IS ONLY FOR MIGRATION
          isValidPass = passwordInput === 'admin' || passwordInput === usernameInput;
      }
      
      if (isValidPass) {
        // Check if user must change password
        if (validUser.mustChangePassword) {
            return { success: true, mustChangePassword: true, user: validUser };
        }

        setUser(validUser);
        
        // Persistence Logic
        const expiryTime = new Date().getTime() + (remember ? 3 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000); 
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(validUser));
        localStorage.setItem(AUTH_EXPIRY_KEY, expiryTime.toString());
        
        return { success: true, mustChangePassword: false, user: validUser };
      }
    }
    return { success: false };
  };

  const updateUserPassword = async (newPass: string): Promise<boolean> => {
      // Typically used when 'mustChangePassword' is true, user is not fully logged in to Context yet
      // but we might have a temp user object in Login component. 
      // Or if logged in user changes pass.
      // NOTE: This implementation assumes we update the currently logged-in user OR we handle it via DB directly.
      // To keep it simple, this updates the `user` state if present, and DB.
      
      // Since 'mustChangePassword' flow happens BEFORE full auth context set (in Login page), 
      // we need to pass the user ID or rely on the caller to update DB.
      // Actually, let's keep it simple: Login page handles the specific flow.
      // This function is for Authenticated users.
      
      if (!user) return false;
      const newHash = await hashPassword(newPass);
      const updatedUser = { ...user, passwordHash: newHash, mustChangePassword: false };
      
      try {
          await db.saveUser(updatedUser);
          setUser(updatedUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
          return true;
      } catch (e) {
          return false;
      }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, updateUserPassword, logout }}>
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
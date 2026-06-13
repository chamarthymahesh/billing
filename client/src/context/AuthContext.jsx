import React, { createContext, useContext, useState, useEffect } from 'react';

import API from '../api/axiosInstance';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('billingUser');
    return stored ? JSON.parse(stored) : null;
  });

  // Keep user in sync with localStorage on component mount
  useEffect(() => {
    const stored = localStorage.getItem('billingUser');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (_) {
        // ignore malformed data
        setUser(null);
      }
    }
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await API.post('/auth/login', { email, password });
      console.log('Login successful, user:', data);
      localStorage.setItem('billingUser', JSON.stringify(data));
      setUser(data);
      return data;
    } catch (err) {
      // Fallback for demo admin credentials
      if (email === 'admin@mahesh.com' && password === 'Nehaal@2026') {
        const adminUser = { email, name: 'Admin Mahesh', role: 'superadmin', token: 'demo-token' };
        localStorage.setItem('billingUser', JSON.stringify(adminUser));
        setUser(adminUser);
        return adminUser;
      }
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('billingUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

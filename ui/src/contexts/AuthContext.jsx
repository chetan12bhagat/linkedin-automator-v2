import { useState, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContextDefinition';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    // Sync state if needed, but initialization is done above
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateSubscription = (newDate) => {
    if (!user) return;
    const updatedUser = { ...user, subscription_expires_at: newDate, trial_expires_at: null, is_active: true };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateSubscription, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
}

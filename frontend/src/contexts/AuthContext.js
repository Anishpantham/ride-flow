import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API = "http://127.0.0.1:8000/api";


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  

  const register = async (data) => {
    const response = await axios.post(`${API}/auth/register`, data);
    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    return response.data;
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    return response.data;
  };

  // const logout = () => {
  //   setToken(null);
  //   setUser(null);
  //   localStorage.removeItem('token');
  // };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});
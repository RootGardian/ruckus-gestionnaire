import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import MaintenancePage from './pages/MaintenancePage';
import './index.css';
import axios from 'axios';
import { API_URL } from './config/api';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Intercepteur global de requête : attache automatiquement le Bearer token et withCredentials
axios.interceptors.request.use((config) => {
  config.withCredentials = true;
  const token = localStorage.getItem('token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur global avec renouvellement transparent (Rotation du Refresh Token)
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Révocation explicite par un administrateur -> Déconnexion forcée immédiate
    if (error.response && error.response.status === 401 && error.response.data?.revoked) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login?revoked=true';
      return Promise.reject(error);
    }

    // Détection d'expiration de l'Access Token (15 min) -> Tentative de Refresh transparent
    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/auth/login') &&
      !originalRequest.url?.includes('/api/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axios(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshUrl = `${API_URL}/api/auth/refresh`;
        const refreshRes = await axios.post(refreshUrl, {}, { withCredentials: true });
        if (refreshRes.data?.token) {
          localStorage.setItem('token', refreshRes.data.token);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${refreshRes.data.token}`;
          }
        }
        processQueue(null);
        return axios(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        // Si le Refresh Token est révoqué par l'admin ou expiré -> Déconnexion
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const isExplicitRevoke = refreshErr.response?.data?.revoked === true;
        window.location.href = isExplicitRevoke ? '/login?revoked=true' : '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response && error.response.status === 401 && originalRequest?.url?.includes('/api/auth/refresh')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const isExplicitRevoke = error.response?.data?.revoked === true;
      window.location.href = isExplicitRevoke ? '/login?revoked=true' : '/login';
    }

    return Promise.reject(error);
  }
);

export const isUserAdmin = (user) => {
  if (!user) return false;
  if (user.is_admin === true || user.is_admin === 'true') return true;
  if (Array.isArray(user.roles)) {
    return user.roles.some(r => {
      const name = (typeof r === 'string' ? r : r.name || '').toLowerCase();
      return name.includes('admin');
    });
  }
  return false;
};

const ProtectedRoute = ({ children, requireAdmin, forbidAdmin }) => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // 1. Protection contre les utilisateurs non connectés (Session HttpOnly vérifiée côté serveur)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = isUserAdmin(user);

  // 2. Protection RBAC : La route nécessite d'être Administrateur
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // 3. Protection RBAC (Isolation) : Empêcher un Admin d'aller sur le portail Employé si on le souhaite
  if (forbidAdmin && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Route Console d'Administration Wi-Fi Ruckus */}
        <Route path="/admin" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

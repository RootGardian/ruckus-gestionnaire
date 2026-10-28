import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  Users,
  KeyRound,
  Database,
  ShieldCheck,
  Mail,
  ChevronLeft,
  ChevronDown,
  LogOut,
  Calendar,
  Wifi,
  Radio
} from 'lucide-react';
import logo from '../assets/bcrg_logo_seul_inverse_144.png';
import AdminPanel from './AdminPanel';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAdmin = Boolean(user && user.is_admin);

  // Battement de cœur de sécurité : vérifie la validité de la session administrateur
  useEffect(() => {
    if (!user) return;

    const checkAdminSession = async () => {
      if (document.hidden) return;
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const { data: updatedUser } = await axios.get(`${API_URL}/api/auth/me`, headers);
        if (updatedUser) {
          localStorage.setItem('user', JSON.stringify(updatedUser));
          if (!updatedUser.is_admin) {
            window.location.href = '/login';
          }
        }
      } catch (e) {
        // Déconnecté par l'intercepteur si expiré
      }
    };

    const heartbeat = setInterval(checkAdminSession, 20000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAdminSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, API_URL]);

  if (!user || !isAdmin) {
    return (
      <div className="dashboard-layout" style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <h2 style={{ color: '#1a3c2c' }}>Accès réservé aux administrateurs.</h2>
        <button onClick={() => navigate('/login')} className="btn-primary" style={{ marginTop: '20px' }}>Retour à la connexion</button>
      </div>
    );
  }

  const roleName = 'ADMINISTRATEUR';
  const initial = user.first_name ? user.first_name.charAt(0).toUpperCase() + (user.last_name ? user.last_name.charAt(0).toUpperCase() : '') : 'A';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.post(`${API_URL}/api/auth/logout`, {}, headers);
    } catch (e) {
      console.error('Erreur déconnexion:', e);
    }
    setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }, 500);
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const closeDropdown = () => {
    if (isProfileDropdownOpen) setIsProfileDropdownOpen(false);
  };

  const todayStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'users':
        return {
          title: "Utilisateurs Active Directory",
          subtitle: "Recherchez et consultez les comptes des collaborateurs reliés à l'infrastructure Wi-Fi Ruckus."
        };
      case 'reset-password':
        return {
          title: "Réinitialisation de mot de passe",
          subtitle: "Définissez un nouveau mot de passe pour un utilisateur et choisissez de lui transmettre ou non par courriel."
        };
      case 'ldap':
        return {
          title: "Configuration LDAP / Active Directory",
          subtitle: "Paramétrez le connecteur AD, l'accès sécurisé LDAPS (port 636) et explorez l'arborescence des OUs."
        };
      case 'smtp':
        return {
          title: "Configuration SMTP & Messagerie",
          subtitle: "Paramètres de la passerelle de messagerie, modèle de courriel et test d'expédition des identifiants."
        };
      default:
        return {
          title: "BCRG WI-FI MANAGER",
          subtitle: "Console d'administration des identifiants Active Directory pour le réseau Wi-Fi."
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="dashboard-layout" onClick={closeDropdown}>
      {/* Overlay Déconnexion */}
      {isLoggingOut && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          color: 'white'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px 36px',
            maxWidth: '380px',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            color: '#1e293b'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <LogOut size={26} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>
              Déconnexion
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0', lineHeight: 1.5 }}>
              Clôture de votre session d'administration Wi-Fi...
            </p>
          </div>
        </div>
      )}

      {/* Barre latérale (Sidebar) avec exactement les 5 onglets demandés */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="BCRG Logo" className="sidebar-logo" />
          <button className="toggle-btn" onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}>
            <ChevronLeft size={isSidebarOpen ? 20 : 18} style={{ transform: isSidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: '0.3s' }} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {/* 1. Utilisateur */}
            <li
              className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={20} className="nav-icon" />
              {isSidebarOpen && <span>Utilisateur</span>}
            </li>

            {/* 2. Réinitialiser mot de passe */}
            <li
              className={`nav-item ${activeTab === 'reset-password' ? 'active' : ''}`}
              onClick={() => setActiveTab('reset-password')}
            >
              <KeyRound size={20} className="nav-icon" />
              {isSidebarOpen && <span>Reinitialiser mot de passe</span>}
            </li>

            {/* 3. Configuration LDAP */}
            <li
              className={`nav-item ${activeTab === 'ldap' ? 'active' : ''}`}
              onClick={() => setActiveTab('ldap')}
            >
              <Database size={20} className="nav-icon" />
              {isSidebarOpen && <span>Configuration ldap</span>}
            </li>

            {/* 4. Configuration SMTP */}
            <li
              className={`nav-item ${activeTab === 'smtp' ? 'active' : ''}`}
              onClick={() => setActiveTab('smtp')}
            >
              <Mail size={20} className="nav-icon" />
              {isSidebarOpen && <span>Configuration smtp</span>}
            </li>
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center' }}>
            <h2 className="topbar-title">ADMINISTRATEUR</h2>
          </div>
          <div className="topbar-right" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <div className="user-profile-container">
              <div className="user-profile" onClick={toggleDropdown}>
                <div className="avatar">{initial}</div>
                <div className="user-info">
                  <span className="user-name">{user.first_name} {user.last_name}</span>
                  <span className="user-email">{user.email}</span>
                </div>
                <ChevronDown size={16} className="dropdown-icon" />
              </div>
              {isProfileDropdownOpen && (
                <div className="profile-dropdown">
                  <button className="dropdown-item text-red" onClick={handleLogout}>
                    <LogOut size={18} /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content-area">
          {/* Hero Header Card */}
          <div className="hero-header-card" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxSizing: 'border-box' }}>
            <div className="hero-content">
              <div className="hero-badge">
                <ShieldCheck size={14} />
                <span>ADMINISTRATEUR</span>
              </div>
              <h1 className="hero-title">{headerInfo.title}</h1>
              <p className="hero-subtitle">{headerInfo.subtitle}</p>
            </div>
            <div className="hero-date-box" style={{ marginLeft: 'auto' }}>
              <Calendar size={15} />
              <span>{todayStr}</span>
            </div>
          </div>

          <AdminPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;

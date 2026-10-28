import React, { useState } from 'react';
import WifiUsersTab from './WifiUsersTab';
import WifiResetPasswordTab from './WifiResetPasswordTab';
import LdapConfigPanel from './LdapConfigPanel';
import SmtpConfigTab from './SmtpConfigTab';
import './AdminPanel.css';

const AdminPanel = ({ activeTab, setActiveTab }) => {
  const [preselectedUser, setPreselectedUser] = useState(null);

  const handleSelectUserForReset = (user) => {
    setPreselectedUser(user);
    if (setActiveTab) {
      setActiveTab('reset-password');
    }
  };

  return (
    <div className="admin-panel-container" style={{ width: '100%' }}>
      {/* 1. Onglet Utilisateur (Annuaire Active Directory) */}
      {activeTab === 'users' && (
        <WifiUsersTab
          onSelectUserForReset={handleSelectUserForReset}
          onNavigateToReset={() => {
            setPreselectedUser(null);
            if (setActiveTab) setActiveTab('reset-password');
          }}
        />
      )}

      {/* 2. Onglet Réinitialiser mot de passe (Défini par l'admin + option mail) */}
      {activeTab === 'reset-password' && (
        <WifiResetPasswordTab
          preselectedUser={preselectedUser}
          onClearPreselection={() => setPreselectedUser(null)}
          onSuccessReturn={() => {
            setPreselectedUser(null);
            if (setActiveTab) setActiveTab('users');
          }}
        />
      )}

      {/* 3. Onglet Configuration LDAP (Active Directory / LDAPS) */}
      {activeTab === 'ldap' && (
        <LdapConfigPanel />
      )}

      {/* 4. Onglet Configuration SMTP */}
      {activeTab === 'smtp' && (
        <SmtpConfigTab />
      )}
    </div>
  );
};

export default AdminPanel;

import apiClient from './apiClient';

/**
 * Service dédié aux opérations Wi-Fi & Active Directory
 */
export const wifiService = {
  /**
   * Récupère la liste des utilisateurs Active Directory
   */
  getUsers: async (params = {}) => {
    const response = await apiClient.get('/api/wifi/users', { params });
    return response.data;
  },

  /**
   * Réinitialise le mot de passe Wi-Fi d'un utilisateur sur Active Directory
   */
  resetPassword: async (payload) => {
    const response = await apiClient.post('/api/wifi/reset-password', payload);
    return response.data;
  },

  /**
   * Récupère la configuration SMTP enregistrée
   */
  getSmtpConfig: async () => {
    const response = await apiClient.get('/api/wifi/smtp-config');
    return response.data;
  },

  /**
   * Met à jour la configuration SMTP
   */
  saveSmtpConfig: async (config) => {
    const response = await apiClient.put('/api/wifi/smtp-config', config);
    return response.data;
  },

  /**
   * Teste la connectivité du serveur SMTP avec option d'envoi d'e-mail de test
   */
  testSmtpConnection: async (testEmail = null) => {
    const response = await apiClient.post('/api/wifi/smtp-test', { testEmail });
    return response.data;
  }
};

export default wifiService;

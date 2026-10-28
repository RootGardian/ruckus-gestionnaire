import apiClient from './apiClient';

/**
 * Service dédié à la gestion des configurations LDAP / Active Directory
 */
export const ldapService = {
  /**
   * Récupère la liste des configurations LDAP
   */
  getConfigs: async () => {
    const response = await apiClient.get('/api/ldap-config');
    return response.data;
  },

  /**
   * Crée une nouvelle configuration LDAP
   */
  createConfig: async (config) => {
    const response = await apiClient.post('/api/ldap-config', config);
    return response.data;
  },

  /**
   * Met à jour une configuration LDAP existante
   */
  updateConfig: async (id, config) => {
    const response = await apiClient.put(`/api/ldap-config/${id}`, config);
    return response.data;
  },

  /**
   * Supprime une configuration LDAP
   */
  deleteConfig: async (id) => {
    const response = await apiClient.delete(`/api/ldap-config/${id}`);
    return response.data;
  },

  /**
   * Teste la connexion LDAP / LDAPS
   */
  testConnection: async (config) => {
    const response = await apiClient.post('/api/ldap-config/test', config);
    return response.data;
  },

  /**
   * Récupère les utilisateurs depuis l'AD selon la configuration
   */
  fetchUsers: async (configId) => {
    const response = await apiClient.get('/api/ldap-config/users', {
      params: { configId }
    });
    return response.data;
  }
};

export default ldapService;

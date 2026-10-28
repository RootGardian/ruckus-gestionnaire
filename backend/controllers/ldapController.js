const { LdapConfig } = require('../models');
const { testLdapConnection, getLdapUsers, getLdapGroups } = require('../services/ldapService');

// Helper to sanitize config and never return AD secrets in cleartext to the client
const sanitizeConfig = (config) => {
  if (!config) return null;
  const data = typeof config.toJSON === 'function' ? config.toJSON() : { ...config };
  data.has_bind_password = Boolean(data.bind_password);
  data.bind_password = data.bind_password ? '********' : '';
  return data;
};

// GET all LDAP configurations
const getLdapConfigs = async (req, res) => {
  try {
    const configs = await LdapConfig.findAll();
    res.json(configs.map(sanitizeConfig));
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET single LDAP config by ID
const getLdapConfigById = async (req, res) => {
  try {
    const config = await LdapConfig.findByPk(req.params.id);
    if (!config) return res.status(404).json({ message: 'Configuration non trouvée' });
    res.json(sanitizeConfig(config));
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// CREATE new LDAP config
const createLdapConfig = async (req, res) => {
  try {
    const config = await LdapConfig.create(req.body);
    res.status(201).json(sanitizeConfig(config));
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// UPDATE LDAP config
const updateLdapConfig = async (req, res) => {
  try {
    const config = await LdapConfig.findByPk(req.params.id);
    if (!config) return res.status(404).json({ message: 'Configuration non trouvée' });

    const updateData = { ...req.body };
    // If the password was not modified (placeholder sent), retain the existing encrypted password
    if (updateData.bind_password === '********' || updateData.bind_password === '' || updateData.bind_password === undefined) {
      delete updateData.bind_password;
    }

    await config.update(updateData);
    res.json(sanitizeConfig(config));
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// DELETE LDAP config
const deleteLdapConfig = async (req, res) => {
  try {
    const config = await LdapConfig.findByPk(req.params.id);
    if (!config) return res.status(404).json({ message: 'Configuration non trouvée' });

    await config.destroy();
    res.json({ message: 'Configuration supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// TEST LDAP config
const testLdap = async (req, res) => {
  try {
    const testData = { ...req.body };
    // If the frontend sent masked password, retrieve the stored decrypted password
    if (testData.bind_password === '********' || !testData.bind_password) {
      if (testData.id) {
        const stored = await LdapConfig.findByPk(testData.id);
        if (stored) testData.bind_password = stored.bind_password;
      }
    }

    const result = await testLdapConnection(testData);
    if (result.success) {
      res.json({ success: true, message: "Connexion réussie avec l'Active Directory." });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// GET AD users
const searchUsers = async (req, res) => {
  try {
    const users = await getLdapUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET AD groups
const searchGroups = async (req, res) => {
  try {
    const groups = await getLdapGroups();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET AD OUs & Containers
const searchOUs = async (req, res) => {
  try {
    const { getLdapOUs } = require('../services/ldapService');
    const ous = await getLdapOUs();
    res.json(ous);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getLdapConfigs,
  getLdapConfigById,
  createLdapConfig,
  updateLdapConfig,
  deleteLdapConfig,
  testLdap,
  searchUsers,
  searchGroups,
  searchOUs
};

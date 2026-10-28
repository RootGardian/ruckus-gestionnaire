const { User, LdapConfig } = require('../models');
const bcrypt = require('bcryptjs');
const { logAuditEvent } = require('../services/auditService');

/**
 * Statistiques du tableau de bord d'administration Wi-Fi
 */
const getDashboardStats = async (req, res) => {
  try {
    const [adminCount, ldapConfigCount] = await Promise.all([
      User.count({ where: { is_admin: true } }),
      LdapConfig.count({ where: { is_active: true } })
    ]);

    res.json({
      admins: adminCount,
      total_audits: 0,
      wifi_resets: 0,
      ldap_active: ldapConfigCount > 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques', error: error.message });
  }
};

/**
 * Récupération des comptes administrateurs locaux
 */
const getAdminUsers = async (req, res) => {
  try {
    const admins = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']]
    });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des administrateurs', error: error.message });
  }
};

/**
 * Création d'un administrateur local
 */
const createAdminUser = async (req, res) => {
  try {
    const { matricule, email, password, first_name, last_name, department } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Un compte avec cet email existe déjà.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newAdmin = await User.create({
      matricule: matricule || `ADM_${Date.now()}`,
      email,
      password_hash,
      first_name: first_name || '',
      last_name: last_name || '',
      department: department || 'IT Support',
      is_active: true,
      is_admin: true
    });

    await logAuditEvent({
      type: 'ADMIN',
      action: `Création du compte administrateur local "${email}"`,
      user: req.user ? req.user.email : 'Admin',
      ip: req.ip || '127.0.0.1',
      app: 'Ruckus Wi-Fi Manager',
      status: 'SUCCÈS'
    });

    const userObj = newAdmin.toJSON();
    delete userObj.password_hash;
    res.status(201).json(userObj);
  } catch (error) {
    res.status(500).json({ message: 'Erreur création administrateur', error: error.message });
  }
};

/**
 * Mise à jour d'un administrateur local
 */
const updateAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, department, is_active, password } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Administrateur introuvable.' });
    }

    if (first_name !== undefined) user.first_name = first_name;
    if (last_name !== undefined) user.last_name = last_name;
    if (department !== undefined) user.department = department;
    if (is_active !== undefined) user.is_active = is_active;

    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(password, salt);
    }

    await user.save();

    await logAuditEvent({
      type: 'ADMIN',
      action: `Modification administrateur "${user.email}"`,
      user: req.user ? req.user.email : 'Admin',
      ip: req.ip || '127.0.0.1',
      app: 'Ruckus Wi-Fi Manager',
      status: 'SUCCÈS'
    });

    const userObj = user.toJSON();
    delete userObj.password_hash;
    res.json(userObj);
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour administrateur', error: error.message });
  }
};

/**
 * Suppression d'un administrateur local
 */
const deleteAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Administrateur introuvable.' });
    }

    // Empêcher la suppression de soi-même
    if (req.user && req.user.id === user.id) {
      return res.status(400).json({ message: 'Impossible de supprimer votre propre compte administrateur.' });
    }

    const email = user.email;
    await user.destroy();

    await logAuditEvent({
      type: 'ADMIN',
      action: `Suppression administrateur "${email}"`,
      user: req.user ? req.user.email : 'Admin',
      ip: req.ip || '127.0.0.1',
      app: 'Ruckus Wi-Fi Manager',
      status: 'SUCCÈS'
    });

    res.json({ message: 'Administrateur supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur suppression administrateur', error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser
};

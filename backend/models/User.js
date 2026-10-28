const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { encrypt, decrypt } = require('../utils/cryptoUtils');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  matricule: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  department: {
    type: DataTypes.STRING(100)
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  is_admin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  mfa_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  mfa_secret: {
    type: DataTypes.TEXT,
    set(value) {
      if (value && typeof value === 'string' && value.trim() !== '') {
        this.setDataValue('mfa_secret', encrypt(value));
      } else {
        this.setDataValue('mfa_secret', null);
      }
    },
    get() {
      const raw = this.getDataValue('mfa_secret');
      return decrypt(raw);
    }
  },
  ldap_groups: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'users',
  timestamps: false
});

module.exports = User;

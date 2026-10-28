const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { encrypt, decrypt } = require('../utils/cryptoUtils');

const LdapConfig = sequelize.define('LdapConfig', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: { type: DataTypes.STRING, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
  server: { type: DataTypes.STRING, allowNull: false },
  port: { type: DataTypes.INTEGER, defaultValue: 389 },
  comments: { type: DataTypes.TEXT },
  connection_filter: { type: DataTypes.STRING },
  base_dn: { type: DataTypes.STRING },
  use_bind: { type: DataTypes.BOOLEAN, defaultValue: false },
  bind_dn: { type: DataTypes.STRING },
  bind_password: {
    type: DataTypes.TEXT,
    set(value) {
      if (value && typeof value === 'string' && value.trim() !== '') {
        this.setDataValue('bind_password', encrypt(value));
      } else if (value === null || value === '') {
        this.setDataValue('bind_password', null);
      }
    },
    get() {
      const rawValue = this.getDataValue('bind_password');
      return decrypt(rawValue);
    }
  },
  identifier_field: { type: DataTypes.STRING },
  sync_field: { type: DataTypes.STRING }
}, {
  tableName: 'ldap_configs',
  timestamps: true
});

module.exports = LdapConfig;

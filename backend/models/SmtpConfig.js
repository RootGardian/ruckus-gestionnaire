const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { encrypt, decrypt } = require('../utils/cryptoUtils');

const SmtpConfig = sequelize.define('SmtpConfig', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    defaultValue: 'Serveur SMTP BCRG'
  },
  host: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'smtp.office365.com'
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 587
  },
  secure: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  user: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pass: {
    type: DataTypes.TEXT,
    allowNull: true,
    set(value) {
      if (value && typeof value === 'string' && value.trim() !== '') {
        this.setDataValue('pass', encrypt(value.trim()));
      } else if (value === null || value === '') {
        this.setDataValue('pass', null);
      }
    },
    get() {
      const rawValue = this.getDataValue('pass');
      return decrypt(rawValue);
    }
  },
  from: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Support IT BCRG <wifi-support@bcrg-guinee.org>'
  },
  default_ssid: {
    type: DataTypes.STRING,
    defaultValue: 'CORPORATE-BCRG'
  },
  ignore_tls: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'smtp_configs',
  timestamps: true
});

module.exports = SmtpConfig;

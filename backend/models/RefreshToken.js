const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  revoked_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  revoked_by_ip: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  replaced_by_token: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id', 'revoked'] // Index composite ultra-rapide pour la validation des sessions
    },
    {
      fields: ['token']
    }
  ]
});

module.exports = RefreshToken;

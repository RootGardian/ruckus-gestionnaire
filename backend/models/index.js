const { sequelize } = require('../config/db');
const User = require('./User');
const LdapConfig = require('./LdapConfig');
const SmtpConfig = require('./SmtpConfig');
const RefreshToken = require('./RefreshToken');

// Relations pour les administrateurs locaux et leurs sessions
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refresh_tokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  LdapConfig,
  SmtpConfig,
  RefreshToken
};

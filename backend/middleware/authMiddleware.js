const jwt = require('jsonwebtoken');
const { User, RefreshToken } = require('../models');
const { Op } = require('sequelize');
const { getPublicKey, hasAsymmetricKeys } = require('../config/jwtKeys');

const protect = async (req, res, next) => {
  let token;

  // 1. Vérification en priorité du Cookie HttpOnly
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // 2. Repli vers l'en-tête Authorization Bearer
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const key = getPublicKey();
      const decoded = hasAsymmetricKeys()
        ? jwt.verify(token, key, { algorithms: ['RS256'] })
        : jwt.verify(token, key);
      
      const refreshTokenCookie = req.cookies?.refreshToken;

      const [user, sessionRecord] = await Promise.all([
        User.findByPk(decoded.id, {
          attributes: { exclude: ['password_hash'] }
        }),
        refreshTokenCookie
          ? RefreshToken.findOne({ where: { token: refreshTokenCookie, user_id: decoded.id } })
          : Promise.resolve(null)
      ]);

      req.user = user;

      if (!req.user || !req.user.is_active) {
        return res.status(401).json({ message: 'Compte inactif ou utilisateur introuvable', revoked: true });
      }

      // Actualisation de l'activité en base
      if (sessionRecord) {
        if (Date.now() - new Date(sessionRecord.updatedAt).getTime() > 20000) {
          sessionRecord.changed('updatedAt', true);
          sessionRecord.save().catch(() => {});
        }
      }

      // Vérification immédiate de la validité de la session
      if (refreshTokenCookie) {
        if (!sessionRecord || sessionRecord.revoked || (sessionRecord.expires_at && new Date(sessionRecord.expires_at) < new Date())) {
          const hasActiveSession = await RefreshToken.findOne({
            where: {
              user_id: req.user.id,
              revoked: false,
              expires_at: { [Op.gt]: new Date() }
            }
          });
          if (!hasActiveSession) {
            return res.status(401).json({
              message: 'Votre session a été révoquée par un administrateur.',
              revoked: true
            });
          }
        }
      }

      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Non autorisé, token invalide ou expiré' });
    }
  }

  return res.status(401).json({ message: 'Non autorisé, pas de token de session' });
};

const admin = async (req, res, next) => {
  try {
    if (req.user && req.user.is_admin) {
      return next();
    }
    return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur de vérification des droits', error: error.message });
  }
};

module.exports = { protect, admin };

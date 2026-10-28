const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, RefreshToken } = require('../models');
const { authenticateLdap, formatLdapErrorMessage } = require('../services/ldapService');
const { getPrivateKey, getPublicKey, hasAsymmetricKeys } = require('../config/jwtKeys');
const { generateMfaSecret, verifyMfaToken } = require('../services/mfaService');
const { logAuditEvent } = require('../services/auditService');
const { Op } = require('sequelize');
const crypto = require('crypto');

const ACCESS_TOKEN_EXPIRY = '15m';
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_DAYS = 7;
const REFRESH_TOKEN_MAX_AGE = REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000;

const generateAccessToken = (id) => {
  const key = getPrivateKey();
  if (hasAsymmetricKeys()) {
    return jwt.sign({ id }, key, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      algorithm: 'RS256'
    });
  }
  return jwt.sign({ id }, key, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

const generateToken = generateAccessToken;

const getAccessTokenCookieOptions = () => {
  const isHttps = process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true';
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'strict' : 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE,
    path: '/'
  };
};

const getRefreshTokenCookieOptions = () => {
  const isHttps = process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true';
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'strict' : 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/'
  };
};

const generateOpaqueRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

const issueSessionTokens = async (user, req, res) => {
  const accessToken = generateAccessToken(user.id);
  const refreshTokenValue = generateOpaqueRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  await RefreshToken.create({
    user_id: user.id,
    token: refreshTokenValue,
    expires_at: expiresAt,
    ip_address: clientIp,
    user_agent: userAgent,
    revoked: false
  });

  res.cookie('token', accessToken, getAccessTokenCookieOptions());
  res.cookie('refreshToken', refreshTokenValue, getRefreshTokenCookieOptions());

  return { accessToken, refreshToken: refreshTokenValue };
};

const formatAuthResponse = (user, token = null) => {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    matricule: user.matricule,
    department: user.department,
    is_admin: user.is_admin,
    is_active: user.is_active,
    mfa_enabled: user.mfa_enabled,
    token: token || generateToken(user.id)
  };
};

// Connexion de l'administrateur
const loginUser = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Identifiant et mot de passe requis." });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  try {
    let user = null;
    let isAuthenticated = false;

    // 1. Tenter la vérification sur la base locale d'administration
    user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { matricule: identifier }
        ]
      }
    });

    if (user && user.password_hash) {
      const match = await bcrypt.compare(password, user.password_hash);
      if (match) {
        isAuthenticated = true;
      }
    }

    // 2. Si non trouvé ou mot de passe non concordant en local, tenter LDAP
    if (!isAuthenticated) {
      try {
        const ldapResult = await authenticateLdap(identifier, password);
        if (ldapResult && ldapResult.success) {
          isAuthenticated = true;
          // Si l'utilisateur LDAP est un admin connu ou autorisé
          if (!user) {
            user = await User.findOne({ where: { email: ldapResult.user.mail || identifier } });
          }
        }
      } catch (e) {
        // ignorer
      }
    }

    if (!isAuthenticated || !user) {
      await logAuditEvent({
        type: 'AUTH',
        action: `Échec d'authentification pour "${identifier}"`,
        user: identifier,
        ip: clientIp,
        app: 'Ruckus Wi-Fi Manager',
        status: 'ÉCHEC'
      });
      return res.status(401).json({ message: "Identifiants invalides ou compte inexistant." });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Ce compte administrateur est désactivé." });
    }

    // 3. Gestion MFA si activé pour cet utilisateur
    if (user.mfa_enabled) {
      const tempToken = jwt.sign(
        { id: user.id, mfa_pending: true },
        getPrivateKey(),
        { expiresIn: '5m' }
      );
      return res.json({
        mfa_required: true,
        temp_token: tempToken,
        user_id: user.id
      });
    }

    // 4. Émission des jetons de session
    const { accessToken } = await issueSessionTokens(user, req, res);

    await logAuditEvent({
      type: 'AUTH',
      action: `Connexion réussie administrateur "${user.email}"`,
      user: user.email,
      ip: clientIp,
      app: 'Ruckus Wi-Fi Manager',
      status: 'SUCCÈS'
    });

    return res.json(formatAuthResponse(user, accessToken));

  } catch (error) {
    console.error("Erreur loginUser:", error);
    return res.status(500).json({ message: "Erreur serveur lors de la connexion.", error: error.message });
  }
};

// Vérification du code MFA (TOTP)
const verifyMfa = async (req, res) => {
  const { temp_token, code } = req.body;

  if (!temp_token || !code) {
    return res.status(400).json({ message: "Jeton temporaire et code TOTP requis." });
  }

  try {
    const key = getPublicKey();
    const decoded = jwt.verify(temp_token, key);

    if (!decoded.mfa_pending || !decoded.id) {
      return res.status(401).json({ message: "Jeton de validation MFA invalide." });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: "Utilisateur non autorisé." });
    }

    const isValid = verifyMfaToken(user.mfa_secret, code);
    if (!isValid) {
      return res.status(401).json({ message: "Code à 6 chiffres incorrect ou expiré." });
    }

    const { accessToken } = await issueSessionTokens(user, req, res);

    await logAuditEvent({
      type: 'AUTH',
      action: `Validation MFA réussie pour "${user.email}"`,
      user: user.email,
      ip: req.ip || '127.0.0.1',
      app: 'Ruckus Wi-Fi Manager',
      status: 'SUCCÈS'
    });

    return res.json(formatAuthResponse(user, accessToken));

  } catch (err) {
    return res.status(401).json({ message: "Session de validation MFA expirée." });
  }
};

// Renouvellement transparent de session (Token Rotation)
const refreshSession = async (req, res) => {
  const currentRefreshToken = req.cookies?.refreshToken;

  if (!currentRefreshToken) {
    return res.status(401).json({ message: "Refresh token manquant." });
  }

  try {
    const tokenRecord = await RefreshToken.findOne({
      where: { token: currentRefreshToken }
    });

    if (tokenRecord && tokenRecord.revoked) {
      await RefreshToken.update(
        { revoked: true, revoked_at: new Date() },
        { where: { user_id: tokenRecord.user_id } }
      );
      return res.status(401).json({ message: "Session révoquée pour suspicion de réutilisation.", revoked: true });
    }

    if (!tokenRecord || new Date(tokenRecord.expires_at) < new Date()) {
      return res.status(401).json({ message: "Session expirée. Veuillez vous reconnecter." });
    }

    const user = await User.findByPk(tokenRecord.user_id);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: "Utilisateur introuvable ou désactivé." });
    }

    // Rotation du Refresh Token
    tokenRecord.revoked = true;
    tokenRecord.revoked_at = new Date();
    await tokenRecord.save();

    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateOpaqueRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);

    await RefreshToken.create({
      user_id: user.id,
      token: newRefreshToken,
      expires_at: expiresAt,
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'Unknown',
      revoked: false
    });

    res.cookie('token', newAccessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', newRefreshToken, getRefreshTokenCookieOptions());

    return res.json({ token: newAccessToken });

  } catch (error) {
    return res.status(500).json({ message: "Erreur lors du rafraîchissement.", error: error.message });
  }
};

// Déconnexion administrateur
const logoutUser = async (req, res) => {
  try {
    const currentRefreshToken = req.cookies?.refreshToken;
    const isHttps = process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true';

    if (currentRefreshToken) {
      await RefreshToken.update(
        { revoked: true, revoked_at: new Date() },
        { where: { token: currentRefreshToken } }
      );
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'strict' : 'lax',
      path: '/'
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'strict' : 'lax',
      path: '/'
    });

    return res.json({ success: true, message: "Déconnexion réussie." });
  } catch (error) {
    return res.status(500).json({ message: "Erreur déconnexion", error: error.message });
  }
};

// Récupération du profil administrateur connecté
const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Non authentifié" });
  }
  return res.json({
    id: req.user.id,
    first_name: req.user.first_name,
    last_name: req.user.last_name,
    email: req.user.email,
    matricule: req.user.matricule,
    department: req.user.department,
    is_admin: req.user.is_admin,
    mfa_enabled: req.user.mfa_enabled
  });
};

// Modification du mot de passe admin local
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Nouveau mot de passe invalide (min 6 car)." });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Mot de passe actuel incorrect." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json({ message: "Mot de passe administrateur modifié avec succès." });
  } catch (error) {
    return res.status(500).json({ message: "Erreur modification mot de passe", error: error.message });
  }
};

const registerUser = async (req, res) => {
  // Optionnel
  res.status(403).json({ message: "L'enregistrement direct est désactivé. Utilisez l'administration." });
};

module.exports = {
  loginUser,
  verifyMfa,
  refreshSession,
  logoutUser,
  getMe,
  changePassword,
  registerUser
};

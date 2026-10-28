import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, Loader2, ShieldCheck, Smartphone, ArrowLeft, KeyRound, CheckCircle2, X, Copy, Check } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import hubLogo from '../assets/bcrg-hub-svg.svg.png';
import './Login.css';

const cleanLdapError = (rawMsg) => {
  if (!rawMsg) return "Identifiant ou mot de passe incorrect.";
  const msg = String(rawMsg);
  if (/data 52e|data 525|80090308|InvalidCredentials|DSID-0C090532/i.test(msg)) {
    return "Email ou mot de passe incorrect.";
  }
  if (/data 530/i.test(msg)) {
    return "Connexion non autorisée sur cette plage horaire (politique horaire Active Directory).";
  }
  if (/data 531/i.test(msg)) {
    return "Connexion non autorisée depuis ce poste de travail.";
  }
  if (/data 532/i.test(msg)) {
    return "Votre mot de passe a expiré. Veuillez le renouveler.";
  }
  if (/data 533/i.test(msg)) {
    return "Votre compte est désactivé. Veuillez contacter le support informatique de la BCRG.";
  }
  if (/data 701/i.test(msg)) {
    return "Votre compte a expiré. Veuillez contacter le support informatique de la BCRG.";
  }
  if (/data 773/i.test(msg)) {
    return "Vous devez réinitialiser votre mot de passe avant de pouvoir vous connecter.";
  }
  if (/data 775/i.test(msg)) {
    return "Compte verrouillé suite à plusieurs tentatives infructueuses. Veuillez patienter ou contacter le support informatique.";
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|connect ECONN/i.test(msg)) {
    return "Le serveur Active Directory est temporairement inaccessible. Veuillez vérifier la connexion au réseau interne de la Banque Centrale.";
  }
  return msg.replace(/^Erreur LDAP\s*:\s*/i, '');
};

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // MFA State
  const [mfaData, setMfaData] = useState(null); // { temp_token, mfa_setup, qr_code, secret, message }
  const [mfaCode, setMfaCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const otpInputRef = useRef(null);

  const handleCopySecret = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2500);
  };

  const navigate = useNavigate();
  const location = useLocation();
  const [sloNotice, setSloNotice] = useState(null);

  // Détection du message de déconnexion globale ou révocation avec disparition après 10s
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const isRevoked = searchParams.get('revoked') === 'true';
    const isSlo = searchParams.get('slo') === 'true';

    if (isRevoked) {
      setSloNotice("Votre session a été révoquée par un administrateur. Vous avez été déconnecté du HUB.");
      window.history.replaceState({}, document.title, window.location.pathname);
      const timer = setTimeout(() => {
        setSloNotice(null);
      }, 10000);
      return () => clearTimeout(timer);
    } else if (isSlo) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setSloNotice("Déconnexion globale (SLO) réussie : votre session et vos accès applicatifs ont été révoqués.");
      window.history.replaceState({}, document.title, window.location.pathname);
      const timer = setTimeout(() => {
        setSloNotice(null);
      }, 10000);
      return () => clearTimeout(timer);
    } else if (location.state?.sloMessage) {
      setSloNotice(location.state.sloMessage);
      // Nettoyer immédiatement l'historique de navigation pour ne pas réafficher le message après connexion
      window.history.replaceState({}, document.title);
      const timer = setTimeout(() => {
        setSloNotice(null);
      }, 10000); // Disparaît après 10 secondes
      return () => clearTimeout(timer);
    }
  }, [location]);



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSloNotice(null); // Ne plus afficher le message de déconnexion dès la tentative de connexion
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        { identifier, password },
        { withCredentials: true }
      );

      // Si le second facteur MFA (Microsoft Authenticator) est exigé
      if (response.data.mfa_required) {
        setMfaData(response.data);
        setIsLoading(false);
        return;
      }

      // Connexion directe : sauvegarde du token et des données utilisateur
      const { token, ...userData } = response.data;
      if (token) {
        localStorage.setItem('token', token);
      }
      localStorage.setItem('user', JSON.stringify(userData));
      navigate('/admin');

    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(cleanLdapError(err.response.data.message));
      } else {
        setError("Erreur de connexion au serveur backend");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/mfa/verify`,
        {
          temp_token: mfaData.temp_token,
          code: mfaCode
        },
        { withCredentials: true }
      );

      // Validation MFA réussie : sauvegarde du token et des données utilisateur
      const { token, ...userData } = response.data;
      if (token) {
        localStorage.setItem('token', token);
      }
      localStorage.setItem('user', JSON.stringify(userData));
      navigate('/admin');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Code Microsoft Authenticator invalide ou expiré");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelMfa = () => {
    setMfaData(null);
    setMfaCode('');
    setError('');
  };

  return (
    <div className="login-container">
      {/* Côté gauche (Branding) */}
      <div className="login-left">
        <div className="branding-content">
          <div className="logo-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src={hubLogo} alt="BCRG HUB Logo" className="logo-icon" />
            <h1>BCRG WI-FI MANAGER</h1>
          </div>
        </div>

        {/* Motif de points en bas à gauche */}
        <div className="dot-pattern">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="dot"></div>
          ))}
        </div>
      </div>

      {/* Côté droit (Formulaire) */}
      <div className="login-right">
        <div className="form-wrapper">
          {/* Si étape MFA */}
          {mfaData ? (
            <div className="mfa-view-container">
              <div className="form-header" style={{ marginBottom: '20px' }}>
                <div className="mfa-badge">
                  <span className="mfa-badge-dot"></span>
                  <Smartphone size={15} />
                  <span>Microsoft Authenticator (2FA)</span>
                </div>
                <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                  {mfaData.mfa_setup ? "Configuration 2FA" : "Validation à deux facteurs"}
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: '1.4', margin: 0 }}>
                  {mfaData.mfa_setup
                    ? "Associez votre application d'authentification pour sécuriser votre compte institutionnel BCRG."
                    : (mfaData.message || "Veuillez saisir le code à 6 chiffres généré par votre application.")}
                </p>
              </div>

              {error && (
                <div className="mfa-error-banner">
                  <X size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Si configuration initiale : affichage du QR Code */}
              {mfaData.mfa_setup && mfaData.qr_code && (
                <div style={{ marginBottom: '24px' }}>
                  <div className="mfa-step-header" style={{ marginBottom: '12px' }}>
                    <span className="mfa-step-num">1</span>
                    <span className="mfa-step-title">Scannez ce QR Code dans Microsoft Authenticator :</span>
                  </div>

                  <div className="mfa-setup-card" style={{ marginBottom: 0 }}>
                    <div className="mfa-qr-wrapper">
                      <div className="mfa-qr-frame">
                        <img
                          src={mfaData.qr_code}
                          alt="QR Code TOTP"
                          className="mfa-qr-img"
                        />
                      </div>
                    </div>

                    {mfaData.secret && (
                      <div className="mfa-secret-section">
                        <span className="mfa-secret-label">Clé de configuration manuelle :</span>
                        <div className="mfa-secret-box">
                          <code className="mfa-secret-code">{mfaData.secret}</code>
                          <button
                            type="button"
                            className={`mfa-copy-btn ${copiedSecret ? 'copied' : ''}`}
                            onClick={() => handleCopySecret(mfaData.secret)}
                            title="Copier la clé secrète"
                          >
                            {copiedSecret ? (
                              <>
                                <Check size={14} /> Copié !
                              </>
                            ) : (
                              <>
                                <Copy size={14} /> Copier
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mfa-tip-box">
                      <span>Compatible avec <strong>Microsoft Authenticator</strong> et <strong>Google Authenticator</strong>.</span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleMfaSubmit} className="mfa-form">
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    {mfaData.mfa_setup && <span className="mfa-step-num">2</span>}
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.5px', color: '#334155' }}>
                      {mfaData.mfa_setup ? "CODE À 6 CHIFFRES GÉNÉRÉ" : "CODE TEMPORAIRE DE SÉCURITÉ"}
                    </span>
                  </label>

                  {/* 6-DIGIT OTP SEGMENTED DISPLAY */}
                  <div className="otp-wrapper" onClick={() => otpInputRef.current?.focus()}>
                    <input
                      ref={otpInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      autoFocus
                      maxLength={6}
                      className="otp-hidden-input"
                    />

                    <div className="otp-boxes-grid">
                      {[0, 1, 2, 3, 4, 5].map((index) => {
                        const digit = mfaCode[index] || '';
                        const isCurrent = mfaCode.length === index;
                        return (
                          <div
                            key={index}
                            className={`otp-slot ${digit ? 'filled' : ''} ${isCurrent ? 'active' : ''}`}
                          >
                            {digit ? (
                              <span className="otp-digit">{digit}</span>
                            ) : isCurrent ? (
                              <span className="otp-cursor"></span>
                            ) : (
                              <span className="otp-placeholder">•</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="otp-status-text">
                    {mfaCode.length === 6 ? (
                      <span style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 size={14} /> Code à 6 chiffres saisi
                      </span>
                    ) : (
                      <span>Saisissez les 6 chiffres affichés dans l'application</span>
                    )}
                  </div>
                </div>

                <div className="mfa-buttons-row">
                  <button
                    type="button"
                    onClick={handleCancelMfa}
                    className="btn-mfa-cancel"
                  >
                    <ArrowLeft size={16} /> Annuler
                  </button>

                  <button
                    type="submit"
                    className={`btn-mfa-submit ${mfaCode.length === 6 ? 'ready' : ''}`}
                    disabled={isLoading || mfaCode.length < 6}
                  >
                    {isLoading ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <Loader2 size={18} className="spinner" />
                        <span>Validation...</span>
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={18} />
                        <span>Valider l'accès</span>
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Étape 1 : Identifiant + Mot de passe */
            <div>
              <div className="form-header">
                <h2>Connexion</h2>
                <p>Veuillez renseigner vos identifiants pour accéder à l'application.</p>
              </div>

              {sloNotice && !error && (
                <div style={{
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  lineHeight: 1.4
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0 }} />
                    <span>{sloNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSloNotice(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#059669',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: 0.8
                    }}
                    title="Fermer"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {error && (
                <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>EMAIL</label>
                  <div className="input-container">
                    <User className="input-icon" size={18} />
                    <input
                      type="text"
                      placeholder="ahmedr.bangoura@bcrg-guinee.org"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>MOT DE PASSE</label>
                  <div className="input-container">
                    <Lock className="input-icon" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-submit" disabled={isLoading}>
                  {isLoading ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Loader2 size={18} className="spinner" />
                      <span>Connexion...</span>
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <LogIn size={18} />
                      <span>Se Connecter</span>
                    </span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="login-footer">
          © 2026 Banque Centrale de la République de Guinée. Tous droits réservés.
        </div>
      </div>
    </div>
  );
};

export default Login;

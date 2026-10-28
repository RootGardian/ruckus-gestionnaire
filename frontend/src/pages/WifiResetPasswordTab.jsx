import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  Copy,
  Check,
  Unlock,
  RefreshCw,
  Search,
  Sparkles,
  Mail,
  Lock,
  ShieldAlert,
  ShieldCheck,
  X
} from 'lucide-react';
import './AdminPanel.css';

const PROTECTED_ACCOUNTS = ['krbtgt', 'administrator', 'administrateur', 'admin', 'guest', 'invité', 'invite', 'defaultaccount', 'system'];

const isProtectedAccount = (u) => {
  if (!u) return false;
  if (u.is_protected) return true;
  const id = String(u.identifier || u.name || '').trim().toLowerCase();
  return id.endsWith('$') || PROTECTED_ACCOUNTS.includes(id);
};

const WifiResetPasswordTab = ({ preselectedUser, onClearPreselection, onSuccessReturn }) => {
  const [selectedUser, setSelectedUser] = useState(preselectedUser || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Formulaire de mot de passe (Défini par l'admin)
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);

  // Réseau Wi-Fi cible : CORPORATE-BCRG
  const selectedSsid = 'CORPORATE-BCRG';

  // Option d'envoi par e-mail (Contrôlé par l'admin)
  const [sendEmail, setSendEmail] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [unlockAccount, setUnlockAccount] = useState(true);
  const [expiryOption, setExpiryOption] = useState('never'); // 'never' | 'domain' | 'duration'
  const [durationDays, setDurationDays] = useState('90');
  const [mustChangeAtNextLogon, setMustChangeAtNextLogon] = useState(false);
  const [notes, setNotes] = useState('');

  // États d'exécution
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Synchronisation si l'utilisateur provient de l'onglet Utilisateurs
  useEffect(() => {
    if (preselectedUser) {
      if (isProtectedAccount(preselectedUser)) {
        setError("Compte système protégé — modification interdite via la console Wi-Fi.");
        setSelectedUser(null);
        return;
      }
      setSelectedUser(preselectedUser);
      const adEmail = preselectedUser.email || preselectedUser.mail || preselectedUser.userPrincipalName || '';
      setRecipientEmail(adEmail);
      setSendEmail(Boolean(adEmail));
      generateStrongPassword();
      setResult(null);
      setError('');
    }
  }, [preselectedUser]);

  // Recherche dynamique AD
  useEffect(() => {
    if (!searchQuery.trim() || selectedUser) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const res = await axios.get(`${API_URL}/api/wifi/users`, {
          ...headers,
          params: { search: searchQuery }
        });
        setSearchResults(Array.isArray(res.data) ? res.data.slice(0, 8) : []);
      } catch (e) {
        // ignorer
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedUser]);

  // Générateur de mot de passe cryptographiquement sûr (Web Crypto API)
  // Respecte rigoureusement la nomenclature BCRG : Bcrg@<3 lettres>@<2 chiffres> (ex: Bcrg@KMP@86)
  const generateStrongPassword = () => {
    try {
      if (window.crypto && window.crypto.getRandomValues) {
        const lettersPool = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const array = new Uint32Array(4);
        window.crypto.getRandomValues(array);
        let letters = '';
        for (let i = 0; i < 3; i++) {
          letters += lettersPool[array[i] % lettersPool.length];
        }
        const twoDigits = 10 + (array[3] % 90); // 2 chiffres 100% imprédictibles
        const pwd = `Bcrg@${letters}@${twoDigits}`;
        setPassword(pwd);
        return;
      }
    } catch (err) {
      console.warn("Web Crypto API fallback:", err);
    }
  };

  const handleSelectUser = (u) => {
    if (isProtectedAccount(u)) {
      setError("Compte système protégé — modification interdite via la console Wi-Fi.");
      return;
    }
    setError('');
    setSelectedUser(u);
    const adEmail = u.email || u.mail || u.userPrincipalName || '';
    setRecipientEmail(adEmail);
    setSendEmail(Boolean(adEmail));
    setSearchQuery('');
    setSearchResults([]);
    if (!password) {
      generateStrongPassword();
    }
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setRecipientEmail('');
    setSendEmail(false);
    if (onClearPreselection) onClearPreselection();
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (!selectedUser) {
      setError("Veuillez sélectionner un utilisateur Active Directory.");
      return;
    }
    if (isProtectedAccount(selectedUser)) {
      setError("Compte système protégé — modification interdite via la console Wi-Fi.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    setError('');
    setShowConfirmModal(true);
  };

  const handleConfirmReset = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const payload = {
        identifier: selectedUser.identifier,
        newPassword: password,
        sendEmail: Boolean(sendEmail),
        recipientEmail: sendEmail ? recipientEmail : null,
        ssid: selectedSsid,
        unlockAccount,
        passwordNeverExpires: expiryOption === 'never',
        mustChangeAtNextLogon: expiryOption === 'never' ? false : mustChangeAtNextLogon,
        accountExpiresInDays: expiryOption === 'duration' ? parseInt(durationDays, 10) : null,
        notes
      };

      const emailFailed = Boolean(res.data.email?.requested && !res.data.email?.sent);
      setResult(res.data);
      if (!emailFailed) {
        setCountdown(5);
      } else {
        setCountdown(null);
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError(" Limite de sécurité atteinte (Anti-Déni de Service) : Plus de 10 réinitialisations par minute ont été exécutées. Cette tentative anormale a été bloquée et signalée au système de sécurité.");
      } else {
        setError(err.response?.data?.message || "Échec de la réinitialisation Active Directory.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Compte à rebours de 5 secondes pour retourner automatiquement à la liste des Utilisateurs
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      if (onSuccessReturn) {
        onSuccessReturn();
      }
      setResult(null);
      setCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onSuccessReturn]);

  const handleReturnNow = () => {
    if (onSuccessReturn) onSuccessReturn();
    setResult(null);
    setCountdown(null);
  };

  const handleCancelAutoReturn = () => {
    setCountdown(null);
  };

  const copyCredentials = () => {
    if (!selectedUser || !password) return;
    const text = `Réseau Wi-Fi BCRG : ${selectedSsid}\nIdentifiant : ${selectedUser.identifier}\nNouveau Mot de passe : ${password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* FORMULAIRE DE RÉINITIALISATION DANS CONTENEUR BLANC */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '28px 32px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
      }}>
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleOpenConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 1. Réseau Wi-Fi cible : CORPORATE-BCRG */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#143826', marginBottom: '10px' }}>
              1. Réseau Wi-Fi Ruckus cible
            </label>
            <div style={{
              border: '2px solid #143826',
              background: '#f0fdf4',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Wifi size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#143826', fontSize: '1.05rem', letterSpacing: '0.5px' }}>
                  CORPORATE-BCRG
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Réseau officiel de l'institution • Authentification 802.1X / RADIUS sur Active Directory
                </div>
              </div>
            </div>
          </div>

          {/* 2. Sélection de l'utilisateur Active Directory */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#143826', marginBottom: '8px' }}>
              2. Utilisateur Active Directory cible *
            </label>

            {selectedUser ? (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#143826',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.95rem'
                  }}>
                    {selectedUser.identifier ? selectedUser.identifier.slice(0, 2).toUpperCase() : 'AD'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                      {selectedUser.name || selectedUser.identifier}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Identifiant AD : <strong style={{ color: '#143826' }}>{selectedUser.identifier}</strong> {selectedUser.email ? `• ${selectedUser.email}` : ''}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearUser}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Changer
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Rechercher par sAMAccountName, email, nom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 46px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    outline: 'none',
                    background: '#ffffff'
                  }}
                />

                {searching && (
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.82rem', color: '#64748b' }}>
                    Recherche...
                  </span>
                )}

                {searchResults.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    marginTop: '6px',
                    zIndex: 50,
                    maxHeight: '220px',
                    overflowY: 'auto'
                  }}>
                    {searchResults.map((u, i) => {
                      const protectedAcc = isProtectedAccount(u);
                      return (
                        <div
                          key={i}
                          onClick={() => {
                            if (protectedAcc) {
                              setError("Compte système protégé — modification interdite via la console Wi-Fi.");
                            } else {
                              handleSelectUser(u);
                            }
                          }}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: protectedAcc ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: protectedAcc ? '#fef2f2' : '#ffffff',
                            opacity: protectedAcc ? 0.9 : 1
                          }}
                          onMouseEnter={(e) => { if (!protectedAcc) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                          onMouseLeave={(e) => { if (!protectedAcc) e.currentTarget.style.backgroundColor = '#ffffff'; }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: protectedAcc ? '#991b1b' : '#0f172a' }}>
                              {u.name || u.identifier}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              {u.identifier} • {u.email || 'Pas d\'email'}
                            </div>
                          </div>
                          {protectedAcc ? (
                            <span
                              title="Compte système protégé — modification interdite via la console Wi-Fi"
                              style={{
                                fontSize: '0.72rem',
                                color: '#991b1b',
                                background: '#fee2e2',
                                border: '1px solid #fecaca',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <ShieldAlert size={12} style={{ color: '#dc2626' }} />
                              Compte système protégé — modification interdite via la console Wi-Fi
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.82rem', color: '#143826', fontWeight: 700 }}>
                              Sélectionner
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Définition du mot de passe par l'administrateur */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.9rem', color: '#143826' }}>
                3. Mot de Passe Wi-Fi (Défini par l'Admin) *
              </label>
              <button
                type="button"
                onClick={generateStrongPassword}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#143826',
                  cursor: 'pointer'
                }}
              >
                <Sparkles size={14} />
                Générer un mot de passe fort
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Saisissez manuellement ou générez le mot de passe..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 50px 12px 46px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '1.05rem',
                  fontFamily: showPassword ? 'monospace' : 'inherit',
                  letterSpacing: showPassword ? '1.5px' : 'normal',
                  outline: 'none',
                  background: '#ffffff',
                  fontWeight: 700,
                  color: '#0f172a'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '10px',
              fontSize: '0.78rem',
              color: '#64748b',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={13} style={{ color: '#16a34a' }} />
                Nomenclature BCRG : <strong>Bcrg@&lt;3 lettres&gt;@&lt;2 chiffres&gt;</strong>
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#f0fdf4',
                color: '#15803d',
                padding: '3px 8px',
                borderRadius: '6px',
                fontWeight: 600
              }}>
                <Sparkles size={12} />
                Cryptographiquement sûr (Web Crypto API : window.crypto.getRandomValues())
              </span>
            </div>

          </div>

          {/* 4. Politique d'expiration & Options Active Directory */}
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            background: '#ffffff'
          }}>
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.95rem', color: '#143826', marginBottom: '12px' }}>
              4. Politique d'expiration & Options Active Directory
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Option A: N'expire jamais */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '8px',
                border: expiryOption === 'never' ? '2px solid #143826' : '1px solid #cbd5e1',
                background: expiryOption === 'never' ? '#f0fdf4' : '#ffffff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                color: expiryOption === 'never' ? '#143826' : '#334155'
              }}>
                <input
                  type="radio"
                  name="expiryOption"
                  value="never"
                  checked={expiryOption === 'never'}
                  onChange={() => setExpiryOption('never')}
                  style={{ accentColor: '#143826', width: '16px', height: '16px' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>Le mot de passe n'expire jamais (Password Never Expires)</span>
                  <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 400 }}>
                    Recommandé pour les accès Wi-Fi continus, cadres et comptes fixes de la BCRG
                  </span>
                </div>
              </label>

              {/* Option B: Politique standard du domaine */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '8px',
                border: expiryOption === 'domain' ? '2px solid #143826' : '1px solid #cbd5e1',
                background: expiryOption === 'domain' ? '#f0fdf4' : '#ffffff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                color: expiryOption === 'domain' ? '#143826' : '#334155'
              }}>
                <input
                  type="radio"
                  name="expiryOption"
                  value="domain"
                  checked={expiryOption === 'domain'}
                  onChange={() => setExpiryOption('domain')}
                  style={{ accentColor: '#143826', width: '16px', height: '16px' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>Appliquer la politique d'expiration par défaut du domaine AD</span>
                  <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 400 }}>
                    Le mot de passe expirera selon la règle configurée sur le contrôleur de domaine (ex: 90 jours)
                  </span>
                </div>
              </label>

              {/* Option C: Donner une durée spécifique */}
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                border: expiryOption === 'duration' ? '2px solid #143826' : '1px solid #cbd5e1',
                background: expiryOption === 'duration' ? '#f0fdf4' : '#ffffff'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  color: expiryOption === 'duration' ? '#143826' : '#334155'
                }}>
                  <input
                    type="radio"
                    name="expiryOption"
                    value="duration"
                    checked={expiryOption === 'duration'}
                    onChange={() => setExpiryOption('duration')}
                    style={{ accentColor: '#143826', width: '16px', height: '16px' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>Définir une durée de validité du compte (Prestataires / Temporaires)</span>
                    <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 400 }}>
                      Le compte Active Directory expirera automatiquement à l'échéance choisie
                    </span>
                  </div>
                </label>

                {expiryOption === 'duration' && (
                  <div style={{ marginTop: '10px', marginLeft: '26px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Durée de validité :</span>
                    <select
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        background: '#ffffff',
                        color: '#143826'
                      }}
                    >
                      <option value="15">15 jours (2 semaines)</option>
                      <option value="30">30 jours (1 mois)</option>
                      <option value="60">60 jours (2 mois)</option>
                      <option value="90">90 jours (3 mois)</option>
                      <option value="180">180 jours (6 mois)</option>
                      <option value="365">365 jours (1 an)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Cases à cocher complémentaires */}
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={unlockAccount}
                  onChange={(e) => setUnlockAccount(e.target.checked)}
                  style={{ accentColor: '#143826', width: '16px', height: '16px' }}
                />
                <span>Déverrouiller le compte Active Directory s'il était verrouillé</span>
              </label>
            </div>
          </div>

          {/* 5. Option d'envoi par e-mail (Récupéré directement depuis l'AD) */}
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            background: sendEmail && selectedUser && recipientEmail ? '#f0fdf4' : '#f8fafc',
            transition: 'background 0.3s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontWeight: 800,
                fontSize: '0.95rem',
                color: sendEmail ? '#143826' : '#334155',
                cursor: selectedUser && recipientEmail ? 'pointer' : 'not-allowed'
              }}>
                <input
                  type="checkbox"
                  checked={sendEmail && Boolean(selectedUser && recipientEmail)}
                  disabled={!selectedUser || !recipientEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#143826', cursor: selectedUser && recipientEmail ? 'pointer' : 'not-allowed' }}
                />
                Envoyer automatiquement la fiche d'accès par e-mail au collaborateur
              </label>

              {selectedUser && recipientEmail && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  <CheckCircle2 size={13} />
                  Récupéré directement depuis l'AD
                </span>
              )}
            </div>

            <p style={{ margin: '4px 0 0 30px', fontSize: '0.82rem', color: '#64748b' }}>
              {!selectedUser
                ? "Sélectionnez un compte Active Directory ci-dessus pour récupérer automatiquement son adresse e-mail."
                : !recipientEmail
                  ? "Aucune adresse e-mail n'est renseignée dans l'annuaire Active Directory pour cet utilisateur."
                  : sendEmail
                    ? `Le collaborateur recevra une notification avec ses identifiants pour le réseau ${selectedSsid}.`
                    : "Option décochée : le mot de passe sera uniquement appliqué dans l'Active Directory sans notification par courriel."}
            </p>

            {/* Champ e-mail et consigne */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  <span>Adresse e-mail destinataire (Active Directory) *</span>
                  {selectedUser && recipientEmail && (
                    <span style={{ color: '#166534', fontSize: '0.75rem', fontWeight: 600 }}>
                      Attribut AD : mail / userPrincipalName
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="email"
                    readOnly
                    placeholder={selectedUser ? "Aucune adresse e-mail configurée dans l'AD pour cet utilisateur" : "En attente de sélection d'un compte Active Directory..."}
                    value={recipientEmail}
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      background: recipientEmail ? '#f8fafc' : '#f1f5f9',
                      color: recipientEmail ? '#0f172a' : '#64748b',
                      fontWeight: recipientEmail ? 600 : 400,
                      cursor: 'default',
                      outline: 'none'
                    }}
                  />
                  {recipientEmail && (
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#15803d',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: '#dcfce7',
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      <Lock size={12} />
                      AD Synced
                    </div>
                  )}
                </div>
              </div>

              {sendEmail && selectedUser && recipientEmail && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Remarque ou consigne d'accompagnement (optionnelle)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pensez à faire 'Oublier le réseau' avant de vous reconnecter..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      background: '#ffffff'
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bouton d'action principal Vert BCRG */}
          <div>
            <button
              type="submit"
              disabled={submitting || !selectedUser}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: selectedUser ? '#143826' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.02rem',
                fontWeight: 800,
                cursor: selectedUser && !submitting ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 14px rgba(20, 56, 38, 0.25)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => { if (selectedUser && !submitting) e.currentTarget.style.backgroundColor = '#0f2b1d'; }}
              onMouseLeave={(e) => { if (selectedUser && !submitting) e.currentTarget.style.backgroundColor = '#143826'; }}
            >
              {submitting ? (
                <>
                  <RefreshCw size={18} className="spin-icon" />
                  Mise à jour dans Active Directory...
                </>
              ) : (
                <>
                  <KeyRound size={18} />
                  Appliquer la réinitialisation Wi-Fi ({selectedSsid})
                </>
              )}
            </button>
          </div>
        </form>

        {/* CARTE DE COMPTE-RENDU SUCCÈS */}
        {result && (
          <div style={{
            marginTop: '28px',
            background: '#f0fdf4',
            border: '2px solid #16a34a',
            borderRadius: '14px',
            padding: '24px',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              color: '#166534',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={24} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  {result.message}
                </h3>
              </div>

              {countdown !== null && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#14532d'
                }}>
                  <span>Retour automatique à la liste dans <strong>{countdown}s</strong>...</span>
                  <button
                    type="button"
                    onClick={handleCancelAutoReturn}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#15803d',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      textDecoration: 'underline',
                      padding: 0,
                      fontWeight: 700
                    }}
                  >
                    (Rester)
                  </button>
                </div>
              )}
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #bbf7d0',
              padding: '18px 22px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
              fontSize: '0.9rem'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>Réseau Wi-Fi (SSID)</span>
                <div style={{ fontWeight: 800, color: '#143826', fontFamily: 'monospace', fontSize: '1rem' }}>
                  {selectedSsid}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>Identifiant Wi-Fi</span>
                <div style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {result.user?.identifier}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>Nouveau Mot de Passe</span>
                <div style={{ fontWeight: 800, color: '#143826', fontFamily: 'monospace', fontSize: '1.05rem' }}>
                  {password}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>Statut Envoi E-mail</span>
                <div>
                  {result.email?.requested ? (
                    result.email.sent ? (
                      <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Fiche envoyée à {result.email.recipient}</span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠️ Échec envoi : {result.email.error}</span>
                    )
                  ) : (
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Non demandé (Admin)</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '16px',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={copyCredentials}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#143826',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Identifiants copiés !' : 'Copier la fiche d\'accès'}
              </button>

              {onSuccessReturn && (
                <button
                  type="button"
                  onClick={handleReturnNow}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  Retourner aux utilisateurs ({countdown !== null ? `${countdown}s` : 'Immédiat'})
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODALE DE CONFIRMATION AVEC DOUBLE VÉRIFICATION (ANTI-ERREUR) */}
      {showConfirmModal && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Entête institutionnelle de la modale */}
            <div style={{
              background: '#143826',
              padding: '22px 26px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldCheck size={22} style={{ color: '#86efac' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                    Confirmation de Sécurité — Active Directory
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#bbf7d0', opacity: 0.9 }}>
                    Double vérification anti-erreur avant application
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Corps récapitulatif */}
            <div style={{ padding: '26px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '18px 20px',
                fontSize: '0.98rem',
                lineHeight: 1.6,
                color: '#1e293b'
              }}>
                Êtes-vous sûr de vouloir réinitialiser le mot de passe Active Directory de{' '}
                <strong style={{ color: '#0f172a' }}>
                  {selectedUser.name || selectedUser.identifier}
                </strong>{' '}
                (<code style={{
                  background: '#e2e8f0',
                  color: '#143826',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.92rem'
                }}>{selectedUser.identifier}</code>) pour le réseau{' '}
                <strong style={{ color: '#143826' }}>{selectedSsid}</strong> ?
              </div>

              {/* Récapitulatif technique */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                fontSize: '0.82rem'
              }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', marginBottom: '2px' }}>Nouveau mot de passe</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                    {password}
                  </span>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', marginBottom: '2px' }}>Politique d'expiration</span>
                  <span style={{ fontWeight: 700, color: '#143826', fontSize: '0.84rem' }}>
                    {expiryOption === 'never'
                      ? "N'expire jamais"
                      : expiryOption === 'duration'
                        ? `Valide ${durationDays} jours`
                        : "Standard domaine AD"}
                  </span>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', marginBottom: '2px' }}>Envoi par courriel</span>
                  <span style={{ fontWeight: 700, color: sendEmail && recipientEmail ? '#15803d' : '#64748b' }}>
                    {sendEmail && recipientEmail ? `Oui (${recipientEmail})` : 'Désactivé'}
                  </span>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', marginBottom: '2px' }}>Compte AD</span>
                  <span style={{ fontWeight: 700, color: '#15803d' }}>
                    {unlockAccount ? 'Déverrouillé' : 'Inchangé'}
                  </span>
                </div>
              </div>

              {/* Avertissement anti-erreur */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '12px 14px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                color: '#92400e'
              }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
                <span>
                  <strong>Avertissement :</strong> Cette action modifiera immédiatement les identifiants de ce collaborateur sur l'annuaire d'entreprise Active Directory.
                </span>
              </div>
            </div>

            {/* Boutons d'action */}
            <div style={{
              padding: '16px 26px 22px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              borderTop: '1px solid #f1f5f9',
              background: '#fafafa'
            }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#143826',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(20, 56, 38, 0.25)'
                }}
              >
                <CheckCircle2 size={16} />
                Confirmer la réinitialisation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WifiResetPasswordTab;

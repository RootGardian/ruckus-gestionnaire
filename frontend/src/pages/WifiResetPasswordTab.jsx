import React, { useState, useEffect } from 'react';
import { Wifi, KeyRound } from 'lucide-react';
import { wifiService } from '../services/wifiService';
import { usePasswordGenerator } from '../hooks/usePasswordGenerator';
import { useCountdown } from '../hooks/useCountdown';
import { isProtectedAccount } from '../utils/adUtils';
import Alert from '../components/common/Alert';
import UserSearchSelect from '../components/wifi/UserSearchSelect';
import PasswordGeneratorSection from '../components/wifi/PasswordGeneratorSection';
import AccountOptionsSection from '../components/wifi/AccountOptionsSection';
import ResetSuccessCard from '../components/wifi/ResetSuccessCard';
import ResetConfirmModal from '../components/wifi/ResetConfirmModal';
import './WifiResetPasswordTab.css';

const DEFAULT_SSID = 'CORPORATE-BCRG';

export const WifiResetPasswordTab = ({
  preselectedUser,
  onClearPreselection,
  onSuccessReturn
}) => {
  // 1. État de sélection utilisateur
  const [selectedUser, setSelectedUser] = useState(preselectedUser || null);

  // 2. Générateur de mot de passe BCRG
  const { password, setPassword, generatePassword } = usePasswordGenerator();

  // 3. Options Active Directory & Expédition
  const [sendEmail, setSendEmail] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [unlockAccount, setUnlockAccount] = useState(true);
  const [expiryOption, setExpiryOption] = useState('never'); // 'never' | 'domain' | 'duration'
  const [durationDays, setDurationDays] = useState('90');
  const [notes, setNotes] = useState('');

  // 4. États de progression & retours
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // 5. Compte à rebours de retour automatique
  const { seconds: countdown, start: startCountdown, stop: stopCountdown } = useCountdown(
    null,
    () => {
      if (onSuccessReturn) onSuccessReturn();
      setResult(null);
    }
  );

  // Synchronisation lors de la pré-sélection d'un utilisateur (depuis l'onglet Utilisateurs)
  useEffect(() => {
    if (preselectedUser) {
      if (isProtectedAccount(preselectedUser)) {
        setError('Compte système protégé — modification interdite via la console Wi-Fi.');
        setSelectedUser(null);
        return;
      }
      setSelectedUser(preselectedUser);
      const email = preselectedUser.email || preselectedUser.mail || preselectedUser.userPrincipalName || '';
      setRecipientEmail(email);
      setSendEmail(Boolean(email));
      generatePassword();
      setResult(null);
      setError('');
    }
  }, [preselectedUser, generatePassword]);

  const handleSelectUser = (user) => {
    setError('');
    setSelectedUser(user);
    const email = user.email || user.mail || user.userPrincipalName || '';
    setRecipientEmail(email);
    setSendEmail(Boolean(email));
    if (!password) {
      generatePassword();
    }
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setRecipientEmail('');
    setResult(null);
    stopCountdown();
    if (onClearPreselection) onClearPreselection();
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Veuillez sélectionner un utilisateur Active Directory.');
      return;
    }
    if (!password || password.trim().length < 6) {
      setError('Veuillez saisir ou générer un mot de passe robuste d\'au moins 6 caractères.');
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
      const payload = {
        identifier: selectedUser.identifier,
        newPassword: password,
        sendEmail: Boolean(sendEmail),
        recipientEmail: sendEmail ? recipientEmail : null,
        ssid: DEFAULT_SSID,
        unlockAccount,
        passwordNeverExpires: expiryOption === 'never',
        mustChangeAtNextLogon: expiryOption === 'never' ? false : true,
        accountExpiresInDays: expiryOption === 'duration' ? parseInt(durationDays, 10) : null,
        notes
      };

      const res = await wifiService.resetPassword(payload);
      setResult(res);

      // Déclencher le compte à rebours seulement si l'e-mail a réussi (ou n'était pas demandé)
      const emailFailed = Boolean(res.email?.requested && !res.email?.sent);
      if (!emailFailed) {
        startCountdown(5);
      } else {
        stopCountdown();
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Limite de sécurité atteinte (Anti-DDoS) : Plus de 10 réinitialisations par minute. Action bloquée temporairement.');
      } else {
        setError(err.response?.data?.message || 'Échec de la réinitialisation Active Directory.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bcrg-reset-tab-layout">
      <div className="bcrg-reset-card-container">
        {error && (
          <Alert type="error" onClose={() => setError('')} className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleOpenConfirm} className="bcrg-reset-form">
          {/* 1. Réseau Wi-Fi cible */}
          <div>
            <label className="bcrg-section-label">1. Réseau Wi-Fi Ruckus cible</label>
            <div className="bcrg-ssid-banner">
              <div className="bcrg-ssid-icon-box">
                <Wifi size={20} />
              </div>
              <div>
                <div className="bcrg-ssid-title">{DEFAULT_SSID}</div>
                <div className="bcrg-ssid-subtitle">
                  Réseau officiel de l'institution • Authentification 802.1X / RADIUS sur Active Directory
                </div>
              </div>
            </div>
          </div>

          {/* 2. Sélection de l'utilisateur AD */}
          <UserSearchSelect
            selectedUser={selectedUser}
            onSelectUser={handleSelectUser}
            onClearUser={handleClearUser}
            onError={setError}
          />

          {/* 3. Définition du mot de passe */}
          <PasswordGeneratorSection
            password={password}
            onChangePassword={setPassword}
            onGeneratePassword={generatePassword}
          />

          {/* 4, 5, 6. Options de compte & Expédition */}
          <AccountOptionsSection
            expiryOption={expiryOption}
            setExpiryOption={setExpiryOption}
            durationDays={durationDays}
            setDurationDays={setDurationDays}
            unlockAccount={unlockAccount}
            setUnlockAccount={setUnlockAccount}
            sendEmail={sendEmail}
            setSendEmail={setSendEmail}
            recipientEmail={recipientEmail}
            setRecipientEmail={setRecipientEmail}
            selectedUser={selectedUser}
            notes={notes}
            setNotes={setNotes}
          />

          {/* Bouton de soumission */}
          <div className="bcrg-form-submit-row">
            <button
              type="submit"
              className="bcrg-btn-submit-reset"
              disabled={!selectedUser || !password || submitting}
            >
              <KeyRound size={18} />
              <span>Réinitialiser les identifiants Wi-Fi</span>
            </button>
          </div>
        </form>

        {/* Fiche de succès après réinitialisation */}
        {result && (
          <div style={{ marginTop: '24px' }}>
            <ResetSuccessCard
              result={result}
              password={password}
              selectedSsid={DEFAULT_SSID}
              countdown={countdown}
              onCancelAutoReturn={stopCountdown}
              onReturnNow={() => {
                if (onSuccessReturn) onSuccessReturn();
                setResult(null);
                stopCountdown();
              }}
            />
          </div>
        )}
      </div>

      {/* Modale de confirmation de sécurité */}
      <ResetConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmReset}
        isSubmitting={submitting}
        selectedUser={selectedUser}
        selectedSsid={DEFAULT_SSID}
        password={password}
        expiryOption={expiryOption}
        durationDays={durationDays}
        sendEmail={sendEmail}
        recipientEmail={recipientEmail}
        unlockAccount={unlockAccount}
      />
    </div>
  );
};

export default WifiResetPasswordTab;

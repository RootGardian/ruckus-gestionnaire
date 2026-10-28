import React from 'react';
import { Mail, Unlock } from 'lucide-react';
import './AccountOptionsSection.css';

export const AccountOptionsSection = ({
  expiryOption,
  setExpiryOption,
  durationDays,
  setDurationDays,
  unlockAccount,
  setUnlockAccount,
  sendEmail,
  setSendEmail,
  recipientEmail,
  setRecipientEmail,
  selectedUser,
  notes,
  setNotes
}) => {
  const hasUserEmail = Boolean(selectedUser && recipientEmail);

  return (
    <div className="bcrg-account-options-wrapper">
      {/* 4. Politique d'expiration & Options Active Directory */}
      <div className="bcrg-options-card">
        <label className="bcrg-section-heading">
          4. Politique d'expiration & Options Active Directory
        </label>

        <div className="bcrg-expiry-options-list">
          {/* Option A: N'expire jamais */}
          <label className={`bcrg-radio-option ${expiryOption === 'never' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="expiryOption"
              value="never"
              checked={expiryOption === 'never'}
              onChange={() => setExpiryOption('never')}
            />
            <div className="bcrg-radio-text">
              <span className="bcrg-radio-title">Le mot de passe n'expire jamais (Password Never Expires)</span>
              <span className="bcrg-radio-desc">
                Recommandé pour les accès Wi-Fi continus, cadres et comptes fixes de la BCRG
              </span>
            </div>
          </label>

          {/* Option B: Politique standard du domaine */}
          <label className={`bcrg-radio-option ${expiryOption === 'domain' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="expiryOption"
              value="domain"
              checked={expiryOption === 'domain'}
              onChange={() => setExpiryOption('domain')}
            />
            <div className="bcrg-radio-text">
              <span className="bcrg-radio-title">Appliquer la politique d'expiration par défaut du domaine AD</span>
              <span className="bcrg-radio-desc">
                Le mot de passe expirera selon la règle configurée sur le contrôleur de domaine (ex: 90 jours)
              </span>
            </div>
          </label>

          {/* Option C: Donner une durée spécifique */}
          <div className={`bcrg-radio-option-custom ${expiryOption === 'duration' ? 'selected' : ''}`}>
            <label className="bcrg-radio-option-inner">
              <input
                type="radio"
                name="expiryOption"
                value="duration"
                checked={expiryOption === 'duration'}
                onChange={() => setExpiryOption('duration')}
              />
              <div className="bcrg-radio-text">
                <span className="bcrg-radio-title">Définir une durée de validité du compte (Prestataires / Temporaires)</span>
                <span className="bcrg-radio-desc">
                  Le compte Active Directory expirera automatiquement à l'échéance choisie
                </span>
              </div>
            </label>

            {expiryOption === 'duration' && (
              <div className="bcrg-duration-selector">
                <span>Durée de validité :</span>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="bcrg-select-days"
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

        {/* Déverrouillage compte */}
        <div className="bcrg-checkbox-group">
          <label className="bcrg-checkbox-label">
            <input
              type="checkbox"
              checked={unlockAccount}
              onChange={(e) => setUnlockAccount(e.target.checked)}
            />
            <span>Déverrouiller le compte Active Directory s'il était verrouillé</span>
          </label>
        </div>
      </div>

      {/* 5. Option d'envoi par e-mail */}
      <div className={`bcrg-options-card ${sendEmail && hasUserEmail ? 'highlight' : ''}`}>
        <div className="bcrg-email-header">
          <label className={`bcrg-checkbox-label ${!hasUserEmail ? 'disabled' : ''}`}>
            <input
              type="checkbox"
              checked={sendEmail && hasUserEmail}
              disabled={!hasUserEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            <span className="bcrg-email-title">
              Envoyer automatiquement la fiche d'accès par e-mail au collaborateur
            </span>
          </label>
        </div>

        {sendEmail && (
          <div className="bcrg-email-body">
            {hasUserEmail ? (
              <div className="bcrg-email-input-wrapper">
                <Mail size={16} className="bcrg-email-icon" />
                <input
                  type="email"
                  className="bcrg-email-input"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="adresse@bcrg-guinee.org"
                />
              </div>
            ) : (
              <p className="bcrg-no-email-hint">
                ⚠️ Aucun e-mail n'est renseigné dans l'Active Directory pour ce compte. Vous devrez transmettre le mot de passe manuellement.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 6. Consignes ou notes d'administration optionnelles */}
      <div className="bcrg-options-card">
        <label className="bcrg-section-heading">
          6. Consignes ou notes d'administration (Optionnel)
        </label>
        <textarea
          className="bcrg-notes-textarea"
          rows={2}
          placeholder="Ex: Merci de vous connecter dans les 24h ou contacter le Support IT au poste 1234."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </div>
  );
};

export default AccountOptionsSection;

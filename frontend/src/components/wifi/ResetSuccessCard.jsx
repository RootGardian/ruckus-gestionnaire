import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, ArrowRight } from 'lucide-react';
import './ResetSuccessCard.css';

export const ResetSuccessCard = ({
  result,
  password,
  selectedSsid,
  countdown,
  onCancelAutoReturn,
  onReturnNow
}) => {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const copyCredentials = () => {
    const text = `Réseau Wi-Fi BCRG : ${selectedSsid}\nIdentifiant : ${result.user?.identifier}\nNouveau Mot de passe : ${password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bcrg-reset-success-box">
      <div className="bcrg-success-header">
        <div className="bcrg-success-title-line">
          <CheckCircle2 size={22} className="bcrg-success-icon" />
          <h4 className="bcrg-success-title">
            {result.message || 'Mot de passe réinitialisé avec succès sur Active Directory.'}
          </h4>
        </div>

        {countdown !== null && countdown > 0 && (
          <div className="bcrg-countdown-pill">
            <span>Retour automatique à la liste dans {countdown}s...</span>
            <button
              type="button"
              className="bcrg-countdown-pause-btn"
              onClick={onCancelAutoReturn}
            >
              (Rester)
            </button>
          </div>
        )}
      </div>

      <div className="bcrg-success-details-grid">
        <div className="bcrg-detail-item">
          <span className="bcrg-detail-label">Réseau Wi-Fi (SSID)</span>
          <div className="bcrg-detail-value monospace highlight">{selectedSsid}</div>
        </div>

        <div className="bcrg-detail-item">
          <span className="bcrg-detail-label">Identifiant Wi-Fi</span>
          <div className="bcrg-detail-value monospace">{result.user?.identifier}</div>
        </div>

        <div className="bcrg-detail-item">
          <span className="bcrg-detail-label">Nouveau Mot de Passe</span>
          <div className="bcrg-detail-value monospace password">{password}</div>
        </div>

        <div className="bcrg-detail-item">
          <span className="bcrg-detail-label">Statut Envoi E-mail</span>
          <div className="bcrg-detail-email-status">
            {result.email?.requested ? (
              result.email.sent ? (
                <span className="bcrg-email-ok">✓ Fiche envoyée à {result.email.recipient}</span>
              ) : (
                <span className="bcrg-email-err">⚠️ Échec envoi : {result.email.error}</span>
              )
            ) : (
              <span className="bcrg-email-muted">Non demandé (Admin)</span>
            )}
          </div>
        </div>
      </div>

      <div className="bcrg-success-actions">
        <button
          type="button"
          className="bcrg-btn-copy"
          onClick={copyCredentials}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span>{copied ? 'Identifiants copiés !' : 'Copier la fiche d\'accès'}</span>
        </button>

        {onReturnNow && (
          <button
            type="button"
            className="bcrg-btn-return"
            onClick={onReturnNow}
          >
            <span>Retourner aux utilisateurs {countdown !== null ? `(${countdown}s)` : ''}</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ResetSuccessCard;

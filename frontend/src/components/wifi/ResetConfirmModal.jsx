import React from 'react';
import { AlertTriangle } from 'lucide-react';
import ConfirmDialog from '../common/ConfirmDialog';
import './ResetConfirmModal.css';

export const ResetConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  selectedUser,
  selectedSsid,
  password,
  expiryOption,
  durationDays,
  sendEmail,
  recipientEmail,
  unlockAccount
}) => {
  if (!selectedUser) return null;

  const getExpiryLabel = () => {
    if (expiryOption === 'never') return "N'expire jamais";
    if (expiryOption === 'domain') return "Politique de domaine AD";
    return `Expire dans ${durationDays} jours`;
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isSubmitting={isSubmitting}
      title="Confirmation de Sécurité — Active Directory"
      subtitle="Double vérification anti-erreur avant application"
      confirmText="Confirmer la réinitialisation"
      cancelText="Annuler"
    >
      <div className="bcrg-modal-prompt">
        Êtes-vous sûr de vouloir réinitialiser le mot de passe Active Directory de{' '}
        <strong>{selectedUser.name || selectedUser.identifier}</strong> (
        <code className="bcrg-code-id">{selectedUser.identifier}</code>) pour le réseau{' '}
        <strong>{selectedSsid}</strong> ?
      </div>

      <div className="bcrg-modal-recap-grid">
        <div className="bcrg-recap-tile">
          <span className="bcrg-tile-label">Nouveau mot de passe</span>
          <span className="bcrg-tile-val monospace">{password}</span>
        </div>

        <div className="bcrg-recap-tile">
          <span className="bcrg-tile-label">Politique d'expiration</span>
          <span className="bcrg-tile-val">{getExpiryLabel()}</span>
        </div>

        <div className="bcrg-recap-tile">
          <span className="bcrg-tile-label">Envoi par courriel</span>
          <span className="bcrg-tile-val">
            {sendEmail && recipientEmail ? `Oui (${recipientEmail})` : 'Non'}
          </span>
        </div>

        <div className="bcrg-recap-tile">
          <span className="bcrg-tile-label">Compte AD</span>
          <span className="bcrg-tile-val">
            {unlockAccount ? 'Déverrouillé' : 'Inchangé'}
          </span>
        </div>
      </div>

      <div className="bcrg-modal-warning-box">
        <AlertTriangle size={18} className="bcrg-warning-icon" />
        <span>
          <strong>Avertissement :</strong> Cette action modifiera immédiatement les identifiants de ce collaborateur sur l'annuaire d'entreprise Active Directory.
        </span>
      </div>
    </ConfirmDialog>
  );
};

export default ResetConfirmModal;

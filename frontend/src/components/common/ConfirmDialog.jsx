import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import './ConfirmDialog.css';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmation de Sécurité',
  subtitle = 'Double vérification anti-erreur avant application',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmVariant = 'primary', // 'primary' | 'danger'
  isSubmitting = false,
  children
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={ShieldCheck}
      maxWidth="560px"
    >
      <div className="bcrg-confirm-content">
        {children}
      </div>

      <div className="bcrg-confirm-actions">
        <button
          type="button"
          className="bcrg-btn-cancel"
          onClick={onClose}
          disabled={isSubmitting}
        >
          {cancelText}
        </button>
        <button
          type="button"
          className={`bcrg-btn-confirm ${confirmVariant === 'danger' ? 'danger' : 'primary'}`}
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="bcrg-spinner-sm" />
          ) : (
            <ShieldCheck size={18} />
          )}
          <span>{isSubmitting ? 'Traitement en cours...' : confirmText}</span>
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;

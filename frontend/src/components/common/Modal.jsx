import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  maxWidth = '540px'
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="bcrg-modal-backdrop" onClick={onClose}>
      <div
        className="bcrg-modal-container"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bcrg-modal-header">
          <div className="bcrg-modal-title-group">
            {Icon && (
              <div className="bcrg-modal-icon-badge">
                <Icon size={20} />
              </div>
            )}
            <div>
              <h3 className="bcrg-modal-title">{title}</h3>
              {subtitle && <p className="bcrg-modal-subtitle">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            className="bcrg-modal-close-btn"
            onClick={onClose}
            aria-label="Fermer la modale"
          >
            <X size={18} />
          </button>
        </div>
        <div className="bcrg-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import './Alert.css';

export const Alert = ({
  type = 'info', // 'success' | 'error' | 'warning' | 'info'
  title,
  children,
  onClose,
  className = ''
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="bcrg-alert-icon" />;
      case 'error':
        return <AlertCircle size={18} className="bcrg-alert-icon" />;
      case 'warning':
        return <AlertTriangle size={18} className="bcrg-alert-icon" />;
      default:
        return <Info size={18} className="bcrg-alert-icon" />;
    }
  };

  return (
    <div className={`bcrg-alert ${type} ${className}`} role="alert">
      <div className="bcrg-alert-icon-wrapper">
        {getIcon()}
      </div>
      <div className="bcrg-alert-content">
        {title && <strong className="bcrg-alert-title">{title}</strong>}
        <div className="bcrg-alert-message">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="bcrg-alert-close"
          aria-label="Fermer"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};

export default Alert;

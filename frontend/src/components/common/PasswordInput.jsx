import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './PasswordInput.css';

export const PasswordInput = ({
  value,
  onChange,
  placeholder = '••••••••••••',
  disabled = false,
  className = '',
  name,
  id,
  required = false
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`bcrg-password-input-wrapper ${className}`}>
      <input
        type={showPassword ? 'text' : 'password'}
        name={name}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="bcrg-password-field"
      />
      <button
        type="button"
        className="bcrg-password-toggle-btn"
        onClick={() => setShowPassword(!showPassword)}
        disabled={disabled}
        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        tabIndex="-1"
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default PasswordInput;

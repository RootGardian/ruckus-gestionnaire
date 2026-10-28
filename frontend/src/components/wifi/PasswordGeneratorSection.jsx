import React, { useState } from 'react';
import { KeyRound, Sparkles, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import './PasswordGeneratorSection.css';

export const PasswordGeneratorSection = ({
  password,
  onChangePassword,
  onGeneratePassword
}) => {
  const [showPassword, setShowPassword] = useState(true);

  return (
    <div className="bcrg-password-section">
      <div className="bcrg-password-header">
        <label className="bcrg-section-label">
          3. Mot de Passe Wi-Fi (Défini par l'Admin) <span className="bcrg-required">*</span>
        </label>
        <button
          type="button"
          className="bcrg-btn-generate"
          onClick={onGeneratePassword}
        >
          <Sparkles size={14} />
          <span>Générer selon nomenclature</span>
        </button>
      </div>

      <div className="bcrg-password-input-box">
        <KeyRound size={18} className="bcrg-input-lead-icon" />
        <input
          type={showPassword ? 'text' : 'password'}
          className={`bcrg-password-input-main ${showPassword ? 'monospace' : ''}`}
          placeholder="Saisissez ou générez le mot de passe..."
          value={password}
          onChange={(e) => onChangePassword(e.target.value)}
          required
        />
        <button
          type="button"
          className="bcrg-toggle-visibility-btn"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Masquer' : 'Afficher'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div className="bcrg-nomenclature-badge">
        <ShieldCheck size={14} className="bcrg-nomenclature-icon" />
        <span>Nomenclature institutionnelle : <strong>Bcrg@&lt;3 lettres&gt;@&lt;2 chiffres&gt;</strong> (ex: <em>Bcrg@PRN@79</em>)</span>
      </div>
    </div>
  );
};

export default PasswordGeneratorSection;

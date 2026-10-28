import React, { useState, useEffect } from 'react';
import {
  Mail,
  Save,
  Send,
  CheckCircle2,
  AlertTriangle,
  Server,
  Lock,
  Eye,
  EyeOff,
  Wifi,
  RefreshCw,
  ShieldCheck,
  Check
} from 'lucide-react';
import { wifiService } from '../services/wifiService';
import './AdminPanel.css';

const SmtpConfigTab = () => {
  const [config, setConfig] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: 'Support IT BCRG <wifi-support@bcrg-guinee.org>',
    default_ssid: 'CORPORATE-BCRG',
    ignore_tls: false,
    has_password: false
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState('');

  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await wifiService.getSmtpConfig();
      if (data) {
        setConfig(prev => ({
          ...prev,
          ...data,
          pass: '',
          port: parseInt(data.port, 10) || 587,
          default_ssid: data.default_ssid || 'CORPORATE-BCRG'
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des paramètres SMTP.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaveMessage('');
    try {
      const payload = { ...config };
      if (!payload.pass || String(payload.pass).includes('•')) {
        delete payload.pass;
      }
      await wifiService.saveSmtpConfig(payload);
      setSaveMessage('✓ Configuration SMTP enregistrée avec succès.');
      setTimeout(() => setSaveMessage(''), 4000);
      fetchConfig();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde SMTP.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await wifiService.testSmtpConnection(testEmail);
      setTestResult(res);
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Échec de communication avec le serveur SMTP.',
        tip: err.response?.data?.tip || null,
        rawError: err.response?.data?.rawError || err.message
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* FORMULAIRE DE PARAMÉTRAGE SMTP DANS CONTENEUR BLANC ÉLÉGANT */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '28px 32px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
      }}>
        {saveMessage && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            marginBottom: '20px'
          }}>
            {saveMessage}
          </div>
        )}

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
            gap: '8px',
            marginBottom: '20px'
          }}>
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Ligne 1 : Serveur Hôte et Port */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#143826', marginBottom: '6px' }}>
                Serveur SMTP Hôte *
              </label>
              <input
                type="text"
                required
                placeholder="smtp.office365.com, mail.bcrg.local..."
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#143826', marginBottom: '6px' }}>
                Port SMTP *
              </label>
              <input
                type="number"
                required
                placeholder="587, 465, 25"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: e.target.value })}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Ligne 2 : Utilisateur et Mot de passe */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#143826', marginBottom: '6px' }}>
                Compte / Utilisateur SMTP *
              </label>
              <input
                type="text"
                placeholder="wifi-support@bcrg-guinee.org"
                value={config.user}
                onChange={(e) => setConfig({ ...config, user: e.target.value })}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#143826', marginBottom: '6px' }}>
                Mot de Passe SMTP {config.has_password && <span style={{ color: '#16a34a', fontWeight: 'normal', fontSize: '0.8rem' }}>(Déjà enregistré)</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={config.has_password ? "Laisser vide pour ne pas modifier" : "Mot de passe d'application"}
                  value={config.pass}
                  onChange={(e) => setConfig({ ...config, pass: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px 44px 11px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Ligne 3 : Expéditeur et Sélecteur des 2 SSID Wi-Fi */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#143826', marginBottom: '6px' }}>
                Nom & Adresse d'Expéditeur (From)
              </label>
              <input
                type="text"
                placeholder="Support IT BCRG <wifi-support@bcrg-guinee.org>"
                value={config.from}
                onChange={(e) => setConfig({ ...config, from: e.target.value })}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#143826', marginBottom: '6px' }}>
                Réseau Wi-Fi Ruckus dans les Notifications
              </label>
              <div
                style={{
                  border: '2px solid #143826',
                  background: '#f0fdf4',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#143826'
                }}
              >
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  border: '5px solid #143826'
                }} />
                CORPORATE-BCRG (Réseau d'entreprise)
              </div>
            </div>
          </div>

          {/* Bouton d'action Vert BCRG (#143826) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: '#143826',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(20, 56, 38, 0.2)'
              }}
              onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = '#0f2b1d'; }}
              onMouseLeave={(e) => { if (!saving) e.currentTarget.style.backgroundColor = '#143826'; }}
            >
              <Save size={16} />
              {saving ? 'Enregistrement en cours...' : 'Enregistrer la configuration SMTP'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. MODULE DE TEST DE VALIDATION SMTP */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px 32px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
      }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
          Test de Connexion et Expédition d'un E-mail
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#64748b' }}>
          Vérifiez la validité des accès du serveur de messagerie en transmettant une fiche de test vers une adresse de votre choix.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder="Saisissez une adresse e-mail de test..."
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            style={{
              flex: 1,
              minWidth: '280px',
              padding: '11px 16px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.92rem',
              outline: 'none'
            }}
          />

          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 22px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: testing ? 'not-allowed' : 'pointer'
            }}
          >
            {testing ? <RefreshCw size={16} className="spin-icon" /> : <Send size={16} />}
            {testing ? 'Test en cours...' : 'Envoyer un e-mail de test'}
          </button>
        </div>

        {testResult && (
          <div style={{
            marginTop: '16px',
            padding: '16px 20px',
            borderRadius: '12px',
            background: testResult.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
            color: testResult.success ? '#166534' : '#991b1b',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.94rem' }}>
              {testResult.success ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              <div>
                <strong>{testResult.success ? 'Succès : ' : 'Échec du test : '}</strong>
                {testResult.message}
              </div>
            </div>

            {testResult.tip && (
              <div style={{
                marginTop: '4px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: testResult.success ? '#dcfce7' : '#fffbeb',
                border: `1px solid ${testResult.success ? '#86efac' : '#fde68a'}`,
                color: testResult.success ? '#14532d' : '#92400e',
                fontSize: '0.85rem',
                lineHeight: 1.5
              }}>
                <strong>💡 Conseil de résolution :</strong> {testResult.tip}
              </div>
            )}

            {testResult.rawError && !testResult.success && (
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', wordBreak: 'break-all' }}>
                <span style={{ fontWeight: 600 }}>Détail technique :</span> {testResult.rawError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmtpConfigTab;

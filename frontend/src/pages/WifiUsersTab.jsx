import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  Users,
  Search,
  KeyRound,
  RefreshCw,
  Mail,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Wifi,
  Filter,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import './AdminPanel.css';

const PROTECTED_ACCOUNTS = ['krbtgt', 'administrator', 'administrateur', 'admin', 'guest', 'invité', 'invite', 'defaultaccount', 'system'];

const isProtectedAccount = (u) => {
  if (!u) return false;
  if (u.is_protected) return true;
  const id = String(u.identifier || u.name || '').trim().toLowerCase();
  return id.endsWith('$') || PROTECTED_ACCOUNTS.includes(id);
};

const WifiUsersTab = ({ onSelectUserForReset, onNavigateToReset }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(`${API_URL}/api/wifi/users`, {
        ...headers,
        params: { search: query }
      });
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger les utilisateurs Active Directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchUsers(searchTerm);
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  // État de pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const activeCount = users.filter(u => !u.is_disabled && !u.is_locked).length;
  const lockedCount = users.filter(u => u.is_locked).length;

  // Calculs de pagination
  const totalPages = Math.ceil(users.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, users.length);
  const currentUsers = users.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. LES 3 CARTES KPI EXACTEMENT COMME SUR LES CAPTURES D'ÉCRAN (IMAGE 1 & 2) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px'
      }}>
        {/* Carte 1 : Utilisateurs AD */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #f1f5f9',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#64748b' }}>
              Utilisateurs Active Directory
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#eff6ff',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', margin: '12px 0 16px' }}>
            {users.length}
          </div>
          <div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#eff6ff',
              color: '#1d4ed8',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              Annuaire d'entreprise
            </span>
          </div>
        </div>

        {/* Carte 2 : Comptes Actifs Wi-Fi */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #f1f5f9',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#64748b' }}>
              Identifiants Wi-Fi Actifs
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', margin: '12px 0 16px' }}>
            {activeCount}
          </div>
          <div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#dcfce7',
              color: '#15803d',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              100% Opérationnels
            </span>
          </div>
        </div>

        {/* Carte 3 : Comptes Verrouillés */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #f1f5f9',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#64748b' }}>
              Comptes Verrouillés (Lockout)
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: lockedCount > 0 ? '#fef3c7' : '#faf5ff',
              color: lockedCount > 0 ? '#d97706' : '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Lock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', margin: '12px 0 16px' }}>
            {lockedCount}
          </div>
          <div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: lockedCount > 0 ? '#fef3c7' : '#f3e8ff',
              color: lockedCount > 0 ? '#b45309' : '#7e22ce',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {lockedCount > 0 ? `${lockedCount} à déverrouiller` : 'Aucun blocage'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. BARRE D'OUTILS ET RECHERCHE (IMAGE 2 STYLE) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '320px' }}>
          {/* Champ de recherche arrondi */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Rechercher un utilisateur (nom, identifiant, matricule)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 16px 11px 44px',
                borderRadius: '25px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                background: '#ffffff'
              }}
            />
          </div>

        </div>

        {/* Bouton d'action principal Vert BCRG (#143826) */}
        <button
          onClick={() => {
            if (onNavigateToReset) {
              onNavigateToReset();
            } else if (onSelectUserForReset) {
              onSelectUserForReset(null);
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 22px',
            background: '#143826',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(20, 56, 38, 0.2)'
          }}
        >
          <KeyRound size={17} />
          Réinitialiser un Mot de Passe
        </button>
      </div>

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
          gap: '10px'
        }}>
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* 3. TABLEAU DES UTILISATEURS (FIDÈLE À L'IMAGE 2) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  COLLABORATEUR
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  IDENTIFIANT WI-FI (AD)
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  EMAIL / DÉPARTEMENT
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  STATUT
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="spin-icon" style={{ margin: 'auto', marginBottom: '8px' }} />
                    Recherche dans l'annuaire Active Directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    Aucun utilisateur Active Directory trouvé.
                  </td>
                </tr>
              ) : (
                currentUsers.map((u, idx) => (
                  <tr
                    key={u.dn || u.identifier || idx}
                    style={{
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Collaborateur */}
                    <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                          {u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.identifier}
                        </div>
                        {u.matricule && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Matricule : {u.matricule}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Identifiant AD */}
                    <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#f1f5f9',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: '#0f172a'
                      }}>
                        <Wifi size={13} style={{ color: '#143826' }} />
                        {u.identifier}
                      </span>
                    </td>

                    {/* Email / Département */}
                    <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ color: '#334155', fontSize: '0.88rem' }}>
                          {u.email || '—'}
                        </span>
                        {u.department && (
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            {u.department}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Statut (Pill Badge) */}
                    <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                      {isProtectedAccount(u) ? (
                        <span
                          title="Compte système protégé — modification interdite via la console Wi-Fi"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 12px',
                            background: '#fef2f2',
                            color: '#991b1b',
                            border: '1px solid #fecaca',
                            borderRadius: '16px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <ShieldAlert size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
                          Compte système protégé — modification interdite via la console Wi-Fi
                        </span>
                      ) : u.is_disabled ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          background: '#fee2e2',
                          color: '#991b1b',
                          borderRadius: '14px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          DÉSACTIVÉ
                        </span>
                      ) : u.is_locked ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          background: '#fef3c7',
                          color: '#92400e',
                          borderRadius: '14px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          VERROUILLÉ
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          background: '#dcfce7',
                          color: '#15803d',
                          borderRadius: '14px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          ACTIF
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px', textAlign: 'right', verticalAlign: 'middle' }}>
                      {isProtectedAccount(u) ? (
                        <span
                          title="Ce compte système/machine est protégé contre toute réinitialisation via la console Wi-Fi."
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '7px 12px',
                            background: '#f8fafc',
                            color: '#94a3b8',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'not-allowed'
                          }}
                        >
                          <Lock size={13} />
                          Protégé
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelectUserForReset(u)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: '#143826',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0f2b1d'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#143826'}
                        >
                          <KeyRound size={14} />
                          Réinitialiser
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* BARRE DE PAGINATION INSTITUTIONNELLE BCRG */}
          {users.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              flexWrap: 'wrap',
              gap: '16px',
              background: '#ffffff'
            }}>
              {/* Résumé & Sélecteur par page */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.88rem', color: '#64748b' }}>
                <span>
                  Affichage de <strong style={{ color: '#0f172a' }}>{startIndex + 1}</strong> à <strong style={{ color: '#0f172a' }}>{endIndex}</strong> sur <strong style={{ color: '#0f172a' }}>{users.length}</strong> collaborateurs
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Lignes par page :</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontWeight: 600
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Contrôles de navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Première page */}
                <button
                  type="button"
                  title="Première page"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: currentPage === 1 ? '#cbd5e1' : '#334155',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <ChevronsLeft size={16} />
                </button>

                {/* Page précédente */}
                <button
                  type="button"
                  title="Page précédente"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: currentPage === 1 ? '#cbd5e1' : '#334155',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Numéros de page */}
                {getPageNumbers().map((p, i) => {
                  if (p === '...') {
                    return (
                      <span key={`ellipsis-${i}`} style={{ padding: '0 6px', color: '#94a3b8', fontSize: '0.88rem' }}>
                        ...
                      </span>
                    );
                  }
                  const isCurrent = p === currentPage;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      style={{
                        minWidth: '34px',
                        height: '34px',
                        padding: '0 8px',
                        borderRadius: '8px',
                        border: isCurrent ? 'none' : '1px solid #e2e8f0',
                        background: isCurrent ? '#143826' : '#ffffff',
                        color: isCurrent ? '#ffffff' : '#334155',
                        fontWeight: isCurrent ? 700 : 500,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {p}
                    </button>
                  );
                })}

                {/* Page suivante */}
                <button
                  type="button"
                  title="Page suivante"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: currentPage === totalPages ? '#cbd5e1' : '#334155',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <ChevronRight size={16} />
                </button>

                {/* Dernière page */}
                <button
                  type="button"
                  title="Dernière page"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: currentPage === totalPages ? '#cbd5e1' : '#334155',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WifiUsersTab;

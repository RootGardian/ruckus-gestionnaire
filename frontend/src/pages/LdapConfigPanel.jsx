import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  Save, Trash2, Activity, Users, Settings, Database, Server, Info, Search, List,
  ChevronRight, ChevronDown, Eye, EyeOff, CheckCircle2, AlertTriangle,
  Folder, FolderOpen, Network, FolderTree, Home, X, Box, SlidersHorizontal
} from 'lucide-react';
import './LdapConfigPanel.css';

const LdapConfigPanel = () => {
  const [config, setConfig] = useState({
    name: 'bcrg-guinee.org',
    is_active: true,
    is_default: true,
    server: '172.16.x.x',
    port: 389,
    comments: '',
    connection_filter: '(&(objectCategory=person)(objectclass=user))',
    base_dn: 'DC=bcrg,DC=guinee,DC=org',
    use_bind: true,
    bind_dn: 'ruckus_sync@bcrg-guinee.org',
    bind_password: '',
    identifier_field: 'samaccountname',
    sync_field: 'objectguid'
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('config');
  const [confirmModal, setConfirmModal] = useState(null);
  const [testStatus, setTestStatus] = useState('idle'); // idle, testing, success, error
  const [testDetails, setTestDetails] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');

  const [ldapUsersList, setLdapUsersList] = useState([]);
  const [ldapGroupsList, setLdapGroupsList] = useState([]);
  const [ldapOUsList, setLdapOUsList] = useState([]);
  const [loadingLdapData, setLoadingLdapData] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [selectedGroups, setSelectedGroups] = useState(new Set());

  // États pour la navigation dans l'arborescence Active Directory
  const [selectedOuDn, setSelectedOuDn] = useState(null); // null = racine / tous
  const [expandedNodes, setExpandedNodes] = useState(new Set(['ROOT']));
  const [showTreeSidebar, setShowTreeSidebar] = useState(true);
  const [treeSearchTerm, setTreeSearchTerm] = useState('');

  // Palette harmonieuse d'avatars exactement comme sur l'Image 1
  const AVATAR_PALETTE = [
    { bg: '#d946ef', color: '#ffffff' }, // Magenta / Fuchsia (AK)
    { bg: '#84cc16', color: '#ffffff' }, // Lime / Jaune moutarde (DS)
    { bg: '#22c55e', color: '#ffffff' }, // Vert vif (AD)
    { bg: '#10b981', color: '#ffffff' }, // Émeraude (JL)
    { bg: '#14b8a6', color: '#ffffff' }, // Sarcelle / Teal (MK)
    { bg: '#06b6d4', color: '#ffffff' }, // Cyan ciel (JD)
    { bg: '#ea580c', color: '#ffffff' }, // Orange ambré (JK)
    { bg: '#8b5cf6', color: '#ffffff' }, // Violet (NO)
    { bg: '#ec4899', color: '#ffffff' }, // Rose bonbon (MD)
    { bg: '#ef4444', color: '#ffffff' }, // Rouge carmin (glpi)
    { bg: '#0284c7', color: '#ffffff' }, // Bleu océan
    { bg: '#6366f1', color: '#ffffff' }, // Indigo
  ];

  const getAvatarStyle = (seed = '') => {
    if (!seed) return AVATAR_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_PALETTE.length;
    return AVATAR_PALETTE[index];
  };

  const getUserInitials = (u) => {
    if (u.first_name && u.last_name) {
      return (u.first_name[0] + u.last_name[0]).toUpperCase();
    }
    if (u.name) {
      const parts = u.name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return u.name.slice(0, 2).toUpperCase();
    }
    if (u.identifier) {
      const clean = u.identifier.replace(/[^a-zA-Z0-9]/g, '');
      return clean.slice(0, 2).toUpperCase() || 'AD';
    }
    return 'AD';
  };

  const getGroupInitials = (g) => {
    const name = g.name || g.identifier || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'GP';
  };

  const resolveUserNames = (u) => {
    let firstName = u.first_name || '';
    let lastName = u.last_name || '';

    if (!firstName && !lastName && u.name) {
      const parts = u.name.trim().split(/\s+/);
      if (parts.length === 1) {
        firstName = parts[0];
      } else if (parts.length === 2) {
        firstName = parts[0];
        lastName = parts[1];
      } else if (parts.length > 2) {
        lastName = parts[parts.length - 1];
        firstName = parts.slice(0, parts.length - 1).join(' ');
      }
    }
    return {
      firstName: firstName || '—',
      lastName: lastName ? lastName.toUpperCase() : '—'
    };
  };

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  useEffect(() => {
    const fetchLdapData = async () => {
      if (activeTab === 'users' && ldapUsersList.length === 0) {
        setLoadingLdapData(true);
        try {
          const res = await axios.get(`${API_URL}/api/ldap-config/users`, getAuthConfig());
          setLdapUsersList(res.data || []);
        } catch (e) { console.error(e); }
        finally { setLoadingLdapData(false); }
      }
      if (activeTab === 'groups' && ldapGroupsList.length === 0) {
        setLoadingLdapData(true);
        try {
          const res = await axios.get(`${API_URL}/api/ldap-config/groups`, getAuthConfig());
          setLdapGroupsList(res.data || []);
        } catch (e) { console.error(e); }
        finally { setLoadingLdapData(false); }
      }
      if ((activeTab === 'users' || activeTab === 'groups') && ldapOUsList.length === 0) {
        try {
          const res = await axios.get(`${API_URL}/api/ldap-config/ous`, getAuthConfig());
          setLdapOUsList(res.data || []);
        } catch (e) { /* silent fail if OUs endpoint not queried */ }
      }
    };
    fetchLdapData();
  }, [activeTab]);

  const normalizeDn = (dn = '') => dn.toLowerCase().replace(/\s*,\s*/g, ',');

  const parseDnHierarchy = (dn, isContainerOnly = false) => {
    if (!dn) return [];
    const parts = dn.split(/(?<!\\),/).map(p => p.trim());
    if (parts.length === 0) return [];

    const firstDcIndex = parts.findIndex(p => p.toUpperCase().startsWith('DC='));
    const maxContainerIndex = firstDcIndex !== -1 ? firstDcIndex : parts.length;
    const startIndex = isContainerOnly ? 0 : 1;

    if (startIndex >= maxContainerIndex) return [];

    const segments = [];
    for (let i = maxContainerIndex - 1; i >= startIndex; i--) {
      const part = parts[i];
      const isOu = part.toUpperCase().startsWith('OU=');
      const isCn = part.toUpperCase().startsWith('CN=');
      if (isOu || isCn) {
        const type = isOu ? 'OU' : 'CONTAINER';
        const name = part.substring(3);
        const fullDn = parts.slice(i).join(',');
        segments.push({
          raw: part,
          name,
          type,
          dn: fullDn
        });
      }
    }
    return segments;
  };

  const buildLdapTree = (items = [], ous = []) => {
    const rootName = config.name || 'bcrg-guinee.org';
    const rootNode = {
      id: 'ROOT',
      name: rootName,
      type: 'DOMAIN',
      dn: null,
      count: items.length,
      children: {}
    };

    // 1. OUs connues du serveur LDAP
    ous.forEach(ou => {
      if (!ou.dn) return;
      const hierarchy = parseDnHierarchy(ou.dn, true);
      let current = rootNode;
      hierarchy.forEach(seg => {
        if (!current.children[seg.name]) {
          current.children[seg.name] = {
            id: seg.dn,
            name: seg.name,
            type: seg.type,
            dn: seg.dn,
            count: 0,
            children: {}
          };
        }
        current = current.children[seg.name];
      });
    });

    // 2. Éléments (utilisateurs ou groupes) pour enrichir et compter
    items.forEach(item => {
      if (!item.dn) return;
      const hierarchy = parseDnHierarchy(item.dn, false);
      let current = rootNode;
      hierarchy.forEach(seg => {
        if (!current.children[seg.name]) {
          current.children[seg.name] = {
            id: seg.dn,
            name: seg.name,
            type: seg.type,
            dn: seg.dn,
            count: 0,
            children: {}
          };
        }
        current = current.children[seg.name];
        current.count = (current.count || 0) + 1;
      });
    });

    return rootNode;
  };

  const isInSelectedOu = (itemDn, ouDn) => {
    if (!ouDn) return true;
    if (!itemDn) return false;
    return normalizeDn(itemDn).includes(normalizeDn(ouDn));
  };

  const getBreadcrumbs = (selectedDn) => {
    const rootName = config.name || 'bcrg-guinee.org';
    const crumbs = [{ name: rootName, dn: null, type: 'DOMAIN' }];
    if (!selectedDn) return crumbs;

    const segments = parseDnHierarchy(selectedDn, true);
    segments.forEach(seg => {
      crumbs.push({ name: seg.name, dn: seg.dn, type: seg.type });
    });
    return crumbs;
  };

  const toggleNodeExpanded = (nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAllNodes = (rootNode) => {
    const ids = new Set(['ROOT']);
    const collect = (n) => {
      ids.add(n.id);
      Object.values(n.children || {}).forEach(collect);
    };
    collect(rootNode);
    setExpandedNodes(ids);
  };

  const collapseAllNodes = () => {
    setExpandedNodes(new Set(['ROOT']));
  };

  const renderTreeNode = (node, level = 0) => {
    const childrenKeys = Object.keys(node.children || {});
    const hasChildren = childrenKeys.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = (node.id === 'ROOT' && selectedOuDn === null) || (node.dn && selectedOuDn === node.dn);

    if (treeSearchTerm.trim()) {
      const matchSelf = node.name.toLowerCase().includes(treeSearchTerm.toLowerCase());
      const hasMatchingChild = (n) => {
        if (n.name.toLowerCase().includes(treeSearchTerm.toLowerCase())) return true;
        return Object.values(n.children || {}).some(hasMatchingChild);
      };
      if (!matchSelf && !hasMatchingChild(node)) {
        return null;
      }
    }

    return (
      <div key={node.id} className="ldap-tree-node-wrapper">
        <div
          className={`ldap-tree-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${8 + level * 14}px` }}
          onClick={() => {
            if (node.id === 'ROOT') {
              setSelectedOuDn(null);
            } else {
              setSelectedOuDn(node.dn);
              if (hasChildren && !isExpanded) {
                toggleNodeExpanded(node.id);
              }
            }
          }}
          title={node.dn || node.name}
        >
          {hasChildren ? (
            <span
              className="ldap-tree-toggle"
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpanded(node.id);
              }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span className="ldap-tree-toggle-spacer" />
          )}

          <span className="ldap-tree-icon">
            {node.type === 'DOMAIN' ? (
              <Server size={14} color="#0284c7" />
            ) : node.type === 'CONTAINER' ? (
              <Box size={14} color="#8b5cf6" />
            ) : isExpanded ? (
              <FolderOpen size={14} color="#f59e0b" />
            ) : (
              <Folder size={14} color="#f59e0b" />
            )}
          </span>

          <span className="ldap-tree-name">{node.name}</span>

          {node.count > 0 && (
            <span className="ldap-tree-badge">{node.count}</span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="ldap-tree-children">
            {childrenKeys
              .sort((a, b) => a.localeCompare(b))
              .map(childKey => renderTreeNode(node.children[childKey], level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderBreadcrumbs = () => {
    const crumbs = getBreadcrumbs(selectedOuDn);

    return (
      <div className="ldap-breadcrumbs-bar">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#475569', marginRight: '4px' }}>
          <FolderTree size={14} color="#0284c7" /> Emplacement :
        </span>

        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <React.Fragment key={crumb.dn || 'root'}>
              {idx > 0 && <ChevronRight size={12} color="#94a3b8" />}
              <span
                className={`ldap-breadcrumb-segment ${isLast ? 'current' : ''}`}
                onClick={() => {
                  if (!isLast) setSelectedOuDn(crumb.dn);
                }}
              >
                {idx === 0 ? (
                  <Home size={13} style={{ marginRight: '3px' }} />
                ) : crumb.type === 'CONTAINER' ? (
                  <Box size={13} color="#8b5cf6" style={{ marginRight: '3px' }} />
                ) : (
                  <Folder size={13} color="#f59e0b" style={{ marginRight: '3px' }} />
                )}
                {crumb.name}
              </span>
            </React.Fragment>
          );
        })}

        {selectedOuDn !== null && (
          <button
            className="ldap-reset-filter-btn"
            onClick={() => setSelectedOuDn(null)}
            title="Revenir à la racine et afficher tous les éléments"
          >
            <X size={12} /> Tout afficher
          </button>
        )}
      </div>
    );
  };

  const renderTreeSidebar = (tree) => {
    return (
      <div className="ldap-tree-sidebar">
        <div className="ldap-tree-header">
          <div className="ldap-tree-title">
            <Network size={15} color="#0284c7" />
            <span>Arborescence AD</span>
          </div>
          <div className="ldap-tree-actions">
            <button
              type="button"
              className="ldap-tree-action-btn"
              onClick={() => expandAllNodes(tree)}
              title="Tout déplier"
            >
              Déplier
            </button>
            <button
              type="button"
              className="ldap-tree-action-btn"
              onClick={collapseAllNodes}
              title="Tout replier"
            >
              Replier
            </button>
          </div>
        </div>

        <div className="ldap-tree-search">

          {treeSearchTerm && (
            <button
              type="button"
              onClick={() => setTreeSearchTerm('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#94a3b8' }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="ldap-tree-scrollable">
          {renderTreeNode(tree, 0)}
        </div>
      </div>
    );
  };
  const [configId, setConfigId] = useState(null);

  useEffect(() => {
    // Charger la configuration au démarrage
    const fetchConfig = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/ldap-config`, getAuthConfig());
        if (response.data && response.data.length > 0) {
          const loadedConfig = response.data[0]; // On prend la première config
          setConfigId(loadedConfig.id);
          setConfig(loadedConfig);
        }
      } catch (error) {
        console.error("Erreur lors du chargement de la configuration LDAP", error);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked :
      (value === 'true' ? true : value === 'false' ? false : value);
    setConfig({ ...config, [name]: val });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (configId) {
        // Mise à jour
        await axios.put(`${API_URL}/api/ldap-config/${configId}`, config, getAuthConfig());
      } else {
        // Création
        const res = await axios.post(`${API_URL}/api/ldap-config`, config, getAuthConfig());
        setConfigId(res.data.id);
      }
      setMessage('Configuration sauvegardée avec succès.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!configId) return;
    setConfirmModal({
      title: "Supprimer la configuration LDAP",
      message: "Êtes-vous sûr de vouloir supprimer définitivement cette configuration Active Directory / LDAP ?",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await axios.delete(`${API_URL}/api/ldap-config/${configId}`, getAuthConfig());
          setConfigId(null);
          setConfig({
            name: '', server_url: '', port: 389, base_dn: '', is_active: false,
            bind_dn: '', bind_password: '', sync_field: '', identifier_field: ''
          });
          setMessage('Configuration supprimée.');
          setTimeout(() => setMessage(''), 3000);
        } catch (err) {
          setMessage('Erreur lors de la suppression.');
        }
      }
    });
  };

  return (
    <div className="ldap-config-subpanel" style={{ paddingTop: '10px' }}>
      {message && <div className="ldap-toast">{message}</div>}

      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
          <Server size={16} /> Configuration
        </button>
        <button className={`admin-tab ${activeTab === 'tester' ? 'active' : ''}`} onClick={() => setActiveTab('tester')}>
          <Activity size={16} /> Tester
        </button>
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={16} /> Utilisateurs
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'config' && (
          <>
            <div className="content-header" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', color: '#1a252f', margin: 0 }}>
                Annuaire LDAP {config.name ? `- ${config.name}` : ''}
              </h3>
            </div>

            <form className="ldap-form" onSubmit={handleSave}>
              <div className="form-row">
                <label>Nom</label>
                <input type="text" name="name" value={config.name} onChange={handleChange} className="input-large" />

                <label className="right-label">Activé</label>
                <select name="is_active" value={config.is_active} onChange={handleChange}>
                  <option value={true}>Oui</option>
                  <option value={false}>Non</option>
                </select>
              </div>

              <div className="form-row">
                <label>Serveur par défaut</label>
                <select name="is_default" value={config.is_default} onChange={handleChange}>
                  <option value={true}>Oui</option>
                  <option value={false}>Non</option>
                </select>

                <label className="right-label">Port (par défaut 389)</label>
                <input type="number" name="port" value={config.port} onChange={handleChange} />
              </div>

              <div className="form-row">
                <label>Serveur</label>
                <input type="text" name="server" value={config.server} onChange={handleChange} className="input-large" />
              </div>

              <div className="form-row">
                <label>Commentaires</label>
                <textarea name="comments" value={config.comments} onChange={handleChange} rows="3" className="input-large"></textarea>
              </div>

              <div className="form-row">
                <label>Filtre de connexion</label>
                <input type="text" name="connection_filter" value={config.connection_filter} onChange={handleChange} className="input-full" />
              </div>

              <div className="form-row">
                <label>BaseDN</label>
                <input type="text" name="base_dn" value={config.base_dn} onChange={handleChange} className="input-full" />
              </div>

              <div className="form-row">
                <label>Utiliser bind ?</label>
                <select name="use_bind" value={config.use_bind} onChange={handleChange}>
                  <option value={true}>Oui</option>
                  <option value={false}>Non</option>
                </select>
              </div>

              <div className="form-row">
                <label>DN du compte (pour les connexions non anonymes)</label>
                <input type="text" name="bind_dn" value={config.bind_dn} onChange={handleChange} className="input-full" />
              </div>

              <div className="form-row">
                <label>Mot de passe du compte (pour les connexions non anonymes)</label>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="bind_password"
                    value={config.bind_password}
                    onChange={handleChange}
                    className="input-medium"
                    placeholder="Saisir le mot de passe"
                    style={{ paddingRight: '35px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <label className="right-label">Champ de synchronisation</label>
                <input type="text" name="sync_field" value={config.sync_field} onChange={handleChange} className="input-medium" />
              </div>

              <div className="form-row">
                <label>Champ de l'identifiant</label>
                <input type="text" name="identifier_field" value={config.identifier_field} onChange={handleChange} className="input-medium" />
              </div>

              <div className="form-actions">
                <span className="last-update">
                  {config.updatedAt
                    ? `Dernière mise à jour le ${new Date(config.updatedAt).toLocaleString('fr-FR')}`
                    : 'Non sauvegardée'}
                </span>
                <div className="buttons">
                  <button type="button" className="btn-delete" onClick={handleDelete} disabled={!configId}>
                    <Trash2 size={16} /> Supprimer définitivement
                  </button>
                  <button type="submit" className="btn-save" disabled={loading}>
                    <Save size={16} /> {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}

        {activeTab === 'tester' && (
          <div className="ldap-test-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Server size={24} color="#0284c7" />
              <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Diagnostic de Connexion Active Directory</h4>
            </div>
            <p style={{ marginBottom: '20px', color: '#64748b' }}>Cliquez sur le bouton ci-dessous pour lancer une série de tests afin de vérifier que l'annuaire est bien joignable et que les identifiants de service sont corrects.</p>

            <button
              className="btn-primary-action"
              disabled={testStatus === 'testing'}
              style={{ marginBottom: '20px' }}
              onClick={async () => {
                setTestStatus('testing');
                setTestDetails(null);
                try {
                  const res = await axios.post(`${API_URL}/api/ldap-config/test`, config, getAuthConfig());
                  setTestStatus('success');
                  setTestDetails({ message: res.data.message });
                } catch (err) {
                  setTestStatus('error');
                  setTestDetails({ message: err.response?.data?.message || err.message });
                }
              }}
            >
              <Activity size={18} className={testStatus === 'testing' ? 'spin-icon' : ''} />
              {testStatus === 'testing' ? 'Analyse en cours...' : 'Lancer le diagnostic'}
            </button>

            {testStatus !== 'idle' && (
              <div style={{
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: testStatus === 'testing' ? '#f8fafc' : (testStatus === 'success' ? '#f0fdf4' : '#fef2f2'),
                border: '1px solid',
                borderColor: testStatus === 'testing' ? '#e2e8f0' : (testStatus === 'success' ? '#bbf7d0' : '#fecaca'),
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                <h5 style={{
                  margin: '0 0 15px 0',
                  fontSize: '1rem',
                  color: testStatus === 'testing' ? '#334155' : (testStatus === 'success' ? '#166534' : '#991b1b'),
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  {testStatus === 'testing' && <Activity size={18} />}
                  {testStatus === 'success' && <CheckCircle2 size={18} />}
                  {testStatus === 'error' && <AlertTriangle size={18} />}
                  {testStatus === 'testing' ? "Tests en cours d'exécution..." :
                    testStatus === 'success' ? "Diagnostic Réussi" : "Échec du Diagnostic"}
                </h5>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {(() => {
                  const msg = testDetails?.message || '';
                  const isNetworkTimeout = /timeout|inaccessible|ETIMEDOUT/i.test(msg);
                  const isRefused = /ECONNREFUSED|connexion refusée/i.test(msg);
                  const isNotFound = /ENOTFOUND|introuvable/i.test(msg);
                  const isNetworkError = isNetworkTimeout || isRefused || isNotFound;

                  return (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Étape 1 : Résolution & Ping IP */}
                      <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ marginTop: '2px', color: testStatus === 'success' ? '#22c55e' : (isNotFound ? '#ef4444' : '#22c55e') }}>
                          {testStatus === 'success' ? <CheckCircle2 size={16} /> : (isNotFound ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />)}
                        </div>
                        <div>
                          <strong>1. Résolution & Ping IP</strong>
                          <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Cible : <code>{config.server}</code></p>
                          {testStatus === 'error' && isNotFound && (
                            <div style={{ marginTop: '5px', fontSize: '0.85rem', color: '#b91c1c' }}>Le nom d'hôte ou l'adresse IP est introuvable.</div>
                          )}
                        </div>
                      </li>

                      {/* Étape 2 : Ouverture du Port Réseau 389 */}
                      <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ marginTop: '2px', color: testStatus === 'success' ? '#22c55e' : (isNetworkError ? '#ef4444' : '#22c55e') }}>
                          {testStatus === 'success' ? <CheckCircle2 size={16} /> : (isNetworkError ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />)}
                        </div>
                        <div>
                          <strong>2. Ouverture du Port Réseau ({config.port})</strong>
                          <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Port LDAP : <code>{config.port}</code></p>
                          {testStatus === 'error' && isRefused && (
                            <div style={{ marginTop: '5px', fontSize: '0.85rem', color: '#b91c1c' }}>Connexion refusée : le service Active Directory n'écoute pas sur ce port ou est bloqué par un pare-feu.</div>
                          )}
                          {testStatus === 'error' && isNetworkTimeout && (
                            <div style={{ marginTop: '5px', fontSize: '0.85rem', color: '#b91c1c' }}>Délai d'attente dépassé (Timeout) : le serveur {config.server}:{config.port} ne répond pas. Vérifiez que la machine est allumée et accessible sur votre réseau.</div>
                          )}
                        </div>
                      </li>

                      {/* Étape 3 : Authentification Bind */}
                      <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ marginTop: '2px', color: testStatus === 'success' ? '#22c55e' : (isNetworkError ? '#94a3b8' : '#ef4444') }}>
                          {testStatus === 'success' ? <CheckCircle2 size={16} /> : (isNetworkError ? <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #cbd5e1' }}></div> : <AlertTriangle size={16} />)}
                        </div>
                        <div>
                          <strong>3. Authentification de Service (Bind)</strong>
                          <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Compte : <code>{config.bind_dn}</code></p>
                          {isNetworkError && (
                            <div style={{ marginTop: '5px', fontSize: '0.85rem', color: '#64748b' }}>Test d'authentification ignoré : le port réseau {config.port} est injoignable.</div>
                          )}
                          {testStatus === 'error' && !isNetworkError && (
                            <div style={{ marginTop: '5px', fontSize: '0.85rem', color: '#b91c1c' }}>{msg}</div>
                          )}
                        </div>
                      </li>
                    </ul>
                  );
                })()}

                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (() => {
          const tree = buildLdapTree(ldapUsersList, ldapOUsList);
          const filteredUsers = ldapUsersList.filter(u => {
            const matchesOu = isInSelectedOu(u.dn, selectedOuDn);
            const s = userSearchTerm.toLowerCase();
            const matchesSearch = !s || (
              (u.identifier || '').toLowerCase().includes(s) ||
              (u.matricule || '').toLowerCase().includes(s) ||
              (u.name || '').toLowerCase().includes(s) ||
              ((u.first_name || '') + ' ' + (u.last_name || '')).toLowerCase().includes(s)
            );
            return matchesOu && matchesSearch;
          });

          return (
            <div className="ldap-users-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    Utilisateurs de l'annuaire ({filteredUsers.length} / {ldapUsersList.length})
                  </h4>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Aperçu en temps réel des comptes utilisateurs synchronisés depuis l'Active Directory.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowTreeSidebar(!showTreeSidebar)}
                    style={{
                      backgroundColor: showTreeSidebar ? '#e0f2fe' : '#ffffff',
                      color: showTreeSidebar ? '#0284c7' : '#475569',
                      border: '1px solid #cbd5e1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.15s ease'
                    }}
                    title="Afficher ou masquer l'arborescence Active Directory"
                  >
                    <FolderTree size={15} color={showTreeSidebar ? '#0284c7' : '#64748b'} />
                    {showTreeSidebar ? "Masquer l'arbre" : "Arborescence AD"}
                  </button>

                  <button
                    className="btn-add btn-refresh"
                    onClick={() => {
                      setLoadingLdapData(true);
                      axios.get(`${API_URL}/api/ldap-config/users`, getAuthConfig())
                        .then(res => setLdapUsersList(res.data || []))
                        .catch(console.error)
                        .finally(() => setLoadingLdapData(false));
                      axios.get(`${API_URL}/api/ldap-config/ous`, getAuthConfig())
                        .then(res => setLdapOUsList(res.data || []))
                        .catch(console.error);
                    }}
                    style={{ backgroundColor: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                  >
                    <Activity size={15} /> Rafraîchir l'annuaire
                  </button>
                  <div className="search-bar" style={{ width: '250px' }}>
                    <Search size={15} color="#94a3b8" />
                    <input
                      type="text"
                      placeholder="Rechercher un utilisateur..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {renderBreadcrumbs()}

              <div className="ldap-explorer-layout">
                {showTreeSidebar && renderTreeSidebar(tree)}

                <div className="ldap-table-area">
                  {loadingLdapData ? (
                    <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                      <Activity size={24} color="#0284c7" className="spin-icon" style={{ marginBottom: '10px' }} />
                      <div style={{ fontWeight: 500 }}>Chargement des utilisateurs Active Directory en cours...</div>
                    </div>
                  ) : filteredUsers.length > 0 ? (
                    <div className="ldap-table-container">
                      <table className="ldap-table">
                        <thead>
                          <tr>
                            <th className="ldap-checkbox-cell">
                              <input
                                type="checkbox"
                                className="ldap-checkbox"
                                checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUsers(new Set(filteredUsers.map(u => u.identifier)));
                                  } else {
                                    setSelectedUsers(new Set());
                                  }
                                }}
                              />
                            </th>
                            <th>Utilisateur</th>
                            <th>Prénom</th>
                            <th>Nom</th>
                            <th>Adresse Email</th>
                            <th>Actif</th>
                            <th>Chemin Annuaire (DN)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((u, i) => {
                            const avatarStyle = getAvatarStyle(u.identifier || u.name);
                            const initials = getUserInitials(u);
                            const names = resolveUserNames(u);
                            const isSelected = selectedUsers.has(u.identifier);

                            return (
                              <tr key={u.identifier || i} className={isSelected ? 'row-selected' : ''}>
                                <td className="ldap-checkbox-cell">
                                  <input
                                    type="checkbox"
                                    className="ldap-checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const next = new Set(selectedUsers);
                                      if (e.target.checked) next.add(u.identifier);
                                      else next.delete(u.identifier);
                                      setSelectedUsers(next);
                                    }}
                                  />
                                </td>
                                <td>
                                  <div className="ldap-user-id-wrapper">
                                    <div
                                      className="ldap-avatar-square"
                                      style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.color }}
                                      title={`${names.firstName} ${names.lastName}`}
                                    >
                                      {initials}
                                    </div>
                                    <span className="ldap-user-identifier">{u.identifier}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className="ldap-user-firstname">{names.firstName}</span>
                                </td>
                                <td>
                                  <span className="ldap-user-lastname">{names.lastName}</span>
                                </td>
                                <td>
                                  <span className="ldap-user-email">{u.email || '—'}</span>
                                </td>
                                <td>
                                  <span className="ldap-status-tag">Oui</span>
                                </td>
                                <td>
                                  <span className="ldap-dn-text" title={u.dn || ''}>
                                    {u.dn || `CN=${u.name || u.identifier},${config.base_dn}`}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #ced4da', color: '#64748b' }}>
                      Aucun utilisateur trouvé dans cet emplacement.
                      {selectedOuDn && (
                        <div style={{ marginTop: '10px' }}>
                          <button
                            onClick={() => setSelectedOuDn(null)}
                            style={{ backgroundColor: '#e0f2fe', color: '#0284c7', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Réinitialiser le filtre d'emplacement
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'groups' && (() => {
          const tree = buildLdapTree(ldapGroupsList, ldapOUsList);
          const filteredGroups = ldapGroupsList.filter(g => {
            const matchesOu = isInSelectedOu(g.dn, selectedOuDn);
            const s = groupSearchTerm.toLowerCase();
            const matchesSearch = !s || (
              (g.identifier || '').toLowerCase().includes(s) ||
              (g.name || '').toLowerCase().includes(s) ||
              (g.description || '').toLowerCase().includes(s)
            );
            return matchesOu && matchesSearch;
          });

          return (
            <div className="ldap-groups-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    Groupes de l'annuaire ({filteredGroups.length} / {ldapGroupsList.length})
                  </h4>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Aperçu en temps réel des groupes de sécurité et de distribution Active Directory.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowTreeSidebar(!showTreeSidebar)}
                    style={{
                      backgroundColor: showTreeSidebar ? '#e0f2fe' : '#ffffff',
                      color: showTreeSidebar ? '#0284c7' : '#475569',
                      border: '1px solid #cbd5e1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.15s ease'
                    }}
                    title="Afficher ou masquer l'arborescence Active Directory"
                  >
                    <FolderTree size={15} color={showTreeSidebar ? '#0284c7' : '#64748b'} />
                    {showTreeSidebar ? "Masquer l'arbre" : "Arborescence AD"}
                  </button>

                  <button
                    className="btn-add btn-refresh"
                    onClick={() => {
                      setLoadingLdapData(true);
                      axios.get(`${API_URL}/api/ldap-config/groups`, getAuthConfig())
                        .then(res => setLdapGroupsList(res.data || []))
                        .catch(console.error)
                        .finally(() => setLoadingLdapData(false));
                      axios.get(`${API_URL}/api/ldap-config/ous`, getAuthConfig())
                        .then(res => setLdapOUsList(res.data || []))
                        .catch(console.error);
                    }}
                    style={{ backgroundColor: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                  >
                    <Activity size={15} /> Rafraîchir les groupes
                  </button>
                  <div className="search-bar" style={{ width: '250px' }}>
                    <Search size={15} color="#94a3b8" />
                    <input
                      type="text"
                      placeholder="Rechercher un groupe..."
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {renderBreadcrumbs()}

              <div className="ldap-explorer-layout">
                {showTreeSidebar && renderTreeSidebar(tree)}

                <div className="ldap-table-area">
                  {loadingLdapData ? (
                    <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                      <Activity size={24} color="#0284c7" className="spin-icon" style={{ marginBottom: '10px' }} />
                      <div style={{ fontWeight: 500 }}>Chargement des groupes Active Directory en cours...</div>
                    </div>
                  ) : filteredGroups.length > 0 ? (
                    <div className="ldap-table-container">
                      <table className="ldap-table">
                        <thead>
                          <tr>
                            <th className="ldap-checkbox-cell">
                              <input
                                type="checkbox"
                                className="ldap-checkbox"
                                checked={filteredGroups.length > 0 && selectedGroups.size === filteredGroups.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedGroups(new Set(filteredGroups.map(g => g.identifier || g.name)));
                                  } else {
                                    setSelectedGroups(new Set());
                                  }
                                }}
                              />
                            </th>
                            <th>Groupe</th>
                            <th>Identifiant / Code</th>
                            <th>Description & Portée</th>
                            <th>Actif</th>
                            <th>Chemin Annuaire (DN)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredGroups.map((g, i) => {
                            const avatarStyle = getAvatarStyle(g.name || g.identifier);
                            const initials = getGroupInitials(g);
                            const groupKey = g.identifier || g.name || i;
                            const isSelected = selectedGroups.has(groupKey);

                            return (
                              <tr key={groupKey} className={isSelected ? 'row-selected' : ''}>
                                <td className="ldap-checkbox-cell">
                                  <input
                                    type="checkbox"
                                    className="ldap-checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const next = new Set(selectedGroups);
                                      if (e.target.checked) next.add(groupKey);
                                      else next.delete(groupKey);
                                      setSelectedGroups(next);
                                    }}
                                  />
                                </td>
                                <td>
                                  <div className="ldap-user-id-wrapper">
                                    <div
                                      className="ldap-avatar-square"
                                      style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.color }}
                                      title={g.name}
                                    >
                                      {initials}
                                    </div>
                                    <span className="ldap-user-identifier" style={{ color: '#0f172a' }}>{g.name}</span>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ color: '#0284c7', fontWeight: 600, fontSize: '13px' }}>{g.identifier}</span>
                                </td>
                                <td>
                                  <span style={{ color: '#475569', fontSize: '12.5px' }}>{g.description || 'Groupe de sécurité Active Directory'}</span>
                                </td>
                                <td>
                                  <span className="ldap-status-tag">Oui</span>
                                </td>
                                <td>
                                  <span className="ldap-dn-text" title={g.dn || ''}>
                                    {g.dn || `CN=${g.name || g.identifier},${config.base_dn}`}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #ced4da', color: '#64748b' }}>
                      Aucun groupe trouvé dans cet emplacement.
                      {selectedOuDn && (
                        <div style={{ marginTop: '10px' }}>
                          <button
                            onClick={() => setSelectedOuDn(null)}
                            style={{ backgroundColor: '#e0f2fe', color: '#0284c7', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Réinitialiser le filtre d'emplacement
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Pop-up de confirmation in-app (remplace window.confirm) */}
      {confirmModal && (
        <div
          onClick={() => setConfirmModal(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.70)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px 28px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {confirmModal.title}
                </h3>
                <p style={{ margin: '8px 0 0 0', color: '#334155', fontSize: '0.92rem', lineHeight: '1.4' }}>
                  {confirmModal.message}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmModal(null);
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  confirmModal.onConfirm();
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LdapConfigPanel;

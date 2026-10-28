import React, { useState } from 'react';
import { Search, ShieldAlert, Check } from 'lucide-react';
import { useAdSearch } from '../../hooks/useAdSearch';
import { isProtectedAccount } from '../../utils/adUtils';
import './UserSearchSelect.css';

export const UserSearchSelect = ({
  selectedUser,
  onSelectUser,
  onClearUser,
  onError
}) => {
  const [query, setQuery] = useState('');
  const { results, loading } = useAdSearch(query);

  const handleSelect = (user) => {
    if (isProtectedAccount(user)) {
      if (onError) {
        onError('Compte système protégé — modification interdite via la console Wi-Fi.');
      }
      return;
    }
    onSelectUser(user);
    setQuery('');
  };

  const getInitials = (user) => {
    const text = user.name || user.identifier || 'AD';
    return text.trim().slice(0, 2).toUpperCase();
  };

  return (
    <div className="bcrg-user-select-container">
      <label className="bcrg-section-label">
        2. Utilisateur Active Directory cible <span className="bcrg-required">*</span>
      </label>

      {selectedUser ? (
        <div className="bcrg-selected-user-card">
          <div className="bcrg-selected-user-info">
            <div className="bcrg-user-avatar">
              {getInitials(selectedUser)}
            </div>
            <div>
              <div className="bcrg-user-name">
                {selectedUser.name || selectedUser.identifier}
              </div>
              <div className="bcrg-user-meta">
                Identifiant AD : <strong>{selectedUser.identifier}</strong>
                {selectedUser.email && <span> • {selectedUser.email}</span>}
                {selectedUser.department && <span> • {selectedUser.department}</span>}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="bcrg-btn-change-user"
            onClick={onClearUser}
          >
            Changer
          </button>
        </div>
      ) : (
        <div className="bcrg-user-search-wrapper">
          <Search size={18} className="bcrg-search-icon" />
          <input
            type="text"
            className="bcrg-search-input"
            placeholder="Rechercher par sAMAccountName, email, nom..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {loading && (
            <span className="bcrg-search-loading">Recherche...</span>
          )}

          {results.length > 0 && (
            <div className="bcrg-search-dropdown">
              {results.map((user, idx) => {
                const protectedAcc = isProtectedAccount(user);
                return (
                  <div
                    key={user.identifier || idx}
                    className={`bcrg-search-item ${protectedAcc ? 'protected' : ''}`}
                    onClick={() => handleSelect(user)}
                  >
                    <div>
                      <div className="bcrg-item-name">
                        {user.name || user.identifier}
                      </div>
                      <div className="bcrg-item-meta">
                        {user.identifier} • {user.email || 'Pas d\'email'}
                      </div>
                    </div>

                    {protectedAcc && (
                      <span className="bcrg-protected-pill" title="Compte système protégé">
                        <ShieldAlert size={12} />
                        Protégé
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearchSelect;

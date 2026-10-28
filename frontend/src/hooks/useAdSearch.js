import { useState, useEffect } from 'react';
import wifiService from '../services/wifiService';

/**
 * Hook personnalisé pour la recherche prédictive dans Active Directory avec debounce
 */
export const useAdSearch = (searchQuery, delay = 300) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const trimmed = searchQuery ? searchQuery.trim() : '';
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const data = await wifiService.getUsers({ search: trimmed });
        setResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur lors de la recherche Active Directory');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [searchQuery, delay]);

  return { results, loading, error, setResults };
};

export default useAdSearch;

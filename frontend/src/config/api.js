// Configuration dynamique de l'URL API
// Si VITE_API_URL est défini explicitement, on l'utilise.
// Sinon, on utilise '' (chemin relatif) :
// - En dev : relayé par le proxy Vite (port 5173 -> port 5001)
// - En conteneur Docker / Prod : relayé par le reverse-proxy Nginx (port 80/443 -> backend:5001)
export const API_URL = (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== null)
  ? import.meta.env.VITE_API_URL
  : '';

export const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

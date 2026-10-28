/**
 * Comptes Active Directory protégés contre toute modification via la console Wi-Fi
 */
export const PROTECTED_ACCOUNTS = [
  'krbtgt',
  'administrator',
  'administrateur',
  'admin',
  'guest',
  'invité',
  'invite',
  'defaultaccount',
  'system'
];

/**
 * Vérifie si un compte utilisateur AD est un compte système ou protégé
 */
export const isProtectedAccount = (user) => {
  if (!user) return false;
  if (user.is_protected) return true;
  const id = String(user.identifier || user.name || '').trim().toLowerCase();
  return id.endsWith('$') || PROTECTED_ACCOUNTS.includes(id);
};

export default {
  PROTECTED_ACCOUNTS,
  isProtectedAccount
};

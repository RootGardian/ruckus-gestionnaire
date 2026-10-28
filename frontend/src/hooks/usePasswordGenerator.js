import { useState, useCallback } from 'react';

/**
 * Hook personnalisé pour générer des mots de passe conformes à la nomenclature BCRG :
 * Format : Bcrg@<3 lettres majuscules>@<2 chiffres> (ex: Bcrg@KMP@86)
 */
export const usePasswordGenerator = (initialPassword = '') => {
  const [password, setPassword] = useState(initialPassword);

  const generatePassword = useCallback(() => {
    try {
      if (window.crypto && window.crypto.getRandomValues) {
        // Pool de consonnes et voyelles claires (exclusion des caractères ambigus O, I)
        const lettersPool = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const array = new Uint32Array(4);
        window.crypto.getRandomValues(array);

        let letters = '';
        for (let i = 0; i < 3; i++) {
          letters += lettersPool[array[i] % lettersPool.length];
        }

        const twoDigits = 10 + (array[3] % 90); // 2 chiffres aléatoires entre 10 et 99
        const newPwd = `Bcrg@${letters}@${twoDigits}`;
        setPassword(newPwd);
        return newPwd;
      }
    } catch (err) {
      console.warn('Web Crypto API fallback:', err);
    }

    // Fallback math.random si Web Crypto non disponible
    const fallbackLetters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let letters = '';
    for (let i = 0; i < 3; i++) {
      letters += fallbackLetters.charAt(Math.floor(Math.random() * fallbackLetters.length));
    }
    const twoDigits = Math.floor(10 + Math.random() * 90);
    const fallbackPwd = `Bcrg@${letters}@${twoDigits}`;
    setPassword(fallbackPwd);
    return fallbackPwd;
  }, []);

  return {
    password,
    setPassword,
    generatePassword
  };
};

export default usePasswordGenerator;

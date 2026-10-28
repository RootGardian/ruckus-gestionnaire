import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer un compte à rebours avec arrêt, reprise et callback à l'expiration
 */
export const useCountdown = (initialSeconds = null, onExpire = null) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(initialSeconds !== null);

  const start = useCallback((duration) => {
    setSeconds(duration);
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
    setSeconds(null);
  }, []);

  const pause = useCallback(() => {
    setIsActive(false);
  }, []);

  const resume = useCallback(() => {
    if (seconds !== null && seconds > 0) {
      setIsActive(true);
    }
  }, [seconds]);

  useEffect(() => {
    if (!isActive || seconds === null) return;

    if (seconds <= 0) {
      setIsActive(false);
      if (onExpire) {
        onExpire();
      }
      return;
    }

    const timer = setTimeout(() => {
      setSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [isActive, seconds, onExpire]);

  return {
    seconds,
    isActive,
    start,
    stop,
    pause,
    resume
  };
};

export default useCountdown;

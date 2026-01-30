import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos

export const useAutoLogout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleLogout, TIMEOUT_MS);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      events.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [user, handleLogout]);
};

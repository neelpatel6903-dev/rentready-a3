/**
 * useAuth.js
 * Session lifecycle for the whole app: bootstrap on load (GET /api/auth/me),
 * email/password sign-in, sign-up, sign-out and "delete all my data".
 * The access token lives in sessionStorage (see api/client.js) — Supabase
 * itself is never touched from the browser.
 */
import { useCallback, useEffect, useState } from 'react';
import { api, clearToken, getToken, setToken } from '../api/client';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false); // false until bootstrap finishes

  const applySession = useCallback(async (session) => {
    setToken(session.accessToken);
    setUser(session.user);
    // Profile prefill is best-effort: a failed fetch must not block sign-in.
    try {
      const data = await api.get('/api/profile');
      setProfile(data?.profile ?? null);
    } catch {
      setProfile(null);
    }
    return session;
  }, []);

  const bootstrap = useCallback(async () => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    try {
      const [me, saved] = await Promise.all([
        api.get('/api/auth/me'),
        api.get('/api/profile'),
      ]);
      setUser(me.user);
      setProfile(saved?.profile ?? null);
    } catch {
      // 401 already cleared the token; anything else leaves us signed out.
      clearToken();
      setUser(null);
      setProfile(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Mid-session expiry: drop back to signed-out from wherever the user is.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setProfile(null);
    };
    window.addEventListener('rentready:session-expired', onExpired);
    return () => window.removeEventListener('rentready:session-expired', onExpired);
  }, []);

  const login = useCallback(
    async (email, password) => applySession(await api.post('/api/auth/login', { email, password })),
    [applySession]
  );

  /**
   * Sign up. Returns { needsConfirmation: true } when Supabase requires
   * email confirmation (no session yet), otherwise signs the user in.
   */
  const signup = useCallback(
    async (email, password) => {
      const session = await api.post('/api/auth/signup', { email, password });
      if (!session.accessToken) return { needsConfirmation: true };
      await applySession(session);
      return { needsConfirmation: false };
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* token may already be expired — clearing locally is enough */
    }
    clearToken();
    setUser(null);
    setProfile(null);
  }, []);

  /** "Delete all my data": profile + checks (+ auth user), then sign out. */
  const deleteAllData = useCallback(async () => {
    try {
      await api.delete('/api/account/data');
    } finally {
      clearToken();
      setUser(null);
      setProfile(null);
    }
  }, []);

  /** Refresh the stored profile (called after About you saves). */
  const reloadProfile = useCallback(async () => {
    try {
      const data = await api.get('/api/profile');
      setProfile(data?.profile ?? null);
    } catch {
      /* prefill stays as-is */
    }
  }, []);

  return { user, profile, ready, login, signup, logout, deleteAllData, reloadProfile };
}
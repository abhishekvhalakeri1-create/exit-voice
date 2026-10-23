import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthUser } from '../../shared/types';
import { apiFetch } from '../lib/api';

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'neutral' | 'success' | 'error';
}

export interface ReportTarget {
  targetType: 'story' | 'comment';
  targetId: string;
  label: string;
}

interface PlatformMeta {
  publishedStories: number;
  companiesWithStories: number;
  totalComments: number;
  categoryCounts: Record<string, number>;
}

interface AppContextValue {
  user: AuthUser | null;
  loadingAuth: boolean;
  meta: PlatformMeta;
  unreadMailCount: number;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
  refreshAuth: () => Promise<void>;
  refreshMeta: () => Promise<void>;
  logout: () => Promise<void>;
  isMailboxOpen: boolean;
  openMailbox: () => void;
  closeMailbox: () => void;
  reportTarget: ReportTarget | null;
  openReportModal: (target: ReportTarget) => void;
  closeReportModal: () => void;
  showToast: (text: string, tone?: 'neutral' | 'success' | 'error') => void;
  toasts: ToastMessage[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [unreadMailCount, setUnreadMailCount] = useState(0);
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [meta, setMeta] = useState<PlatformMeta>({
    publishedStories: 0,
    companiesWithStories: 0,
    totalComments: 0,
    categoryCounts: {},
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      try {
        localStorage.setItem('ev_theme', next);
      } catch {}
      return next;
    });
  }, []);

  const showToast = useCallback(
    (text: string, tone: 'neutral' | 'success' | 'error' = 'neutral') => {
      const id = `${Date.now()}_${Math.random()}`;
      setToasts((prev) => [...prev, { id, text, tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const refreshAuth = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: AuthUser | null; unreadMailCount: number }>(
        '/api/auth/me'
      );
      setUser(data.user);
      setUnreadMailCount(data.unreadMailCount || 0);
    } catch {
      setUser(null);
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  const refreshMeta = useCallback(async () => {
    try {
      const data = await apiFetch<PlatformMeta>('/api/meta');
      setMeta(data);
    } catch {}
  }, []);

  useEffect(() => {
    refreshAuth();
    refreshMeta();
  }, [refreshAuth, refreshMeta]);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    showToast('Signed out of your ExitVoice session.', 'neutral');
  }, [showToast]);

  return (
    <AppContext.Provider
      value={{
        user,
        loadingAuth,
        meta,
        unreadMailCount,
        theme,
        toggleTheme,
        setUser,
        refreshAuth,
        refreshMeta,
        logout,
        isMailboxOpen,
        openMailbox: () => setIsMailboxOpen(true),
        closeMailbox: () => setIsMailboxOpen(false),
        reportTarget,
        openReportModal: (t) => setReportTarget(t),
        closeReportModal: () => setReportTarget(null),
        showToast,
        toasts,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

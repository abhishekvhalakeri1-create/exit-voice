import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  FileEdit,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Moon,
  PenSquare,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NotificationItem } from '../../shared/types';
import { apiFetch, formatTimeAgo } from '../lib/api';

export function Navbar() {
  const {
    user,
    theme,
    toggleTheme,
    logout,
    unreadMailCount,
    openMailbox,
    refreshAuth,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [quickQuery, setQuickQuery] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleOpenNotifications = async () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next && user) {
      try {
        const res = await apiFetch<{ notifications: NotificationItem[] }>('/api/notifications');
        setNotifications(res.notifications);
        if (user.unreadNotifications > 0) {
          await apiFetch('/api/notifications/read', { method: 'POST', body: JSON.stringify({}) });
          await refreshAuth();
        }
      } catch {}
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickQuery.trim();
    navigate(trimmed ? `/explore?q=${encodeURIComponent(trimmed)}` : '/explore');
  };

  const navLinkClass = (active: boolean) =>
    `px-2.5 py-1.5 rounded-md text-[13.5px] font-medium transition-colors ${
      active
        ? 'text-[var(--text-primary)] bg-[var(--bg-subtle)]'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
    }`;

  return (
    <header className="sticky top-0 z-40 ev-surface border-b ev-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
        {/* Left: Brand + Primary Nav */}
        <div className="flex items-center gap-5 min-w-0">
          <Link to="/" className="flex items-baseline gap-2 shrink-0 group">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-[5px] bg-[var(--accent-solid)] text-[var(--accent-on-solid)] font-editorial text-lg leading-none select-none">
              E
            </span>
            <span className="font-editorial text-2xl tracking-tight text-[var(--text-primary)]">
              ExitVoice
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {user && (
              <Link
                to="/dashboard"
                className={navLinkClass(location.pathname === '/dashboard')}
              >
                Dashboard
              </Link>
            )}
            <Link
              to="/explore"
              className={navLinkClass(
                location.pathname === '/explore' || location.pathname.startsWith('/stories/')
              )}
            >
              Explore Stories
            </Link>
            <Link
              to="/companies"
              className={navLinkClass(location.pathname.startsWith('/companies'))}
            >
              Companies
            </Link>
            <Link
              to="/how-it-works"
              className={navLinkClass(location.pathname === '/how-it-works')}
            >
              How It Works
            </Link>
            {user?.role === 'moderator' && (
              <Link
                to="/moderation"
                className={navLinkClass(location.pathname === '/moderation')}
              >
                <span className="inline-flex items-center gap-1.5">
                  Moderation
                  {(user.pendingModerationCount || 0) > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[11px] bg-[var(--accent-tint)] text-[var(--accent-text)] font-semibold">
                      {user.pendingModerationCount}
                    </span>
                  )}
                </span>
              </Link>
            )}
          </nav>
        </div>

        {/* Center/Right Search + Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <form onSubmit={handleSearchSubmit} className="hidden md:block relative w-52 xl:w-64">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Search stories, companies…"
              aria-label="Search ExitVoice"
              className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs ev-input"
            />
          </form>

          {/* Local Mail Outbox button for email verification & password resets */}
          <button
            type="button"
            onClick={openMailbox}
            title="Transactional Email Outbox (verification & password reset links)"
            className="relative p-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            aria-label="Open transactional email outbox"
          >
            <Mail className="w-4 h-4" />
            {unreadMailCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent-solid)] text-[var(--accent-on-solid)] text-[10px] font-semibold flex items-center justify-center">
                {unreadMailCount}
              </span>
            )}
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to warm light paper' : 'Switch to dark mode'}
            aria-label="Toggle color theme"
            className="p-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <>
              {/* Notifications Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={handleOpenNotifications}
                  aria-label="Notifications"
                  className="relative p-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {user.unreadNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent-solid)] text-[var(--accent-on-solid)] text-[10px] font-semibold flex items-center justify-center">
                      {user.unreadNotifications}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg ev-surface overflow-hidden z-50"
                    style={{ boxShadow: 'var(--shadow-overlay)' }}
                  >
                    <div className="px-4 py-3 border-b ev-border flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        Notifications
                      </span>
                      <Link
                        to="/dashboard"
                        className="text-xs text-[var(--accent-text)] hover:underline"
                      >
                        View dashboard
                      </Link>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                      {notifications.length === 0 ? (
                        <p className="p-5 text-xs text-[var(--text-secondary)] text-center">
                          No notifications yet. Replies to your threads and moderation updates show up here.
                        </p>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              setNotifOpen(false);
                              if (n.linkUrl) navigate(n.linkUrl);
                            }}
                            className="p-3.5 hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors"
                          >
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-xs font-medium text-[var(--text-primary)]">
                                {n.title}
                              </p>
                              <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                                {formatTimeAgo(n.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                              {n.body}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative hidden sm:block" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border ev-border hover:bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-primary)]"
                >
                  <span>@{user.displayName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-lg ev-surface py-1.5 z-50"
                    style={{ boxShadow: 'var(--shadow-overlay)' }}
                  >
                    <div className="px-3.5 py-2 border-b ev-border">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        @{user.displayName}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">
                        {user.email} (private)
                      </p>
                    </div>
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      Home Dashboard
                    </Link>
                    <Link
                      to="/submit"
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      Write / Draft a Story
                    </Link>
                    {user.role === 'moderator' && (
                      <Link
                        to="/moderation"
                        className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
                        Moderation Queue ({user.pendingModerationCount || 0})
                      </Link>
                    )}
                    <Link
                      to="/settings"
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                    >
                      <Settings className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      Account &amp; Privacy Settings
                    </Link>
                    <div className="my-1 border-t ev-border" />
                    <button
                      type="button"
                      onClick={() => logout().then(() => navigate('/'))}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[var(--status-danger)] hover:bg-[var(--bg-subtle)] text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/signin"
              className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-md text-[13.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              Sign In
            </Link>
          )}

          <Link
            to="/submit"
            className="ev-btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[13px] shrink-0"
          >
            <PenSquare className="w-3.5 h-3.5 hidden sm:inline" />
            <span>Share Your Story</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((m) => !m)}
            aria-label="Toggle Menu"
            className="lg:hidden p-2 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t ev-border ev-surface px-4 py-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Search stories, lessons, or companies…"
              className="w-full pl-9 pr-3 py-2 rounded-md text-sm ev-input"
            />
          </form>

          <div className="grid grid-cols-1 gap-1">
            {user && (
              <Link
                to="/dashboard"
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-[var(--bg-subtle)]"
              >
                <LayoutDashboard className="w-4 h-4 text-[var(--text-secondary)]" />
                Dashboard (@{user.displayName})
              </Link>
            )}
            <Link
              to="/explore"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-[var(--bg-subtle)]"
            >
              <BookOpen className="w-4 h-4 text-[var(--text-secondary)]" />
              Explore Stories
            </Link>
            <Link
              to="/companies"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-[var(--bg-subtle)]"
            >
              <Building2 className="w-4 h-4 text-[var(--text-secondary)]" />
              Companies
            </Link>
            <Link
              to="/how-it-works"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-[var(--bg-subtle)]"
            >
              <ShieldCheck className="w-4 h-4 text-[var(--text-secondary)]" />
              How It Works &amp; Privacy
            </Link>
            {user?.role === 'moderator' && (
              <Link
                to="/moderation"
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-[var(--bg-subtle)]"
              >
                <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                Moderation Desk ({user.pendingModerationCount || 0})
              </Link>
            )}
            {user ? (
              <>
                <Link
                  to="/settings"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-[var(--bg-subtle)]"
                >
                  <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
                  Account &amp; Privacy Settings
                </Link>
                <button
                  type="button"
                  onClick={() => logout().then(() => navigate('/'))}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-[var(--status-danger)] hover:bg-[var(--bg-subtle)] text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="pt-2 border-t ev-border flex items-center gap-2">
                <Link
                  to="/signin"
                  className="flex-1 text-center ev-btn-secondary py-2 rounded-md text-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex-1 text-center ev-btn-primary py-2 rounded-md text-sm"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

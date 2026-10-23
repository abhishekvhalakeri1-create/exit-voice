import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, Laptop, Lock, Mail } from 'lucide-react';
import { SessionItem } from '../../shared/types';
import { apiFetch, formatTimeAgo } from '../lib/api';
import { useApp } from '../context/AppContext';

export function SettingsPage() {
  const { user, loadingAuth, setUser, showToast, openMailbox } = useApp();

  const [displayName, setDisplayName] = useState('');
  const [roleHeadline, setRoleHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [defaultAnonymous, setDefaultAnonymous] = useState(true);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setRoleHeadline(user.roleHeadline);
    setBio(user.bio);
    setDefaultAnonymous(user.defaultAnonymous);

    apiFetch<{ sessions: SessionItem[] }>('/api/auth/sessions')
      .then((res) => setSessions(res.sessions))
      .catch(() => {});
  }, [user]);

  if (loadingAuth) return null;
  if (!user) return <Navigate to="/signin?next=/settings" replace />;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch<{ user: typeof user }>('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName,
          roleHeadline,
          bio,
          defaultAnonymous,
        }),
      });
      setUser(res.user);
      showToast('Account & identity settings saved.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeOthers = async () => {
    try {
      await apiFetch('/api/auth/logout-others', { method: 'POST' });
      const res = await apiFetch<{ sessions: SessionItem[] }>('/api/auth/sessions');
      setSessions(res.sessions);
      showToast('Signed out of all other sessions.', 'success');
    } catch {
      showToast('Unable to revoke sessions.', 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <header className="space-y-1 pb-5 border-b ev-border">
        <h1 className="font-editorial text-4xl text-[var(--text-primary)]">
          Account, Identity &amp; Privacy Settings
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          Control how your public handle appears separately from your private login email.
        </p>
      </header>

      {/* Private Account Identity Box */}
      <section className="ev-surface rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Private Account Credentials (Never Public)</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{user.email}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Status:{' '}
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 text-[var(--status-positive)] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </span>
              ) : (
                <span className="text-[var(--status-caution)] font-medium">
                  Pending verification
                </span>
              )}
            </p>
          </div>
          {!user.emailVerified && (
            <button
              type="button"
              onClick={openMailbox}
              className="ev-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              Open Verification Outbox
            </button>
          )}
        </div>
      </section>

      {/* Public Author Identity Form */}
      <form onSubmit={handleSave} className="ev-surface rounded-lg p-6 space-y-5">
        <h2 className="font-editorial text-2xl text-[var(--text-primary)]">
          Public Author Identity
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Public Handle (@)
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={28}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-md text-sm ev-input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Optional Role Context
            </label>
            <input
              type="text"
              maxLength={80}
              value={roleHeadline}
              onChange={(e) => setRoleHeadline(e.target.value)}
              placeholder="e.g. Former Senior Accountant"
              className="w-full px-3 py-2 rounded-md text-sm ev-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Short Bio (Optional)
          </label>
          <textarea
            rows={2}
            maxLength={280}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm ev-input"
          />
        </div>

        <label className="flex items-start gap-2.5 p-3.5 rounded-md bg-[var(--bg-subtle)]">
          <input
            type="checkbox"
            checked={defaultAnonymous}
            onChange={(e) => setDefaultAnonymous(e.target.checked)}
            className="mt-0.5 accent-[var(--accent)]"
          />
          <span className="text-xs text-[var(--text-primary)] leading-relaxed">
            <strong>Default to Anonymous mode</strong> whenever starting a new story or thread
            reply.
          </span>
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="ev-btn-primary px-5 py-2 rounded-md text-xs"
          >
            {saving ? 'Saving…' : 'Save Identity Preferences'}
          </button>
        </div>
      </form>

      {/* Active Sessions */}
      <section className="ev-surface rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-editorial text-2xl text-[var(--text-primary)]">Active Sessions</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Signed in on a shared device? Revoke other active sessions immediately.
            </p>
          </div>
          {sessions.length > 1 && (
            <button
              type="button"
              onClick={handleRevokeOthers}
              className="ev-btn-secondary px-3 py-1.5 rounded-md text-xs"
            >
              Sign Out Other Devices
            </button>
          )}
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {sessions.map((s) => (
            <div key={s.id} className="py-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <Laptop className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <div className="truncate">
                  <p className="font-medium text-[var(--text-primary)] truncate">{s.userAgent}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Started {formatTimeAgo(s.createdAt)}
                  </p>
                </div>
              </div>
              {s.isCurrent && (
                <span className="px-2 py-0.5 rounded bg-[var(--status-positive-bg)] text-[var(--status-positive)] text-[11px] font-semibold shrink-0">
                  Current session
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

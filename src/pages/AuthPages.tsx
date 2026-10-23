import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, ShieldAlert } from 'lucide-react';
import { AuthUser } from '../../shared/types';
import { EXPERIENCE_CATEGORIES } from '../../shared/constants';
import { apiFetch } from '../lib/api';
import { useApp } from '../context/AppContext';

export function SignInPage() {
  const { setUser, refreshAuth, showToast } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Google account chooser state
  const [googleModal, setGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('alex.rivera@gmail.com');
  const [googleHandle, setGoogleHandle] = useState('quiet_pine');

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setError('');
    setBusy(true);
    try {
      const res = await apiFetch<{ user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      setUser(res.user);
      await refreshAuth();
      showToast(`Signed in as @${res.user.displayName}`, 'success');
      navigate(nextPath);
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  const handleGoogleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch<{ user: AuthUser }>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          email: googleEmail,
          preferredHandle: googleHandle,
        }),
      });
      setUser(res.user);
      await refreshAuth();
      setGoogleModal(false);
      showToast(`Connected Google account as @${res.user.displayName}`, 'success');
      navigate(nextPath);
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-editorial text-4xl text-[var(--text-primary)]">Welcome back</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Sign in to access your drafts, saved stories, notifications, and privacy controls.
        </p>
      </div>

      <div className="ev-surface rounded-lg p-6 space-y-5">
        {error && (
          <div className="p-3 rounded-md bg-[var(--status-danger-bg)] text-[var(--status-danger)] text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Account email (never shown publicly)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full px-3 py-2 rounded-md text-sm ev-input"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-[var(--accent-text)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-md text-sm ev-input"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full ev-btn-primary py-2.5 rounded-md text-sm disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="grow border-t ev-border" />
          <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            or
          </span>
          <div className="grow border-t ev-border" />
        </div>

        <button
          type="button"
          onClick={() => setGoogleModal(true)}
          className="w-full ev-btn-secondary py-2.5 px-4 rounded-md text-xs flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.81-1.5 3.34-3.2 4.37v3.62h5.18c3.03-2.79 4.78-6.9 4.78-11.84 0-.8-.08-1.57-.22-2.32z"
            />
            <path
              fill="currentColor"
              d="M12.18 22c4.32 0 7.95-1.43 10.6-3.88l-5.18-3.62c-1.43.96-3.27 1.53-5.42 1.53-4.17 0-7.7-2.81-8.96-6.6H-2.1v3.73C.54 18.4 5.93 22 12.18 22z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Quick Test Accounts for Immediate Review */}
        <div className="pt-3 border-t ev-border space-y-2">
          <p className="text-[11px] font-medium text-[var(--text-muted)]">
            Quick sign-in test accounts:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => doLogin('maya@exitvoice.local', 'ExitVoice2026!')}
              className="text-left p-2.5 rounded-md border ev-border hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <p className="text-xs font-semibold text-[var(--text-primary)]">@maya_lin</p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Member · Drafts &amp; bookmarks
              </p>
            </button>
            <button
              type="button"
              onClick={() => doLogin('mod@exitvoice.local', 'ExitVoice2026!')}
              className="text-left p-2.5 rounded-md border ev-border hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <p className="text-xs font-semibold text-[var(--text-primary)]">@editorial_desk</p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Moderator · Review queue
              </p>
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-[var(--text-secondary)]">
        New to ExitVoice?{' '}
        <Link to="/register" className="font-semibold text-[var(--accent-text)] hover:underline">
          Create an account without your real name
        </Link>
      </p>

      {/* Sandbox Google OAuth Chooser Modal */}
      {googleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
          onClick={() => setGoogleModal(false)}
        >
          <form
            onSubmit={handleGoogleSignIn}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg ev-surface p-6 space-y-4"
            style={{ boxShadow: 'var(--shadow-overlay)' }}
          >
            <h3 className="font-editorial text-2xl text-[var(--text-primary)]">
              Continue with Google
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              ExitVoice keeps your Google email private and assigns a separate public handle so
              your real name is never exposed by default.
            </p>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Google Account Email
              </label>
              <input
                type="email"
                required
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md text-sm ev-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Public Pseudonym / Handle (if creating new account)
              </label>
              <input
                type="text"
                required
                value={googleHandle}
                onChange={(e) => setGoogleHandle(e.target.value)}
                className="w-full px-3 py-2 rounded-md text-sm ev-input"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGoogleModal(false)}
                className="ev-btn-secondary px-4 py-2 rounded-md text-xs"
              >
                Cancel
              </button>
              <button type="submit" className="ev-btn-primary px-4 py-2 rounded-md text-xs">
                Continue
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function RegisterPage() {
  const { setUser, refreshAuth, openMailbox, showToast } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roleHeadline, setRoleHeadline] = useState('');
  const [defaultAnonymous, setDefaultAnonymous] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Layoff',
    'Resignation',
    'Positive exit',
  ]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await apiFetch<{ user: AuthUser }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          displayName,
          roleHeadline,
          defaultAnonymous,
          categories: selectedCategories,
        }),
      });
      setUser(res.user);
      await refreshAuth();
      showToast('Account created. Check the Mail Outbox icon to verify your email.', 'success');
      navigate('/dashboard');
      setTimeout(() => openMailbox(), 450);
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12 space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-editorial text-4xl text-[var(--text-primary)]">
          Create your ExitVoice account
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Your legal name is never requested. Account identity and public authorship stay separate.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ev-surface rounded-lg p-6 space-y-5">
        {error && (
          <div className="p-3 rounded-md bg-[var(--status-danger-bg)] text-[var(--status-danger)] text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Private Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@personal-email.com"
              className="w-full px-3 py-2 rounded-md text-sm ev-input"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Tip: use a personal email rather than a current employer address.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Password (8+ characters) *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3 py-2 rounded-md text-sm ev-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t ev-border">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Chosen Public Handle *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                @
              </span>
              <input
                type="text"
                required
                minLength={3}
                maxLength={28}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="quiet_ledger"
                className="w-full pl-7 pr-3 py-2 rounded-md text-sm ev-input"
              />
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Pick a handle you don’t mind being public when not posting anonymously.
            </p>
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
              placeholder="e.g. Former Operations Analyst"
              className="w-full px-3 py-2 rounded-md text-sm ev-input"
            />
          </div>
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-md bg-[var(--bg-subtle)]">
          <input
            type="checkbox"
            checked={defaultAnonymous}
            onChange={(e) => setDefaultAnonymous(e.target.checked)}
            className="mt-0.5 accent-[var(--accent)]"
          />
          <span className="text-xs text-[var(--text-primary)] leading-relaxed">
            <strong>Default to Anonymous publishing</strong> — pre-select anonymous authorship
            whenever I start a new story or comment (you can change this per post anytime).
          </span>
        </label>

        {/* Personalize Feed Topics */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-[var(--text-secondary)]">
            Topics you care about (personalizes your Home Dashboard)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {EXPERIENCE_CATEGORIES.map((cat) => {
              const active = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[var(--accent-tint)] text-[var(--accent-text)] border border-[var(--accent)]'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-transparent'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Honest Data Notice */}
        <div className="p-3.5 rounded-md border ev-border bg-[var(--bg-page)] flex items-start gap-2.5 text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
          <p>
            <strong>Transparency notice:</strong> Your email address is never displayed to other
            users. Account associations, session records, and moderation logs are stored securely
            to operate the service and may be retained where required for platform security or
            valid legal process.
          </p>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full ev-btn-primary py-2.5 rounded-md text-sm disabled:opacity-50"
        >
          {busy ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-xs text-[var(--text-secondary)]">
        Already have an account?{' '}
        <Link to="/signin" className="font-semibold text-[var(--accent-text)] hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { openMailbox, refreshAuth } = useApp();
  const [email, setEmail] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSentMessage(res.message);
      await refreshAuth();
    } catch (err: any) {
      setSentMessage(err?.message || 'Unable to process request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14 space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-editorial text-4xl text-[var(--text-primary)]">Reset your password</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Enter your account email and we will generate a one-hour password reset link.
        </p>
      </div>

      <div className="ev-surface rounded-lg p-6 space-y-4">
        {sentMessage ? (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-[var(--text-primary)] bg-[var(--status-positive-bg)] p-3.5 rounded-md">
              {sentMessage}
            </p>
            <button
              type="button"
              onClick={openMailbox}
              className="w-full ev-btn-primary py-2.5 rounded-md text-xs inline-flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              <span>Open Mail Outbox to Click Reset Link</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Account email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maya@exitvoice.local"
                className="w-full px-3 py-2 rounded-md text-sm ev-input"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full ev-btn-primary py-2.5 rounded-md text-sm"
            >
              {busy ? 'Sending link…' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-xs text-[var(--text-secondary)]">
        <Link to="/signin" className="text-[var(--accent-text)] hover:underline">
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { setUser, refreshAuth, showToast } = useApp();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch<{ user: AuthUser }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setUser(res.user);
      await refreshAuth();
      showToast('Password updated and signed in.', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired reset link.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14 space-y-6">
      <h1 className="font-editorial text-4xl text-[var(--text-primary)]">Choose a new password</h1>
      <form onSubmit={handleSubmit} className="ev-surface rounded-lg p-6 space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-[var(--status-danger-bg)] text-[var(--status-danger)] text-xs">
            {error}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            New Password (8+ characters)
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm ev-input"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Confirm New Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm ev-input"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !token}
          className="w-full ev-btn-primary py-2.5 rounded-md text-sm disabled:opacity-50"
        >
          {busy ? 'Updating…' : 'Save New Password'}
        </button>
      </form>
    </div>
  );
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { refreshAuth } = useApp();
  const [state, setState] = useState<'verifying' | 'ok' | 'error'>('verifying');
  const [message, setMessage] = useState('Confirming your email verification token…');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Verification token missing from URL.');
      return;
    }
    apiFetch('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(async () => {
        setState('ok');
        setMessage('Your email address has been verified.');
        await refreshAuth();
      })
      .catch((err: any) => {
        setState('error');
        setMessage(err?.message || 'Unable to verify email link.');
      });
  }, [token, refreshAuth]);

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="ev-surface rounded-lg p-7 text-center space-y-4">
        {state === 'ok' && (
          <CheckCircle2 className="w-8 h-8 text-[var(--status-positive)] mx-auto" />
        )}
        <h1 className="font-editorial text-3xl text-[var(--text-primary)]">
          {state === 'verifying'
            ? 'Verifying Email…'
            : state === 'ok'
              ? 'Email Confirmed'
              : 'Verification Issue'}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">{message}</p>
        <div className="pt-2">
          <Link to="/dashboard" className="ev-btn-primary inline-block px-5 py-2 rounded-md text-xs">
            Go to Your Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

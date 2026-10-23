import { Router, Request, Response } from 'express';
import { db, runInTransaction } from '../db';
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  requireAuth,
  serializeAuthUser,
} from '../authMiddleware';
import {
  createId,
  createSecureToken,
  hashPassword,
  verifyPassword,
} from '../security';
import { EXPERIENCE_CATEGORIES, INDUSTRIES } from '../../shared/constants';

export const authRouter = Router();

const MAILBOX_HINT_COOKIE = 'ev_mail_hint';

function createSessionForUser(req: Request, res: Response, userId: string): string {
  const sessionId = createSecureToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const ua = String(req.headers['user-agent'] || 'Web Browser').slice(0, 180);

  db.prepare(
    'INSERT INTO sessions (id, user_id, user_agent, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).run(sessionId, userId, ua, now.toISOString(), expiresAt.toISOString());

  res.cookie(SESSION_COOKIE_NAME, sessionId, getSessionCookieOptions(req));
  return sessionId;
}

function sendOutboxEmail(params: {
  toEmail: string;
  subject: string;
  bodyText: string;
  actionLabel?: string;
  actionUrl?: string;
}) {
  const id = createId('mail');
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO mailbox_messages (id, to_email, subject, body_text, action_label, action_url, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(
    id,
    params.toEmail.toLowerCase(),
    params.subject,
    params.bodyText,
    params.actionLabel || null,
    params.actionUrl || null,
    now
  );
  return id;
}

authRouter.get('/me', (req: Request, res: Response) => {
  const hintEmail = req.viewer?.email || req.cookies?.[MAILBOX_HINT_COOKIE] || null;
  let unreadMailCount = 0;
  if (hintEmail) {
    const row = db
      .prepare('SELECT COUNT(*) as count FROM mailbox_messages WHERE to_email = ? AND is_read = 0')
      .get(String(hintEmail).toLowerCase()) as { count: number };
    unreadMailCount = row.count;
  }

  if (!req.viewer) {
    res.json({ user: null, unreadMailCount });
    return;
  }

  res.json({
    user: serializeAuthUser(req.viewer.id),
    unreadMailCount,
  });
});

authRouter.post('/register', (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const rawHandle = String(req.body?.displayName || '').trim();
  const roleHeadline = String(req.body?.roleHeadline || '').trim().slice(0, 80);
  const defaultAnonymous = Boolean(req.body?.defaultAnonymous ?? true);
  const categories: string[] = Array.isArray(req.body?.categories) ? req.body.categories : [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }
  const displayName = rawHandle.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28);
  if (displayName.length < 3) {
    res.status(400).json({
      error: 'Choose a public handle of 3–28 letters, numbers, underscores, or hyphens.',
    });
    return;
  }

  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingEmail) {
    res.status(409).json({ error: 'An account with this email already exists. Try signing in.' });
    return;
  }
  const existingHandle = db
    .prepare('SELECT id FROM users WHERE LOWER(display_name) = LOWER(?)')
    .get(displayName);
  if (existingHandle) {
    res.status(409).json({ error: `The handle "${displayName}" is already taken.` });
    return;
  }

  const userId = createId('usr');
  const verifyToken = createSecureToken();
  const now = new Date();
  const verifyExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  runInTransaction(() => {
    db.prepare(
      `INSERT INTO users (
        id, email, password_hash, display_name, role_headline, bio, role,
        email_verified, default_anonymous, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, '', 'member', 0, ?, ?, ?)`
    ).run(
      userId,
      email,
      hashPassword(password),
      displayName,
      roleHeadline,
      defaultAnonymous ? 1 : 0,
      now.toISOString(),
      now.toISOString()
    );

    const insertInterest = db.prepare(
      'INSERT OR IGNORE INTO user_interests (user_id, topic_type, topic_value) VALUES (?, ?, ?)'
    );
    for (const cat of categories) {
      if ((EXPERIENCE_CATEGORIES as readonly string[]).includes(cat)) {
        insertInterest.run(userId, 'category', cat);
      }
    }

    db.prepare(
      'INSERT INTO auth_tokens (token, user_id, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(verifyToken, userId, 'email_verify', verifyExpires, now.toISOString());

    sendOutboxEmail({
      toEmail: email,
      subject: 'Verify your ExitVoice email address',
      bodyText: `Welcome to ExitVoice (@${displayName}).\n\nYour email address (${email}) is stored privately for account recovery and notifications — it is never shown on stories or comments.\n\nConfirm your email address using the button below within 24 hours.`,
      actionLabel: 'Confirm email address',
      actionUrl: `/verify-email?token=${verifyToken}`,
    });

    db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, link_url, is_read, created_at)
       VALUES (?, ?, 'welcome', ?, ?, '/submit', 0, ?)`
    ).run(
      createId('ntf'),
      userId,
      `Welcome to ExitVoice, @${displayName}`,
      'Your email is never displayed publicly. You can post under your handle, post anonymously, or keep private drafts.',
      now.toISOString()
    );
  });

  createSessionForUser(req, res, userId);
  res.cookie(MAILBOX_HINT_COOKIE, email, getSessionCookieOptions(req));

  res.status(201).json({
    user: serializeAuthUser(userId),
    unreadMailCount: 1,
    verificationSent: true,
  });
});

authRouter.post('/login', (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    res.status(400).json({ error: 'Please enter both your email and password.' });
    return;
  }

  const row = db
    .prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
    .get(email) as { id: string; email: string; password_hash: string | null } | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'Incorrect email or password.' });
    return;
  }

  createSessionForUser(req, res, row.id);
  res.cookie(MAILBOX_HINT_COOKIE, row.email, getSessionCookieOptions(req));

  const unreadMail = db
    .prepare('SELECT COUNT(*) as count FROM mailbox_messages WHERE to_email = ? AND is_read = 0')
    .get(row.email) as { count: number };

  res.json({
    user: serializeAuthUser(row.id),
    unreadMailCount: unreadMail.count,
  });
});

// Google Sign-In handler (supports ID token payload or sandbox Google OAuth chooser)
authRouter.post('/google', (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const suggestedHandle = String(req.body?.preferredHandle || '').trim();
  const googleSub = String(req.body?.sub || `google_${email}`);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Valid Google account email is required.' });
    return;
  }

  let existing = db
    .prepare('SELECT id, email FROM users WHERE google_sub = ? OR email = ?')
    .get(googleSub, email) as { id: string; email: string } | undefined;

  const now = new Date().toISOString();

  if (!existing) {
    const userId = createId('usr');
    let baseHandle =
      suggestedHandle.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 22) ||
      `member_${Math.floor(1000 + Math.random() * 9000)}`;
    if (baseHandle.length < 3) baseHandle = `reader_${Math.floor(1000 + Math.random() * 9000)}`;

    const collision = db
      .prepare('SELECT id FROM users WHERE LOWER(display_name) = LOWER(?)')
      .get(baseHandle);
    if (collision) {
      baseHandle = `${baseHandle}_${Math.floor(10 + Math.random() * 89)}`;
    }

    db.prepare(
      `INSERT INTO users (
        id, email, password_hash, google_sub, display_name, role_headline, bio,
        role, email_verified, default_anonymous, created_at, updated_at
      ) VALUES (?, ?, NULL, ?, ?, '', '', 'member', 1, 1, ?, ?)`
    ).run(userId, email, googleSub, baseHandle, now, now);

    db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, link_url, is_read, created_at)
       VALUES (?, ?, 'welcome', ?, ?, '/settings', 0, ?)`
    ).run(
      createId('ntf'),
      userId,
      `Signed in with Google as @${baseHandle}`,
      'We generated a separate public handle so your Google display name is never exposed unless you choose it.',
      now
    );

    existing = { id: userId, email };
  } else {
    db.prepare(
      'UPDATE users SET google_sub = COALESCE(google_sub, ?), email_verified = 1, updated_at = ? WHERE id = ?'
    ).run(googleSub, now, existing.id);
  }

  createSessionForUser(req, res, existing.id);
  res.cookie(MAILBOX_HINT_COOKIE, existing.email, getSessionCookieOptions(req));

  res.json({
    user: serializeAuthUser(existing.id),
    unreadMailCount: 0,
  });
});

authRouter.post('/logout', (req: Request, res: Response) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (token) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
  }
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

authRouter.post('/logout-others', requireAuth, (req: Request, res: Response) => {
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(
    req.viewer!.id,
    req.viewer!.sessionId
  );
  res.json({ ok: true });
});

authRouter.get('/sessions', requireAuth, (req: Request, res: Response) => {
  const rows = db
    .prepare(
      'SELECT id, user_agent, created_at, expires_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC'
    )
    .all(req.viewer!.id) as {
    id: string;
    user_agent: string;
    created_at: string;
    expires_at: string;
  }[];

  res.json({
    sessions: rows.map((r) => ({
      id: r.id.slice(0, 10),
      userAgent: r.user_agent,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      isCurrent: r.id === req.viewer!.sessionId,
    })),
  });
});

authRouter.post('/resend-verification', requireAuth, (req: Request, res: Response) => {
  const viewer = req.viewer!;
  if (viewer.emailVerified) {
    res.json({ ok: true, alreadyVerified: true });
    return;
  }

  const token = createSecureToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    'INSERT INTO auth_tokens (token, user_id, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(token, viewer.id, 'email_verify', expiresAt, now.toISOString());

  sendOutboxEmail({
    toEmail: viewer.email,
    subject: 'Verify your ExitVoice email address',
    bodyText: `Hi @${viewer.displayName},\n\nClick the link below to confirm your email address (${viewer.email}).`,
    actionLabel: 'Confirm email address',
    actionUrl: `/verify-email?token=${token}`,
  });

  res.json({ ok: true });
});

authRouter.post('/verify-email', (req: Request, res: Response) => {
  const token = String(req.body?.token || '').trim();
  if (!token) {
    res.status(400).json({ error: 'Verification token is missing.' });
    return;
  }

  const row = db
    .prepare(
      "SELECT token, user_id, expires_at, used_at FROM auth_tokens WHERE token = ? AND type = 'email_verify'"
    )
    .get(token) as
    | { token: string; user_id: string; expires_at: string; used_at: string | null }
    | undefined;

  const nowIso = new Date().toISOString();
  if (!row) {
    res.status(400).json({ error: 'Invalid verification link.' });
    return;
  }
  if (row.used_at) {
    res.json({ ok: true, alreadyVerified: true, user: req.viewer ? serializeAuthUser(req.viewer.id) : null });
    return;
  }
  if (row.expires_at <= nowIso) {
    res.status(400).json({ error: 'This verification link has expired. Request a fresh one from your dashboard.' });
    return;
  }

  runInTransaction(() => {
    db.prepare('UPDATE auth_tokens SET used_at = ? WHERE token = ?').run(nowIso, token);
    db.prepare('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?').run(
      nowIso,
      row.user_id
    );
    db.prepare('UPDATE mailbox_messages SET is_read = 1 WHERE action_url LIKE ?').run(
      `%${token}%`
    );
  });

  res.json({
    ok: true,
    user: serializeAuthUser(row.user_id),
  });
});

authRouter.post('/forgot-password', (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) {
    res.status(400).json({ error: 'Please enter your account email address.' });
    return;
  }

  const user = db
    .prepare('SELECT id, email, display_name FROM users WHERE email = ?')
    .get(email) as { id: string; email: string; display_name: string } | undefined;

  if (user) {
    const token = createSecureToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    db.prepare(
      'INSERT INTO auth_tokens (token, user_id, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(token, user.id, 'password_reset', expiresAt, now.toISOString());

    sendOutboxEmail({
      toEmail: user.email,
      subject: 'Reset your ExitVoice password',
      bodyText: `We received a request to reset the password for @${user.display_name} (${user.email}).\n\nThis link expires in 60 minutes. If you did not request this change, ignore this message.`,
      actionLabel: 'Set new password',
      actionUrl: `/reset-password?token=${token}`,
    });

    res.cookie(MAILBOX_HINT_COOKIE, user.email, getSessionCookieOptions(req));
  }

  res.json({
    ok: true,
    message:
      'If an account matches that address, a reset link has been sent (check the Mail Outbox button in the top bar).',
  });
});

authRouter.post('/reset-password', (req: Request, res: Response) => {
  const token = String(req.body?.token || '').trim();
  const password = String(req.body?.password || '');

  if (!token) {
    res.status(400).json({ error: 'Reset token is required.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    return;
  }

  const row = db
    .prepare(
      "SELECT token, user_id, expires_at, used_at FROM auth_tokens WHERE token = ? AND type = 'password_reset'"
    )
    .get(token) as
    | { token: string; user_id: string; expires_at: string; used_at: string | null }
    | undefined;

  const nowIso = new Date().toISOString();
  if (!row || row.used_at || row.expires_at <= nowIso) {
    res.status(400).json({ error: 'This password reset link is invalid or has expired.' });
    return;
  }

  runInTransaction(() => {
    db.prepare('UPDATE auth_tokens SET used_at = ? WHERE token = ?').run(nowIso, token);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
      hashPassword(password),
      nowIso,
      row.user_id
    );
    // Invalidate all existing sessions on password reset for security
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
    db.prepare('UPDATE mailbox_messages SET is_read = 1 WHERE action_url LIKE ?').run(
      `%${token}%`
    );
  });

  createSessionForUser(req, res, row.user_id);
  res.json({
    ok: true,
    user: serializeAuthUser(row.user_id),
  });
});

authRouter.patch('/profile', requireAuth, (req: Request, res: Response) => {
  const viewer = req.viewer!;
  const rawHandle =
    req.body?.displayName !== undefined
      ? String(req.body.displayName).trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28)
      : viewer.displayName;

  if (rawHandle.length < 3) {
    res.status(400).json({ error: 'Public handle must be at least 3 characters.' });
    return;
  }

  const taken = db
    .prepare('SELECT id FROM users WHERE LOWER(display_name) = LOWER(?) AND id != ?')
    .get(rawHandle, viewer.id);
  if (taken) {
    res.status(409).json({ error: `Handle "${rawHandle}" is already taken.` });
    return;
  }

  const current = db
    .prepare('SELECT role_headline, bio, default_anonymous FROM users WHERE id = ?')
    .get(viewer.id) as { role_headline: string; bio: string; default_anonymous: number };

  const roleHeadline =
    req.body?.roleHeadline !== undefined
      ? String(req.body.roleHeadline).trim().slice(0, 80)
      : current.role_headline;
  const bio =
    req.body?.bio !== undefined ? String(req.body.bio).trim().slice(0, 280) : current.bio;
  const defaultAnonymous =
    req.body?.defaultAnonymous !== undefined
      ? Boolean(req.body.defaultAnonymous)
      : Boolean(current.default_anonymous);

  const nowIso = new Date().toISOString();

  runInTransaction(() => {
    db.prepare(
      `UPDATE users
       SET display_name = ?, role_headline = ?, bio = ?, default_anonymous = ?, updated_at = ?
       WHERE id = ?`
    ).run(rawHandle, roleHeadline, bio, defaultAnonymous ? 1 : 0, nowIso, viewer.id);

    if (Array.isArray(req.body?.categories) || Array.isArray(req.body?.industries)) {
      db.prepare('DELETE FROM user_interests WHERE user_id = ?').run(viewer.id);
      const ins = db.prepare(
        'INSERT OR IGNORE INTO user_interests (user_id, topic_type, topic_value) VALUES (?, ?, ?)'
      );
      if (Array.isArray(req.body.categories)) {
        for (const c of req.body.categories) {
          if ((EXPERIENCE_CATEGORIES as readonly string[]).includes(c)) {
            ins.run(viewer.id, 'category', c);
          }
        }
      }
      if (Array.isArray(req.body.industries)) {
        for (const ind of req.body.industries) {
          if ((INDUSTRIES as readonly string[]).includes(ind)) {
            ins.run(viewer.id, 'industry', ind);
          }
        }
      }
    }
  });

  res.json({ user: serializeAuthUser(viewer.id) });
});

// Transactional mailbox endpoint (scoped to signed-in user's email or mailbox hint cookie)
authRouter.get('/mailbox', (req: Request, res: Response) => {
  const email = (req.viewer?.email || req.cookies?.[MAILBOX_HINT_COOKIE] || '').toLowerCase();
  if (!email) {
    res.json({ messages: [] });
    return;
  }

  const rows = db
    .prepare(
      `SELECT id, to_email, subject, body_text, action_label, action_url, is_read, created_at
       FROM mailbox_messages
       WHERE to_email = ?
       ORDER BY created_at DESC
       LIMIT 20`
    )
    .all(email) as {
    id: string;
    to_email: string;
    subject: string;
    body_text: string;
    action_label: string | null;
    action_url: string | null;
    is_read: number;
    created_at: string;
  }[];

  res.json({
    messages: rows.map((r) => ({
      id: r.id,
      toEmail: r.to_email,
      subject: r.subject,
      bodyText: r.body_text,
      actionLabel: r.action_label,
      actionUrl: r.action_url,
      isRead: Boolean(r.is_read),
      createdAt: r.created_at,
    })),
  });
});

authRouter.post('/mailbox/:id/read', (req: Request, res: Response) => {
  db.prepare('UPDATE mailbox_messages SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

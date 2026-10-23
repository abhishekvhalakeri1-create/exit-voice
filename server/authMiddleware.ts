import { NextFunction, Request, Response } from 'express';
import { AuthUser, UserRole } from '../shared/types';
import { ExperienceCategory, Industry } from '../shared/constants';
import { db } from './db';

export const SESSION_COOKIE_NAME = 'ev_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface RequestViewer {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  emailVerified: boolean;
  sessionId: string;
}

declare global {
  namespace Express {
    interface Request {
      viewer?: RequestViewer;
    }
  }
}

export function getSessionCookieOptions(req: Request) {
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    String(req.headers.origin || '').startsWith('https://');
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isHttps,
    maxAge: SESSION_TTL_MS,
    path: '/',
  };
}

export function serializeAuthUser(userId: string): AuthUser | null {
  const row = db
    .prepare(
      `SELECT id, email, display_name, role_headline, bio, role,
              email_verified, default_anonymous, created_at
       FROM users WHERE id = ?`
    )
    .get(userId) as
    | {
        id: string;
        email: string;
        display_name: string;
        role_headline: string;
        bio: string;
        role: UserRole;
        email_verified: number;
        default_anonymous: number;
        created_at: string;
      }
    | undefined;

  if (!row) return null;

  const interestRows = db
    .prepare('SELECT topic_type, topic_value FROM user_interests WHERE user_id = ?')
    .all(userId) as { topic_type: 'category' | 'industry'; topic_value: string }[];

  const categories = interestRows
    .filter((r) => r.topic_type === 'category')
    .map((r) => r.topic_value as ExperienceCategory);
  const industries = interestRows
    .filter((r) => r.topic_type === 'industry')
    .map((r) => r.topic_value as Industry);

  const unread = db
    .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(userId) as { count: number };

  let pendingModerationCount: number | undefined;
  if (row.role === 'moderator') {
    const pendingStories = db
      .prepare("SELECT COUNT(*) as count FROM stories WHERE status = 'pending_review'")
      .get() as { count: number };
    const openReports = db
      .prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'open'")
      .get() as { count: number };
    pendingModerationCount = pendingStories.count + openReports.count;
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    roleHeadline: row.role_headline,
    bio: row.bio,
    role: row.role,
    emailVerified: Boolean(row.email_verified),
    defaultAnonymous: Boolean(row.default_anonymous),
    createdAt: row.created_at,
    interests: { categories, industries },
    unreadNotifications: unread.count,
    pendingModerationCount,
  };
}

export function attachViewer(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token || typeof token !== 'string') {
    next();
    return;
  }

  const nowIso = new Date().toISOString();
  const row = db
    .prepare(
      `SELECT s.id as session_id, s.expires_at, u.id, u.email, u.display_name, u.role, u.email_verified
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`
    )
    .get(token) as
    | {
        session_id: string;
        expires_at: string;
        id: string;
        email: string;
        display_name: string;
        role: UserRole;
        email_verified: number;
      }
    | undefined;

  if (!row || row.expires_at <= nowIso) {
    if (row) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
    }
    next();
    return;
  }

  req.viewer = {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    emailVerified: Boolean(row.email_verified),
    sessionId: row.session_id,
  };
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.viewer) {
    res.status(401).json({ error: 'Authentication required. Please sign in first.' });
    return;
  }
  next();
}

export function requireModerator(req: Request, res: Response, next: NextFunction): void {
  if (!req.viewer) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (req.viewer.role !== 'moderator') {
    res.status(403).json({ error: 'Moderator permissions are required for this action.' });
    return;
  }
  next();
}

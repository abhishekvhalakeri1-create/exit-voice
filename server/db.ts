import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.EXITVOICE_DB_PATH || path.join(DATA_DIR, 'exitvoice.db');

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    google_sub TEXT UNIQUE,
    display_name TEXT NOT NULL UNIQUE,
    role_headline TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator')),
    email_verified INTEGER NOT NULL DEFAULT 0,
    default_anonymous INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS auth_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('email_verify', 'password_reset')),
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mailbox_messages (
    id TEXT PRIMARY KEY,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    action_label TEXT,
    action_url TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_mailbox_email ON mailbox_messages(to_email, created_at DESC);

  CREATE TABLE IF NOT EXISTS user_interests (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_type TEXT NOT NULL CHECK (topic_type IN ('category', 'industry')),
    topic_value TEXT NOT NULL,
    PRIMARY KEY (user_id, topic_type, topic_value)
  );

  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    industry TEXT NOT NULL,
    headquarters TEXT,
    size_range TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    category TEXT NOT NULL,
    industry TEXT NOT NULL,
    employment_type TEXT NOT NULL,
    company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    company_descriptor TEXT,
    experience_type TEXT NOT NULL,
    duration TEXT NOT NULL,
    key_lesson TEXT NOT NULL,
    evidence_note TEXT,
    evidence_filename TEXT,
    evidence_file_data TEXT,
    identity_preference TEXT NOT NULL DEFAULT 'anonymous' CHECK (identity_preference IN ('display_name', 'anonymous')),
    author_role_context TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'needs_revision', 'rejected')),
    moderation_flag TEXT NOT NULL DEFAULT 'standard' CHECK (moderation_flag IN ('standard', 'high_care_review')),
    moderation_note TEXT,
    reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    reading_time_minutes INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_stories_status_pub ON stories(status, published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_stories_category ON stories(status, category);
  CREATE INDEX IF NOT EXISTS idx_stories_company ON stories(status, company_id);
  CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author_id, status);

  CREATE TABLE IF NOT EXISTS story_reactions (
    story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'helpful' CHECK (reaction_type IN ('helpful', 'relatable')),
    created_at TEXT NOT NULL,
    PRIMARY KEY (story_id, user_id, reaction_type)
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (story_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    is_anonymous INTEGER NOT NULL DEFAULT 0,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_comments_story ON comments(story_id, created_at ASC);

  CREATE TABLE IF NOT EXISTS comment_votes (
    comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value INTEGER NOT NULL DEFAULT 1 CHECK (value IN (-1, 1)),
    created_at TEXT NOT NULL,
    PRIMARY KEY (comment_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('story', 'comment')),
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
    resolution_note TEXT,
    resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    resolved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link_url TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
`);

export function runInTransaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

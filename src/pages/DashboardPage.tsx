import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  Check,
  Edit3,
  Eye,
  FileText,
  MailWarning,
  PenSquare,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { NotificationItem, StorySummary } from '../../shared/types';
import { EXPERIENCE_CATEGORIES } from '../../shared/constants';
import { apiFetch, formatTimeAgo } from '../lib/api';
import { useApp } from '../context/AppContext';
import { StoryCard } from '../components/StoryCard';
import { LeftTopicRail } from '../components/LeftTopicRail';

interface DashboardData {
  myStories: StorySummary[];
  bookmarks: StorySummary[];
  trending: StorySummary[];
  recent: StorySummary[];
  relevant: StorySummary[];
  popularLessons: StorySummary[];
  notifications: NotificationItem[];
}

export function DashboardPage() {
  const { user, loadingAuth, openMailbox, refreshAuth, showToast, setUser } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedTab, setFeedTab] = useState<'relevant' | 'recent' | 'trending'>('relevant');
  const [editingTopics, setEditingTopics] = useState(false);
  const [topicSelection, setTopicSelection] = useState<string[]>([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<DashboardData>('/api/dashboard');
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setTopicSelection(user.interests.categories);
      loadDashboard();
    }
  }, [user, loadDashboard]);

  if (loadingAuth) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-sm text-[var(--text-secondary)]">
        Loading your workspace…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin?next=/dashboard" replace />;
  }

  const draftsAndPending = (data?.myStories || []).filter((s) => s.status !== 'published');
  const myPublished = (data?.myStories || []).filter((s) => s.status === 'published');

  const handleResendVerify = async () => {
    try {
      await apiFetch('/api/auth/resend-verification', { method: 'POST' });
      await refreshAuth();
      showToast('Verification email sent — opening Mail Outbox.', 'success');
      openMailbox();
    } catch {
      showToast('Could not send verification email.', 'error');
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!window.confirm('Delete this story permanently?')) return;
    try {
      await apiFetch(`/api/stories/${id}`, { method: 'DELETE' });
      showToast('Story deleted.', 'neutral');
      loadDashboard();
    } catch {
      showToast('Unable to delete story.', 'error');
    }
  };

  const handleSaveTopics = async () => {
    try {
      const res = await apiFetch<{ user: typeof user }>('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          categories: topicSelection,
          industries: user.interests.industries,
        }),
      });
      setUser(res.user);
      setEditingTopics(false);
      showToast('Updated your followed topics.', 'success');
      loadDashboard();
    } catch {
      showToast('Could not update topics.', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/api/notifications/read', { method: 'POST', body: JSON.stringify({}) });
      await refreshAuth();
      loadDashboard();
    } catch {}
  };

  const activeFeedList =
    feedTab === 'relevant'
      ? data?.relevant.length
        ? data.relevant
        : data?.recent || []
      : feedTab === 'trending'
        ? data?.trending || []
        : data?.recent || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Unverified email notice */}
      {!user.emailVerified && (
        <div className="mb-6 rounded-lg p-4 bg-[var(--status-caution-bg)] border border-[var(--border-strong)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <MailWarning className="w-4 h-4 text-[var(--status-caution)] shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-[var(--text-primary)]">
                Verify your account email ({user.email})
              </p>
              <p className="text-[var(--text-secondary)] mt-0.5">
                Confirm your address via the Mail Outbox so password recovery works seamlessly.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openMailbox}
              className="ev-btn-primary px-3 py-1.5 rounded-md text-xs"
            >
              Open Mail Outbox
            </button>
            <button
              type="button"
              onClick={handleResendVerify}
              className="ev-btn-secondary px-3 py-1.5 rounded-md text-xs"
            >
              Resend Link
            </button>
          </div>
        </div>
      )}

      {/* Welcome Header Bar */}
      <div className="ev-surface rounded-lg p-5 sm:p-6 mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
            Member Dashboard
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl text-[var(--text-primary)]">
            Welcome back, @{user.displayName}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            {user.defaultAnonymous
              ? 'Default identity: Anonymous mode enabled — your handle stays hidden unless chosen.'
              : `Default identity: Publishing publicly as @${user.displayName} (switchable per post).`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {user.role === 'moderator' && (
            <Link
              to="/moderation"
              className="ev-btn-secondary px-4 py-2.5 rounded-md text-xs font-semibold"
            >
              Moderation Desk ({user.pendingModerationCount || 0})
            </Link>
          )}
          <Link
            to="/submit"
            className="ev-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs"
          >
            <PenSquare className="w-4 h-4" />
            <span>Share Your Story</span>
          </Link>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-7 items-start">
        <LeftTopicRail />

        {/* Center Feed + Personal Workspace */}
        <div className="flex-1 min-w-0 w-full space-y-8">
          {/* Personalized Feed Section */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b ev-border pb-3">
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'relevant', label: 'For Your Interests' },
                    { id: 'trending', label: 'Trending Discussions' },
                    { id: 'recent', label: 'Recently Published' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFeedTab(t.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      feedTab === t.id
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border ev-border shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setEditingTopics((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-text)] font-medium hover:underline"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Customize Topics ({user.interests.categories.length})</span>
              </button>
            </div>

            {editingTopics && (
              <div className="ev-surface rounded-lg p-4 space-y-3">
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  Select exit categories to prioritize in “For Your Interests”:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EXPERIENCE_CATEGORIES.map((cat) => {
                    const active = topicSelection.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          setTopicSelection((prev) =>
                            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                          )
                        }
                        className={`px-2.5 py-1 rounded text-xs font-medium ${
                          active
                            ? 'bg-[var(--accent-tint)] text-[var(--accent-text)] border border-[var(--accent)]'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTopics(false)}
                    className="ev-btn-secondary px-3 py-1.5 rounded-md text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTopics}
                    className="ev-btn-primary inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Interests
                  </button>
                </div>
              </div>
            )}

            {feedTab === 'relevant' && user.interests.categories.length === 0 && (
              <p className="text-xs text-[var(--text-secondary)]">
                You haven’t chosen specific topics yet — showing recent community stories below.
              </p>
            )}

            {loading ? (
              <div className="ev-surface rounded-lg p-6 text-xs text-[var(--text-secondary)]">
                Loading community stories…
              </div>
            ) : activeFeedList.length === 0 ? (
              <div className="ev-surface rounded-lg p-8 text-center space-y-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  No stories match this view yet
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Explore all categories or share your own workplace experience.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {activeFeedList.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    onBookmarkChange={() => loadDashboard()}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Drafts & Pending Submissions */}
          <section id="drafts" className="ev-surface rounded-lg p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="font-editorial text-2xl text-[var(--text-primary)]">
                  Your Drafts &amp; Submissions
                </h2>
              </div>
              <Link to="/submit" className="text-xs font-medium text-[var(--accent-text)] hover:underline">
                + New draft
              </Link>
            </div>

            {draftsAndPending.length === 0 && myPublished.length === 0 ? (
              <div className="rounded-md bg-[var(--bg-page)] border ev-border p-6 text-center space-y-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  No drafts or submitted stories yet
                </p>
                <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                  You can jot down notes privately after a difficult meeting or exit without publishing
                  anything to the public feed.
                </p>
                <div className="pt-1">
                  <Link
                    to="/submit"
                    className="ev-btn-secondary inline-block px-4 py-1.5 rounded-md text-xs"
                  >
                    Start a Private Draft
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {[...draftsAndPending, ...myPublished].map((item) => (
                  <div
                    key={item.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${
                            item.status === 'published'
                              ? 'bg-[var(--status-positive-bg)] text-[var(--status-positive)]'
                              : item.status === 'pending_review'
                                ? 'bg-[var(--status-caution-bg)] text-[var(--status-caution)]'
                                : item.status === 'needs_revision'
                                  ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]'
                                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          Updated {formatTimeAgo(item.updatedAt)} ·{' '}
                          {item.isAnonymous ? 'Anonymous' : `@${user.displayName}`}
                        </span>
                      </div>
                      <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                        {item.title}
                      </p>
                      {item.moderationNote && (
                        <p className="text-xs text-[var(--accent-text)]">
                          Moderator note: {item.moderationNote}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/stories/${item.slug}`}
                        className="ev-btn-secondary inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                      {item.status !== 'published' && (
                        <Link
                          to={`/submit/${item.id}`}
                          className="ev-btn-primary inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(item.id)}
                        aria-label="Delete story"
                        className="p-1.5 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--status-danger)]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Bookmarked Stories Section */}
          <section id="bookmarks" className="space-y-4">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="font-editorial text-2xl text-[var(--text-primary)]">
                Bookmarked Stories ({data?.bookmarks.length || 0})
              </h2>
            </div>

            {!data || data.bookmarks.length === 0 ? (
              <div className="ev-surface rounded-lg p-6 text-center space-y-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Your reading list is empty
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Click “Save” on any workplace exit story or lesson to keep it handy here.
                </p>
                <Link
                  to="/explore"
                  className="inline-block text-xs font-semibold text-[var(--accent-text)] hover:underline pt-1"
                >
                  Browse published stories →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.bookmarks.map((b) => (
                  <StoryCard
                    key={b.id}
                    story={b}
                    compact
                    onBookmarkChange={() => loadDashboard()}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Editorial Sidebar: Popular Lessons + Notifications + Guidelines */}
        <aside className="w-full lg:w-80 shrink-0 space-y-5">
          {/* Notifications Card */}
          <div className="ev-surface rounded-lg p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Notifications
                </h3>
              </div>
              {(data?.notifications.some((n) => !n.isRead) || false) && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-[var(--accent-text)] hover:underline"
                >
                  Mark read
                </button>
              )}
            </div>

            {!data || data.notifications.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                No notifications yet. Activity on your stories and moderation reviews will appear here.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {data.notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="py-2.5 first:pt-0 last:pb-0 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link
                        to={n.linkUrl || '/dashboard'}
                        className="text-xs font-medium text-[var(--text-primary)] hover:text-[var(--accent-text)]"
                      >
                        {!n.isRead && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mr-1.5 align-middle" />
                        )}
                        {n.title}
                      </Link>
                    </div>
                    <p className="text-[11.5px] text-[var(--text-secondary)] line-clamp-2">
                      {n.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Popular Workplace Lessons */}
          <div className="ev-surface rounded-lg p-5 space-y-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Popular Workplace Lessons
            </h3>
            {data && data.popularLessons.length > 0 ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {data.popularLessons.slice(0, 4).map((l) => (
                  <Link
                    key={l.id}
                    to={`/stories/${l.slug}`}
                    className="block py-3 first:pt-0 last:pb-0 group space-y-1"
                  >
                    <p className="text-xs text-[var(--text-primary)] leading-relaxed group-hover:text-[var(--accent-text)] transition-colors">
                      “{l.keyLesson}”
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {l.category} · {l.helpfulCount} helpful
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-secondary)]">
                Lessons appear as community members share stories.
              </p>
            )}
          </div>

          {/* Community Guidelines */}
          <div className="ev-surface rounded-lg p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Community Ground Rules
            </h3>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              <li>
                <strong className="text-[var(--text-primary)]">1. Describe processes, not private lives.</strong>{' '}
                Never post personal phone numbers, home addresses, or non-executive private names.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">2. Keep secrets out.</strong>{' '}
                Omit customer lists, source code, passwords, and non-public financial numbers.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">3. Argue ideas, not people.</strong>{' '}
                Disagreement in threads is healthy; personal insults get removed.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

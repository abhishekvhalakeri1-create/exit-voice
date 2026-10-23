import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  Bookmark,
  Building2,
  Clock,
  Edit3,
  Flag,
  HeartHandshake,
  Lock,
  Share2,
  Trash2,
} from 'lucide-react';
import { CommentItem, StoryDetail, StorySummary } from '../../shared/types';
import { apiFetch, formatFullDate, renderStoryBody } from '../lib/api';
import { useApp } from '../context/AppContext';
import { getCategoryTone } from '../components/StoryCard';
import { CommentThread } from '../components/CommentThread';
import { LeftTopicRail } from '../components/LeftTopicRail';

export function StoryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, showToast, openReportModal } = useApp();
  const navigate = useNavigate();

  const [story, setStory] = useState<StoryDetail | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [related, setRelated] = useState<StorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    apiFetch<{
      story: StoryDetail;
      comments: CommentItem[];
      related: StorySummary[];
    }>(`/api/stories/${encodeURIComponent(slug)}`)
      .then((res) => {
        setStory(res.story);
        setComments(res.comments);
        setRelated(res.related);
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleReaction = async (type: 'helpful' | 'relatable') => {
    if (!story) return;
    if (!user) {
      showToast('Sign in to react to workplace stories.', 'neutral');
      navigate('/signin');
      return;
    }
    try {
      const res = await apiFetch<{
        helpfulCount: number;
        relatableCount: number;
        viewerHelpful: boolean;
        viewerRelatable: boolean;
      }>(`/api/stories/${story.id}/react`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      });
      setStory((prev) =>
        prev
          ? {
              ...prev,
              helpfulCount: res.helpfulCount,
              relatableCount: res.relatableCount,
              viewerHelpful: res.viewerHelpful,
              viewerRelatable: res.viewerRelatable,
            }
          : null
      );
    } catch {
      showToast('Could not save reaction.', 'error');
    }
  };

  const handleBookmark = async () => {
    if (!story) return;
    if (!user) {
      showToast('Sign in to save stories to your bookmarks.', 'neutral');
      navigate('/signin');
      return;
    }
    try {
      const res = await apiFetch<{ viewerBookmarked: boolean; bookmarkCount: number }>(
        `/api/stories/${story.id}/bookmark`,
        { method: 'POST' }
      );
      setStory((prev) =>
        prev
          ? {
              ...prev,
              viewerBookmarked: res.viewerBookmarked,
              bookmarkCount: res.bookmarkCount,
            }
          : null
      );
      showToast(
        res.viewerBookmarked ? 'Saved to your bookmarks.' : 'Removed from bookmarks.',
        'neutral'
      );
    } catch {
      showToast('Unable to update bookmark.', 'error');
    }
  };

  const handleShare = async () => {
    if (!story) return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard.', 'success');
    } catch {
      showToast(url, 'neutral');
    }
  };

  const handleDeleteOwn = async () => {
    if (!story || !window.confirm('Delete this story permanently? This cannot be undone.')) return;
    try {
      await apiFetch(`/api/stories/${story.id}`, { method: 'DELETE' });
      showToast('Story deleted permanently.', 'neutral');
      navigate('/dashboard');
    } catch {
      showToast('Could not delete story.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-sm text-[var(--text-secondary)]">
        Loading story…
      </div>
    );
  }

  if (notFound || !story) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-editorial text-4xl text-[var(--text-primary)]">Story not available</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          This story may still be awaiting moderation review, saved as a private draft, or removed
          by its author.
        </p>
        <Link to="/explore" className="ev-btn-primary inline-block px-5 py-2.5 rounded-md text-xs">
          Explore Published Stories
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-7 items-start">
        <LeftTopicRail />

        {/* Center Article + Thread */}
        <main className="flex-1 min-w-0 w-full space-y-6">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Explore Stories</span>
          </Link>

          {/* Unpublished Status Banner for Author / Moderator */}
          {story.status !== 'published' && (
            <div className="rounded-lg p-4 bg-[var(--status-caution-bg)] border border-[var(--border-strong)] flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                  Private View — Status: {story.status.replace('_', ' ')}
                </p>
                <p className="text-[var(--text-secondary)]">
                  Only you and community moderators can view this page until approved.
                </p>
              </div>
              {story.isOwnStory && (
                <Link
                  to={`/submit/${story.id}`}
                  className="ev-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Draft</span>
                </Link>
              )}
            </div>
          )}

          {/* Story Editorial Sheet */}
          <article className="ev-surface rounded-lg p-6 sm:p-9 space-y-6">
            {/* Taxonomy Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Link
                to={`/explore?category=${encodeURIComponent(story.category)}`}
                className={`px-2.5 py-0.5 rounded font-medium ${getCategoryTone(story.category)}`}
              >
                {story.category}
              </Link>
              <span>·</span>
              <span>{story.experienceType}</span>
              <span>·</span>
              <Link
                to={`/explore?industry=${encodeURIComponent(story.industry)}`}
                className="hover:underline"
              >
                {story.industry}
              </Link>
            </div>

            {/* Expressive Editorial Headline */}
            <h1 className="font-editorial text-3xl sm:text-5xl leading-[1.1] text-[var(--text-primary)]">
              {story.title}
            </h1>

            {/* Author & Employment Context Strip */}
            <div className="pb-5 border-b ev-border flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-[var(--text-primary)]">
                  {story.authorLabel}
                </span>
                <span>·</span>
                <span>
                  {story.employmentType} ({story.duration})
                </span>
                <span>·</span>
                <span>{formatFullDate(story.publishedAt || story.createdAt)}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {story.readingTimeMinutes} min read
                </span>
              </div>

              {(story.isOwnStory || user?.role === 'moderator') && (
                <button
                  type="button"
                  onClick={handleDeleteOwn}
                  className="inline-flex items-center gap-1 text-xs text-[var(--status-danger)] hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>

            {/* Story Body */}
            <div className="max-w-[68ch]">{renderStoryBody(story.content)}</div>

            {/* Key Lesson Callout Box */}
            <div className="rounded-lg bg-[var(--bg-subtle)] p-5 border-l-3 border-[var(--accent)] space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                Key Lesson Learned
              </p>
              <p className="text-sm sm:text-[15px] leading-relaxed font-medium text-[var(--text-primary)]">
                {story.keyLesson}
              </p>
            </div>

            {/* Private Moderator/Author Evidence Box (Never sent to public viewers) */}
            {(story.evidenceNote || story.evidenceFilename) && (
              <div className="rounded-md p-4 border ev-border bg-[var(--bg-page)] text-xs space-y-1">
                <p className="font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Private Verification Note (Visible only to author &amp; moderators)
                </p>
                {story.evidenceNote && (
                  <p className="text-[var(--text-secondary)]">{story.evidenceNote}</p>
                )}
                {story.evidenceFilename && (
                  <p className="text-[var(--status-positive)]">
                    Attached file on record: {story.evidenceFilename}
                  </p>
                )}
              </div>
            )}

            {/* Interactive Reaction & Utility Toolbar */}
            {story.status === 'published' && (
              <div className="pt-4 border-t ev-border flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReaction('helpful')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors ${
                      story.viewerHelpful
                        ? 'bg-[var(--accent-solid)] text-[var(--accent-on-solid)]'
                        : 'ev-btn-secondary'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4" />
                    <span>Helpful ({story.helpfulCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReaction('relatable')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
                      story.viewerRelatable
                        ? 'bg-[var(--accent-tint)] text-[var(--accent-text)] border border-[var(--accent)]'
                        : 'ev-btn-secondary'
                    }`}
                  >
                    <HeartHandshake className="w-4 h-4" />
                    <span>Been there ({story.relatableCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBookmark}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
                      story.viewerBookmarked
                        ? 'bg-[var(--accent-tint)] text-[var(--accent-text)] border border-[var(--accent)]'
                        : 'ev-btn-secondary'
                    }`}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${story.viewerBookmarked ? 'fill-current' : ''}`}
                    />
                    <span>
                      {story.viewerBookmarked ? 'Bookmarked' : `Bookmark (${story.bookmarkCount})`}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="ev-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openReportModal({
                        targetType: 'story',
                        targetId: story.id,
                        label: story.title,
                      })
                    }
                    className="ev-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs text-[var(--text-secondary)]"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report</span>
                  </button>
                </div>
              </div>
            )}
          </article>

          {/* Nested Reddit-Style Discussion Section */}
          {story.status === 'published' && (
            <CommentThread
              storyId={story.id}
              storyIsAnonymous={story.isAnonymous}
              viewerIsStoryAuthor={story.isOwnStory}
              comments={comments}
              setComments={setComments}
            />
          )}
        </main>

        {/* Right Sidebar: Workplace Card + Related Exit Accounts */}
        <aside className="w-full lg:w-76 shrink-0 space-y-5">
          {(story.companyName || story.companyDescriptor) && (
            <div className="ev-surface rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                <Building2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Workplace Context</span>
              </div>

              {story.companyName && story.companySlug ? (
                <>
                  <h3 className="font-editorial text-2xl text-[var(--text-primary)]">
                    {story.companyName}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {story.industry} · {story.companyStoryCount}{' '}
                    {story.companyStoryCount === 1 ? 'published story' : 'published stories'} on
                    ExitVoice
                  </p>
                  <Link
                    to={`/companies/${story.companySlug}`}
                    className="w-full ev-btn-secondary block text-center py-2 rounded-md text-xs"
                  >
                    View All {story.companyName} Stories
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {story.companyDescriptor}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    The author chose to describe the organization type without naming the employer
                    directly.
                  </p>
                </>
              )}
            </div>
          )}

          {related.length > 0 && (
            <div className="ev-surface rounded-lg p-5 space-y-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Related Exit Stories
              </h3>
              <div className="divide-y divide-[var(--border-subtle)]">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    to={`/stories/${item.slug}`}
                    className="block py-3 first:pt-0 last:pb-0 group space-y-1"
                  >
                    <span className="text-[11px] font-medium text-[var(--accent-text)]">
                      {item.category}
                    </span>
                    <h4 className="font-editorial text-lg leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {item.commentCount} comments · {item.readingTimeMinutes} min read
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

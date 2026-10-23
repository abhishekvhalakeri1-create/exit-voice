import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUp,
  Bookmark,
  Building2,
  Clock,
  Flag,
  MessageSquare,
  Share2,
} from 'lucide-react';
import { StorySummary } from '../../shared/types';
import { apiFetch, formatTimeAgo } from '../lib/api';
import { useApp } from '../context/AppContext';

interface StoryCardProps {
  story: StorySummary;
  compact?: boolean;
  onBookmarkChange?: (storyId: string, bookmarked: boolean) => void;
}

export function getCategoryTone(category: string): string {
  if (category === 'Positive exit' || category === 'Career transition') {
    return 'bg-[var(--status-positive-bg)] text-[var(--status-positive)]';
  }
  if (
    category === 'Discrimination' ||
    category === 'Workplace toxicity' ||
    category === 'Unfair treatment'
  ) {
    return 'bg-[var(--accent-tint)] text-[var(--accent-text)]';
  }
  return 'bg-[var(--bg-subtle)] text-[var(--text-primary)]';
}

export function StoryCard({ story, compact = false, onBookmarkChange }: StoryCardProps) {
  const { user, showToast, openReportModal } = useApp();
  const navigate = useNavigate();

  const [helpfulCount, setHelpfulCount] = useState(story.helpfulCount);
  const [viewerHelpful, setViewerHelpful] = useState(story.viewerHelpful);
  const [bookmarkCount, setBookmarkCount] = useState(story.bookmarkCount);
  const [bookmarked, setBookmarked] = useState(story.viewerBookmarked);
  const [busyVote, setBusyVote] = useState(false);

  const handleVote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast('Sign in to mark stories as helpful.', 'neutral');
      navigate('/signin');
      return;
    }
    if (busyVote) return;
    setBusyVote(true);

    const prevHelpful = viewerHelpful;
    const prevCount = helpfulCount;
    setViewerHelpful(!prevHelpful);
    setHelpfulCount(prevHelpful ? prevCount - 1 : prevCount + 1);

    try {
      const res = await apiFetch<{ helpfulCount: number; viewerHelpful: boolean }>(
        `/api/stories/${story.id}/react`,
        {
          method: 'POST',
          body: JSON.stringify({ type: 'helpful' }),
        }
      );
      setHelpfulCount(res.helpfulCount);
      setViewerHelpful(res.viewerHelpful);
    } catch {
      setViewerHelpful(prevHelpful);
      setHelpfulCount(prevCount);
    } finally {
      setBusyVote(false);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast('Sign in to bookmark stories for later reading.', 'neutral');
      navigate('/signin');
      return;
    }
    try {
      const res = await apiFetch<{ viewerBookmarked: boolean; bookmarkCount: number }>(
        `/api/stories/${story.id}/bookmark`,
        { method: 'POST' }
      );
      setBookmarked(res.viewerBookmarked);
      setBookmarkCount(res.bookmarkCount);
      showToast(
        res.viewerBookmarked ? 'Saved to your dashboard bookmarks.' : 'Removed from bookmarks.',
        'neutral'
      );
      onBookmarkChange?.(story.id, res.viewerBookmarked);
    } catch {
      showToast('Could not update bookmark.', 'error');
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/stories/${story.slug}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showToast('Story link copied to clipboard.', 'success');
      }
    } catch {
      showToast(url, 'neutral');
    }
  };

  return (
    <article className="ev-surface rounded-lg p-4 sm:p-5 transition-colors hover:border-[var(--border-strong)]">
      <div className="flex gap-3.5 sm:gap-4">
        {/* Left Reddit-style Helpful Vote Column */}
        <div className="hidden sm:flex flex-col items-center shrink-0 pt-0.5 w-10">
          <button
            type="button"
            onClick={handleVote}
            title="Mark this exit story helpful"
            aria-label="Helpful vote"
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              viewerHelpful
                ? 'bg-[var(--accent-tint)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ArrowUp className="w-4 h-4 stroke-[2.2]" />
          </button>
          <span
            className={`text-xs font-semibold tabular-nums mt-0.5 ${
              viewerHelpful ? 'text-[var(--accent-text)]' : 'text-[var(--text-primary)]'
            }`}
          >
            {helpfulCount}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">helpful</span>
        </div>

        {/* Main Editorial & Community Content */}
        <div className="min-w-0 flex-1 space-y-2.5">
          {/* Metadata Header */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-[var(--text-secondary)]">
            <Link
              to={`/explore?category=${encodeURIComponent(story.category)}`}
              className={`px-2 py-0.5 rounded font-medium text-[11.5px] ${getCategoryTone(
                story.category
              )}`}
            >
              {story.category}
            </Link>

            <span>·</span>
            <span>{story.experienceType}</span>

            {(story.companyName || story.companyDescriptor) && (
              <>
                <span>·</span>
                {story.companySlug && story.companyName ? (
                  <Link
                    to={`/companies/${story.companySlug}`}
                    className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)] hover:text-[var(--accent-text)] hover:underline"
                  >
                    <Building2 className="w-3 h-3 text-[var(--text-muted)]" />
                    {story.companyName}
                  </Link>
                ) : (
                  <span className="text-[var(--text-secondary)]">{story.companyDescriptor}</span>
                )}
              </>
            )}

            <span className="hidden md:inline">·</span>
            <span className="hidden md:inline text-[var(--text-muted)]">{story.industry}</span>
          </div>

          {/* Author & Timing Byline */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-secondary)]">{story.authorLabel}</span>
            <span>·</span>
            <span>{story.duration}</span>
            <span>·</span>
            <span>{formatTimeAgo(story.publishedAt || story.createdAt)}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {story.readingTimeMinutes} min read
            </span>
          </div>

          {/* Title */}
          <div>
            <Link to={`/stories/${story.slug}`} className="group block">
              <h2
                className={`font-editorial leading-[1.2] text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors ${
                  compact ? 'text-xl sm:text-[22px]' : 'text-[22px] sm:text-[26px]'
                }`}
              >
                {story.title}
              </h2>
            </Link>
          </div>

          {/* Excerpt */}
          {!compact && (
            <p className="text-[14.5px] leading-[1.65] text-[var(--text-secondary)] line-clamp-3">
              {story.excerpt}
            </p>
          )}

          {/* Distilled Key Lesson Box */}
          {!compact && story.keyLesson && (
            <div className="rounded-md bg-[var(--bg-subtle)] px-3.5 py-2.5 border-l-2 border-[var(--accent)]">
              <p className="text-xs leading-relaxed text-[var(--text-primary)]">
                <span className="font-semibold uppercase tracking-wider text-[10.5px] text-[var(--accent-text)] mr-2">
                  Takeaway
                </span>
                {story.keyLesson}
              </p>
            </div>
          )}

          {/* Bottom Community Actions Bar */}
          <div className="pt-1.5 flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-[var(--text-secondary)]">
            {/* Mobile helpful button */}
            <button
              type="button"
              onClick={handleVote}
              className={`sm:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium ${
                viewerHelpful
                  ? 'bg-[var(--accent-tint)] text-[var(--accent-text)]'
                  : 'hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>{helpfulCount} Helpful</span>
            </button>

            <Link
              to={`/stories/${story.slug}#discussion`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] font-medium transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>
                {story.commentCount} {story.commentCount === 1 ? 'comment' : 'comments'}
              </span>
            </Link>

            <button
              type="button"
              onClick={handleBookmark}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[var(--bg-subtle)] font-medium transition-colors ${
                bookmarked ? 'text-[var(--accent-text)]' : 'hover:text-[var(--text-primary)]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
              <span>{bookmarked ? 'Saved' : `Save${bookmarkCount > 0 ? ` (${bookmarkCount})` : ''}`}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors ml-auto"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Report</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

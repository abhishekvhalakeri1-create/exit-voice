import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  CornerDownRight,
  Flag,
  MinusSquare,
  PlusSquare,
  Trash2,
} from 'lucide-react';
import { CommentItem } from '../../shared/types';
import { apiFetch, formatTimeAgo } from '../lib/api';
import { useApp } from '../context/AppContext';

interface CommentNode extends CommentItem {
  children: CommentNode[];
}

function countSubtree(node: CommentNode): number {
  let count = 0;
  for (const child of node.children) {
    count += 1 + countSubtree(child);
  }
  return count;
}

interface CommentBranchProps {
  node: CommentNode;
  depth: number;
  storyIsAnonymous: boolean;
  viewerIsStoryAuthor: boolean;
  onReplyCreated: (comment: CommentItem) => void;
  onCommentDeleted: (commentId: string, mode: 'soft' | 'hard') => void;
}

function CommentBranch({
  node,
  depth,
  storyIsAnonymous,
  viewerIsStoryAuthor,
  onReplyCreated,
  onCommentDeleted,
}: CommentBranchProps) {
  const { user, openReportModal, showToast } = useApp();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replyAnon, setReplyAnon] = useState(
    Boolean(user?.defaultAnonymous) || (viewerIsStoryAuthor && storyIsAnonymous)
  );
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(node.score);
  const [viewerVote, setViewerVote] = useState(node.viewerVote);

  const hiddenRepliesCount = useMemo(() => countSubtree(node), [node]);

  const handleVote = async (value: 1 | -1) => {
    if (!user) {
      showToast('Sign in to vote on discussion comments.', 'neutral');
      navigate('/signin');
      return;
    }
    const prevVote = viewerVote;
    const prevScore = score;
    const nextVote = prevVote === value ? 0 : value;
    setViewerVote(nextVote);
    setScore(prevScore - prevVote + nextVote);

    try {
      const res = await apiFetch<{ score: number; viewerVote: number }>(
        `/api/comments/${node.id}/vote`,
        {
          method: 'POST',
          body: JSON.stringify({ value }),
        }
      );
      setScore(res.score);
      setViewerVote(res.viewerVote);
    } catch {
      setViewerVote(prevVote);
      setScore(prevScore);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/signin');
      return;
    }
    if (!replyBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<{ comment: CommentItem }>(
        `/api/stories/${node.storyId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({
            body: replyBody.trim(),
            parentId: node.id,
            isAnonymous: replyAnon,
          }),
        }
      );
      onReplyCreated(res.comment);
      setReplyBody('');
      setReplyOpen(false);
      showToast('Reply posted.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Unable to post reply.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await apiFetch<{ ok: boolean; mode: 'soft' | 'hard' }>(
        `/api/comments/${node.id}`,
        { method: 'DELETE' }
      );
      onCommentDeleted(node.id, res.mode);
      showToast('Comment removed.', 'neutral');
    } catch (err: any) {
      showToast(err?.message || 'Could not remove comment.', 'error');
    }
  };

  return (
    <div id={`comment-${node.id}`} className={depth > 0 ? 'mt-3' : 'py-3'}>
      {/* Comment Header Line */}
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand thread' : 'Collapse thread'}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
        >
          {collapsed ? (
            <PlusSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
          ) : (
            <MinusSquare className="w-3.5 h-3.5" />
          )}
        </button>

        <span
          className={`font-semibold ${
            node.isDeleted ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-primary)]'
          }`}
        >
          {node.authorLabel}
        </span>

        {node.isOriginalPoster && !node.isDeleted && (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-tint)] text-[var(--accent-text)]">
            OP
          </span>
        )}

        <span className="text-[var(--text-muted)]">·</span>
        <span className="text-[var(--text-muted)]">{formatTimeAgo(node.createdAt)}</span>

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="text-[11px] font-medium text-[var(--accent-text)] hover:underline ml-1"
          >
            ({hiddenRepliesCount === 0
              ? 'collapsed'
              : `${hiddenRepliesCount} ${hiddenRepliesCount === 1 ? 'reply' : 'replies'} hidden`}
            )
          </button>
        )}
      </div>

      {/* Expandable Thread Body + Vertical Collapse Rail */}
      {!collapsed && (
        <div className="flex mt-1.5">
          <div
            onClick={() => setCollapsed(true)}
            title="Click vertical line to collapse this comment branch"
            className="ev-thread-rail"
          />

          <div className="flex-1 min-w-0 pl-2 sm:pl-3 space-y-2">
            <p
              className={`text-sm leading-[1.68] whitespace-pre-line ${
                node.isDeleted ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-primary)]'
              }`}
            >
              {node.body}
            </p>

            {/* Vote + Reply + Actions */}
            {!node.isDeleted && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleVote(1)}
                    aria-label="Upvote comment"
                    className={`p-1 rounded hover:bg-[var(--bg-subtle)] ${
                      viewerVote === 1 ? 'text-[var(--accent)]' : ''
                    }`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <span
                    className={`font-semibold tabular-nums ${
                      viewerVote === 1
                        ? 'text-[var(--accent-text)]'
                        : viewerVote === -1
                          ? 'text-[var(--text-muted)]'
                          : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {score}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleVote(-1)}
                    aria-label="Downvote comment"
                    className={`p-1 rounded hover:bg-[var(--bg-subtle)] ${
                      viewerVote === -1 ? 'text-[var(--text-primary)]' : ''
                    }`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      showToast('Sign in to reply to this thread.', 'neutral');
                      navigate('/signin');
                      return;
                    }
                    setReplyOpen((o) => !o);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] font-medium"
                >
                  <CornerDownRight className="w-3 h-3" />
                  Reply
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openReportModal({
                      targetType: 'comment',
                      targetId: node.id,
                      label: `Comment by ${node.authorLabel}`,
                    })
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                >
                  <Flag className="w-3 h-3" />
                  Report
                </button>

                {(node.isOwnComment || user?.role === 'moderator') && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--status-danger)]"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                )}
              </div>
            )}

            {/* Inline Nested Reply Box */}
            {replyOpen && (
              <form onSubmit={handleReplySubmit} className="pt-2 space-y-2 max-w-2xl">
                <textarea
                  rows={3}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={`Reply to ${node.authorLabel}…`}
                  className="w-full rounded-md p-2.5 text-sm ev-input"
                  autoFocus
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={replyAnon || (viewerIsStoryAuthor && storyIsAnonymous)}
                      disabled={viewerIsStoryAuthor && storyIsAnonymous}
                      onChange={(e) => setReplyAnon(e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    <span>
                      {viewerIsStoryAuthor && storyIsAnonymous
                        ? 'Protected automatically as Original Author [OP]'
                        : 'Post reply anonymously'}
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReplyOpen(false)}
                      className="ev-btn-secondary px-3 py-1.5 rounded-md text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !replyBody.trim()}
                      className="ev-btn-primary px-3 py-1.5 rounded-md text-xs disabled:opacity-50"
                    >
                      {submitting ? 'Posting…' : 'Reply'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Render Nested Children Recursively */}
            {node.children.length > 0 && (
              <div className="pt-1">
                {node.children.map((child) => (
                  <CommentBranch
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    storyIsAnonymous={storyIsAnonymous}
                    viewerIsStoryAuthor={viewerIsStoryAuthor}
                    onReplyCreated={onReplyCreated}
                    onCommentDeleted={onCommentDeleted}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CommentThreadProps {
  storyId: string;
  storyIsAnonymous: boolean;
  viewerIsStoryAuthor: boolean;
  comments: CommentItem[];
  setComments: React.Dispatch<React.SetStateAction<CommentItem[]>>;
}

export function CommentThread({
  storyId,
  storyIsAnonymous,
  viewerIsStoryAuthor,
  comments,
  setComments,
}: CommentThreadProps) {
  const { user, showToast } = useApp();
  const [sortBy, setSortBy] = useState<'best' | 'newest' | 'oldest'>('best');
  const [body, setBody] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(
    Boolean(user?.defaultAnonymous) || (viewerIsStoryAuthor && storyIsAnonymous)
  );
  const [submitting, setSubmitting] = useState(false);

  const tree = useMemo(() => {
    const map = new Map<string, CommentNode>();
    for (const c of comments) {
      map.set(c.id, { ...c, children: [] });
    }
    const roots: CommentNode[] = [];
    for (const c of comments) {
      const current = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(current);
      } else {
        roots.push(current);
      }
    }

    const sortNodes = (list: CommentNode[]) => {
      list.sort((a, b) => {
        if (sortBy === 'best') {
          if (b.score !== a.score) return b.score - a.score;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      for (const item of list) {
        if (item.children.length > 0) sortNodes(item.children);
      }
    };

    sortNodes(roots);
    return roots;
  }, [comments, sortBy]);

  const handleTopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<{ comment: CommentItem }>(`/api/stories/${storyId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          body: body.trim(),
          parentId: null,
          isAnonymous,
        }),
      });
      setComments((prev) => [...prev, res.comment]);
      setBody('');
      showToast('Added your comment to the discussion.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Unable to post comment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyCreated = (newComment: CommentItem) => {
    setComments((prev) => [...prev, newComment]);
  };

  const handleCommentDeleted = (commentId: string, mode: 'soft' | 'hard') => {
    if (mode === 'hard') {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } else {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, isDeleted: true, body: '[Comment removed by author]', authorLabel: '[removed]' }
            : c
        )
      );
    }
  };

  const activeCount = comments.filter((c) => !c.isDeleted).length;

  return (
    <section id="discussion" className="ev-surface rounded-lg p-5 sm:p-7 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b ev-border">
        <div>
          <h3 className="font-editorial text-2xl text-[var(--text-primary)]">
            Community Discussion ({activeCount})
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Share practical advice, questions for the author, or how similar situations played out at your workplace.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[var(--text-muted)] mr-1">Sort by:</span>
          {(['best', 'newest', 'oldest'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSortBy(mode)}
              className={`px-2.5 py-1 rounded-md capitalize font-medium ${
                sortBy === mode
                  ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Top-Level Composer */}
      {user ? (
        <form onSubmit={handleTopSubmit} className="space-y-3">
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a thoughtful perspective, practical tip, or follow-up question…"
            className="w-full rounded-md p-3 text-sm ev-input"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={isAnonymous || (viewerIsStoryAuthor && storyIsAnonymous)}
                disabled={viewerIsStoryAuthor && storyIsAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span>
                {viewerIsStoryAuthor && storyIsAnonymous
                  ? 'Posting as Original Author [OP] (your handle remains hidden)'
                  : isAnonymous
                    ? 'Posting as Anonymous member'
                    : `Posting publicly as @${user.displayName}`}
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="ev-btn-primary px-4 py-2 rounded-md text-xs disabled:opacity-50"
            >
              {submitting ? 'Posting…' : 'Post Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-md bg-[var(--bg-subtle)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Join ExitVoice to ask follow-up questions, upvote helpful workplace advice, or reply anonymously.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/signin" className="ev-btn-secondary px-3.5 py-1.5 rounded-md text-xs">
              Sign In
            </Link>
            <Link to="/register" className="ev-btn-primary px-3.5 py-1.5 rounded-md text-xs">
              Create Account
            </Link>
          </div>
        </div>
      )}

      {/* Comment Tree */}
      {tree.length === 0 ? (
        <div className="py-8 text-center space-y-1.5">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            No comments on this story yet
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Be the first to offer a practical takeaway or supportive perspective.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {tree.map((node) => (
            <CommentBranch
              key={node.id}
              node={node}
              depth={0}
              storyIsAnonymous={storyIsAnonymous}
              viewerIsStoryAuthor={viewerIsStoryAuthor}
              onReplyCreated={handleReplyCreated}
              onCommentDeleted={handleCommentDeleted}
            />
          ))}
        </div>
      )}
    </section>
  );
}

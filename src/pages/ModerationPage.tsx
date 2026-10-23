import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertTriangle, Check, Lock, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { apiFetch, formatTimeAgo, renderStoryBody } from '../lib/api';
import { useApp } from '../context/AppContext';

export function ModerationPage() {
  const { user, loadingAuth, showToast, refreshAuth, refreshMeta } = useApp();
  const [pendingStories, setPendingStories] = useState<any[]>([]);
  const [openReports, setOpenReports] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ pendingStories: any[]; openReports: any[] }>(
        '/api/moderation/queue'
      );
      setPendingStories(res.pendingStories);
      setOpenReports(res.openReports);
    } catch {
      setPendingStories([]);
      setOpenReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'moderator') {
      loadQueue();
    }
  }, [user, loadQueue]);

  if (loadingAuth) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-sm text-[var(--text-secondary)]">
        Loading moderation desk…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin?next=/moderation" replace />;
  }

  if (user.role !== 'moderator') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-3">
        <h1 className="font-editorial text-3xl text-[var(--text-primary)]">
          Moderator permissions required
        </h1>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          To test the Moderation Desk right now, sign out and select the{' '}
          <strong>@editorial_desk</strong> moderator account on the Sign In screen.
        </p>
        <Link to="/dashboard" className="ev-btn-primary inline-block px-4 py-2 rounded-md text-xs">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const handleDecision = async (
    storyId: string,
    action: 'approve' | 'request_revision' | 'reject'
  ) => {
    try {
      const res = await apiFetch<{ slug: string }>(`/api/moderation/stories/${storyId}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          note: notes[storyId] || '',
        }),
      });
      showToast(
        action === 'approve'
          ? 'Story approved and published to live feed.'
          : action === 'request_revision'
            ? 'Revision note sent to author.'
            : 'Submission declined.',
        'success'
      );
      await refreshAuth();
      await refreshMeta();
      await loadQueue();
      if (action === 'approve') {
        void res.slug;
      }
    } catch (err: any) {
      showToast(err?.message || 'Action failed.', 'error');
    }
  };

  const handleReportAction = async (reportId: string, action: 'remove_target' | 'dismiss') => {
    try {
      await apiFetch(`/api/moderation/reports/${reportId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      showToast('Report resolved.', 'success');
      await refreshAuth();
      await loadQueue();
    } catch {
      showToast('Could not resolve report.', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b ev-border">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
            <ShieldCheck className="w-4 h-4" />
            <span>Community Trust &amp; Safety</span>
          </div>
          <h1 className="font-editorial text-4xl text-[var(--text-primary)]">Moderation Desk</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Review pre-publication story submissions for private contact details, passwords, and
            confidential data before publishing.
          </p>
        </div>
        <button
          type="button"
          onClick={loadQueue}
          className="ev-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Refresh Queue
        </button>
      </header>

      {/* Pending Submissions */}
      <section className="space-y-4">
        <h2 className="font-editorial text-2xl text-[var(--text-primary)]">
          Stories Awaiting Review ({pendingStories.length})
        </h2>

        {loading ? (
          <div className="ev-surface rounded-lg p-6 text-xs text-[var(--text-secondary)]">
            Loading submissions…
          </div>
        ) : pendingStories.length === 0 ? (
          <div className="ev-surface rounded-lg p-8 text-center space-y-1.5">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Review queue is clear
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Every pending community submission has been reviewed.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {pendingStories.map((item) => (
              <div key={item.id} className="ev-surface rounded-lg p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b ev-border text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.moderationFlag === 'high_care_review' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--status-caution-bg)] text-[var(--status-caution)] font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        High-Care Review
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-[var(--bg-subtle)] font-medium">
                      {item.category}
                    </span>
                    <span className="text-[var(--text-secondary)]">· {item.industry}</span>
                    <span className="text-[var(--text-muted)]">
                      · Public display:{' '}
                      <strong>
                        {item.identityPreference === 'anonymous'
                          ? 'Anonymous'
                          : `@${item.accountHandle}`}
                      </strong>
                    </span>
                  </div>
                  <span className="text-[var(--text-muted)]">
                    Submitted {formatTimeAgo(item.updatedAt)}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-editorial text-3xl text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  {(item.companyName || item.companyDescriptor) && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      Workplace named: <strong>{item.companyName || item.companyDescriptor}</strong>
                    </p>
                  )}
                </div>

                <div className="rounded-md bg-[var(--bg-page)] p-4 border ev-border max-h-96 overflow-y-auto">
                  {renderStoryBody(item.content)}
                </div>

                <div className="rounded-md bg-[var(--bg-subtle)] p-3.5 text-xs">
                  <strong className="text-[var(--accent-text)]">Key Lesson: </strong>
                  {item.keyLesson}
                </div>

                {(item.evidenceNote || item.evidenceFilename) && (
                  <div className="rounded-md p-3.5 border ev-border bg-[var(--bg-page)] text-xs space-y-1">
                    <p className="font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Private Supporting Evidence (Moderator Eyes Only — Never Published)
                    </p>
                    {item.evidenceNote && (
                      <p className="text-[var(--text-secondary)]">{item.evidenceNote}</p>
                    )}
                    {item.evidenceFilename && (
                      <p className="text-[var(--status-positive)]">
                        Attached file: {item.evidenceFilename}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-3 pt-2 border-t ev-border">
                  <input
                    type="text"
                    value={notes[item.id] || ''}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder="Optional note to author (e.g. 'Approved — thank you' or 'Please redact manager email on line 4')…"
                    className="w-full px-3 py-2 rounded-md text-xs ev-input"
                  />

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleDecision(item.id, 'approve')}
                      className="ev-btn-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve &amp; Publish Story
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision(item.id, 'request_revision')}
                      className="ev-btn-secondary px-4 py-2 rounded-md text-xs"
                    >
                      Request Redaction / Edits
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision(item.id, 'reject')}
                      className="ev-btn-secondary inline-flex items-center gap-1 px-4 py-2 rounded-md text-xs text-[var(--status-danger)]"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Open Community Reports */}
      <section className="space-y-4">
        <h2 className="font-editorial text-2xl text-[var(--text-primary)]">
          Open Community Reports ({openReports.length})
        </h2>

        {openReports.length === 0 ? (
          <div className="ev-surface rounded-lg p-6 text-xs text-[var(--text-secondary)]">
            No open user reports at this time.
          </div>
        ) : (
          <div className="space-y-3">
            {openReports.map((r) => (
              <div
                key={r.id}
                className="ev-surface rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-[var(--text-primary)]">
                    [{r.targetType.toUpperCase()}] {r.reason}
                  </p>
                  <p className="text-[var(--text-secondary)]">Excerpt: “{r.targetPreview}”</p>
                  {r.details && (
                    <p className="text-[var(--accent-text)]">Reporter note: {r.details}</p>
                  )}
                  {r.storySlug && (
                    <Link
                      to={`/stories/${r.storySlug}`}
                      className="inline-block text-[var(--accent-text)] hover:underline"
                    >
                      Inspect thread →
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleReportAction(r.id, 'dismiss')}
                    className="ev-btn-secondary px-3 py-1.5 rounded-md text-xs"
                  >
                    Dismiss Report
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReportAction(r.id, 'remove_target')}
                    className="ev-btn-primary px-3 py-1.5 rounded-md text-xs"
                  >
                    Remove Content
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

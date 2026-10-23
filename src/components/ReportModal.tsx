import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, X } from 'lucide-react';
import { REPORT_REASONS } from '../../shared/constants';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/api';

export function ReportModal() {
  const { reportTarget, closeReportModal, user, showToast } = useApp();
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (!reportTarget) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      closeReportModal();
      showToast('Please sign in to submit a moderation report.', 'neutral');
      navigate('/signin');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: reportTarget.targetType,
          targetId: reportTarget.targetId,
          reason,
          details,
        }),
      });
      showToast('Report submitted for moderation review. Thank you.', 'success');
      setDetails('');
      closeReportModal();
    } catch (err: any) {
      showToast(err?.message || 'Unable to submit report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
      onClick={closeReportModal}
    >
      <div
        className="w-full max-w-lg rounded-lg ev-surface p-6 space-y-5"
        style={{ boxShadow: 'var(--shadow-overlay)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Flag className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Flag content for moderation review
              </h3>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                Regarding: {reportTarget.label}
              </p>
            </div>
          </div>
          <button
            onClick={closeReportModal}
            aria-label="Close modal"
            className="p-1 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Reason for concern
            </label>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  className="flex items-start gap-2.5 p-2.5 rounded-md border ev-border hover:bg-[var(--bg-subtle)] text-sm"
                >
                  <input
                    type="radio"
                    name="report_reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span className="text-xs sm:text-sm text-[var(--text-primary)] leading-snug">
                    {r}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Additional context (optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Point to specific private information or policy concern so moderators can act quickly..."
              className="w-full rounded-md p-2.5 text-sm ev-input"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t ev-border">
            <button
              type="button"
              onClick={closeReportModal}
              className="ev-btn-secondary px-4 py-2 rounded-md text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ev-btn-primary px-4 py-2 rounded-md text-xs"
            >
              {submitting ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

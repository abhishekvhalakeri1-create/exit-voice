import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, X, ExternalLink, CheckCircle2 } from 'lucide-react';
import { MailboxMessage } from '../../shared/types';
import { apiFetch, formatTimeAgo } from '../lib/api';
import { useApp } from '../context/AppContext';

export function MailboxDrawer() {
  const { isMailboxOpen, closeMailbox, refreshAuth } = useApp();
  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isMailboxOpen) return;
    setLoading(true);
    apiFetch<{ messages: MailboxMessage[] }>('/api/auth/mailbox')
      .then((res) => setMessages(res.messages))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [isMailboxOpen]);

  if (!isMailboxOpen) return null;

  const handleActionClick = async (msg: MailboxMessage) => {
    try {
      await apiFetch(`/api/auth/mailbox/${msg.id}/read`, { method: 'POST' });
      await refreshAuth();
    } catch {}
    closeMailbox();
    if (msg.actionUrl) {
      navigate(msg.actionUrl);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      onClick={closeMailbox}
    >
      <div
        className="w-full max-w-md h-full ev-surface border-l ev-border flex flex-col justify-between overflow-hidden"
        style={{ boxShadow: 'var(--shadow-overlay)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b ev-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-[var(--accent)]" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Transactional Email Outbox
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Verification &amp; password reset emails delivered locally
              </p>
            </div>
          </div>
          <button
            onClick={closeMailbox}
            aria-label="Close mail drawer"
            className="p-1.5 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <p className="text-sm text-[var(--text-secondary)]">Loading recent emails…</p>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                No transactional emails yet
              </p>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
                When you register an account, request email verification, or reset a password,
                the message appears right here so you can complete the link flow immediately.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className="rounded-lg p-4 border ev-border bg-[var(--bg-page)] space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {!m.isRead ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)]" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-positive)]" />
                      )}
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {m.subject}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      To: {m.toEmail} · {formatTimeAgo(m.createdAt)}
                    </p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-[var(--text-primary)] whitespace-pre-line">
                  {m.bodyText}
                </p>

                {m.actionUrl && m.actionLabel && (
                  <button
                    onClick={() => handleActionClick(m)}
                    className="ev-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs"
                  >
                    <span>{m.actionLabel}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t ev-border bg-[var(--bg-subtle)] text-[11px] text-[var(--text-secondary)] leading-relaxed">
          Account emails are stored strictly for login verification and security alerts and are
          never shown on public stories or threads.
        </div>
      </div>
    </div>
  );
}

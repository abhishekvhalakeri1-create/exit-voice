import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-20 border-t ev-border ev-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b ev-border">
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-editorial text-2xl text-[var(--text-primary)]">
                ExitVoice
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                Every exit has a story.
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-md">
              Real experiences. Protected identities. Better workplaces. A community ledger for
              honest career departures, workplace patterns, and lessons worth passing forward.
            </p>
          </div>

          <div className="md:col-span-3 space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Community
            </h4>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link
                  to="/explore"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Explore Stories
                </Link>
              </li>
              <li>
                <Link
                  to="/explore?sort=discussed"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Active Discussions
                </Link>
              </li>
              <li>
                <Link
                  to="/companies"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Companies Directory
                </Link>
              </li>
              <li>
                <Link
                  to="/submit"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Share Your Story
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Trust &amp; Standards
            </h4>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link
                  to="/how-it-works"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  How Moderation &amp; Anonymity Work
                </Link>
              </li>
              <li>
                <Link
                  to="/how-it-works#privacy"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  What Is Stored vs. Publicly Visible
                </Link>
              </li>
              <li>
                <Link
                  to="/signin"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Member Sign In
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <p>ExitVoice Community Archive · Stories reflect individual member accounts, not legal advice.</p>
          <p>Never include passwords, private phone numbers, or confidential trade information.</p>
        </div>
      </div>
    </footer>
  );
}

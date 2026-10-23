import React from 'react';
import { Link } from 'react-router-dom';
import { PenSquare } from 'lucide-react';

export function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <header className="space-y-3 pb-8 border-b ev-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
          Editorial Standards &amp; Privacy Guide
        </p>
        <h1 className="font-editorial text-4xl sm:text-5xl text-[var(--text-primary)]">
          How ExitVoice Works — and How We Protect Your Identity
        </h1>
        <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          ExitVoice exists so employees can document real career departures honestly without
          turning personal transitions into engagement bait or reckless doxxing.
        </p>
      </header>

      {/* Step-by-Step Publishing Lifecycle */}
      <section className="space-y-5">
        <h2 className="font-editorial text-3xl text-[var(--text-primary)]">
          The Five-Step Publishing Flow
        </h2>
        <div className="divide-y divide-[var(--border-subtle)] ev-surface rounded-lg px-6">
          {[
            {
              n: 'Step 1 — Tell your story',
              body: 'Write what happened in plain human language: context, timeline, how leadership handled the transition, and the single lesson you wish someone had told you earlier. Drafts save automatically as you type.',
            },
            {
              n: 'Step 2 — Choose your privacy settings',
              body: 'Pick per story: publish with your chosen community display handle, publish anonymously (optionally keeping general job context such as "Former Warehouse Lead"), or save strictly as a private personal reflection.',
            },
            {
              n: 'Step 3 — Submit for review',
              body: 'Before submission, ExitVoice scans for accidentally pasted emails, phone numbers, IDs, or credentials. Every submission enters a moderation queue — serious allegations are never auto-published.',
            },
            {
              n: 'Step 4 — Share your experience with the community',
              body: 'Once approved, your story becomes searchable by category, industry, and optional company page. If you posted anonymously, you can still answer comments under a protected [OP] badge without exposing your handle.',
            },
            {
              n: 'Step 5 — Help others learn from it',
              body: 'Peers preparing for layoffs, job seekers researching workplace patterns, and managers trying to lead more humanely benefit from grounded firsthand accounts.',
            },
          ].map((row) => (
            <div key={row.n} className="py-5 space-y-1.5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{row.n}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{row.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plain-English Anonymity Disclosure */}
      <section id="privacy" className="space-y-5">
        <div className="space-y-2">
          <h2 className="font-editorial text-3xl text-[var(--text-primary)]">
            Plain-English Data &amp; Anonymity Transparency
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            No web platform connected to the internet can honestly promise "absolute anonymity."
            Instead of vague marketing claims, here is the exact breakdown of what ExitVoice
            stores, shows, and Withholds:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="ev-surface rounded-lg p-5 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--status-positive)]">
              Visible to Other Readers
            </h3>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed list-disc pl-4">
              <li>Story title, body, category, industry, tenure range, and key lesson.</li>
              <li>Optional company name only if you explicitly fill it in.</li>
              <li>
                Either your chosen handle (<code className="text-[var(--text-primary)]">@handle</code>)
                or <strong className="text-[var(--text-primary)]">Anonymous</strong> if you select
                anonymous publishing.
              </li>
            </ul>
          </div>

          <div className="ev-surface rounded-lg p-5 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
              Stored Privately on Your Account
            </h3>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed list-disc pl-4">
              <li>
                Your account email address and salted scrypt password hash (never returned in
                public API responses).
              </li>
              <li>Link between your account ID and your anonymous posts so you can edit or delete them anytime.</li>
              <li>Optional supporting verification notes, visible solely to you and moderators.</li>
            </ul>
          </div>

          <div className="ev-surface rounded-lg p-5 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--status-caution)]">
              Security &amp; Legal Limits
            </h3>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed list-disc pl-4">
              <li>Session metadata is kept to prevent abuse and allow account session revocation.</li>
              <li>
                Records may be retained where required for platform security or valid legal process
                (subpoenas or court orders).
              </li>
              <li>
                Writing unique details only one person knows can identify you regardless of software — generalize dates and team sizes if needed.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div className="ev-surface rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-editorial text-2xl text-[var(--text-primary)]">
            Ready to write yours — publicly, anonymously, or just for yourself?
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Every story can start as a completely private draft.
          </p>
        </div>
        <Link
          to="/submit"
          className="ev-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-xs shrink-0"
        >
          <PenSquare className="w-3.5 h-3.5" />
          <span>Share Your Story</span>
        </Link>
      </div>
    </div>
  );
}

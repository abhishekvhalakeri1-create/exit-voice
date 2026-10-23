import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Lock,
  MessageSquare,
  PenSquare,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { StorySummary } from '../../shared/types';
import { apiFetch, formatTimeAgo } from '../lib/api';
import { StoryCard, getCategoryTone } from '../components/StoryCard';

const FEATURES = [
  {
    num: '01',
    title: 'Anonymous storytelling',
    body: 'Separate your private account credentials from public authorship. Publish under a chosen community handle or completely anonymously on a story-by-story basis.',
  },
  {
    num: '02',
    title: 'Workplace experience discovery',
    body: 'Browse firsthand accounts across layoffs, resignations, terminations, toxic teams, career pivots, and graceful departures — filtered by industry and exit type.',
  },
  {
    num: '03',
    title: 'Company culture insights',
    body: 'See recurring exit patterns and practical takeaways shared by former employees at named organizations without fabricated star ratings or paid placements.',
  },
  {
    num: '04',
    title: 'Career lessons and reflections',
    body: 'Every published story highlights a concrete takeaway — from severance negotiation nuances and handbook clawbacks to protecting your license and mental health.',
  },
  {
    num: '05',
    title: 'Community support',
    body: 'Engage in structured, nested discussions where peers, HR practitioners, and managers trade practical perspective rather performative hot takes.',
  },
  {
    num: '06',
    title: 'Privacy-conscious publishing',
    body: 'Built-in PII warnings check drafts for personal email addresses, phone numbers, and credentials before human moderators review submissions prior to publication.',
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: 'Step 1',
    title: 'Tell your story.',
    detail:
      'Write at your own pace with automatic draft saving, clear structure prompts, and space to capture the key lesson you took away.',
  },
  {
    step: 'Step 2',
    title: 'Choose your privacy settings.',
    detail:
      'Decide whether to publish under your community display handle, publish anonymously with general role context, or keep your entry saved privately as a draft.',
  },
  {
    step: 'Step 3',
    title: 'Submit for review.',
    detail:
      'Every public story passes through moderation before going live to screen out private contact details, passwords, confidential data, and abusive attacks.',
  },
  {
    step: 'Step 4',
    title: 'Share your experience with the community.',
    detail:
      'Once approved, your story joins the searchable archive — and even anonymous authors can reply in comments with a protected OP badge.',
  },
  {
    step: 'Step 5',
    title: 'Help others learn from it.',
    detail:
      'Job seekers, peers facing similar crossroads, and thoughtful leaders gain honest visibility into how workplaces actually handle transitions.',
  },
];

const QUICK_FILTER_TABS = [
  'All',
  'Layoff',
  'Resignation',
  'Positive exit',
  'Management issues',
  'Unfair treatment',
  'Career transition',
] as const;

export function LandingPage() {
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>('All');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '5', sort: 'helpful' });
    if (selectedTab !== 'All') {
      params.set('category', selectedTab);
    }
    apiFetch<{ items: StorySummary[] }>(`/api/stories?${params.toString()}`)
      .then((res) => setStories(res.items))
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, [selectedTab]);

  const featuredSpecimen = stories[0] || null;

  return (
    <div>
      {/* Editorial Hero Section */}
      <section className="border-b ev-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-18 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left Editorial Column */}
            <div className="lg:col-span-7 space-y-6 pt-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-text)]">
                Real experiences · Protected identities · Better workplaces
              </p>

              <h1 className="font-editorial text-5xl sm:text-6xl lg:text-[66px] leading-[1.03] text-[var(--text-primary)]">
                Your exit deserves to be heard.
              </h1>

              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-[1.68] max-w-xl">
                Every workplace has a story. Share what happened, learn from others, and help
                make work better for everyone.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/submit"
                  className="ev-btn-primary inline-flex items-center gap-2 px-5 py-3 rounded-md text-sm"
                >
                  <PenSquare className="w-4 h-4" />
                  <span>Share Your Story</span>
                </Link>
                <Link
                  to="/explore"
                  className="ev-btn-secondary inline-flex items-center gap-2 px-5 py-3 rounded-md text-sm"
                >
                  <span>Explore Stories</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="pt-4 border-t ev-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[var(--text-secondary)]">
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">No real name required</p>
                  <p className="mt-0.5 leading-relaxed">
                    Separate private login credentials from public handles or anonymous authorship.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Moderated before live</p>
                  <p className="mt-0.5 leading-relaxed">
                    Every submission is checked for private data exposure and community standards.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Practical takeaways</p>
                  <p className="mt-0.5 leading-relaxed">
                    Real lessons on severance, handovers, documentation, and career transitions.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Editorial Broadsheet Specimen (Live Database Dispatch — No Stock Imagery) */}
            <div className="lg:col-span-5">
              <div className="ev-surface rounded-lg p-6 sm:p-7 space-y-5 relative">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--text-muted)] pb-3 border-b ev-border">
                  <span>From the Community Archive</span>
                  <span>Firsthand Account</span>
                </div>

                {featuredSpecimen ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded font-medium ${getCategoryTone(
                          featuredSpecimen.category
                        )}`}
                      >
                        {featuredSpecimen.category}
                      </span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span className="text-[var(--text-secondary)]">
                        {featuredSpecimen.industry}
                      </span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span className="text-[var(--text-muted)]">{featuredSpecimen.duration}</span>
                    </div>

                    <Link
                      to={`/stories/${featuredSpecimen.slug}`}
                      className="block group space-y-2"
                    >
                      <h2 className="font-editorial text-2xl sm:text-[28px] leading-[1.18] text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors">
                        “{featuredSpecimen.title}”
                      </h2>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                        {featuredSpecimen.excerpt}
                      </p>
                    </Link>

                    <div className="rounded-md bg-[var(--bg-subtle)] p-3.5 border-l-2 border-[var(--accent)]">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-text)] mb-1">
                        Author’s Key Lesson
                      </p>
                      <p className="text-xs leading-relaxed text-[var(--text-primary)]">
                        {featuredSpecimen.keyLesson}
                      </p>
                    </div>

                    <div className="pt-2 border-t ev-border flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <span>
                        {featuredSpecimen.authorLabel} ·{' '}
                        {formatTimeAgo(featuredSpecimen.publishedAt)}
                      </span>
                      <Link
                        to={`/stories/${featuredSpecimen.slug}`}
                        className="inline-flex items-center gap-1 font-medium text-[var(--accent-text)] hover:underline shrink-0"
                      >
                        <span>Read thread ({featuredSpecimen.commentCount})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 space-y-2">
                    <p className="font-editorial text-2xl text-[var(--text-primary)]">
                      Every departure teaches something worth passing on.
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Be the first to share a workplace exit reflection with the community.
                    </p>
                    <Link
                      to="/submit"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-text)] pt-2 hover:underline"
                    >
                      Write the first story <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Community Feed Preview (Reddit-style browsing right from Home) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Community Discussions
            </p>
            <h2 className="font-editorial text-3xl sm:text-4xl text-[var(--text-primary)] mt-1">
              Recent exits &amp; workplace conversations
            </h2>
          </div>
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-text)] hover:underline"
          >
            <span>Open full discovery feed</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Category Filter Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {QUICK_FILTER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium shrink-0 transition-colors ${
                selectedTab === tab
                  ? 'bg-[var(--accent-solid)] text-[var(--accent-on-solid)]'
                  : 'ev-surface text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="ev-surface rounded-lg p-8 text-sm text-[var(--text-secondary)]">
            Loading published stories…
          </div>
        ) : stories.length === 0 ? (
          <div className="ev-surface rounded-lg p-10 text-center space-y-2">
            <p className="font-medium text-sm text-[var(--text-primary)]">
              No published stories in “{selectedTab}” yet.
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Have firsthand experience in this category? Share your perspective with others.
            </p>
            <div className="pt-2">
              <Link to="/submit" className="ev-btn-primary inline-block px-4 py-2 rounded-md text-xs">
                Share Your Story
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {stories.slice(0, 4).map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        )}
      </section>

      {/* Trust & Identity Protection Section */}
      <section className="border-y ev-border ev-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                Trust &amp; Candor
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl leading-tight text-[var(--text-primary)]">
                Honest about privacy. Serious about moderation.
              </h2>
              <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
                Leaving a job often involves non-disparagement clauses, small industry networks,
                and real career stakes. ExitVoice gives you granular control over how your story
                appears — and explains plainly how information is handled rather than making
                impossible promises.
              </p>
              <Link
                to="/how-it-works#privacy"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-text)] hover:underline pt-1"
              >
                Read our full Data &amp; Anonymity disclosure
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg p-5 bg-[var(--bg-page)] border ev-border space-y-2.5">
                <Lock className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Separated Identity
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Your account email is never shown anywhere on ExitVoice. Choose a public handle,
                  switch to anonymous mode per post, or keep entries purely private as drafts.
                </p>
              </div>

              <div className="rounded-lg p-5 bg-[var(--bg-page)] border ev-border space-y-2.5">
                <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Redaction First
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Automated pre-submission checks warn you if personal email addresses, phone
                  numbers, or credential strings appear in your text before a moderator sees it.
                </p>
              </div>

              <div className="rounded-lg p-5 bg-[var(--bg-page)] border ev-border space-y-2.5">
                <Scale className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Human Review Queue
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Stories are reviewed prior to publication. Serious workplace allegations receive
                  dedicated care review rather than reckless instant amplification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Six Core Capabilities Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-10">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            What ExitVoice Built
          </p>
          <h2 className="font-editorial text-3xl sm:text-4xl text-[var(--text-primary)]">
            Designed for reflection, transparency, and practical learning
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8 pt-2">
          {FEATURES.map((item) => (
            <div key={item.num} className="pt-5 border-t ev-border space-y-2">
              <span className="text-xs font-mono text-[var(--accent-text)]">{item.num}</span>
              <h3 className="font-editorial text-2xl text-[var(--text-primary)]">{item.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works — 5 Steps Section */}
      <section id="how-it-works" className="border-t ev-border ev-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                How It Works
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl text-[var(--text-primary)]">
                Five deliberate steps from draft to community resource
              </h2>
            </div>
            <Link
              to="/submit"
              className="ev-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs self-start sm:self-auto"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Start a Private Draft</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {HOW_IT_WORKS_STEPS.map((s) => (
              <div
                key={s.step}
                className="rounded-lg p-5 bg-[var(--bg-page)] border ev-border flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                    {s.step}
                  </span>
                  <h3 className="font-editorial text-2xl leading-snug text-[var(--text-primary)]">
                    {s.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {s.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

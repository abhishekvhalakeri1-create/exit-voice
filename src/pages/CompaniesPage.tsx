import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, PenSquare, Search, Users } from 'lucide-react';
import { CompanySummary, StorySummary } from '../../shared/types';
import { INDUSTRIES } from '../../shared/constants';
import { apiFetch, formatTimeAgo } from '../lib/api';
import { StoryCard, getCategoryTone } from '../components/StoryCard';
import { LeftTopicRail } from '../components/LeftTopicRail';

export function CompaniesListPage() {
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [q, setQ] = useState('');
  const [industry, setIndustry] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (industry !== 'All') params.set('industry', industry);

    apiFetch<{ companies: CompanySummary[] }>(`/api/companies?${params.toString()}`)
      .then((res) => setCompanies(res.companies))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, [q, industry]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-7 items-start">
        <LeftTopicRail />

        <main className="flex-1 min-w-0 w-full space-y-6">
          <div className="ev-surface rounded-lg p-5 sm:p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                Workplace Culture Index
              </p>
              <h1 className="font-editorial text-3xl sm:text-4xl text-[var(--text-primary)]">
                Companies Mentioned in Exit Stories
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                No fabricated 5-star scores. Each workplace entry aggregates actual published
                employee exit stories and recurring departure categories.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              <div className="sm:col-span-7 relative">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search organization name…"
                  className="w-full pl-8 pr-3 py-2 rounded-md text-xs ev-input"
                />
              </div>
              <div className="sm:col-span-5">
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-xs ev-input"
                >
                  <option value="All">All industries</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="ev-surface rounded-lg p-8 text-sm text-[var(--text-secondary)]">
              Loading companies…
            </div>
          ) : companies.length === 0 ? (
            <div className="ev-surface rounded-lg p-10 text-center space-y-2.5">
              <p className="font-medium text-sm text-[var(--text-primary)]">
                No matching companies with published stories yet
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                When an author chooses to include an employer name and the story is approved, its
                workplace page appears automatically.
              </p>
              <div className="pt-2">
                <Link to="/submit" className="ev-btn-primary inline-block px-4 py-2 rounded-md text-xs">
                  Share a Story
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map((c) => (
                <Link
                  key={c.id}
                  to={`/companies/${c.slug}`}
                  className="ev-surface rounded-lg p-5 hover:border-[var(--border-strong)] transition-colors flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-editorial text-2xl text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors">
                        {c.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-xs font-semibold tabular-nums text-[var(--text-primary)] shrink-0">
                        {c.storyCount} {c.storyCount === 1 ? 'story' : 'stories'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
                      <span>{c.industry}</span>
                      {c.headquarters && (
                        <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
                          <MapPin className="w-3 h-3" />
                          {c.headquarters}
                        </span>
                      )}
                      {c.sizeRange && (
                        <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
                          <Users className="w-3 h-3" />
                          {c.sizeRange}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t ev-border">
                    <div className="flex flex-wrap gap-1.5">
                      {c.topCategories.map((tc) => (
                        <span
                          key={tc.category}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${getCategoryTone(
                            tc.category
                          )}`}
                        >
                          {tc.category} ({tc.count})
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Latest story {formatTimeAgo(c.latestStoryAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export function CompanyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [company, setCompany] = useState<CompanySummary | null>(null);
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiFetch<{ company: CompanySummary; stories: StorySummary[] }>(
      `/api/companies/${encodeURIComponent(slug)}`
    )
      .then((res) => {
        setCompany(res.company);
        setStories(res.stories);
      })
      .catch(() => setCompany(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-sm text-[var(--text-secondary)]">
        Loading workplace insights…
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-3">
        <h1 className="font-editorial text-4xl text-[var(--text-primary)]">Workplace not found</h1>
        <Link
          to="/companies"
          className="ev-btn-primary inline-block px-4 py-2 rounded-md text-xs"
        >
          Back to Companies Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-7 items-start">
        <LeftTopicRail />

        <main className="flex-1 min-w-0 w-full space-y-6">
          <Link
            to="/companies"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Companies</span>
          </Link>

          <div className="ev-surface rounded-lg p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-text)]">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{company.industry}</span>
                </div>
                <h1 className="font-editorial text-3xl sm:text-5xl text-[var(--text-primary)]">
                  {company.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                  {company.headquarters && <span>{company.headquarters}</span>}
                  {company.sizeRange && <span>· {company.sizeRange}</span>}
                  <span>
                    · {company.storyCount} published exit{' '}
                    {company.storyCount === 1 ? 'account' : 'accounts'}
                  </span>
                </div>
              </div>

              <Link
                to={`/submit?company=${encodeURIComponent(company.name)}`}
                className="ev-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs shrink-0 self-start"
              >
                <PenSquare className="w-3.5 h-3.5" />
                <span>Worked here? Share Your Exit</span>
              </Link>
            </div>

            {company.topCategories.length > 0 && (
              <div className="pt-4 border-t ev-border space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Reported Exit Themes Across Submissions
                </p>
                <div className="flex flex-wrap gap-2">
                  {company.topCategories.map((cat) => (
                    <span
                      key={cat.category}
                      className={`px-2.5 py-1 rounded text-xs font-medium ${getCategoryTone(
                        cat.category
                      )}`}
                    >
                      {cat.category}: {cat.count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3.5">
            {stories.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

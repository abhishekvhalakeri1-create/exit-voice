import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, PenSquare, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { CompanySummary, StorySummary } from '../../shared/types';
import {
  EXPERIENCE_CATEGORIES,
  EXPERIENCE_TYPES,
  INDUSTRIES,
} from '../../shared/constants';
import { apiFetch } from '../lib/api';
import { StoryCard } from '../components/StoryCard';
import { LeftTopicRail } from '../components/LeftTopicRail';

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const sort = searchParams.get('sort') || 'latest';
  const category = searchParams.get('category') || 'All';
  const industry = searchParams.get('industry') || 'All';
  const experienceType = searchParams.get('experienceType') || 'All';
  const urlQ = searchParams.get('q') || '';
  const urlCompany = searchParams.get('company') || '';

  const [keywordInput, setKeywordInput] = useState(urlQ);
  const [companyInput, setCompanyInput] = useState(urlCompany);
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [topCompanies, setTopCompanies] = useState<CompanySummary[]>([]);

  useEffect(() => {
    setKeywordInput(urlQ);
    setCompanyInput(urlCompany);
  }, [urlQ, urlCompany]);

  useEffect(() => {
    apiFetch<{ companies: CompanySummary[] }>('/api/companies')
      .then((res) => setTopCompanies(res.companies.slice(0, 5)))
      .catch(() => {});
  }, []);

  const fetchFeed = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const query = new URLSearchParams({
        sort,
        page: String(targetPage),
        limit: '6',
      });
      if (category !== 'All') query.set('category', category);
      if (industry !== 'All') query.set('industry', industry);
      if (experienceType !== 'All') query.set('experienceType', experienceType);
      if (urlQ) query.set('q', urlQ);
      if (urlCompany) query.set('company', urlCompany);

      try {
        const res = await apiFetch<{
          items: StorySummary[];
          total: number;
          page: number;
          hasMore: boolean;
        }>(`/api/stories?${query.toString()}`);

        setStories((prev) => (append ? [...prev, ...res.items] : res.items));
        setTotal(res.total);
        setPage(res.page);
        setHasMore(res.hasMore);
      } catch {
        if (!append) setStories([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sort, category, industry, experienceType, urlQ, urlCompany]
  );

  useEffect(() => {
    fetchFeed(1, false);
  }, [fetchFeed]);

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (!val || val === 'All') next.delete(key);
    else next.set(key, val);
    setSearchParams(next);
  };

  const handleSearchForm = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (keywordInput.trim()) next.set('q', keywordInput.trim());
    else next.delete('q');
    if (companyInput.trim()) next.set('company', companyInput.trim());
    else next.delete('company');
    setSearchParams(next);
  };

  const resetFilters = () => {
    setKeywordInput('');
    setCompanyInput('');
    setSearchParams({});
  };

  const hasActiveFilters =
    category !== 'All' ||
    industry !== 'All' ||
    experienceType !== 'All' ||
    Boolean(urlQ) ||
    Boolean(urlCompany);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-7 items-start">
        <LeftTopicRail />

        {/* Main Discovery Stream */}
        <main className="flex-1 min-w-0 w-full space-y-5">
          {/* Header + Search Controls */}
          <div className="ev-surface rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <h1 className="font-editorial text-3xl sm:text-4xl text-[var(--text-primary)]">
                  {category !== 'All' ? `${category} Stories` : 'Explore Workplace Exit Stories'}
                </h1>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {total} {total === 1 ? 'published story' : 'published stories'} from real
                  community submissions
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-text)] hover:underline self-start"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear all filters
                </button>
              )}
            </div>

            {/* Keyword + Company Search */}
            <form onSubmit={handleSearchForm} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-6 relative">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Keywords (e.g. COBRA, PIP, remote, CPA)…"
                  className="w-full pl-8 pr-3 py-2 rounded-md text-xs ev-input"
                />
              </div>
              <div className="sm:col-span-4 relative">
                <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  placeholder="Filter by company…"
                  className="w-full pl-8 pr-3 py-2 rounded-md text-xs ev-input"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full h-full py-2 ev-btn-primary rounded-md text-xs"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Category (Mobile visible) + Industry + Experience Type Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => updateParam('category', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md text-xs ev-input"
                >
                  <option value="All">All categories</option>
                  {EXPERIENCE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => updateParam('industry', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md text-xs ev-input"
                >
                  <option value="All">All industries</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                  Exit Type
                </label>
                <select
                  value={experienceType}
                  onChange={(e) => updateParam('experienceType', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md text-xs ev-input"
                >
                  <option value="All">All exit types</option>
                  {EXPERIENCE_TYPES.map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sorting Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto">
              {(
                [
                  { id: 'latest', label: 'Latest' },
                  { id: 'discussed', label: 'Most Discussed' },
                  { id: 'bookmarked', label: 'Most Bookmarked' },
                  { id: 'helpful', label: 'Most Helpful' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => updateParam('sort', tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium shrink-0 transition-colors ${
                    sort === tab.id
                      ? 'ev-surface text-[var(--text-primary)] shadow-2xs font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed Stream */}
          {loading ? (
            <div className="ev-surface rounded-lg p-8 text-sm text-[var(--text-secondary)]">
              Loading workplace exit stories…
            </div>
          ) : stories.length === 0 ? (
            <div className="ev-surface rounded-lg p-12 text-center space-y-3">
              <h3 className="font-editorial text-2xl text-[var(--text-primary)]">
                No published stories matched those exact filters
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                Try broadening your search criteria, clearing active filters, or sharing the first
                story in this category.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="ev-btn-secondary px-4 py-2 rounded-md text-xs"
                >
                  Reset Filters
                </button>
                <Link to="/submit" className="ev-btn-primary px-4 py-2 rounded-md text-xs">
                  Share Your Story
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {stories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}

              {/* Pagination Footer */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
                <span>
                  Showing {stories.length} of {total} published stories
                </span>
                {hasMore && (
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => fetchFeed(page + 1, true)}
                    className="ev-btn-secondary px-5 py-2 rounded-md text-xs font-medium"
                  >
                    {loadingMore ? 'Loading more…' : 'Load More Stories'}
                  </button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right Context Rail */}
        <aside className="w-full lg:w-76 shrink-0 space-y-5">
          <div className="ev-surface rounded-lg p-5 space-y-3">
            <h3 className="font-editorial text-2xl text-[var(--text-primary)]">
              Every exit has a story.
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Whether you were laid off on a Tuesday morning, left a great team on good terms, or
              walked away from burnout — your reflection helps someone else make a clearer decision.
            </p>
            <Link
              to="/submit"
              className="w-full ev-btn-primary inline-flex items-center justify-center gap-2 py-2.5 rounded-md text-xs"
            >
              <PenSquare className="w-3.5 h-3.5" />
              <span>Share Your Story</span>
            </Link>
          </div>

          {topCompanies.length > 0 && (
            <div className="ev-surface rounded-lg p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Companies Discussed
                </h4>
                <Link
                  to="/companies"
                  className="text-xs text-[var(--accent-text)] hover:underline"
                >
                  All
                </Link>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {topCompanies.map((c) => (
                  <Link
                    key={c.id}
                    to={`/companies/${c.slug}`}
                    className="block py-2.5 first:pt-0 last:pb-0 group"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-text)] truncate">
                        {c.name}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                        {c.storyCount} {c.storyCount === 1 ? 'story' : 'stories'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {c.industry}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="ev-surface rounded-lg p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
              <span>Moderation Standard</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Private drafts and unreviewed submissions never appear in search or feeds. Spot
              private data in a post? Use “Report” on any story or comment.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

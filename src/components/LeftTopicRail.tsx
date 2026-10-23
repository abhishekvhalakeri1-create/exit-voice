import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  Building2,
  Flame,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { EXPERIENCE_CATEGORIES } from '../../shared/constants';
import { useApp } from '../context/AppContext';

export function LeftTopicRail() {
  const { meta, user } = useApp();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || '';
  const activeSort = searchParams.get('sort') || 'latest';

  const itemCls = (active: boolean) =>
    `flex items-center justify-between px-3 py-1.5 rounded-md text-[13px] transition-colors ${
      active
        ? 'bg-[var(--accent-tint)] text-[var(--accent-text)] font-semibold'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
    }`;

  return (
    <aside className="hidden lg:block w-56 shrink-0 space-y-6">
      <div className="space-y-1">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Feeds
        </p>
        {user && (
          <Link to="/dashboard" className={itemCls(location.pathname === '/dashboard')}>
            <span className="inline-flex items-center gap-2">
              <LayoutDashboard className="w-3.5 h-3.5" />
              My Dashboard
            </span>
          </Link>
        )}
        <Link
          to="/explore"
          className={itemCls(
            location.pathname === '/explore' && !activeCategory && activeSort === 'latest'
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Latest Stories
          </span>
          <span className="text-[11px] tabular-nums opacity-75">{meta.publishedStories}</span>
        </Link>
        <Link
          to="/explore?sort=discussed"
          className={itemCls(
            location.pathname === '/explore' && !activeCategory && activeSort === 'discussed'
          )}
        >
          <span className="inline-flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Most Discussed
          </span>
          <span className="text-[11px] tabular-nums opacity-75">{meta.totalComments}</span>
        </Link>
        <Link
          to="/explore?sort=bookmarked"
          className={itemCls(
            location.pathname === '/explore' && !activeCategory && activeSort === 'bookmarked'
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Flame className="w-3.5 h-3.5" />
            Most Bookmarked
          </span>
        </Link>
        <Link
          to="/companies"
          className={itemCls(location.pathname.startsWith('/companies'))}
        >
          <span className="inline-flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" />
            Companies
          </span>
          <span className="text-[11px] tabular-nums opacity-75">{meta.companiesWithStories}</span>
        </Link>
        {user && (
          <Link
            to="/dashboard#bookmarks"
            className={itemCls(false)}
          >
            <span className="inline-flex items-center gap-2">
              <Bookmark className="w-3.5 h-3.5" />
              Saved Stories
            </span>
          </Link>
        )}
      </div>

      <div className="pt-4 border-t ev-border space-y-1">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Exit Categories
        </p>
        {EXPERIENCE_CATEGORIES.map((cat) => {
          const count = meta.categoryCounts[cat] || 0;
          const isSelected = location.pathname === '/explore' && activeCategory === cat;
          return (
            <Link
              key={cat}
              to={`/explore?category=${encodeURIComponent(cat)}`}
              className={itemCls(isSelected)}
            >
              <span className="truncate">{cat}</span>
              <span className="text-[11px] tabular-nums opacity-75">{count}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

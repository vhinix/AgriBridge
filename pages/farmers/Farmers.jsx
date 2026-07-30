import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthProvider';
import { list } from '../../services/farmer';
import { NavIcon } from '../../src/components/layout/Sidebar';
import plusIcon from '../../src/assets/icons/plus.svg';

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// Tailwind only generates classes it can see as literal text, so the design's
// column ratios are spelled out at each use rather than interpolated.
export default function Farmers() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    setLoading(true);

    list({ officerId: user.id }).then(({ data, error: listError }) => {
      if (!active) return;
      if (listError) {
        console.error('Failed to load farmers:', listError);
        setError('Could not load your farmers. Please try again.');
      } else {
        setError(null);
        setFarmers(data ?? []);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [user]);

  // Matches the design's placeholder: name, LGA or crop. Filtering client-side
  // keeps it instant on a caseload this size and needs no debounce.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return farmers;

    return farmers.filter((f) =>
      [f.full_name, f.lga, f.primary_crop]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [farmers, search]);

  const lgaCount = useMemo(
    () => new Set(farmers.map((f) => f.lga).filter(Boolean)).size,
    [farmers]
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-[28px] leading-tight md:text-[34px]">Farmers</h1>
          <p className="mt-2 text-base text-muted">
            {loading
              ? 'Loading your caseload…'
              : `${farmers.length} ${
                  farmers.length === 1 ? 'farmer' : 'farmers'
                } under management across ${lgaCount} ${
                  lgaCount === 1 ? 'LGA' : 'LGAs'
                }.`}
          </p>
        </div>

        <Link
          to="/farmers/new"
          className="flex flex-none items-center gap-2 rounded-xl bg-primary p-[12px_20px] text-sm font-semibold text-white shadow-[0_2px_4px_rgba(31,41,55,.10)] transition-colors hover:bg-primaryDark"
        >
          <NavIcon src={plusIcon} className="flex h-[18px] w-[18px]" />
          Add farmer
        </Link>
      </div>

      <div className="rounded-2xl border border-[#EEF2EE] bg-surface p-2 shadow-card">
        <div className="p-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, LGA or crop"
            aria-label="Search farmers"
            className="w-full max-w-[320px] rounded-xl border border-border bg-tint p-[12px_16px] text-sm text-text outline-none focus:border-primary"
          />
        </div>

        {/* Column headings only make sense once the row grid is in play. */}
        <div className="hidden grid-cols-[1.6fr_1.2fr_1fr_.8fr_1fr_.4fr] border-b border-[#EEF2EE] text-[11px] uppercase tracking-[.08em] text-soft lg:grid">
          <div className="p-4">Farmer</div>
          <div className="p-4">Phone</div>
          <div className="p-4">LGA</div>
          <div className="p-4">Farm size</div>
          <div className="p-4">Primary crop</div>
          <div className="p-4" />
        </div>

        {error && <p className="p-4 text-sm text-error">{error}</p>}

        {!error && !loading && filtered.length === 0 && (
          <p className="p-4 text-sm text-soft">
            {farmers.length === 0
              ? 'No farmers registered yet. Add your first one to get started.'
              : `No farmers match “${search.trim()}”.`}
          </p>
        )}

        {filtered.map((farmer) => (
          <div
            key={farmer.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/farmers/${farmer.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/farmers/${farmer.id}`);
              }
            }}
            className="flex cursor-pointer flex-wrap items-center border-b border-[#EEF2EE] py-2 transition-colors hover:bg-[#F6FAF6] lg:grid lg:grid-cols-[1.6fr_1.2fr_1fr_.8fr_1fr_.4fr] lg:py-0"
          >
            <div className="flex min-w-0 items-center gap-3 p-4">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-pale text-[13px] font-semibold text-primary">
                {initials(farmer.full_name)}
              </span>
              <span className="text-sm font-semibold">{farmer.full_name}</span>
            </div>
            <div className="p-4 text-sm text-soft">{farmer.phone || '—'}</div>
            <div className="p-4 text-sm text-soft">{farmer.lga || '—'}</div>
            <div className="p-4 text-sm text-soft">{farmer.farm_size || '—'}</div>
            <div className="p-4">
              {farmer.primary_crop && (
                <span className="rounded-full bg-pale p-[4px_12px] text-xs text-primaryDark">
                  {farmer.primary_crop}
                </span>
              )}
            </div>
            <div className="hidden p-4 text-right font-semibold text-primary lg:block">
              →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

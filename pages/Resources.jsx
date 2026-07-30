import { useEffect, useMemo, useState } from 'react';

import { supabase } from '../lib/supabase';
import { NavIcon } from '../src/components/layout/Sidebar';
import boxIcon from '../src/assets/icons/box.svg';
import dropletIcon from '../src/assets/icons/droplet.svg';
import flaskIcon from '../src/assets/icons/flask.svg';
import seedIcon from '../src/assets/icons/seed.svg';
import sproutIcon from '../src/assets/icons/sprout.svg';
import tractorIcon from '../src/assets/icons/tractor.svg';
import wrenchIcon from '../src/assets/icons/wrench.svg';

// Categories are the values resources.category is documented to hold.
const CATEGORIES = {
  Seed: { icon: seedIcon, tint: 'bg-pale', text: 'text-primary' },
  Fertiliser: { icon: flaskIcon, tint: 'bg-accentTint', text: 'text-accentInk' },
  'Agro-chemical': {
    icon: dropletIcon,
    tint: 'bg-[#E6F2E6]',
    text: 'text-primaryDark',
  },
  Equipment: { icon: wrenchIcon, tint: 'bg-[#EEF2EE]', text: 'text-soft' },
  'Planting material': {
    icon: sproutIcon,
    tint: 'bg-pale',
    text: 'text-primaryDark',
  },
};

// Anything uncategorised falls back to the general supply icon.
const FALLBACK = {
  icon: tractorIcon,
  tint: 'bg-[#EEF2EE]',
  text: 'text-soft',
};

const CATEGORY_ORDER = Object.keys(CATEGORIES);

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    supabase
      .from('resources')
      .select('id, title, category, supplier, location, price, description')
      .order('category')
      .order('title')
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          console.error('Failed to load resources:', loadError);
          setError('Could not load resources. Please try again.');
        } else {
          setResources(data ?? []);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Only offer tabs for categories that actually have stock listed.
  const categories = useMemo(() => {
    const present = new Set(resources.map((r) => r.category).filter(Boolean));
    const known = CATEGORY_ORDER.filter((c) => present.has(c));
    const extra = [...present].filter((c) => !CATEGORY_ORDER.includes(c));
    return [...known, ...extra];
  }, [resources]);

  const visible = useMemo(
    () =>
      filter === 'all'
        ? resources
        : resources.filter((r) => r.category === filter),
    [resources, filter]
  );

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-pale p-[11px]">
          <NavIcon src={boxIcon} className="flex h-full w-full text-primary" />
        </span>
        <h1 className="text-[28px] leading-tight md:text-[34px]">Resources</h1>
      </div>

      <p className="mb-10 max-w-[64ch] text-base leading-relaxed text-muted">
        Input stock at the zonal store — seed, fertiliser, agro-chemicals and
        equipment available across your LGAs.
      </p>

      <div className="mb-10 flex flex-wrap gap-2">
        {[{ value: 'all', label: 'All supplies' }].concat(
          categories.map((c) => ({ value: c, label: c }))
        ).map((tab) => {
          const active = filter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`rounded-xl border p-[10px_18px] text-sm font-semibold shadow-[0_1px_2px_rgba(31,41,55,.04)] transition-colors ${
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-text hover:bg-[#F1F7F1]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading && <p className="text-sm text-soft">Loading resources…</p>}
      {error && <p className="text-sm text-error">{error}</p>}

      {!loading && !error && visible.length === 0 && (
        <p className="text-sm text-soft">
          {resources.length === 0
            ? 'No resources listed yet.'
            : 'Nothing listed in this category.'}
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        {visible.map((resource) => {
          const meta = CATEGORIES[resource.category] ?? FALLBACK;

          return (
            <article
              key={resource.id}
              className="rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-card"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`grid h-11 w-11 flex-none place-items-center rounded-2xl p-[11px] ${meta.tint}`}
                >
                  <NavIcon
                    src={meta.icon}
                    className={`flex h-full w-full ${meta.text}`}
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full p-[4px_12px] text-[11px] font-semibold uppercase tracking-[.06em] ${meta.tint} ${meta.text}`}
                    >
                      {resource.category ?? 'Supply'}
                    </span>
                    {resource.location && (
                      <span className="text-xs text-[#9CA3AF]">
                        {resource.location}
                      </span>
                    )}
                  </div>

                  <h3 className="mb-2 text-base leading-[1.4]">
                    {resource.title}
                  </h3>

                  {resource.supplier && (
                    <div className="text-[13px] text-soft">
                      {resource.supplier}
                    </div>
                  )}

                  {resource.description && (
                    <p className="mt-2 text-[13px] leading-[1.65] text-muted">
                      {resource.description}
                    </p>
                  )}

                  {resource.price && (
                    <div className="mt-4 border-t border-[#EEF2EE] pt-4 text-[13px] font-semibold text-text">
                      {resource.price}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

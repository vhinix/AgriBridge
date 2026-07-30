import { useEffect, useMemo, useState } from 'react';

import { supabase } from '../lib/supabase';
import { NavIcon } from '../src/components/layout/Sidebar';

// Categories are the values training.category is documented to hold.
const CATEGORIES = {
  Article: { icon: '/icons/file.svg', tint: 'bg-pale', text: 'text-primary' },
  Video: { icon: '/icons/play.svg', tint: 'bg-accentTint', text: 'text-accentInk' },
  Guide: { icon: '/icons/book.svg', tint: 'bg-[#E6F2E6]', text: 'text-primaryDark' },
  'Tip sheet': { icon: '/icons/info.svg', tint: 'bg-pale', text: 'text-primaryDark' },
};

const FALLBACK = { icon: '/icons/book.svg', tint: 'bg-[#EEF2EE]', text: 'text-soft' };

const CATEGORY_ORDER = Object.keys(CATEGORIES);

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function MaterialCard({ material }) {
  const meta = CATEGORIES[material.category] ?? FALLBACK;

  // Seed rows carry '#' as a placeholder, which is not worth linking.
  const href =
    material.url && material.url !== '#' ? material.url : null;

  const body = (
    <>
      <span
        className={`grid h-11 w-11 flex-none place-items-center rounded-2xl p-[11px] ${meta.tint}`}
      >
        <NavIcon src={meta.icon} className={`flex h-full w-full ${meta.text}`} />
      </span>

      <div className="mb-2 mt-4 text-[11px] uppercase tracking-[.09em] text-accentInk">
        {material.category ?? 'Material'}
      </div>

      <h3 className="mb-2 text-[17px] leading-[1.4]">{material.title}</h3>

      {material.description && (
        <p className="text-sm leading-[1.65] text-muted">
          {material.description}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-2 text-[13px] text-[#9CA3AF]">
        <span>{formatDate(material.created_at)}</span>
        {href && <span className="font-semibold text-primary">Open →</span>}
      </div>
    </>
  );

  const className =
    'block rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-card';

  if (!href) {
    return <article className={className}>{body}</article>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${className} transition-shadow hover:shadow-panel`}
    >
      {body}
    </a>
  );
}

export default function Training() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    supabase
      .from('training')
      .select('id, title, category, url, description, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          console.error('Failed to load training material:', loadError);
          setError('Could not load training material. Please try again.');
        } else {
          setMaterials(data ?? []);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Known categories first, in the documented order, then anything unexpected.
  const groups = useMemo(() => {
    const present = [
      ...new Set(materials.map((m) => m.category ?? 'Material')),
    ];
    const ordered = [
      ...CATEGORY_ORDER.filter((c) => present.includes(c)),
      ...present.filter((c) => !CATEGORY_ORDER.includes(c)),
    ];

    return ordered.map((category) => ({
      category,
      meta: CATEGORIES[category] ?? FALLBACK,
      items: materials.filter((m) => (m.category ?? 'Material') === category),
    }));
  }, [materials]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-pale p-[11px]">
          <NavIcon src="/icons/book.svg" className="flex h-full w-full text-primary" />
        </span>
        <h1 className="text-[28px] leading-tight md:text-[34px]">Training hub</h1>
      </div>

      <p className="mb-10 max-w-[64ch] text-base leading-relaxed text-muted">
        Material you can read, share in a farmer group, or print for a field day.
      </p>

      {loading && <p className="text-sm text-soft">Loading material…</p>}
      {error && <p className="text-sm text-error">{error}</p>}

      {!loading && !error && materials.length === 0 && (
        <p className="text-sm text-soft">No training material published yet.</p>
      )}

      <div className="flex flex-col gap-10">
        {groups.map((group) => (
          <section key={group.category}>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span
                className={`grid h-9 w-9 flex-none place-items-center rounded-full p-[9px] ${group.meta.tint}`}
              >
                <NavIcon
                  src={group.meta.icon}
                  className={`flex h-full w-full ${group.meta.text}`}
                />
              </span>
              <h2 className="text-xl">{group.category}</h2>
              <span className="rounded-full bg-[#EEF2EE] p-[4px_12px] text-xs text-soft">
                {group.items.length}
              </span>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
              {group.items.map((material) => (
                <MaterialCard key={material.id} material={material} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

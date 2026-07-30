import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../context/AuthProvider';
import { list } from '../../services/alerts';
import { list as listFarmers } from '../../services/farmer';
import { NavIcon } from '../../src/components/layout/Sidebar';

// The design's TYPE map, keyed by the values the `alerts.type` check constraint
// actually allows. Shared with AlertDetail and Relay.
export const ALERT_TYPES = {
  weather: {
    label: 'Weather',
    group: 'Weather alerts',
    icon: '/icons/cloud-rain.svg',
    text: 'text-primary',
    chip: 'bg-pale text-primary',
  },
  pest: {
    label: 'Pest outbreak',
    group: 'Pest outbreak alerts',
    icon: '/icons/bug.svg',
    text: 'text-accentInk',
    chip: 'bg-accentTint text-accentInk',
  },
  crop_recommendation: {
    label: 'Crop guidance',
    group: 'Crop guidance alerts',
    icon: '/icons/sprout.svg',
    text: 'text-primaryDark',
    chip: 'bg-[#E6F2E6] text-primaryDark',
  },
};

const TYPE_ORDER = ['weather', 'pest', 'crop_recommendation'];

const CHIP =
  'rounded-full p-[4px_12px] text-[11px] font-semibold uppercase tracking-[.06em]';

// alerts.severity is Info | Advisory | Urgent per the schema.
const SEVERITY_STYLES = {
  Urgent: 'bg-[#FBE3E3] text-error',
  Advisory: 'bg-accentTint text-accentInk',
  Info: 'bg-pale text-primaryDark',
};

export function TypeChip({ type }) {
  const meta = ALERT_TYPES[type];
  if (!meta) return null;
  return <span className={`${CHIP} ${meta.chip}`}>{meta.label}</span>;
}

export function SeverityChip({ severity }) {
  if (!severity) return null;
  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.Advisory;
  return <span className={`${CHIP} ${style}`}>{severity}</span>;
}

/**
 * Does this farmer sit in the alert's region?
 *
 * alerts.region is free text scoped to an LGA ('Benue — Gboko zone') while
 * every farmer carries the same state-level region ('Benue'), so the LGA is the
 * only field that actually discriminates. Matching the region loosely as well
 * would pre-select every farmer for every alert.
 */
export function matchesAlertRegion(farmer, alertRegion) {
  if (!alertRegion) return false;

  const scope = alertRegion.toLowerCase();

  if (farmer.lga && scope.includes(farmer.lga.toLowerCase())) return true;

  // Falls through for an alert aimed at a whole region rather than one LGA.
  return Boolean(farmer.region) && scope === farmer.region.toLowerCase();
}

export function formatAge(value) {
  if (!value) return '';

  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return '';

  const minutes = Math.floor((Date.now() - then.getTime()) / 60000);
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  return then.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function Alerts() {
  const { user } = useAuth();

  const [alerts, setAlerts] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    list().then(({ data, error: listError }) => {
      if (!active) return;
      if (listError) {
        console.error('Failed to load alerts:', listError);
        setError('Could not load alerts. Please try again.');
      } else {
        setAlerts(data ?? []);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  // Only used for the "N farmers affected" count on each card.
  useEffect(() => {
    if (!user) return undefined;

    let active = true;

    listFarmers({ officerId: user.id }).then(({ data, error: farmersError }) => {
      if (!active) return;
      if (farmersError) {
        console.error('Failed to load farmers:', farmersError);
        return;
      }
      setFarmers(data ?? []);
    });

    return () => {
      active = false;
    };
  }, [user]);

  const groups = useMemo(() => {
    const visible = TYPE_ORDER.filter((t) => filter === 'all' || filter === t);

    return visible
      .map((type) => ({
        type,
        meta: ALERT_TYPES[type],
        items: alerts.filter((a) => a.type === type),
      }))
      .filter((group) => group.items.length > 0);
  }, [alerts, filter]);

  const filters = [
    { value: 'all', label: 'All alerts' },
    ...TYPE_ORDER.map((t) => ({ value: t, label: ALERT_TYPES[t].label })),
  ];

  return (
    <div>
      <h1 className="text-[28px] leading-tight md:text-[34px]">Alerts</h1>
      <p className="mb-10 mt-2 max-w-[64ch] text-base leading-relaxed text-muted">
        Generated from the weather service, your diagnosis log, and seasonal crop
        guidance for the zone.
      </p>

      <div className="mb-10 flex flex-wrap items-center gap-2">
        {filters.map((option) => {
          const active = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-xl border p-[10px_18px] text-sm font-semibold shadow-[0_1px_2px_rgba(31,41,55,.04)] transition-colors ${
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-text hover:bg-[#F1F7F1]'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {loading && <p className="text-sm text-soft">Loading alerts…</p>}
      {error && <p className="text-sm text-error">{error}</p>}

      {!loading && !error && groups.length === 0 && (
        <p className="text-sm text-soft">No alerts in this category.</p>
      )}

      <div className="flex flex-col gap-10">
        {groups.map((group) => (
          <section key={group.type}>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span
                className={`grid h-11 w-11 flex-none place-items-center rounded-2xl p-[11px] ${group.meta.chip}`}
              >
                <NavIcon
                  src={group.meta.icon}
                  className={`flex h-full w-full ${group.meta.text}`}
                />
              </span>
              <h2 className="text-xl">{group.meta.group}</h2>
              <span className="rounded-full bg-[#EEF2EE] p-[4px_12px] text-xs text-soft">
                {group.items.length}
              </span>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
              {group.items.map((alert) => {
                const affected = farmers.filter((f) =>
                  matchesAlertRegion(f, alert.region)
                ).length;

                return (
                  <Link
                    key={alert.id}
                    to={`/alerts/${alert.id}`}
                    className="block rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-card transition-shadow hover:shadow-panel"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <SeverityChip severity={alert.severity} />
                      <span className="text-xs text-[#9CA3AF]">
                        {alert.region}
                        {alert.created_at
                          ? ` · ${formatAge(alert.created_at)}`
                          : ''}
                      </span>
                    </div>

                    <h3 className="mb-2 text-[17px] leading-[1.35]">
                      {alert.title}
                    </h3>
                    <p className="text-sm leading-[1.65] text-muted">
                      {alert.short}
                    </p>

                    <div className="mt-6 flex items-center justify-between gap-2 border-t border-[#EEF2EE] pt-4">
                      <span className="text-[13px] text-soft">
                        {affected} {affected === 1 ? 'farmer' : 'farmers'}{' '}
                        affected
                      </span>
                      <span className="text-sm font-semibold text-primary">
                        Open →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../context/AuthProvider';
import { supabase } from '../lib/supabase';
import { NavIcon } from '../src/components/layout/Sidebar';
import chartIcon from '../src/assets/icons/chart.svg';

// Single-series charts, so one hue does all the work — no categorical palette to
// balance and no legend needed (each chart's title names what is plotted).
// #2E7D32 on the white card surface is 5.13:1, comfortably above the 3:1 floor.
const MARK = '#2E7D32';

const WEEKS = 8;

function startOfWeek(date) {
  const start = new Date(date);
  const weekday = (start.getDay() + 6) % 7; // Monday = 0
  start.setDate(start.getDate() - weekday);
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Rounded at the data end, square at the baseline, per the mark spec. */
function columnPath(x, y, width, height) {
  const r = Math.min(4, width / 2, height);
  if (height <= 0) return '';
  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height}`,
    'Z',
  ].join(' ');
}

function DiagnosesOverTime({ buckets }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const peak = buckets.reduce(
    (best, b) => (b.count > best.count ? b : best),
    buckets[0] ?? { count: 0 }
  );

  const band = 44;
  const barWidth = 24; // capped per the mark spec; the rest of the band is air
  const height = 170;
  const plotTop = 26;
  const plotBottom = 140;
  const plotHeight = plotBottom - plotTop;
  const width = buckets.length * band;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[170px] w-full"
      role="img"
      aria-label={`Diagnoses logged per week over the last ${WEEKS} weeks`}
    >
      {/* Recessive gridline carrying the top value, so no per-column labels. */}
      <line
        x1="0"
        y1={plotTop}
        x2={width}
        y2={plotTop}
        stroke="#EEF2EE"
        strokeWidth="1"
      />
      <text x="0" y={plotTop - 8} className="fill-soft text-[10px]">
        {max}
      </text>

      {buckets.map((bucket, index) => {
        const barHeight = (bucket.count / max) * plotHeight;
        const x = index * band + (band - barWidth) / 2;
        const y = plotBottom - barHeight;
        const isPeak = bucket.count === peak.count && bucket.count > 0;

        return (
          <g key={bucket.label}>
            <title>{`${bucket.label}: ${bucket.count} ${
              bucket.count === 1 ? 'diagnosis' : 'diagnoses'
            }`}</title>

            {bucket.count > 0 ? (
              <path d={columnPath(x, y, barWidth, barHeight)} fill={MARK} />
            ) : (
              // An empty week still needs a hit target and a visible baseline tick.
              <rect x={x} y={plotBottom - 2} width={barWidth} height="2" fill="#EEF2EE" />
            )}

            {/* Label the peak only — never a number on every column. */}
            {isPeak && (
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-text text-[11px] font-semibold"
              >
                {bucket.count}
              </text>
            )}

            <text
              x={x + barWidth / 2}
              y={plotBottom + 18}
              textAnchor="middle"
              className="fill-soft text-[10px]"
            >
              {bucket.label}
            </text>
          </g>
        );
      })}

      <line
        x1="0"
        y1={plotBottom}
        x2={width}
        y2={plotBottom}
        stroke="#EEF2EE"
        strokeWidth="1"
      />
    </svg>
  );
}

function FarmersByCrop({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => (
        <div key={row.crop}>
          <div className="mb-2 flex justify-between gap-2 text-sm">
            <span className="font-semibold">{row.crop}</span>
            <span className="text-soft">{row.count}</span>
          </div>
          <span className="block h-2 overflow-hidden rounded-full bg-[#EEF2EE]">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${(row.count / max) * 100}%`,
                backgroundColor: MARK,
              }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, note }) {
  return (
    <div className="rounded-2xl bg-primary p-6 shadow-[0_2px_4px_rgba(31,41,55,.06),0_8px_24px_rgba(46,125,50,.16)]">
      {/* bg (#F8FAF7) on primary is 4.89:1 — the design's #BFDCC0 is only 3.47:1. */}
      <div className="text-xs uppercase tracking-[.06em] text-bg">{label}</div>
      <div className="mt-4 font-display text-[34px] font-semibold leading-[1.15] text-white">
        {value}
      </div>
      <div className="mt-1 text-[13px] text-bg">{note}</div>
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuth();

  const [farmers, setFarmers] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [relays, setRelays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    const since = startOfWeek(new Date());
    since.setDate(since.getDate() - (WEEKS - 1) * 7);

    Promise.all([
      supabase
        .from('farmers')
        .select('id, primary_crop')
        .eq('officer_id', user.id),
      supabase
        .from('diagnoses')
        .select('id, disease_name, created_at')
        .eq('officer_id', user.id)
        .gte('created_at', since.toISOString()),
      supabase
        .from('alert_relays')
        .select('id, farmer_ids, created_at')
        .eq('officer_id', user.id),
    ]).then(([farmersResult, diagnosesResult, relaysResult]) => {
      if (!active) return;

      for (const result of [farmersResult, diagnosesResult, relaysResult]) {
        if (result.error) console.error('Analytics query failed:', result.error);
      }

      setFarmers(farmersResult.data ?? []);
      setDiagnoses(diagnosesResult.data ?? []);
      setRelays(relaysResult.data ?? []);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [user]);

  const buckets = useMemo(() => {
    const thisWeek = startOfWeek(new Date());

    return Array.from({ length: WEEKS }, (_, index) => {
      const start = new Date(thisWeek);
      start.setDate(start.getDate() - (WEEKS - 1 - index) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const count = diagnoses.filter((d) => {
        const at = new Date(d.created_at);
        return at >= start && at < end;
      }).length;

      return {
        label: start.toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
        }),
        count,
      };
    });
  }, [diagnoses]);

  const cropRows = useMemo(() => {
    const counts = new Map();

    for (const farmer of farmers) {
      const crop = farmer.primary_crop || 'Unrecorded';
      counts.set(crop, (counts.get(crop) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([crop, count]) => ({ crop, count }))
      .sort((a, b) => b.count - a.count);
  }, [farmers]);

  // A farmer counted once however many alerts reached them.
  const farmersReached = useMemo(() => {
    const ids = new Set();
    for (const relay of relays) {
      for (const id of relay.farmer_ids ?? []) ids.add(id);
    }
    return ids.size;
  }, [relays]);

  const show = (value) => (loading ? '—' : String(value));

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-pale p-[11px]">
          <NavIcon src={chartIcon} className="flex h-full w-full text-primary" />
        </span>
        <h1 className="text-[28px] leading-tight md:text-[34px]">Analytics</h1>
      </div>

      <p className="mb-10 max-w-[64ch] text-base leading-relaxed text-muted">
        Everything here reads from your own records — real usage, not registration
        counts.
      </p>

      <div className="mb-10 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatCard
          label="Farmers registered"
          value={show(farmers.length)}
          note="in your caseload"
        />
        <StatCard
          label="Diagnoses logged"
          value={show(diagnoses.length)}
          note={`past ${WEEKS} weeks`}
        />
        <StatCard
          label="Alerts relayed"
          value={show(relays.length)}
          note="all time"
        />
        <StatCard
          label="Farmers reached"
          value={show(farmersReached)}
          note="unique recipients"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-card">
          <h2 className="mb-2 text-[19px]">Diagnoses over time</h2>
          <p className="mb-6 text-[13px] text-soft">
            Logged per week over the last {WEEKS} weeks. Hover a column for the
            exact count.
          </p>

          {diagnoses.length === 0 && !loading ? (
            <p className="text-sm text-soft">
              No diagnoses logged in this period.
            </p>
          ) : (
            <DiagnosesOverTime buckets={buckets} />
          )}
        </section>

        <section className="rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-card">
          <h2 className="mb-2 text-[19px]">Farmers by crop</h2>
          <p className="mb-6 text-[13px] text-soft">
            Primary crop across your caseload.
          </p>

          {cropRows.length === 0 ? (
            <p className="text-sm text-soft">No farmers registered yet.</p>
          ) : (
            <FarmersByCrop rows={cropRows} />
          )}
        </section>
      </div>
    </div>
  );
}

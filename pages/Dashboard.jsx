import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthProvider';
import { supabase } from '../lib/supabase';
import { list as listAlerts } from '../services/alerts';
import { currentSeason, recommend, resolveZone } from '../services/recommendation';
import { NavIcon } from '../src/components/layout/Sidebar';
import bellIcon from '../src/assets/icons/bell.svg';
import clipboardIcon from '../src/assets/icons/clipboard.svg';
import dashboardIcon from '../src/assets/icons/dashboard.svg';
import leafIcon from '../src/assets/icons/leaf.svg';
import sendIcon from '../src/assets/icons/send.svg';
import sproutIcon from '../src/assets/icons/sprout.svg';
import usersIcon from '../src/assets/icons/users.svg';
import { SeverityChip, TypeChip, formatAge } from './alerts/Alerts';

// Monday 00:00 of the current week, local time.
function startOfWeek(date = new Date()) {
  const start = new Date(date);
  const weekday = (start.getDay() + 6) % 7; // Monday = 0
  start.setDate(start.getDate() - weekday);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * alerts.region and profiles.region are both '<State> — <zone>' strings. Compare
 * the state segment so an officer sees their whole state, not only the exact
 * posting string.
 */
function sameState(a, b) {
  if (!a || !b) return false;
  const state = (value) => value.split('—')[0].trim().toLowerCase();
  return state(a) === state(b);
}

// Activity types map onto the icons this screen is allowed to use.
const ACTIVITY_ICONS = {
  alert_relayed: { icon: sendIcon, tint: 'bg-accentTint', text: 'text-accentInk' },
  diagnosis_logged: { icon: leafIcon, tint: 'bg-pale', text: 'text-primary' },
  farmer_added: { icon: usersIcon, tint: 'bg-pale', text: 'text-primary' },
};

const FALLBACK_ACTIVITY = {
  icon: clipboardIcon,
  tint: 'bg-[#EEF2EE]',
  text: 'text-soft',
};

function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({ label, value, note, icon, tint, text }) {
  return (
    <div className="rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-[.06em] text-soft">
          {label}
        </div>
        <span className={`grid h-9 w-9 flex-none place-items-center rounded-full p-[9px] ${tint}`}>
          <NavIcon src={icon} className={`flex h-full w-full ${text}`} />
        </span>
      </div>
      <div className="mt-4 font-display text-[32px] font-semibold leading-[1.15] text-text">
        {value}
      </div>
      <div className="mt-1 text-[13px] text-soft">{note}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();

  const [alerts, setAlerts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [crops, setCrops] = useState([]);
  const [stats, setStats] = useState({
    farmers: null,
    diagnoses: null,
    relays: null,
  });

  const season = currentSeason();
  const region = profile?.region ?? null;

  // Region-scoped alerts.
  useEffect(() => {
    let active = true;

    listAlerts().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error('Failed to load alerts:', error);
        return;
      }
      setAlerts(data ?? []);
    });

    return () => {
      active = false;
    };
  }, []);

  // Activity feed, newest first.
  useEffect(() => {
    if (!user) return undefined;

    let active = true;

    supabase
      .from('activities')
      .select('id, type, summary, created_at')
      .eq('officer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Failed to load activity:', error);
          return;
        }
        setActivities(data ?? []);
      });

    return () => {
      active = false;
    };
  }, [user]);

  // Stat cards, counted server-side with head:true so no rows travel.
  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    const weekStart = startOfWeek().toISOString();

    Promise.all([
      supabase
        .from('farmers')
        .select('id', { count: 'exact', head: true })
        .eq('officer_id', user.id),
      supabase
        .from('diagnoses')
        .select('id', { count: 'exact', head: true })
        .eq('officer_id', user.id)
        .gte('created_at', weekStart),
      supabase
        .from('alert_relays')
        .select('id', { count: 'exact', head: true })
        .eq('officer_id', user.id)
        .gte('created_at', weekStart),
    ]).then(([farmersResult, diagnosesResult, relaysResult]) => {
      if (!active) return;

      for (const result of [farmersResult, diagnosesResult, relaysResult]) {
        if (result.error) console.error('Stat query failed:', result.error);
      }

      setStats({
        farmers: farmersResult.count ?? 0,
        diagnoses: diagnosesResult.count ?? 0,
        relays: relaysResult.count ?? 0,
      });
    });

    return () => {
      active = false;
    };
  }, [user]);

  // What to plant now.
  useEffect(() => {
    if (!profile) return undefined;

    let active = true;

    recommend(profile.region, season).then((rows) => {
      if (active) setCrops(rows);
    });

    return () => {
      active = false;
    };
  }, [profile, season]);

  const regionAlerts = useMemo(
    () => (region ? alerts.filter((a) => sameState(a.region, region)) : alerts),
    [alerts, region]
  );

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const show = (value) => (value === null ? '—' : String(value));

  return (
    <div>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mb-2 text-xs uppercase tracking-[.1em] text-soft">
            {today}
            {region ? ` · ${region}` : ''}
          </div>
          <h1 className="text-[28px] leading-tight md:text-[34px]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-2 max-w-[56ch] text-base leading-relaxed text-muted">
            {regionAlerts.length === 0
              ? 'No alerts are active in your region right now.'
              : `${regionAlerts.length} ${
                  regionAlerts.length === 1 ? 'alert is' : 'alerts are'
                } active in your region. Relay what matters to the farmers it affects.`}
          </p>
        </div>

        <Link
          to="/diagnosis"
          className="flex flex-none items-center gap-2 rounded-xl border border-[#D6E3D6] bg-surface p-[12px_20px] text-sm font-semibold text-primary shadow-[0_1px_2px_rgba(31,41,55,.04)] transition-colors hover:bg-[#F1F7F1]"
        >
          <NavIcon src={leafIcon} className="flex h-[18px] w-[18px]" />
          New diagnosis
        </Link>
      </div>

      <div className="mb-10 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatCard
          label="Farmers managed"
          value={show(stats.farmers)}
          note="in your caseload"
          icon={usersIcon}
          tint="bg-pale"
          text="text-primary"
        />
        <StatCard
          label="Active alerts"
          value={String(regionAlerts.length)}
          note="in your region"
          icon={bellIcon}
          tint="bg-accentTint"
          text="text-accentInk"
        />
        <StatCard
          label="Diagnoses this week"
          value={show(stats.diagnoses)}
          note="since Monday"
          icon={leafIcon}
          tint="bg-pale"
          text="text-primary"
        />
        <StatCard
          label="Alerts relayed"
          value={show(stats.relays)}
          note="since Monday"
          icon={sendIcon}
          tint="bg-[#E6F2E6]"
          text="text-primaryDark"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl">Active alerts</h2>
            <Link
              to="/alerts"
              className="rounded-lg p-2 text-sm font-semibold text-primary transition-colors hover:bg-[#EAF3EA]"
            >
              See all →
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {regionAlerts.length === 0 && (
              <p className="text-sm text-soft">
                Nothing active for your region right now.
              </p>
            )}

            {regionAlerts.slice(0, 3).map((alert) => (
              <article
                key={alert.id}
                className="rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-card"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <TypeChip type={alert.type} />
                  <SeverityChip severity={alert.severity} />
                  <span className="text-xs text-[#9CA3AF]">
                    {alert.region}
                    {alert.created_at ? ` · ${formatAge(alert.created_at)}` : ''}
                  </span>
                </div>

                <h3 className="mb-2 text-[17px] leading-[1.35]">{alert.title}</h3>
                <p className="text-sm leading-[1.65] text-muted">{alert.short}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/alerts/${alert.id}/relay`}
                    className="rounded-xl bg-accent p-[10px_18px] text-sm font-semibold text-text shadow-[0_1px_2px_rgba(31,41,55,.06)] transition-colors hover:bg-[#DDA300]"
                  >
                    Relay to farmers
                  </Link>
                  <Link
                    to={`/alerts/${alert.id}`}
                    className="rounded-xl border border-border bg-surface p-[10px_16px] text-sm font-semibold text-text transition-colors hover:bg-[#F1F7F1]"
                  >
                    Details
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-card">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-pale p-[11px]">
                <NavIcon
                  src={sproutIcon}
                  className="flex h-full w-full text-primaryDark"
                />
              </span>
              <div>
                <h2 className="text-xl">What to plant now</h2>
                <div className="mt-1 text-[13px] text-soft">
                  {resolveZone(region)} · {season} season
                </div>
              </div>
            </div>

            {crops.length === 0 ? (
              <p className="text-sm text-soft">
                No crop guidance for this zone and season yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {crops.map((crop) => (
                  <div
                    key={crop.crop}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#E7EDE7] p-4"
                  >
                    <div className="min-w-[160px] flex-1">
                      <div className="text-[15px] font-semibold">{crop.crop}</div>
                      <div className="mt-1 text-[13px] text-soft">
                        Planting window · {crop.planting_window}
                      </div>
                    </div>

                    <span
                      className={`flex-none rounded-full p-[4px_12px] text-[11px] font-semibold uppercase tracking-[.05em] ${
                        crop.yield_outlook === 'High'
                          ? 'bg-pale text-primaryDark'
                          : 'bg-accentTint text-accentInk'
                      }`}
                    >
                      {crop.yield_outlook} outlook
                    </span>

                    <div className="min-w-[200px] flex-[2] text-[13px] leading-relaxed text-muted">
                      {crop.notes}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl">Recent activity</h2>
          <div className="rounded-2xl border border-[#EEF2EE] bg-surface p-[8px_24px] shadow-card">
            {activities.length === 0 ? (
              <p className="py-4 text-sm text-soft">Nothing logged yet.</p>
            ) : (
              activities.map((event, index) => {
                const meta = ACTIVITY_ICONS[event.type] ?? FALLBACK_ACTIVITY;

                return (
                  <div
                    key={event.id}
                    className={`flex gap-4 py-4 ${
                      index < activities.length - 1
                        ? 'border-b border-[#EEF2EE]'
                        : ''
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 flex-none place-items-center rounded-full p-[9px] ${meta.tint}`}
                    >
                      <NavIcon
                        src={meta.icon}
                        className={`flex h-full w-full ${meta.text}`}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm leading-[1.55]">
                        {event.summary}
                      </div>
                      <div className="mt-1 text-xs text-[#9CA3AF]">
                        {formatAge(event.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Link
            to="/farmers"
            className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface p-[12px_16px] text-sm font-semibold transition-colors hover:bg-[#F1F7F1]"
          >
            <NavIcon src={dashboardIcon} className="flex h-[18px] w-[18px] text-primary" />
            Go to your farmer list
          </Link>
        </section>
      </div>
    </div>
  );
}

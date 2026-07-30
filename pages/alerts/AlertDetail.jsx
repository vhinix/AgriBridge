import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../context/AuthProvider';
import { getById } from '../../services/alerts';
import { list as listFarmers } from '../../services/farmer';
import { NavIcon } from '../../src/components/layout/Sidebar';
import {
  ALERT_TYPES,
  SeverityChip,
  TypeChip,
  formatAge,
  matchesAlertRegion,
} from './Alerts';

export default function AlertDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [alert, setAlert] = useState(null);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    getById(id).then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) {
        console.error('Failed to load alert:', loadError);
        setError('Could not load this alert.');
      } else if (!data) {
        setError('This alert no longer exists.');
      } else {
        setAlert(data);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [id]);

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

  if (loading) {
    return <p className="text-sm text-soft">Loading alert…</p>;
  }

  if (error) {
    return (
      <div>
        <Link
          to="/alerts"
          className="mb-4 inline-block p-[8px_8px_8px_0] text-sm font-semibold text-soft"
        >
          ← All alerts
        </Link>
        <p className="text-sm text-error">{error}</p>
      </div>
    );
  }

  const matched = farmers.filter((f) =>
    matchesAlertRegion(f, alert.region)
  ).length;

  const facts = [
    { label: 'Type', value: ALERT_TYPES[alert.type]?.label ?? alert.type },
    { label: 'Severity', value: alert.severity ?? '—' },
    { label: 'Region', value: alert.region ?? '—' },
    { label: 'Source', value: alert.source ?? '—' },
  ];

  return (
    <div className="max-w-[880px]">
      <Link
        to="/alerts"
        className="mb-4 inline-block p-[8px_8px_8px_0] text-sm font-semibold text-soft"
      >
        ← All alerts
      </Link>

      <div className="rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-panel md:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <TypeChip type={alert.type} />
          <SeverityChip severity={alert.severity} />
          <span className="text-xs text-[#9CA3AF]">
            {alert.region}
            {alert.created_at ? ` · ${formatAge(alert.created_at)}` : ''}
          </span>
        </div>

        <h1 className="mb-4 text-[30px] leading-[1.25]">{alert.title}</h1>

        <p className="max-w-[64ch] text-base leading-[1.7] text-muted">
          {alert.description || alert.short}
        </p>

        <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-2xl bg-tint p-4">
              <div className="text-[11px] uppercase tracking-[.08em] text-soft">
                {fact.label}
              </div>
              <div className="mt-2 text-base font-semibold text-text">
                {fact.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-[#EEF2EE] pt-6">
          <Link
            to={`/alerts/${alert.id}/relay`}
            className="flex items-center gap-2 rounded-xl bg-accent p-[14px_24px] text-[15px] font-semibold text-text shadow-[0_2px_4px_rgba(31,41,55,.08)] transition-colors hover:bg-[#DDA300]"
          >
            <NavIcon src="/icons/send.svg" className="flex h-[18px] w-[18px]" />
            Relay to farmers
          </Link>
          <span className="text-sm text-soft">
            {matched} {matched === 1 ? 'farmer' : 'farmers'} in your list{' '}
            {matched === 1 ? 'is' : 'are'} in this region
          </span>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../context/AuthProvider';
import { logActivity } from '../../services/activity';
import { createRelay, getById } from '../../services/alerts';
import { list as listFarmers } from '../../services/farmer';
import { NavIcon } from '../../src/components/layout/Sidebar';
import checkIcon from '../../src/assets/icons/check.svg';
import messageIcon from '../../src/assets/icons/message.svg';
import { TypeChip, matchesAlertRegion } from './Alerts';

const STEPS = ['Select farmers', 'Preview SMS', 'Sent'];

function buildSms(alert) {
  if (!alert) return '';
  return (
    `AgriBridge alert — ${alert.title}. ${alert.short ?? ''} ` +
    'Call your extension officer for guidance.'
  ).replace(/\s+/g, ' ');
}

export default function Relay() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [alert, setAlert] = useState(null);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [smsText, setSmsText] = useState('');
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [toast, setToast] = useState(null);

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
        setSmsText(buildSms(data));
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [id]);

  // Farmers load after the alert so the in-region ones can be pre-checked.
  useEffect(() => {
    if (!user || !alert) return undefined;

    let active = true;

    listFarmers({ officerId: user.id }).then(({ data, error: farmersError }) => {
      if (!active) return;
      if (farmersError) {
        console.error('Failed to load farmers:', farmersError);
        setError('Could not load your farmers.');
        return;
      }

      const rows = data ?? [];
      setFarmers(rows);
      setSelected(
        new Set(
          rows
            .filter((f) => matchesAlertRegion(f, alert.region))
            .map((f) => f.id)
        )
      );
    });

    return () => {
      active = false;
    };
  }, [user, alert]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectedFarmers = useMemo(
    () => farmers.filter((f) => selected.has(f.id)),
    [farmers, selected]
  );

  function toggle(farmerId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(farmerId)) next.delete(farmerId);
      else next.add(farmerId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === farmers.length ? new Set() : new Set(farmers.map((f) => f.id))
    );
  }

  async function handleSend() {
    setSending(true);
    setError(null);

    const farmerIds = selectedFarmers.map((f) => f.id);

    const { error: relayError } = await createRelay({
      alertId: alert.id,
      officerId: user?.id,
      farmerIds,
      smsText,
    });

    if (relayError) {
      console.error('Failed to record relay:', relayError);
      setError(relayError.message ?? 'Could not send this relay.');
      setSending(false);
      return;
    }

    await logActivity({
      type: 'alert_relayed',
      summary: `Relayed "${alert.title}" to ${farmerIds.length} farmers`,
      entityId: alert.id,
    });

    setSentCount(farmerIds.length);
    setToast(`Relayed to ${farmerIds.length} farmers`);
    setStep(3);
    setSending(false);
  }

  if (loading) {
    return <p className="text-sm text-soft">Loading alert…</p>;
  }

  if (error && !alert) {
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

  const smsChars = smsText.length;
  const smsParts = Math.max(1, Math.ceil(smsChars / 160));

  return (
    <div className="max-w-[880px]">
      <Link
        to={`/alerts/${alert.id}`}
        className="mb-4 inline-block p-[8px_8px_8px_0] text-sm font-semibold text-soft"
      >
        ← Back to alert
      </Link>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        {STEPS.map((label, index) => {
          const number = index + 1;
          const done = step > number;
          const active = step === number;

          return (
            <div key={label} className="flex flex-1 items-center gap-3">
              <div className="flex flex-none items-center gap-3">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-[13px] font-semibold ${
                    done
                      ? 'bg-primary text-white'
                      : active
                        ? 'bg-accent text-text'
                        : 'bg-[#E4EBE4] text-soft'
                  }`}
                >
                  {done ? '✓' : number}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    active || done ? 'text-text' : 'text-soft'
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <span className="hidden h-px flex-1 bg-[#E4EBE4] md:block" />
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-panel md:p-8">
        <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl bg-tint p-4">
          <TypeChip type={alert.type} />
          <span className="text-sm font-semibold">{alert.title}</span>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-xl bg-[#FBE3E3] p-3 text-[13px] font-medium text-error"
          >
            {error}
          </p>
        )}

        {step === 1 && (
          <div>
            <h2 className="mb-2 text-[22px]">Select farmers</h2>
            <p className="mb-6 text-[15px] leading-relaxed text-muted">
              Everyone in the affected region is pre-selected. Uncheck anyone
              this doesn&apos;t apply to.
            </p>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={toggleAll}
                className="rounded-xl border border-border bg-surface p-[8px_16px] text-[13px] font-semibold transition-colors hover:bg-[#F1F7F1]"
              >
                {selected.size === farmers.length
                  ? 'Clear selection'
                  : 'Select all'}
              </button>
              <span className="text-sm text-soft">
                {selected.size} of {farmers.length} selected
              </span>
            </div>

            {farmers.length === 0 ? (
              <p className="text-sm text-soft">
                You have no farmers to relay to yet.
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-2">
                {farmers.map((farmer) => {
                  const checked = selected.has(farmer.id);
                  const inRegion = matchesAlertRegion(farmer, alert.region);

                  return (
                    <button
                      key={farmer.id}
                      type="button"
                      onClick={() => toggle(farmer.id)}
                      aria-pressed={checked}
                      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                        checked
                          ? 'border-primary bg-[#F6FAF6]'
                          : 'border-border bg-surface hover:bg-[#F6FAF6]'
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 flex-none place-items-center rounded-md border ${
                          checked
                            ? 'border-primary bg-primary text-white'
                            : 'border-border bg-surface'
                        }`}
                      >
                        {checked && (
                          <NavIcon
                            src={checkIcon}
                            className="flex h-3.5 w-3.5"
                          />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {farmer.full_name}
                        </span>
                        <span className="mt-1 block text-xs text-soft">
                          {[farmer.lga, farmer.primary_crop, farmer.phone]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>

                      {inRegion && (
                        <span className="flex-none rounded-full bg-accentTint p-[4px_8px] text-[11px] font-semibold uppercase tracking-[.05em] text-accentInk">
                          In region
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={selected.size === 0}
                className="rounded-xl bg-primary p-[14px_24px] text-[15px] font-semibold text-white shadow-[0_2px_4px_rgba(31,41,55,.10)] transition-colors hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-70"
              >
                Preview SMS →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="mb-2 text-[22px]">Preview the message</h2>
            <p className="mb-6 text-[15px] leading-relaxed text-muted">
              Composed from the alert — {smsChars} characters,{' '}
              {smsParts === 1 ? '1 SMS' : `${smsParts} SMS parts`}. Edit before
              sending.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.5fr_1fr] md:items-start">
              <div>
                <label className="sr-only" htmlFor="sms-text">
                  SMS message
                </label>
                <textarea
                  id="sms-text"
                  rows={7}
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  className="w-full resize-y rounded-2xl border border-border bg-tint p-4 text-sm leading-[1.7] text-text outline-none focus:border-primary"
                />
                <div className="mt-4 flex items-center gap-2 text-[13px] text-soft">
                  <NavIcon src={messageIcon} className="flex h-4 w-4 flex-none" />
                  No SMS gateway is connected yet — sending records the relay
                  only.
                </div>
              </div>

              <div className="rounded-2xl bg-tint p-4">
                <div className="mb-4 text-[11px] uppercase tracking-[.08em] text-soft">
                  Recipients ({selectedFarmers.length})
                </div>
                <div className="flex max-h-[216px] flex-col gap-2 overflow-auto">
                  {selectedFarmers.map((farmer) => (
                    <div
                      key={farmer.id}
                      className="flex justify-between gap-2 text-[13px]"
                    >
                      <span className="font-semibold">{farmer.full_name}</span>
                      <span className="text-soft">{farmer.phone}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-border bg-surface p-[14px_20px] text-sm font-semibold transition-colors hover:bg-[#F1F7F1]"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || selectedFarmers.length === 0}
                className="rounded-xl bg-accent p-[14px_24px] text-[15px] font-semibold text-text shadow-[0_2px_4px_rgba(31,41,55,.08)] transition-colors hover:bg-[#DDA300] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {sending
                  ? 'Sending…'
                  : `Send to ${selectedFarmers.length} farmers`}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="py-4 text-center">
            <div className="mx-auto mb-6 grid h-[72px] w-[72px] place-items-center rounded-full bg-pale">
              <NavIcon src={checkIcon} className="flex h-8 w-8 text-primary" />
            </div>

            <h2 className="mb-2 text-[26px]">Relayed to {sentCount} farmers</h2>
            <p className="mx-auto mb-8 max-w-[44ch] text-[15px] leading-[1.65] text-muted">
              The relay has been written to the activity log. No SMS gateway is
              connected yet, so nothing has actually been delivered.
            </p>

            <div className="mx-auto mb-8 max-w-[520px] rounded-2xl bg-tint p-4 text-left">
              <div className="mb-4 text-[11px] uppercase tracking-[.08em] text-soft">
                New activity record
              </div>
              <div className="flex items-start gap-4">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-accentTint p-2">
                  <NavIcon
                    src={messageIcon}
                    className="flex h-full w-full text-accentInk"
                  />
                </span>
                <div>
                  <div className="text-sm leading-[1.55]">
                    Relayed &quot;{alert.title}&quot; to {sentCount} farmers
                  </div>
                  <div className="mt-1 text-xs text-[#9CA3AF]">
                    Alert relayed · just now
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="rounded-xl bg-primary p-[14px_24px] text-[15px] font-semibold text-white shadow-[0_2px_4px_rgba(31,41,55,.10)] transition-colors hover:bg-primaryDark"
              >
                Back to dashboard
              </button>
              <Link
                to="/alerts"
                className="rounded-xl border border-border bg-surface p-[14px_20px] text-sm font-semibold transition-colors hover:bg-[#F1F7F1]"
              >
                Next alert
              </Link>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-primaryDark p-[12px_20px] text-sm font-semibold text-white shadow-panel"
        >
          <NavIcon src={checkIcon} className="flex h-4 w-4 flex-none" />
          {toast}
        </div>
      )}
    </div>
  );
}

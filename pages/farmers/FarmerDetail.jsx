import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { supabase } from '../../lib/supabase';
import { getById, remove, update } from '../../services/farmer';
import { NavIcon } from '../../src/components/layout/Sidebar';
import { initials } from './Farmers';

const FIELD = 'flex flex-col gap-2 text-[13px] font-semibold text-muted';
const INPUT =
  'rounded-xl border border-border bg-tint p-[12px_16px] text-sm font-normal text-text outline-none focus:border-primary';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// confidence is a 0..1 numeric in the schema.
function formatConfidence(value) {
  if (value === null || value === undefined) return null;
  return Math.round(Number(value) * 100);
}

export default function FarmerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    const [farmerResult, diagnosesResult] = await Promise.all([
      getById(id),
      supabase
        .from('diagnoses')
        .select('id, disease_name, confidence, recommendation, created_at')
        .eq('farmer_id', id)
        .order('created_at', { ascending: false }),
    ]);

    if (farmerResult.error) {
      console.error('Failed to load farmer:', farmerResult.error);
      setError('Could not load this farmer.');
      setLoading(false);
      return;
    }

    if (!farmerResult.data) {
      setError('This farmer no longer exists.');
      setLoading(false);
      return;
    }

    if (diagnosesResult.error) {
      // The profile is still useful without history — show it and warn.
      console.error('Failed to load diagnoses:', diagnosesResult.error);
    }

    setError(null);
    setFarmer(farmerResult.data);
    setDiagnoses(diagnosesResult.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function startEditing() {
    setDraft({
      full_name: farmer.full_name ?? '',
      phone: farmer.phone ?? '',
      lga: farmer.lga ?? '',
      region: farmer.region ?? '',
      farm_size: farmer.farm_size ?? '',
      primary_crop: farmer.primary_crop ?? '',
    });
    setEditing(true);
  }

  function setDraftField(key) {
    return (event) =>
      setDraft((prev) => ({ ...prev, [key]: event.target.value }));
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!draft.full_name.trim()) {
      setError('Full name is required.');
      return;
    }

    setSaving(true);
    const { data, error: updateError } = await update(id, draft);

    if (updateError) {
      console.error('Failed to update farmer:', updateError);
      setError(updateError.message ?? 'Could not save changes.');
      setSaving(false);
      return;
    }

    setFarmer(data);
    setError(null);
    setEditing(false);
    setSaving(false);
  }

  async function handleDelete() {
    // Deleting cascades to this farmer's diagnoses, so spell that out.
    const confirmed = window.confirm(
      `Delete ${farmer.full_name}? This also permanently deletes their ` +
        `${diagnoses.length} diagnosis record(s). This cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    const { error: removeError } = await remove(id);

    if (removeError) {
      console.error('Failed to delete farmer:', removeError);
      setError(removeError.message ?? 'Could not delete this farmer.');
      setDeleting(false);
      return;
    }

    navigate('/farmers', { replace: true });
  }

  if (loading) {
    return <p className="text-sm text-soft">Loading farmer…</p>;
  }

  if (error && !farmer) {
    return (
      <div>
        <Link
          to="/farmers"
          className="mb-4 inline-block p-[8px_8px_8px_0] text-sm font-semibold text-soft"
        >
          ← Farmers
        </Link>
        <p className="text-sm text-error">{error}</p>
      </div>
    );
  }

  const facts = [
    { label: 'Phone', value: farmer.phone || '—' },
    { label: 'Farm size', value: farmer.farm_size || '—' },
    { label: 'Primary crop', value: farmer.primary_crop || '—' },
    { label: 'Diagnoses', value: String(diagnoses.length) },
  ];

  const location = [farmer.lga, farmer.region].filter(Boolean).join(', ');

  return (
    <div className="max-w-[960px]">
      <Link
        to="/farmers"
        className="mb-4 inline-block p-[8px_8px_8px_0] text-sm font-semibold text-soft"
      >
        ← Farmers
      </Link>

      <div className="rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-panel md:p-8">
        <div className="flex flex-wrap items-center gap-6">
          <span className="grid h-16 w-16 flex-none place-items-center rounded-full bg-pale font-display text-[22px] font-semibold text-primary">
            {initials(farmer.full_name)}
          </span>

          <div className="min-w-[200px] flex-1">
            <h1 className="mb-2 text-[28px]">{farmer.full_name}</h1>
            <div className="text-sm text-soft">
              {location || 'Location not set'} · registered{' '}
              {formatDate(farmer.registered_at)}
            </div>
          </div>

          <div className="flex flex-none flex-wrap gap-2">
            <button
              type="button"
              onClick={editing ? () => setEditing(false) : startEditing}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface p-[12px_20px] text-sm font-semibold transition-colors hover:bg-[#F1F7F1]"
            >
              <NavIcon src="/icons/pencil.svg" className="flex h-[18px] w-[18px]" />
              {editing ? 'Cancel' : 'Edit'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl border border-border bg-surface p-[12px_20px] text-sm font-semibold text-error transition-colors hover:bg-[#FBE3E3] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl bg-[#FBE3E3] p-3 text-[13px] font-medium text-error"
          >
            {error}
          </p>
        )}

        {editing ? (
          <form onSubmit={handleSave} noValidate className="mt-8">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
              <label className={FIELD}>
                Full name
                <input
                  value={draft.full_name}
                  onChange={setDraftField('full_name')}
                  className={INPUT}
                  required
                />
              </label>
              <label className={FIELD}>
                Phone number
                <input
                  type="tel"
                  value={draft.phone}
                  onChange={setDraftField('phone')}
                  className={INPUT}
                />
              </label>
              <label className={FIELD}>
                State
                <input
                  value={draft.region}
                  onChange={setDraftField('region')}
                  className={INPUT}
                />
              </label>
              <label className={FIELD}>
                LGA
                <input
                  value={draft.lga}
                  onChange={setDraftField('lga')}
                  className={INPUT}
                />
              </label>
              <label className={FIELD}>
                Farm size
                <input
                  value={draft.farm_size}
                  onChange={setDraftField('farm_size')}
                  className={INPUT}
                />
              </label>
              <label className={FIELD}>
                Primary crop
                <input
                  value={draft.primary_crop}
                  onChange={setDraftField('primary_crop')}
                  className={INPUT}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-8 rounded-xl bg-primary p-[14px_24px] text-[15px] font-semibold text-white shadow-[0_2px_4px_rgba(31,41,55,.10)] transition-colors hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        ) : (
          <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
            {facts.map((fact) => (
              <div key={fact.label} className="rounded-2xl bg-tint p-4">
                <div className="text-[11px] uppercase tracking-[.08em] text-soft">
                  {fact.label}
                </div>
                <div className="mt-2 text-[15px] font-semibold text-text">
                  {fact.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <section className="mt-6 rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-card">
        <h2 className="mb-6 text-[19px]">Diagnosis history</h2>

        {diagnoses.length === 0 ? (
          <p className="text-sm text-soft">
            No diagnoses recorded for this farmer yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {diagnoses.map((diagnosis) => {
              const confidence = formatConfidence(diagnosis.confidence);

              return (
                <div
                  key={diagnosis.id}
                  className="rounded-2xl border border-[#E7EDE7] p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[15px] font-semibold">
                      {diagnosis.disease_name ?? 'Unnamed diagnosis'}
                    </span>
                    <span className="text-xs text-[#9CA3AF]">
                      {formatDate(diagnosis.created_at)}
                    </span>
                  </div>

                  {confidence !== null && (
                    <div className="my-4 flex items-center gap-2">
                      <span className="block h-2 flex-1 overflow-hidden rounded-full bg-[#EEF2EE]">
                        <span
                          className={`block h-full rounded-full ${
                            confidence >= 80 ? 'bg-primary' : 'bg-secondary'
                          }`}
                          style={{ width: `${confidence}%` }}
                        />
                      </span>
                      <span className="text-xs font-semibold text-primary">
                        {confidence}%
                      </span>
                    </div>
                  )}

                  {diagnosis.recommendation && (
                    <div className="text-[13px] leading-[1.65] text-muted">
                      {diagnosis.recommendation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

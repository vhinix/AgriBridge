import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { logActivity } from '../../services/activity';
import { create } from '../../services/farmer';

// Option lists come straight from the design's selects.
const STATES = ['Benue', 'Nasarawa', 'Taraba', 'Kogi'];
const LGAS = [
  'Makurdi',
  'Gboko',
  'Otukpo',
  'Katsina-Ala',
  'Vandeikya',
  'Guma',
  'Kwande',
  'Ushongo',
];
const CROPS = [
  'Yam',
  'Cassava',
  'Rice',
  'Maize',
  'Soybean',
  'Sesame',
  'Orange',
];

const FIELD = 'flex flex-col gap-2 text-[13px] font-semibold text-muted';
const INPUT =
  'rounded-xl border border-border bg-tint p-[12px_16px] text-sm font-normal text-text outline-none focus:border-primary';

export default function AddFarmer() {
  const navigate = useNavigate();

  const [values, setValues] = useState({
    full_name: '',
    phone: '',
    region: STATES[0],
    lga: LGAS[0],
    farm_size: '',
    primary_crop: CROPS[0],
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function set(key) {
    return (event) =>
      setValues((prev) => ({ ...prev, [key]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const name = values.full_name.trim();
    if (!name) {
      setError('Full name is required.');
      return;
    }

    setError(null);
    setSaving(true);

    // create() resolves officer_id from the session itself, so the form never
    // has to carry the current user.
    const { data, error: createError } = await create(values);

    if (createError) {
      console.error('Failed to save farmer:', createError);
      setError(createError.message ?? 'Could not save this farmer.');
      setSaving(false);
      return;
    }

    // Logging never blocks the save — logActivity always resolves.
    await logActivity({
      type: 'farmer_added',
      summary: `Registered new farmer ${name}`,
      entityId: data.id,
    });

    navigate(`/farmers/${data.id}`, { replace: true });
  }

  return (
    <div className="max-w-[720px]">
      <Link
        to="/farmers"
        className="mb-4 inline-block p-[8px_8px_8px_0] text-sm font-semibold text-soft"
      >
        ← Farmers
      </Link>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-panel md:p-8"
      >
        <h1 className="mb-2 text-[26px]">Add farmer</h1>
        <p className="mb-8 text-[15px] leading-relaxed text-muted">
          Phone number and LGA are what the relay depends on.
        </p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
          <label className={FIELD}>
            Full name
            <input
              value={values.full_name}
              onChange={set('full_name')}
              placeholder="e.g. Terhemba Akaa"
              className={INPUT}
              required
            />
          </label>

          <label className={FIELD}>
            Phone number
            <input
              type="tel"
              value={values.phone}
              onChange={set('phone')}
              placeholder="+234 800 000 0000"
              className={INPUT}
            />
          </label>

          <label className={FIELD}>
            State
            <select
              value={values.region}
              onChange={set('region')}
              className={INPUT}
            >
              {STATES.map((state) => (
                <option key={state}>{state}</option>
              ))}
            </select>
          </label>

          <label className={FIELD}>
            LGA
            <select value={values.lga} onChange={set('lga')} className={INPUT}>
              {LGAS.map((lga) => (
                <option key={lga}>{lga}</option>
              ))}
            </select>
          </label>

          <label className={FIELD}>
            Farm size
            <input
              value={values.farm_size}
              onChange={set('farm_size')}
              placeholder="2.5 ha"
              className={INPUT}
            />
          </label>

          <label className={FIELD}>
            Primary crop
            <select
              value={values.primary_crop}
              onChange={set('primary_crop')}
              className={INPUT}
            >
              {CROPS.map((crop) => (
                <option key={crop}>{crop}</option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl bg-[#FBE3E3] p-3 text-[13px] font-medium text-error"
          >
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary p-[14px_24px] text-[15px] font-semibold text-white shadow-[0_2px_4px_rgba(31,41,55,.10)] transition-colors hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Saving…' : 'Save farmer'}
          </button>
          <Link
            to="/farmers"
            className="rounded-xl border border-border bg-surface p-[14px_20px] text-sm font-semibold transition-colors hover:bg-[#F1F7F1]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

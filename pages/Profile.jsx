import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthProvider';
import { supabase } from '../lib/supabase';
import { NavIcon } from '../src/components/layout/Sidebar';
import settingsIcon from '../src/assets/icons/settings.svg';

const FIELD = 'flex flex-col gap-2 text-[13px] font-semibold text-muted';
const INPUT =
  'rounded-xl border border-border bg-tint p-[12px_16px] text-sm font-normal text-text outline-none focus:border-primary';

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [draft, setDraft] = useState({
    full_name: '',
    agency: '',
    region: '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  // AuthProvider loads the profile asynchronously, so seed the form once it lands.
  useEffect(() => {
    if (!profile) return;
    setDraft({
      full_name: profile.full_name ?? '',
      agency: profile.agency ?? '',
      region: profile.region ?? '',
      phone: profile.phone ?? '',
    });
  }, [profile]);

  function set(key) {
    return (event) => {
      setDraft((prev) => ({ ...prev, [key]: event.target.value }));
      setStatus(null);
    };
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!draft.full_name.trim()) {
      setError('Full name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setStatus(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: draft.full_name.trim(),
        agency: draft.agency.trim() || null,
        region: draft.region.trim() || null,
        phone: draft.phone.trim() || null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      setError(updateError.message ?? 'Could not save your changes.');
      setSaving(false);
      return;
    }

    // AuthProvider refetches the profile when the user changes, not on edit, so
    // the sidebar keeps the old name until reload. Flagged in the handover.
    setStatus('Changes saved.');
    setSaving(false);
  }

  async function handleSignOut() {
    const { error: signOutError } = await signOut();
    if (signOutError) {
      setError('Could not sign out. Please try again.');
      return;
    }
    navigate('/login', { replace: true });
  }

  if (!profile) {
    return <p className="text-sm text-soft">Loading your profile…</p>;
  }

  return (
    <div className="max-w-[720px]">
      <div className="mb-2 flex items-center gap-3">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-pale p-[11px]">
          <NavIcon
            src={settingsIcon}
            className="flex h-full w-full text-primary"
          />
        </span>
        <h1 className="text-[28px] leading-tight md:text-[34px]">
          Profile &amp; settings
        </h1>
      </div>

      <p className="mb-8 text-base leading-relaxed text-muted">
        Your assigned region decides which alerts reach you.
      </p>

      <form
        onSubmit={handleSave}
        noValidate
        className="rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-panel md:p-8"
      >
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <span className="grid h-16 w-16 flex-none place-items-center rounded-full bg-pale font-display text-[21px] font-semibold text-primary">
            {initials(profile.full_name)}
          </span>
          <div>
            <div className="font-display text-[21px] font-semibold">
              {profile.full_name}
            </div>
            <div className="mt-1 text-sm text-soft">
              {[profile.role, profile.agency].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
          <label className={FIELD}>
            Full name
            <input
              value={draft.full_name}
              onChange={set('full_name')}
              className={INPUT}
              required
            />
          </label>

          <label className={FIELD}>
            Phone number
            <input
              type="tel"
              value={draft.phone}
              onChange={set('phone')}
              placeholder="+234 800 000 0000"
              className={INPUT}
            />
          </label>

          <label className={FIELD}>
            Agency
            <input
              value={draft.agency}
              onChange={set('agency')}
              placeholder="Benue State ADP"
              className={INPUT}
            />
          </label>

          <label className={FIELD}>
            Assigned region
            <input
              value={draft.region}
              onChange={set('region')}
              placeholder="Benue — Makurdi zone"
              className={INPUT}
            />
          </label>

          <label className={FIELD}>
            Email
            <input
              value={user?.email ?? ''}
              readOnly
              disabled
              className={`${INPUT} cursor-not-allowed opacity-70`}
            />
            <span className="text-xs font-normal text-soft">
              Managed by your sign-in account.
            </span>
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

        {status && (
          <p
            role="status"
            className="mt-6 rounded-xl bg-pale p-3 text-[13px] font-medium text-primaryDark"
          >
            {status}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-2 border-t border-[#EEF2EE] pt-6">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary p-[14px_24px] text-[15px] font-semibold text-white shadow-[0_2px_4px_rgba(31,41,55,.10)] transition-colors hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl border border-border bg-surface p-[14px_20px] text-sm font-semibold text-error transition-colors hover:bg-[#FDF3F3]"
          >
            Log out
          </button>
        </div>
      </form>
    </div>
  );
}

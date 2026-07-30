import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthProvider';
import { supabase } from '../lib/supabase';

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in — go where the guard sent us from, or the dashboard.
  if (!loading && user) {
    return <Navigate to={location.state?.from ?? '/dashboard'} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    navigate(location.state?.from ?? '/dashboard', { replace: true });
  }

  const fieldClass =
    'flex flex-col gap-2 text-[13px] font-semibold text-muted';
  const inputClass =
    'rounded-xl border border-border bg-surface p-[14px_16px] text-sm font-normal text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-auto bg-primary p-6">
      <div className="w-full max-w-[420px] animate-pop rounded-2xl bg-bg p-[40px_32px] shadow-[0_24px_64px_rgba(0,0,0,.24)]">
        <div className="mb-8 flex items-center gap-2">
          <img src="/logo/agribridge-mark-green.svg" alt="" className="block h-8 w-8" />
          <span className="font-display text-[22px] font-semibold text-primary">
            AgriBridge
          </span>
        </div>

        <h1 className="mb-8 text-[26px] leading-[1.3]">Welcome back</h1>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <label className={fieldClass}>
            Email
            <input
              type="email"
              name="email"
              autoComplete="username"
              placeholder="d.aker@benueadp.gov.ng"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          <label className={fieldClass}>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-[#FBE3E3] p-3 text-[13px] font-medium text-error"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-xl bg-accent p-[16px_24px] text-[15px] font-semibold text-text shadow-[0_2px_4px_rgba(31,41,55,.08)] transition-colors hover:bg-[#DDA300] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Signing in…' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}

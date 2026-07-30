import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
const [showPassword, setShowPassword] = useState(false);

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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} w-full pr-12`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-soft hover:text-text"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.66 19.66 0 0 1 4.06-5.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.5 19.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
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

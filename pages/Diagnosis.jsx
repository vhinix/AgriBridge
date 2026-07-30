import { useEffect, useRef, useState } from 'react';

import { useAuth } from '../context/AuthProvider';
import { supabase } from '../lib/supabase';
import { logActivity } from '../services/activity';
import { diagnose } from '../services/diagnosis';
import { NavIcon } from '../src/components/layout/Sidebar';
import checkIcon from '../src/assets/icons/check.svg';
import leafIcon from '../src/assets/icons/leaf.svg';
import scanIcon from '../src/assets/icons/scan.svg';
import uploadIcon from '../src/assets/icons/upload.svg';

const CROPS = ['Cassava', 'Yam', 'Maize', 'Rice'];

const FIELD = 'flex flex-col gap-2 text-[13px] font-semibold text-muted';
const INPUT =
  'rounded-xl border border-border bg-tint p-[12px_16px] text-sm font-normal text-text outline-none focus:border-primary';

export default function Diagnosis() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [farmers, setFarmers] = useState([]);
  const [farmerId, setFarmerId] = useState('');
  const [crop, setCrop] = useState(CROPS[0]);

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Farmers for the picker. Queried directly rather than through
  // services/farmer.js, which is not implemented on this branch.
  useEffect(() => {
    let active = true;

    supabase
      .from('farmers')
      .select('id, full_name, lga, region, primary_crop')
      .order('full_name')
      .then(({ data, error: listError }) => {
        if (!active) return;
        if (listError) {
          console.error('Failed to load farmers:', listError);
          setError('Could not load your farmers.');
          return;
        }
        setFarmers(data ?? []);
        if (data?.length) setFarmerId((current) => current || data[0].id);
      });

    return () => {
      active = false;
    };
  }, []);

  // Object URLs have to be handed back or the blob leaks for the session.
  useEffect(() => {
    if (!image) {
      setPreview(null);
      return undefined;
    }

    const url = URL.createObjectURL(image);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [image]);

  const farmer = farmers.find((f) => f.id === farmerId) ?? null;

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImage(file);
    setResult(null);
    setSaved(false);
    setError(null);
  }

  async function handleRun() {
    setRunning(true);
    setResult(null);
    setSaved(false);
    setError(null);

    try {
      const outcome = await diagnose(image, {
        crop,
        farmerId,
        region: farmer?.region,
      });
      setResult(outcome);
    } catch (runError) {
      console.error('Diagnosis failed:', runError);
      setError('The diagnosis could not be completed. Please try again.');
    } finally {
      setRunning(false);
    }
  }

  async function handleSave() {
    if (!result || !farmer) return;

    setSaving(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('diagnoses')
      .insert({
        farmer_id: farmer.id,
        officer_id: user?.id ?? null,
        disease_name: result.diseaseName,
        confidence: result.confidence,
        recommendation: result.recommendation,
        region: farmer.region,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to save diagnosis:', insertError);
      setError(insertError.message ?? 'Could not save this diagnosis.');
      setSaving(false);
      return;
    }

    await logActivity({
      type: 'diagnosis_logged',
      summary: `Logged diagnosis (${result.diseaseName}) for ${farmer.full_name}`,
      entityId: farmer.id,
    });

    setSaved(true);
    setSaving(false);
    return data;
  }

  const confidencePercent = result ? Math.round(result.confidence * 100) : 0;

  return (
    <div className="max-w-[880px]">
      <h1 className="text-[28px] leading-tight md:text-[34px]">Crop diagnosis</h1>
      <p className="mb-8 mt-2 max-w-[62ch] text-base leading-relaxed text-muted">
        Every diagnosis you log is also a signal — enough of the same disease in
        one LGA and the alert engine raises a pest outbreak for the whole region.
      </p>

      <div className="rounded-2xl border border-[#EEF2EE] bg-surface p-6 shadow-panel md:p-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
          <label className={FIELD}>
            Farmer
            <select
              value={farmerId}
              onChange={(e) => {
                setFarmerId(e.target.value);
                setSaved(false);
              }}
              className={INPUT}
              disabled={farmers.length === 0}
            >
              {farmers.length === 0 && <option value="">No farmers yet</option>}
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name}
                  {f.lga ? ` — ${f.lga}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className={FIELD}>
            Affected crop
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className={INPUT}
            >
              {CROPS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#C6DCC7] bg-[#F6FAF6] p-[40px_24px] text-center">
          {preview ? (
            <img
              src={preview}
              alt="Uploaded crop photo"
              className="mb-2 max-h-[240px] w-auto rounded-xl object-contain"
            />
          ) : (
            <span className="mb-2 grid h-14 w-14 place-items-center rounded-full bg-pale p-[14px]">
              <NavIcon src={uploadIcon} className="flex h-full w-full text-primary" />
            </span>
          )}

          <div className="text-base font-semibold">
            {image ? image.name : 'Upload a photo of the affected plant'}
          </div>
          <div className="max-w-[40ch] text-sm leading-relaxed text-soft">
            JPG or PNG · leaf and stem in frame · shot in good daylight
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFile}
            className="hidden"
          />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-border bg-surface p-[12px_20px] text-sm font-semibold transition-colors hover:bg-[#F1F7F1]"
            >
              {image ? 'Choose another photo' : 'Choose photo'}
            </button>

            <button
              type="button"
              onClick={handleRun}
              disabled={!image || !farmer || running}
              className="flex items-center gap-2 rounded-xl bg-primary p-[12px_24px] text-sm font-semibold text-white shadow-[0_2px_4px_rgba(31,41,55,.10)] transition-colors hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-70"
            >
              <NavIcon src={scanIcon} className="flex h-[18px] w-[18px]" />
              {running ? 'Analysing…' : 'Run diagnosis'}
            </button>
          </div>
        </div>

        {running && (
          <div className="mt-6 flex items-center gap-4 rounded-2xl bg-tint p-4">
            <span className="block h-6 w-6 flex-none animate-spin rounded-full border-[3px] border-pale border-t-primary" />
            <div>
              <div className="text-[15px] font-semibold">Analysing the image…</div>
              <div className="mt-1 text-[13px] text-soft">
                Matching against 47 cassava and yam disease classes
              </div>
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl bg-[#FBE3E3] p-3 text-[13px] font-medium text-error"
          >
            {error}
          </p>
        )}

        {result && !running && (
          <div className="mt-6 rounded-2xl bg-tint p-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-accentTint p-[4px_12px] text-[11px] font-semibold uppercase tracking-[.08em] text-accentInk">
              <NavIcon src={leafIcon} className="flex h-[14px] w-[14px]" />
              Diagnosis result
            </span>

            <h2 className="my-4 text-[24px]">{result.diseaseName}</h2>

            <div className="mb-6 flex max-w-[360px] items-center gap-4">
              <span className="block h-2 flex-1 overflow-hidden rounded-full bg-[#E4EBE4]">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${confidencePercent}%` }}
                />
              </span>
              <span className="whitespace-nowrap text-[13px] font-semibold text-primary">
                {confidencePercent}% confidence
              </span>
            </div>

            <div className="mb-2 text-[11px] uppercase tracking-[.08em] text-soft">
              Recommendation
            </div>
            <p className="mb-6 max-w-[62ch] text-[15px] leading-[1.7] text-muted">
              {result.recommendation}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || saved || !farmer}
                className="flex items-center gap-2 rounded-xl bg-accent p-[12px_20px] text-sm font-semibold text-text shadow-[0_2px_4px_rgba(31,41,55,.08)] transition-colors hover:bg-[#DDA300] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saved && <NavIcon src={checkIcon} className="flex h-[18px] w-[18px]" />}
                {saved
                  ? 'Saved to farmer record'
                  : saving
                    ? 'Saving…'
                    : 'Save to farmer record'}
              </button>

              {farmer && (
                <span className="text-[13px] text-soft">
                  Region tagged {farmer.region || farmer.lga || 'unset'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

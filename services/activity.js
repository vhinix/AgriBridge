import { supabase } from '../lib/supabase';

/**
 * Record an officer action in the `activities` feed.
 *
 * Fire-and-forget by design: activity logging is never the reason a user action
 * fails, so every path here resolves. Failures are reported to the console and
 * returned as `{ error }` for callers that care, but the promise never rejects.
 *
 * @param {object}  entry
 * @param {string}  entry.type      farmer_added | diagnosis_logged | alert_relayed
 * @param {string} [entry.summary]  human-readable line for the feed
 * @param {string} [entry.entityId] uuid of the row this refers to
 * @returns {Promise<{ error: unknown | null }>}
 */
export async function logActivity({ type, summary, entityId } = {}) {
  try {
    // getSession reads the persisted session locally, so logging costs no
    // extra round trip before the insert.
    const { data, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('logActivity: could not read session:', sessionError);
      return { error: sessionError };
    }

    const officerId = data?.session?.user?.id;

    if (!officerId) {
      const error = new Error('no active session');
      console.error(`logActivity: skipped "${type}" — ${error.message}`);
      return { error };
    }

    const { error: insertError } = await supabase.from('activities').insert({
      officer_id: officerId,
      type,
      summary: summary ?? null,
      // entity_id is a uuid column: '' and undefined would both be rejected.
      entity_id: entityId || null,
    });

    if (insertError) {
      console.error(`logActivity: failed to log "${type}":`, insertError);
      return { error: insertError };
    }

    return { error: null };
  } catch (error) {
    // Network drop, thrown client error, anything else — still resolve.
    console.error(`logActivity: unexpected failure logging "${type}":`, error);
    return { error };
  }
}

export default logActivity;

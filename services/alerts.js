import { supabase } from '../lib/supabase';

const COLUMNS =
  'id, type, severity, region, title, short, description, source, created_at';

/**
 * Alerts, newest first. Pass `type` to narrow to one of
 * weather | pest | crop_recommendation.
 */
export async function list({ type } = {}) {
  let query = supabase
    .from('alerts')
    .select(COLUMNS)
    .order('created_at', { ascending: false });

  if (type) query = query.eq('type', type);

  return query;
}

/** A single alert, or `data: null` when the id matches nothing. */
export async function getById(id) {
  return supabase.from('alerts').select(COLUMNS).eq('id', id).maybeSingle();
}

/**
 * Record an SMS relay.
 *
 * STUB: no SMS provider is wired up. This only writes the alert_relays row
 * that represents the send, so `status` defaults to 'sent' to match the
 * schema's intent while nothing actually leaves the app.
 */
export async function createRelay({
  alertId,
  officerId,
  farmerIds = [],
  smsText,
  status = 'sent',
}) {
  return supabase
    .from('alert_relays')
    .insert({
      alert_id: alertId,
      officer_id: officerId ?? null,
      farmer_ids: farmerIds,
      sms_text: smsText,
      status,
    })
    .select('id')
    .single();
}

export default { list, getById, createRelay };

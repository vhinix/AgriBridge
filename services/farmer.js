import { supabase } from '../lib/supabase';

const TABLE = 'farmers';

const COLUMNS =
  'id, officer_id, full_name, phone, lga, region, farm_size, primary_crop, registered_at, created_at';

// Only these columns are writable; anything else in a form payload is dropped
// so a stray field can never reach the insert/update.
const WRITABLE = [
  'full_name',
  'phone',
  'lga',
  'region',
  'farm_size',
  'primary_crop',
  'registered_at',
];

function pickWritable(values = {}) {
  const row = {};

  for (const key of WRITABLE) {
    if (values[key] === undefined) continue;
    const value = values[key];
    // Trim strings and store blanks as null rather than '' so optional columns
    // stay genuinely empty.
    row[key] = typeof value === 'string' ? value.trim() || null : value;
  }

  return row;
}

async function currentOfficerId() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return { officerId: null, error };
  return { officerId: data?.session?.user?.id ?? null, error: null };
}

/**
 * Farmers, newest registration first.
 * Pass `officerId` to scope the list to one officer's caseload.
 * @returns {Promise<{ data: object[] | null, error: unknown }>}
 */
export async function list({ officerId } = {}) {
  let query = supabase
    .from(TABLE)
    .select(COLUMNS)
    .order('registered_at', { ascending: false, nullsFirst: false })
    .order('full_name', { ascending: true });

  if (officerId) query = query.eq('officer_id', officerId);

  return query;
}

/**
 * A single farmer, or `data: null` when the id matches nothing.
 */
export async function getById(id) {
  return supabase.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle();
}

/**
 * Insert a farmer. `officer_id` defaults to the signed-in officer, so callers
 * only pass form values.
 */
export async function create(values = {}) {
  const row = pickWritable(values);

  let officerId = values.officer_id;

  if (!officerId) {
    const resolved = await currentOfficerId();
    if (resolved.error) return { data: null, error: resolved.error };
    officerId = resolved.officerId;
  }

  if (!officerId) {
    return { data: null, error: new Error('no active session') };
  }

  return supabase
    .from(TABLE)
    .insert({ ...row, officer_id: officerId })
    .select(COLUMNS)
    .single();
}

/**
 * Patch a farmer. Only writable columns are sent; `officer_id` is not
 * reassignable here.
 */
export async function update(id, values = {}) {
  return supabase
    .from(TABLE)
    .update(pickWritable(values))
    .eq('id', id)
    .select(COLUMNS)
    .single();
}

/**
 * Delete a farmer.
 *
 * NOTE: `diagnoses.farmer_id` is declared `on delete cascade`, so this also
 * destroys the farmer's diagnosis history. Confirm with the user before
 * calling.
 */
export async function remove(id) {
  return supabase.from(TABLE).delete().eq('id', id);
}

export default { list, getById, create, update, remove };

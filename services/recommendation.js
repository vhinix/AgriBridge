import { supabase } from '../lib/supabase';

// region_crops is keyed by agro-ecological zone, but profiles.region holds a
// free-text posting ('Benue — Makurdi zone'), so states are mapped to a zone.
const ZONES = {
  'Middle Belt': [
    'benue',
    'plateau',
    'nasarawa',
    'niger',
    'kogi',
    'kwara',
    'taraba',
    'adamawa',
    'abuja',
    'fct',
  ],
  Northern: [
    'kano',
    'katsina',
    'kaduna',
    'sokoto',
    'kebbi',
    'zamfara',
    'jigawa',
    'bauchi',
    'gombe',
    'borno',
    'yobe',
  ],
  Southern: [
    'lagos',
    'ogun',
    'oyo',
    'osun',
    'ondo',
    'ekiti',
    'edo',
    'delta',
    'rivers',
    'bayelsa',
    'cross river',
    'akwa ibom',
    'imo',
    'abia',
    'anambra',
    'enugu',
    'ebonyi',
  ],
};

const DEFAULT_ZONE = 'Middle Belt';

/**
 * Resolve a free-text region to one of the three zones in `region_crops`.
 * Falls back to Middle Belt, the zone this deployment serves.
 */
export function resolveZone(region) {
  if (!region) return DEFAULT_ZONE;

  const value = region.toLowerCase();

  // Already a zone name.
  const direct = Object.keys(ZONES).find((zone) => zone.toLowerCase() === value);
  if (direct) return direct;

  const matched = Object.entries(ZONES).find(([, states]) =>
    states.some((state) => value.includes(state))
  );

  return matched ? matched[0] : DEFAULT_ZONE;
}

/**
 * Season for a given date: wet runs Apr–Oct, dry runs Nov–Mar.
 */
export function currentSeason(date = new Date()) {
  const month = date.getMonth() + 1;
  return month >= 4 && month <= 10 ? 'wet' : 'dry';
}

/**
 * Crops worth planting in a region this season.
 *
 * Resolves as the documented array even on failure — the dashboard card that
 * uses this should never take the page down.
 *
 * @param {string} region  officer's region, free text or a zone name
 * @param {string} [season] 'wet' | 'dry'; derived from today when omitted
 * @returns {Promise<Array<{ crop, yield_outlook, planting_window, notes }>>}
 */
export async function recommend(region, season = currentSeason()) {
  const zone = resolveZone(region);

  const { data, error } = await supabase
    .from('region_crops')
    .select('crop, yield_outlook, planting_window, notes')
    .eq('region', zone)
    .eq('season', season);

  if (error) {
    console.error(`recommend: failed for ${zone}/${season}:`, error);
    return [];
  }

  return data ?? [];
}

export default recommend;

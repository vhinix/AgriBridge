import { diagnose as mockProvider } from './mock';

// The single seam between the app and whatever actually classifies images.
// Swapping in a real API means changing this one binding — callers keep using
// diagnose() and keep receiving the same shape.
const provider = mockProvider;

/**
 * Classify a crop photo.
 *
 * The provider's answer is normalised here, so a future HTTP backend returning
 * snake_case or a 0-100 confidence cannot leak its shape into the UI.
 *
 * @param {File|Blob|null} image
 * @param {object} [meta]           e.g. { crop, farmerId, region }
 * @returns {Promise<{ diseaseName: string, confidence: number, recommendation: string }>}
 *          confidence is always 0..1
 */
export async function diagnose(image, meta = {}) {
  const raw = await provider(image, meta);

  const diseaseName = raw.diseaseName ?? raw.disease_name ?? 'Unknown';
  const recommendation = raw.recommendation ?? '';

  let confidence = Number(raw.confidence ?? 0);
  if (!Number.isFinite(confidence)) confidence = 0;
  // Accept either 0..1 or a 0..100 percentage from the provider.
  if (confidence > 1) confidence /= 100;
  confidence = Math.min(Math.max(confidence, 0), 1);

  return { diseaseName, confidence, recommendation };
}

export default diagnose;

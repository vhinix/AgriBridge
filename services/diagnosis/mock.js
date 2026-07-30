// Stand-in for the image-classification API. Results are drawn from the real
// disease/recommendation pairs the design and the seed data use, keyed by crop
// so the answer is at least plausible for what was photographed.

const LIBRARY = {
  Cassava: [
    {
      diseaseName: 'Cassava mosaic disease',
      recommendation:
        'Uproot and burn affected stands. Replant with TME 419 or TMS 30572 resistant cuttings from a certified source. Control whitefly vectors early and avoid taking cuttings from symptomatic plants.',
    },
    {
      diseaseName: 'Cassava bacterial blight',
      recommendation:
        'Prune and destroy infected shoots. Avoid working the plot when foliage is wet, and rotate out of cassava for a season before replanting.',
    },
    {
      diseaseName: 'Cassava green mite',
      recommendation:
        'Encourage predatory mites rather than spraying. Avoid broad-spectrum insecticide, and keep plants watered through the dry spell to reduce stress.',
    },
  ],
  Yam: [
    {
      diseaseName: 'Yam anthracnose',
      recommendation:
        'Remove and destroy blighted vines. Stake plants clear of the soil surface and apply a recommended fungicide at first sign of lesions.',
    },
    {
      diseaseName: 'Yam mosaic virus',
      recommendation:
        'Select setts only from symptom-free mother plants. Control aphid vectors and rogue infected stands as soon as mottling appears.',
    },
  ],
  Maize: [
    {
      diseaseName: 'Maize streak virus',
      recommendation:
        'Rogue infected plants early. Plant streak-tolerant varieties and avoid staggered planting dates that carry leafhoppers between plots.',
    },
    {
      diseaseName: 'Maize leaf blight',
      recommendation:
        'Apply a recommended fungicide at first lesion. Rotate with a non-cereal crop and plough in residue to cut the carry-over inoculum.',
    },
  ],
  Rice: [
    {
      diseaseName: 'Rice blast',
      recommendation:
        'Apply the recommended fungicide, avoid excess nitrogen, and keep bunds weed-free. Drain and re-flood to interrupt the disease cycle.',
    },
    {
      diseaseName: 'Rice bacterial leaf blight',
      recommendation:
        'Drain the plot and let it dry before re-flooding. Use clean seed next cycle and avoid clipping leaf tips when transplanting.',
    },
  ],
};

const FALLBACK = LIBRARY.Cassava;

const LATENCY_MS = 1000;

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Fake a classification run.
 *
 * @param {File|Blob|null} image  the uploaded photo (unused by the mock)
 * @param {object} [meta]
 * @param {string} [meta.crop]    narrows the disease pool
 * @returns {Promise<{ diseaseName: string, confidence: number, recommendation: string }>}
 */
export async function diagnose(image, meta = {}) {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const result = pick(LIBRARY[meta.crop] ?? FALLBACK);

  // 0.62–0.95, matching the confidence band the design illustrates.
  const confidence = Math.round((0.62 + Math.random() * 0.33) * 100) / 100;

  return { ...result, confidence };
}

export default diagnose;

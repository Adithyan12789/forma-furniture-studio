import { furnitureAnalysisSchema } from '../../validators/analysisValidators.js';

/**
 * Vision AI analysis service — the ONLY place AI is used in this platform,
 * and it only analyzes photographs. It never generates geometry; the
 * procedural engine builds models from the validated configuration.
 *
 * Provider: Google Gemini (REST, no SDK). Configure with:
 *   GEMINI_API_KEY  (required)
 *   GEMINI_MODEL    (optional, default gemini-2.0-flash)
 */

export class AiNotConfiguredError extends Error {
  constructor() {
    super('GEMINI_API_KEY is not configured on the server. Add it to server/.env to enable AI analysis.');
    this.status = 503;
  }
}
export class AiResponseError extends Error {
  constructor(message) {
    super(message);
    this.status = 502;
  }
}

const MATERIAL_VOCABULARY = [
  'oak', 'walnut', 'mahogany', 'teak', 'pine', 'birch',
  'cotton', 'linen', 'velvet', 'leather', 'synthetic-leather',
  'stainless-steel', 'aluminum', 'iron', 'glass', 'plastic', 'marble', 'concrete',
];

export function buildAnalysisPrompt() {
  return [
    'You are a furniture analysis expert. Examine the attached furniture photograph and return ONLY a JSON object (no markdown, no commentary) with exactly this structure:',
    '',
    '{',
    '  "category":        {"value": "<category>", "confidence": 0..1, "source": "observed|estimated|unknown"},',
    '  "subcategory":     {"value": "<e.g. dining chair, three-seat sofa>", "confidence": 0..1, "source": "..."},',
    '  "style":           {"value": "<design style, e.g. Scandinavian, mid-century modern>", "confidence": 0..1, "source": "..."},',
    '  "primaryColor":    {"value": "<hex color, e.g. #8a6844>", "confidence": 0..1, "source": "..."},',
    '  "secondaryColors": {"value": ["<hex>", ...], "confidence": 0..1, "source": "..."},',
    '  "materials":       {"value": ["<material>", ...], "confidence": 0..1, "source": "..."},',
    '  "finish":          {"value": "<matte|satin|gloss|raw|...>", "confidence": 0..1, "source": "..."},',
    '  "dimensions":      {"value": {"width": <meters>, "height": <meters>, "depth": <meters>}, "confidence": 0..1, "source": "..."},',
    '  "components":      {"value": ["<component>", ...], "confidence": 0..1, "source": "..."},',
    '  "notes": "<anything ambiguous or occluded>"',
    '}',
    '',
    'Rules:',
    '- category must be one of: chair, office-chair, dining-chair, armchair, sofa, sectional-sofa, dining-table, coffee-table, desk, bed, wardrobe, cabinet, bookshelf, storage, other.',
    `- materials must use only this vocabulary: ${MATERIAL_VOCABULARY.join(', ')}.`,
    '- components use short lowercase keys, e.g. legs, backrest, armrests, cushions, drawers, doors, shelves, headboard, top.',
    '- Dimensions are in meters. X = width (left-right), Y = height, Z = depth (front-back). Estimate from the furniture type and proportions; a single photo cannot give exact measurements.',
    '- NEVER invent precision: if a property cannot be seen or reasonably inferred, set source to "estimated" with low confidence, or "unknown" with a neutral value.',
    '- confidence reflects how certain you are: clearly visible = observed with high confidence; inferred from type/proportions = estimated; hidden = unknown.',
    '- Describe only the main furniture item in the image.',
  ].join('\n');
}

/** Extract and validate the analysis JSON from a raw model response text. */
export function parseAiResponse(text) {
  if (!text || typeof text !== 'string') {
    throw new AiResponseError('The AI returned an empty response.');
  }
  let cleaned = text.trim();
  // Tolerate markdown code fences even though JSON mode was requested.
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new AiResponseError('The AI response did not contain a JSON object.');
  }
  let parsed;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new AiResponseError('The AI response was not valid JSON.');
  }
  const result = furnitureAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    throw new AiResponseError(
      `The AI response failed validation: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
  }
  return result.data;
}

/**
 * Analyze a furniture image buffer with Gemini Vision.
 * Returns a validated FurnitureAnalysis.
 */
export async function analyzeImage(buffer, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError();
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: buildAnalysisPrompt() },
            { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } },
          ],
        }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new AiResponseError(`Gemini request failed (${res.status}). ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  return parseAiResponse(text);
}

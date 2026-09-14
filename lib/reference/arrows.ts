// lib/reference/arrows.ts
//
// The 4-arrow Variable / Cognitive Map. Source material:
//
//   • Ra Uru Hu, "From the Left: Strategic Cognition" (2009 IHDS),
//     Lecture One & Two. Confirms:
//       "The Way Mind Organizes is Determined by Tone...
//        Those arrows, it's Tone. This is what it is all about."
//       Arrows are the visual expression of left-ness vs right-ness
//       in cognition. "This is going this way [left], this is going
//       that way [right]."
//
//   • Frank (user), conversation-derived rule:
//       "1-3 is left, 4-6 is right."
//
//   • Frank (user), conversation-derived transit rule:
//       "Transit only affects personality, not design, so transit arrows
//        are personality ones. They are derived from sun/earth tones
//        (fast) and north/south node tones (slow). 1-3 left, 4-6 right."
//
// The natal Variable has FOUR arrows (2 from Design Sun/Earth, 2 from
// Personality Sun/Earth). During a transit, only the PERSONALITY arrows
// shift — both show a direction based on the transiting tone values.
//
// For Phase 1 (transit-only), we model the two transit-active arrows:
//   - Right arrow 1 (fast):  driven by Sun + Earth tones
//   - Right arrow 2 (slow):  driven by North Node + South Node tones
//
// Direction rule (1-3 = left, 4-6 = right) is applied to the average
// tone of each pair.

import type { ToneNumber } from './frameworks';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export type ArrowDirection = 'left' | 'right';

export type ArrowSource =
  | 'design-sun'         // natal-only (not affected by transit)
  | 'design-earth'       // natal-only (not affected by transit)
  | 'personality-sun'    // natal + transit
  | 'personality-earth'  // natal + transit
  | 'node-north'         // transit-driven (Independent Variable, slow)
  | 'node-south';        // transit-driven (Independent Variable, slow)

export interface Arrow {
  source: ArrowSource;
  direction: ArrowDirection;
  driverTone?: number;   // the tone value driving this arrow
  body: 'right' | 'left' | 'top' | 'bottom'; // visual side on bodygraph
  meaning: string;       // short label for the conditioning
}

export interface NatalArrowState {
  // Natal-fixed arrows (only computed if birth data exists; for Phase 1
  // transit-only app, these stay undefined).
  designSun: ArrowDirection | null;
  designEarth: ArrowDirection | null;
  personalitySun: ArrowDirection | null;
  personalityEarth: ArrowDirection | null;
}

export interface TransitArrowState {
  // These are the two arrows a transit produces (both on right side).
  // Both are Personality-side (per Frank's rule: transit affects only
  // personality, not design).
  fast: Arrow;   // sun/earth tones combined
  slow: Arrow;   // node n/s tones combined
}

// ─────────────────────────────────────────────────────────────────
// CORE RULE: tone → direction
// ─────────────────────────────────────────────────────────────────

/**
 * Map a tone value (1–6) to an arrow direction.
 * Rule per Frank: 1–3 = left, 4–6 = right.
 */
export function toneToDirection(tone: ToneNumber): ArrowDirection {
  if (tone >= 1 && tone <= 3) return 'left';
  if (tone >= 4 && tone <= 6) return 'right';
  throw new Error(`Invalid tone: ${tone}`);
}

/**
 * Given two tones, return the directional pairing that defines an arrow.
 *
 * Why "pairing"? Because each arrow is a *vector* — it has magnitude
 * (how strongly it pulls) and direction. The simplest model: average
 * the two tones, then apply the 1-3 / 4-6 split.
 *
 * Per Ra's *From the Left*, the arrow represents the *cognitive vector*
 * of the conceptualizing frame. For transit, the relevant pairing is
 * the binary pair driving the Personality Sun/Earth (fast) or the
 * Independent Variable Node pair (slow).
 */
export function pairToDirection(toneA: ToneNumber, toneB: ToneNumber): ArrowDirection {
  const avg = (toneA + toneB) / 2;
  if (avg >= 1 && avg <= 3) return 'left';
  if (avg > 3 && avg <= 6) return 'right';
  // Should never reach here with valid inputs.
  throw new Error(`Invalid tone pair: (${toneA}, ${toneB})`);
}

/**
 * The "mean tone" — useful when you want the scalar value (1–6) that
 * drove the direction. Rounds to nearest integer in [1, 6].
 */
export function pairMeanTone(toneA: ToneNumber, toneB: ToneNumber): number {
  return Math.round((toneA + toneB) / 2);
}

// ─────────────────────────────────────────────────────────────────
// TRANSIT ARROW COMPUTATION
// ─────────────────────────────────────────────────────────────────

/**
 * Compute the two transit-active arrows for a given moment.
 *
 * Both arrows sit on the RIGHT side of the bodygraph (Personality side).
 *   - Fast arrow: derived from transiting Sun tone + transiting Earth tone
 *                 (changes ~every 37 min, the dominant cognitive vector)
 *   - Slow arrow: derived from transiting N.Node tone + transiting S.Node tone
 *                 (changes ~every 12 hours, the Independent Variable vector)
 *
 * @param sunTone      transiting Sun's tone (1–6)
 * @param earthTone    transiting Earth's tone (1–6)
 * @param nNodeTone    transiting North Node's tone (1–6)
 * @param sNodeTone    transiting South Node's tone (1–6)
 */
export function computeTransitArrows(
  sunTone: ToneNumber,
  earthTone: ToneNumber,
  nNodeTone: ToneNumber,
  sNodeTone: ToneNumber
): TransitArrowState {
  // ── Fast arrow: sun/earth pair ──
  const fastDir = pairToDirection(sunTone, earthTone);
  const fastMean = pairMeanTone(sunTone, earthTone);

  // ── Slow arrow: node pair ──
  const slowDir = pairToDirection(nNodeTone, sNodeTone);
  const slowMean = pairMeanTone(nNodeTone, sNodeTone);

  return {
    fast: {
      source: 'personality-sun',     // transit shifts this Personality arrow
      direction: fastDir,
      driverTone: fastMean,
      body: 'right',
      meaning:
        fastDir === 'left'
          ? 'Cognitive pull toward Left: focused, strategic, analytical. ' +
            'Receptive to inner awareness, organized around the form principle.'
          : 'Cognitive pull toward Right: holistic, receptive, alert. ' +
            'Open to peripheral awareness, responsive to the moment.',
    },
    slow: {
      source: 'node-north',          // Independent Variable arrow
      direction: slowDir,
      driverTone: slowMean,
      body: 'right',
      meaning:
        slowDir === 'left'
          ? 'Independent Variable oriented toward Left: ' +
            'environment conditions strategic, focused cognition.'
          : 'Independent Variable oriented toward Right: ' +
            'environment conditions receptive, holistic cognition.',
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// HUMAN-READABLE LABELS
// ─────────────────────────────────────────────────────────────────

/**
 * Short text label for the fast transit arrow (used in UI / composer).
 */
export function fastArrowLabel(state: TransitArrowState): string {
  return `Fast Arrow: ${state.fast.direction.toUpperCase()} ` +
         `(tone mean ${state.fast.driverTone}/6)`;
}

/**
 * Short text label for the slow transit arrow (used in UI / composer).
 */
export function slowArrowLabel(state: TransitArrowState): string {
  return `Slow Arrow: ${state.slow.direction.toUpperCase()} ` +
         `(tone mean ${state.slow.driverTone}/6)`;
}

// ─────────────────────────────────────────────────────────────────
// REFERENCE TABLE (informational)
// ─────────────────────────────────────────────────────────────────
//
// Tone 1 → Left  | Tone 4 → Right
// Tone 2 → Left  | Tone 5 → Right
// Tone 3 → Left  | Tone 6 → Right
//
// The actual cognitive "flavor" of each tone (from Ra, *From the Left*):
//
//   Tone 1 (SECURITY)   "what is"        — Splenic, nose-breather, calculating
//   Tone 2 (UNCERTAINTY) "what isn't"    — Splenic, mouth-breather, alarm-bell
//   Tone 3 (ACTION)     "vision/assessment" — Ajna, three-dimensional thinker
//   Tone 4 (MEDITATION) "inner vision"   — Ajna, focused, absorbed
//   Tone 5 (JUDGEMENT)  "feeling"        — Solar, the judge
//   Tone 6 (ACCEPTANCE) "touch"          — Plexus, mutative
//
// In the binary framework, the 1st/2nd tones form the Splenic binary
// (what is / what isn't), 3rd/4th form the Ajna binary (outer/inner
// vision), 5th/6th form the Solar/Plexus binary (feeling/touch).
//
// During transit, the dominant cognitive vector is the TONE pair driving
// that body's conceptualizing frame. We average the pair to get a single
// direction for the arrow visualization; the underlying binary flavor
// is recoverable by inspecting the individual tones if desired.

export const TONE_FLAVOR = {
  1: { name: 'SECURITY',     flavor: '"What is" — splenic, calculating, focused on what has been named.' },
  2: { name: 'UNCERTAINTY',  flavor: '"What isn\'t" — splenic, alarm-bell, sounding warnings.' },
  3: { name: 'ACTION',       flavor: 'Outer vision — ajna, three-dimensional, assessing.' },
  4: { name: 'MEDITATION',   flavor: 'Inner vision — ajna, absorbed, focused mind.' },
  5: { name: 'JUDGEMENT',    flavor: 'Feeling — solar, the judge, consequential.' },
  6: { name: 'ACCEPTANCE',   flavor: 'Touch — plexus, mutative, the sixth.' },
} as const;

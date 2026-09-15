// lib/bodyActivation.ts
//
// Pure compute: given a UTC timestamp, derive a body's full activation
// (gate, line, color, tone, base) plus its ecliptic longitude.
//
// No timezones, no date strings, no formatted output. That half lives in
// lib/transitTimeline.ts, which imports from here — never the reverse.
//
// Counting rule (per Frank, matches HD canon):
//   base  1..5 → 6 wraps to 1, tone  += 1
//   tone  1..6 → 7 wraps to 1, color += 1
//   color 1..6 → 7 wraps to 1, line  += 1
//   line  1..6 → 7 wraps to 1, gate increments to the next on the wheel
//
// Wheel structure (verified against Ra's Definitive Book):
//   64 gates × 5°37'30" (= 5.625°) = 360°
//   Anchor: Gate 25 starts at 0° Aries     (spring equinox)
//           Gate 15 starts at 0° Cancer    (summer solstice)
//           Gate 46 starts at 0° Libra     (autumn equinox)
//           Gate 10 starts at 0° Capricorn (winter solstice)
//
// Per-gate arcs (verified against Ra's Rave I'Ching):
//   Line:  56'15"    = 0.9375°
//   Color:  9'22.5"  = 0.15625°
//   Tone:   1'33.75" = 0.02604°
//   Base:     15.625" = 0.00434°   (5 bases, not 6)
//
// Ra's Mandala: 6 lines × 6 colors × 6 tones × 5 bases = 1080 points per gate.
//
// Ephemeris model: J2000.0 mean longitudes (JPL approximate elements) +
// mean-motion rates, PLUS equation-of-center corrections for the Sun and
// the principal lunar terms for the Moon. Accuracy:
//   Sun:  ~±0.01°   (gate/line/color accurate)
//   Moon: ~±0.3°    (gate accurate, line mostly accurate)
//   Nodes: ~±0.1°   (mean node; gate accurate)
//   Mercury/Mars: mean longitude only — can differ from true by several
//     degrees (eccentric orbits). Outer planets: better, but still mean-only.
// Cross-check against humdes.com via the verify CLI.

import {
  GATES,
  GATE_BY_NUMBER,
  gateAtLongitude,
  positionWithinGate,
  type GateNumber,
  type ZodiacSign,
} from './reference/gates';
import {
  type ColorNumber,
  type ToneNumber,
  type BaseNumber,
} from './reference/frameworks';
import {
  PLANET_SPEED_DEG_PER_DAY,
  type PlanetId,
} from './reference/planets';
import type { BodyActivation } from './types';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const DEG2RAD = Math.PI / 180;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** The 12 zodiac signs in order, with their ecliptic longitude ranges. */
const ZODIAC_SIGNS: readonly ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

// ─────────────────────────────────────────────────────────────────
// ANCHOR REFERENCE MOMENT
// ─────────────────────────────────────────────────────────────────
//
// All planet positions are computed RELATIVE to J2000.0
// (2000-01-01 12:00 TT ≈ 11:58:55.816 UTC).

const ANCHOR_UTC = Date.UTC(2000, 0, 1, 11, 58, 55); // J2000.0

/**
 * Anchor ecliptic longitudes at J2000.0 (tropical, degrees [0, 360)).
 * Sun/Earth/Moon/Nodes are real J2000.0 values (JPL approximate mean
 * elements). Planets are mean longitudes at J2000.0 — good to the gate
 * level for slow bodies, approximate for Mercury/Mars (eccentric orbits).
 */
const ANCHOR_LONGITUDE: Record<PlanetId, number> = {
  Sun: 280.4606,        // Sun's geocentric mean longitude at J2000.0
  Earth: 100.4645,      // heliocentric Earth = Sun + 180°
  Moon: 218.3162,       // Moon's mean longitude at J2000.0
  NorthNode: 125.0446,  // mean ascending lunar node at J2000.0
  SouthNode: 305.0446,  // opposite N.Node
  Mercury: 252.2509,
  Venus: 181.9798,
  Mars: 355.4330,
  Jupiter: 34.3964,
  Saturn: 49.9542,
  Uranus: 313.2381,
  Neptune: 304.8631,
  Pluto: 238.9567,
  Chiron: 0.0,          // not used
};

// ─────────────────────────────────────────────────────────────────
// PERTURBATION CORRECTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Sun's equation of center: difference between true and mean longitude.
 * Up to ±1.9° — larger than a third of a gate, so it must be applied.
 * Mean anomaly at J2000.0: 357.5291°, rate 0.98560028°/day.
 */
function sunEquationOfCenter(daysSinceAnchor: number): number {
  const M = (357.5291 + 0.98560028 * daysSinceAnchor) * DEG2RAD;
  return 1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M);
}

/**
 * Principal lunar longitude terms (equation of center, evection,
 * variation). Reduces Moon error from ~±6° (mean only) to ~±0.3°.
 * Mean anomaly M': 134.9634° + 13.064993°/day
 * Mean elongation D: 297.8502° + 12.190749°/day
 */
function moonLongitudeCorrection(daysSinceAnchor: number): number {
  const M = (134.9634 + 13.064993 * daysSinceAnchor) * DEG2RAD;
  const D = (297.8502 + 12.190749 * daysSinceAnchor) * DEG2RAD;
  return (
    6.2888 * Math.sin(M) +         // equation of center
    1.2740 * Math.sin(2 * D - M) + // evection
    0.6583 * Math.sin(2 * D) +     // variation
    0.2136 * Math.sin(2 * M)
  );
}

// ─────────────────────────────────────────────────────────────────
// LONGITUDE COMPUTATION
// ─────────────────────────────────────────────────────────────────

/**
 * Compute a body's tropical ecliptic longitude at a UTC timestamp,
 * relative to the J2000.0 anchor, with Sun/Moon corrections applied.
 *
 * @param planet the celestial body
 * @param utcMs  milliseconds since 1970-01-01 00:00 UTC
 * @returns ecliptic longitude in degrees [0, 360)
 */
export function longitudeAt(planet: PlanetId, utcMs: number): number {
  const speed = PLANET_SPEED_DEG_PER_DAY[planet]; // deg/day (negative = retrograde)
  const anchorLon = ANCHOR_LONGITUDE[planet];
  const daysSinceAnchor = (utcMs - ANCHOR_UTC) / MS_PER_DAY;

  let lon = anchorLon + speed * daysSinceAnchor;

  if (planet === 'Sun') lon += sunEquationOfCenter(daysSinceAnchor);
  if (planet === 'Moon') lon += moonLongitudeCorrection(daysSinceAnchor);

  return ((lon % 360) + 360) % 360; // wrap to [0, 360)
}

/**
 * Resolve an ecliptic longitude to a zodiac sign.
 */
export function signAt(longitude: number): ZodiacSign {
  const idx = Math.floor((((longitude % 360) + 360) % 360) / 30);
  return ZODIAC_SIGNS[idx];
}

// ─────────────────────────────────────────────────────────────────
// GATE / LINE / COLOR / TONE / BASE DERIVATION
// ─────────────────────────────────────────────────────────────────

export interface SixLayerActivation {
  gate: GateNumber;
  line: 1 | 2 | 3 | 4 | 5 | 6;
  color: ColorNumber;
  tone: ToneNumber;
  base: BaseNumber;
}

/**
 * Given an ecliptic longitude, derive the full activation
 * (gate, line, color, tone, base).
 *
 * Method:
 *   1. Find the gate the longitude falls in (gateAtLongitude)
 *   2. Compute position within that gate as [0, 1)
 *   3. Cascade the residual through each layer in arc order:
 *      line (1/6) → color (1/6) → tone (1/6) → base (1/5)
 *      Total = 6 × 6 × 6 × 5 = 1080 points per gate (Ra's Mandala).
 */
export function deriveActivation(longitude: number): SixLayerActivation {
  // 1. Gate
  const gateMeta = gateAtLongitude(longitude);
  const gate = gateMeta.number;

  // 2. Position within gate [0, 1)
  const pos = positionWithinGate(longitude);

  // Line: 1/6 of the gate
  const lineRaw = pos * 6; // [0, 6)
  const line = clampSix(lineRaw) as 1 | 2 | 3 | 4 | 5 | 6;
  const lineResidual = lineRaw - Math.floor(lineRaw); // [0, 1)

  // Color: 1/6 of the line
  const colorRaw = lineResidual * 6; // [0, 6)
  const color = clampSix(colorRaw);
  const colorResidual = colorRaw - Math.floor(colorRaw);

  // Tone: 1/6 of the color
  const toneRaw = colorResidual * 6; // [0, 6)
  const tone = clampSix(toneRaw);
  const toneResidual = toneRaw - Math.floor(toneRaw);

  // Base: 1/5 of the tone — 5 bases, not 6 (Ra's Mandala = 1080/gate)
  const baseRaw = toneResidual * 5; // [0, 5)
  const base = clampFive(baseRaw);

  return { gate, line, color, tone, base };
}

/**
 * Clamp a value in [0, 6) to the integer in [1, 6].
 * floor(x) + 1, so x = 0 → 1 and x = 5.999 → 6.
 */
function clampSix(x: number): 1 | 2 | 3 | 4 | 5 | 6 {
  const v = Math.floor(x) + 1;
  if (v < 1) return 1;
  if (v > 6) return 6;
  return v as 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Clamp a value in [0, 5) to the integer in [1, 5].
 * Same floor+1 convention as clampSix — bases run 1..5 per canon.
 */
function clampFive(x: number): 1 | 2 | 3 | 4 | 5 {
  const v = Math.floor(x) + 1;
  if (v < 1) return 1;
  if (v > 5) return 5;
  return v as 1 | 2 | 3 | 4 | 5;
}

/**
 * Apply the counting rule with cascade:
 *   base 6 → base 1, tone +1; tone 7 → tone 1, color +1; etc.
 *
 * Takes and returns plain numbers so callers can hand it raw arithmetic
 * results; the returned `line` and `gate` are narrowed back to their
 * literal/union types at the boundary.
 */
export function applyCountingRule(
  base: number,
  tone: number,
  color: number,
  line: number,
  gate: number
): { base: number; tone: number; color: number; line: number; gate: number } {
  let b = base, t = tone, c = color, l = line, g = gate;

  // Bases overflow at 5, every other layer at 6.
  if (b > 5) {
    b = 1;
    t += 1;
  }
  if (t > 6) {
    t = 1;
    c += 1;
  }
  if (c > 6) {
    c = 1;
    l += 1;
  }
  if (l > 6) {
    l = 1;
    // `g` is a mutable counter that also receives plain numbers below
    // (the 64 → 1 wrap), so TypeScript widens it to `number`. The value
    // here is always a real gate, so assert it at the call site.
    g = nextGate(g as GateNumber);
  }
  // Gate wraps 64 → 1
  if (g > 64) g = 1;

  return {
    base: b,
    tone: t,
    color: c,
    line: l as 1 | 2 | 3 | 4 | 5 | 6,
    gate: g as GateNumber,
  };
}

/**
 * Return the next gate on the wheel after the given one.
 * The wheel is the King Wen sequence (encoded in GATES array order).
 */
export function nextGate(gate: GateNumber): GateNumber {
  const idx = GATES.findIndex((g) => g.number === gate);
  if (idx === -1) throw new Error(`Unknown gate: ${gate}`);
  const next = GATES[(idx + 1) % GATES.length];
  return next.number;
}

// ─────────────────────────────────────────────────────────────────
// BODY ACTIVATION (top-level)
// ─────────────────────────────────────────────────────────────────

/**
 * Compute the full activation of one celestial body at a UTC timestamp.
 * This is the function every consumer calls — once per body, 13 times
 * per timestamp.
 */
export function bodyActivation(
  planet: PlanetId,
  utcMs: number
): BodyActivation {
  const longitude = longitudeAt(planet, utcMs);
  const { gate, line, color, tone, base } = deriveActivation(longitude);
  const gateMeta = GATE_BY_NUMBER[gate];
  const sign = signAt(longitude);

  return {
    planet,
    gate,
    line,
    color,
    tone,
    base,
    longitude,
    sign,
    gateMeta,
  };
}

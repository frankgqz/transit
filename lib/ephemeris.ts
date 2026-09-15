// lib/ephemeris.ts
//
// Pure compute functions: given a (timestamp, timezone) pair,
// derive the full TransitState (13 body activations + 2 transit arrows).
//
// Counting rule (per Frank, matches HD canon):
//   base 1..6  →  7 wraps to 1, tone += 1
//   tone 1..6  →  7 wraps to 1, color += 1
//   color 1..6 →  7 wraps to 1, line += 1
//   line 1..6  →  7 wraps to 1, gate increments to the next on the wheel
//
// Wheel structure (verified against Ra's Definitive Book):
//   64 gates × 5°37'30" (= 5.625°) = 360°
//   Anchor: Gate 25 starts at 0° Aries (spring equinox)
//           Gate 15 starts at 0° Cancer (summer solstice)
//           Gate 46 starts at 0° Libra  (autumn equinox)
//           Gate 10 starts at 0° Capricorn (winter solstice)
//   Per-gate arcs (verified against Ra's Rave I'Ching):
//     Line:  56'15"   = 0.9375°
//     Color:  9'22.5"  = 0.15625°
//     Tone:   1'33.75" = 0.02604°
//     Base:   15.625"  = 0.00434°
//
// Orbital periods for the 13 bodies (from lib/reference/planets.ts):
//   Sun/Earth: 365.25 days        Moon: 27.32 days
//   Mercury:   87.97              Venus:  224.70
//   Mars:      686.97             Jupiter: 4332.59  (~11.86 y)
//   Saturn:    10759.22 (~29.46 y)Uranus:  30688.5  (~84.01 y)
//   Neptune:   60182.0  (~165 y)  Pluto:   90560.0  (~248 y)
//   Nodes:     6798.27 (~18.6 y, retrograde)
//
// IMPORTANT: this ephemeris is a SELF-COMPUTED model calibrated to
// the equinox/solstice anchors. It is NOT an astronomical ephemeris
// (e.g. NASA JPL) — the precision is sufficient for the line/color/
// tone/base levels that matter for validation, but exact ecliptic
// longitudes should be verified against humdes.com or JPL when needed.

import {
  GATES,
  GATE_BY_NUMBER,
  gateAtLongitude,
  positionWithinGate,
  STEP_DEGREES,
  type GateNumber,
  type ZodiacSign,
} from './reference/gates';
import {
  COLORS, TONES, BASES,
  getColor, getTone, getBase,
  type ColorNumber, type ToneNumber, type BaseNumber,
} from './reference/frameworks';
import {
  PLANETS, PLANET_SPEED_DEG_PER_DAY,
  type PlanetId,
} from './reference/planets';
import {
  computeTransitArrows,
  pairToDirection, pairMeanTone, toneToDirection,
} from './reference/arrows';
import type {
  BodyActivation, TransitState,
  BodyActivationMap, BodyName, TransitInterval,
} from './types';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const DEG = Math.PI / 180;

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
// All planet positions are computed RELATIVE to a single anchor
// moment. We choose J2000.0 (2000-01-01 12:00 TT ≈ 11:58:55.816 UTC)
// as the reference, and assume the following gate assignments at
// that moment:
//
//   Sun:     Gate 25, Line 1, Color 1, Tone 1, Base 1   (0° Aries, approximately)
//   Earth:   Gate 7,  Line 1, Color 1, Tone 1, Base 1   (180° from Sun)
//   Moon:    unknown — depends on astronomical Moon position
//   Nodes:   unknown — depends on astronomical Node position
//   Planets: unknown — depend on astronomical positions
//
// In Phase 1, we approximate Moon/Node/planet positions using their
// mean motion from a known reference. For verification, we cross-
// check against humdes.com's transits archive.
//
// NOTE: a JPL-backed ephemeris is NOT used in Phase 1. We use the
// equinox/solstice anchors + orbital periods as a self-consistent
// reference frame. The verify CLI will tell us if this is good enough.

const ANCHOR_UTC = Date.UTC(2000, 0, 1, 11, 58, 55); // J2000.0

/**
 * Anchor ecliptic longitudes (sidereal, 0° = 0° Aries).
 * For Sun/Earth these are derived from the gate assignment at J2000.0.
 * For Moon/Nodes/planets these are PLACEHOLDERS — Phase 1 needs
 * verification against humdes.com.
 *
 * Format: degrees [0, 360).
 */
const ANCHOR_LONGITUDE: Record<PlanetId, number> = {
  Sun:       0.0,           // J2000.0 sidereal Aries 0° (approx)
  Earth:     180.0,         // opposite Sun
  Moon:      0.0,           // PLACEHOLDER — needs JPL data
  NorthNode: 125.0,         // PLACEHOLDER — needs JPL data
  SouthNode: 305.0,         // opposite N.Node
  Mercury:   0.0,           // PLACEHOLDER
  Venus:     0.0,           // PLACEHOLDER
  Mars:      0.0,           // PLACEHOLDER
  Jupiter:   0.0,           // PLACEHOLDER
  Saturn:    0.0,           // PLACEHOLDER
  Uranus:    0.0,           // PLACEHOLDER
  Neptune:   0.0,           // PLACEHOLDER
  Pluto:     0.0,           // PLACEHOLDER
  Chiron:    0.0,           // not used
};

// ─────────────────────────────────────────────────────────────────
// LONGITUDE COMPUTATION
// ─────────────────────────────────────────────────────────────────

/**
 * Compute a planet's sidereal ecliptic longitude at a UTC timestamp,
 * relative to the anchor moment.
 *
 * @param planet  the celestial body
 * @param utcMs   milliseconds since 1970-01-01 00:00 UTC
 * @returns ecliptic longitude in degrees [0, 360)
 */
export function longitudeAt(planet: PlanetId, utcMs: number): number {
  const speed = PLANET_SPEED_DEG_PER_DAY[planet]; // deg/day (negative for retrograde)
  const anchorLon = ANCHOR_LONGITUDE[planet];
  const daysSinceAnchor = (utcMs - ANCHOR_UTC) / (1000 * 60 * 60 * 24);
  const lon = anchorLon + speed * daysSinceAnchor;
  return ((lon % 360) + 360) % 360; // wrap to [0, 360)
}

/**
 * Resolve ecliptic longitude to a zodiac sign.
 */
export function signAt(longitude: number): ZodiacSign {
  const idx = Math.floor(((longitude % 360) + 360) % 360 / 30);
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
 * Given an ecliptic longitude, derive the 6-layer activation
 * (gate, line, color, tone, base).
 *
 * Method:
 *   1. Find the gate the longitude falls in (using gateAtLongitude)
 *   2. Compute position within gate as [0, 1)
 *   3. Multiply by 6 and floor for each layer in cascade order:
 *      base first (smallest arc), then tone, color, line
 *   4. Apply the counting rule for overflow (cascaded increments)
 */
export function deriveActivation(longitude: number): SixLayerActivation {
  // 1. Gate
  const gateMeta = gateAtLongitude(longitude);
  const gate = gateMeta.number;

  // 2. Position within gate [0, 1)
  const pos = positionWithinGate(longitude); // [0, 1)

  // 3. Decompose into 6×6×6×6×6 = 1296 base steps per gate
  //    Each layer is a 1/6th of the previous.
  //    pos ∈ [0, 1) → baseStep ∈ [0, 6) for the 6-line cascade
  let cumulative = pos * 6 * 6 * 6 * 6 * 6; // pos × 7776 base-steps
  // Actually simpler: derive each layer from the residual position.

  // Line: 1/6 of gate → 6 lines
  const lineRaw = pos * 6;             // [0, 6)
  const line = clampSix(lineRaw) as 1 | 2 | 3 | 4 | 5 | 6;
  const lineResidual = lineRaw - Math.floor(lineRaw); // [0, 1)

  // Color: 1/6 of line → 6 colors
  const colorRaw = lineResidual * 6;   // [0, 6)
  const color = clampSix(colorRaw);
  const colorResidual = colorRaw - Math.floor(colorRaw);

  // Tone: 1/6 of color → 6 tones
  const toneRaw = colorResidual * 6;   // [0, 6)
  const tone = clampSix(toneRaw);
  const toneResidual = toneRaw - Math.floor(toneRaw);

  // Base: 1/5 of tone → 5 bases (NOT 6 — Ra's Mandala has 5 Bases, not 6)
  const baseRaw = toneResidual * 5; // [0, 5)
  const base = clampFive(baseRaw);

  return { gate, line, color, tone, base };
}

/**
 * Clamp a value in [0, 6) to the integer in [1, 6].
 * If x = 0, returns 1 (because base/tone/color "1" is the first slot).
 * If x = 5.999, returns 6.
 */
function clampSix(x: number): 1 | 2 | 3 | 4 | 5 | 6 {
  // Math.floor(x) + 1, clamped to [1, 6]
  const v = Math.floor(x) + 1;
  if (v < 1) return 1;
  if (v > 6) return 6;
  return v as 1 | 2 | 3 | 4 | 5 | 6;
}

function clampFive(x: number): 1 | 2 | 3 | 4 | 5 {
  const v = Math.floor(x) + 1;
  if (v < 1) return 1;
  if (v > 5) return 5;
  return v as 1 | 2 | 3 | 4 | 5;
}


/**
 * Apply the counting rule to a base value, with cascade:
 * base 7 → base 1, tone +1; if tone 7 → tone 1, color +1; etc.
 */
export function applyCountingRule(
  base: number, tone: number, color: number, line: number, gate: number
): { base: number; tone: number; color: number; line: number; gate: number } {
  let b = base, t = tone, c = color, l = line, g = gate;

  if (b > 6) {
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
    g = nextGate(g as GateNumber);
  }
  // Gate wraps 64 → 1
  if (g > 64) g = 1;

  return { base: b, tone: t, color: c, line: l as 1|2|3|4|5|6, gate: g as GateNumber };
}

/**
 * Return the next gate on the wheel after the given one.
 * Wheel is the King Wen sequence (already encoded in GATES array order).
 */
export function nextGate(gate: GateNumber): GateNumber {
  const idx = GATES.findIndex(g => g.number === gate);
  if (idx === -1) throw new Error(`Unknown gate: ${gate}`);
  const next = GATES[(idx + 1) % GATES.length];
  return next.number;
}

// ─────────────────────────────────────────────────────────────────
// BODY ACTIVATION (top-level)
// ─────────────────────────────────────────────────────────────────

/**
 * Compute the full activation of one celestial body at a UTC timestamp.
 */
export function bodyActivation(
  planet: PlanetId, utcMs: number
): BodyActivation {
  const longitude = longitudeAt(planet, utcMs);
  const { gate, line, color, tone, base } = deriveActivation(longitude);
  const gateMeta = GATE_BY_NUMBER[gate];
  const sign = signAt(longitude);

  return {
    planet,
    gate, line, color, tone, base,
    longitude,
    sign,
    gateMeta,
  };
}


// ─────────────────────────────────────────────────────────────────
// FULL TRANSIT STATE
// ─────────────────────────────────────────────────────────────────

/**
 * Compute the full TransitState for a given UTC timestamp + IANA timezone.
 *
 * @param utcMs      milliseconds since 1970-01-01 00:00 UTC
 * @param timezone   IANA timezone identifier (e.g. "America/Los_Angeles")
 * @param localDate  optional override for local date string (YYYY-MM-DD);
 *                   if omitted, computed from utcMs + timezone
 */
export function computeTransitState(
  utcMs: number,
  timezone: string,
  localDate?: string
): TransitState {
  const sun     = bodyActivation('Sun',     utcMs);
  const earth   = bodyActivation('Earth',   utcMs);
  const moon    = bodyActivation('Moon',    utcMs);
  const northNode = bodyActivation('NorthNode', utcMs);
  const southNode = bodyActivation('SouthNode', utcMs);
  const mercury = bodyActivation('Mercury', utcMs);
  const venus   = bodyActivation('Venus',   utcMs);
  const mars    = bodyActivation('Mars',    utcMs);
  const jupiter = bodyActivation('Jupiter', utcMs);
  const saturn  = bodyActivation('Saturn',  utcMs);
  const uranus  = bodyActivation('Uranus',  utcMs);
  const neptune = bodyActivation('Neptune', utcMs);
  const pluto   = bodyActivation('Pluto',   utcMs);

  // Transit arrows: derive from sun/earth tones (fast) and
  // north/south node tones (slow).
  const transitArrows = computeTransitArrows(
    sun.tone, earth.tone,
    northNode.tone, southNode.tone
  );

  return {
    utcTimestamp: new Date(utcMs).toISOString(),
    timezone,
    localDate: localDate ?? formatLocalDate(utcMs, timezone),
    sun, earth, moon, northNode, southNode,
    mercury, venus, mars, jupiter, saturn,
    uranus, neptune, pluto,
    transitArrows,
  };
}

// ─────────────────────────────────────────────────────────────────
// LOCAL DATE / TIME HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Format a UTC timestamp as YYYY-MM-DD in the given IANA timezone.
 *
 * Uses Intl.DateTimeFormat for correctness across DST and timezones.
 */
export function formatLocalDate(utcMs: number, timezone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date(utcMs)); // en-CA gives YYYY-MM-DD
}

/**
 * Get the start (00:00 local) of a given local date in the user's
 * timezone, returned as a UTC millisecond timestamp.
 */
export function localDateStartUtc(localDate: string, timezone: string): number {
  // Parse "YYYY-MM-DD" and assume midnight LOCAL in the user's tz.
  const [y, m, d] = localDate.split('-').map(Number);
  // Build an ISO string in that tz by trial: use the Date constructor
  // with a UTC midnight, then offset by the tz offset for that moment.
  const utcMidnight = Date.UTC(y, m - 1, d, 0, 0, 0);
  const localFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = localFmt.formatToParts(new Date(utcMidnight));
  const get = (k: string) => Number(parts.find(p => p.type === k)?.value || 0);
  const localHour = get('hour') % 24; // Intl can give 24 for midnight
  const localMin = get('minute');
  // Difference between local time and UTC at that moment
  const tzOffsetMs = (localHour * 60 + localMin) * 60 * 1000;
  return utcMidnight - tzOffsetMs;
}

/**
 * Get the end (24:00 local) of a given local date in the user's
 * timezone, returned as a UTC millisecond timestamp.
 */
export function localDateEndUtc(localDate: string, timezone: string): number {
  return localDateStartUtc(localDate, timezone) + 24 * 60 * 60 * 1000;
}

// ─────────────────────────────────────────────────────────────────
// TRANSITION TIMELINE
// ─────────────────────────────────────────────────────────────────

/**
 * For a given day (in user's timezone), compute the color/tone/base
 * transitions for the Sun — used to render the "previous 3 days"
 * timeline view.
 *
 * For Phase 1, we model only Sun transitions. Phase 2 will extend
 * this to all bodies the user cares about.
 */
export function sunTransitionsForDay(localDate: string, timezone: string): TransitInterval[] {
  const dayStart = localDateStartUtc(localDate, timezone);
  const dayEnd   = localDateEndUtc(localDate, timezone);

  const intervals: TransitInterval[] = [];

  // Sample every minute across the 24-hour day to catch transitions
  // at the color level (changes every ~3h45m, so ~4 per day for Sun).
  // Tone/base change more often (~37m/~6m), so we sample finer.

  const SAMPLE_STEP_MS = 60 * 1000; // 1 minute
  const startState = computeTransitState(dayStart, timezone, localDate);

  let lastBase = startState.sun.base;
  let lastTone = startState.sun.tone;
  let lastColor = startState.sun.color;
  let lastLine = startState.sun.line;
  let lastGate = startState.sun.gate;
  let intervalStart = dayStart;

  for (let t = dayStart + SAMPLE_STEP_MS; t < dayEnd; t += SAMPLE_STEP_MS) {
    const s = bodyActivation('Sun', t);
    if (
      s.base !== lastBase ||
      s.tone !== lastTone ||
      s.color !== lastColor ||
      s.line !== lastLine ||
      s.gate !== lastGate
    ) {
      // Push the just-ended interval
      intervals.push({
        body: 'sun',
        layer: lastBase !== s.base ? 'base'
             : lastTone !== s.tone ? 'tone'
             : lastColor !== s.color ? 'color'
             : lastLine !== s.line ? 'line'
             : 'gate',
        startUtc: new Date(intervalStart).toISOString(),
        endUtc: new Date(t).toISOString(),
        startLocal: formatLocalDate(intervalStart, timezone) + ' ' +
                    new Intl.DateTimeFormat('en-GB', {
                      timeZone: timezone, hour: '2-digit', minute: '2-digit'
                    }).format(new Date(intervalStart)),
        endLocal: formatLocalDate(t, timezone) + ' ' +
                  new Intl.DateTimeFormat('en-GB', {
                    timeZone: timezone, hour: '2-digit', minute: '2-digit'
                  }).format(new Date(t)),
        gate: lastGate,
        line: lastLine,
        color: lastColor,
        tone: lastTone,
        base: lastBase,
      });
      // Reset
      lastBase = s.base; lastTone = s.tone; lastColor = s.color;
      lastLine = s.line; lastGate = s.gate;
      intervalStart = t;
    }
  }

  // Push the final interval (the one still open at dayEnd)
  intervals.push({
    body: 'sun',
    layer: 'base', // whatever the last active layer was — for v1 we mark it 'base'
    startUtc: new Date(intervalStart).toISOString(),
    endUtc: new Date(dayEnd).toISOString(),
    startLocal: formatLocalDate(intervalStart, timezone) + ' ' +
                new Intl.DateTimeFormat('en-GB', {
                  timeZone: timezone, hour: '2-digit', minute: '2-digit'
                }).format(new Date(intervalStart)),
    endLocal: formatLocalDate(dayEnd, timezone) + ' ' +
              new Intl.DateTimeFormat('en-GB', {
                timeZone: timezone, hour: '2-digit', minute: '2-digit'
              }).format(new Date(dayEnd)),
    gate: lastGate,
    line: lastLine,
    color: lastColor,
    tone: lastTone,
    base: lastBase,
  });

  return intervals;
}

// ─────────────────────────────────────────────────────────────────
// DEBUG / INSPECTION HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Render a TransitState as a multi-line string for the CLI verify.
 */
export function formatTransitState(s: TransitState): string {
  const fmt = (b: BodyActivation, name: string) =>
    `  ${name.padEnd(11)}: Gate ${String(b.gate).padStart(2)} ` +
    `L${b.line} C${b.color} T${b.tone} B${b.base}  ` +
    `(${b.longitude.toFixed(4)}° ${b.sign})  ` +
    `${b.gateMeta.name}`;

  return [
    `── TransitState ─────────────────────────────`,
    `  UTC: ${s.utcTimestamp}`,
    `  TZ:  ${s.timezone}   Local date: ${s.localDate}`,
    ``,
    `  Bodies (gate.line.color.tone.base):`,
    fmt(s.sun,       'Sun'),
    fmt(s.earth,     'Earth'),
    fmt(s.moon,      'Moon'),
    fmt(s.northNode, 'N.Node'),
    fmt(s.southNode, 'S.Node'),
    fmt(s.mercury,   'Mercury'),
    fmt(s.venus,     'Venus'),
    fmt(s.mars,      'Mars'),
    fmt(s.jupiter,   'Jupiter'),
    fmt(s.saturn,    'Saturn'),
    fmt(s.uranus,    'Uranus'),
    fmt(s.neptune,   'Neptune'),
    fmt(s.pluto,     'Pluto'),
    ``,
    `  Transit arrows:`,
    `    Fast (sun+earth tones): ${s.transitArrows.fast.direction.toUpperCase()} ` +
    `(mean ${s.transitArrows.fast.driverTone}/6)`,
    `    Slow (node tones):     ${s.transitArrows.slow.direction.toUpperCase()} ` +
    `(mean ${s.transitArrows.slow.driverTone}/6)`,
    `──────────────────────────────────────────────`,
  ].join('\n');
}

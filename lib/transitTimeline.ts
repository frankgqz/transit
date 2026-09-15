// lib/transitTimeline.ts
//
// Timezone-aware day handling + assembling a TransitState snapshot.
//
// Imports pure math from ./bodyActivation and the shared contract from
// ./types. Never the reverse: bodyActivation.ts knows nothing about
// days, timezones, or the 13-body shape.
//
// Scope (v0.2): Sun + Earth anchors are calibrated; Moon, Nodes and the
// planets still carry PLACEHOLDER anchors in bodyActivation.ts. Their
// activations are computed and returned because TransitState requires
// them, but they are NOT trustworthy until real anchor data lands.
// The UI should label them as provisional.
import {
  activationsFor,
  longitudeOf,
  activate,
} from './bodyActivation';
import { computeTransitArrows } from './reference/arrows';
import {
  ALL_BODY_NAMES,
  type BodyActivation,
  type BodyActivationMap,
  type BodyName,
  type TransitState,
} from './types';
import type { PlanetId } from './reference/planets';

/** BodyName → the PlanetId key used by bodyActivation(). */
const BODY_TO_PLANET: Record<BodyName, PlanetId> = {
  sun: 'Sun',
  earth: 'Earth',
  moon: 'Moon',
  northNode: 'NorthNode',
  southNode: 'SouthNode',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
};

/* ============================================================
   TIMEZONE-AWARE DAY HANDLING
   The transit day is the VIEWER's local day, not UTC.
   ============================================================ */

/**
 * UTC ms of local midnight for a given local day.
 * FIXED: the original used the offset at "now", which was wrong across
 * DST boundaries and off-by-one for negative-offset zones. This resolves
 * the offset AT the candidate instant, then refines once.
 */
export function localDateStartUtc(
  date: string | Date,
  timezone: string
): number {
  const { y, m, d } = localDateParts(date, timezone);
  const guess = Date.UTC(y, m, d, 0, 0, 0, 0);
  const offsetAtGuess = getTimeZoneOffsetMs(new Date(guess), timezone);
  const corrected = guess - offsetAtGuess;
  // Refinement pass: the offset may differ if that crossed a DST boundary.
  const offsetAtCorrected = getTimeZoneOffsetMs(
    new Date(corrected),
    timezone
  );
  return guess - offsetAtCorrected;
}

/** UTC ms one millisecond before local midnight of the following day. */
export function localDateEndUtc(
  date: string | Date,
  timezone: string
): number {
  const { y, m, d } = localDateParts(date, timezone);
  return localDateStartUtc(new Date(Date.UTC(y, m, d + 1)), timezone) - 1;
}

/**
 * Calendar parts of the local day (y, 0-based m, d).
 * A bare 'YYYY-MM-DD' string — what <input type="date"> and route params
 * produce — is split by component. It must NOT go through new Date(str):
 * that parses as UTC midnight, so every negative-offset zone (the
 * Americas) would read it as the day before.
 */
function localDateParts(
  date: string | Date,
  timezone: string
): { y: number; m: number; d: number } {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    return { y, m: m - 1, d };
  }
  const instant = typeof date === 'string' ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get('year'), m: get('month') - 1, d: get('day') };
}

/** Offset of `timezone` from UTC, in ms, at a given instant. */
function getTimeZoneOffsetMs(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second')
  );
  return asUtc - instant.getTime();
}

/* ============================================================
   DATE FORMATTING
   ============================================================ */

export function formatLocalDate(
  date: string | Date,
  timezone: string
): string {
  const { y, m, d } = localDateParts(date, timezone);
  // Formatted at noon UTC so no zone can roll it to an adjacent day.
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(Date.UTC(y, m, d, 12)));
}

/** Local calendar day as 'YYYY-MM-DD'. */
export function toIsoDay(date: string | Date, timezone: string): string {
  const { y, m, d } = localDateParts(date, timezone);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p(m + 1)}-${p(d)}`;
}

/**
 * UTC ms for the representative instant of a local day: noon local.
 * Noon is the convention in types.ts (TransitDayRow) and it keeps the
 * snapshot inside the same local day for every timezone on Earth.
 */
export function localNoonUtc(date: string | Date, timezone: string): number {
  return localDateStartUtc(date, timezone) + 12 * 60 * 60 * 1000;
}

/* ============================================================
   TRANSIT STATE
   ============================================================ */

/**
 * Full snapshot for one instant: all 13 bodies plus the two
 * transit-active arrows.
 *
 * @param utcMs    instant to compute at (use localNoonUtc for a day)
 * @param timezone viewer's IANA zone
 * @param date     the local day being labelled
 */
export function computeTransitState(
  utcMs: number,
  timezone: string,
  date: string | Date
): TransitState {
  const activations = {} as BodyActivationMap;
  for (const name of ALL_BODY_NAMES) {
    activations[name] = bodyActivation(BODY_TO_PLANET[name], utcMs);
  }

  return {
    utcTimestamp: new Date(utcMs).toISOString(),
    timezone,
    localDate: toIsoDay(date, timezone),
    // The 13 bodies, spread in ALL_BODY_NAMES order so the object
    // literal stays in sync if the list ever changes.
    sun: activations.sun,
    earth: activations.earth,
    moon: activations.moon,
    northNode: activations.northNode,
    southNode: activations.southNode,
    mercury: activations.mercury,
    venus: activations.venus,
    mars: activations.mars,
    jupiter: activations.jupiter,
    saturn: activations.saturn,
    uranus: activations.uranus,
    neptune: activations.neptune,
    pluto: activations.pluto,
    // fast arrow ← Sun + Earth tones; slow ← North + South Node tones.
    transitArrows: computeTransitArrows(
      activations.sun.tone,
      activations.earth.tone,
      activations.northNode.tone,
      activations.southNode.tone
    ),
  };
}

/** Convenience: snapshot for a whole local day (computed at noon). */
export function transitStateForDay(
  date: string | Date,
  timezone: string
): TransitState {
  return computeTransitState(localNoonUtc(date, timezone), timezone, date);
}

/**
 * UTC instants within a local day where a body's gate changes.
 * A gate spans 5.625° and the Sun moves ~0.9856°/day, so one gate
 * lasts ~5.7 days — normally ZERO transitions per day for the Sun.
 * The Moon crosses several. Kept generic so the timeline view can
 * reuse it for any body.
 */
export function gateTransitionsForDay(
  planet: PlanetId,
  dayStart: string | Date,
  timezone: string
): Date[] {
  const transitions: Date[] = [];
  const start = localDateStartUtc(dayStart, timezone);
  const end = localDateEndUtc(dayStart, timezone);
  const STEP = 30 * 60 * 1000;

  let cursor = start;
  let currentGate = deriveActivation(longitudeAt(planet, cursor)).gate;

  while (cursor + STEP < end) {
    const next = cursor + STEP;
    const g = deriveActivation(longitudeAt(planet, next)).gate;
    if (g !== currentGate) {
      // Narrow the crossing to ~5 s.
      let lo = cursor;
      let hi = next;
      while (hi - lo > 5000) {
        const mid = Math.floor((lo + hi) / 2);
        if (deriveActivation(longitudeAt(planet, mid)).gate === currentGate) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
      transitions.push(new Date(hi));
      currentGate = g;
      cursor = hi;
    } else {
      cursor = next;
    }
  }
  return transitions;
}

/** Sun-only wrapper (what the day view asks for most). */
export function sunTransitionsForDay(
  dayStart: string | Date,
  timezone: string
): Date[] {
  return gateTransitionsForDay('Sun', dayStart, timezone);
}

/* ============================================================
   DISPLAY FORMATTING
   ============================================================ */

export function formatActivation(
  label: string,
  a: BodyActivation
): string {
  return [
    `${label}: Gate ${a.gate}.${a.line} — ${a.sign}`,
    `Color ${a.color} · Tone ${a.tone} · Base ${a.base}`,
    `${a.longitude.toFixed(4)}°`,
  ].join(' — ');
}

/** Human-readable summary: the two calibrated bodies in full, the rest brief. */
export function formatTransitState(state: TransitState): string {
  const lines = [
    `${state.localDate} (${state.timezone})`,
    formatActivation('Sun', state.sun),
    formatActivation('Earth', state.earth),
  ];
  for (const name of ALL_BODY_NAMES) {
    if (name === 'sun' || name === 'earth') continue;
    const a = (state as unknown as BodyActivationMap)[name];
    lines.push(`  ${name}: Gate ${a.gate}.${a.line} (provisional)`);
  }
  return lines.join('\n');
}

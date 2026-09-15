// lib/transitTimeline.ts
//
// Timezone-aware day handling + assembling a TransitState snapshot.
//
// Imports pure math from ./bodyActivation and the shared contract from
// ./types. Never the reverse: bodyActivation.ts knows nothing about
// days, timezones, or the app-level BodyActivation shape.
//
// Scope (v0.3): bodyActivation.ts now supports ONLY the four calibrated
// bodies — Sun, Earth, North Node, South Node — via activationsFor().
// Planets and Moon no longer have placeholder anchors, so they are no
// longer computed here. TransitState in types.ts should eventually be
// narrowed to these four; until then computeTransitState casts.
import {
  activationsFor,
  nextBoundaryChange,
  type Activation,
} from './bodyActivation';
import { computeTransitArrows } from './reference/arrows';
import { getGate } from './reference/gates';
import type { PlanetId } from './reference/planets';
import {
  type BodyActivation,
  type TransitState,
} from './types';

/** The four bodies bodyActivation.ts can actually compute. */
const SUPPORTED_BODIES = ['sun', 'earth', 'northNode', 'southNode'] as const;
export type SupportedBody = (typeof SUPPORTED_BODIES)[number];

/** SupportedBody → the PlanetId key used in BodyActivation. */
const BODY_TO_PLANET: Record<SupportedBody, PlanetId> = {
  sun: 'Sun',
  earth: 'Earth',
  northNode: 'NorthNode',
  southNode: 'SouthNode',
};

/**
 * Adapter: lean Activation (gate/line/color/tone/base/key/longitude/sign)
 * → app-level BodyActivation, re-attaching `planet` and `gateMeta`.
 * getGate() (not GATE_BY_NUMBER) because gate numbers repeat across signs.
 */
export function toBodyActivation(
  a: Activation,
  planet: PlanetId
): BodyActivation {
  return {
    ...a,
    planet,
    gateMeta: getGate(a.gate),
  };
}

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
 * Full snapshot for one instant: the four supported bodies plus the
 * transit arrows.
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
  // One call returns all four activations.
  const set = activationsFor(new Date(utcMs));

  const activations = {} as Record<SupportedBody, BodyActivation>;
  for (const name of SUPPORTED_BODIES) {
    activations[name] = toBodyActivation(set[name], BODY_TO_PLANET[name]);
  }

  return {
    utcTimestamp: new Date(utcMs).toISOString(),
    timezone,
    localDate: toIsoDay(date, timezone),
    sun: activations.sun,
    earth: activations.earth,
    northNode: activations.northNode,
    southNode: activations.southNode,
    // fast arrow ← Sun + Earth tones; slow ← North + South Node tones.
    transitArrows: computeTransitArrows(
      activations.sun.tone,
      activations.earth.tone,
      activations.northNode.tone,
      activations.southNode.tone
    ),
    // TODO: narrow TransitState in types.ts to the four supported bodies
    // and drop this cast. Until then, planet fields are simply absent.
  } as unknown as TransitState;
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
 * The Moon would cross several (once it's supported).
 *
 * Replaces the old scan + binary-search: nextBoundaryChange() walks
 * directly to the next crossing at the requested depth.
 */
export function gateTransitionsForDay(
  body: SupportedBody,
  dayStart: string | Date,
  timezone: string
): Date[] {
  const transitions: Date[] = [];
  const start = localDateStartUtc(dayStart, timezone);
  const end = localDateEndUtc(dayStart, timezone);
  let cursor = new Date(start);
  // Hard cap: a fast body could cross many boundaries in a day; this
  // only guards against a pathological infinite loop.
  for (let i = 0; i < 100; i++) {
    const bc = nextBoundaryChange(body, cursor, 'gate');
    if (bc.at.getTime() > end) break;
    transitions.push(bc.at);
    cursor = bc.at;
  }
  return transitions;
}

/** Sun-only wrapper (what the day view asks for most). */
export function sunTransitionsForDay(
  dayStart: string | Date,
  timezone: string
): Date[] {
  return gateTransitionsForDay('sun', dayStart, timezone);
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

/** Human-readable summary of the four supported bodies. */
export function formatTransitState(state: TransitState): string {
  const lines = [
    `${state.localDate} (${state.timezone})`,
    formatActivation('Sun', state.sun),
    formatActivation('Earth', state.earth),
    `  northNode: Gate ${state.northNode.gate}.${state.northNode.line}`,
    `  southNode: Gate ${state.southNode.gate}.${state.southNode.line}`,
  ];
  return lines.join('\n');
}

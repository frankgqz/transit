// lib/transitTimeline.ts
//
// Timezone-aware day handling + the shape of a transit snapshot.
//
// Imports pure math from ./bodyActivation and never the reverse.
// `TransitState` is DEFINED HERE, not in bodyActivation.ts: a "day"
// and a viewer timezone are presentation concerns, and bodyActivation
// stays free of both.
import {
  bodyActivation,
  longitudeAt,
  signAt,
  deriveActivation,
  applyCountingRule,
  type SixLayerActivation,
} from './bodyActivation';
import type { BodyActivation } from './types';
import type { PlanetId } from './reference/planets';

/* ============================================================
   TRANSIT STATE SHAPE
   ============================================================ */

/** One body's activation as surfaced to the UI. */
export type Activation = BodyActivation;

export interface TransitState {
  /** The UTC instant this snapshot was computed at. */
  instant: Date;
  /** Viewer timezone the day was resolved in. */
  timeZone: string;
  /** Local calendar day, 'YYYY-MM-DD'. */
  localDate: string;
  /** Human label, e.g. 'Monday, September 14, 2026'. */
  localLabel: string;
  sun: BodyActivation;
  earth: BodyActivation;
  /** Counting-rule carries for the Sun activation (see sunArrows). */
  arrows: string[];
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
  timeZone: string
): number {
  const { y, m, d } = localDateParts(date, timeZone);
  const guess = Date.UTC(y, m, d, 0, 0, 0, 0);

  const offsetAtGuess = getTimeZoneOffsetMs(new Date(guess), timeZone);
  const corrected = guess - offsetAtGuess;

  // Refinement pass: the offset may differ if that crossed a DST boundary.
  const offsetAtCorrected = getTimeZoneOffsetMs(new Date(corrected), timeZone);
  return guess - offsetAtCorrected;
}

/** UTC ms one millisecond before local midnight of the following day. */
export function localDateEndUtc(date: string | Date, timeZone: string): number {
  const { y, m, d } = localDateParts(date, timeZone);
  return localDateStartUtc(new Date(Date.UTC(y, m, d + 1)), timeZone) - 1;
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
  timeZone: string
): { y: number; m: number; d: number } {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    return { y, m: m - 1, d };
  }
  const instant = typeof date === 'string' ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get('year'), m: get('month') - 1, d: get('day') };
}

/** Offset of timeZone from UTC, in ms, at a given instant. */
function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
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

export function formatLocalDate(date: string | Date, timeZone: string): string {
  const { y, m, d } = localDateParts(date, timeZone);
  // Formatted at noon UTC so no zone can roll it to an adjacent day.
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(Date.UTC(y, m, d, 12)));
}

function toIsoDay(date: string | Date, timeZone: string): string {
  const { y, m, d } = localDateParts(date, timeZone);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p(m + 1)}-${p(d)}`;
}

/* ============================================================
   COUNTING-RULE ARROWS
   ============================================================ */

/**
 * Which layers carry when the Sun's activation steps one base forward.
 * Reports only the layers that actually rolled over — a base increment
 * that doesn't overflow 5 produces no arrow.
 */
function sunArrows(a: SixLayerActivation): string[] {
  const next = applyCountingRule(a.base, a.tone, a.color, a.line, a.gate);
  const arrows: string[] = [];
  if (next.tone !== a.tone) arrows.push(`tone ${a.tone}→${next.tone}`);
  if (next.color !== a.color) arrows.push(`color ${a.color}→${next.color}`);
  if (next.line !== a.line) arrows.push(`line ${a.line}→${next.line}`);
  if (next.gate !== a.gate) arrows.push(`gate ${a.gate}→${next.gate}`);
  return arrows;
}

/* ============================================================
   TRANSIT STATE
   ============================================================ */

/**
 * Full snapshot for one instant. utcMs is the instant to compute at
 * (callers pass local noon); timeZone and date label the local day.
 *
 * Sun and Earth only — Moon/Nodes/planets are still placeholder anchors
 * in bodyActivation.ts and would render as invented data.
 */
export function computeTransitState(
  utcMs: number,
  timeZone: string,
  date: string | Date
): TransitState {
  const instant = new Date(utcMs);
  const sun = bodyActivation('Sun', utcMs);
  const earth = bodyActivation('Earth', utcMs);
  return {
    instant,
    timeZone,
    localDate: toIsoDay(date, timeZone),
    localLabel: formatLocalDate(date, timeZone),
    sun,
    earth,
    arrows: sunArrows(sun),
  };
}

/**
 * UTC instants within a local day where the Sun's gate changes, so the
 * UI can show "Gate 47 until 14:32, then Gate 64".
 */
export function sunTransitionsForDay(
  dayStart: string | Date,
  timeZone: string
): Date[] {
  const transitions: Date[] = [];
  const start = localDateStartUtc(dayStart, timeZone);
  const end = localDateEndUtc(dayStart, timeZone);

  // The Sun moves ~0.9856°/day and a gate spans 5.625°, so a gate lasts
  // ~5.7 days — normally ZERO transitions per day. The scan is kept
  // because it also catches the rare day a crossing lands inside it.
  const STEP = 30 * 60 * 1000;
  let cursor = start;
  let currentGate = deriveActivation(longitudeAt('Sun', cursor)).gate;

  while (cursor + STEP < end) {
    const next = cursor + STEP;
    const g = deriveActivation(longitudeAt('Sun', next)).gate;
    if (g !== currentGate) {
      // Narrow the crossing to ~5 s.
      let lo = cursor;
      let hi = next;
      while (hi - lo > 5000) {
        const mid = Math.floor((lo + hi) / 2);
        if (deriveActivation(longitudeAt('Sun', mid)).gate === currentGate) {
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

/* ============================================================
   DISPLAY FORMATTING
   ============================================================ */

function formatActivation(label: string, a: BodyActivation): string {
  return [
    `${label}: Gate ${a.gate}.${a.line} — ${a.sign}`,
    `Color ${a.color} · Tone ${a.tone} · Base ${a.base}`,
    `${a.longitude.toFixed(4)}°`,
  ].join(' — ');
}

/** Human-readable multi-line summary of a TransitState. */
export function formatTransitState(state: TransitState): string {
  return [
    state.localLabel,
    formatActivation('Sun', state.sun),
    formatActivation('Earth', state.earth),
    `Arrows: ${state.arrows.join(', ') || 'none'}`,
  ].join('\n');
}

export { signAt };
export type { PlanetId };

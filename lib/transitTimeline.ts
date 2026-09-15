import {
  bodyActivation,
  type TransitState,
  type Activation,
} from './bodyActivation';

/* ============================================================
   TIMEZONE-AWARE DAY HANDLING
   The transit day is defined in the VIEWER's local timezone,
   not UTC. A "day" runs from local midnight to local midnight.
   ============================================================ */

/**
 * UTC instant of local midnight for a given local date.
 * FIXED: previous version used the timezone offset at "now",
 * which was wrong across DST boundaries and produced off-by-one
 * dates for western-hemisphere (negative offset) timezones.
 * This version resolves the offset AT the candidate instant and
 * corrects once, which handles the normal DST case.
 */
export function localDateStartUtc(
  date: string | Date,
  timeZone: string
): number {
  const { y, m, d } = localDateParts(date, timeZone);
  const guess = Date.UTC(y, m, d, 0, 0, 0, 0);

  // Find what UTC instant actually corresponds to local midnight
  // by measuring the offset at the guess and correcting.
  const offsetAtGuess = getTimeZoneOffsetMs(new Date(guess), timeZone);
  const corrected = guess - offsetAtGuess;

  // One refinement pass: the offset may differ if the correction
  // crossed a DST boundary.
  const offsetAtCorrected = getTimeZoneOffsetMs(new Date(corrected), timeZone);
  return guess - offsetAtCorrected;
}

/**
 * Calendar parts (y, 0-based m, d) of the local day.
 * A bare 'YYYY-MM-DD' string — what <input type="date"> and route
 * params produce — is split into components directly. It must NOT go
 * through new Date(str): that parses as UTC midnight, so every
 * negative-offset zone (the Americas) would read it as the day before.
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
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(instant);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get('year'), m: get('month') - 1, d: get('day') };
}

/** UTC instant just before local midnight of the FOLLOWING local day. */
export function localDateEndUtc(date: string | Date, timeZone: string): number {
  const { y, m, d } = localDateParts(date, timeZone);
  const nextDay = new Date(Date.UTC(y, m, d + 1));
  // one millisecond before next local midnight
  return localDateStartUtc(nextDay, timeZone) - 1;
}

/** Offset (ms) of timeZone from UTC at a given instant. */
function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  // Format the instant in the target zone, parse back the parts,
  // and diff against UTC. Positive = ahead of UTC.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
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
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(Date.UTC(y, m, d, 12)));
}

/* ============================================================
   TRANSIT STATE
   ============================================================ */

/**
 * Full transit picture for one instant: Sun + Earth activations
 * with gate/line/color/tone/base and the counting-rule arrows.
 * utcMs is the instant to compute at; timeZone and date are carried
 * through so callers can label the day without recomputing.
 */
export function computeTransitState(
  utcMs: number,
  _timeZone: string,
  _date: string | Date
): TransitState {
  return bodyActivation(new Date(utcMs));
}

/**
 * All Sun gate transitions within a local day: the UTC instants
 * where the Sun's gate changes, so the UI can show "Gate 47 until
 * 14:32, then Gate 64".
 */
export function sunTransitionsForDay(
  dayStart: string | Date,
  timeZone: string,
  endAnchor: Date
): Date[] {
  const transitions: Date[] = [];
  const start = new Date(localDateStartUtc(dayStart, timeZone));
  const end = new Date(localDateEndUtc(dayStart, timeZone));

  // The Sun moves ~0.9856°/day; a gate (0.9375°) lasts ~22.8 h,
  // so at most one or two transitions per day. Binary-search each
  // crossing by gate number.
  let cursor = start;
  let currentGate = bodyActivation(cursor).sun.gate;

  while (cursor < end) {
    // Step forward in 30-minute chunks until the gate changes
    const step = new Date(cursor.getTime() + 30 * 60 * 1000);
    if (step >= end) break;
    const g = bodyActivation(step).sun.gate;
    if (g !== currentGate) {
      // Narrow the crossing to within ~5 seconds
      let lo = cursor.getTime();
      let hi = step.getTime();
      while (hi - lo > 5000) {
        const mid = Math.floor((lo + hi) / 2);
        if (bodyActivation(new Date(mid)).sun.gate === currentGate) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
      transitions.push(new Date(hi));
      currentGate = g;
      cursor = new Date(hi);
    } else {
      cursor = step;
    }
  }

  void endAnchor; // reserved for future ephemeris-range validation
  return transitions;
}

/* ============================================================
   DISPLAY FORMATTING
   ============================================================ */

function formatActivation(label: string, a: Activation): string {
  return [
    `${label}: Gate ${a.gate}.${a.line}`,
    `Color ${a.color} · Tone ${a.tone} · Base ${a.base}`,
  ].join(' — ');
}

/** One-line human-readable summary of a TransitState. */
export function formatTransitState(state: TransitState): string {
  return [
    formatActivation('Sun', state.sun),
    formatActivation('Earth', state.earth),
    `Arrows: ${state.arrows.join(', ') || 'none'}`,
  ].join('\n');
}

export type { TransitState, Activation };

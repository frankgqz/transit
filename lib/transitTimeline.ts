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
export function localDateStartUtc(date: Date, timeZone: string): Date {
  // First guess: treat the local Y/M/D as if it were UTC
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const guess = Date.UTC(y, m, d, 0, 0, 0, 0);

  // Find what UTC instant actually corresponds to local midnight
  // by measuring the offset at the guess and correcting.
  const offsetAtGuess = getTimeZoneOffsetMs(new Date(guess), timeZone);
  const corrected = guess - offsetAtGuess;

  // One refinement pass: the offset may differ if the correction
  // crossed a DST boundary.
  const offsetAtCorrected = getTimeZoneOffsetMs(new Date(corrected), timeZone);
  return new Date(guess - offsetAtCorrected);
}

/** UTC instant just before local midnight of the FOLLOWING local day. */
export function localDateEndUtc(date: Date, timeZone: string): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  // End is exclusive-ish: one millisecond before next local midnight
  return new Date(localDateStartUtc(nextDay, timeZone).getTime() - 1);
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

export function formatLocalDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

/* ============================================================
   TRANSIT STATE
   ============================================================ */

/**
 * Full transit picture for one instant: Sun + Earth activations
 * with gate/line/color/tone/base and the counting-rule arrows.
 */
export function computeTransitState(instant: Date): TransitState {
  return bodyActivation(instant);
}

/**
 * All Sun gate transitions within a local day: the UTC instants
 * where the Sun's gate changes, so the UI can show "Gate 47 until
 * 14:32, then Gate 64".
 */
export function sunTransitionsForDay(
  dayStart: Date,
  timeZone: string,
  endAnchor: Date
): Date[] {
  const transitions: Date[] = [];
  const start = localDateStartUtc(dayStart, timeZone);
  const end = localDateEndUtc(dayStart, timeZone);

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

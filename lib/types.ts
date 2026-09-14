// lib/types.ts
//
// Shared type definitions for lib/ephemeris.ts, lib/composer.ts,
// and the app/ UI. This file has NO imports beyond the reference
// tables — it's the contract.
//
// Counting rule (per Frank, conversation-derived, matches HD canon):
//   base 1..6 → 7 = 1 again, tone += 1
//   tone 1..6 → 7 = 1 again, color += 1
//   color 1..6 → 7 = 1 again, line += 1
//   line 1..6 → 7 = 1 again, gate increments to next on the wheel
// This is encoded inside computeAt() in lib/ephemeris.ts.
//
// Per Ra (Definitive Book p. 36): "13 each from the Design and the
// Personality positions" — total 26 activations. For transit we
// compute the transiting activation for each of the 13 bodies.

import type { GateNumber, ZodiacSign, Gate } from './reference/gates';
import type { ToneNumber, ColorNumber, BaseNumber } from './reference/frameworks';
import type { PlanetId } from './reference/planets';
import type { TransitArrowState } from './reference/arrows';

// ─────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────

/**
 * The 6-layer activation of a single celestial body at a moment.
 * Encoded as a tuple of (gate, line, color, tone, base) — no need
 * to store longitude/rightAscension since they are derivable from
 * a (timestamp, timezone) pair.
 */
export interface BodyActivation {
  planet: PlanetId;
  gate: GateNumber;
  line: 1 | 2 | 3 | 4 | 5 | 6;
  color: ColorNumber;
  tone:  ToneNumber;
  base:  BaseNumber;
  /** Ecliptic longitude in degrees [0, 360), for debugging/UI. */
  longitude: number;
  /** Sign the body is in. */
  sign: ZodiacSign;
  /** Gate metadata (name, ichingName, center, keynote) for the composer. */
  gateMeta: Gate;
}

// ─────────────────────────────────────────────────────────────────
// TRANSIT STATE
// ─────────────────────────────────────────────────────────────────

/**
 * The full transit state for a given (timestamp, timezone).
 *
 * Contains activations for the 13 gate-activating bodies plus
 * the two transit-active arrows (both right-side, personality).
 */
export interface TransitState {
  /** ISO timestamp in UTC of the moment this state represents. */
  utcTimestamp: string;
  /** IANA timezone the user is operating in. */
  timezone: string;
  /** Local date string (YYYY-MM-DD) in the user's timezone. */
  localDate: string;

  /** Sun activation (Personality / Life Force, ~70% neutrinos). */
  sun: BodyActivation;
  /** Earth activation (always 180° opposite Sun). */
  earth: BodyActivation;
  /** Moon activation (driving force, ~27.32-day cycle). */
  moon: BodyActivation;
  /** North Node activation (Independent Variable, future direction). */
  northNode: BodyActivation;
  /** South Node activation (Independent Variable, past direction). */
  southNode: BodyActivation;

  /** Mercury activation (Personality Crystal input). */
  mercury: BodyActivation;
  /** Venus activation (values / sociology). */
  venus: BodyActivation;
  /** Mars activation (energy dynamics). */
  mars: BodyActivation;
  /** Jupiter activation (law / protection, ~12-year cycle). */
  jupiter: BodyActivation;
  /** Saturn activation (discipline / judge, ~29-year cycle). */
  saturn: BodyActivation;
  /** Uranus activation (unusualness, ~84-year cycle). */
  uranus: BodyActivation;
  /** Neptune activation (illusion / art, ~165-year cycle). */
  neptune: BodyActivation;
  /** Pluto activation (truth / transformation, ~248-year cycle). */
  pluto: BodyActivation;

  /**
   * Two transit-active arrows (both right-side, Personality).
   * Derived from tone pairs — see lib/reference/arrows.ts.
   *   fast: sun + earth tones combined
   *   slow: northNode + southNode tones combined
   */
  transitArrows: TransitArrowState;
}

// ─────────────────────────────────────────────────────────────────
// DERIVED VIEWS (computed from TransitState by the ephemeris or
// composer — these are convenience shapes, not stored separately)
// ─────────────────────────────────────────────────────────────────

/**
 * Activation-by-name index, useful for UI loops.
 * Excludes Chiron (non-gate-activating) and design-side bodies
 * (which we don't compute, since transit only affects personality).
 */
export type BodyName =
  | 'sun' | 'earth' | 'moon'
  | 'northNode' | 'southNode'
  | 'mercury' | 'venus' | 'mars'
  | 'jupiter' | 'saturn' | 'uranus'
  | 'neptune' | 'pluto';

export const ALL_BODY_NAMES: readonly BodyName[] = [
  'sun', 'earth', 'moon',
  'northNode', 'southNode',
  'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus',
  'neptune', 'pluto',
] as const;

/**
 * Convenience accessor: get a body's activation by BodyName.
 */
export type BodyActivationMap = {
  [K in BodyName]: BodyActivation;
};

// ─────────────────────────────────────────────────────────────────
// INTERVALS (the transition timeline)
// ─────────────────────────────────────────────────────────────────

/**
 * One transition event — when a layer rolls over for a given body.
 * Used to render the "previous 3 days + today" timeline view.
 */
export interface TransitInterval {
  body: BodyName;
  /** Which layer this interval represents. */
  layer: 'gate' | 'line' | 'color' | 'tone' | 'base';
  /** Start of the interval (UTC ISO timestamp). */
  startUtc: string;
  /** End of the interval (UTC ISO timestamp). */
  endUtc: string;
  /** Start of the interval (local ISO date string in user's tz). */
  startLocal: string;
  /** End of the interval (local ISO date string in user's tz). */
  endLocal: string;
  /** Gate number active during this interval. */
  gate: GateNumber;
  /** Line number active during this interval (1–6), or null for gate-level. */
  line: 1 | 2 | 3 | 4 | 5 | 6 | null;
  /** Color number active (1–6), or null if not at color level. */
  color: ColorNumber | null;
  /** Tone number active (1–6), or null if not at tone level. */
  tone: ToneNumber | null;
  /** Base number active (1–6), or null if not at base level. */
  base: BaseNumber | null;
}

// ─────────────────────────────────────────────────────────────────
// UI / DISPLAY HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * One row in the "previous 3 days + today" view.
 */
export interface TransitDayRow {
  /** ISO date string (YYYY-MM-DD) in user's timezone. */
  localDate: string;
  /** State computed at noon local time (representative of the day). */
  state: TransitState;
  /** Color/tone/base transitions during the user's daylight hours. */
  transitions: TransitInterval[];
}

// ─────────────────────────────────────────────────────────────────
// REFERENCE DATA SUMMARY (derived, used by composer + UI)
// ─────────────────────────────────────────────────────────────────

export interface TransitSnapshot {
  /** Local date string. */
  date: string;
  /** Timezone. */
  timezone: string;

  /** All 13 transiting activations (sun, earth, moon, nodes, planets). */
  activations: BodyActivationMap;

  /** The two transit-active arrows. */
  arrows: TransitArrowState;
}

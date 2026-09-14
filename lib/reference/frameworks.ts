// lib/reference/frameworks.ts
//
// Source of truth: the Color/Tone/Base reference table
// (screenshot uploaded to project, document att:09cf9335-605b-495f-84c5-31ee994aacf8).
//
// This file holds the three outer "layers" of the Human Design
// transit wheel: COLOR (the fixation/mode layer, ~3h45m per step),
// TONE (the cognitive/manifesting layer, ~37m per step), and BASE
// (the perspective layer, ~6m per step). All three come from one
// table, so they live in one file.
//
// Arrows are NOT in this file — they derive from TONE and live in
// lib/reference/arrows.ts (built later, after the ephemeris).

// ─────────────────────────────────────────────────────────────────
// COLORS (6) — the fixation layer
// Each color is a fixation paired with a fixed mode (two poles)
// and rooted in a body center (Splenic / Ajna / Solar / Plexus).
// Duration per color step: ~3h45m for Sun/Earth, ~3 days for Node.
// ─────────────────────────────────────────────────────────────────

export type ColorNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface Color {
  number: ColorNumber;
  fixation: string;          // the underlying fixation
  modeA: string;             // first pole
  modeB: string;             // second pole
  center: string;            // body center the color is rooted in (or "—")
}

export const COLORS: readonly Color[] = [
  { number: 1, fixation: 'FEAR',       modeA: 'Communalist', modeB: 'Separatist',  center: 'Splenic' },
  { number: 2, fixation: 'HOPE',       modeA: 'Theist',      modeB: 'Anti-theist', center: '—'       },
  { number: 3, fixation: 'DESIRE',     modeA: 'Leader',      modeB: 'Follower',    center: 'Ajna'    },
  { number: 4, fixation: 'NEED',       modeA: 'Master',      modeB: 'Novice',      center: '—'       },
  { number: 5, fixation: 'GUILT',      modeA: 'Conditioner', modeB: 'Conditioned', center: 'Solar'   },
  { number: 6, fixation: 'INNOCENCE',  modeA: 'Observer',    modeB: 'Observed',    center: 'Plexus'  },
] as const;

// ─────────────────────────────────────────────────────────────────
// TONES (6) — the cognitive/manifesting layer
// Each tone is a stage of the outer manifesting authority,
// paired with a Department (the sense it lives in) and a Binary
// (the body center it operates through). The vertical "SOUND"
// label on the source table is the axis name for the whole layer.
// Duration per tone step: ~37m30s for Sun/Earth, ~12h for Node.
// ─────────────────────────────────────────────────────────────────

export type ToneNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface Tone {
  number: ToneNumber;
  theme: string;             // the question/quality of the stage
  department: string;        // the sense it's anchored in
  binary: string;            // the center it operates through (or "—")
}

export const TONES: readonly Tone[] = [
  { number: 1, theme: 'SECURITY',     department: 'Smell',        binary: 'Splenic' },
  { number: 2, theme: 'UNCERTAINTY',  department: 'Taste',        binary: 'Splenic' },
  { number: 3, theme: 'ACTION',       department: 'Outer Vision', binary: 'Ajna'    },
  { number: 4, theme: 'MEDITATION',   department: 'Inner Vision', binary: 'Ajna'    },
  { number: 5, theme: 'JUDGEMENT',    department: 'Feeling',      binary: 'Solar'   },
  { number: 6, theme: 'ACCEPTANCE',   department: 'Touch',        binary: 'Plexus'  },
] as const;

// Note on TONE 6: the screenshot showed "ACCEPTENCE" (likely a typo
// of "ACCEPTANCE") — corrected here to the canonical spelling used
// across Ra Uru Hu's published materials.

// ─────────────────────────────────────────────────────────────────
// BASES (5) — the perspective layer
// The 5 prime questions (Where? What? When? Why? Who?).
// Each base has a polarity, mode, sense, location ("I ___" phrase),
// and motion. Duration per base step: ~6m15s for Sun/Earth, ~2h Node.
// ─────────────────────────────────────────────────────────────────

export type BaseNumber = 1 | 2 | 3 | 4 | 5;

export interface Base {
  number: BaseNumber;
  principle: string;         // the name of the base (e.g. INDIVIDUALITY)
  polarity: string;          // Yang/Yang, Yang/Yin, Yin/Yin, Yin/Yang
  mode: string;              // Reactive, Integrative, Objective, Progressive, Subjective
  question: string;          // the prime question it answers
  sense: string;             // the sense it operates through
  location: string;          // "Uniqueness: \"I Define\"", etc.
  motion: string;            // the underlying movement/principle
}

export const BASES: readonly Base[] = [
  {
    number: 1,
    principle: 'INDIVIDUALITY',
    polarity: 'Yang/Yang',
    mode: 'Reactive',
    question: 'Where?',
    sense: 'Seeing',
    location: 'Uniqueness: "I Define"',
    motion: 'MOVEMENT',
  },
  {
    number: 2,
    principle: 'MIND',
    polarity: 'Yang/Yin',
    mode: 'Integrative',
    question: 'What?',
    sense: 'Taste',
    location: 'Role: "I Remember"',
    motion: 'EVOLUTION',
  },
  {
    number: 3,
    principle: 'BODY',
    polarity: 'Yin/Yin',
    mode: 'Objective',
    question: 'When?',
    sense: 'Touching',
    location: 'Genesis: "I Am"',
    motion: 'BEING',
  },
  {
    number: 4,
    principle: 'EGO',
    polarity: 'Yin/Yang',
    mode: 'Progressive',
    question: 'Why?',
    sense: 'Smell',
    location: 'Self: "I Design"',
    motion: 'DESIGN',
  },
  {
    number: 5,
    principle: 'PERSONALITY/SPACE',
    polarity: '—',
    mode: 'Subjective',
    question: 'Who?',
    sense: 'Hearing',
    location: 'Presence: "I Think"',
    motion: 'COMMUNICATION',
  },
] as const;

// ─────────────────────────────────────────────────────────────────
// Lookup helpers — typed, no runtime cost.
// ─────────────────────────────────────────────────────────────────

export function getColor(n: ColorNumber): Color {
  const c = COLORS.find(x => x.number === n);
  if (!c) throw new Error(`Invalid color number: ${n}`);
  return c;
}

export function getTone(n: ToneNumber): Tone {
  const t = TONES.find(x => x.number === n);
  if (!t) throw new Error(`Invalid tone number: ${n}`);
  return t;
}

export function getBase(n: BaseNumber): Base {
  const b = BASES.find(x => x.number === n);
  if (!b) throw new Error(`Invalid base number: ${n}`);
  return b;
}

// ─────────────────────────────────────────────────────────────────
// Duration reference (informational — actual compute lives in
// lib/ephemeris.ts). Times below are for Sun/Earth at the wheel:
// one full wheel = 365.25 days.
//   Color:  5.625° × 1/36  ≈ 0.15625° ≈ 3h 45m
//   Tone:   5.625° × 1/216 ≈ 0.02604° ≈ 37m 30s
//   Base:   5.625° × 1/1296 ≈ 0.00434° ≈ 6m 15s
// For N/S Node (one full wheel = 18.76 years), each step is
// 19.02× slower:
//   Color:  ~2.97 days
//   Tone:   ~11.9 hours
//   Base:   ~1.98 hours
// ─────────────────────────────────────────────────────────────────

export const FRAMEWORK_STEP_DURATIONS = {
  sunEarth: {
    color: '~3h 45m',
    tone:  '~37m 30s',
    base:  '~6m 15s',
  },
  node: {
    color: '~2.97 days',
    tone:  '~11.9 hours',
    base:  '~1.98 hours',
  },
} as const;

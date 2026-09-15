/**
 * lib/bodyActivation.ts
 *
 * Rave Mandala decoder + high-precision ephemeris for Sun / Earth / Nodes.
 *
 * PRECISION NOTES
 * ---------------
 * Gate boundaries are NOT measurements -- they are exact arithmetic:
 *
 *   360 / 64        = 5.625      deg per gate
 *   5.625 / 6       = 0.9375     deg per line
 *   0.9375 / 6      = 0.15625    deg per color
 *   0.15625 / 6     = 0.02604166 deg per tone
 *   0.02604166 / 5  = 0.00520833 deg per base
 *
 *   => 6 * 6 * 6 * 5 = 1080 distinguishable points per gate.
 *
 * The only error in this module is ephemeris error. astronomy-engine
 * (truncated VSOP87 + JPL DE405/406 fits) yields sub-arcsecond Sun
 * longitudes across ~1700-2200. The Sun moves ~2.46"/min, so 1" of
 * longitude error == ~24 s of clock error -- comfortably inside one base
 * (0.0052 deg ~= 7.6 min). The previous J2000 + equation-of-center version
 * was ~0.01 deg (~15 min), which could not resolve a base at all.
 *
 * SunPosition().elon is APPARENT geocentric longitude referred to the TRUE
 * ecliptic of date, so aberration (~20.5") and nutation (~+/-17") are
 * already folded in. Each of those is larger than a full color.
 *
 * REMAINING DEFINITIONAL RISK: mean node vs true node differ by up to ~1.7 deg
 * (~30% of a gate). That now dominates any residual ephemeris error.
 * Set NODE_MODE below once you confirm which one humdes.com publishes.
 *
 * Requires: astronomy-engine ^2.1.19
 */

import * as Astronomy from "astronomy-engine";

// ---------------------------------------------------------------------------
// Rave Mandala constants
// ---------------------------------------------------------------------------

/** Gate 25, line 1, color 1, tone 1, base 1 begins here: 28d15' Pisces. */
export const WHEEL_ORIGIN = 358.25;

export const GATE_SPAN = 5.625; // 360 / 64
export const LINE_SPAN = GATE_SPAN / 6; // 0.9375
export const COLOR_SPAN = LINE_SPAN / 6; // 0.15625
export const TONE_SPAN = COLOR_SPAN / 6; // 0.026041666...
export const BASE_SPAN = TONE_SPAN / 5; // 0.005208333...

export type Depth = "line" | "color" | "tone" | "base";

const SPAN: Record<Depth, number> = {
  line: LINE_SPAN,
  color: COLOR_SPAN,
  tone: TONE_SPAN,
  base: BASE_SPAN,
};

/**
 * Wheel order: 64 hexagrams counter-clockwise from WHEEL_ORIGIN.
 *
 * Validated against two published anchors:
 *   Gate 47 = 17d00'00" .. 22d37'30" Virgo  -> 167.000 .. 172.625
 *   Gate 6  = 22d37'30" .. 28d15'00" Virgo  -> 172.625 .. 178.250
 * Both reproduce exactly. Gates 18..64 are NOT anchor-pinned -- call
 * assertWheelAnchors() in your test suite and diff against the previous array.
 */
export const RAVE_WHEEL: readonly number[] = [
  25, 17, 21, 51, 42, 3, 27, 24,
  2, 23, 8, 20, 16, 35, 45, 12,
  15, 52, 39, 53, 62, 56, 31, 33,
  7, 4, 29, 59, 40, 64, 47, 6,
  18, 46, 26, 22, 36, 30, 55, 37,
  63, 60, 57, 44, 1, 43, 14, 34,
  9, 5, 28, 38, 58, 48, 50, 32,
  54, 61, 41, 19, 13, 49, 10, 11,
];

export type BodyName = "sun" | "earth" | "northNode" | "southNode";

/** Bodies that run prograde (eastward). Nodes run retrograde. */
const PROGRADE: ReadonlySet<BodyName> = new Set<BodyName>(["sun", "earth"]);

// ---------------------------------------------------------------------------
// Small math helpers
// ---------------------------------------------------------------------------

/** Wrap any angle into [0, 360). */
export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Decimal degrees -> "Dd MM' SS.SS\"" */
export function toDMS(deg: number): string {
  const d = norm360(deg);
  const dd = Math.floor(d);
  const mRaw = (d - dd) * 60;
  const mm = Math.floor(mRaw + 1e-9);
  const ss = (mRaw - mm) * 60;
  return `${dd}d ${String(mm).padStart(2, "0")}' ${ss.toFixed(2).padStart(5, "0")}"`;
}

// ---------------------------------------------------------------------------
// Ephemeris
// ---------------------------------------------------------------------------

export const NODE_MODE: "mean" | "true" = "mean";

/**
 * Mean lunar node (ascending). Uses Terrestrial Time, so Delta-T is handled
 * correctly (TT - UTC ~= 69.5 s and growing ~0.7 s/yr).
 */
function meanNodeLongitude(date: Date): number {
  const T = Astronomy.MakeTime(date).tt / 36525;
  const omega =
    125.04452 -
    1934.136261 * T +
    0.0020708 * T * T +
    (T * T * T) / 450000;
  return norm360(omega);
}

/** Apparent geocentric Sun longitude, true ecliptic of date, degrees. */
export function sunLongitude(date: Date): number {
  return norm360(Astronomy.SunPosition(date).elon);
}

/**
 * HD "Earth" is the geocentric anti-Sun: Sun longitude + 180.
 * (Identical to the heliocentric Earth longitude.)
 */
export function earthLongitude(date: Date): number {
  return norm360(sunLongitude(date) + 180);
}

export function nodeLongitude(date: Date, north = true): number {
  if (NODE_MODE === "true") {
    throw new Error(
      "NODE_MODE='true' is not implemented. astronomy-engine exposes node " +
        "crossing TIMES (SearchMoonNode), not instantaneous true-node " +
        "longitude -- you need an osculating lunar orbit for that. Confirm " +
        "which node humdes.com publishes before doing this work."
    );
  }
  return norm360(meanNodeLongitude(date) + (north ? 0 : 180));
}

export function longitudeOf(body: BodyName, date: Date): number {
  switch (body) {
    case "sun":
      return sunLongitude(date);
    case "earth":
      return earthLongitude(date);
    case "northNode":
      return nodeLongitude(date, true);
    case "southNode":
      return nodeLongitude(date, false);
  }
}

// ---------------------------------------------------------------------------
// Decode: longitude -> gate / line / color / tone / base
// ---------------------------------------------------------------------------

export interface Activation {
  body: BodyName;
  longitude: number;
  gate: number;
  line: number;
  color: number;
  tone: number;
  base: number;
  /** Canonical HD key, e.g. "6.1.3.4.2" */
  key: string;
  /** Degrees since this gate began. */
  intoGate: number;
  /** Degrees since the current BASE began -- the finest grain. */
  intoBase: number;
  /** Absolute longitude of the current gate's start. */
  gateStartLongitude: number;
  /** Wheel index of the gate (0 = Gate 25). */
  wheelIndex: number;
}

/** Absolute longitude at which `gate` begins. */
export function gateStart(gate: number): number {
  const i = RAVE_WHEEL.indexOf(gate);
  if (i < 0) throw new Error(`Gate ${gate} is not present in RAVE_WHEEL`);
  return norm360(WHEEL_ORIGIN + i * GATE_SPAN);
}

/**
 * Decode a raw ecliptic longitude into the full 5-layer HD key.
 *
 * `wheelIndex` is computed with a 0.5-line epsilon rather than a bare floor.
 * Floating-point multiples of 0.0052083... are not exact, so a position that
 * is mathematically ON a boundary can land a few ULP either side and flip
 * gate/line/color/tone/base wholesale. The epsilon makes on-boundary inputs
 * resolve deterministically upward.
 */
export function decodeLongitude(longitude: number): Activation {
  const rel = norm360(longitude - WHEEL_ORIGIN);
  const eps = 5e-7;

  let wheelIndex = Math.floor(rel / GATE_SPAN + eps);
  if (wheelIndex > 63) wheelIndex = 0;

  let line = Math.floor((rel % GATE_SPAN) / LINE_SPAN + eps);
  if (line > 5) line = 0;

  let color = Math.floor((rel % LINE_SPAN) / COLOR_SPAN + eps);
  if (color > 5) color = 0;

  let tone = Math.floor((rel % COLOR_SPAN) / TONE_SPAN + eps);
  if (tone > 5) tone = 0;

  let base = Math.floor((rel % TONE_SPAN) / BASE_SPAN + eps);
  if (base > 4) base = 0;

  const gate = RAVE_WHEEL[wheelIndex];
  const intoBase = wheelIndex * GATE_SPAN + line * LINE_SPAN +
    color * COLOR_SPAN + tone * TONE_SPAN + base * BASE_SPAN;

  return {
    body: "sun", // caller overwrites
    longitude: norm360(longitude),
    gate,
    line: line + 1,
    color: color + 1,
    tone: tone + 1,
    base: base + 1,
    key: `${gate}.${line + 1}.${color + 1}.${tone + 1}.${base + 1}`,
    intoGate: rel - wheelIndex * GATE_SPAN,
    intoBase: rel - intoBase,
    gateStartLongitude: norm360(WHEEL_ORIGIN + wheelIndex * GATE_SPAN),
    wheelIndex,
  };
}

export function activate(body: BodyName, date: Date): Activation {
  return { ...decodeLongitude(longitudeOf(body, date)), body };
}

export interface ActivationSet {
  at: Date;
  sun: Activation;
  earth: Activation;
  northNode: Activation;
  southNode: Activation;
}

export function activationsFor(date: Date): ActivationSet {
  return {
    at: date,
    sun: activate("sun", date),
    earth: activate("earth", date),
    northNode: activate("northNode", date),
    southNode: activate("southNode", date),
  };
}

// ---------------------------------------------------------------------------
// Exact boundary crossings
//
// Use these in verify/cli.ts instead of spot-checking timestamps. Asserting
// "the Sun crosses into 6.2 at exactly 2026-09-15T04:11:38Z" is a far sharper
// test than "at 12:00 the Sun was in 6.1".
// ---------------------------------------------------------------------------

export interface BoundaryChange {
  at: Date;
  longitude: number;
  activation: Activation;
}

/** Absolute longitude of the next `depth` boundary at or below `rel`. */
function previousBoundaryRel(rel: number, depth: Depth): number {
  const span = SPAN[depth];
  const k = Math.floor(rel / span + 1e-12);
  return k * span;
}

function nextBoundaryRel(rel: number, depth: Depth): number {
  const span = SPAN[depth];
  const k = Math.floor(rel / span + 1e-12);
  return (k + 1) * span;
}

/**
 * Next instant at which `body` crosses a `depth` boundary.
 *
 * Sun/Earth go through astronomy-engine's root finder (Newton/bisection hybrid,
 * ~1e-12 deg). Nodes use a plain bisection on the analytic mean-node series.
 */
export function nextBoundaryChange(
  body: BodyName,
  from: Date,
  depth: Depth = "line"
): BoundaryChange {
  const startRel = norm360(longitudeOf(body, from) - WHEEL_ORIGIN);
  const prograde = PROGRADE.has(body);
  const targetRel = prograde
    ? nextBoundaryRel(startRel, depth)
    : previousBoundaryRel(startRel, depth);

  const at = prograde
    ? searchPrograde(body, targetRel, from)
    : searchNode(body, targetRel, from);

  return {
    at,
    longitude: norm360(WHEEL_ORIGIN + targetRel),
    activation: { ...decodeLongitude(norm360(WHEEL_ORIGIN + targetRel)), body },
  };
}

/** Sun and Earth share a root finder: Earth lon == Sun lon + 180. */
function searchPrograde(body: BodyName, targetRel: number, from: Date): Date {
  const targetLon = norm360(WHEEL_ORIGIN + targetRel);
  const sunTarget = body === "sun" ? targetLon : norm360(targetLon - 180);

  // One line takes the Sun ~0.95 d; one base takes ~7.6 min. 2 days covers
  // every depth with margin.
  const hit = Astronomy.SearchSunLongitude(sunTarget, from, 2);
  if (!hit) {
    throw new Error(
      `SearchSunLongitude found no crossing of ${sunTarget} within 2 days`
    );
  }
  return hit.date;
}

/**
 * Mean node runs retrograde at ~0.05295 deg/day, so a full line takes ~17.7 d
 * and a base ~2.4 h. Bisect on the analytic series; the function is strictly
 * monotonic over these windows so bisection is exact to the tolerance.
 */
function searchNode(body: BodyName, targetRel: number, from: Date): Date {
  const windowMs = 25 * 24 * 3600 * 1000;
  let lo = from.getTime();
  let hi = lo + windowMs;

  const signed = (t: number): number => {
    const rel = norm360(longitudeOf(body, new Date(t)) - WHEEL_ORIGIN);
    // Unwrap so the residual is continuous and monotonically DECREASING.
    let d = rel - targetRel;
    if (d < -180) d += 360;
    if (d > 180) d -= 360;
    return d;
  };

  let dLo = signed(lo);
  if (dLo <= 0) {
    // Already at/past the boundary (within epsilon): report `from` itself.
    return new Date(lo);
  }
  if (signed(hi) > 0) {
    throw new Error(
      `Mean node did not reach rel ${targetRel} within 25 days -- window too small`
    );
  }

  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    const dMid = signed(mid);
    if (dMid > 0) {
      lo = mid;
      dLo = dMid;
    } else {
      hi = mid;
    }
    if (hi - lo < 1) break; // sub-millisecond
  }

  void dLo;
  return new Date((lo + hi) / 2);
}

// ---------------------------------------------------------------------------
// Self-check
// ---------------------------------------------------------------------------

/**
 * Throws unless the wheel reproduces the two published Virgo anchors.
 * Call this from verify/cli.ts (or a unit test) on every run.
 */
export function assertWheelAnchors(): void {
  const tol = 1e-9;

  const g6 = gateStart(6);
  if (Math.abs(g6 - 172.625) > tol) {
    throw new Error(
      `RAVE_WHEEL failed: Gate 6 starts at ${g6}, expected 172.625 ` +
        `(22d37'30" Virgo). The wheel array has drifted.`
    );
  }

  const g47 = gateStart(47);
  if (Math.abs(g47 - 167) > tol) {
    throw new Error(
      `RAVE_WHEEL failed: Gate 47 starts at ${g47}, expected 167.000 ` +
        `(17d00'00" Virgo).`
    );
  }

  const seen = new Set<number>(RAVE_WHEEL);
  if (seen.size !== 64) {
    throw new Error(`RAVE_WHEEL has ${seen.size} unique gates, expected 64`);
  }
}

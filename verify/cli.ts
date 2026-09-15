// verify/cli.ts
//
// Calibration CLI for lib/ephemeris.ts. Runs `npm run verify` from
// the project root. Computes transit states for a curated set of
// known anchor dates and writes a human-readable report to
// verification.log at the project root.
//
// Anchor sources:
//   • Ra Uru Hu, "The Definitive Book of Human Design":
//     4 equinox/solstice gates (Gate 25 = 0° Aries, Gate 15 = 0°
//     Cancer, Gate 46 = 0° Libra, Gate 10 = 0° Capricorn).
//   • Ra Uru Hu, "The Complete Rave I'Ching":
//     Exact arc boundaries for each gate (e.g. Gate 64: 11°22'30"
//     → 17°00'00" Virgo).
//   • Karen Curry Parker, "2022 Quantum Human Design Evolution
//     Guide": 50+ daily gate transitions through 2022, plus 4
//     eclipse dates with exact zodiac degrees.
//
// Usage:
//   npx tsx verify/cli.ts            # writes verification.log
//   npx tsx verify/cli.ts --print    # also prints to stdout

import * as fs from 'fs';
import * as path from 'path';
import { bodyActivation, signAt } from '../lib/bodyActivation';
import { computeTransitState, formatTransitState } from '../lib/transitTimeline';
import type { TransitState } from '../lib/types';

// ─────────────────────────────────────────────────────────────────
// ANCHOR DATASET
// ─────────────────────────────────────────────────────────────────

export interface Anchor {
  /** Human-readable label. */
  label: string;
  /** ISO date (YYYY-MM-DD) in the comparison timezone. */
  date: string;
  /** IANA timezone for the comparison. */
  timezone: string;
  /** Expected gate the transiting Sun occupies on this date. */
  expectedSunGate: number;
  /** Optional: expected sign (e.g. for equinox/solstice anchors). */
  expectedSunSign?: string;
  /** Optional: expected exact longitude (for eclipse anchors). */
  expectedSunLongitude?: number;
  /** Optional: note describing the source of this anchor. */
  source?: string;
}

/**
 * Curated anchor dataset. Times are local-noon unless otherwise
 * noted (eclipse times given exact).
 *
 * All times are in the SAME timezone (America/New_York) for
 * consistent comparison with Karen Curry Parker's published dates.
 */
export const ANCHORS: Anchor[] = [
  // ── Equinox / Solstice anchors (Ra, Definitive Book) ─────────
  // Spring equinox: Sun at 0° Aries = Gate 25
  { label: 'Spring Equinox 2022', date: '2022-03-20', timezone: 'America/New_York',
    expectedSunGate: 25, expectedSunSign: 'Aries', source: 'Ra Definitive Book' },
  // Summer solstice: Sun at 0° Cancer = Gate 15
  { label: 'Summer Solstice 2022', date: '2022-06-21', timezone: 'America/New_York',
    expectedSunGate: 15, expectedSunSign: 'Cancer', source: 'Ra Definitive Book' },
  // Autumn equinox: Sun at 0° Libra = Gate 46
  { label: 'Autumn Equinox 2022', date: '2022-09-22', timezone: 'America/New_York',
    expectedSunGate: 46, expectedSunSign: 'Libra', source: 'Ra Definitive Book' },
  // Winter solstice: Sun at 0° Capricorn = Gate 10
  { label: 'Winter Solstice 2022', date: '2022-12-21', timezone: 'America/New_York',
    expectedSunGate: 10, expectedSunSign: 'Capricorn', source: 'Ra Definitive Book' },

  // ── Eclipse anchors (Karen Curry Parker) ─────────────────────
  // Apr 30, 2022 — Partial Solar Eclipse at Taurus 10°35' = Gate 24
  //  Sun is at Taurus 10°35' → Gate 24 (Blessings), sign: Taurus
  { label: 'April 2022 Solar Eclipse', date: '2022-04-30', timezone: 'America/New_York',
    expectedSunGate: 24, expectedSunSign: 'Taurus',
    expectedSunLongitude: 40.5833, // 10° + 30° (Aries offset) = 40.5833°
    source: 'Karen Curry Parker, 2022 Eclipse data' },
  // May 16, 2022 — Lunar Eclipse at Scorpio 25°17' = Gate 14
  //  Sun is 180° opposite Moon, so Sun at Taurus 25°17' ≈ Gate 14
  //  (25.28° into Taurus is in Gate 14 per our wheel: 19.375→25°)
  { label: 'May 2022 Lunar Eclipse (Sun side)', date: '2022-05-16', timezone: 'America/New_York',
    expectedSunGate: 14, expectedSunSign: 'Taurus',
    expectedSunLongitude: 55.2833, // 25°17' + 30°
    source: 'Karen Curry Parker, 2022 Eclipse data' },
  // Oct 25, 2022 — Solar Eclipse at Scorpio 2°07' (Moon), Sun opposite
  //  Sun at Taurus 2°07' = Gate 3 (0°-2.5° Taurus portion)
  { label: 'October 2022 Solar Eclipse (Sun side)', date: '2022-10-25', timezone: 'America/New_York',
    expectedSunGate: 3, expectedSunSign: 'Taurus',
    expectedSunLongitude: 32.1167, // 2°07' + 30°
    source: 'Karen Curry Parker, 2022 Eclipse data' },
  // Nov 8, 2022 — Lunar Eclipse at Taurus 16°00' (Moon), Sun opposite
  //  Sun at Scorpio 16°00' = Gate 44 (12.5°→18.125° Scorpio portion)
  { label: 'November 2022 Lunar Eclipse (Sun side)', date: '2022-11-08', timezone: 'America/New_York',
    expectedSunGate: 44, expectedSunSign: 'Scorpio',
    expectedSunLongitude: 196.0, // 16° Scorpio = 180° + 16° = 196°
    source: 'Karen Curry Parker, 2022 Eclipse data' },
  // NOTE: Nov 8 Sun should be at Scorpio 16° = ecliptic longitude 196°.

  // ── Daily gate transitions (Karen Curry Parker, 2022) ─────────
  // Each anchor: "On [date], the Sun enters Gate X"
  // We sample at local noon to catch the gate that day.
  { label: 'Jan 22, 2022 - Gate 41', date: '2022-01-22', timezone: 'America/New_York',
    expectedSunGate: 41, source: 'Karen Curry Parker' },
  { label: 'Jan 28, 2022 - Gate 19', date: '2022-01-28', timezone: 'America/New_York',
    expectedSunGate: 19, source: 'Karen Curry Parker' },
  { label: 'Feb 2, 2022 - Gate 13',  date: '2022-02-02', timezone: 'America/New_York',
    expectedSunGate: 13, source: 'Karen Curry Parker' },
  { label: 'Feb 8, 2022 - Gate 49',  date: '2022-02-08', timezone: 'America/New_York',
    expectedSunGate: 49, source: 'Karen Curry Parker' },
  { label: 'Feb 13, 2022 - Gate 30', date: '2022-02-13', timezone: 'America/New_York',
    expectedSunGate: 30, source: 'Karen Curry Parker' },
  { label: 'Feb 19, 2022 - Gate 55', date: '2022-02-19', timezone: 'America/New_York',
    expectedSunGate: 55, source: 'Karen Curry Parker' },
  { label: 'Feb 24, 2022 - Gate 37', date: '2022-02-24', timezone: 'America/New_York',
    expectedSunGate: 37, source: 'Karen Curry Parker' },
  { label: 'Mar 2, 2022 - Gate 63',  date: '2022-03-02', timezone: 'America/New_York',
    expectedSunGate: 63, source: 'Karen Curry Parker' },
  { label: 'Mar 8, 2022 - Gate 22',  date: '2022-03-08', timezone: 'America/New_York',
    expectedSunGate: 22, source: 'Karen Curry Parker' },
  { label: 'Mar 13, 2022 - Gate 36', date: '2022-03-13', timezone: 'America/New_York',
    expectedSunGate: 36, source: 'Karen Curry Parker' },
  { label: 'Mar 19, 2022 - Gate 25', date: '2022-03-19', timezone: 'America/New_York',
    expectedSunGate: 25, source: 'Karen Curry Parker' },
  { label: 'Mar 25, 2022 - Gate 17', date: '2022-03-25', timezone: 'America/New_York',
    expectedSunGate: 17, source: 'Karen Curry Parker' },
  { label: 'Mar 30, 2022 - Gate 21', date: '2022-03-30', timezone: 'America/New_York',
    expectedSunGate: 21, source: 'Karen Curry Parker' },
  { label: 'Apr 5, 2022 - Gate 51',  date: '2022-04-05', timezone: 'America/New_York',
    expectedSunGate: 51, source: 'Karen Curry Parker' },
  { label: 'Apr 11, 2022 - Gate 42', date: '2022-04-11', timezone: 'America/New_York',
    expectedSunGate: 42, source: 'Karen Curry Parker' },
  { label: 'Apr 16, 2022 - Gate 3',  date: '2022-04-16', timezone: 'America/New_York',
    expectedSunGate: 3,  source: 'Karen Curry Parker' },
  { label: 'Apr 22, 2022 - Gate 27', date: '2022-04-22', timezone: 'America/New_York',
    expectedSunGate: 27, source: 'Karen Curry Parker' },
  { label: 'Apr 28, 2022 - Gate 24', date: '2022-04-28', timezone: 'America/New_York',
    expectedSunGate: 24, source: 'Karen Curry Parker' },
  { label: 'May 4, 2022 - Gate 2',   date: '2022-05-04', timezone: 'America/New_York',
    expectedSunGate: 2,  source: 'Karen Curry Parker' },
  { label: 'May 10, 2022 - Gate 23', date: '2022-05-10', timezone: 'America/New_York',
    expectedSunGate: 23, source: 'Karen Curry Parker' },
  { label: 'May 15, 2022 - Gate 8',  date: '2022-05-15', timezone: 'America/New_York',
    expectedSunGate: 8,  source: 'Karen Curry Parker' },
  { label: 'May 21, 2022 - Gate 20', date: '2022-05-21', timezone: 'America/New_York',
    expectedSunGate: 20, source: 'Karen Curry Parker' },
  { label: 'May 27, 2022 - Gate 16', date: '2022-05-27', timezone: 'America/New_York',
    expectedSunGate: 16, source: 'Karen Curry Parker' },
  { label: 'Jun 2, 2022 - Gate 35',  date: '2022-06-02', timezone: 'America/New_York',
    expectedSunGate: 35, source: 'Karen Curry Parker' },
  { label: 'Jun 8, 2022 - Gate 45',  date: '2022-06-08', timezone: 'America/New_York',
    expectedSunGate: 45, source: 'Karen Curry Parker' },
  { label: 'Jun 14, 2022 - Gate 12', date: '2022-06-14', timezone: 'America/New_York',
    expectedSunGate: 12, source: 'Karen Curry Parker' },
  { label: 'Jun 20, 2022 - Gate 15', date: '2022-06-20', timezone: 'America/New_York',
    expectedSunGate: 15, source: 'Karen Curry Parker' },
  { label: 'Jun 25, 2022 - Gate 52', date: '2022-06-25', timezone: 'America/New_York',
    expectedSunGate: 52, source: 'Karen Curry Parker' },
  { label: 'Jul 1, 2022 - Gate 39',  date: '2022-07-01', timezone: 'America/New_York',
    expectedSunGate: 39, source: 'Karen Curry Parker' },
  { label: 'Jul 7, 2022 - Gate 53',  date: '2022-07-07', timezone: 'America/New_York',
    expectedSunGate: 53, source: 'Karen Curry Parker' },
  { label: 'Jul 13, 2022 - Gate 62', date: '2022-07-13', timezone: 'America/New_York',
    expectedSunGate: 62, source: 'Karen Curry Parker' },
  { label: 'Jul 19, 2022 - Gate 56', date: '2022-07-19', timezone: 'America/New_York',
    expectedSunGate: 56, source: 'Karen Curry Parker' },
  { label: 'Jul 25, 2022 - Gate 31', date: '2022-07-25', timezone: 'America/New_York',
    expectedSunGate: 31, source: 'Karen Curry Parker' },
  { label: 'Jul 31, 2022 - Gate 33', date: '2022-07-31', timezone: 'America/New_York',
    expectedSunGate: 33, source: 'Karen Curry Parker' },
  { label: 'Aug 6, 2022 - Gate 7',   date: '2022-08-06', timezone: 'America/New_York',
    expectedSunGate: 7,  source: 'Karen Curry Parker' },
  { label: 'Aug 12, 2022 - Gate 4',  date: '2022-08-12', timezone: 'America/New_York',
    expectedSunGate: 4,  source: 'Karen Curry Parker' },
  { label: 'Aug 17, 2022 - Gate 29', date: '2022-08-17', timezone: 'America/New_York',
    expectedSunGate: 29, source: 'Karen Curry Parker' },
  { label: 'Aug 23, 2022 - Gate 59', date: '2022-08-23', timezone: 'America/New_York',
    expectedSunGate: 59, source: 'Karen Curry Parker' },
  { label: 'Aug 29, 2022 - Gate 40', date: '2022-08-29', timezone: 'America/New_York',
    expectedSunGate: 40, source: 'Karen Curry Parker' },
  { label: 'Sep 4, 2022 - Gate 64',  date: '2022-09-04', timezone: 'America/New_York',
    expectedSunGate: 64, source: 'Karen Curry Parker' },
  { label: 'Sep 10, 2022 - Gate 47', date: '2022-09-10', timezone: 'America/New_York',
    expectedSunGate: 47, source: 'Karen Curry Parker' },
  { label: 'Sep 15, 2022 - Gate 6',  date: '2022-09-15', timezone: 'America/New_York',
    expectedSunGate: 6,  source: 'Karen Curry Parker' },
  { label: 'Sep 21, 2022 - Gate 46', date: '2022-09-21', timezone: 'America/New_York',
    expectedSunGate: 46, source: 'Karen Curry Parker' },
  { label: 'Sep 27, 2022 - Gate 18', date: '2022-09-27', timezone: 'America/New_York',
    expectedSunGate: 18, source: 'Karen Curry Parker' },
  { label: 'Oct 3, 2022 - Gate 48',  date: '2022-10-03', timezone: 'America/New_York',
    expectedSunGate: 48, source: 'Karen Curry Parker' },
  { label: 'Oct 8, 2022 - Gate 57',  date: '2022-10-08', timezone: 'America/New_York',
    expectedSunGate: 57, source: 'Karen Curry Parker' },
  { label: 'Oct 14, 2022 - Gate 32', date: '2022-10-14', timezone: 'America/New_York',
    expectedSunGate: 32, source: 'Karen Curry Parker' },
  { label: 'Oct 20, 2022 - Gate 50', date: '2022-10-20', timezone: 'America/New_York',
    expectedSunGate: 50, source: 'Karen Curry Parker' },
  { label: 'Oct 25, 2022 - Gate 28', date: '2022-10-25', timezone: 'America/New_York',
    expectedSunGate: 28, source: 'Karen Curry Parker' },
  { label: 'Oct 31, 2022 - Gate 44', date: '2022-10-31', timezone: 'America/New_York',
    expectedSunGate: 44, source: 'Karen Curry Parker' },
  { label: 'Nov 6, 2022 - Gate 1',   date: '2022-11-06', timezone: 'America/New_York',
    expectedSunGate: 1,  source: 'Karen Curry Parker' },
  { label: 'Nov 11, 2022 - Gate 43', date: '2022-11-11', timezone: 'America/New_York',
    expectedSunGate: 43, source: 'Karen Curry Parker' },
  { label: 'Nov 17, 2022 - Gate 14', date: '2022-11-17', timezone: 'America/New_York',
    expectedSunGate: 14, source: 'Karen Curry Parker' },
  { label: 'Nov 22, 2022 - Gate 34', date: '2022-11-22', timezone: 'America/New_York',
    expectedSunGate: 34, source: 'Karen Curry Parker' },
  { label: 'Nov 28, 2022 - Gate 9',  date: '2022-11-28', timezone: 'America/New_York',
    expectedSunGate: 9,  source: 'Karen Curry Parker' },
  { label: 'Dec 4, 2022 - Gate 5',   date: '2022-12-04', timezone: 'America/New_York',
    expectedSunGate: 5,  source: 'Karen Curry Parker' },
  { label: 'Dec 9, 2022 - Gate 26',  date: '2022-12-09', timezone: 'America/New_York',
    expectedSunGate: 26, source: 'Karen Curry Parker' },
  { label: 'Dec 15, 2022 - Gate 11', date: '2022-12-15', timezone: 'America/New_York',
    expectedSunGate: 11, source: 'Karen Curry Parker' },
  { label: 'Dec 20, 2022 - Gate 10', date: '2022-12-20', timezone: 'America/New_York',
    expectedSunGate: 10, source: 'Karen Curry Parker' },
  { label: 'Dec 26, 2022 - Gate 58', date: '2022-12-26', timezone: 'America/New_York',
    expectedSunGate: 58, source: 'Karen Curry Parker' },
  { label: 'Dec 31, 2022 - Gate 38', date: '2022-12-31', timezone: 'America/New_York',
    expectedSunGate: 38, source: 'Karen Curry Parker' },
];

// ─────────────────────────────────────────────────────────────────
// VERIFY LOGIC
// ─────────────────────────────────────────────────────────────────

export interface VerifyResult {
  anchor: Anchor;
  actualSunGate: number;
  actualSunSign: string;
  actualSunLongitude: number;
  gateMatch: boolean;
  signMatch: boolean | null;  // null if no expected sign
  longitudeDelta: number | null;  // null if no expected longitude
  tolerance: number;  // degrees of acceptable drift
  passed: boolean;
  notes?: string;
}

new: const TOLERANCE_DEG = 0.5; // acceptable drift in longitude

     const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
       'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] as const;

     /** Zodiac sign for an ecliptic longitude in degrees. */
     function signAt(longitude: number): string {
       const norm = ((longitude % 360) + 360) % 360;
       return SIGNS[Math.floor(norm / 30)];
     }
/**
 * Run verification for a single anchor.
 * Returns a VerifyResult that can be logged.
 */
export function verifyAnchor(anchor: Anchor): VerifyResult {
  // Build a UTC timestamp at local noon in the anchor's timezone.
  const [y, m, d] = anchor.date.split('-').map(Number);
  // Local noon = 12:00 in the user's tz. We convert via Intl.
  const noonUtcMs = noonLocalToUtc(anchor.timezone, y, m - 1, d);
  const sunAct = bodyActivation('Sun', noonUtcMs);
  const sign = signAt(sunAct.longitude);

  const gateMatch = sunAct.gate === anchor.expectedSunGate;
  const signMatch = anchor.expectedSunSign
    ? sign === anchor.expectedSunSign
    : null;
  const longitudeDelta = anchor.expectedSunLongitude !== undefined
    ? angleDelta(sunAct.longitude, anchor.expectedSunLongitude)
    : null;

  const passed =
    gateMatch &&
    (signMatch === null || signMatch) &&
    (longitudeDelta === null || Math.abs(longitudeDelta) <= TOLERANCE_DEG);

  return {
    anchor,
    actualSunGate: sunAct.gate,
    actualSunSign: sign,
    actualSunLongitude: sunAct.longitude,
    gateMatch,
    signMatch,
    longitudeDelta,
    tolerance: TOLERANCE_DEG,
    passed,
    notes: !gateMatch
      ? `Expected Gate ${anchor.expectedSunGate}, got Gate ${sunAct.gate}`
      : undefined,
  };
}

/**
 * Compute the shortest angular distance between two longitudes.
 */
function angleDelta(a: number, b: number): number {
  const raw = Math.abs(a - b);
  return Math.min(raw, 360 - raw);
}

/**
 * Convert a local date+time to a UTC millisecond timestamp.
 * Uses Intl.DateTimeFormat to determine the offset for that tz.
 */
function noonLocalToUtc(timezone: string, year: number, month: number, day: number): number {
  // Try a UTC timestamp at noon; then compute the offset to local noon.
  const guessUtc = Date.UTC(year, month, day, 12, 0, 0);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(guessUtc));
  const get = (k: string) => Number(parts.find(p => p.type === k)?.value || 0);
  const localHour = (get('hour') % 24);
  const localMin = get('minute');
  const localSec = get('second');
  // The difference between "what local time it is at guessUtc" and
  // "12:00:00" is the offset from UTC to local at that instant.
  const offsetMin = (12 - localHour) * 60 + (0 - localMin);
  const offsetSec = offsetMin * 60 + (0 - localSec);
  return guessUtc - offsetSec * 1000;
}

// ─────────────────────────────────────────────────────────────────
// REPORT FORMATTING
// ─────────────────────────────────────────────────────────────────

function formatResult(r: VerifyResult): string {
  const a = r.anchor;
  const status = r.passed ? '✓ PASS' : '✗ FAIL';
  const lines = [
    `[${status}] ${a.label}`,
    `  Expected: Gate ${a.expectedSunGate}` +
      (a.expectedSunSign ? ` (${a.expectedSunSign})` : '') +
      (a.expectedSunLongitude !== undefined
        ? ` @ ${a.expectedSunLongitude.toFixed(4)}°`
        : ''),
    `  Actual:   Gate ${r.actualSunGate} (${r.actualSunSign}) ` +
      `@ ${r.actualSunLongitude.toFixed(4)}°`,
  ];
  if (r.signMatch !== null) {
    lines.push(`  Sign:     ${r.signMatch ? '✓' : '✗'} ${r.actualSunSign}`);
  }
  if (r.longitudeDelta !== null) {
    lines.push(
      `  Longitude drift: ${r.longitudeDelta.toFixed(4)}° ` +
        `(tolerance ±${r.tolerance}°) ` +
        (Math.abs(r.longitudeDelta) <= r.tolerance ? '✓' : '✗')
    );
  }
  if (r.notes) lines.push(`  Note:     ${r.notes}`);
  lines.push(`  Source:   ${a.source ?? '(unspecified)'}`);
  return lines.join('\n');
}

function summary(results: VerifyResult[]): string {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const pct = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
  return `── Summary ─────────────────\n` +
         `  Total:    ${total}\n` +
         `  Passed:   ${passed} (${pct}%)\n` +
         `  Failed:   ${failed}\n` +
         `─────────────────────────────`;
}

// ─────────────────────────────────────────────────────────────────
// CLI ENTRY POINT
// ─────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const shouldPrint = args.includes('--print');

  const header = [
    '═══════════════════════════════════════════════════════',
    '  TRANSIT EPHEMERIS — VERIFICATION REPORT',
    `  Generated: ${new Date().toISOString()}`,
    '  Anchor sources:',
    '    • Ra Uru Hu, "The Definitive Book of Human Design"',
    '    • Ra Uru Hu, "The Complete Rave I\'Ching"',
    '    • Karen Curry Parker, "2022 Quantum Human Design Evolution Guide"',
    '═══════════════════════════════════════════════════════',
    '',
  ].join('\n');

  const results = ANCHORS.map(verifyAnchor);

  const report = [
    header,
    ...results.map(formatResult),
    '',
    summary(results),
    '',
  ].join('\n');

  const logPath = path.resolve(process.cwd(), 'verification.log');
  fs.writeFileSync(logPath, report, 'utf8');

  if (shouldPrint) {
    console.log(report);
  } else {
    console.log(`Wrote verification report → ${logPath}`);
    console.log(`Pass ${results.filter(r => r.passed).length}/${results.length}. ` +
                `Re-run with --print to see full report.`);
  }
}

// Run if invoked directly (not when imported).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.endsWith('cli.ts'))) {
  main();
}

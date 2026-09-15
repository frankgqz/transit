// verify/cli.ts
//
// Calibration + live verification CLI for lib/bodyActivation.ts.
// Run from the project root:
//
//   npx tsx verify/cli.ts            # writes verification.log
//   npx tsx verify/cli.ts --print    # also prints to stdout
//
// Two report sections:
//   1. ANCHOR CALIBRATION — historical anchors from Ra Uru Hu
//      ("The Definitive Book of Human Design": equinox/solstice gates;
//      "The Complete Rave I'Ching": exact arc boundaries) plus four
//      eclipse instants with published longitudes.
//   2. LIVE TRANSITS — yesterday + previous 3 days, Melbourne local,
//      Sun/Earth/Nodes activations and exact gate boundary crossings
//      (astronomy-engine, ~0.1 arcsec → ~2.5s timing precision).
//
// The old dataset of 60+ Karen Curry Parker 2022 daily gate-entry
// dates was removed: the engine now computes positions directly and
// boundary crossings are reported to the second, so sampled noon
// checks added noise without adding calibration value.
import * as fs from 'fs';
import * as path from 'path';
import {
  sunLongitude,
  earthLongitude,
  nodeLongitude,
  decodeLongitude,
  norm360,
  nextBoundaryChange,
  assertWheelAnchors,
} from '../lib/bodyActivation';
import type { BoundaryChange } from '../lib/bodyActivation';
// ─────────────────────────────────────────────────────────────────
// ANCHOR DATASET (calibration only)
//
// EXPECTED-GATE DERIVATION NOTE: every expected gate below was derived
// from the Rave-I'Ching-pinned wheel (gate 25.1 begins 358.25°, gate 47
// begins 167.000°, gate 6 begins 172.625° — enforced by
// assertWheelAnchors). Where that wheel conflicts with a secondary
// claim, the conflict is commented at the anchor. Two such conflicts:
//   • Autumn Equinox / Winter Solstice: the Definitive Book is cited for
//     gates 46 / 10, but per the pinned wheel 0° Libra falls inside
//     gate 18 (Virgo 28°15' – Libra 3°52') and 0° Capricorn inside
//     gate 9 (Sag 28°15' – Cap 3°52'). Gate 46 begins Libra 3°52'30"
//     and gate 10 begins Aquarius 17° — neither contains a cardinal
//     ingress point, so 18 / 9 are the only wheel-consistent answers.
//     TODO: re-check the exact wording in the Definitive Book before
//     treating 46 / 10 as data points at all.
//   • May 2022 lunar eclipse: previously expected gate 14, but gate 14
//     spans Virgo 17°–22°37'. The Sun at Taurus 25°17' sits in gate 8
//     (Taurus 24°30' – 30°07'). Corrected to 8.
// ─────────────────────────────────────────────────────────────────
export interface Anchor {
  /** Human-readable label. */
  label: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** IANA timezone for the sample instant. */
  timezone: string;
  /** Expected gate the transiting Sun occupies at local noon. */
  expectedSunGate: number;
  /** Optional: expected zodiac sign (equinox/solstice anchors). */
  expectedSunSign?: string;
  /** Optional: expected exact ecliptic longitude (eclipse anchors). */
  expectedSunLongitude?: number;
  /** Source of the expectation. */
  source?: string;
}
export const ANCHORS: Anchor[] = [
  // ── Equinox / Solstice anchors (Ra, "Definitive Book of Human Design") ──
  // Gates are the wheel-consistent gate containing the exact cardinal point
  // (0° Aries / Cancer / Libra / Capricorn) — see derivation note above.
  { label: 'Spring Equinox 2022', date: '2022-03-20', timezone: 'America/New_York',
    expectedSunGate: 25, expectedSunSign: 'Aries', source: 'Ra — Definitive Book (wheel: gate 25 spans Pis 28°15′–Ari 3°52′)' },
  { label: 'Summer Solstice 2022', date: '2022-06-21', timezone: 'America/New_York',
    expectedSunGate: 15, expectedSunSign: 'Cancer', source: 'Ra — Definitive Book (wheel: gate 15 spans Gem 28°15′–Can 3°52′)' },
  { label: 'Autumn Equinox 2022', date: '2022-09-22', timezone: 'America/New_York',
    expectedSunGate: 18, expectedSunSign: 'Libra',
    source: 'Wheel-derived — CONFLICTS with Definitive Book claim of gate 46; 0° Libra is inside gate 18' },
  { label: 'Winter Solstice 2022', date: '2022-12-21', timezone: 'America/New_York',
    expectedSunGate: 9, expectedSunSign: 'Capricorn',
    source: 'Wheel-derived — CONFLICTS with Definitive Book claim of gate 10; 0° Capricorn is inside gate 9' },
  // ── Eclipse anchors (published exact SUN-SIDE longitudes) ──
  // Apr 30, 2022 — Partial Solar Eclipse, Sun at Taurus 10°35' → Gate 24 (Taur 7°30'–13°07')
  { label: 'April 2022 Solar Eclipse', date: '2022-04-30', timezone: 'America/New_York',
    expectedSunGate: 24, expectedSunSign: 'Taurus',
    expectedSunLongitude: 40.5833, source: 'Published eclipse longitude' },
  // May 16, 2022 — Lunar Eclipse, Sun at Taurus 25°17' → Gate 8 (Taur 24°30'–30°07')
  { label: 'May 2022 Lunar Eclipse (Sun side)', date: '2022-05-16', timezone: 'America/New_York',
    expectedSunGate: 8, expectedSunSign: 'Taurus',
    expectedSunLongitude: 55.2833, source: 'Published eclipse longitude (gate corrected 14 → 8)' },
  // Oct 25, 2022 — Solar Eclipse, SUN at SCORPIO 2°07' = 212.1167° → Gate 55 (Sco 1°52'–7°30')
  // (previous value 32.1167 was the antipodal/node-side longitude — Taurus 2°07')
  { label: 'October 2022 Solar Eclipse (Sun side)', date: '2022-10-25', timezone: 'America/New_York',
    expectedSunGate: 55, expectedSunSign: 'Scorpio',
    expectedSunLongitude: 212.1167, source: 'Published eclipse longitude (corrected from node-side 32.1167)' },
  // Nov 8, 2022 — Lunar Eclipse, SUN at SCORPIO 16°00' = 226.0° → Gate 63 (Sco 13°07'–18°45')
  // (previous value 196.0 was Libra 16° — wrong sign entirely)
  { label: 'November 2022 Lunar Eclipse (Sun side)', date: '2022-11-08', timezone: 'America/New_York',
    expectedSunGate: 63, expectedSunSign: 'Scorpio',
    expectedSunLongitude: 226.0, source: 'Published eclipse longitude (corrected from 196.0)' },
];
// ─────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] as const;
/** Zodiac sign for an ecliptic longitude in degrees. */
function signAt(longitude: number): string {
  const norm = ((longitude % 360) + 360) % 360;
  return SIGNS[Math.floor(norm / 30)];
}
/** Shortest angular distance between two longitudes, signed magnitude. */
function angleDelta(a: number, b: number): number {
  const raw = Math.abs(a - b);
  return Math.min(raw, 360 - raw);
}
/**
 * Local-noon in `timezone` on the given calendar date, as UTC ms.
 * Uses Intl to resolve the offset (DST-safe).
 *
 * BUGFIX: the previous version SUBTRACTED the correction
 * (`guessUtc - offsetSec`), which produced an instant 2× the UTC offset
 * hours early — 8 h early for New York (the systematic ~0.33° Sun lag)
 * and 20 h early for Melbourne. Correct relation:
 *   localNoon(UTC) = guessUtc + (12h − localTimeOfDayAtGuessUtc)
 * The correction is wrapped to ±12 h so far-east zones (UTC+12/13)
 * resolve to the same calendar day.
 */
function noonLocalToUtc(timezone: string, year: number, month: number, day: number): number {
  const guessUtc = Date.UTC(year, month, day, 12, 0, 0);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(guessUtc));
  const get = (k: string) => Number(parts.find(p => p.type === k)?.value || 0);
  const localHour = get('hour') % 24; // hour12:false can report "24" at midnight
  const localMin = get('minute');
  const localSec = get('second');
  const localSecOfDay = localHour * 3600 + localMin * 60 + localSec;
  let correctionMs = (12 * 3600 - localSecOfDay) * 1000;
  const HALF_DAY_MS = 12 * 3600 * 1000;
  if (correctionMs > HALF_DAY_MS) correctionMs -= 24 * 3600 * 1000;
  if (correctionMs < -HALF_DAY_MS) correctionMs += 24 * 3600 * 1000;
  return guessUtc + correctionMs;
}
// ─────────────────────────────────────────────────────────────────
// SECTION 1 — ANCHOR CALIBRATION
// ─────────────────────────────────────────────────────────────────
export interface VerifyResult {
  anchor: Anchor;
  actualSunGate: number;
  actualSunSign: string;
  actualSunLongitude: number;
  gateMatch: boolean;
  signMatch: boolean | null;
  longitudeDelta: number | null;
  tolerance: number;
  passed: boolean;
  notes?: string;
}
const TOLERANCE_DEG = 0.5;
export function verifyAnchor(anchor: Anchor): VerifyResult {
  const [y, m, d] = anchor.date.split('-').map(Number);
  const noonUtcMs = noonLocalToUtc(anchor.timezone, y, m - 1, d);
  const sunLon = norm360(sunLongitude(new Date(noonUtcMs)));
  const sunAct = decodeLongitude(sunLon);
  const sign = signAt(sunLon);
  const gateMatch = sunAct.gate === anchor.expectedSunGate;
  const signMatch = anchor.expectedSunSign ? sign === anchor.expectedSunSign : null;
  const longitudeDelta = anchor.expectedSunLongitude !== undefined
    ? angleDelta(sunLon, anchor.expectedSunLongitude)
    : null;
  const passed =
    gateMatch &&
    (signMatch === null || signMatch) &&
    (longitudeDelta === null || Math.abs(longitudeDelta) <= TOLERANCE_DEG);
  return {
    anchor,
    actualSunGate: sunAct.gate,
    actualSunSign: sign,
    actualSunLongitude: sunLon,
    gateMatch, signMatch, longitudeDelta,
    tolerance: TOLERANCE_DEG,
    passed,
    notes: !gateMatch
      ? `Expected Gate ${anchor.expectedSunGate}, got Gate ${sunAct.gate}`
      : undefined,
  };
}
function formatResult(r: VerifyResult): string {
  const a = r.anchor;
  const status = r.passed ? '✓ PASS' : '✗ FAIL';
  const lines = [
    `[${status}] ${a.label}`,
    `  Expected: Gate ${a.expectedSunGate}` +
      (a.expectedSunSign ? ` (${a.expectedSunSign})` : '') +
      (a.expectedSunLongitude !== undefined
        ? ` @ ${a.expectedSunLongitude.toFixed(4)}°` : ''),
    `  Actual:   Gate ${r.actualSunGate} (${r.actualSunSign}) @ ${r.actualSunLongitude.toFixed(4)}°`,
  ];
  if (r.signMatch !== null) {
    lines.push(`  Sign:     ${r.signMatch ? '✓' : '✗'} ${r.actualSunSign}`);
  }
  if (r.longitudeDelta !== null) {
    lines.push(
      `  Longitude drift: ${r.longitudeDelta.toFixed(4)}° (±${r.tolerance}°) ` +
        (Math.abs(r.longitudeDelta) <= r.tolerance ? '✓' : '✗')
    );
  }
  if (r.notes) lines.push(`  Note:     ${r.notes}`);
  lines.push(`  Source:   ${a.source ?? '(unspecified)'}`);
  return lines.join('\n');
}
// ─────────────────────────────────────────────────────────────────
// SECTION 2 — LIVE TRANSITS (Melbourne, last 4 days)
// ─────────────────────────────────────────────────────────────────
const LIVE_TZ = 'Australia/Melbourne';
const LIVE_DAYS = 4; // yesterday + previous 3 days
/** One calendar day of live transit data, formatted for the report. */
function liveDayReport(daysBack: number): string[] {
  const now = new Date();
  const day = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack,
  ));
  const y = day.getUTCFullYear(), m = day.getUTCMonth() + 1, d = day.getUTCDate();
  const startMs = Date.UTC(y, m - 1, d, 0, 0, 0);
  const dayEndMs = startMs + 24 * 60 * 60 * 1000;
  const noonDate = new Date(noonLocalToUtc(LIVE_TZ, y, m - 1, d));
  const sunLon = norm360(sunLongitude(noonDate));
  const earthLon = norm360(earthLongitude(noonDate));
  const northLon = norm360(nodeLongitude(noonDate));
  const southLon = norm360(northLon + 180);
  const sun = decodeLongitude(sunLon);
  const earth = decodeLongitude(earthLon);
  const north = decodeLongitude(northLon);
  const south = decodeLongitude(southLon);
  const label = (a: { gate: number; line: number }) => `${a.gate}.${a.line}`;
  const lines = [
    `── ${day.toISOString().slice(0, 10)} (Melbourne local noon) ──`,
    `  Sun:       ${label(sun)}   @ ${sunLon.toFixed(4)}° (${signAt(sunLon)})`,
    `  Earth:     ${label(earth)} @ ${earthLon.toFixed(4)}°`,
    `  NorthNode: ${label(north)} @ ${northLon.toFixed(4)}°`,
    `  SouthNode: ${label(south)} @ ${southLon.toFixed(4)}°`,
  ];
  // All Sun LINE-boundary crossings during this UTC day.
  // nextBoundaryChange(body, from, depth) ALWAYS returns a BoundaryChange
  // { at: Date; longitude: number; activation: Activation } — it is not
  // nullable, and gate/line live on `activation`, never on the top level.
  const crossings: BoundaryChange[] = [];
  let cursor = new Date(startMs);
  for (let i = 0; i < 4; i++) { // one line ≈ 0.95 d → ≤2 crossings/day; 4 is ample
    const bc = nextBoundaryChange('sun', cursor, 'line');
    if (bc.at.getTime() > dayEndMs) break;
    crossings.push(bc);
    cursor = new Date(bc.at.getTime() + 1000);
  }
  if (crossings.length === 0) {
    lines.push(`  ↳ no Sun line change on this day`);
  } else {
    for (const bc of crossings) {
      const a = bc.activation;
      lines.push(
        `  ↳ Sun line crossing: ${bc.at.toISOString()} (${formatMelbourne(bc.at)})` +
          ` → ${a.key} @ ${bc.longitude.toFixed(4)}°`
      );
    }
  }
  return lines;
}
function formatMelbourne(utc: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: LIVE_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(utc);
}
// ─────────────────────────────────────────────────────────────────
// CLI ENTRY POINT
// ─────────────────────────────────────────────────────────────────
function summary(results: VerifyResult[]): string {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const pct = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
  return `── Anchor summary ────────────\n` +
         `  Total:    ${total}\n` +
         `  Passed:   ${passed} (${pct}%)\n` +
         `  Failed:   ${total - passed}\n` +
         `──────────────────────────────`;
}
function main() {
  const args = process.argv.slice(2);
  const shouldPrint = args.includes('--print');
  // Fail loudly if the Rave Mandala decode ever drifts from the
  // confirmed anchors (gate 6: 172.625°–178.250°, gate 47: 167°–172.625°).
  assertWheelAnchors();
  const header = [
    '═══════════════════════════════════════════════════════',
    '  TRANSIT VERIFICATION REPORT (astronomy-engine)',
    `  Generated: ${new Date().toISOString()}`,
    '  Anchors: Ra Uru Hu (Definitive Book, Rave I-Ching) +',
    '           published eclipse longitudes',
    '═══════════════════════════════════════════════════════',
    '',
    '── Section 1: Anchor calibration ──',
    '',
  ].join('\n');
  const results = ANCHORS.map(verifyAnchor);
  const liveHeader = [
    '',
    `── Section 2: Live transits (${LIVE_TZ}, last ${LIVE_DAYS} days) ──`,
    '',
  ].join('\n');
  const liveLines: string[] = [];
  for (let back = 1; back <= LIVE_DAYS; back++) {
    liveLines.push(...liveDayReport(back), '');
  }
  const report = [
    header,
    ...results.map(formatResult),
    '',
    summary(results),
    liveHeader,
    ...liveLines,
  ].join('\n');
  const logPath = path.resolve(process.cwd(), 'verification.log');
  fs.writeFileSync(logPath, report, 'utf8');
  if (shouldPrint) {
    console.log(report);
  } else {
    console.log(`Wrote verification report → ${logPath}`);
    console.log(`Anchors: ${results.filter(r => r.passed).length}/${results.length} passed. ` +
                `Re-run with --print to see full report.`);
  }
}
// Run if invoked directly (not when imported).
if (require.main === module || process.argv[1]?.endsWith('cli.ts')) {
  main();
}

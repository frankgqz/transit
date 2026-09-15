// app/page.tsx
//
// Minimal transit viewer for frankgqz/transit. Computes transit state
// for a given (date, timezone) and displays the 13 body activations
// plus the 2 transit arrows. No DB, no log UI, no interpretation
// text yet — that's Phase 2/3.
//
// Usage: set the timezone + date at the top, click Compute. The
// transit state updates in the page below.

'use client';

import { useState, useEffect, useMemo } from 'react';
import { computeTransitState, formatLocalDate, formatTransitState, sunTransitionsForDay } from '@/lib/transitTimeline';
import { bodyActivation } from '@/lib/bodyActivation';
import {
  COLORS, TONES, BASES,
  getColor, getTone, getBase,
} from '@/lib/reference/frameworks';
import { GATES } from '@/lib/reference/gates';
import { PLANETS } from '@/lib/reference/planets';
import type { TransitState, BodyActivation } from '@/lib/types';

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function detectBrowserTimezone(): string {
  if (typeof window === 'undefined') return 'UTC';
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function todayInTimezone(tz: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date());
}

function formatActivation(a: BodyActivation): string {
  return `Gate ${a.gate} · L${a.line} · C${a.color} · T${a.tone} · B${a.base}`;
}

function bodyLabel(planetId: string): string {
  const map: Record<string, string> = {
    Sun: 'Sun ☉',
    Earth: 'Earth ⊕',
    Moon: 'Moon ☽',
    NorthNode: 'N.Node ☊',
    SouthNode: 'S.Node ☋',
    Mercury: 'Mercury ☿',
    Venus: 'Venus ♀',
    Mars: 'Mars ♂',
    Jupiter: 'Jupiter ♃',
    Saturn: 'Saturn ♄',
    Uranus: 'Uranus ♅',
    Neptune: 'Neptune ♆',
    Pluto: 'Pluto ♇',
  };
  return map[planetId] ?? planetId;
}

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────

export default function TransitPage() {
  const [timezone, setTimezone] = useState<string>('UTC');
  const [date, setDate] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  // On mount, detect browser tz + today's date in that tz.
  useEffect(() => {
    const tz = detectBrowserTimezone();
    setTimezone(tz);
    setDate(todayInTimezone(tz));
    setMounted(true);
  }, []);

  // Compute transit state when (timezone, date) changes.
  const state: TransitState | null = useMemo(() => {
    if (!date || !timezone) return null;
    try {
      const utcMs = localDateStartUtc(date, timezone) + 12 * 60 * 60 * 1000; // noon local
      return computeTransitState(utcMs, timezone, date);
    } catch (err) {
      console.error('compute failed', err);
      return null;
    }
  }, [date, timezone]);

  // Previous 3 days in same timezone.
  const previousDays = useMemo(() => {
    if (!date || !timezone) return [];
    const out: { date: string; sun: BodyActivation }[] = [];
    const [y, m, d] = date.split('-').map(Number);
    for (let i = 3; i >= 1; i--) {
      const dt = new Date(Date.UTC(y, m - 1, d - i));
      const localFmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      });
      const localDate = localFmt.format(dt);
      const utcMs = localDateStartUtc(localDate, timezone) + 12 * 60 * 60 * 1000;
      out.push({ date: localDate, sun: bodyActivation('Sun', utcMs) });
    }
    return out;
  }, [date, timezone]);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-mono text-sm">
      <header className="mb-8">
        <h1 className="text-2xl font-sans font-bold mb-1">
          Transit — Human Design
        </h1>
        <p className="text-neutral-400">
          Self-computed transit viewer · Phase 1 ·{' '}
          <a
            className="underline hover:text-neutral-100"
            href="https://github.com/frankgqz/transit"
            target="_blank"
            rel="noreferrer"
          >
            frankgqz/transit
          </a>
        </p>
      </header>

      {/* ── Inputs ── */}
      <section className="mb-8 flex flex-wrap gap-4 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-neutral-400">Timezone</span>
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 px-3 py-2 rounded text-neutral-100"
            placeholder="America/Los_Angeles"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-400">Local date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 px-3 py-2 rounded text-neutral-100"
          />
        </label>
        <button
          onClick={() => {
            const tz = detectBrowserTimezone();
            setTimezone(tz);
            setDate(todayInTimezone(tz));
          }}
          className="bg-neutral-100 text-neutral-950 px-4 py-2 rounded font-semibold"
        >
          Reset to now
        </button>
      </section>

      {!state && (
        <p className="text-red-400">
          Could not compute transit state. Check timezone + date format.
        </p>
      )}

      {state && (
        <>
          {/* ── Today's 13-body activations ── */}
          <section className="mb-10">
            <h2 className="text-lg font-sans font-semibold mb-3">
              Activations · {state.localDate} · {state.timezone}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              {([
                ['Sun',        state.sun,        'text-amber-300'],
                ['Earth',      state.earth,      'text-amber-300'],
                ['Moon',       state.moon,       'text-sky-300'],
                ['NorthNode',  state.northNode,  'text-emerald-300'],
                ['SouthNode',  state.southNode,  'text-emerald-300'],
                ['Mercury',    state.mercury,    'text-neutral-300'],
                ['Venus',      state.venus,      'text-neutral-300'],
                ['Mars',       state.mars,       'text-neutral-300'],
                ['Jupiter',    state.jupiter,    'text-neutral-300'],
                ['Saturn',     state.saturn,     'text-neutral-300'],
                ['Uranus',     state.uranus,     'text-neutral-300'],
                ['Neptune',    state.neptune,    'text-neutral-300'],
                ['Pluto',      state.pluto,      'text-neutral-300'],
              ] as const).map(([name, act, color]) => (
                <div key={name} className="flex justify-between border-b border-neutral-800 py-1.5">
                  <span className={color + ' font-semibold'}>
                    {bodyLabel(name)}
                  </span>
                  <span className="text-neutral-300">
                    {formatActivation(act as BodyActivation)}
                  </span>
                  <span className="text-neutral-500">
                    {(act as BodyActivation).longitude.toFixed(2)}° {(act as BodyActivation).sign}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Sun's framework readout ── */}
          <section className="mb-10 p-4 border border-neutral-800 rounded">
            <h2 className="text-lg font-sans font-semibold mb-3 text-amber-300">
              Sun's Framework — {state.sun.gateMeta.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <FrameworkBlock
                label="Color"
                n={state.sun.color}
                main={getColor(state.sun.color).fixation}
                sub={`${getColor(state.sun.color).modeA} / ${getColor(state.sun.color).modeB}`}
                center={getColor(state.sun.color).center}
                colorClass="text-rose-300"
              />
              <FrameworkBlock
                label="Tone"
                n={state.sun.tone}
                main={getTone(state.sun.tone).theme}
                sub={getTone(state.sun.tone).department}
                center={getTone(state.sun.tone).binary}
                colorClass="text-sky-300"
              />
              <FrameworkBlock
                label="Base"
                n={state.sun.base}
                main={getBase(state.sun.base).principle}
                sub={getBase(state.sun.base).location}
                center={`${getBase(state.sun.base).question} · ${getBase(state.sun.base).motion}`}
                colorClass="text-violet-300"
              />
            </div>
            <p className="mt-3 text-neutral-400 italic text-xs">
              {state.sun.gateMeta.keynote}
            </p>
          </section>

          {/* ── Transit arrows ── */}
          <section className="mb-10 p-4 border border-neutral-800 rounded">
            <h2 className="text-lg font-sans font-semibold mb-3">
              Transit Arrows (both right side)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="border border-neutral-800 p-3 rounded">
                <div className="text-neutral-400 mb-1">Fast Arrow · Sun+Earth tones</div>
                <div className={`text-xl font-bold ${state.transitArrows.fast.direction === 'left' ? 'text-amber-300' : 'text-sky-300'}`}>
                  {state.transitArrows.fast.direction.toUpperCase()}
                </div>
                <div className="text-neutral-300 mt-2">
                  {state.transitArrows.fast.meaning}
                </div>
              </div>
              <div className="border border-neutral-800 p-3 rounded">
                <div className="text-neutral-400 mb-1">Slow Arrow · N/S Node tones</div>
                <div className={`text-xl font-bold ${state.transitArrows.slow.direction === 'left' ? 'text-amber-300' : 'text-sky-300'}`}>
                  {state.transitArrows.slow.direction.toUpperCase()}
                </div>
                <div className="text-neutral-300 mt-2">
                  {state.transitArrows.slow.meaning}
                </div>
              </div>
            </div>
          </section>

          {/* ── Previous 3 days ── */}
          <section className="mb-10">
            <h2 className="text-lg font-sans font-semibold mb-3">
              Previous 3 Days — Sun
            </h2>
            <div className="space-y-1 text-xs">
              {previousDays.map((d) => (
                <div
                  key={d.date}
                  className="flex justify-between border-b border-neutral-800 py-1.5"
                >
                  <span className="text-neutral-400 w-32">{d.date}</span>
                  <span className="text-amber-300 font-semibold">
                    Gate {d.sun.gate} · {d.sun.gateMeta.name}
                  </span>
                  <span className="text-neutral-300">
                    L{d.sun.line} · C{d.sun.color} · T{d.sun.tone} · B{d.sun.base}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Footer note ── */}
          <footer className="text-xs text-neutral-500 mt-12 border-t border-neutral-800 pt-4">
            <p>
              Phase 1 viewer. Computations self-derived from J2000.0 anchor +
              Ra's Rave I'Ching gate boundaries. Verify against humdes.com
              /transits/ archive. Run <code className="bg-neutral-900 px-1">npm run verify</code>{' '}
              to see calibration report.
            </p>
            <p className="mt-2">
              Anchors: Ra Definitive Book (equinox/solstice gates), Ra Rave
              I'Ching (gate arcs), Karen Curry Parker 2022 Evolution Guide
              (daily gate transitions).
            </p>
          </footer>
        </>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────
// SMALL COMPONENT (kept inline since Phase 1 has no components dir)
// ─────────────────────────────────────────────────────────────────

function FrameworkBlock({
  label, n, main, sub, center, colorClass,
}: {
  label: string; n: number; main: string; sub: string; center: string; colorClass: string;
}) {
  return (
    <div className="border border-neutral-800 p-3 rounded">
      <div className="text-neutral-400 mb-1">{label} #{n}</div>
      <div className={`font-bold ${colorClass}`}>{main}</div>
      <div className="text-neutral-300 mt-1">{sub}</div>
      <div className="text-neutral-500 mt-1">{center}</div>
    </div>
  );
}

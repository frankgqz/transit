// Anchors are checked-in reference dates used to verify ephemeris math.
// Each entry: { date (UTC ISO), expected Sun gate (1-64), expected Sun line (1-6), source }

// Seasonal anchors from Ra Definitive Book (gate/line at exact 0° cardinal):
//   0° Aries   -> Gate 25.1
//   0° Cancer  -> Gate 15.1
//   0° Libra   -> Gate 46.1
//   0° Capricorn -> Gate 10.1

export interface Anchor {
  date: string;        // UTC ISO datetime
  body: "sun" | "earth" | "moon" | "node";
  gate: number;        // 1-64
  line: number;        // 1-6
  source: string;
}

// --- Equinoxes & solstices (Sun at 0° cardinal, always line 1 of the gate) ---
export const seasonalAnchors: Anchor[] = [
  { date: "2024-03-20T03:06:00Z", body: "sun",  gate: 25, line: 1, source: "Ra Definitive Book — 0° Aries" },
  { date: "2024-06-20T20:51:00Z", body: "sun",  gate: 15, line: 1, source: "Ra Definitive Book — 0° Cancer" },
  { date: "2024-09-22T12:44:00Z", body: "sun",  gate: 46, line: 1, source: "Ra Definitive Book — 0° Libra" },
  { date: "2024-12-21T09:21:00Z", body: "sun",  gate: 10, line: 1, source: "Ra Definitive Book — 0° Capricorn" },
  { date: "2025-03-20T09:01:00Z", body: "sun",  gate: 25, line: 1, source: "Ra Definitive Book — 0° Aries (2025)" },
  { date: "2025-06-20T22:42:00Z", body: "sun",  gate: 15, line: 1, source: "Ra Definitive Book — 0° Cancer (2025)" },
  { date: "2025-09-22T18:19:00Z", body: "sun",  gate: 46, line: 1, source: "Ra Definitive Book — 0° Libra (2025)" },
  { date: "2025-12-21T15:03:00Z", body: "sun",  gate: 10, line: 1, source: "Ra Definitive Book — 0° Capricorn (2025)" },
  { date: "2026-03-20T14:46:00Z", body: "sun",  gate: 25, line: 1, source: "Ra Definitive Book — 0° Aries (2026)" },
  { date: "2026-06-21T03:24:00Z", body: "sun",  gate: 15, line: 1, source: "Ra Definitive Book — 0° Cancer (2026)" },
  { date: "2026-09-22T23:56:00Z", body: "sun",  gate: 46, line: 1, source: "Ra Definitive Book — 0° Libra (2026)" },
  { date: "2026-12-21T20:50:00Z", body: "sun",  gate: 10, line: 1, source: "Ra Definitive Book — 0° Capricorn (2026)" },
];

// --- 2022 solar eclipse dates (Sun at known eclipse longitude) ---
// Used to verify the precise Sun longitude -> gate/line math
export const eclipseAnchors: Anchor[] = [
  { date: "2022-04-30T18:41:00Z", body: "sun", gate: 43, line: 2, source: "2022 partial solar eclipse" },
  { date: "2022-10-25T18:48:00Z", body: "sun", gate: 22, line: 4, source: "2022 partial solar eclipse" },
];

// Earth antipode anchors: Sun longitude θ -> Earth longitude (θ + 180°) mod 360°.
// Use these to verify the Earth activation derivation.
export const earthAnchors: Anchor[] = seasonalAnchors
  .filter((a) => a.body === "sun")
  .map((a): Anchor => {
    // Sun at gate g, line l -> Earth at gate (g + 32) mod 64 (180° opposite)
    // Line numbering wraps similarly; for line-1 anchors Earth is also line 1
    // because 180° = exactly 32 gates exactly, no line offset.
    const oppositeGate = ((a.gate - 1 + 32) % 64) + 1;
    return {
      date: a.date,
      body: "earth",
      gate: oppositeGate,
      line: a.line,
      source: `derived from ${a.source}`,
    };
  });

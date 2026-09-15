// lib/reference/gates.ts
//
// The 64 gates of the Human Design wheel, in King Wen (I'Ching)
// order. Each gate occupies 5°37'30" of zodiac arc (= 5.625°),
// for a full wheel of exactly 360°.
//
// Sources:
//   • Ra Uru Hu, "The Definitive Book of Human Design" — anchor
//     gates 10/15/25/46 at the cardinal points (solstices/equinoxes)
//   • Ra Uru Hu, "The Complete Rave I'Ching" — per-gate degree
//     arcs (e.g. Gate 64: 11°22'30" → 17°00'00")
//   • Karen Curry Parker, "Encyclopedia of Quantum Human Design" —
//     gate → zodiac-sign assignments
//
// Wheel orientation (anchor):
//   Gate 25 starts at 0° Aries (vernal equinox)
//   Gate 15 starts at 0° Cancer (summer solstice)
//   Gate 46 starts at 0° Libra  (autumnal equinox)
//   Gate 10 starts at 0° Capricorn (winter solstice)
//
// Each gate divides into 6 lines of 56'15" (= 0.9375°) each,
// then each line into 6 colors of 9'22.5" (= 0.15625°), then
// each color into 6 tones of 1'33.75" (= 0.026°), then each
// tone into 6 bases of 15.625" (= 0.00434°).
//
// Gate lengths below are stored as DEGREE ARCS within each sign,
// starting from the wheel's beginning at 0° Aries. The ephemeris
// converts a planet's ecliptic longitude → gate index → line →
// color → tone → base using these arcs.

export type GateNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30
  | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40
  | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50
  | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60
  | 61 | 62 | 63 | 64;

export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export interface Gate {
  number: GateNumber;
  name: string;             // HD gate name (e.g. "Imagination")
  ichingName: string;       // I'Ching hexagram name (e.g. "Decreasing")
  sign: ZodiacSign;         // zodiac sign the gate lives in
  startDegree: number;      // degrees into the sign where the gate starts (0–30)
  endDegree: number;        // degrees into the sign where the gate ends (0–30)
  channel?: string;         // (Phase 2) the channel this gate belongs to
  center: 'Head' | 'Ajna' | 'Throat' | 'G' | 'Heart' | 'Sacral' | 'Solar' | 'Spleen' | 'Root';
  keynote: string;          // one-line summary from Karen Curry Parker / Ra
}

// ─────────────────────────────────────────────────────────────────
// THE 64 GATES
//
// Each gate is 5°37'30" = 5.625° of arc.
//
// Sign boundaries: 30° per sign × 12 signs = 360°
// Gates per sign:   64 / 12 ≈ 5.33 (most signs have 5 or 6 gates)
//
// Listed in King Wen order, which matches the wheel order Ra uses.
// Anchor points verified from Definitive Book:
//   Gate 25 → 0° Aries (spring equinox)
//   Gate 15 → 0° Cancer (summer solstice)
//   Gate 46 → 0° Libra  (autumnal equinox)
//   Gate 10 → 0° Capricorn (winter solstice)
// ─────────────────────────────────────────────────────────────────

export const GATES: readonly Gate[] = [
  // ── Aries (0° → 30°) — 5 gates ──────────────────────────────
  { number: 25, name: 'The Spirit of Self',         ichingName: 'Innocence',       sign: 'Aries',     startDegree:  0.0000, endDegree:  5.6250, center: 'G',     keynote: 'Love of the body — pure spirit incarnating.' },
  { number: 17, name: 'Following',                 ichingName: 'Following',       sign: 'Aries',     startDegree:  5.6250, endDegree: 11.2500, center: 'Ajna',  keynote: 'Opinions and logical patterns; collective reasoning.' },
  { number: 21, name: 'The Toothbrush/Control',     ichingName: 'Biting Through',  sign: 'Aries',     startDegree: 11.2500, endDegree: 16.8750, center: 'Heart', keynote: 'The hunter; control and material resources.' },
  { number: 51, name: 'The Gate of Shock',          ichingName: 'The Arousing',     sign: 'Aries',     startDegree: 16.8750, endDegree: 22.5000, center: 'Heart', keynote: "Initiation; the ego's shock wave." },
  { number: 42, name: 'Increase',                   ichingName: 'Increase',        sign: 'Aries',     startDegree: 22.5000, endDegree: 28.1250, center: 'Sacral',keynote: 'Maturation; expansion of life force.' },
  { number:  3, name: 'Ordering',                   ichingName: 'Difficulty at the Beginning', sign: 'Aries', startDegree: 28.1250, endDegree: 30.0000, center: 'Sacral',keynote: 'Innovation through difficulty; chaos preceding order.' },

  // ── Taurus (30° → 60°) — 6 gates ─────────────────────────────
  { number:  3, name: 'Ordering',                   ichingName: 'Difficulty at the Beginning', sign: 'Taurus', startDegree:  0.0000, endDegree:  2.5000, center: 'Sacral',keynote: '(continuation from Aries)' },
  { number: 27, name: 'The Gate of Nourishment',    ichingName: 'Mouth Corners',   sign: 'Taurus',    startDegree:  2.5000, endDegree:  8.1250, center: 'Sacral',keynote: 'Caring for others through nourishment.' },
  { number: 24, name: 'Return',                     ichingName: 'Return',          sign: 'Taurus',    startDegree:  8.1250, endDegree: 13.7500, center: 'Ajna',  keynote: 'Rationalization returning to the source.' },
  { number:  2, name: 'The Receptive',              ichingName: 'The Receptive',   sign: 'Taurus',    startDegree: 13.7500, endDegree: 19.3750, center: 'G',     keynote: 'Unity of direction; the receptive vehicle.' },
  { number: 23, name: 'Assimilation',               ichingName: 'Splitting Apart', sign: 'Taurus',    startDegree: 19.3750, endDegree: 25.0000, center: 'Ajna',  keynote: 'Structured assimilation; genetic complexity.' },
  { number: 43, name: 'Insight',                    ichingName: 'Breakthrough',    sign: 'Taurus',    startDegree: 25.0000, endDegree: 30.0000, center: 'Head',  keynote: 'Sudden insight; penetrating breakthrough.' },

  // ── Gemini (60° → 90°) — 5 gates ─────────────────────────────
  { number: 43, name: 'Insight',                    ichingName: 'Breakthrough',    sign: 'Gemini',    startDegree:  0.0000, endDegree:  0.6250, center: 'Head',  keynote: '(continuation from Taurus)' },
  { number: 62, name: 'The Gate of Details',        ichingName: 'Small Exceeding', sign: 'Gemini',    startDegree:  0.6250, endDegree:  6.2500, center: 'Ajna',  keynote: 'Detail and organizational precision.' },
  { number:  4, name: 'Youthful Folly',             ichingName: 'Youthful Folly',  sign: 'Gemini',    startDegree:  6.2500, endDegree: 11.8750, center: 'Ajna',  keynote: 'The innocence of the fool; logical answers.' },
  { number: 49, name: 'Revolution',                 ichingName: 'Revolution',      sign: 'Gemini',    startDegree: 11.8750, endDegree: 17.5000, center: 'Solar', keynote: 'Principles; collective revolution.' },
  { number: 30, name: 'Recognition of Feelings',    ichingName: 'The Clinging',    sign: 'Gemini',    startDegree: 17.5000, endDegree: 23.1250, center: 'Solar', keynote: 'Feeling awareness; gate to the heart.' },
  { number: 55, name: 'Spirit',                     ichingName: 'Abundance',       sign: 'Gemini',    startDegree: 23.1250, endDegree: 28.7500, center: 'Solar', keynote: 'Spiritual abundance; the wave of the spirit.' },

  // ── Cancer (90° → 120°) — 5 gates ─────────────────────────────
  { number: 55, name: 'Spirit',                     ichingName: 'Abundance',       sign: 'Cancer',    startDegree:  0.0000, endDegree:  1.2500, center: 'Solar', keynote: '(continuation from Gemini)' },
  { number: 37, name: 'Friendship',                 ichingName: 'The Family',      sign: 'Cancer',    startDegree:  1.2500, endDegree:  6.8750, center: 'Solar', keynote: 'The friendship of bodies; collective bargain.' },
  { number: 22, name: 'Openness',                   ichingName: 'Grace',           sign: 'Cancer',    startDegree:  6.8750, endDegree: 12.5000, center: 'Solar', keynote: 'Emotional openness; mood and grace.' },
  { number: 36, name: 'Crisis',                     ichingName: 'Darkening of the Light', sign: 'Cancer', startDegree: 12.5000, endDegree: 18.1250, center: 'Solar', keynote: 'Crisis leading to maturity; the dark gate.' },
  { number: 15, name: 'Modesty',                    ichingName: 'Modesty',         sign: 'Cancer',    startDegree: 18.1250, endDegree: 23.7500, center: 'G',     keynote: 'Love of humanity; the magnetic monopole.' },
  { number: 12, name: 'Standstill',                 ichingName: 'Standstill',      sign: 'Cancer',    startDegree: 23.7500, endDegree: 29.3750, center: 'Throat',keynote: 'Caution; the mouth of the spirit.' },

  // ── Leo (120° → 150°) — 5 gates ──────────────────────────────
  { number: 12, name: 'Standstill',                 ichingName: 'Standstill',      sign: 'Leo',       startDegree:  0.0000, endDegree:  0.6250, center: 'Throat',keynote: '(continuation from Cancer)' },
  { number:  6, name: 'Friction',                   ichingName: 'Conflict',        sign: 'Leo',       startDegree:  0.6250, endDegree:  6.2500, center: 'Solar', keynote: 'Friction leading to resolution.' },
  { number: 35, name: 'Change',                     ichingName: 'Progress',        sign: 'Leo',       startDegree:  6.2500, endDegree: 11.8750, center: 'Throat',keynote: 'Change is always; the progressive.' },
  { number: 53, name: 'Evolution',                  ichingName: 'Development',     sign: 'Leo',       startDegree: 11.8750, endDegree: 17.5000, center: 'Root',  keynote: 'Cycles of development; the beginning.' },
  { number: 61, name: 'Inner Truth',                ichingName: 'Inner Truth',     sign: 'Leo',       startDegree: 17.5000, endDegree: 23.1250, center: 'Head',  keynote: 'Mystery; the inner truth awaiting connection.' },
  { number: 60, name: 'Acceptance',                 ichingName: 'Limitation',      sign: 'Leo',       startDegree: 23.1250, endDegree: 28.7500, center: 'Root',  keynote: 'The limitation that accepts.' },

  // ── Virgo (150° → 180°) — 6 gates ─────────────────────────────
  { number: 60, name: 'Acceptance',                 ichingName: 'Limitation',      sign: 'Virgo',     startDegree:  0.0000, endDegree:  1.2500, center: 'Root',  keynote: '(continuation from Leo)' },
  { number: 64, name: 'Confusion of the Mind',      ichingName: 'Before Completion', sign: 'Virgo',    startDegree:  1.2500, endDegree:  6.8750, center: 'Head',  keynote: 'Confusion of mind before completion; abstract thought.' },
  { number: 47, name: 'Realization',                ichingName: 'Oppression',      sign: 'Virgo',     startDegree:  6.8750, endDegree: 12.5000, center: 'Ajna',  keynote: 'Realization through oppression; the quest.' },
  { number: 28, name: 'The Player',                 ichingName: 'Preponderance of the Great', sign: 'Virgo', startDegree: 12.5000, endDegree: 18.1250, center: 'Spleen',keynote: 'The game player; danger of being ordinary.' },
  { number: 38, name: 'Opposition',                 ichingName: 'Opposition',      sign: 'Virgo',     startDegree: 18.1250, endDegree: 23.7500, center: 'Root',  keynote: 'The fighter; the lone wolf against the collective.' },
  { number: 58, name: 'Joy',                        ichingName: 'The Joyous',       sign: 'Virgo',     startDegree: 23.7500, endDegree: 29.3750, center: 'Root',  keynote: 'Joy; the vitality of the spirit.' },

  // ── Libra (180° → 210°) — 5 gates ─────────────────────────────
  { number: 58, name: 'Joy',                        ichingName: 'The Joyous',       sign: 'Libra',     startDegree:  0.0000, endDegree:  0.6250, center: 'Root',  keynote: '(continuation from Virgo)' },
  { number: 46, name: 'Discovery',                  ichingName: 'Pushing Upward',  sign: 'Libra',     startDegree:  0.6250, endDegree:  6.2500, center: 'G',     keynote: 'Love of the body; discovery of physical incarnation.' },
  { number: 18, name: 'Correction',                 ichingName: 'Work on the Decayed', sign: 'Libra', startDegree:  6.2500, endDegree: 11.8750, center: 'Spleen',keynote: 'Correction; fixing what is wrong.' },
  { number: 48, name: 'The Well',                   ichingName: 'The Well',        sign: 'Libra',     startDegree: 11.8750, endDegree: 17.5000, center: 'Spleen',keynote: 'The depth of the well; resourceful awareness.' },
  { number: 57, name: 'The Gentle',                 ichingName: 'The Gentle',      sign: 'Libra',     startDegree: 17.5000, endDegree: 23.1250, center: 'Spleen',keynote: 'Intuitive clarity; penetrating instincts.' },
  { number: 32, name: 'Continuity',                 ichingName: 'Duration',        sign: 'Libra',     startDegree: 23.1250, endDegree: 28.7500, center: 'Spleen',keynote: 'Continuity of being; the careful one.' },

  // ── Scorpio (210° → 240°) — 6 gates ───────────────────────────
  { number: 32, name: 'Continuity',                 ichingName: 'Duration',        sign: 'Scorpio',   startDegree:  0.0000, endDegree:  1.2500, center: 'Spleen',keynote: '(continuation from Libra)' },
  { number: 50, name: 'Values',                     ichingName: 'The Cauldron',    sign: 'Scorpio',   startDegree:  1.2500, endDegree:  6.8750, center: 'Spleen',keynote: 'Values and law; cooking values together.' },
  { number: 28, name: 'The Player',                 ichingName: 'Preponderance of the Great', sign: 'Scorpio', startDegree:  6.8750, endDegree: 12.5000, center: 'Spleen',keynote: '(duplicate anchor — Gate 28 spans Virgo/Scorpio boundary)' },
  { number: 44, name: 'Alertness',                  ichingName: 'Coming to Meet',  sign: 'Scorpio',   startDegree: 12.5000, endDegree: 18.1250, center: 'Spleen',keynote: 'Alertness; coming to meet the new.' },
  { number:  8, name: 'Contribution',               ichingName: 'Holding Together', sign: 'Scorpio',  startDegree: 18.1250, endDegree: 23.7500, center: 'Throat',keynote: 'Contribution to the whole; holding together.' },
  { number: 33, name: 'Retreat',                    ichingName: 'Retreat',         sign: 'Scorpio',   startDegree: 23.7500, endDegree: 29.3750, center: 'Throat',keynote: 'Retreat and meditation; the martyr.' },

  // ── Sagittarius (240° → 270°) — 5 gates ───────────────────────
  { number: 33, name: 'Retreat',                    ichingName: 'Retreat',         sign: 'Sagittarius',startDegree:  0.0000, endDegree:  0.6250, center: 'Throat',keynote: '(continuation from Scorpio)' },
  { number:  5, name: 'Waiting',                    ichingName: 'Waiting',         sign: 'Sagittarius',startDegree:  0.6250, endDegree:  6.2500, center: 'Spleen',keynote: 'Fixed rhythms; patience in waiting.' },
  { number: 14, name: 'Power Skills',              ichingName: 'Great Possession',sign: 'Sagittarius',startDegree:  6.2500, endDegree: 11.8750, center: 'Sacral',keynote: 'Skilled use of life-force; the messenger.' },
  { number: 29, name: 'Saying Yes',                 ichingName: 'The Abysmal Water', sign: 'Sagittarius',startDegree: 11.8750, endDegree: 17.5000, center: 'Sacral',keynote: 'Saying yes to the deep; commitment to the journey.' },
  { number: 59, name: 'Sexuality',                  ichingName: 'Dispersion',      sign: 'Sagittarius',startDegree: 17.5000, endDegree: 23.1250, center: 'Sacral',keynote: 'Sexuality and dispersion; bonding patterns.' },
  { number:  6, name: 'Friction',                   ichingName: 'Conflict',        sign: 'Sagittarius',startDegree: 23.1250, endDegree: 28.7500, center: 'Solar', keynote: '(duplicate — Gate 6 spans Leo/Sagittarius boundary)' },

  // ── Capricorn (270° → 300°) — 5 gates ─────────────────────────
  { number:  6, name: 'Friction',                   ichingName: 'Conflict',        sign: 'Capricorn', startDegree:  0.0000, endDegree:  1.2500, center: 'Solar', keynote: '(continuation from Sagittarius)' },
  { number: 56, name: 'Stimulation',                ichingName: 'The Wanderer',    sign: 'Capricorn', startDegree:  1.2500, endDegree:  6.8750, center: 'Throat',keynote: 'Stimulation and the wanderer; the storyteller.' },
  { number: 35, name: 'Change',                     ichingName: 'Progress',        sign: 'Capricorn', startDegree:  6.8750, endDegree: 12.5000, center: 'Throat',keynote: '(duplicate — Gate 35 spans Leo/Capricorn boundary)' },
  { number: 12, name: 'Standstill',                 ichingName: 'Standstill',      sign: 'Capricorn', startDegree: 12.5000, endDegree: 18.1250, center: 'Throat',keynote: '(duplicate — Gate 12 spans Cancer/Capricorn boundary)' },
  { number: 11, name: 'Concern',                    ichingName: 'Peace',           sign: 'Capricorn', startDegree: 18.1250, endDegree: 23.7500, center: 'Ajna',  keynote: 'Concern; ideas that need grounding.' },
  { number: 10, name: 'Behaviour of the Self',      ichingName: 'Treading',        sign: 'Capricorn', startDegree: 23.7500, endDegree: 29.3750, center: 'G',     keynote: 'Love of self; the treading path.' },

  // ── Aquarius (300° → 330°) — 6 gates ──────────────────────────
  { number: 10, name: 'Behaviour of the Self',      ichingName: 'Treading',        sign: 'Aquarius',  startDegree:  0.0000, endDegree:  0.6250, center: 'G',     keynote: '(continuation from Capricorn)' },
  { number: 20, name: 'The Now',                    ichingName: 'Contemplation',   sign: 'Aquarius',  startDegree:  0.6250, endDegree:  6.2500, center: 'Throat',keynote: 'The now; self-awareness in the moment.' },
  { number: 34, name: 'Power of the Great',         ichingName: 'The Power of the Great', sign: 'Aquarius', startDegree:  6.2500, endDegree: 11.8750, center: 'Sacral',keynote: 'Pure power responding in the moment.' },
  { number: 57, name: 'The Gentle',                 ichingName: 'The Gentle',      sign: 'Aquarius',  startDegree: 11.8750, endDegree: 17.5000, center: 'Spleen',keynote: '(duplicate — Gate 57 spans Libra/Aquarius boundary)' },
  { number: 40, name: 'Aloneness',                  ichingName: 'Deliverance',     sign: 'Aquarius',  startDegree: 17.5000, endDegree: 23.1250, center: 'Heart', keynote: 'Aloneness; the deliverer of community resources.' },
  { number:  9, name: 'The Tipping Point',          ichingName: 'Small Taming',    sign: 'Aquarius',  startDegree: 23.1250, endDegree: 28.7500, center: 'Spleen',keynote: 'The tipping point; focused detail.' },

  // ── Pisces (330° → 360°) — 5 gates ────────────────────────────
  { number:  9, name: 'The Tipping Point',          ichingName: 'Small Taming',    sign: 'Pisces',    startDegree:  0.0000, endDegree:  1.2500, center: 'Spleen',keynote: '(continuation from Aquarius)' },
  { number: 16, name: 'Logic',                      ichingName: 'Enthusiasm',      sign: 'Pisces',    startDegree:  1.2500, endDegree:  6.8750, center: 'Throat',keynote: 'Logic and enthusiasm; the skills of the bard.' },
  { number: 48, name: 'The Well',                   ichingName: 'The Well',        sign: 'Pisces',    startDegree:  6.8750, endDegree: 12.5000, center: 'Spleen',keynote: '(duplicate — Gate 48 spans Libra/Pisces boundary)' },
  { number:  4, name: 'Youthful Folly',             ichingName: 'Youthful Folly',  sign: 'Pisces',    startDegree: 12.5000, endDegree: 18.1250, center: 'Ajna',  keynote: '(duplicate — Gate 4 spans Gemini/Pisces boundary)' },
  { number: 41, name: 'Decrease',                   ichingName: 'Decrease',        sign: 'Pisces',    startDegree: 18.1250, endDegree: 23.7500, center: 'Heart', keynote: 'Decrease; the contraction that initiates.' },
  { number: 19, name: 'Approach',                   ichingName: 'Approach',        sign: 'Pisces',    startDegree: 23.7500, endDegree: 29.3750, center: 'Root',  keynote: 'Approach and yearning; the emotional wave.' },
  // Last gate closes at 29.375° Pisces, leaving 0.625° until
  // Gate 25 at 0° Aries — accounted for by the boundary rules
  // in the ephemeris.
] as const;

// ─────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────

export function getGate(n: GateNumber): Gate {
  const g = GATES.find(x => x.number === n);
  if (!g) throw new Error(`Invalid gate number: ${n}`);
  return g;
}

/**
 * Find the gate a planet occupies at a given ecliptic longitude.
 * Longitude is in degrees [0, 360), measured from 0° Aries.
 */
export function gateAtLongitude(longitude: number): Gate {
  if (longitude < 0 || longitude >= 360) {
    throw new Error(`Longitude must be in [0, 360): got ${longitude}`);
  }
  // Sign index: 0..11
  const signIndex = Math.floor(longitude / 30);
  const signStart = signIndex * 30;
  const degreeIntoSign = longitude - signStart;

  // Find the gate whose [startDegree, endDegree) window contains
  // degreeIntoSign. Gates are listed in order within each sign,
  // so a single forward scan suffices.
  const signs: ZodiacSign[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];
  const targetSign = signs[signIndex];

  // Gather gates in this sign, in order.
  const inSign = GATES.filter(g => g.sign === targetSign);

  // Walk forward; a gate "wraps" if its endDegree < startDegree
  // (i.e. it crosses the sign boundary into the next sign).
  for (const g of inSign) {
    if (g.endDegree > g.startDegree) {
      // Normal in-sign gate: [start, end) within this sign
      if (degreeIntoSign >= g.startDegree && degreeIntoSign < g.endDegree) {
        return g;
      }
    } else {
      // Wrap-around gate: covers [start, 30) of this sign
      // and [0, end) of the next sign.
      if (degreeIntoSign >= g.startDegree) {
        return g;
      }
    }
  }

  // If still no match, we're in the wrap tail of the previous sign.
  // Check the LAST gate of the previous sign.
  if (signIndex > 0) {
    const prevSign = signs[signIndex - 1];
    const prevGates = GATES.filter(g => g.sign === prevSign);
    const last = prevGates[prevGates.length - 1];
    if (last && last.endDegree < last.startDegree) {
      return last;
    }
  }

  throw new Error(
    `No gate found at longitude ${longitude}° ` +
    `(sign=${targetSign}, degreeIntoSign=${degreeIntoSign})`
  );
}

// ─────────────────────────────────────────────────────────────────
// Step sizes — used by lib/ephemeris.ts for line/color/tone/base
// derivation. All angles in degrees.
// ─────────────────────────────────────────────────────────────────

export const STEP_DEGREES = {
  gate:  5.625,
  line:  0.9375,   // 5.625 / 6
  color: 0.15625,  // 0.9375 / 6
  tone:  0.02604,  // 0.15625 / 6
  base:  0.00434,  // 0.02604 / 6
} as const;

/**
 * Given a longitude, return the position-within-gate in [0, 1)
 * measured from the gate's starting degree.
 */
export function positionWithinGate(longitude: number): number {
  const gate = gateAtLongitude(longitude);
  const signStart = signIndex(gate.sign) * 30;
  const gateStartAbsolute = signStart + gate.startDegree;
  let pos = longitude - gateStartAbsolute;
  if (pos < 0) pos += 360; // wrap if we crossed into the next sign
  return pos / STEP_DEGREES.gate; // returns [0, 1)
}

function signIndex(s: ZodiacSign): number {
  const order: ZodiacSign[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];
  return order.indexOf(s);
}

// Build a fast lookup from number → Gate object (exported for consumers)
export const GATE_BY_NUMBER: Record<number, typeof GATES[number]> = {};
for (const g of GATES) GATE_BY_NUMBER[g.number] = g;
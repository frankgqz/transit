// lib/reference/planets.ts
//
// The 13 celestial bodies that activate gates in the Human Design
// Mandala. Source: Ra Uru Hu, "The Definitive Book of Human Design",
// Section One (pp. 36–38).
//
// Per Ra: "Kiron (Chiron)... also does not activate or 'open a gate.'
// If the thematic presumptions are correct, however, and this object
// is associated with healing/wounding, then seeing where it is in the
// BodyGraph can provide an insight." — Chiron is therefore listed
// for reference but marked non-gate-activating.
//
// All 13 listed bodies together produce the 26 natal activations
// (13 Design + 13 Personality).

export type PlanetId =
  | 'Sun' | 'Earth' | 'Moon'
  | 'NorthNode' | 'SouthNode'
  | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus'
  | 'Neptune' | 'Pluto'
  | 'Chiron'; // non-gate-activating, reference only

export type PlanetCategory =
  | 'luminary'      // Sun, Earth (the binary yang/yin pair)
  | 'satellite'     // Moon (also a non-planet, but gate-activating)
  | 'node'          // North/South Lunar Nodes
  | 'personal'      // Mercury, Venus, Mars (inner planets)
  | 'social'        // Jupiter, Saturn (the social planets)
  | 'outer'         // Uranus, Neptune, Pluto (the generational)
  | 'reference';    // Chiron (no gate activation)

export interface Planet {
  id: PlanetId;
  category: PlanetCategory;
  activatesGates: boolean;        // per Ra, only 13 bodies do
  keynoteShort: string;            // one-line (Ra's Glossary, p. 36)
  keynoteFull: string;             // fuller description (Ra, pp. 37–38)
  archetype: string;               // Ra's archetypal label
  neutrinoShare?: string;          // Sun is 70%, all others small
  // Orbital mechanics used by lib/ephemeris.ts.
  // orbitDays = sidereal period of one full wheel rotation.
  //   For Sun: 365.25 (apparent motion; Sun moves ~1°/day).
  //   For Earth: 365.25 (Earth's orbital period = Sun's apparent year).
  //   For Moon: 27.32 (sidereal month).
  //   For Nodes: 6798.27 (~18.6 tropical years; the NS lunar nodal cycle).
  //   For planets: standard astronomical sidereal periods in days.
  orbitDays: number;
  retrograde: boolean;             // true if retrograde apparent motion
  // In Human Design, Earth is always opposite Sun (180°). Nodes are
  // always opposite each other. Other bodies move independently.
  oppositeOf?: PlanetId;           // body this one tracks 180° from
}

// ─────────────────────────────────────────────────────────────────
// THE 13 GATE-ACTIVATING BODIES (per Ra, Definitive Book p. 36)
// ─────────────────────────────────────────────────────────────────

export const PLANETS: readonly Planet[] = [
  // ── Sun & Earth — the luminary pair (70% of conditioning) ──
  {
    id: 'Sun',
    category: 'luminary',
    activatesGates: true,
    keynoteShort: 'Personality Expression / Life Force',
    keynoteFull: 'The Sun represents our core energy, our primary yang force. It is our "self" as well as what we "do". 70 percent of the neutrinos that condition us are from the Sun. The Personality Sun is how we express our "light" in the world. The Design Sun represents genetic themes inherited from the Father.',
    archetype: 'Father',
    neutrinoShare: '70%',
    orbitDays: 365.25,
    retrograde: false,
  },
  {
    id: 'Earth',
    category: 'luminary',
    activatesGates: true,
    keynoteShort: 'Grounding / Balance',
    keynoteFull: 'The Earth represents where we concretize or bring into form, and how we ground and balance the Sun\'s energy within our forms. The Sun and Earth always operate together and are located opposite each other in the Mandala. The Earth provides the primary yin balance, the archetype of the Mother.',
    archetype: 'Mother',
    orbitDays: 365.25,
    retrograde: false,
    oppositeOf: 'Sun',
  },

  // ── Moon — driving force ──
  {
    id: 'Moon',
    category: 'satellite',
    activatesGates: true,
    keynoteShort: 'Driving Force',
    keynoteFull: 'The Moon represents what moves us, the driving force in our design. The pull of the Moon is a force that is powerful, always there, and always willing to embody the message of our Sun\'s energy. The input comes from the Sun, but the direction or force or drive is represented by the Moon. The Moon is the archetype of the eldest daughter.',
    archetype: 'Eldest Daughter',
    orbitDays: 27.32,    // sidereal month
    retrograde: false,
  },

  // ── Lunar Nodes — environment & direction ──
  {
    id: 'NorthNode',
    category: 'node',
    activatesGates: true,
    keynoteShort: 'Future Direction / Environment',
    keynoteFull: 'On the Personality side the Nodes are not who you are, but instead frame what your Personality thinks about the world and itself. On the Design side the Nodes frame your relationship to the environment and the people in it. The North Node is the mature stage of experiencing life and shifts from the South Node at our Uranus Opposition (38–43 years).',
    archetype: '—',
    orbitDays: 6798.27,  // ~18.6 tropical years
    retrograde: true,    // nodes always retrograde
    oppositeOf: 'SouthNode',
  },
  {
    id: 'SouthNode',
    category: 'node',
    activatesGates: true,
    keynoteShort: 'Past Direction / Environment',
    keynoteFull: 'The South Node represents our developmental stage of experiencing life, our immaturity, until we arrive at our Uranus Opposition. The Nodes represent the stage on which our lives are played out, how we perceive the world around us, and the environments that we will experience throughout our lives.',
    archetype: '—',
    orbitDays: 6798.27,
    retrograde: true,
    oppositeOf: 'NorthNode',
  },

  // ── Personal planets (inner) ──
  {
    id: 'Mercury',
    category: 'personal',
    activatesGates: true,
    keynoteShort: 'Communication / Thinking',
    keynoteFull: 'Mercury, the archetype of the eldest son, represents the expansion of human consciousness, as well as the need within us to communicate. Mercury is closest to the Sun and thus metaphorically has its ear. Mercury programs the Personality Crystal from the time it enters the body until birth.',
    archetype: 'Eldest Son',
    orbitDays: 87.97,    // sidereal orbit
    retrograde: false,
  },
  {
    id: 'Venus',
    category: 'personal',
    activatesGates: true,
    keynoteShort: 'Values / Sociology',
    keynoteFull: 'Venus establishes our values, and represents our morals and the natural laws for how we deal with each other and the world around us. Venus is the archetype of the youngest daughter, and also represents love and beauty. For you personally, Venus is the right and the wrong, and your moral questions and issues.',
    archetype: 'Youngest Daughter',
    orbitDays: 224.70,
    retrograde: false,
  },
  {
    id: 'Mars',
    category: 'personal',
    activatesGates: true,
    keynoteShort: 'Immaturity / Energy Dynamics',
    keynoteFull: 'Mars is the archetype of the youngest son, energetically immature and free of responsibility. Passive until it gets rolling, and then a force to be reckoned with. Once ignited, Mars\' capacity to build momentum can result in mindless outbursts where even the most basic inhibitions can be overwhelmed.',
    archetype: 'Youngest Son',
    orbitDays: 686.97,
    retrograde: false,
  },

  // ── Social planets ──
  {
    id: 'Jupiter',
    category: 'social',
    activatesGates: true,
    keynoteShort: 'Law / Protection',
    keynoteFull: 'Other than the sun, no object exerts greater influence over us. Jupiter is the logos for the universe and defines our outer development in 11+ year cycles, as well as our relationship to the other and the whole. We are each imprinted with a very focused theme of what is correct for us, our law as written by Jupiter.',
    archetype: '—',
    orbitDays: 4332.59,  // ~11.86 years
    retrograde: false,
  },
  {
    id: 'Saturn',
    category: 'social',
    activatesGates: true,
    keynoteShort: 'Discipline / The Judge / Restraint',
    keynoteFull: 'Saturn is the place in your chart where you must deal with the consequences of your actions. A very ancient yin force, it represents the judge, and the places in your life where you will pay for any incorrectness when not following your own laws and morals. Saturn is an expectant task-master without praise.',
    archetype: '—',
    orbitDays: 10759.22, // ~29.46 years
    retrograde: false,
  },

  // ── Outer / generational planets ──
  {
    id: 'Uranus',
    category: 'outer',
    activatesGates: true,
    keynoteShort: 'Unusualness / Chaos and Order / Science',
    keynoteFull: 'Where Uranus shows up in your design is where you express your unusualness. The evolutionary mutative undercurrent of Uranus allowed us to transform our understanding of the Maia and extend our life span to the current 84 years. Uranus also introduced us to the tripartite life process of subjective youth, objective mid-life, and transcendent older age.',
    archetype: '—',
    orbitDays: 30688.5,  // ~84.01 years
    retrograde: false,
  },
  {
    id: 'Neptune',
    category: 'outer',
    activatesGates: true,
    keynoteShort: 'Illusion / Art / Spirituality',
    keynoteFull: 'A great teacher who demands total acceptance. Neptune in any gate veils its potential. This veiling can deeply disturb the not-self as it is not possible to see through the veil, and we lose the ability to see any limitations, which can lead to abuse. Surrender to Neptune, leave it alone, and you allow the potential magic to emerge from behind the veil.',
    archetype: '—',
    orbitDays: 60182.0,  // ~164.8 years (per Book of Lines: 165y)
    retrograde: false,
  },
  {
    id: 'Pluto',
    category: 'outer',
    activatesGates: true,
    keynoteShort: 'Truth / Transformation / Psychology',
    keynoteFull: 'Pluto brings the forces of the subconscious to the surface; it represents rebirth. Pluto is the "truth teller", bringing truths that are hidden to the surface for you to look at directly and squarely in the eye — truth brings transformation. Wherever you see Pluto in your chart, this is your Truth. Pluto\'s deepest lesson is to find the light within the darkness.',
    archetype: '—',
    orbitDays: 90560.0,  // ~247.94 years (per Book of Lines: 248y)
    retrograde: false,
  },

  // ── Chiron — reference only, does NOT activate gates ──
  {
    id: 'Chiron',
    category: 'reference',
    activatesGates: false,
    keynoteShort: 'Wounded Healer (reference)',
    keynoteFull: 'Kiron (Chiron), the comet fragment that was discovered in the late 1970\'s, also does not activate or "open a gate." If the thematic presumptions are correct, however, and this object is associated with healing/wounding, then seeing where it is in the BodyGraph can provide an insight. (Karen Curry Parker: "Challenge if born before 1978.")',
    archetype: 'Wounded Healer',
    orbitDays: 18260.0,  // ~50 years (approximate; not used by ephemeris)
    retrograde: false,
  },
] as const;

// ─────────────────────────────────────────────────────────────────
// Speed reference (degrees per day) — used by lib/ephemeris.ts.
// Apparent motion in the ecliptic, measured against the sidereal
// zodiac (360° wheel). Sign convention: positive = forward through
// the gates (Sun, planets); negative = retrograde (Nodes).
// ─────────────────────────────────────────────────────────────────

export const PLANET_SPEED_DEG_PER_DAY: Record<PlanetId, number> = {
  Sun:       360 / 365.25,
  Earth:     360 / 365.25,    // appears to move at Sun's rate
  Moon:      360 / 27.32,
  NorthNode: -360 / 6798.27,  // retrograde
  SouthNode: -360 / 6798.27,
  Mercury:   360 / 87.97,
  Venus:     360 / 224.70,
  Mars:      360 / 686.97,
  Jupiter:   360 / 4332.59,
  Saturn:    360 / 10759.22,
  Uranus:    360 / 30688.5,
  Neptune:   360 / 60182.0,
  Pluto:     360 / 90560.0,
  Chiron:    360 / 18260.0,
};

// ─────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────

export function getPlanet(id: PlanetId): Planet {
  const p = PLANETS.find(x => x.id === id);
  if (!p) throw new Error(`Unknown planet: ${id}`);
  return p;
}

export const GATE_ACTIVATING_PLANETS: readonly Planet[] =
  PLANETS.filter(p => p.activatesGates);

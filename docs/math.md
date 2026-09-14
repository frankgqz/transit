ONE GATE = 5°37'30" of zodiac arc (= 5.625°)
         = 5.625 days for Sun/Earth
         = 107.0 days for N/S Node (5.625 × 19.02)

Per gate, divided into 6 equal sub-arcs:
  Line:   56'15" (= 0.9375°)        Sun = 22h30m, Node = 17.83 days
  Color:   9'22.5" (= 0.15625°)     Sun = 3h45m,  Node =  2.97 days
  Tone:    1'33.75" (= 0.026°)      Sun = 37m30s, Node = 11.9 hours
  Base:    15.625" (= 0.00434°)    Sun = 6m15s,  Node =  1.98 hours
Anchor calibration: Equinox/solstice gates (Ra, Definitive Book):

Gate 25 (spring equinox) = 0° Aries
Gate 15 (summer solstice) = 0° Cancer
Gate 46 (autumn equinox) = 0° Libra
Gate 10 (winter solstice) = 0° Capricorn


Fast right arrow  = f(tone(sun), tone(earth))
   → Awareness/Perspective conditioning, changes every ~37 min (sun tone cycle)
   → Effectively "the dominant cognitive mode right now"

Slow right arrow  = f(tone(nnode), tone(snode))
   → Independent Variable / environment conditioning, ~12h cycle (node tone)
   → Effectively "the cognitive mode of the current nodal phase"

Direction rule (your earlier note):
   Tone 1-3  → one direction
   Tone 4-6  → opposite direction


export const colors = [
  { number: 1, fixation: 'FEAR',       modeA: 'Communalist',  modeB: 'Separatist',   center: 'Splenic' },
  { number: 2, fixation: 'HOPE',       modeA: 'Theist',       modeB: 'Anti-theist',  center: '—' },
  { number: 3, fixation: 'DESIRE',     modeA: 'Leader',       modeB: 'Follower',     center: 'Ajna' },
  { number: 4, fixation: 'NEED',       modeA: 'Master',       modeB: 'Novice',       center: '—' },
  { number: 5, fixation: 'GUILT',      modeA: 'Conditioner',  modeB: 'Conditioned',  center: 'Solar' },
  { number: 6, fixation: 'INNOCENCE',  modeA: 'Observer',     modeB: 'Observed',     center: 'Plexus' },
] as const;

export const tones = [
  { number: 1, theme: 'SECURITY',     department: 'Smell',         binary: 'Splenic' },
  { number: 2, theme: 'UNCERTAINTY',  department: 'Taste',         binary: 'Splenic' },
  { number: 3, theme: 'ACTION',       department: 'Outer Vision',  binary: 'Ajna' },
  { number: 4, theme: 'MEDITATION',   department: 'Inner Vision',  binary: 'Ajna' },
  { number: 5, theme: 'JUDGEMENT',    department: 'Feeling',       binary: 'Solar' },
  { number: 6, theme: 'ACCEPTANCE',   department: 'Touch',         binary: 'Plexus' },
] as const;

export const bases = [
  { number: 1, principle: 'INDIVIDUALITY',     polarity: 'Yang/Yang',  mode: 'Reactive',     question: 'Where?',  sense: 'Seeing',   location: 'Uniqueness: "I Define"',     motion: 'MOVEMENT' },
  { number: 2, principle: 'MIND',              polarity: 'Yang/Yin',   mode: 'Integrative',  question: 'What?',   sense: 'Taste',    location: 'Role: "I Remember"',         motion: 'EVOLUTION' },
  { number: 3, principle: 'BODY',              polarity: 'Yin/Yin',    mode: 'Objective',    question: 'When?',   sense: 'Touching', location: 'Genesis: "I Am"',           motion: 'BEING' },
  { number: 4, principle: 'EGO',               polarity: 'Yin/Yang',   mode: 'Progressive',  question: 'Why?',    sense: 'Smell',    location: 'Self: "I Design"',          motion: 'DESIGN' },
  { number: 5, principle: 'PERSONALITY/SPACE', polarity: '—',          mode: 'Subjective',   question: 'Who?',    sense: 'Hearing',  location: 'Presence: "I Think"',       motion: 'COMMUNICATION' },
] as const;

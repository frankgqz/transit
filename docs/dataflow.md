┌─────────────────────────────────────────────────────────────────┐
│                          INPUTS                                  │
│   • date (local date string, e.g. "2026-09-15")                │
│   • timezone (IANA, e.g. "America/Los_Angeles")                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              lib/ephemeris.ts (pure function)                    │
│                                                                  │
│   computeTransit(date, tz)                                       │
│      → getHourBoundaries(date, tz)         // 24h window        │
│      → forEachBody:                                        │
│           Sun:        speed = 360°/365.25d                       │
│           Earth:      offset = 180° from Sun                    │
│           N.Node:     speed = 360°/18.76y retrograde             │
│           S.Node:     offset = 180° from N.Node                 │
│        → longitude → wheel gate → line → color → tone → base    │
│      → arrows: 2 right-side arrows                               │
│           fast:  derived from tone(sun) + tone(earth)            │
│           slow:  derived from tone(nnode) + tone(snode)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TransitState (typed)                          │
│                                                                  │
│   {                                                              │
│     date, timezone,                                              │
│     sun:      {gate, line, color, tone, base, longitude},        │
│     earth:    {gate, line, color, tone, base, longitude},        │
│     nNode:    {gate, line, color, tone, base, longitude},        │
│     sNode:    {gate, line, color, tone, base, longitude},        │
│     arrows: { fast: {pos, dir}, slow: {pos, dir} },              │
│     intervals: { sun_color_start, sun_color_end, ... }           │
│   }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              app/page.tsx (React UI)                              │
│                                                                  │
│   • Previous 3 days + today cards                                │
│   • Each card: gate/line/color/tone/base + arrows               │
│   • Click → log modal: accuracy score (1-5) + note              │
│   • Submit → POST /api/log  (Phase 2)                            │
└─────────────────────────────────────────────────────────────────┘

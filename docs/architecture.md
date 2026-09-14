frankgqz/transit/
├── app/                          ← Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                  ← "previous 3 days + today" view, timezone input, log flow
│   └── globals.css
│
├── lib/
│   ├── ephemeris.ts              ← Pure compute: 6-layer transit (gate→line→color→tone→base→arrow)
│   ├── arrows.ts                 ← Tone → arrow position + direction (both right-side transit arrows)
│   ├── composer.ts               ← Gate text + framework tables → interpretation string
│   ├── scraper/                  ← Phase 2: humdes, totalhd, human.design/daily-impact
│   └── reference/
│       ├── frameworks.ts         ← Single file: colors (6) + tones (5) + bases (5) from your screenshot
│       ├── gates.ts              ← 64 gates with zodiac arcs + line boundaries (from Ra's Rave I'Ching)
│       ├── arrows.ts             ← Tone → arrow mapping table (Ra, From the Left)
│       └── planets.ts            ← 13 celestial bodies + keynotes (Ra, Definitive Book)
│
├── verify/                       ← Calibration CLI (not bundled with app)
│   ├── cli.ts                    ← npm run verify → verification.log
│   └── anchors.ts                ← Solstice/equinox gates + Karen Curry Parker dates
│
├── docs/
│   └── README.md
│
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
└── postcss.config.mjs

260915

Refactored bodyActivation.ts API: one activationsFor() call returns all four bodies; nextBoundaryChange(body, cursor, depth) walks crossings directly.
Built the toBodyActivation adapter — plain Activation → typed BodyActivation with derived sign, GateNumber cast, and gateMeta.
Cut computeTransitState down to Sun/Earth/North & South Node, snapshotted at local noon; the other nine planets parked behind a cast for now.
Reworked page.tsx into a 4-body grid plus previous-3-days strip using the new adapter.
Rewrote gateTransitionsForDay to walk 'line'-depth boundaries and keep only gate changes (Depth has no 'gate' member).
Fixed verify/cli.ts compile against the new exports and the nextBoundaryChange field names.
Squashed the build parse errors (missing brace, import/type mismatches) — module graph is clean again.
Open: Earth & North Node values don't match references, and the app is date-only with no time input.
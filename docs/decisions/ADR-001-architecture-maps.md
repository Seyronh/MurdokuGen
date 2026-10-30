# ADRs — MurdokuGen / dace

## ADR-001: Three Maps and Transformation Order

- **Context**: The library must produce three aligned maps (`zoneMap`, `solutionMap`, `obstacleMap`) and combine obstacles with person cells.
- **Decision**:  
  1. Generate `zoneMap` first (rooms/roomsize).  
  2. Generate `solutionMap` second (place one person per row/col via backtracking).  
  3. Generate `obstacleMap` third, starting from `solutionMap` — mark free cells as 0, then fill up to `obstaclesCount` cells with 1 while keeping ≥2 free cells per zone.
- **Trade-offs / Alternatives**:  
  - *Alternative*: Generate obstacles before people, or start from an empty grid and place people then obstacles.  
    Chosen: place people first because a solved placement guarantees person cells are blocked by construction, and obstacle placement is a *constraint* (maxObstacles) rather than a primary placement. This avoids double-processing and simplifies guarantees.  
  - *At least 2 free cells per zone*: a safety invariant; if a zone only has 2 free cells, no obstacles can be added there.  
- **Consequences**:  
  - `obstaclesCount` is capped by `maxObstacles = Σ(zoneFreeCounts[zone] − 2)`. Exceeding throws `RangeError("obstaclesCount is too high to keep at least 2 free cells in each zone")`.  
  - Random expansion (`tryExpandRoom`, frontier BFS) may fail → retried up to `maxAttempts = 64`; throws `"could not generate rooms with the requested constraints"`.  
  - Defensive "c8 ignore next N" splices/ignores prevent index issues when removing elements from arrays while iterating.

## ADR-002: Plugin Pipeline & Validation

- **Context**: `generateHints(..., options)` accepts user-supplied plugins and must handle defaults, filters, validation, deduplication, shuffling, and `hintCount`.
- **Decision**:  
  1. Merge defaults + user options.  
  2. Validate `hintCount` (non-negative integer).  
  3. Set `random`.  
  4. Build `context` → run **built-in plugins** first (`same-zone`, `zone-count`, `adjacent-obstacle`, `cardinal-relation`), **then** user plugins (via `flatMap`).  
  5. Filter by `allowedTypes`, then by `difficulty` (if not "mixed").  
  6. Validate each hint with `validateHint(context, hint)` → keep only valid ones unless `strictMode` is true (then throw `"Invalid hint generated: {type}"`).  
  7. Deduplicate (if `deduplicate: true`) using `dedupeHintKey`.  
  8. `shuffleInPlace(hints, random)`, slice to `hintCount`.
- **Trade-offs / Alternatives**:  
  - Plugin ordering: built-in first, then user. *Alternative*: user plugins before built-in. Chosen to apply built-ins (core semantics) then let user add custom ones.  
  - Validation before/after filter: chosen to validate before filtering so that only valid hints proceed; plugin results are still flattened before dedup.  
- **Consequences**:  
  - Missing `id` in a plugin is tolerated (ignored, not thrown) if `strictMode: false`.  
  - Invalid cardinal hints referencing non-existent persons cause `strictMode: true` to throw `Error("Invalid hint generated: CardinalRelation")`.  
  - `personCount` in `ZoneCountHint` must equal `personsByZone[zoneId].length`.

## ADR-003: Randomness & Determinism

- **Context**: `hintsGenerator` uses `Math.random` for shuffling/placement. Edge cases: non-integer `random`, `NaN` random value, out-of-range indices in frontier loops.
- **Decision**:  
  - Default `random = Math.random`; user may supply a seeding function (`() => number`).  
  - `shuffleInPlace` includes a defensive guard: skip if `rawIndex` is not integer or out of `[0, i]`.  
  - Frontier loops remove the chosen element via `removeAt` and continue.  
  - Zone/room generation retries up to 64 attempts; if random yields out-of-range → throws.
- **Trade-offs / Alternatives**:  
  - Seeding enables deterministic tests (`random: () => 0`, custom sequences).  
  - Random expansion can loop forever; bounded by attempts and repeated room expansion.  
- **Consequences**:  
  - Tests often spy/mock `Math.random` with `vi.spyOn(Math, 'random')`.  
  - "c8 ignore next N" comments are defensive (ignoring the next N items during splicing/removal).

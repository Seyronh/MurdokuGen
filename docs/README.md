# MurdokuGen / dace — `murdokugen` v1.0.2

TypeScript library for generating **Murdoku** (Mistery Sudoku) boards and **semantic hints**.  
It produces three aligned maps:

- `zoneMap` — cell → zone id (`0..n`)
- `solutionMap` — cell → person placement (`0` = empty, `1` = person)
- `obstacleMap` — cell → blocked (`0` = free, `1` = obstacle)

and generates language-agnostic hints about zones, people, and obstacles.

![logo](https://pi.dev/logo-auto.svg)
![discord](https://img.shields.io/badge/discord-community-5865F2?style=flat-square&logo=discord&logoColor=white)
![npm](https://img.shields.io/npm/v/@earendil-works/pi-coding-agent?style=flat-square&logo=npm&logoColor=white)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Quick Start](#2-quick-start)
3. [Installation](#3-installation)
4. [API Reference](#4-api-reference)
   - [`generateMurdoku`](#4.1-generatemurduk)
   - [`generateHints`](#4.2-generatehints)
   - [`formatHint`](#4.3-formathint)
5. [Core Algorithms](#5-core-algorithms)
6. [Hint System](#6-hint-system)
7. [Test Suite](#7-test-suite)
8. [Configuration](#8-configuration)
9. [Architecture & Design Decisions](#9-architecture--design-decisions)
10. [License](#10-license)
11. [File Structure](#11-file-structure)

---

## 1. Project Overview

`murdokugen` (v1.0.2) is a **TypeScript** package that generates valid Murdoku boards — grids filled with:

- **Rooms (zones)** — contiguous regions assigned a `zoneId`. Each zone must contain at least `minRoomSize` (default 3) free cells.
- **People placements** — exactly `min(width, height)` persons placed so that no two share a row or column.
- **Obstacles** — blocked cells added on top of person cells while guaranteeing ≥2 free cells per zone.

For each generated board it also **generates semantic hints**:

- `SameZoneHint` — two people share a zone.
- `ZoneCountHint` — zone has N people.
- `AdjacentObstacleHint` — a person is adjacent to one or more obstacles.
- `CardinalRelationHint` — two people differ in row/col distance in a specific direction.

### Public entry point

```ts
import generateMurdoku from "murdokugen";

const { zoneMap, solutionMap, obstacleMap } = generateMurdoku(
  width = 6,
  height = 6,
  zonesCount = 4,
  obstaclesCount = 8,
);
```

> See the [Quick Start](#quick-start) for usage.

---

## 2. Quick Start

```ts
import generateMurdoku, {
  Direction,
  HintType,
  formatHint,
  generateHints,
  type HintGeneratorPlugin,
} from "murdokugen";

const width = 6;
const height = 6;
const zonesCount = 4;
const obstaclesCount = 8;

const { zoneMap, solutionMap, obstacleMap } = generateMurdoku(
  width,
  height,
  zonesCount,
  obstaclesCount,
);

console.log(zoneMap, solutionMap, obstacleMap);

// Generate hints
const hints = generateHints(
  zoneMap,
  solutionMap,
  obstacleMap,
  {
    hintCount: 8,
    allowedTypes: [HintType.SameZone, HintType.ZoneCount, HintType.AdjacentObstacle, HintType.CardinalRelation],
    difficulty: "mixed",
    includeBuiltIns: true,
    deduplicate: true,
    random: () => 0,
  },
);
for (const hint of hints) {
  console.log(formatHint(hint, {
    personLabel: (id) => `Person ${id}`,
    zoneLabel: (zid) => `Zone ${zid}`,
    directionLabel: (dir) => {
      if (dir === Direction.North) return "north";
      if (dir === Direction.South) return "south";
      if (dir === Direction.East) return "east";
      return "west";
    },
  }));
}
```

---

## 3. Installation

```bash
cd /mnt/Programas/vibecoding/MurdokuGen/dace
pnpm install          # or `npm i`
npm run build         # CJS + ESM + declaration output
npm test              # run vitest
npm run test:coverage # coverage report
```

- **Package manager**: `pnpm@10.33.0`
- **Node.js**: ≥ 22.19
- The repo ships a `.gitignore` and `.npmignore`; node_modules are excluded.

---

## 4. API Reference

### 4.1 `generateMurdoku(width, height, zonesCount, obstaclesCount)`

```ts
function generateMurdoku(width, height, zonesCount, obstaclesCount): { zoneMap: number[][]; solutionMap: number[][]; obstacleMap: number[][] }
```

Returns an object containing three aligned maps. Internally:

1. `zoneMap = zoneGenerator(width, height, zonesCount)`
2. `solutionMap = solutionGenerator(width, height)`  → places one person per row/col
3. `obstacleMap = obstaclesGenerator(zoneMap, solutionMap, obstaclesCount)` → adds obstacles while preserving ≥2 free cells per zone.

**Validation** (raised):

- `width, height, zonesCount, minRoomSize` all integers; inputs ≤ 0 → empty map.
- `rooms * minRoomSize > width*height` → `RangeError`.
- `obstaclesCount` larger than total free cells minus `2 * zones` → `RangeError`.

**Returns** e.g. `[['0','0',...] , ...]` where each row is a `number[][]`.

### 4.2 `generateHints(zoneMap, solutionMap, obstacleMap, options)`

Generates **semantic hints** from the three maps. Options (defaults merged in):

| Option | Default | Effect |
|---|---|---|
| `hintCount` | — | max hints returned |
| `allowedTypes` | — | filter by hint type(s) |
| `difficulty` | `"mixed"` | filter by difficulty level |
| `includeBuiltIns` | `true` | add built-in plugins (`same-zone`, `zone-count`, `adjacent-obstacle`, `cardinal-relation`) |
| `plugins` | `[]` | user-supplied `HintGeneratorPlugin[]` (run *after* built-in, before filtering) |
| `strictMode` | `false` | if `true` and a hint is `Invalid`, throw `"Invalid hint generated: {type}"` |
| `deduplicate` | `true` | if `true`, collapse duplicate hints into one (keyed by `dedupeHintKey`) |
| `random` | `Math.random` | seeding function for `shuffleInPlace` |

**Pipeline** (per `hintsGenerator.ts`):

1. Merge defaults + user options → `mergedOptions`.
2. Throw `TypeError` if `hintCount` isn't a non-negative integer.
3. Set `random = mergedOptions.random ?? Math.random`.
4. Build `context = buildContext(zoneMap, solutionMap, obstacleMap)` — validates maps, builds `persons`, `personsByZone`, `obstaclePositions`.
5. Run **plugins**: `[builtInPlugins..., ...(mergedOptions.plugins ?? [])]` via `flatMap(plugin.generate(context))`.
6. Filter by `allowedTypes` (set → `hints.filter(h=>allowed.has(h.type))`).
7. If `difficulty != "mixed"`, filter further by `hint.difficulty === mergedOptions.difficulty`.
8. Validate each hint with `validateHint`; invalid hints are kept only if `strictMode` is `false`.
9. Deduplicate if requested (keep first occurrence per key).
10. `shuffleInPlace(hints, random)`.
11. Slice to `hintCount` if provided.
12. `withIds` → add suffix `hint_1`, `hint_2`, ….
13. Return the array.

**Return value**: `Hint[]` where each `Hint` is one of the union types: `SameZoneHint`, `ZoneCountHint`, `AdjacentObstacleHint`, `CardinalRelationHint`. Every hint carries an `id: string` (e.g., `"hint_3"`).  

### 4.3 `formatHint(hint, context)`

Formats a hint as human language using optional `personLabel`, `zoneLabel`, `directionLabel`, and `templates`.

| `hint.type` | Output pattern |
|---|---|
| `SameZoneHint` | `"Person A and Person B are in Zone Z"` |
| `ZoneCountHint` | `"Zone Z has N people"` |
| `AdjacentObstacleHint` | `"Person A is adjacent to an obstacle (north, east, …)"` |
| otherwise (CardinalRelation or generic) | `"Person A is {direction} of Person B"` |

**Formatting options**:

```ts
formatHint(hint, {
  personLabel: (id) => `Persona-${id}`,
  zoneLabel: (zid) => `Sala-${zid}`,
  directionLabel: (d) => { if (d===Direction.North) return "norte"; ... },
  templates: { [HintType.SameZone]: () => "Custom" },
})
```

---

## 5. Core Algorithms

### 5.1 Room / Zone Generator (`zoneGenerator`)

Generates `zoneMap` (cell → room id). Steps:

1. **Validation** — integers, positive; `totalCells = width*height`; `rooms <= totalCells`; `rooms*minRoomSize <= totalCells`.
2. Loop up to `maxAttempts = 64`:
   a. Create a random permutation of cell indices (`availableCells`), seed `usedRows`/`usedCols`, and assign rooms by `cellIndex % width` / `Math.floor(cellIndex/width)`.
   b. Initialize `frontiers` (rooms' frontier cells) and `roomSizes`.
   c. **`while(true)` loop**:
      - Detect underfilled rooms (room sizes < `minRoomSize`).
      - If none underfilled → **break** (success).
      - Otherwise pick a random underfilled room; call `tryExpandRoom`.
      - `tryExpandRoom` repeatedly:
        - Picks a random frontier cell.
        - Finds unvisited (map == -1) neighbors of that frontier cell → these become new frontier cells, assigned to the same room.
        - If a neighbor is free and all its neighbors are already assigned → push to frontier, mark assigned, and return true (room expanded).
        - Otherwise pop the removed front cell, continue until no more expansions.
      - If expansion failed, mark room failed and `continue` (try again).
   d. After failed-room check → while `assignedCells < totalCells`:
      - Pick a random start room; for attempts 0..rooms-1, try `tryExpandRoom`. If no expansion → fail.
2. If all rooms expanded → return `map`.
3. If loop exhausts → throw `Error("could not generate rooms with the requested constraints")`.

Key points: "c8 ignore next N" defensive/ignored comments exist in several functions (frontier pop, next neighbor, etc.). `getNeighbors` uses 4-direction adjacency (up/down/left/right).

### 5.2 Person Solution Generator (`solutionGenerator`)

Generates `solutionMap` (cell → 0/1 person). Uses **backtracking**:

- `board` = `Array(height)[]` of `Array(width).fill(0)`.
- `usedRows`/`usedCols` sets. Placement `placements: [{row,col}]`. `rowOrder = shuffle([0..height-1])`.
- `backtrack(placed)`: if `placed === persons` (i.e., `Math.min(width, height)`) → true; else iterate over `remainingRows` (rows not yet used, in random order), shuffle columns, iterate columns, pick first (row, col) not conflicting, mark, recurse. Return false if no valid placement found.
- After placement, fill 1's on `board[placement.row][placement.col]`.
- Throws if no solution found (e.g., too many constraints or odd dimensions).

### 5.3 Obstacle Generator (`obstaclesGenerator`)

Starts from `solutionMap` (1 = person). For each cell:
- If cell == 0 (free), mark as 0 in `obstacleMap`.
- Then collect all **free cells** (where `solutionMap==0`) grouped by their `zone` (from `zoneMap`). Count free cells per zone → `zoneFreeCounts`.
- `maxObstacles = Σ over zones (zoneFreeCounts[zone] - 2)`, i.e., enough free cells left per zone. If `obstaclesCount > maxObstacles` → throw.
- Fill obstacles one by one:
  - For each obstacle index, filter `freeIndexes` to those cells whose zone still has `>2` remaining free cells.
  - Pick random eligible, set `obstacleMap[idx][idx]=1`, decrement that zone's `zoneFreeCounts`, then remove `idx` from `freeIndexes` (and splicing).
  - Guard against `NaN` from `Math.random`.
- Return obstacle map.

### 5.4 Hint Generation Pipeline (summary from `hintsGenerator.ts`)

- `buildContext` reads `zoneMap`, `solutionMap`, `obstacleMap`; throws on non-rectangular maps, non-integer zone IDs, and invalid values in maps/solution/obstacles.
- `plugins.flatMap` → `sameZonePlugin`, `zoneCountPlugin`, `adjacentObstaclePlugin`, `cardinalRelationPlugin`, then user plugins.
- Built-in plugins generate hints keyed by `id: "same-zone"`, `"zone-count"`, `"adjacent-obstacle"`, `"cardinal-relation"`.
- Plugin results are then filtered by `allowedTypes`, then by `difficulty`, then validated, deduped, shuffled, and suffixed.

---

## 6. Hint System

**Hint types** (from `hintTypes.ts`):

| Type | Payload key fields | Meaning |
|---|---|---|
| `SameZoneHint` | `personIds: [a,b]`, `zoneId` | Both people are in zone `zoneId`. |
| `ZoneCountHint` | `zoneId`, `personCount` | Zone `zoneId` has `personCount` people. |
| `AdjacentObstacleHint` | `personId`, `obstaclePositions: [{row,col}]`, `directions: [Direction]` | Person is adjacent to those obstacles. |
| `CardinalRelationHint` | `personId`, `referencePersonId`, `direction`, `distance` | Directional row/col distance to another person. |

**Difficulty**: hint difficulty set per hint at generation (`"easy"`, `"medium"`, `"hard"`, `"mixed"`). Default for new hints is `"mixed"`.

**Formatting** (`formatHint`):

- `SameZoneHint` → `"Person A and Person B are in Zone Z"`.
- `ZoneCountHint` → `"Zone Z has N people"`.
- `AdjacentObstacleHint` → `"Person A is adjacent to an obstacle (north, east, …)"`.
- Otherwise → `"Person A is N of B"` with direction label.

**Custom templates** via `templates: { [HintType]: fn }`.

**Example output** (from tests):

```
hint_1: SameZone of Zone 0
hint_2: Zone Count of Zone 0 has 5 people
hint_3: Person 1 is adjacent to an obstacle (north, south)
```

---

## 7. Test Suite

All tests use **vitest** (`vitest.config.ts`), coverage provider v8, text/html report, 100% thresholds on lines/statements/functions/branches.

| Test file | Covers |
|---|---|
| `tests/index.test.ts` | `generateMurdoku` returns full payload (shape + dimensions). |
| `tests/obstaclesGenerator.test.ts` | Height/width mismatch, row-width mismatch, too many obstacles, default when `obstaclesCount=0`, ≥2 free cells/zone, NaN random, etc. |
| `tests/zoneGenerator.test.ts` | Non-integer args → TypeError; ≤0 → `[]`; impossible rooms → RangeError; valid map; fails after max attempts; out-of-range random. |
| `tests/solutionGenerator.test.ts` | Non-integer → TypeError; non-positive → RangeError; one person per row/col; total persons = min(w,h); row/col ≤1; no solution. |
| `tests/hintsGenerator.test.ts` | Non-rectangular maps, built-in hints, allowedTypes, difficulty, hintCount (0/1000), deduplicate true/false, i18n formatting, single person, adjacent obstacles, cardinal relations (N/S/E/W), templates, seeding randomness, edge cases (1×1), all obstacles, invalid plugins, strictMode validation, out-of-range person IDs, many zones. |

**AAA pattern** in every test:
- Arrange: import, build/spy on `Math.random`.
- Act: call generator / `generateHints(...)` / `formatHint(...)`.
- Assert: `toThrow`, `toEqual`, `toBeGreaterThanOrEqual`, `toContain`, length checks.

---

## 8. Configuration

- **`vitest.config.ts`** — `defineConfig({ test: { coverage: { provider: "v8", include: ["src/**/*.ts"], reporter: ["text","html"], thresholds: { lines:100, statements:100, functions:100, branches:100 } } } })`. Runs only `src/**/*.ts`.
- **tsconfigs**:
  - `tsconfig.cjs.json` → CommonJS, `module: "CommonJS"`, `outDir: "dist/cjs"`, `target: "ES2019"`.
  - `tsconfig.build.json` → includes `./src`, `outDir: "dist"`, `module: "nodenext"`, `target: "esnext"`, `strict: true`, `isolatedModules: true`.
  - `tsconfig.esm.json` → ESM, `module: "ES2020"`, `target: "ES2019"`, `outDir: "dist/esm"`.
- **`package.json`** scripts: `build`, `build:cjs`, `build:esm`, `test`, `test:coverage`.
- **Lockfile**: `pnpm-lock.yaml` (pnpm 10.33.0).

---

## 9. Architecture & Design Decisions (ADR)

### ADR-001: Three Maps (`zoneMap`, `solutionMap`, `obstacleMap`) and Transformation Order

**Context** — The library needs to produce three aligned maps and then combine obstacles with person cells. `obstaclesGenerator(zoneMap, solutionMap, obstaclesCount)` takes `zoneMap` and `solutionMap` as inputs, producing `obstacleMap`.

**Decision** — 
- `zoneMap` first (rooms). `solutionMap` second (people). `obstacleMap` third (obstacles on top).
- `obstaclesGenerator` **starts from the person solution map**: free cells (value 0 in `solutionMap`) are marked non-obstacle, then obstacles are placed on those free cells respecting zone free-cell quotas. This guarantees people cells are always blocked (1) and only adds extra obstacles elsewhere.

**Trade-offs / Alternatives** —
- *Alternative*: generate obstacles first, then place people in remaining free cells. Chosen alternative: place people first (solved via backtracking) then restrict obstacle placement to free cells → guarantees people cells blocked by construction. Simpler guarantees and avoids double-processing.
- Keeping ≥2 free cells per zone is a safety invariant; if a zone has only 2 free cells, no obstacles can be added there.

**Consequences** —
- `obstaclesCount` is capped by `maxObstacles` (sum over zones of free cells − 2). Exceeding throws a `RangeError` (e.g., "obstaclesCount is too high to keep at least 2 free cells in each zone").
- Random expansion may fail if room constraints impossible; handled by retry loop and final `throw`.

### ADR-002: Plugin Pipeline & Validation

**Context** — `generateHints` accepts user-supplied plugins and must filter, validate, deduplicate, and shuffle hints.

**Decision** — Built-in plugins run first (`flatMap`), then user plugins appended. Validation (`validateHint`) is applied before deduplication/shuffling. `strictMode` throws on invalid hints rather than silently dropping them.

**Trade-offs / Alternatives** —
- *Plugins before/after validation*: chosen to validate first; plugin results filtered, then validated, then deduped, then shuffled. This prevents a malformed plugin hint from slipping through.
- `shuffleInPlace` uses `Math.floor(random() * (i + 1))` with defensive checks (non-integer guard, bounds check).

**Consequences** —
- Plugin IDs must be strings; missing `id` in a plugin triggers non-throw when `plugins` is supplied but ignored (handled by missing-id test).
- Person IDs must exist in `context.persons`; invalid cardinal hints cause `strictMode` throw ("Invalid hint generated: CardinalRelation") or silent drop (`strictMode: false`).

### ADR-003: Randomness & Determinism

**Context** — `hintsGenerator` uses `Math.random` for shuffling and placement, exposing NaN edge cases.

**Decision** — `random` option defaults to `Math.random`; user may supply a seeding function. `shuffleInPlace` guards against non-integer/future random indices (defensive). `tryExpandRoom` and `zoneGenerator` splicing removes the affected element and continue.

**Trade-offs / Alternatives** —
- Random expansion can loop forever; bounded by `maxAttempts = 64` and repeated room expansion. If still failing, throws.
- Seeding allows deterministic test runs (e.g., `random: () => 0` in tests).

**Consequences** —
- Tests often mock `Math.random` via `vi.spyOn(Math, 'random').mockReturnValue(0)` or custom sequences.
- Some code paths (frontier pop, neighbor removal) include "c8 ignore next N" comments — defensive/ignored branches to avoid accidentally processing a removed element.

---

## 10. License

**GNU Affero General Public License, Version 3** — see `LICENSE`. The project includes the full text of the AGPL-3.0 terms and conditions (see LICENSE file). Applies to source and object code distribution, conveying, and modification.

---

## 11. File Structure

```
murdokuGen/dace/
├── .git/                     (initial commit a6bdbdb "1.0.2")
├── .gitignore
├── .npmignore
├── LICENSE                  (AGPL-3.0)
├── pnpm-lock.yaml
├── README.md                # this file
├── tsconfig.cjs.json
├── tsconfig.build.json
└── tsconfig.esm.json
package.json
tests/
├── index.test.ts
├── obstaclesGenerator.test.ts
├── zoneGenerator.test.ts
├── solutionGenerator.test.ts
└── hintsGenerator.test.ts
```

### Source layout (`src/`)
- `hintTypes.ts` — type definitions & enums.
- `hintsGenerator.ts` — core generation/formatting/validation logic.
- `obstaclesGenerator.ts`, `zoneGenerator.ts`, `solutionGenerator.ts`.

### Test layout (`tests/`)
- `index.test.ts` — top-level `generateMurdoku` shape test.
- Individual generator tests.
- `hintsGenerator.test.ts` — comprehensive (formatting, plugins, edge cases).

### Exports (`src/index.ts`)
- `default export: generateMurdoku`
- `export { generateHints, formatHint }`
- `export namespace from hintTypes: Direction, HintType, type …, PersonPosition`

---

*Document generated as part of the codebase inventory. All source files are read directly from disk.*

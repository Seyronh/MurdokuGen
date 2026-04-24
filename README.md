# MurdokuGen

TypeScript library to generate Murdoku boards and semantic hints.

It produces three aligned maps:

- `zoneMap`: zone id per cell (`0..n`)
- `solutionMap`: people placement (`0` empty, `1` person)
- `obstacleMap`: blocked cells (`0` free, `1` obstacle)

## Installation

```bash
npm install murdokugen
```

## Quick Start

```ts
import generateMurdoku from "murdokugen";

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
```

## API

### `generateMurdoku(width, height, zonesCount, obstaclesCount)`

Returns:

```ts
{
  zoneMap: number[][];
  solutionMap: number[][];
  obstacleMap: number[][];
}
```

Behavior summary:

- `solutionMap` places `min(width, height)` people (`1`s), with at most one person per row and per column.
- `obstacleMap` always keeps people cells blocked (`1`) and adds extra obstacles respecting zone limits.
- Zone generation enforces contiguous zones and validates impossible inputs.

## Hint System

The library can generate language-agnostic hints and then format them with your own labels/templates.

```ts
import generateMurdoku, {
  Direction,
  HintType,
  formatHint,
  generateHints,
  type HintGeneratorPlugin,
} from "murdokugen";

const { zoneMap, solutionMap, obstacleMap } = generateMurdoku(6, 6, 4, 6);

const customHintPlugin: HintGeneratorPlugin = {
  id: "custom-zone-focus",
  generate: (context) => {
    const zoneZeroCount = context.personsByZone.get(0)?.length ?? 0;

    return [
      {
        id: "",
        type: HintType.ZoneCount,
        difficulty: "easy",
        payload: {
          zoneId: 0,
          personCount: zoneZeroCount,
        },
      },
    ];
  },
};

const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
  hintCount: 8,
  plugins: [customHintPlugin],
  allowedTypes: [
    HintType.SameZone,
    HintType.ZoneCount,
    HintType.AdjacentObstacle,
    HintType.CardinalRelation,
  ],
  difficulty: "mixed",
  includeBuiltIns: true,
  deduplicate: true,
  strictMode: false,
});

for (const hint of hints) {
  const text = formatHint(hint, {
    personLabel: (personId) => `Person ${personId}`,
    zoneLabel: (zoneId) => `Zone ${zoneId}`,
    directionLabel: (direction) => {
      if (direction === Direction.North) return "north";
      if (direction === Direction.South) return "south";
      if (direction === Direction.East) return "east";
      return "west";
    },
  });

  console.log(hint.id, text);
}
```

### Built-in hint types

- `HintType.SameZone`
- `HintType.ZoneCount`
- `HintType.AdjacentObstacle`
- `HintType.CardinalRelation`

### `generateHints(..., options)`

Options:

- `hintCount?: number`
- `allowedTypes?: HintType[]`
- `difficulty?: "easy" | "medium" | "hard" | "mixed"`
- `includeBuiltIns?: boolean` (default `true`)
- `plugins?: HintGeneratorPlugin[]`
- `strictMode?: boolean` (default `false`)
- `deduplicate?: boolean` (default `true`)
- `random?: () => number`

### `formatHint(hint, context)`

Formatting context:

- `personLabel?: (personId: number) => string`
- `zoneLabel?: (zoneId: number) => string`
- `directionLabel?: (direction: Direction) => string`
- `templates?: Partial<Record<HintType, (hint: Hint) => string>>`

## Development

```bash
npm run build
npm test
npm run test:coverage
```

## License

ISC

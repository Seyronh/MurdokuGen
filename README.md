# MurdokuGen

A library that generates Mordokus maps with the solutions
ejemplo:
import solutionGenerator from "./solutionGenerator";
import zoneGenerator from "./zoneGenerator";
import obstaclesGenerator from "./obstaclesGenerator";

const width = 6;
const height = 6;
const persons = 6;
const zones = 4;
const obstaclesCount = 10;

for (let i = 0; i < 3; i++) {
const map = zoneGenerator(width, height, zones);
const solution = solutionGenerator(width, height, persons);
const obstacleMap = obstaclesGenerator(map, solution, obstaclesCount);

let mapStr = "";
for (let r = 0; r < height; r++) {
let rowStr = "";
for (let c = 0; c < width; c++) {
const cell = map[r]![c]!;
if (solution[r]![c] === 1) {
rowStr += "👤";
continue;
}
if (obstacleMap[r]![c] === 1) {
rowStr += "🟫";
continue;
}
if (cell == 0) {
rowStr += "🟦";
} else if (cell == 1) {
rowStr += "🟩";
} else if (cell == 2) {
rowStr += "🟨";
} else if (cell == 3) {
rowStr += "🟧";
} else if (cell == 4) {
rowStr += "🟥";
} else {
rowStr += "⬛";
}
}
rowStr += "\n";
mapStr += rowStr;
}
console.log(mapStr);
}

## Hints system

The library can generate semantic hints with no fixed language.
You can map person/zone ids to your own labels and text templates.

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
});

for (const hint of hints) {
  const text = formatHint(hint, {
    personLabel: (personId) => `Persona ${personId}`,
    zoneLabel: (zoneId) => `Zona ${zoneId}`,
    directionLabel: (direction) => {
      if (direction === Direction.North) return "norte";
      if (direction === Direction.South) return "sur";
      if (direction === Direction.East) return "este";
      return "oeste";
    },
  });

  console.log(text);
}
```

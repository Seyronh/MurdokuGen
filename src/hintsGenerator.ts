import {
  Direction,
  type GenerateHintsOptions,
  type Hint,
  type HintCoordinate,
  type HintDifficulty,
  type HintFormatterContext,
  type HintGenerationContext,
  type HintGeneratorPlugin,
  HintType,
  type PersonPosition,
} from "./hintTypes";

const DEFAULT_OPTIONS: Required<
  Pick<
    GenerateHintsOptions,
    "difficulty" | "includeBuiltIns" | "strictMode" | "deduplicate"
  >
> = {
  difficulty: "mixed",
  includeBuiltIns: true,
  strictMode: false,
  deduplicate: true,
};

function assertRectangularMap(
  map: number[][],
  expectedHeight: number,
  expectedWidth: number,
  label: string,
): void {
  if (map.length !== expectedHeight) {
    throw new RangeError(`${label} must have the same height as zoneMap`);
  }

  for (const row of map) {
    if (row.length !== expectedWidth) {
      throw new RangeError(`${label} must have the same width as zoneMap`);
    }
  }
}

function buildContext(
  zoneMap: number[][],
  solutionMap: number[][],
  obstacleMap: number[][],
): HintGenerationContext {
  if (zoneMap.length === 0 || zoneMap[0]?.length === 0) {
    throw new RangeError("maps must be non-empty");
  }

  const height = zoneMap.length;
  const width = zoneMap[0]!.length;

  assertRectangularMap(solutionMap, height, width, "solutionMap");
  assertRectangularMap(obstacleMap, height, width, "obstacleMap");

  const persons: PersonPosition[] = [];
  const personsByZone = new Map<number, number[]>();
  const obstaclePositions: HintCoordinate[] = [];

  let personId = 1;

  for (let row = 0; row < height; row++) {
    const zoneRow = zoneMap[row]!;
    const solutionRow = solutionMap[row]!;
    const obstacleRow = obstacleMap[row]!;

    for (let col = 0; col < width; col++) {
      const zoneId = zoneRow[col]!;
      const solutionValue = solutionRow[col]!;
      const obstacleValue = obstacleRow[col]!;

      if (!Number.isInteger(zoneId) || zoneId < 0) {
        throw new TypeError(
          "zoneMap must contain non-negative integer zone ids",
        );
      }

      if (solutionValue !== 0 && solutionValue !== 1) {
        throw new TypeError("solutionMap must contain only 0 or 1 values");
      }

      if (obstacleValue !== 0 && obstacleValue !== 1) {
        throw new TypeError("obstacleMap must contain only 0 or 1 values");
      }

      if (solutionValue === 1) {
        const person: PersonPosition = { personId, row, col, zoneId };
        persons.push(person);
        personsByZone.set(zoneId, [
          ...(personsByZone.get(zoneId) ?? []),
          personId,
        ]);
        personId++;
      }

      if (obstacleValue === 1) {
        obstaclePositions.push({ row, col });
      }
    }
  }

  return {
    zoneMap,
    solutionMap,
    obstacleMap,
    persons,
    personsByZone,
    obstaclePositions,
  };
}

function shuffleInPlace<T>(items: T[], random: () => number): void {
  for (let i = items.length - 1; i > 0; i--) {
    const rawIndex = Math.floor(random() * (i + 1));
    // c8 ignore next - defensive check: Math.floor always returns an integer in valid range
    if (!Number.isInteger(rawIndex) || rawIndex < 0 || rawIndex > i) {
      continue;
    }

    const temp = items[i];
    items[i] = items[rawIndex] as T;
    items[rawIndex] = temp as T;
  }
}

function makeDirectionalHint(
  subject: PersonPosition,
  reference: PersonPosition,
): Hint | undefined {
  if (subject.personId === reference.personId) {
    return undefined;
  }

  if (subject.col === reference.col) {
    const distance = Math.abs(subject.row - reference.row);
    // c8 ignore next - defensive check: different persons can't have distance 0
    if (distance === 0) return undefined;

    return {
      id: "",
      type: HintType.CardinalRelation,
      difficulty: "hard",
      payload: {
        personId: subject.personId,
        referencePersonId: reference.personId,
        direction:
          subject.row > reference.row ? Direction.South : Direction.North,
        distance,
      },
    };
  }

  if (subject.row === reference.row) {
    const distance = Math.abs(subject.col - reference.col);
    // c8 ignore next - defensive check: different persons can't have distance 0
    if (distance === 0) return undefined;

    return {
      id: "",
      type: HintType.CardinalRelation,
      difficulty: "hard",
      payload: {
        personId: subject.personId,
        referencePersonId: reference.personId,
        direction:
          subject.col > reference.col ? Direction.East : Direction.West,
        distance,
      },
    };
  }

  return undefined;
}

function dedupeHintKey(hint: Hint): string {
  if (hint.type === HintType.SameZone) {
    const ordered = [...hint.payload.personIds].sort((a, b) => a - b);
    return `${hint.type}:${hint.payload.zoneId}:${ordered.join(",")}`;
  }

  if (hint.type === HintType.ZoneCount) {
    return `${hint.type}:${hint.payload.zoneId}:${hint.payload.personCount}`;
  }

  if (hint.type === HintType.AdjacentObstacle) {
    const dirs = [...hint.payload.directions].sort().join(",");
    return `${hint.type}:${hint.payload.personId}:${dirs}`;
  }

  return `${hint.type}:${hint.payload.personId}:${hint.payload.referencePersonId}:${hint.payload.direction}:${hint.payload.distance}`;
}

function validateHint(context: HintGenerationContext, hint: Hint): boolean {
  if (hint.type === HintType.ZoneCount) {
    const count = context.personsByZone.get(hint.payload.zoneId)?.length ?? 0;
    return count === hint.payload.personCount;
  }

  if (hint.type === HintType.SameZone) {
    const personA = context.persons.find(
      (p) => p.personId === hint.payload.personIds[0],
    );
    const personB = context.persons.find(
      (p) => p.personId === hint.payload.personIds[1],
    );
    if (!personA || !personB) return false;
    return (
      personA.zoneId === personB.zoneId &&
      personA.zoneId === hint.payload.zoneId
    );
  }

  if (hint.type === HintType.AdjacentObstacle) {
    const person = context.persons.find(
      (p) => p.personId === hint.payload.personId,
    );
    if (!person) return false;

    const hasDirection = (direction: Direction): boolean => {
      if (direction === Direction.North) {
        return hint.payload.obstaclePositions.some(
          (o) => o.row === person.row - 1 && o.col === person.col,
        );
      }
      if (direction === Direction.South) {
        return hint.payload.obstaclePositions.some(
          (o) => o.row === person.row + 1 && o.col === person.col,
        );
      }
      if (direction === Direction.East) {
        return hint.payload.obstaclePositions.some(
          (o) => o.row === person.row && o.col === person.col + 1,
        );
      }
      return hint.payload.obstaclePositions.some(
        (o) => o.row === person.row && o.col === person.col - 1,
      );
    };

    return (
      hint.payload.directions.length > 0 &&
      hint.payload.directions.every(hasDirection)
    );
  }

  const subject = context.persons.find(
    (p) => p.personId === hint.payload.personId,
  );
  const reference = context.persons.find(
    (p) => p.personId === hint.payload.referencePersonId,
  );

  if (!subject || !reference) {
    return false;
  }

  if (hint.payload.direction === Direction.North) {
    return (
      subject.col === reference.col &&
      reference.row - subject.row === hint.payload.distance
    );
  }
  if (hint.payload.direction === Direction.South) {
    return (
      subject.col === reference.col &&
      subject.row - reference.row === hint.payload.distance
    );
  }
  if (hint.payload.direction === Direction.East) {
    return (
      subject.row === reference.row &&
      subject.col - reference.col === hint.payload.distance
    );
  }

  return (
    subject.row === reference.row &&
    reference.col - subject.col === hint.payload.distance
  );
}

const sameZonePlugin: HintGeneratorPlugin = {
  id: "same-zone",
  generate: (context) => {
    const hints: Hint[] = [];

    for (const [zoneId, personIds] of context.personsByZone.entries()) {
      if (personIds.length < 2) continue;

      for (let i = 0; i < personIds.length; i++) {
        const personA = personIds[i];
        // c8 ignore next - defensive check: array always has defined elements
        if (personA === undefined) continue;

        for (let j = i + 1; j < personIds.length; j++) {
          const personB = personIds[j];
          // c8 ignore next - defensive check: array always has defined elements
          if (personB === undefined) continue;

          hints.push({
            id: "",
            type: HintType.SameZone,
            difficulty: "medium",
            payload: {
              personIds: [personA, personB],
              zoneId,
            },
          });
        }
      }
    }

    return hints;
  },
};

const zoneCountPlugin: HintGeneratorPlugin = {
  id: "zone-count",
  generate: (context) => {
    const zoneIds = new Set<number>();

    for (const row of context.zoneMap) {
      for (const zoneId of row) {
        zoneIds.add(zoneId);
      }
    }

    const hints: Hint[] = [];

    for (const zoneId of zoneIds) {
      hints.push({
        id: "",
        type: HintType.ZoneCount,
        difficulty: "easy",
        payload: {
          zoneId,
          personCount: context.personsByZone.get(zoneId)?.length ?? 0,
        },
      });
    }

    return hints;
  },
};

const adjacentObstaclePlugin: HintGeneratorPlugin = {
  id: "adjacent-obstacle",
  generate: (context) => {
    const hints: Hint[] = [];

    for (const person of context.persons) {
      const obstaclePositions: HintCoordinate[] = [];
      const directions: Direction[] = [];

      for (const obstacle of context.obstaclePositions) {
        if (obstacle.row === person.row - 1 && obstacle.col === person.col) {
          directions.push(Direction.North);
          obstaclePositions.push(obstacle);
        } else if (
          obstacle.row === person.row + 1 &&
          obstacle.col === person.col
        ) {
          directions.push(Direction.South);
          obstaclePositions.push(obstacle);
        } else if (
          obstacle.row === person.row &&
          obstacle.col === person.col + 1
        ) {
          directions.push(Direction.East);
          obstaclePositions.push(obstacle);
        } else if (
          obstacle.row === person.row &&
          obstacle.col === person.col - 1
        ) {
          directions.push(Direction.West);
          obstaclePositions.push(obstacle);
        }
      }

      if (directions.length === 0) {
        continue;
      }

      hints.push({
        id: "",
        type: HintType.AdjacentObstacle,
        difficulty: "medium",
        payload: {
          personId: person.personId,
          obstaclePositions,
          directions: Array.from(new Set(directions)),
        },
      });
    }

    return hints;
  },
};

const cardinalRelationPlugin: HintGeneratorPlugin = {
  id: "cardinal-relation",
  generate: (context) => {
    const hints: Hint[] = [];

    for (let i = 0; i < context.persons.length; i++) {
      const subject = context.persons[i];
      // c8 ignore next - defensive check: array always has defined elements
      if (!subject) continue;

      for (let j = 0; j < context.persons.length; j++) {
        const reference = context.persons[j];
        // c8 ignore next - defensive check: array always has defined elements
        if (!reference) continue;

        const hint = makeDirectionalHint(subject, reference);
        if (hint) {
          hints.push(hint);
        }
      }
    }

    return hints;
  },
};

const builtInPlugins: HintGeneratorPlugin[] = [
  sameZonePlugin,
  zoneCountPlugin,
  adjacentObstaclePlugin,
  cardinalRelationPlugin,
];

function withIds(hints: Hint[]): Hint[] {
  return hints.map((hint, index) => ({ ...hint, id: `hint_${index + 1}` }));
}

export function generateHints(
  zoneMap: number[][],
  solutionMap: number[][],
  obstacleMap: number[][],
  options: GenerateHintsOptions = {},
): Hint[] {
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (
    mergedOptions.hintCount !== undefined &&
    (!Number.isInteger(mergedOptions.hintCount) || mergedOptions.hintCount < 0)
  ) {
    throw new TypeError("hintCount must be a non-negative integer");
  }

  const random = mergedOptions.random ?? Math.random;
  const context = buildContext(zoneMap, solutionMap, obstacleMap);

  const plugins: HintGeneratorPlugin[] = [
    ...(mergedOptions.includeBuiltIns ? builtInPlugins : []),
    ...(mergedOptions.plugins ?? []),
  ];

  let hints = plugins.flatMap((plugin) => plugin.generate(context));

  if (mergedOptions.allowedTypes && mergedOptions.allowedTypes.length > 0) {
    const allowed = new Set(mergedOptions.allowedTypes);
    hints = hints.filter((hint) => allowed.has(hint.type));
  }

  if (mergedOptions.difficulty !== "mixed") {
    hints = hints.filter(
      (hint) => hint.difficulty === mergedOptions.difficulty,
    );
  }

  const validatedHints: Hint[] = [];

  for (const hint of hints) {
    const isValid = validateHint(context, hint);

    if (!isValid) {
      if (mergedOptions.strictMode) {
        throw new Error(`Invalid hint generated: ${hint.type}`);
      }
      continue;
    }

    validatedHints.push(hint);
  }

  if (mergedOptions.deduplicate) {
    const seen = new Set<string>();
    hints = validatedHints.filter((hint) => {
      const key = dedupeHintKey(hint);
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  } else {
    hints = validatedHints;
  }

  shuffleInPlace(hints, random);

  if (mergedOptions.hintCount !== undefined) {
    hints = hints.slice(0, mergedOptions.hintCount);
  }

  return withIds(hints);
}

function defaultDirectionLabel(direction: Direction): string {
  if (direction === Direction.North) return "north";
  if (direction === Direction.South) return "south";
  if (direction === Direction.East) return "east";
  return "west";
}

export function formatHint(
  hint: Hint,
  context: HintFormatterContext = {},
): string {
  const template = context.templates?.[hint.type];
  if (template) {
    return template(hint);
  }

  const personLabel =
    context.personLabel ?? ((personId: number) => `Person ${personId}`);
  const zoneLabel = context.zoneLabel ?? ((zoneId: number) => `Zone ${zoneId}`);
  const directionLabel = context.directionLabel ?? defaultDirectionLabel;

  if (hint.type === HintType.SameZone) {
    const [personA, personB] = hint.payload.personIds;
    return `${personLabel(personA)} and ${personLabel(personB)} are in ${zoneLabel(
      hint.payload.zoneId,
    )}`;
  }

  if (hint.type === HintType.ZoneCount) {
    return `${zoneLabel(hint.payload.zoneId)} has ${hint.payload.personCount} people`;
  }

  if (hint.type === HintType.AdjacentObstacle) {
    const directions = hint.payload.directions.map(directionLabel).join(", ");
    return `${personLabel(hint.payload.personId)} is adjacent to an obstacle (${directions})`;
  }

  return `${personLabel(hint.payload.personId)} is ${directionLabel(
    hint.payload.direction,
  )} of ${personLabel(hint.payload.referencePersonId)}`;
}

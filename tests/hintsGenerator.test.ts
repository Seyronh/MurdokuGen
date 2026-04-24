import { describe, expect, test } from "vitest";
import {
  Direction,
  type Hint,
  type HintGenerationContext,
  type HintGeneratorPlugin,
  HintType,
} from "../src/hintTypes";
import { formatHint, generateHints } from "../src/hintsGenerator";

describe("generateHints", () => {
  const zoneMap = [
    [0, 0, 1, 1],
    [0, 2, 2, 1],
    [3, 3, 2, 1],
    [3, 3, 2, 2],
  ];

  const solutionMap = [
    [1, 0, 1, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 1],
    [1, 0, 0, 0],
  ];

  const obstacleMap = [
    [1, 1, 1, 0],
    [0, 1, 0, 1],
    [0, 0, 0, 1],
    [1, 0, 0, 0],
  ];

  test("throws for non-rectangular maps", () => {
    expect(() =>
      generateHints(
        [[0, 0]],
        [
          [1, 0],
          [0, 1],
        ],
        [[1, 0]],
      ),
    ).toThrow(RangeError);
  });

  test("creates semantic hints for built-in generators", () => {
    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      random: () => 0,
    });

    expect(hints.length).toBeGreaterThan(0);

    for (const hint of hints) {
      expect(hint.id.startsWith("hint_")).toBe(true);
      expect(Object.values(HintType)).toContain(hint.type);
    }
  });

  test("can express requested hint categories", () => {
    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      random: () => 0,
    });

    expect(hints.some((hint) => hint.type === HintType.SameZone)).toBe(true);
    expect(hints.some((hint) => hint.type === HintType.ZoneCount)).toBe(true);
    expect(hints.some((hint) => hint.type === HintType.AdjacentObstacle)).toBe(
      true,
    );
    expect(hints.some((hint) => hint.type === HintType.CardinalRelation)).toBe(
      true,
    );
  });

  test("filters by hint type and amount", () => {
    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      hintCount: 2,
      allowedTypes: [HintType.ZoneCount],
      random: () => 0,
    });

    expect(hints).toHaveLength(2);
    for (const hint of hints) {
      expect(hint.type).toBe(HintType.ZoneCount);
    }
  });

  test("supports custom plugins and strict mode validation", () => {
    const validPlugin: HintGeneratorPlugin = {
      id: "custom-valid",
      generate: (_context: HintGenerationContext): Hint[] => [
        {
          id: "",
          type: HintType.ZoneCount,
          difficulty: "easy",
          payload: {
            zoneId: 0,
            personCount: 1,
          },
        },
      ],
    };

    const invalidPlugin: HintGeneratorPlugin = {
      id: "custom-invalid",
      generate: (_context: HintGenerationContext): Hint[] => [
        {
          id: "",
          type: HintType.ZoneCount,
          difficulty: "easy",
          payload: {
            zoneId: 0,
            personCount: 99,
          },
        },
      ],
    };

    const relaxed = generateHints(zoneMap, solutionMap, obstacleMap, {
      includeBuiltIns: false,
      plugins: [validPlugin, invalidPlugin],
      strictMode: false,
      random: () => 0,
    });

    expect(relaxed).toHaveLength(1);
    expect(relaxed[0]?.payload).toEqual({ zoneId: 0, personCount: 1 });

    expect(() =>
      generateHints(zoneMap, solutionMap, obstacleMap, {
        includeBuiltIns: false,
        plugins: [invalidPlugin],
        strictMode: true,
      }),
    ).toThrow("Invalid hint generated");
  });

  test("formats hints with custom labels for i18n/theming", () => {
    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      allowedTypes: [HintType.CardinalRelation],
      hintCount: 1,
      random: () => 0,
    });

    const hint = hints[0];
    expect(hint).toBeDefined();
    if (!hint || hint.type !== HintType.CardinalRelation) {
      return;
    }

    const text = formatHint(hint, {
      personLabel: (personId) => `Persona-${personId}`,
      zoneLabel: (zoneId) => `Sala-${zoneId}`,
      directionLabel: (direction) => {
        if (direction === Direction.North) return "norte";
        if (direction === Direction.South) return "sur";
        if (direction === Direction.East) return "este";
        return "oeste";
      },
    });

    expect(text).toContain("Persona-");
    expect(
      ["norte", "sur", "este", "oeste"].some((dir) => text.includes(dir)),
    ).toBe(true);
  });
});

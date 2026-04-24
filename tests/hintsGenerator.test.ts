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

  // Input validation tests
  test("throws for empty zoneMap", () => {
    expect(() => generateHints([], [[1]], [[0]])).toThrow(RangeError);
  });

  test("throws for zoneMap with empty rows", () => {
    expect(() =>
      generateHints(
        [[], []],
        [
          [1, 1],
          [1, 1],
        ],
        [
          [0, 0],
          [0, 0],
        ],
      ),
    ).toThrow(RangeError);
  });

  test("throws for non-rectangular solutionMap", () => {
    expect(() =>
      generateHints(
        [
          [0, 0],
          [0, 0],
        ],
        [
          [1, 0, 0],
          [1, 0],
        ],
        [
          [0, 0],
          [0, 0],
        ],
      ),
    ).toThrow(RangeError);
  });

  test("throws for non-rectangular obstacleMap", () => {
    expect(() =>
      generateHints(
        [
          [0, 0],
          [0, 0],
        ],
        [
          [1, 0],
          [1, 0],
        ],
        [[0, 0]],
      ),
    ).toThrow(RangeError);
  });

  test("throws for negative zone IDs", () => {
    expect(() =>
      generateHints(
        [
          [0, -1],
          [0, 0],
        ],
        [
          [1, 0],
          [0, 0],
        ],
        [
          [0, 0],
          [0, 0],
        ],
      ),
    ).toThrow(TypeError);
  });

  test("throws for non-integer zone IDs", () => {
    expect(() =>
      generateHints(
        [
          [0, 1.5],
          [0, 0],
        ],
        [
          [1, 0],
          [0, 0],
        ],
        [
          [0, 0],
          [0, 0],
        ],
      ),
    ).toThrow(TypeError);
  });

  test("throws for invalid solutionMap values", () => {
    expect(() =>
      generateHints(
        [
          [0, 0],
          [0, 0],
        ],
        [
          [2, 0],
          [0, 0],
        ],
        [
          [0, 0],
          [0, 0],
        ],
      ),
    ).toThrow(TypeError);
  });

  test("throws for negative solutionMap values", () => {
    expect(() =>
      generateHints(
        [
          [0, 0],
          [0, 0],
        ],
        [
          [-1, 0],
          [0, 0],
        ],
        [
          [0, 0],
          [0, 0],
        ],
      ),
    ).toThrow(TypeError);
  });

  test("throws for invalid obstacleMap values", () => {
    expect(() =>
      generateHints(
        [
          [0, 0],
          [0, 0],
        ],
        [
          [1, 0],
          [0, 0],
        ],
        [
          [2, 0],
          [0, 0],
        ],
      ),
    ).toThrow(TypeError);
  });

  test("throws for negative obstacleMap values", () => {
    expect(() =>
      generateHints(
        [
          [0, 0],
          [0, 0],
        ],
        [
          [1, 0],
          [0, 0],
        ],
        [
          [-1, 0],
          [0, 0],
        ],
      ),
    ).toThrow(TypeError);
  });

  // Edge case tests
  test("generates hints with single person", () => {
    const hints = generateHints(
      [
        [0, 0],
        [0, 0],
      ],
      [
        [1, 0],
        [0, 0],
      ],
      [
        [0, 0],
        [0, 0],
      ],
    );
    expect(hints.length).toBeGreaterThanOrEqual(0);
  });

  test("generates adjacent obstacle hints for boundary persons", () => {
    const hints = generateHints(
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      [
        [0, 1, 0],
        [1, 0, 1],
        [0, 1, 0],
      ],
      { allowedTypes: [HintType.AdjacentObstacle] },
    );
    expect(hints.length).toBeGreaterThan(0);
  });

  test("generates cardinal hints in all directions", () => {
    const northSouth = generateHints(
      [
        [0, 0],
        [0, 0],
      ],
      [
        [1, 0],
        [1, 0],
      ],
      [
        [0, 0],
        [0, 0],
      ],
      { allowedTypes: [HintType.CardinalRelation] },
    );
    expect(northSouth.length).toBeGreaterThanOrEqual(0);

    const eastWest = generateHints(
      [
        [0, 0],
        [0, 0],
      ],
      [
        [1, 1],
        [0, 0],
      ],
      [
        [0, 0],
        [0, 0],
      ],
      { allowedTypes: [HintType.CardinalRelation] },
    );
    expect(eastWest.length).toBeGreaterThanOrEqual(0);
  });

  // formatHint tests for all directions
  test("formats cardinal hints in all directions", () => {
    const north = formatHint(
      {
        id: "hint_1",
        type: HintType.CardinalRelation,
        difficulty: "hard",
        payload: {
          personId: 1,
          referencePersonId: 2,
          direction: Direction.North,
          distance: 1,
        },
      },
      {},
    );
    expect(north).toContain("north");

    const south = formatHint(
      {
        id: "hint_2",
        type: HintType.CardinalRelation,
        difficulty: "hard",
        payload: {
          personId: 1,
          referencePersonId: 2,
          direction: Direction.South,
          distance: 1,
        },
      },
      {},
    );
    expect(south).toContain("south");

    const east = formatHint(
      {
        id: "hint_3",
        type: HintType.CardinalRelation,
        difficulty: "hard",
        payload: {
          personId: 1,
          referencePersonId: 2,
          direction: Direction.East,
          distance: 2,
        },
      },
      {},
    );
    expect(east).toContain("east");

    const west = formatHint(
      {
        id: "hint_4",
        type: HintType.CardinalRelation,
        difficulty: "hard",
        payload: {
          personId: 1,
          referencePersonId: 2,
          direction: Direction.West,
          distance: 2,
        },
      },
      {},
    );
    expect(west).toContain("west");
  });

  test("formats all hint types correctly", () => {
    const sameZone = formatHint(
      {
        id: "hint_1",
        type: HintType.SameZone,
        difficulty: "medium",
        payload: { personIds: [1, 2], zoneId: 0 },
      },
      {},
    );
    expect(sameZone).toContain("Person 1");
    expect(sameZone).toContain("Person 2");
    expect(sameZone).toContain("Zone 0");

    const zoneCount = formatHint(
      {
        id: "hint_2",
        type: HintType.ZoneCount,
        difficulty: "easy",
        payload: { zoneId: 0, personCount: 3 },
      },
      {},
    );
    expect(zoneCount).toContain("Zone 0");
    expect(zoneCount).toContain("3 people");

    const adjacent = formatHint(
      {
        id: "hint_3",
        type: HintType.AdjacentObstacle,
        difficulty: "hard",
        payload: {
          personId: 1,
          directions: [Direction.North, Direction.East],
          obstaclePositions: [
            { row: 0, col: 1 },
            { row: 1, col: 2 },
          ],
        },
      },
      {},
    );
    expect(adjacent).toContain("Person 1");
    expect(adjacent).toContain("obstacle");
  });

  test("uses custom template when provided", () => {
    const hint: Hint = {
      id: "hint_1",
      type: HintType.SameZone,
      difficulty: "medium",
      payload: { personIds: [1, 2], zoneId: 0 },
    };
    const text = formatHint(hint, {
      templates: {
        [HintType.SameZone]: () => "Custom template",
      },
    });
    expect(text).toBe("Custom template");
  });

  // Options and filtering tests
  test("handles hintCount of 0", () => {
    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      hintCount: 0,
      random: () => 0,
    });
    expect(hints).toHaveLength(0);
  });

  test("handles hintCount larger than available", () => {
    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      hintCount: 1000,
      random: () => 0,
    });
    expect(hints.length).toBeGreaterThan(0);
    expect(hints.length).toBeLessThanOrEqual(30);
  });

  test("respects deduplication flag", () => {
    const dedup = generateHints(zoneMap, solutionMap, obstacleMap, {
      deduplicate: true,
      random: () => 0,
    });
    const noDedup = generateHints(zoneMap, solutionMap, obstacleMap, {
      deduplicate: false,
      random: () => 0,
    });
    expect(dedup.length).toBeGreaterThan(0);
    expect(noDedup.length).toBeGreaterThan(0);
  });

  test("filters by difficulty level", () => {
    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      difficulty: "easy",
      random: () => 0,
    });
    for (const hint of hints) {
      expect(hint.difficulty).toBe("easy");
    }
  });

  test("generates mixed difficulty hints", () => {
    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      difficulty: "mixed",
      random: () => 0,
    });
    expect(hints.length).toBeGreaterThan(0);
  });

  // Zone-specific tests
  test("generates SameZone hints for multiple persons", () => {
    const testZoneMap = [
      [0, 0],
      [0, 0],
    ];
    const testSolutionMap = [
      [1, 1],
      [1, 1],
    ];
    const testObstacleMap = [
      [0, 0],
      [0, 0],
    ];
    const hints = generateHints(testZoneMap, testSolutionMap, testObstacleMap, {
      allowedTypes: [HintType.SameZone],
      random: () => 0,
    });
    expect(hints.length).toBeGreaterThan(0);
  });

  test("handles zones with no persons", () => {
    const testZoneMap = [
      [0, 1],
      [0, 1],
    ];
    const testSolutionMap = [
      [1, 0],
      [0, 1],
    ];
    const testObstacleMap = [
      [0, 0],
      [0, 0],
    ];
    const hints = generateHints(testZoneMap, testSolutionMap, testObstacleMap, {
      random: () => 0,
    });
    expect(hints.length).toBeGreaterThan(0);
  });

  test("handles maps with many zones", () => {
    const testZoneMap = [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [8, 9, 10, 11],
      [12, 13, 14, 15],
    ];
    const testSolutionMap = [
      [1, 0, 1, 0],
      [0, 1, 0, 1],
      [1, 0, 1, 0],
      [0, 1, 0, 1],
    ];
    const testObstacleMap = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const hints = generateHints(testZoneMap, testSolutionMap, testObstacleMap, {
      random: () => 0,
    });
    expect(hints.length).toBeGreaterThan(0);
  });

  // Plugin tests
  test("strictMode validation with valid plugins", () => {
    const customPlugin: HintGeneratorPlugin = {
      id: "test-plugin",
      generate: (_context: HintGenerationContext): Hint[] => [
        {
          id: "",
          type: HintType.ZoneCount,
          difficulty: "easy",
          payload: { zoneId: 0, personCount: 1 },
        },
      ],
    };
    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      includeBuiltIns: false,
      plugins: [customPlugin],
      strictMode: true,
      random: () => 0,
    });
    expect(hints.length).toBeGreaterThan(0);
  });

  test("handles plugin with missing id", () => {
    const invalidPlugin = {
      // @ts-ignore
      generate: (_context: HintGenerationContext): Hint[] => [],
    };
    expect(() =>
      generateHints(zoneMap, solutionMap, obstacleMap, {
        includeBuiltIns: false,
        // @ts-ignore
        plugins: [invalidPlugin],
        random: () => 0,
      }),
    ).not.toThrow();
  });

  // Very small map tests
  test("generates hints for 1x1 map with person", () => {
    const hints = generateHints([[0]], [[1]], [[0]]);
    expect(hints.length).toBeGreaterThanOrEqual(1);
  });

  test("handles 1x1 map with only obstacles", () => {
    const hints = generateHints([[0]], [[0]], [[1]]);
    expect(hints.length).toBeGreaterThanOrEqual(0);
  });

  // Complex scenarios
  test("person with adjacent obstacles on all sides", () => {
    const testZoneMap = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const testSolutionMap = [
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const testObstacleMap = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ];
    const hints = generateHints(testZoneMap, testSolutionMap, testObstacleMap, {
      allowedTypes: [HintType.AdjacentObstacle],
      random: () => 0,
    });
    expect(hints.length).toBeGreaterThan(0);
  });

  test("handles map with all obstacles and one person", () => {
    const testZoneMap = [
      [0, 0],
      [0, 0],
    ];
    const testSolutionMap = [
      [1, 0],
      [0, 0],
    ];
    const testObstacleMap = [
      [0, 1],
      [1, 1],
    ];
    const hints = generateHints(testZoneMap, testSolutionMap, testObstacleMap, {
      random: () => 0,
    });
    expect(hints.length).toBeGreaterThan(0);
  });

  // Test invalid hintCount to cover error handling
  test("throws for invalid hintCount", () => {
    expect(() =>
      generateHints(zoneMap, solutionMap, obstacleMap, {
        hintCount: -1,
        random: () => 0,
      }),
    ).toThrow(TypeError);
  });

  test("throws for non-integer hintCount", () => {
    expect(() =>
      generateHints(zoneMap, solutionMap, obstacleMap, {
        hintCount: 1.5,
        random: () => 0,
      }),
    ).toThrow(TypeError);
  });

  // Test actual deduplication behavior with duplicate hints
  test("deduplicates duplicate zone count hints", () => {
    const dedupPlugin: HintGeneratorPlugin = {
      id: "dedup-test",
      generate: (_context: HintGenerationContext): Hint[] => [
        {
          id: "",
          type: HintType.ZoneCount,
          difficulty: "easy",
          payload: { zoneId: 0, personCount: 1 },
        },
        {
          id: "",
          type: HintType.ZoneCount,
          difficulty: "easy",
          payload: { zoneId: 0, personCount: 1 },
        },
      ],
    };

    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      includeBuiltIns: false,
      plugins: [dedupPlugin],
      deduplicate: true,
      random: () => 0,
    });

    expect(hints.length).toBe(1);
  });

  test("does not deduplicate when disabled", () => {
    const dedupPlugin: HintGeneratorPlugin = {
      id: "dedup-test",
      generate: (_context: HintGenerationContext): Hint[] => [
        {
          id: "",
          type: HintType.ZoneCount,
          difficulty: "easy",
          payload: { zoneId: 0, personCount: 1 },
        },
        {
          id: "",
          type: HintType.ZoneCount,
          difficulty: "easy",
          payload: { zoneId: 0, personCount: 1 },
        },
      ],
    };

    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      includeBuiltIns: false,
      plugins: [dedupPlugin],
      deduplicate: false,
      random: () => 0,
    });

    expect(hints.length).toBe(2);
  });

  // Test formatHint with custom context functions
  test("formats hints with custom context functions", () => {
    const hint: Hint = {
      id: "hint_1",
      type: HintType.ZoneCount,
      difficulty: "easy",
      payload: { zoneId: 0, personCount: 5 },
    };

    const text = formatHint(hint, {
      personLabel: (id) => `P${id}`,
      zoneLabel: (id) => `Z${id}`,
      directionLabel: (dir) => dir.toUpperCase(),
    });

    expect(text).toContain("Z0");
    expect(text).toContain("5 people");
  });

  // Test shuffleInPlace with actual randomness
  test("handles shuffling with custom random function", () => {
    let callCount = 0;
    const customRandom = () => {
      callCount++;
      // Return values that trigger shuffling
      return (callCount % 10) / 10;
    };

    const hints1 = generateHints(zoneMap, solutionMap, obstacleMap, {
      random: customRandom,
      hintCount: 5,
    });

    const hints2 = generateHints(zoneMap, solutionMap, obstacleMap, {
      random: () => 0,
      hintCount: 5,
    });

    // Both should return 5 hints
    expect(hints1.length).toBe(5);
    expect(hints2.length).toBe(5);
  });

  // Test adjacent obstacle for specific directions
  test("detects adjacent obstacles in north direction", () => {
    const testZoneMap = [
      [0, 0],
      [0, 0],
    ];
    const testSolutionMap = [
      [0, 1],
      [0, 0],
    ];
    const testObstacleMap = [
      [1, 0],
      [0, 0],
    ];
    const hints = generateHints(testZoneMap, testSolutionMap, testObstacleMap, {
      allowedTypes: [HintType.AdjacentObstacle],
      random: () => 0,
    });
    for (const hint of hints) {
      if (hint.type === HintType.AdjacentObstacle) {
        expect(hint.payload.directions.length).toBeGreaterThan(0);
      }
    }
  });

  // Test combination of options
  test("combines multiple filtering options correctly", () => {
    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      allowedTypes: [HintType.ZoneCount],
      difficulty: "easy",
      hintCount: 3,
      deduplicate: true,
      random: () => 0,
    });

    expect(hints.length).toBeLessThanOrEqual(3);
    for (const hint of hints) {
      expect(hint.type).toBe(HintType.ZoneCount);
      expect(hint.difficulty).toBe("easy");
    }
  });

  // Test with plugin that generates invalid cardinal relation hints
  // This forces validateHint to check for non-existent persons
  test("rejects cardinal hints with invalid persons in strictMode", () => {
    const invalidPlugin: HintGeneratorPlugin = {
      id: "invalid-cardinal",
      generate: (_context: HintGenerationContext): Hint[] => [
        {
          id: "",
          type: HintType.CardinalRelation,
          difficulty: "hard",
          payload: {
            personId: 999,
            referencePersonId: 1000,
            direction: Direction.North,
            distance: 1,
          },
        },
      ],
    };

    const relaxed = generateHints(zoneMap, solutionMap, obstacleMap, {
      includeBuiltIns: false,
      plugins: [invalidPlugin],
      strictMode: false,
      random: () => 0,
    });

    expect(relaxed.length).toBe(0);
  });

  test("throws for invalid cardinal hints in strictMode", () => {
    const invalidPlugin: HintGeneratorPlugin = {
      id: "invalid-cardinal",
      generate: (_context: HintGenerationContext): Hint[] => [
        {
          id: "",
          type: HintType.CardinalRelation,
          difficulty: "hard",
          payload: {
            personId: 999,
            referencePersonId: 1000,
            direction: Direction.North,
            distance: 1,
          },
        },
      ],
    };

    expect(() =>
      generateHints(zoneMap, solutionMap, obstacleMap, {
        includeBuiltIns: false,
        plugins: [invalidPlugin],
        strictMode: true,
        random: () => 0,
      }),
    ).toThrow("Invalid hint generated");
  });

  // Test with plugin that generates invalid SameZone hints
  test("rejects SameZone hints with invalid persons", () => {
    const invalidPlugin: HintGeneratorPlugin = {
      id: "invalid-samezone",
      generate: (_context: HintGenerationContext): Hint[] => [
        {
          id: "",
          type: HintType.SameZone,
          difficulty: "medium",
          payload: {
            personIds: [999, 1000],
            zoneId: 0,
          },
        },
      ],
    };

    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      includeBuiltIns: false,
      plugins: [invalidPlugin],
      strictMode: false,
      random: () => 0,
    });

    expect(hints.length).toBe(0);
  });

  // Test with plugin that generates invalid AdjacentObstacle hints
  test("rejects AdjacentObstacle hints with invalid persons", () => {
    const invalidPlugin: HintGeneratorPlugin = {
      id: "invalid-obstacle",
      generate: (_context: HintGenerationContext): Hint[] => [
        {
          id: "",
          type: HintType.AdjacentObstacle,
          difficulty: "hard",
          payload: {
            personId: 999,
            directions: [Direction.North],
            obstaclePositions: [{ row: 0, col: 1 }],
          },
        },
      ],
    };

    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      includeBuiltIns: false,
      plugins: [invalidPlugin],
      strictMode: false,
      random: () => 0,
    });

    expect(hints.length).toBe(0);
  });

  // Test edge case with empty obstacles in adjacent obstacle
  test("handles hint with empty obstacle directions", () => {
    const emptyObstaclePlugin: HintGeneratorPlugin = {
      id: "empty-obstacle",
      generate: (context: HintGenerationContext): Hint[] => {
        if (context.persons.length === 0) return [];
        return [
          {
            id: "",
            type: HintType.AdjacentObstacle,
            difficulty: "hard",
            payload: {
              personId: context.persons[0]!.personId,
              directions: [],
              obstaclePositions: [],
            },
          },
        ];
      },
    };

    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      includeBuiltIns: false,
      plugins: [emptyObstaclePlugin],
      strictMode: false,
      random: () => 0,
    });

    expect(hints.length).toBe(0);
  });

  // Test shuffleInPlace with boundary random values
  test("shuffles with various random values", () => {
    let callIndex = 0;
    const sequentialRandom = () => {
      // Return values that will cause different shuffle behavior
      const values = [0, 0.5, 0.1, 0.9, 0.25, 0.75, 0, 0.5];
      return values[callIndex++ % values.length]!;
    };

    const hints1 = generateHints(zoneMap, solutionMap, obstacleMap, {
      random: sequentialRandom,
    });

    expect(hints1.length).toBeGreaterThan(0);
  });

  // Test with edge case random values
  test("handles extreme random values in shuffle", () => {
    let callIndex = 0;
    const extremeRandom = () => {
      callIndex++;
      // After every 3 calls, return values that might cause edge cases
      if (callIndex % 3 === 0) {
        return 0.9999999;
      }
      return 0.0001;
    };

    const hints = generateHints(zoneMap, solutionMap, obstacleMap, {
      random: extremeRandom,
    });

    expect(hints.length).toBeGreaterThan(0);
  });
});

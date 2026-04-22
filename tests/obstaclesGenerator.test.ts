import { describe, expect, test, vi } from "vitest";
import obstaclesGenerator from "../src/obstaclesGenerator";

describe("obstaclesGenerator", () => {
  test("throws when maps have different heights", () => {
    const zoneMap = [[0, 0]];
    const solutionMap = [
      [0, 0],
      [0, 0],
    ];

    expect(() => obstaclesGenerator(zoneMap, solutionMap, 1)).toThrow(
      RangeError,
    );
  });

  test("throws when row widths do not match", () => {
    const zoneMap = [[0], [0, 0]];
    const solutionMap = [
      [0, 0],
      [0, 0],
    ];

    expect(() => obstaclesGenerator(zoneMap, solutionMap, 1)).toThrow(
      RangeError,
    );
  });

  test("throws when obstacle count is too high", () => {
    const zoneMap = [
      [0, 0],
      [1, 1],
    ];
    const solutionMap = [
      [0, 0],
      [0, 0],
    ];

    expect(() => obstaclesGenerator(zoneMap, solutionMap, 1)).toThrow(
      "obstaclesCount is too high to keep at least 2 free cells in each zone",
    );
  });

  test("creates default obstacle map from solution when no obstacles requested", () => {
    const zoneMap = [
      [0, 0, 0],
      [1, 1, 1],
    ];
    const solutionMap = [
      [1, 0, 1],
      [0, 0, 1],
    ];

    const result = obstaclesGenerator(zoneMap, solutionMap, 0);

    expect(result).toEqual([
      [1, 0, 1],
      [0, 0, 1],
    ]);
  });

  test("places obstacles while preserving at least two free cells per zone", () => {
    const zoneMap = [
      [0, 0, 0, 1, 1, 1],
      [0, 0, 0, 1, 1, 1],
    ];
    const solutionMap = [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ];

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const result = obstaclesGenerator(zoneMap, solutionMap, 4);
    randomSpy.mockRestore();

    const freeByZone = new Map<number, number>();
    for (let y = 0; y < zoneMap.length; y++) {
      for (let x = 0; x < zoneMap[y]!.length; x++) {
        if (result[y]![x] === 0) {
          const zone = zoneMap[y]![x]!;
          freeByZone.set(zone, (freeByZone.get(zone) ?? 0) + 1);
        }
      }
    }

    expect(freeByZone.get(0)).toBeGreaterThanOrEqual(2);
    expect(freeByZone.get(1)).toBeGreaterThanOrEqual(2);
  });

  test("throws when a random NaN leads to an invalid obstacle index", () => {
    const zoneMap = [[0, 0, 0]];
    const solutionMap = [[0, 0, 0]];

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(Number.NaN);

    expect(() => obstaclesGenerator(zoneMap, solutionMap, 1)).toThrow(
      "could not place obstacles without breaking zone limits",
    );

    randomSpy.mockRestore();
  });
});

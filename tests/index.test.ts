import { describe, expect, test } from "vitest";
import generateMurdoku from "../src/index";

describe("generateMurdoku", () => {
  test("returns a full generation payload", () => {
    const width = 6;
    const height = 5;
    const zonesCount = 4;
    const obstaclesCount = 3;

    const result = generateMurdoku(width, height, zonesCount, obstaclesCount);

    expect(result.zoneMap).toHaveLength(height);
    expect(result.solutionMap).toHaveLength(height);
    expect(result.obstacleMap).toHaveLength(height);

    for (let row = 0; row < height; row++) {
      expect(result.zoneMap[row]).toHaveLength(width);
      expect(result.solutionMap[row]).toHaveLength(width);
      expect(result.obstacleMap[row]).toHaveLength(width);
    }
  });
});

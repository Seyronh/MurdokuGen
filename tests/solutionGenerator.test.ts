import { describe, expect, test, vi } from "vitest";
import solutionGenerator from "../src/solutionGenerator";

describe("solutionGenerator", () => {
  test("throws when width/height are not integers", () => {
    expect(() => solutionGenerator(3.5, 4)).toThrow(TypeError);
    expect(() => solutionGenerator(3, Number.NaN)).toThrow(TypeError);
  });

  test("throws when width/height are not positive", () => {
    expect(() => solutionGenerator(0, 4)).toThrow(RangeError);
    expect(() => solutionGenerator(4, -1)).toThrow(RangeError);
  });

  test("creates a board with one person per used row/col", () => {
    const width = 7;
    const height = 5;
    const board = solutionGenerator(width, height);

    expect(board).toHaveLength(height);
    for (const row of board) {
      expect(row).toHaveLength(width);
      for (const cell of row) {
        expect([0, 1]).toContain(cell);
      }
    }

    const persons = Math.min(width, height);
    const totalPersons = board.flat().reduce((sum, cell) => sum + cell, 0);
    expect(totalPersons).toBe(persons);

    for (const row of board) {
      const rowPersons = row.reduce((sum, cell) => sum + cell, 0);
      expect(rowPersons).toBeLessThanOrEqual(1);
    }

    for (let col = 0; col < width; col++) {
      let colPersons = 0;
      for (let row = 0; row < height; row++) {
        colPersons += board[row]![col]!;
      }
      expect(colPersons).toBeLessThanOrEqual(1);
    }
  });

  test("throws when randomness prevents a valid permutation", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(Number.NaN);

    expect(() => solutionGenerator(3, 3)).toThrow(
      "No solution found for the given width, height and persons",
    );

    randomSpy.mockRestore();
  });
});

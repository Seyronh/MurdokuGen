import { describe, expect, test, vi } from "vitest";
import zoneGenerator from "../src/zoneGenerator";

describe("zoneGenerator", () => {
  test("throws when arguments are not integers", () => {
    expect(() => zoneGenerator(4.2, 4, 3)).toThrow(TypeError);
    expect(() => zoneGenerator(4, 4, Number.NaN)).toThrow(TypeError);
  });

  test("returns an empty map when any numeric argument is <= 0", () => {
    expect(zoneGenerator(0, 4, 3)).toEqual([]);
    expect(zoneGenerator(4, -1, 3)).toEqual([]);
    expect(zoneGenerator(4, 4, 0)).toEqual([]);
    expect(zoneGenerator(4, 4, 2, 0)).toEqual([]);
  });

  test("throws when room constraints are impossible", () => {
    expect(() => zoneGenerator(2, 2, 5)).toThrow(RangeError);
    expect(() => zoneGenerator(3, 3, 4, 3)).toThrow(RangeError);
  });

  test("generates a full map with valid room ids", () => {
    const width = 6;
    const height = 5;
    const rooms = 4;
    const minRoomSize = 3;
    const map = zoneGenerator(width, height, rooms, minRoomSize);

    expect(map).toHaveLength(height);

    const roomSizes = new Map<number, number>();

    for (let y = 0; y < height; y++) {
      expect(map[y]).toHaveLength(width);
      for (let x = 0; x < width; x++) {
        const room = map[y]![x]!;
        expect(Number.isInteger(room)).toBe(true);
        expect(room).toBeGreaterThanOrEqual(0);
        expect(room).toBeLessThan(rooms);
        roomSizes.set(room, (roomSizes.get(room) ?? 0) + 1);
      }
    }

    for (let room = 0; room < rooms; room++) {
      expect(roomSizes.get(room)).toBeGreaterThanOrEqual(minRoomSize);
    }
  });

  test("fails after max attempts when random source is invalid", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(Number.NaN);

    expect(() => zoneGenerator(3, 3, 2, 2)).toThrow(
      "could not generate rooms with the requested constraints",
    );

    randomSpy.mockRestore();
  });

  test("fails gracefully when random source returns out-of-range indexes", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(1);

    expect(() => zoneGenerator(4, 4, 3, 2)).toThrow(
      "could not generate rooms with the requested constraints",
    );

    randomSpy.mockRestore();
  });

  test("fails during second fill phase when rooms cannot expand", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(1);

    expect(() => zoneGenerator(3, 2, 2, 1)).toThrow(
      "could not generate rooms with the requested constraints",
    );

    randomSpy.mockRestore();
  });
});

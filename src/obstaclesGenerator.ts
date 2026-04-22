function obstaclesGenerator(
  zoneMap: number[][],
  solutionMap: number[][],
  obstaclesCount: number,
): number[][] {
  let obstacleMap = solutionMap.map((row) =>
    row.map((cell) => (cell === 0 ? 0 : 1)),
  );
  const freeIndexes: Array<{ x: number; y: number; zone: number }> = [];
  const zoneFreeCounts = new Map<number, number>();

  if (zoneMap.length !== solutionMap.length) {
    throw new RangeError("zoneMap and solutionMap must have the same height");
  }

  for (let i = 0; i < solutionMap.length; i++) {
    if (zoneMap[i]?.length !== solutionMap[i]!.length) {
      throw new RangeError(
        "zoneMap and solutionMap must have the same width in each row",
      );
    }

    for (let j = 0; j < solutionMap[i]!.length; j++) {
      if (solutionMap[i]![j] === 0) {
        const zone = zoneMap[i]![j]!;
        freeIndexes.push({ x: i, y: j, zone });
        zoneFreeCounts.set(zone, (zoneFreeCounts.get(zone) ?? 0) + 1);
      }
    }
  }

  const maxObstacles = Array.from(zoneFreeCounts.values()).reduce(
    (total, remainingFreeCells) => total + Math.max(0, remainingFreeCells - 2),
    0,
  );

  if (obstaclesCount > maxObstacles) {
    throw new RangeError(
      "obstaclesCount is too high to keep at least 2 free cells in each zone",
    );
  }

  for (let i = 0; i < obstaclesCount; i++) {
    const eligibleIndexes = freeIndexes.filter((cell) => {
      const remainingFreeCells = zoneFreeCounts.get(cell.zone) ?? 0;
      return remainingFreeCells > 2;
    });

    const randomIndex = Math.floor(Math.random() * eligibleIndexes.length);
    const info = eligibleIndexes[randomIndex];

    if (!info) {
      throw new Error("could not place obstacles without breaking zone limits");
    }

    obstacleMap[info.x]![info.y] = 1;
    zoneFreeCounts.set(info.zone, (zoneFreeCounts.get(info.zone) ?? 0) - 1);

    const freeIndex = freeIndexes.findIndex(
      (cell) => cell.x === info.x && cell.y === info.y,
    );

    if (freeIndex >= 0) {
      freeIndexes.splice(freeIndex, 1);
    }
  }
  return obstacleMap;
}
export default obstaclesGenerator;

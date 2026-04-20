type Cell = {
  x: number;
  y: number;
};

const MIN_ROOM_SIZE = 3;

function getNeighbors(
  x: number,
  y: number,
  width: number,
  height: number,
): Cell[] {
  const neighbors: Cell[] = [];

  if (x > 0) neighbors.push({ x: x - 1, y });
  if (x + 1 < width) neighbors.push({ x: x + 1, y });
  if (y > 0) neighbors.push({ x, y: y - 1 });
  if (y + 1 < height) neighbors.push({ x, y: y + 1 });

  return neighbors;
}

function pickRandomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

function removeAt<T>(items: T[], index: number): T | undefined {
  if (index < 0 || index >= items.length) return undefined;

  const lastIndex = items.length - 1;
  const value = items[index];
  const lastValue = items[lastIndex];

  if (index !== lastIndex && lastValue !== undefined) {
    items[index] = lastValue;
  }

  items.pop();
  return value;
}

function tryExpandRoom(
  room: number,
  map: number[][],
  frontiers: Cell[][],
  width: number,
  height: number,
): boolean {
  const frontier = frontiers[room];
  if (!frontier || frontier.length === 0) {
    return false;
  }

  let inspected = frontier.length;

  while (inspected > 0 && frontier.length > 0) {
    const frontierIndex = pickRandomIndex(frontier.length);
    const frontierCell = frontier[frontierIndex];

    if (!frontierCell) {
      removeAt(frontier, frontierIndex);
      inspected--;
      continue;
    }

    const neighbors = getNeighbors(
      frontierCell.x,
      frontierCell.y,
      width,
      height,
    ).filter((neighbor) => map[neighbor.y]?.[neighbor.x] === -1);

    if (neighbors.length === 0) {
      removeAt(frontier, frontierIndex);
      inspected--;
      continue;
    }

    const nextCell = neighbors[pickRandomIndex(neighbors.length)];
    if (!nextCell) {
      inspected--;
      continue;
    }

    map[nextCell.y]![nextCell.x] = room;
    frontier.push(nextCell);

    const remainingNeighbors = getNeighbors(
      frontierCell.x,
      frontierCell.y,
      width,
      height,
    ).some((neighbor) => map[neighbor.y]?.[neighbor.x] === -1);

    if (!remainingNeighbors) {
      removeAt(frontier, frontierIndex);
    }

    return true;
  }

  return false;
}

function zoneGenerator(
  width: number,
  height: number,
  rooms: number,
): number[][] {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    !Number.isInteger(rooms)
  ) {
    throw new TypeError("width, height and rooms must be integers");
  }

  if (width <= 0 || height <= 0 || rooms <= 0) {
    return [];
  }

  const totalCells = width * height;

  if (rooms > totalCells) {
    throw new RangeError("rooms cannot be greater than width * height");
  }

  if (rooms * MIN_ROOM_SIZE > totalCells) {
    throw new RangeError(
      "rooms * minimum room size cannot be greater than width * height",
    );
  }

  const maxAttempts = 64;

  for (
    let generationAttempt = 0;
    generationAttempt < maxAttempts;
    generationAttempt++
  ) {
    const map = Array.from({ length: height }, () => Array(width).fill(-1));
    const frontiers: Cell[][] = Array.from({ length: rooms }, () => []);
    const roomSizes: number[] = Array(rooms).fill(0);
    const availableCells: number[] = Array.from(
      { length: totalCells },
      (_, index) => index,
    );

    for (let i = availableCells.length - 1; i > 0; i--) {
      const swapIndex = pickRandomIndex(i + 1);
      const temp = availableCells[i];
      availableCells[i] = availableCells[swapIndex] as number;
      availableCells[swapIndex] = temp as number;
    }

    for (let room = 0; room < rooms; room++) {
      const cellIndex = availableCells[room];
      if (cellIndex === undefined) continue;

      const x = cellIndex % width;
      const y = Math.floor(cellIndex / width);
      map[y]![x] = room;
      frontiers[room]!.push({ x, y });
      roomSizes[room] = 1;
    }

    let assignedCells = rooms;
    let failed = false;

    while (true) {
      const underfilledRooms: number[] = [];

      for (let room = 0; room < rooms; room++) {
        if ((roomSizes[room] ?? 0) < MIN_ROOM_SIZE) {
          underfilledRooms.push(room);
        }
      }

      if (underfilledRooms.length === 0) {
        break;
      }

      let expanded = false;
      const startIndex = pickRandomIndex(underfilledRooms.length);

      for (let i = 0; i < underfilledRooms.length; i++) {
        const room =
          underfilledRooms[(startIndex + i) % underfilledRooms.length];
        if (room === undefined) continue;

        if (tryExpandRoom(room, map, frontiers, width, height)) {
          roomSizes[room] = (roomSizes[room] ?? 0) + 1;
          assignedCells++;
          expanded = true;
          break;
        }
      }

      if (!expanded) {
        failed = true;
        break;
      }
    }

    if (failed) {
      continue;
    }

    while (assignedCells < totalCells) {
      let expanded = false;
      const startRoom = pickRandomIndex(rooms);

      for (let attempt = 0; attempt < rooms; attempt++) {
        const room = (startRoom + attempt) % rooms;

        if (tryExpandRoom(room, map, frontiers, width, height)) {
          roomSizes[room] = (roomSizes[room] ?? 0) + 1;
          assignedCells++;
          expanded = true;
          break;
        }
      }

      if (!expanded) {
        failed = true;
        break;
      }
    }

    if (failed) {
      continue;
    }

    return map;
  }

  throw new Error("could not generate rooms with the requested constraints");
}

export default zoneGenerator;

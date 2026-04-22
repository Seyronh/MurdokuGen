function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j] as T;
    copy[j] = temp as T;
  }

  return copy;
}

function solutionGenerator(width: number, height: number): number[][] {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new TypeError("width and height must be integers");
  }

  if (width <= 0 || height <= 0) {
    throw new RangeError("width and height must be > 0");
  }
  const persons = Math.min(width, height);
  const board = Array.from({ length: height }, () => Array(width).fill(0));

  const usedRows = new Set<number>();
  const usedCols = new Set<number>();
  const placements: Array<{ row: number; col: number }> = [];
  const rowOrder = shuffle(Array.from({ length: height }, (_, i) => i));

  function backtrack(placed: number): boolean {
    if (placed === persons) {
      return true;
    }

    const remainingRows = rowOrder.filter((row) => !usedRows.has(row));

    for (const row of remainingRows) {
      const cols = shuffle(Array.from({ length: width }, (_, i) => i));

      for (const col of cols) {
        if (usedCols.has(col)) {
          continue;
        }

        usedRows.add(row);
        usedCols.add(col);
        placements.push({ row, col });

        if (backtrack(placed + 1)) {
          return true;
        }

        placements.pop();
        usedCols.delete(col);
        usedRows.delete(row);
      }
    }

    return false;
  }

  const solved = backtrack(0);

  if (!solved) {
    throw new Error(
      "No solution found for the given width, height and persons",
    );
  }

  for (const placement of placements) {
    board[placement.row]![placement.col] = 1;
  }

  return board;
}

export default solutionGenerator;

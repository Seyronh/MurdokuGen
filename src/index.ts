/*
import zoneGenerator from "./zoneGenerator";
for (let i = 0; i < 3; i++) {
  const map = zoneGenerator(6, 6, 5);
  let mapStr = "";
  for (const row of map) {
    let rowStr = "";
    for (const cell of row) {
      if (cell == 0) {
        rowStr += "🟦";
      } else if (cell == 1) {
        rowStr += "🟩";
      } else if (cell == 2) {
        rowStr += "🟨";
      } else if (cell == 3) {
        rowStr += "🟧";
      } else if (cell == 4) {
        rowStr += "🟥";
      } else {
        rowStr += "⬛";
      }
    }
    rowStr += "\n";
    mapStr += rowStr;
  }
  console.log(mapStr);
}
*/
import solutionGenerator from "./solutionGenerator";
import zoneGenerator from "./zoneGenerator";

const width = 8;
const height = 8;
const persons = 8;
const zones = 5;

for (let i = 0; i < 3; i++) {
  const map = zoneGenerator(width, height, zones);
  const solution = solutionGenerator(width, height, persons);
  let mapStr = "";
  for (let r = 0; r < height; r++) {
    let rowStr = "";
    for (let c = 0; c < width; c++) {
      const cell = map[r]![c]!;
      if (solution[r]![c] === 1) {
        rowStr += "👤";
        continue;
      }
      if (cell == 0) {
        rowStr += "🟦";
      } else if (cell == 1) {
        rowStr += "🟩";
      } else if (cell == 2) {
        rowStr += "🟨";
      } else if (cell == 3) {
        rowStr += "🟧";
      } else if (cell == 4) {
        rowStr += "🟥";
      } else {
        rowStr += "⬛";
      }
    }
    rowStr += "\n";
    mapStr += rowStr;
  }
  console.log(mapStr);
}

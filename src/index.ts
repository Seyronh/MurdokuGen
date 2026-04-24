import obstaclesGenerator from "./obstaclesGenerator";
import { formatHint, generateHints } from "./hintsGenerator";
import solutionGenerator from "./solutionGenerator";
import zoneGenerator from "./zoneGenerator";

function generateMurdoku(
  width: number,
  height: number,
  zonesCount: number,
  obstaclesCount: number,
): { zoneMap: number[][]; solutionMap: number[][]; obstacleMap: number[][] } {
  const zoneMap = zoneGenerator(width, height, zonesCount);
  const solutionMap = solutionGenerator(width, height);
  const obstacleMap = obstaclesGenerator(zoneMap, solutionMap, obstaclesCount);

  return { zoneMap, solutionMap, obstacleMap };
}
export default generateMurdoku;
export { generateHints, formatHint };
export {
  Direction,
  HintType,
  type GenerateHintsOptions,
  type Hint,
  type HintCoordinate,
  type HintDifficulty,
  type HintFormatterContext,
  type HintGenerationContext,
  type HintGeneratorPlugin,
  type PersonPosition,
} from "./hintTypes";

export enum HintType {
  SameZone = "same_zone",
  ZoneCount = "zone_count",
  AdjacentObstacle = "adjacent_obstacle",
  CardinalRelation = "cardinal_relation",
}

export enum Direction {
  North = "north",
  South = "south",
  East = "east",
  West = "west",
}

export type HintDifficulty = "easy" | "medium" | "hard";

export type HintCoordinate = {
  row: number;
  col: number;
};

export type HintBase = {
  id: string;
  type: HintType;
  difficulty: HintDifficulty;
  tags?: string[];
};

export type SameZoneHint = HintBase & {
  type: HintType.SameZone;
  payload: {
    personIds: [number, number];
    zoneId: number;
  };
};

export type ZoneCountHint = HintBase & {
  type: HintType.ZoneCount;
  payload: {
    zoneId: number;
    personCount: number;
  };
};

export type AdjacentObstacleHint = HintBase & {
  type: HintType.AdjacentObstacle;
  payload: {
    personId: number;
    obstaclePositions: HintCoordinate[];
    directions: Direction[];
  };
};

export type CardinalRelationHint = HintBase & {
  type: HintType.CardinalRelation;
  payload: {
    personId: number;
    referencePersonId: number;
    direction: Direction;
    distance: number;
  };
};

export type Hint =
  | SameZoneHint
  | ZoneCountHint
  | AdjacentObstacleHint
  | CardinalRelationHint;

export type PersonPosition = {
  personId: number;
  row: number;
  col: number;
  zoneId: number;
};

export type HintGenerationContext = {
  zoneMap: number[][];
  solutionMap: number[][];
  obstacleMap: number[][];
  persons: PersonPosition[];
  personsByZone: Map<number, number[]>;
  obstaclePositions: HintCoordinate[];
};

export type HintGeneratorPlugin = {
  id: string;
  generate: (context: HintGenerationContext) => Hint[];
};

export type GenerateHintsOptions = {
  hintCount?: number;
  allowedTypes?: HintType[];
  difficulty?: HintDifficulty | "mixed";
  includeBuiltIns?: boolean;
  plugins?: HintGeneratorPlugin[];
  strictMode?: boolean;
  deduplicate?: boolean;
  random?: () => number;
};

export type HintFormatterContext = {
  personLabel?: (personId: number) => string;
  zoneLabel?: (zoneId: number) => string;
  directionLabel?: (direction: Direction) => string;
  templates?: Partial<Record<HintType, (hint: Hint) => string>>;
};

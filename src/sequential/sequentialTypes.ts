export type SequentialComponentType =
  | "SR_LATCH"
  | "GATED_SR_LATCH"
  | "D_LATCH"
  | "D_FLIP_FLOP"
  | "JK_FLIP_FLOP"
  | "T_FLIP_FLOP";

export interface SequentialInputs {
  S?: 0 | 1;
  R?: 0 | 1;
  D?: 0 | 1;
  J?: 0 | 1;
  K?: 0 | 1;
  T?: 0 | 1;
  Enable?: 0 | 1;
  Clock?: 0 | 1;
  Preset?: 0 | 1;
  Clear?: 0 | 1;
}

export interface SequentialState {
  Q: 0 | 1;
  QBar: 0 | 1;
  previousClock: 0 | 1;
  warning?: string;
}

export interface SequentialStep {
  index: number;
  componentType: SequentialComponentType;
  inputs: SequentialInputs;
  previousQ: 0 | 1;
  nextQ: 0 | 1;
  QBar: 0 | 1;
  triggered: boolean;
  warning?: string;
}

export interface SequentialTableRow {
  inputs: Record<string, 0 | 1 | "X">;
  previousQ: 0 | 1 | "Q";
  nextQ: 0 | 1 | "Q" | "Q'";
  description: string;
  invalid?: boolean;
}

export interface SequentialComponentDefinition {
  type: SequentialComponentType;
  label: string;
  shortLabel: string;
  requiredInputs: Array<keyof SequentialInputs>;
  usesClock: boolean;
}

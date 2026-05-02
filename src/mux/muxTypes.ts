export type MuxSize = 2 | 4 | 8 | 16;

export interface MuxDataInput {
  index: number;
  label: string;
  value: string;
}

export interface MuxConfig {
  id: string;
  size: MuxSize;
  outputLabel: string;
  variables: string[];
  selectVariables: string[];
  dataInputs: MuxDataInput[];
  sourceExpression?: string;
}

export interface MuxTruthRow {
  values: Record<string, 0 | 1>;
  selectedInputIndex: number;
  selectedInputValue: string;
  output: 0 | 1;
}

export interface SolvedMuxDataInput {
  index: number;
  expression: string;
}

export interface SolveMuxDataInputResult {
  success: boolean;
  dataInputs: SolvedMuxDataInput[];
  variableOrder: string[];
  error?: string;
}

export interface EvaluateMuxRowResult {
  selectedInputIndex: number;
  selectedInputValue: string;
  output: 0 | 1;
}

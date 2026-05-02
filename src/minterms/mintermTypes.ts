export interface ManualMintermState {
  enabled: boolean;
  sourceType: "truth-table" | "manual-minterms" | "function-minterms";
  outputLabel: string;
  variableCount: number;
  variables: string[];
  minterms: number[];
  dontCares: number[];
  canonicalSopExpression?: string;
  rawInput: string;
  error?: string;
}

export interface ParsedMinterms {
  minterms: number[];
  dontCares?: number[];
  variableCount?: number;
  error?: string;
}

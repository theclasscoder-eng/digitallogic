import type { MinimizationMethodUsed } from "./minimizationMethod";

export interface Minterm {
  index: number;
  bits: string;
}

export interface KMapGroup {
  id: string;
  minterms: number[];
  size: 1 | 2 | 4 | 8 | 16;
  rowPositions: number[];
  colPositions: number[];
  constantVariables: string[];
  eliminatedVariables: string[];
  productTerm: string;
}

export interface MinimizationStep {
  title: string;
  explanation: string;
  ruleName?: string;
  before?: string;
  after?: string;
}

export interface AlgebraStep {
  stepNumber: number;
  title: string;
  beforeExpression: string;
  afterExpression: string;
  ruleName: string;
  ruleFormula: string;
  explanation: string;
}

export interface EnhancedMinimizationResult {
  originalExpression: string;
  minimizedExpression: string;
  minterms: number[];
  kmapSteps: MinimizationStep[];
  algebraSteps: AlgebraStep[];
  groups: KMapGroup[];
  supported: boolean;
  methodUsed: MinimizationMethodUsed;
  reason?: string;
}

export interface MinimizationResult extends EnhancedMinimizationResult {
  steps: MinimizationStep[];
  isAlreadyMinimal: boolean;
  variableCount: number;
  outputLabel?: string;
}

export interface Implicant {
  id: string;
  pattern: string;
  minterms: number[];
  size: 1 | 2 | 4 | 8 | 16;
  literalCount: number;
  productTerm: string;
  constantVariables: string[];
  eliminatedVariables: string[];
}

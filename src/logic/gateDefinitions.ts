import type { GateType } from "../types/circuit";

export interface GateDefinition {
  gateType: GateType;
  label: string;
  minInputs: number;
  maxInputs: number;
}

export const GATE_DEFINITIONS: Record<GateType, GateDefinition> = {
  AND: { gateType: "AND", label: "AND", minInputs: 2, maxInputs: 8 },
  OR: { gateType: "OR", label: "OR", minInputs: 2, maxInputs: 8 },
  NOT: { gateType: "NOT", label: "NOT", minInputs: 1, maxInputs: 1 },
  NAND: { gateType: "NAND", label: "NAND", minInputs: 2, maxInputs: 8 },
  NOR: { gateType: "NOR", label: "NOR", minInputs: 2, maxInputs: 8 },
  XOR: { gateType: "XOR", label: "XOR", minInputs: 2, maxInputs: 8 },
  XNOR: { gateType: "XNOR", label: "XNOR", minInputs: 2, maxInputs: 8 }
};

export function normalizeInputCount(gateType: GateType, requested: number): number {
  const { minInputs, maxInputs } = GATE_DEFINITIONS[gateType];
  return Math.max(minInputs, Math.min(maxInputs, requested));
}

export function evaluateGate(gateType: GateType, inputValues: Array<0 | 1>): 0 | 1 {
  const inputs = inputValues.length > 0 ? inputValues : [0];

  switch (gateType) {
    case "AND":
      return inputs.every((value) => value === 1) ? 1 : 0;
    case "OR":
      return inputs.some((value) => value === 1) ? 1 : 0;
    case "NOT":
      return inputs[0] === 1 ? 0 : 1;
    case "NAND":
      return inputs.every((value) => value === 1) ? 0 : 1;
    case "NOR":
      return inputs.some((value) => value === 1) ? 0 : 1;
    case "XOR": {
      const highCount = inputs.reduce((total, value) => total + (value === 1 ? 1 : 0), 0);
      return highCount % 2 === 1 ? 1 : 0;
    }
    case "XNOR": {
      const highCount = inputs.reduce((total, value) => total + (value === 1 ? 1 : 0), 0);
      return highCount % 2 === 0 ? 1 : 0;
    }
    default:
      return 0;
  }
}

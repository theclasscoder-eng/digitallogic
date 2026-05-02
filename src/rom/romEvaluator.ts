import { evaluateBooleanExpressionText, type BinaryValue, type VariableAssignment } from "../expression/evaluator";
import { normalizeVariableName } from "../expression/variableUtils";
import type { RomOutputDefinition } from "./romTypes";

function withAliases(values: Record<string, 0 | 1>): VariableAssignment {
  const assignment: VariableAssignment = {};

  Object.entries(values).forEach(([key, value]) => {
    assignment[key] = value;
    assignment[key.toUpperCase()] = value;
    assignment[key.toLowerCase()] = value;
  });

  return assignment;
}

function evaluateTruthBits(truthBits: string, address: number): BinaryValue {
  const cleaned = truthBits.replace(/[^01]/g, "");
  if (!cleaned) {
    return 0;
  }

  if (address < 0 || address >= cleaned.length) {
    return 0;
  }

  return cleaned[address] === "1" ? 1 : 0;
}

export function evaluateRomOutput(
  output: RomOutputDefinition,
  inputValues: Record<string, 0 | 1>,
  address: number
): BinaryValue {
  if (output.truthBits && output.truthBits.trim().length > 0) {
    return evaluateTruthBits(output.truthBits, address);
  }

  const expression = output.expression?.trim();
  if (!expression) {
    return 0;
  }

  if (expression === "0") {
    return 0;
  }

  if (expression === "1") {
    return 1;
  }

  const simpleVariable = expression.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
  if (simpleVariable) {
    const name = normalizeVariableName(simpleVariable[1]);
    return (inputValues[name] ?? inputValues[name.toUpperCase()] ?? inputValues[name.toLowerCase()] ?? 0) as BinaryValue;
  }

  const simpleNegated = expression.match(/^([A-Za-z_][A-Za-z0-9_]*)'$/);
  if (simpleNegated) {
    const name = normalizeVariableName(simpleNegated[1]);
    const direct = inputValues[name] ?? inputValues[name.toUpperCase()] ?? inputValues[name.toLowerCase()] ?? 0;
    return direct === 1 ? 0 : 1;
  }

  return evaluateBooleanExpressionText(expression, withAliases(inputValues));
}

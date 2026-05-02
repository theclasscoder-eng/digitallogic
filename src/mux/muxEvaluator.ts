import { evaluateBooleanExpressionText, evaluateExprNode, type BinaryValue, type VariableAssignment } from "../expression/evaluator";
import { parseBooleanExpression } from "../expression/parser";
import { collectVariablesFromAst, normalizeVariableName, sortVariableNames } from "../expression/variableUtils";
import type { MuxConfig, EvaluateMuxRowResult } from "./muxTypes";

function normalizeAssignment(values: Record<string, 0 | 1>): VariableAssignment {
  const assignment: VariableAssignment = {};

  Object.entries(values).forEach(([name, value]) => {
    assignment[name] = value;
    assignment[name.toUpperCase()] = value;
    assignment[name.toLowerCase()] = value;
  });

  return assignment;
}

function evaluateDataInputExpression(expression: string, values: Record<string, 0 | 1>): BinaryValue {
  const normalized = expression.trim();
  if (!normalized || normalized === "?") {
    return 0;
  }

  if (normalized === "0") {
    return 0;
  }

  if (normalized === "1") {
    return 1;
  }

  const simpleNegated = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)'$/);
  if (simpleNegated) {
    const rawName = normalizeVariableName(simpleNegated[1]);
    const direct = values[rawName] ?? values[rawName.toUpperCase()] ?? values[rawName.toLowerCase()];
    return direct === 1 ? 0 : 1;
  }

  const simpleVar = normalized.match(/^[A-Za-z_][A-Za-z0-9_]*$/);
  if (simpleVar) {
    const rawName = normalizeVariableName(simpleVar[0]);
    return (values[rawName] ?? values[rawName.toUpperCase()] ?? values[rawName.toLowerCase()] ?? 0) as BinaryValue;
  }

  try {
    return evaluateBooleanExpressionText(normalized, normalizeAssignment(values));
  } catch {
    return 0;
  }
}

export function evaluateMuxRow(config: MuxConfig, values: Record<string, 0 | 1>): EvaluateMuxRowResult {
  const selectCount = Math.log2(config.size);
  const selectValues = config.selectVariables.slice(0, selectCount).map((variable) => {
    const normalized = normalizeVariableName(variable);
    return values[normalized] ?? values[normalized.toUpperCase()] ?? values[normalized.toLowerCase()] ?? 0;
  });

  let selectedInputIndex = 0;
  for (let bit = 0; bit < selectValues.length; bit += 1) {
    selectedInputIndex |= (selectValues[bit] as number) << bit;
  }

  const fallbackLabel = `D${selectedInputIndex}`;
  const selectedInput = config.dataInputs.find((input) => input.index === selectedInputIndex);
  const selectedInputValue = selectedInput?.value?.trim() || "0";
  const output = evaluateDataInputExpression(selectedInputValue, values);

  return {
    selectedInputIndex,
    selectedInputValue: selectedInputValue || fallbackLabel,
    output
  };
}

export function collectMuxVariablesFromExpression(expression: string): string[] {
  const trimmed = expression.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = parseBooleanExpression(trimmed);
    return sortVariableNames(collectVariablesFromAst(parsed.expression));
  } catch {
    return [];
  }
}

export function evaluateExpressionAstWithAssignments(expression: string, values: Record<string, 0 | 1>): BinaryValue {
  const parsed = parseBooleanExpression(expression);
  return evaluateExprNode(parsed.expression, normalizeAssignment(values));
}

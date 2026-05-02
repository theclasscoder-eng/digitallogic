import type { ExprNode } from "./ast";
import { parseBooleanExpression } from "./parser";

export type BinaryValue = 0 | 1;

export type VariableAssignment = Record<string, BinaryValue>;

function readVariableValue(name: string, values: VariableAssignment): BinaryValue {
  if (name in values) {
    return values[name] as BinaryValue;
  }

  const upper = name.toUpperCase();
  if (upper in values) {
    return values[upper] as BinaryValue;
  }

  const lower = name.toLowerCase();
  if (lower in values) {
    return values[lower] as BinaryValue;
  }

  return 0;
}

export function evaluateExprNode(node: ExprNode, values: VariableAssignment): BinaryValue {
  if (node.type === "constant") {
    return node.value;
  }

  if (node.type === "variable") {
    return readVariableValue(node.name, values);
  }

  if (node.type === "not") {
    return evaluateExprNode(node.child, values) === 1 ? 0 : 1;
  }

  if (node.type === "and") {
    return node.children.every((child) => evaluateExprNode(child, values) === 1) ? 1 : 0;
  }

  if (node.type === "or") {
    return node.children.some((child) => evaluateExprNode(child, values) === 1) ? 1 : 0;
  }

  const ones = node.children.reduce(
    (sum, child) => sum + (evaluateExprNode(child, values) === 1 ? 1 : 0),
    0
  );
  return ones % 2 === 1 ? 1 : 0;
}

export function evaluateBooleanExpressionText(expression: string, values: VariableAssignment): BinaryValue {
  const parsed = parseBooleanExpression(expression);
  return evaluateExprNode(parsed.expression, values);
}


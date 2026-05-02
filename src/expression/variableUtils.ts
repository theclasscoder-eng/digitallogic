import type { ExprNode } from "./ast";
import type { InputNodeData, LogicNode } from "../types/circuit";

export interface VariableValidationExample {
  expression: string;
  expectedVariables: string[];
  expectedCount: number;
  expectedOutput?: string;
}

const NATURAL_COMPARE_OPTIONS: Intl.CollatorOptions = {
  numeric: true,
  sensitivity: "base"
};

export function normalizeVariableName(name: string): string {
  return name.replace(/[!'\s]+/g, "").trim();
}

export function isRealVariableName(name: string): boolean {
  const normalized = normalizeVariableName(name);
  return normalized.length > 0 && normalized !== "0" && normalized !== "1";
}

export function sortVariableNames(names: string[]): string[] {
  return [...new Set(names.map((name) => normalizeVariableName(name)).filter(isRealVariableName))].sort((a, b) =>
    compareVariableNames(a, b)
  );
}

export function compareVariableNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, NATURAL_COMPARE_OPTIONS);
}

export function collectVariablesFromAst(ast: ExprNode): string[] {
  const variables = new Set<string>();

  const visit = (node: ExprNode) => {
    if (node.type === "variable") {
      const normalized = normalizeVariableName(node.name);
      if (isRealVariableName(normalized)) {
        variables.add(normalized);
      }
      return;
    }

    if (node.type === "constant") {
      return;
    }

    if (node.type === "not") {
      visit(node.child);
      return;
    }

    node.children.forEach((child) => visit(child));
  };

  visit(ast);
  return sortVariableNames([...variables]);
}

export function collectVariablesFromCircuit(nodes: LogicNode[]): string[] {
  const variables = new Set<string>();

  nodes.forEach((node) => {
    if (node.type !== "inputNode") {
      return;
    }

    const data = node.data as InputNodeData;
    if (data.isConstant) {
      return;
    }

    const normalized = normalizeVariableName(String(data.label));
    if (isRealVariableName(normalized)) {
      variables.add(normalized);
    }
  });

  return sortVariableNames([...variables]);
}

export const VARIABLE_VALIDATION_EXAMPLES: VariableValidationExample[] = [
  {
    expression: "F = A'B + B'C + A + AB'C'D'",
    expectedVariables: ["A", "B", "C", "D"],
    expectedCount: 4,
    expectedOutput: "F"
  },
  {
    expression: "F = AB'C'D'E",
    expectedVariables: ["A", "B", "C", "D", "E"],
    expectedCount: 5,
    expectedOutput: "F"
  },
  {
    expression: "F = (A + B)C",
    expectedVariables: ["A", "B", "C"],
    expectedCount: 3,
    expectedOutput: "F"
  },
  {
    expression: "F = X1 + X2",
    expectedVariables: ["X1", "X2"],
    expectedCount: 2,
    expectedOutput: "F"
  },
  {
    expression: "F = A + 1",
    expectedVariables: ["A"],
    expectedCount: 1,
    expectedOutput: "F"
  },
  {
    expression: "Y = A'B + C",
    expectedVariables: ["A", "B", "C"],
    expectedCount: 3,
    expectedOutput: "Y"
  }
];

import { evaluateCircuit } from "./evaluateCircuit";
import {
  collectVariablesFromCircuit,
  compareVariableNames,
  isRealVariableName,
  normalizeVariableName
} from "../expression/variableUtils";
import type {
  InputNodeData,
  LogicEdge,
  LogicNode,
  OutputVisualData,
  TruthTableColumn,
  TruthTableData
} from "../types/circuit";

const MAX_VARIABLES = 10;

export function generateTruthTable(nodes: LogicNode[], edges: LogicEdge[]): TruthTableData {
  const outputNodes = nodes
    .filter((node): node is LogicNode => node.type === "outputNode")
    .sort((a, b) => compareVariableNames(String(a.data.label), String(b.data.label)));

  const incoming = new Map<string, LogicEdge[]>();
  for (const edge of edges) {
    const group = incoming.get(edge.target) ?? [];
    group.push(edge);
    incoming.set(edge.target, group);
  }

  const reachableFromOutputs = new Set<string>();
  const stack = outputNodes.map((node) => node.id);

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || reachableFromOutputs.has(current)) {
      continue;
    }

    reachableFromOutputs.add(current);
    const sourceEdges = incoming.get(current) ?? [];
    sourceEdges.forEach((edge) => stack.push(edge.source));
  }

  const candidateInputNodes = nodes
    .filter((node): node is LogicNode => node.type === "inputNode")
    .filter((node) => !(node.data as InputNodeData).isConstant)
    .filter((node) => outputNodes.length === 0 || reachableFromOutputs.has(node.id));

  const variableNodeGroups = new Map<string, LogicNode[]>();

  candidateInputNodes.forEach((node) => {
    const label = normalizeVariableName(String(node.data.label));
    if (!isRealVariableName(label)) {
      return;
    }

    const group = variableNodeGroups.get(label) ?? [];
    group.push(node);
    variableNodeGroups.set(label, group);
  });

  const variableLabels = collectVariablesFromCircuit(candidateInputNodes);

  const columns: TruthTableColumn[] = [
    ...variableLabels.map((label) => ({ id: `var:${label}`, label, kind: "input" as const })),
    ...outputNodes.map((node) => ({
      id: node.id,
      label: (node.data as OutputVisualData).label,
      kind: "output" as const
    }))
  ];

  if (variableLabels.length > MAX_VARIABLES) {
    return {
      columns,
      rows: [],
      tooManyVariables: true,
      variableLimit: MAX_VARIABLES
    };
  }

  const rows: Array<Record<string, 0 | 1>> = [];
  const totalCombinations = 2 ** variableLabels.length;

  for (let combination = 0; combination < totalCombinations; combination += 1) {
    const overrides: Record<string, 0 | 1> = {};
    const row: Record<string, 0 | 1> = {};

    variableLabels.forEach((label, index) => {
      const value = ((combination >> (variableLabels.length - index - 1)) & 1) as 0 | 1;
      row[`var:${label}`] = value;

      const nodesForVariable = variableNodeGroups.get(label) ?? [];
      nodesForVariable.forEach((node) => {
        overrides[node.id] = value;
      });
    });

    const result = evaluateCircuit(nodes, edges, overrides);

    outputNodes.forEach((node) => {
      row[node.id] = result.outputValues[node.id] ?? 0;
    });

    rows.push(row);
  }

  return { columns, rows };
}

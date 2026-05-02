import { isGateInputHandleId, parseInputHandleIndex } from "./validation";
import type { GateType, GateVisualData, InputNodeData, LogicEdge, LogicNode } from "../types/circuit";

export interface ComputeNodeExpressionOptions {
  missingInputToken?: string;
}

export interface NodeExpressionComputer {
  compute: (nodeId: string) => string;
  hasCycle: () => boolean;
}

const SIMPLE_TOKEN_PATTERN = /^(?:[A-Za-z_][A-Za-z0-9_]*|[01]|\?)(?:')*$/;
const COMPACT_PRODUCT_PATTERN = /^[A-Z]{2,}(?:')*$/;

function isSimpleToken(expression: string): boolean {
  return SIMPLE_TOKEN_PATTERN.test(expression.trim());
}

function wrapIfContainsSumOrXor(expression: string): string {
  const trimmed = expression.trim();
  if (!trimmed) {
    return "?";
  }

  if (trimmed.includes("+") || trimmed.includes("⊕")) {
    return `(${trimmed})`;
  }

  return trimmed;
}

function wrapForNot(expression: string): string {
  const trimmed = expression.trim();
  if (!trimmed) {
    return "?";
  }

  if (isSimpleToken(trimmed) && !COMPACT_PRODUCT_PATTERN.test(trimmed)) {
    return `${trimmed}'`;
  }

  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    return `${trimmed}'`;
  }

  return `(${trimmed})'`;
}

function negateGroup(expression: string): string {
  const trimmed = expression.trim() || "?";
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    return `${trimmed}'`;
  }

  return `(${trimmed})'`;
}

function normalizeGateInputCount(gateType: GateType, inputCount: number): number {
  if (gateType === "NOT") {
    return 1;
  }

  return Math.max(2, inputCount);
}

function formatGateExpression(gateType: GateType, args: string[]): string {
  const normalizedArgs = args.length > 0 ? args : ["?"];

  switch (gateType) {
    case "NOT":
      return wrapForNot(normalizedArgs[0] ?? "?");
    case "AND":
      return normalizedArgs.map((entry) => wrapIfContainsSumOrXor(entry)).join("");
    case "OR":
      return normalizedArgs.map((entry) => wrapIfContainsSumOrXor(entry)).join(" + ");
    case "XOR":
      return normalizedArgs.map((entry) => wrapIfContainsSumOrXor(entry)).join(" ⊕ ");
    case "NAND": {
      const joined = normalizedArgs.map((entry) => wrapIfContainsSumOrXor(entry)).join("");
      return negateGroup(joined);
    }
    case "NOR": {
      const joined = normalizedArgs.map((entry) => wrapIfContainsSumOrXor(entry)).join(" + ");
      return negateGroup(joined);
    }
    case "XNOR": {
      const joined = normalizedArgs.map((entry) => wrapIfContainsSumOrXor(entry)).join(" ⊕ ");
      return negateGroup(joined);
    }
    default:
      return "?";
  }
}

export function buildNodeExpressionComputer(
  nodes: LogicNode[],
  edges: LogicEdge[],
  options: ComputeNodeExpressionOptions = {}
): NodeExpressionComputer {
  const missingInputToken = options.missingInputToken ?? "?";
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const incomingEdges = new Map<string, LogicEdge[]>();
  const memo = new Map<string, string>();
  const visiting = new Set<string>();
  let cycleDetected = false;

  for (const edge of edges) {
    const entries = incomingEdges.get(edge.target) ?? [];
    entries.push(edge);
    incomingEdges.set(edge.target, entries);
  }

  const compute = (nodeId: string): string => {
    if (memo.has(nodeId)) {
      return memo.get(nodeId) as string;
    }

    if (visiting.has(nodeId)) {
      cycleDetected = true;
      return missingInputToken;
    }

    visiting.add(nodeId);
    const node = nodeMap.get(nodeId);
    let expression = missingInputToken;

    if (!node) {
      expression = missingInputToken;
    } else if (node.type === "inputNode") {
      const data = node.data as InputNodeData;
      const label = `${data.label}`.trim();
      expression = label || missingInputToken;
    } else if (node.type === "gateNode") {
      const gateData = node.data as GateVisualData;
      const sourceEdges = (incomingEdges.get(nodeId) ?? [])
        .filter((entry) => isGateInputHandleId(entry.targetHandle))
        .sort((a, b) => parseInputHandleIndex(a.targetHandle) - parseInputHandleIndex(b.targetHandle));

      const edgeByInputIndex = new Map<number, LogicEdge>();
      for (const edge of sourceEdges) {
        const index = parseInputHandleIndex(edge.targetHandle);
        if (index >= 0 && !edgeByInputIndex.has(index)) {
          edgeByInputIndex.set(index, edge);
        }
      }

      const highestConnectedIndex =
        sourceEdges.length > 0
          ? Math.max(...sourceEdges.map((edge) => parseInputHandleIndex(edge.targetHandle)))
          : -1;
      const configuredInputCount = normalizeGateInputCount(gateData.gateType, gateData.inputCount);
      const totalInputs =
        gateData.gateType === "NOT"
          ? 1
          : Math.max(configuredInputCount, highestConnectedIndex + 1);
      const args: string[] = [];

      for (let index = 0; index < totalInputs; index += 1) {
        const edge = edgeByInputIndex.get(index);
        args.push(edge ? compute(edge.source) : missingInputToken);
      }

      expression = formatGateExpression(gateData.gateType, args);
    } else if (node.type === "outputNode") {
      const sourceEdges = incomingEdges.get(nodeId) ?? [];
      const inputEdge = sourceEdges.find((entry) => entry.targetHandle === "in" || entry.targetHandle === "in-0");
      expression = inputEdge ? compute(inputEdge.source) : missingInputToken;
    }

    visiting.delete(nodeId);
    memo.set(nodeId, expression);
    return expression;
  };

  return {
    compute,
    hasCycle: () => cycleDetected
  };
}

export function computeNodeExpression(
  nodeId: string,
  nodes: LogicNode[],
  edges: LogicEdge[],
  options: ComputeNodeExpressionOptions = {}
): string {
  const computer = buildNodeExpressionComputer(nodes, edges, options);
  return computer.compute(nodeId);
}

import { evaluateGate } from "./gateDefinitions";
import { isGateInputHandleId, parseInputHandleIndex } from "./validation";
import type {
  GateVisualData,
  InputNodeData,
  LogicEdge,
  LogicNode,
  SimulationResult
} from "../types/circuit";

export function evaluateCircuit(
  nodes: LogicNode[],
  edges: LogicEdge[],
  inputOverrides: Record<string, 0 | 1> = {}
): SimulationResult {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const incomingEdges = new Map<string, LogicEdge[]>();

  for (const edge of edges) {
    const entries = incomingEdges.get(edge.target) ?? [];
    entries.push(edge);
    incomingEdges.set(edge.target, entries);
  }

  const memo = new Map<string, 0 | 1>();
  const visiting = new Set<string>();
  let hasCycle = false;

  const evaluateNode = (nodeId: string): 0 | 1 => {
    if (memo.has(nodeId)) {
      return memo.get(nodeId) as 0 | 1;
    }

    if (visiting.has(nodeId)) {
      hasCycle = true;
      return 0;
    }

    visiting.add(nodeId);
    const node = nodeMap.get(nodeId);
    let result: 0 | 1 = 0;

    if (!node) {
      result = 0;
    } else if (node.type === "inputNode") {
      const data = node.data as InputNodeData;
      result = inputOverrides[nodeId] ?? data.value;
    } else if (node.type === "gateNode") {
      const data = node.data as GateVisualData;
      const sourceEdges = (incomingEdges.get(nodeId) ?? [])
        .filter((entry) => isGateInputHandleId(entry.targetHandle))
        .sort((a, b) => parseInputHandleIndex(a.targetHandle) - parseInputHandleIndex(b.targetHandle));
      const edgeByInputIndex = new Map<number, LogicEdge>();

      for (const edge of sourceEdges) {
        const inputIndex = parseInputHandleIndex(edge.targetHandle);
        if (inputIndex >= 0 && !edgeByInputIndex.has(inputIndex)) {
          edgeByInputIndex.set(inputIndex, edge);
        }
      }

      const highestConnectedIndex =
        sourceEdges.length > 0
          ? Math.max(...sourceEdges.map((edge) => parseInputHandleIndex(edge.targetHandle)))
          : -1;
      const configuredInputCount = data.gateType === "NOT" ? 1 : Math.max(2, data.inputCount);
      const totalInputs =
        data.gateType === "NOT" ? 1 : Math.max(configuredInputCount, highestConnectedIndex + 1);
      const inputValues: Array<0 | 1> = [];

      for (let i = 0; i < totalInputs; i += 1) {
        const edge = edgeByInputIndex.get(i);
        inputValues.push(edge ? evaluateNode(edge.source) : 0);
      }

      result = evaluateGate(data.gateType, inputValues);
    } else if (node.type === "outputNode") {
      const sourceEdges = incomingEdges.get(nodeId) ?? [];
      const edge = sourceEdges.find(
        (entry) => entry.targetHandle === "in" || entry.targetHandle === "in-0"
      );

      result = edge ? evaluateNode(edge.source) : 0;
    }

    visiting.delete(nodeId);
    memo.set(nodeId, result);
    return result;
  };

  const nodeValues: Record<string, 0 | 1> = {};
  const edgeValues: Record<string, 0 | 1> = {};
  const outputValues: Record<string, 0 | 1> = {};

  for (const node of nodes) {
    nodeValues[node.id] = evaluateNode(node.id);
    if (node.type === "outputNode") {
      outputValues[node.id] = nodeValues[node.id];
    }
  }

  for (const edge of edges) {
    edgeValues[edge.id] = evaluateNode(edge.source);
  }

  return {
    nodeValues,
    edgeValues,
    outputValues,
    hasCycle
  };
}

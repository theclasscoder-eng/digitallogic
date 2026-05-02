import { normalizeInputCount } from "../logic/gateDefinitions";
import type { GateType, GateVisualData, InputNodeData, LogicEdge, LogicNode, OutputVisualData, WireData } from "../types/circuit";
import type { ExprNode, ParsedExpression } from "./ast";
import { collectVariablesFromAst, compareVariableNames, normalizeVariableName } from "./variableUtils";

interface CircuitBuildResult {
  nodes: LogicNode[];
  edges: LogicEdge[];
}

interface NodeOutputRef {
  nodeId: string;
  sourceHandle: string;
  column: number;
}

interface GatePlacement {
  nodeId: string;
  column: number;
  order: number;
}

const INPUT_HANDLE_PREFIX = "input-";
const OUTPUT_HANDLE = "output-0";
const OUTPUT_NODE_INPUT_HANDLE = "in";

export function buildCircuitFromExpression(parsed: ParsedExpression): CircuitBuildResult {
  const uniquePrefix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  let idCounter = 0;
  let orderCounter = 0;

  const nodes: LogicNode[] = [];
  const edges: LogicEdge[] = [];

  const variableInputs = new Map<string, string>();
  const constantInputs = new Map<0 | 1, string>();
  const notCache = new Map<string, NodeOutputRef>();
  const gatePlacements: GatePlacement[] = [];
  const nodeOrder = new Map<string, number>();

  const nextId = (prefix: string): string => {
    idCounter += 1;
    return `${prefix}-${uniquePrefix}-${idCounter}`;
  };

  const registerPlacement = (nodeId: string, column: number) => {
    nodeOrder.set(nodeId, orderCounter);
    gatePlacements.push({ nodeId, column, order: orderCounter });
    orderCounter += 1;
  };

  const createInputNode = (label: string, isConstant: boolean, value: 0 | 1): string => {
    const nodeId = nextId("input");

    nodes.push({
      id: nodeId,
      type: "inputNode",
      position: { x: 0, y: 0 },
      data: {
        id: nodeId,
        label,
        value,
        isConstant,
        nodeKind: "input"
      } satisfies InputNodeData
    });

    nodeOrder.set(nodeId, orderCounter);
    orderCounter += 1;

    return nodeId;
  };

  const createGate = (gateType: GateType, requestedInputCount: number): string => {
    const nodeId = nextId("gate");
    const inputCount = normalizeInputCount(gateType, requestedInputCount);

    nodes.push({
      id: nodeId,
      type: "gateNode",
      position: { x: 0, y: 0 },
      data: {
        id: nodeId,
        gateType,
        label: gateType,
        inputCount,
        outputCount: 1,
        nodeKind: "gate"
      } satisfies GateVisualData
    });

    return nodeId;
  };

  const createEdge = (
    sourceNodeId: string,
    sourceHandleId: string,
    targetNodeId: string,
    targetHandleId: string
  ) => {
    const edgeId = nextId("wire");

    edges.push({
      id: edgeId,
      source: sourceNodeId,
      sourceHandle: sourceHandleId,
      target: targetNodeId,
      targetHandle: targetHandleId,
      type: "expression",
      data: {
        id: edgeId,
        sourceNodeId,
        sourceHandleId,
        targetNodeId,
        targetHandleId,
        expression: "?"
      } satisfies WireData
    });
  };

  const getVariableInput = (name: string): NodeOutputRef => {
    const normalized = normalizeVariableName(name);
    const existingNodeId = variableInputs.get(normalized);
    if (existingNodeId) {
      return {
        nodeId: existingNodeId,
        sourceHandle: OUTPUT_HANDLE,
        column: 0
      };
    }

    const nodeId = createInputNode(normalized, false, 0);
    variableInputs.set(normalized, nodeId);

    return {
      nodeId,
      sourceHandle: OUTPUT_HANDLE,
      column: 0
    };
  };

  const getConstantInput = (value: 0 | 1): NodeOutputRef => {
    const existingNodeId = constantInputs.get(value);
    if (existingNodeId) {
      return {
        nodeId: existingNodeId,
        sourceHandle: OUTPUT_HANDLE,
        column: 0
      };
    }

    const nodeId = createInputNode(String(value), true, value);
    constantInputs.set(value, nodeId);

    return {
      nodeId,
      sourceHandle: OUTPUT_HANDLE,
      column: 0
    };
  };

  const detectedVariables = collectVariablesFromAst(parsed.expression);
  detectedVariables.forEach((name) => {
    if (variableInputs.has(name)) {
      return;
    }

    const nodeId = createInputNode(name, false, 0);
    variableInputs.set(name, nodeId);
  });

  const buildNode = (node: ExprNode): NodeOutputRef => {
    if (node.type === "variable") {
      return getVariableInput(node.name);
    }

    if (node.type === "constant") {
      return getConstantInput(node.value);
    }

    if (node.type === "not") {
      if (node.child.type === "variable") {
        const cacheKey = `not:var:${node.child.name}`;
        const cached = notCache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      if (node.child.type === "constant") {
        const cacheKey = `not:const:${node.child.value}`;
        const cached = notCache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const childRef = buildNode(node.child);
      const gateId = createGate("NOT", 1);
      const column = Math.max(1, childRef.column + 1);

      createEdge(childRef.nodeId, childRef.sourceHandle, gateId, `${INPUT_HANDLE_PREFIX}0`);
      registerPlacement(gateId, column);

      const notRef = {
        nodeId: gateId,
        sourceHandle: OUTPUT_HANDLE,
        column
      };

      if (node.child.type === "variable") {
        notCache.set(`not:var:${node.child.name}`, notRef);
      } else if (node.child.type === "constant") {
        notCache.set(`not:const:${node.child.value}`, notRef);
      }

      return notRef;
    }

    if (node.type === "and" || node.type === "or" || node.type === "xor") {
      const childRefs = node.children.map((child) => buildNode(child));
      const gateType: GateType = node.type === "and" ? "AND" : node.type === "or" ? "OR" : "XOR";
      const gateId = createGate(gateType, childRefs.length);
      const childMaxColumn = childRefs.reduce((max, child) => Math.max(max, child.column), 0);
      const baseColumn = gateType === "OR" ? 3 : 2;
      const column = Math.max(baseColumn, childMaxColumn + 1);

      childRefs.forEach((child, index) => {
        createEdge(child.nodeId, child.sourceHandle, gateId, `${INPUT_HANDLE_PREFIX}${index}`);
      });

      registerPlacement(gateId, column);

      return {
        nodeId: gateId,
        sourceHandle: OUTPUT_HANDLE,
        column
      };
    }

    return getConstantInput(0);
  };

  const rootRef = buildNode(parsed.expression);

  const outputNodeId = nextId("output");
  const outputColumn = Math.max(4, rootRef.column + 1);

  nodes.push({
    id: outputNodeId,
    type: "outputNode",
    position: { x: 0, y: 0 },
    data: {
      id: outputNodeId,
      label: parsed.outputName,
      nodeKind: "output"
    } satisfies OutputVisualData
  });

  registerPlacement(outputNodeId, outputColumn);

  createEdge(rootRef.nodeId, rootRef.sourceHandle, outputNodeId, OUTPUT_NODE_INPUT_HANDLE);

  const columnMap = new Map<number, LogicNode[]>();
  const placementByNodeId = new Map(gatePlacements.map((entry) => [entry.nodeId, entry]));

  nodes.forEach((node) => {
    const placement = placementByNodeId.get(node.id);
    let column = placement?.column ?? 0;

    if (node.type === "inputNode") {
      column = 0;
    }

    const bucket = columnMap.get(column) ?? [];
    bucket.push(node);
    columnMap.set(column, bucket);
  });

  const sortedColumns = [...columnMap.keys()].sort((a, b) => a - b);

  sortedColumns.forEach((column) => {
    const bucket = columnMap.get(column) ?? [];

    bucket.sort((a, b) => {
      if (a.type === "inputNode" && b.type === "inputNode") {
        return compareVariableNames(String(a.data.label), String(b.data.label));
      }

      if (a.type !== b.type) {
        const rank = (type: LogicNode["type"]): number => {
          if (type === "inputNode") {
            return 0;
          }
          if (type === "gateNode") {
            return 1;
          }
          return 2;
        };

        return rank(a.type) - rank(b.type);
      }

      const orderA = nodeOrder.get(a.id) ?? 0;
      const orderB = nodeOrder.get(b.id) ?? 0;
      return orderA - orderB;
    });

    bucket.forEach((node, index) => {
      node.position = {
        x: 60 + column * 210,
        y: 80 + index * 110
      };
    });
  });

  return { nodes, edges };
}

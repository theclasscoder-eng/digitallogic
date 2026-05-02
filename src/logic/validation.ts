import type { Connection } from "@xyflow/react";
import { normalizeInputCount } from "./gateDefinitions";
import type { GateVisualData, LogicEdge, LogicNode } from "../types/circuit";

const GATE_INPUT_PREFIX = "input-";
const LEGACY_GATE_INPUT_PREFIX = "in-";
const GATE_OUTPUT_HANDLE = "output-0";
const LEGACY_GATE_OUTPUT_HANDLE = "out-0";

export interface NormalizedConnection {
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

export function isGateInputHandleId(handleId?: string | null): boolean {
  return Boolean(
    handleId?.startsWith(GATE_INPUT_PREFIX) || handleId?.startsWith(LEGACY_GATE_INPUT_PREFIX)
  );
}

function parseHandleIndex(handleId: string, prefix: string): number {
  if (!handleId.startsWith(prefix)) {
    return -1;
  }

  const parsed = Number.parseInt(handleId.slice(prefix.length), 10);
  return Number.isFinite(parsed) ? parsed : -1;
}

function isValidSourceHandle(node: LogicNode, handleId: string): boolean {
  if (node.type === "inputNode") {
    return handleId === "output-0" || handleId === "out";
  }

  if (node.type === "gateNode") {
    return handleId === GATE_OUTPUT_HANDLE || handleId === LEGACY_GATE_OUTPUT_HANDLE;
  }

  return false;
}

function isValidTargetHandle(node: LogicNode, handleId: string): boolean {
  if (node.type === "outputNode") {
    return handleId === "in" || handleId === "in-0";
  }

  if (node.type === "gateNode") {
    const gateData = node.data as GateVisualData;
    const normalizedInputCount = normalizeInputCount(gateData.gateType, gateData.inputCount);
    const index = parseInputHandleIndex(handleId);
    return index >= 0 && index < normalizedInputCount;
  }

  return false;
}

export function normalizeConnection(
  connection: Connection,
  _nodes: LogicNode[],
  _edges: LogicEdge[]
): NormalizedConnection | null {
  if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
    return null;
  }

  return {
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle
  };
}

function createsCycle(sourceId: string, targetId: string, edges: LogicEdge[]): boolean {
  const stack = [targetId];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    if (current === sourceId) {
      return true;
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const edge of edges) {
      if (edge.source === current) {
        stack.push(edge.target);
      }
    }
  }

  return false;
}

export function isValidConnection(
  connection: Connection | NormalizedConnection,
  nodes: LogicNode[],
  edges: LogicEdge[]
): boolean {
  const normalized = normalizeConnection(connection, nodes, edges);

  if (!normalized) {
    return false;
  }

  if (normalized.source === normalized.target) {
    return false;
  }

  const sourceNode = nodes.find((node) => node.id === normalized.source);
  const targetNode = nodes.find((node) => node.id === normalized.target);

  if (!sourceNode || !targetNode) {
    return false;
  }

  if (!isValidSourceHandle(sourceNode, normalized.sourceHandle)) {
    return false;
  }

  if (!isValidTargetHandle(targetNode, normalized.targetHandle)) {
    return false;
  }

  const targetAlreadyConnected = edges.some(
    (edge) =>
      edge.target === normalized.target &&
      edge.targetHandle === normalized.targetHandle
  );

  if (targetAlreadyConnected) {
    return false;
  }

  const duplicateConnection = edges.some(
    (edge) =>
      edge.source === normalized.source &&
      edge.target === normalized.target &&
      edge.sourceHandle === normalized.sourceHandle &&
      edge.targetHandle === normalized.targetHandle
  );

  if (duplicateConnection) {
    return false;
  }

  if (createsCycle(normalized.source, normalized.target, edges)) {
    return false;
  }

  return true;
}

export function parseInputHandleIndex(handleId?: string | null): number {
  if (!handleId) {
    return -1;
  }

  const parsedStandard = parseHandleIndex(handleId, GATE_INPUT_PREFIX);
  if (parsedStandard >= 0) {
    return parsedStandard;
  }

  return parseHandleIndex(handleId, LEGACY_GATE_INPUT_PREFIX);
}

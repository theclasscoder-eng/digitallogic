import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type OnEdgesChange,
  type OnNodesChange,
  type XYPosition
} from "@xyflow/react";
import { create } from "zustand";
import { sortVariableNames } from "../expression/variableUtils";
import { buildCircuitFromExpression } from "../expression/circuitBuilder";
import { ExpressionError } from "../expression/expressionErrors";
import { parseBooleanExpression } from "../expression/parser";
import { evaluateCircuit } from "../logic/evaluateCircuit";
import { normalizeInputCount } from "../logic/gateDefinitions";
import { generateExpression } from "../logic/generateExpression";
import { generateTruthTable } from "../logic/generateTruthTable";
import { buildCanonicalSopExpression } from "../minterms/canonicalSop";
import { parseFunctionMintermInput } from "../minterms/functionMintermParser";
import { buildVariableNamesForCount, formatMintermInput, parseMintermInput } from "../minterms/mintermParser";
import type { ManualMintermState } from "../minterms/mintermTypes";
import type { MinimizationMethod } from "../minimize/minimizationMethod";
import { minimizeCurrentCircuit } from "../minimize/minimizeExpression";
import type { MinimizationResult } from "../minimize/minimizationTypes";
import {
  isGateInputHandleId,
  isValidConnection as validateConnection,
  normalizeConnection,
  parseInputHandleIndex
} from "../logic/validation";
import type {
  CircuitSaveData,
  GateType,
  GateVisualData,
  InputNodeData,
  LogicEdge,
  LogicNode,
  OutputExpression,
  OutputVisualData,
  SimulationResult,
  TruthTableData,
  WireData
} from "../types/circuit";

const STORAGE_KEY = "logic-gate-designer:latest";
const HISTORY_LIMIT = 80;

interface GraphSnapshot {
  nodes: LogicNode[];
  edges: LogicEdge[];
}

interface ExpressionGenerationResult {
  success: boolean;
  error?: string;
}

interface MutationResult {
  success: boolean;
  error?: string;
}

interface CircuitState {
  nodes: LogicNode[];
  edges: LogicEdge[];
  simulation: SimulationResult;
  expressions: OutputExpression[];
  truthTable: TruthTableData;
  minimizedResult: MinimizationResult | null;
  minimizationMethod: MinimizationMethod;
  manualMinterms: ManualMintermState;
  selectedNodeId: string | null;
  designName: string;
  createdAt: string;
  updatedAt: string;
  past: GraphSnapshot[];
  future: GraphSnapshot[];
  addInput: (label: string, isConstant?: boolean) => void;
  addGate: (gateType: GateType) => void;
  addOutput: (label?: string) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  setInputValue: (nodeId: string, value: 0 | 1) => void;
  toggleInputValue: (nodeId: string) => void;
  setGateInputCount: (nodeId: string, inputCount: number) => void;
  onNodesChange: OnNodesChange<LogicNode>;
  onEdgesChange: OnEdgesChange<LogicEdge>;
  onConnect: (connection: Connection) => void;
  isValidConnection: (connection: Connection) => boolean;
  setSelectedNode: (nodeId: string | null) => void;
  removeSelectedNode: () => void;
  clearCanvas: () => void;
  snapshotHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToLocalStorage: (name?: string) => boolean;
  loadFromLocalStorage: () => boolean;
  loadFromData: (data: CircuitSaveData) => void;
  getSaveData: (name?: string) => CircuitSaveData;
  setDesignName: (name: string) => void;
  generateCircuitFromExpression: (
    expressionText: string,
    replaceCurrent: boolean
  ) => ExpressionGenerationResult;
  minimizeCurrentCircuit: () => MinimizationResult;
  setMinimizationMethod: (method: MinimizationMethod) => void;
  clearMinimizationResult: () => void;
  generateMinimizedCircuit: (replaceCurrent: boolean) => ExpressionGenerationResult;
  setManualMintermRawInput: (rawInput: string) => void;
  setManualMintermVariableCount: (count: number) => void;
  applyManualMinterms: () => MutationResult;
  generateFromInput: () => MutationResult;
  generateKMapFromInput: () => MutationResult;
  generateCircuitFromInput: (replaceCurrent?: boolean) => MutationResult;
  addManualMinterm: (value: number) => MutationResult;
  clearManualMinterms: () => void;
}

function uid(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${random}`;
}

function cloneGraph(nodes: LogicNode[], edges: LogicEdge[]): GraphSnapshot {
  return {
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges))
  };
}

function deriveData(nodes: LogicNode[], edges: LogicEdge[]): {
  simulation: SimulationResult;
  expressions: OutputExpression[];
  truthTable: TruthTableData;
} {
  return {
    simulation: evaluateCircuit(nodes, edges),
    expressions: generateExpression(nodes, edges),
    truthTable: generateTruthTable(nodes, edges)
  };
}

function getInputVariableNames(truthTable: TruthTableData): string[] {
  return sortVariableNames(truthTable.columns.filter((column) => column.kind === "input").map((column) => column.label));
}

function getPreferredOutputLabel(truthTable: TruthTableData): string {
  return truthTable.columns.find((column) => column.kind === "output")?.label ?? "F";
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function createDefaultManualMinterms(truthTable: TruthTableData): ManualMintermState {
  const preferred = getInputVariableNames(truthTable);
  const variableCount = Math.max(2, preferred.length || 2);
  const outputLabel = getPreferredOutputLabel(truthTable);
  const variables = buildVariableNamesForCount(variableCount, preferred);

  return {
    enabled: false,
    sourceType: "truth-table",
    outputLabel,
    variableCount,
    variables,
    minterms: [],
    dontCares: [],
    canonicalSopExpression: buildCanonicalSopExpression(outputLabel, variables, []),
    rawInput: "",
    error: undefined
  };
}

function syncManualMinterms(manualMinterms: ManualMintermState, truthTable: TruthTableData): ManualMintermState {
  const preferred = getInputVariableNames(truthTable);
  const variableCount = Math.max(2, manualMinterms.variableCount || preferred.length || 2);
  const maxValue = 2 ** variableCount - 1;
  const outputLabel = manualMinterms.outputLabel || getPreferredOutputLabel(truthTable);
  const sourceType =
    manualMinterms.sourceType ??
    (manualMinterms.enabled ? "manual-minterms" : "truth-table");

  const minterms = uniqueSorted(manualMinterms.minterms);
  const dontCares = uniqueSorted((manualMinterms.dontCares ?? []).filter((value) => !minterms.includes(value)));
  const hasInvalid = [...minterms, ...dontCares].some((value) => value < 0 || value > maxValue);
  const nextError =
    hasInvalid && manualMinterms.enabled
      ? `One or more minterms are outside the valid range for ${variableCount} variables (0-${maxValue}).`
      : manualMinterms.error;
  const preferredVariables =
    manualMinterms.sourceType === "function-minterms"
      ? [...manualMinterms.variables, ...preferred]
      : [...manualMinterms.variables, ...preferred];
  const variables = buildVariableNamesForCount(variableCount, preferredVariables);
  const canonicalSopExpression =
    manualMinterms.canonicalSopExpression ?? buildCanonicalSopExpression(outputLabel, variables, minterms);

  return {
    ...manualMinterms,
    sourceType,
    variableCount,
    outputLabel,
    variables,
    minterms,
    dontCares,
    canonicalSopExpression,
    error: nextError
  };
}

function buildFunctionManualState(params: {
  rawInput: string;
  outputLabel: string;
  variableCount: number;
  variables: string[];
  minterms: number[];
  dontCares: number[];
  canonicalSopExpression: string;
}): ManualMintermState {
  const { rawInput, outputLabel, variableCount, variables, minterms, dontCares, canonicalSopExpression } = params;
  return {
    enabled: true,
    sourceType: "function-minterms",
    outputLabel,
    variableCount,
    variables: [...variables],
    minterms: uniqueSorted(minterms),
    dontCares: uniqueSorted(dontCares),
    canonicalSopExpression,
    rawInput,
    error: undefined
  };
}

function buildManualMintermState(params: {
  rawInput: string;
  outputLabel: string;
  variableCount: number;
  variables: string[];
  minterms: number[];
  dontCares?: number[];
}): ManualMintermState {
  const { rawInput, outputLabel, variableCount, variables, minterms, dontCares = [] } = params;
  const uniqueMinterms = uniqueSorted(minterms);
  const uniqueDontCares = uniqueSorted(dontCares).filter((value) => !uniqueMinterms.includes(value));
  const canonicalSopExpression = buildCanonicalSopExpression(outputLabel, variables, uniqueMinterms);

  return {
    enabled: true,
    sourceType: "manual-minterms",
    outputLabel,
    variableCount,
    variables: [...variables],
    minterms: uniqueMinterms,
    dontCares: uniqueDontCares,
    canonicalSopExpression,
    rawInput,
    error: undefined
  };
}

function nextNodePosition(nodes: LogicNode[]): XYPosition {
  const index = nodes.length;
  return {
    x: 160 + (index % 4) * 220,
    y: 120 + Math.floor(index / 4) * 140
  };
}

function getGraphMaxX(nodes: LogicNode[]): number {
  if (nodes.length === 0) {
    return 0;
  }

  return nodes.reduce((max, node) => Math.max(max, node.position.x), Number.NEGATIVE_INFINITY);
}

function createInputNode(label: string, isConstant: boolean, position: XYPosition): LogicNode {
  const nodeId = uid("input");
  const initialValue = label === "1" ? 1 : 0;

  return {
    id: nodeId,
    type: "inputNode",
    position,
    data: {
      id: nodeId,
      label,
      value: initialValue,
      isConstant,
      nodeKind: "input"
    } satisfies InputNodeData
  };
}

function createGateNode(gateType: GateType, position: XYPosition): LogicNode {
  const nodeId = uid("gate");
  const inputCount = normalizeInputCount(gateType, gateType === "NOT" ? 1 : 2);

  return {
    id: nodeId,
    type: "gateNode",
    position,
    data: {
      id: nodeId,
      gateType,
      label: gateType,
      inputCount,
      outputCount: 1,
      nodeKind: "gate"
    } satisfies GateVisualData
  };
}

function createOutputNode(label: string, position: XYPosition): LogicNode {
  const nodeId = uid("output");

  return {
    id: nodeId,
    type: "outputNode",
    position,
    data: {
      id: nodeId,
      label,
      nodeKind: "output"
    } satisfies OutputVisualData
  };
}

function pushHistory(state: CircuitState): GraphSnapshot[] {
  return [...state.past, cloneGraph(state.nodes, state.edges)].slice(-HISTORY_LIMIT);
}

const initialDerived = deriveData([], []);
const initialManualMinterms = createDefaultManualMinterms(initialDerived.truthTable);

export const useCircuitStore = create<CircuitState>((set, get) => ({
  nodes: [],
  edges: [],
  simulation: initialDerived.simulation,
  expressions: initialDerived.expressions,
  truthTable: initialDerived.truthTable,
  minimizedResult: null,
  minimizationMethod: "auto",
  manualMinterms: initialManualMinterms,
  selectedNodeId: null,
  designName: "My Logic Circuit",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  past: [],
  future: [],

  addInput: (label, isConstant = false) => {
    const state = get();
    const node = createInputNode(label, isConstant, nextNodePosition(state.nodes));
    const nodes = [...state.nodes, node];
    const edges = state.edges;
    const derived = deriveData(nodes, edges);

    set({
      nodes,
      edges,
      ...derived,
      manualMinterms: syncManualMinterms(state.manualMinterms, derived.truthTable),
      minimizedResult: null,
      past: pushHistory(state),
      future: [],
      updatedAt: new Date().toISOString()
    });
  },

  addGate: (gateType) => {
    const state = get();
    const node = createGateNode(gateType, nextNodePosition(state.nodes));
    const nodes = [...state.nodes, node];
    const edges = state.edges;
    const derived = deriveData(nodes, edges);

    set({
      nodes,
      edges,
      ...derived,
      manualMinterms: syncManualMinterms(state.manualMinterms, derived.truthTable),
      minimizedResult: null,
      past: pushHistory(state),
      future: [],
      updatedAt: new Date().toISOString()
    });
  },

  addOutput: (label = "F") => {
    const state = get();
    const node = createOutputNode(label, nextNodePosition(state.nodes));
    const nodes = [...state.nodes, node];
    const edges = state.edges;
    const derived = deriveData(nodes, edges);

    set({
      nodes,
      edges,
      ...derived,
      manualMinterms: syncManualMinterms(state.manualMinterms, derived.truthTable),
      minimizedResult: null,
      past: pushHistory(state),
      future: [],
      updatedAt: new Date().toISOString()
    });
  },

  updateNodeLabel: (nodeId, label) => {
    const normalized = label.trim();
    if (!normalized) {
      return;
    }

    const state = get();
    const nodes = state.nodes.map((node) => {
      if (node.id !== nodeId) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          label: normalized
        }
      };
    });

    const derived = deriveData(nodes, state.edges);

    set({
      nodes,
      edges: state.edges,
      ...derived,
      manualMinterms: syncManualMinterms(state.manualMinterms, derived.truthTable),
      minimizedResult: null,
      past: pushHistory(state),
      future: [],
      updatedAt: new Date().toISOString()
    });
  },

  setInputValue: (nodeId, value) => {
    const state = get();
    const nodes = state.nodes.map((node) => {
      if (node.id !== nodeId || node.type !== "inputNode") {
        return node;
      }

      if ((node.data as InputNodeData).isConstant) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          value
        }
      };
    });

    const derived = deriveData(nodes, state.edges);

    set({
      nodes,
      edges: state.edges,
      ...derived,
      manualMinterms: syncManualMinterms(state.manualMinterms, derived.truthTable),
      minimizedResult: null,
      past: pushHistory(state),
      future: [],
      updatedAt: new Date().toISOString()
    });
  },

  toggleInputValue: (nodeId) => {
    const state = get();
    const node = state.nodes.find((entry) => entry.id === nodeId && entry.type === "inputNode");

    if (!node || (node.data as InputNodeData).isConstant) {
      return;
    }

    const current = (node.data as InputNodeData).value;
    get().setInputValue(nodeId, current === 1 ? 0 : 1);
  },

  setGateInputCount: (nodeId, inputCount) => {
    const state = get();
    const gateNode = state.nodes.find((node) => node.id === nodeId && node.type === "gateNode");

    if (!gateNode) {
      return;
    }

    const gateData = gateNode.data as GateVisualData;
    const normalizedInputCount = normalizeInputCount(gateData.gateType, inputCount);

    if (normalizedInputCount === gateData.inputCount) {
      return;
    }

    const nodes = state.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: {
              ...node.data,
              inputCount: normalizedInputCount
            }
          }
        : node
    );

    const edges = state.edges.filter((edge) => {
      if (edge.target !== nodeId || !isGateInputHandleId(edge.targetHandle)) {
        return true;
      }

      const index = parseInputHandleIndex(edge.targetHandle);
      return index >= 0 && index < normalizedInputCount;
    });

    const derived = deriveData(nodes, edges);

    set({
      nodes,
      edges,
      ...derived,
      manualMinterms: syncManualMinterms(state.manualMinterms, derived.truthTable),
      minimizedResult: null,
      past: pushHistory(state),
      future: [],
      updatedAt: new Date().toISOString()
    });
  },

  onNodesChange: (changes) => {
    const state = get();
    const nodes = applyNodeChanges(changes, state.nodes) as LogicNode[];
    const derived = deriveData(nodes, state.edges);
    const shouldTrackHistory = changes.some((change) => change.type === "remove");

    set({
      nodes,
      edges: state.edges,
      ...derived,
      manualMinterms: syncManualMinterms(state.manualMinterms, derived.truthTable),
      minimizedResult: shouldTrackHistory ? null : state.minimizedResult,
      past: shouldTrackHistory ? pushHistory(state) : state.past,
      future: shouldTrackHistory ? [] : state.future,
      updatedAt: new Date().toISOString(),
      selectedNodeId: nodes.some((node) => node.id === state.selectedNodeId) ? state.selectedNodeId : null
    });
  },

  onEdgesChange: (changes) => {
    const state = get();
    const edges = applyEdgeChanges(changes, state.edges) as LogicEdge[];
    const derived = deriveData(state.nodes, edges);
    const shouldTrackHistory = changes.some((change) => change.type === "remove");

    set({
      nodes: state.nodes,
      edges,
      ...derived,
      manualMinterms: syncManualMinterms(state.manualMinterms, derived.truthTable),
      minimizedResult: shouldTrackHistory ? null : state.minimizedResult,
      past: shouldTrackHistory ? pushHistory(state) : state.past,
      future: shouldTrackHistory ? [] : state.future,
      updatedAt: new Date().toISOString()
    });
  },

  onConnect: (connection) => {
    const state = get();
    const normalized = normalizeConnection(connection, state.nodes, state.edges);

    if (!normalized || !validateConnection(normalized, state.nodes, state.edges)) {
      return;
    }

    const edgeId = uid("wire");
    const wireData: WireData = {
      id: edgeId,
      sourceNodeId: normalized.source as string,
      sourceHandleId: normalized.sourceHandle,
      targetNodeId: normalized.target as string,
      targetHandleId: normalized.targetHandle,
      expression: "?"
    };

    const edges = addEdge<LogicEdge>(
      {
        ...normalized,
        id: edgeId,
        type: "expression",
        data: wireData
      },
      state.edges
    );

    const derived = deriveData(state.nodes, edges);

    set({
      nodes: state.nodes,
      edges,
      ...derived,
      manualMinterms: syncManualMinterms(state.manualMinterms, derived.truthTable),
      minimizedResult: null,
      past: pushHistory(state),
      future: [],
      updatedAt: new Date().toISOString()
    });
  },

  isValidConnection: (connection) => {
    const state = get();
    const normalized = normalizeConnection(connection, state.nodes, state.edges);
    return normalized ? validateConnection(normalized, state.nodes, state.edges) : false;
  },

  setSelectedNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  removeSelectedNode: () => {
    const state = get();

    if (!state.selectedNodeId) {
      return;
    }

    const nodes = state.nodes.filter((node) => node.id !== state.selectedNodeId);
    const edges = state.edges.filter(
      (edge) => edge.source !== state.selectedNodeId && edge.target !== state.selectedNodeId
    );
    const derived = deriveData(nodes, edges);

    set({
      nodes,
      edges,
      ...derived,
      manualMinterms: syncManualMinterms(state.manualMinterms, derived.truthTable),
      selectedNodeId: null,
      minimizedResult: null,
      past: pushHistory(state),
      future: [],
      updatedAt: new Date().toISOString()
    });
  },

  clearCanvas: () => {
    const state = get();
    const derived = deriveData([], []);

    set({
      nodes: [],
      edges: [],
      ...derived,
      manualMinterms: createDefaultManualMinterms(derived.truthTable),
      selectedNodeId: null,
      minimizedResult: null,
      past: pushHistory(state),
      future: [],
      updatedAt: new Date().toISOString()
    });
  },

  snapshotHistory: () => {
    const state = get();
    set({
      past: pushHistory(state),
      future: []
    });
  },

  undo: () => {
    const state = get();
    if (state.past.length === 0) {
      return;
    }

    const previous = state.past[state.past.length - 1];
    const currentSnapshot = cloneGraph(state.nodes, state.edges);
    const derived = deriveData(previous.nodes, previous.edges);

    set({
      nodes: previous.nodes,
      edges: previous.edges,
      ...derived,
      manualMinterms: syncManualMinterms(state.manualMinterms, derived.truthTable),
      minimizedResult: null,
      past: state.past.slice(0, -1),
      future: [currentSnapshot, ...state.future].slice(0, HISTORY_LIMIT),
      updatedAt: new Date().toISOString(),
      selectedNodeId: previous.nodes.some((node) => node.id === state.selectedNodeId)
        ? state.selectedNodeId
        : null
    });
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) {
      return;
    }

    const next = state.future[0];
    const currentSnapshot = cloneGraph(state.nodes, state.edges);
    const derived = deriveData(next.nodes, next.edges);

    set({
      nodes: next.nodes,
      edges: next.edges,
      ...derived,
      manualMinterms: syncManualMinterms(state.manualMinterms, derived.truthTable),
      minimizedResult: null,
      past: [...state.past, currentSnapshot].slice(-HISTORY_LIMIT),
      future: state.future.slice(1),
      updatedAt: new Date().toISOString(),
      selectedNodeId: next.nodes.some((node) => node.id === state.selectedNodeId)
        ? state.selectedNodeId
        : null
    });
  },

  canUndo: () => get().past.length > 0,

  canRedo: () => get().future.length > 0,

  saveToLocalStorage: (name) => {
    const state = get();

    try {
      const now = new Date().toISOString();
      const data: CircuitSaveData = {
        name: name ?? state.designName,
        nodes: state.nodes,
        edges: state.edges,
        createdAt: state.createdAt,
        updatedAt: now,
        manualMinterms: state.manualMinterms,
        minimizationMethod: state.minimizationMethod
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      set({ designName: data.name, updatedAt: now });
      return true;
    } catch {
      return false;
    }
  },

  loadFromLocalStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return false;
      }

      const parsed = JSON.parse(raw) as CircuitSaveData;
      get().loadFromData(parsed);
      return true;
    } catch {
      return false;
    }
  },

  loadFromData: (data) => {
    const nodes = Array.isArray(data.nodes) ? (data.nodes as LogicNode[]) : [];
    const edges = Array.isArray(data.edges) ? (data.edges as LogicEdge[]) : [];
    const derived = deriveData(nodes, edges);
    const loadedManual = data.manualMinterms ?? createDefaultManualMinterms(derived.truthTable);
    const loadedMethod: MinimizationMethod =
      data.minimizationMethod === "kmap" || data.minimizationMethod === "boolean-algebra"
        ? data.minimizationMethod
        : "auto";

    set({
      nodes,
      edges,
      ...derived,
      minimizationMethod: loadedMethod,
      manualMinterms: syncManualMinterms(loadedManual, derived.truthTable),
      selectedNodeId: null,
      minimizedResult: null,
      past: [],
      future: [],
      designName: data.name || "Imported Design",
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    });
  },

  getSaveData: (name) => {
    const state = get();
    const now = new Date().toISOString();

    return {
      name: name ?? state.designName,
      nodes: state.nodes,
      edges: state.edges,
      createdAt: state.createdAt,
      updatedAt: now,
      manualMinterms: state.manualMinterms,
      minimizationMethod: state.minimizationMethod
    };
  },

  generateCircuitFromExpression: (expressionText, replaceCurrent) => {
    try {
      const parsed = parseBooleanExpression(expressionText);
      const generated = buildCircuitFromExpression(parsed);
      const state = get();

      const normalizedGeneratedNodes = generated.nodes.map((node) => {
        if (node.type !== "gateNode") {
          return node;
        }

        const gateData = node.data as GateVisualData;
        return {
          ...node,
          data: {
            ...gateData,
            inputCount: normalizeInputCount(gateData.gateType, gateData.inputCount)
          }
        };
      });

      let nodes: LogicNode[] = normalizedGeneratedNodes;
      let edges: LogicEdge[] = generated.edges;

      if (!replaceCurrent) {
        const offsetX = getGraphMaxX(state.nodes) + 280;
        nodes = [
          ...state.nodes,
          ...normalizedGeneratedNodes.map((node) => ({
            ...node,
            position: {
              x: node.position.x + offsetX,
              y: node.position.y
            }
          }))
        ];
        edges = [...state.edges, ...generated.edges];
      }

      const derived = deriveData(nodes, edges);

      set({
        nodes,
        edges,
        ...derived,
        manualMinterms: createDefaultManualMinterms(derived.truthTable),
        selectedNodeId: null,
        minimizedResult: null,
        past: pushHistory(state),
        future: [],
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      if (error instanceof ExpressionError) {
        return {
          success: false,
          error: `${error.message} (at character ${error.position + 1})`
        };
      }

      return {
        success: false,
        error: "Could not parse expression. Check syntax and try again."
      };
    }
  },

  minimizeCurrentCircuit: () => {
    const state = get();
    const result = minimizeCurrentCircuit({
      truthTable: state.truthTable,
      expressions: state.expressions,
      manualMinterms: state.manualMinterms,
      options: {
        method: state.minimizationMethod,
        maxKMapVariables: 4
      }
    });

    set({ minimizedResult: result });
    return result;
  },

  setMinimizationMethod: (method) => {
    const state = get();
    if (state.minimizationMethod === method) {
      return;
    }

    set({
      minimizationMethod: method,
      minimizedResult: null
    });
  },

  clearMinimizationResult: () => {
    set({ minimizedResult: null });
  },

  generateMinimizedCircuit: (replaceCurrent) => {
    const state = get();
    const result = state.minimizedResult;

    if (!result || !result.supported) {
      return {
        success: false,
        error: result?.reason ?? "Run minimization first."
      };
    }

    const outputLabel = result.outputLabel ?? "F";
    const expressionText = `${outputLabel} = ${result.minimizedExpression}`;
    return get().generateCircuitFromExpression(expressionText, replaceCurrent);
  },

  setManualMintermRawInput: (rawInput) => {
    const state = get();
    set({
      manualMinterms: {
        ...state.manualMinterms,
        rawInput,
        error: undefined
      }
    });
  },

  setManualMintermVariableCount: (count) => {
    const state = get();
    const variableCount = Number.isFinite(count) ? Math.max(2, count) : state.manualMinterms.variableCount;
    const preferred = getInputVariableNames(state.truthTable);
    const parsed = parseMintermInput(state.manualMinterms.rawInput, variableCount);
    const nextMinterms = parsed.error ? state.manualMinterms.minterms : parsed.minterms;
    const variables = buildVariableNamesForCount(variableCount, [...state.manualMinterms.variables, ...preferred]);
    const outputLabel = state.manualMinterms.outputLabel || getPreferredOutputLabel(state.truthTable);
    const canonicalSopExpression = buildCanonicalSopExpression(outputLabel, variables, nextMinterms);

    set({
      manualMinterms: {
        ...state.manualMinterms,
        variableCount,
        variables,
        minterms: nextMinterms,
        dontCares: uniqueSorted(state.manualMinterms.dontCares).filter((value) => !nextMinterms.includes(value)),
        canonicalSopExpression,
        error: parsed.error
      },
      minimizedResult: null
    });
  },

  applyManualMinterms: () => {
    return get().generateKMapFromInput();
  },

  generateFromInput: () => {
    return get().generateCircuitFromInput(true);
  },

  generateKMapFromInput: () => {
    const state = get();
    const rawInput = state.manualMinterms.rawInput.trim();
    if (!rawInput) {
      const error = "Enter an expression or minterm function first.";
      set({
        manualMinterms: {
          ...state.manualMinterms,
          error
        }
      });
      return { success: false, error };
    }

    const parsedFunction = parseFunctionMintermInput(rawInput);
    if (!parsedFunction.error) {
      const manualState = syncManualMinterms(
        buildFunctionManualState({
          rawInput,
          outputLabel: parsedFunction.outputLabel,
          variableCount: parsedFunction.variableCount,
          variables: parsedFunction.variables,
          minterms: parsedFunction.minterms,
          dontCares: parsedFunction.dontCares,
          canonicalSopExpression: parsedFunction.canonicalSopExpression
        }),
        state.truthTable
      );

      set({
        manualMinterms: manualState,
        minimizedResult: null
      });

      return { success: true };
    }

    const variableCount = Math.max(2, state.manualMinterms.variableCount);
    const preferred = getInputVariableNames(state.truthTable);
    const parsed = parseMintermInput(rawInput, variableCount);
    if (parsed.error) {
      set({
        manualMinterms: {
          ...state.manualMinterms,
          variableCount,
          variables: buildVariableNamesForCount(variableCount, [...state.manualMinterms.variables, ...preferred]),
          error: parsed.error
        },
        minimizedResult: null
      });

      return {
        success: false,
        error: parsed.error
      };
    }

    const outputLabel = state.manualMinterms.outputLabel || getPreferredOutputLabel(state.truthTable);
    const variables = buildVariableNamesForCount(variableCount, [...state.manualMinterms.variables, ...preferred]);
    const formatted = formatMintermInput(parsed.minterms);
    set({
      manualMinterms: syncManualMinterms(
        buildManualMintermState({
          rawInput: formatted,
          outputLabel,
          variableCount,
          variables,
          minterms: parsed.minterms
        }),
        state.truthTable
      ),
      minimizedResult: null
    });

    return {
      success: true
    };
  },

  generateCircuitFromInput: (replaceCurrent = true) => {
    const state = get();
    const rawInput = state.manualMinterms.rawInput.trim();
    if (!rawInput) {
      const error = "Enter an expression or minterm function first.";
      set({
        manualMinterms: {
          ...state.manualMinterms,
          error
        }
      });
      return { success: false, error };
    }

    const parsedFunction = parseFunctionMintermInput(rawInput);
    if (!parsedFunction.error) {
      const expressionResult = get().generateCircuitFromExpression(
        parsedFunction.canonicalSopExpression,
        replaceCurrent
      );

      if (!expressionResult.success) {
        const error = expressionResult.error ?? "Could not generate function-minterm circuit.";
        set({
          manualMinterms: {
            ...state.manualMinterms,
            error
          }
        });
        return { success: false, error };
      }

      const latestState = get();
      set({
        manualMinterms: syncManualMinterms(
          buildFunctionManualState({
            rawInput,
            outputLabel: parsedFunction.outputLabel,
            variableCount: parsedFunction.variableCount,
            variables: parsedFunction.variables,
            minterms: parsedFunction.minterms,
            dontCares: parsedFunction.dontCares,
            canonicalSopExpression: parsedFunction.canonicalSopExpression
          }),
          latestState.truthTable
        ),
        minimizedResult: null
      });

      return { success: true };
    }

    const booleanResult = get().generateCircuitFromExpression(rawInput, replaceCurrent);
    if (booleanResult.success) {
      const latestState = get();
      set({
        manualMinterms: createDefaultManualMinterms(latestState.truthTable),
        minimizedResult: null
      });
      return { success: true };
    }

    const variableCount = Math.max(2, state.manualMinterms.variableCount);
    const preferred = getInputVariableNames(state.truthTable);
    const parsed = parseMintermInput(rawInput, variableCount);
    if (parsed.error) {
      set({
        manualMinterms: {
          ...state.manualMinterms,
          error: parsed.error
        }
      });
      return { success: false, error: parsed.error };
    }

    const outputLabel = state.manualMinterms.outputLabel || getPreferredOutputLabel(state.truthTable);
    const variables = buildVariableNamesForCount(variableCount, [...state.manualMinterms.variables, ...preferred]);
    const canonicalSopExpression = buildCanonicalSopExpression(outputLabel, variables, parsed.minterms);

    const circuitResult = get().generateCircuitFromExpression(canonicalSopExpression, replaceCurrent);
    if (!circuitResult.success) {
      const error = circuitResult.error ?? "Could not generate circuit from minterms.";
      set({
        manualMinterms: {
          ...state.manualMinterms,
          error
        }
      });
      return { success: false, error };
    }

    const latestState = get();
    set({
      manualMinterms: syncManualMinterms(
        buildManualMintermState({
          rawInput: formatMintermInput(parsed.minterms),
          outputLabel,
          variableCount,
          variables,
          minterms: parsed.minterms
        }),
        latestState.truthTable
      ),
      minimizedResult: null
    });

    return { success: true };
  },

  addManualMinterm: (value) => {
    const state = get();
    const variableCount = Math.max(2, state.manualMinterms.variableCount);
    const maxValue = 2 ** variableCount - 1;

    if (!Number.isInteger(value) || value < 0) {
      const error = "Minterm must be a non-negative integer.";
      set({
        manualMinterms: {
          ...state.manualMinterms,
          error
        }
      });
      return { success: false, error };
    }

    if (value > maxValue) {
      const error = `Minterm ${value} is invalid for ${variableCount} variables. Valid range is 0-${maxValue}.`;
      set({
        manualMinterms: {
          ...state.manualMinterms,
          error
        }
      });
      return { success: false, error };
    }

    const preferred = getInputVariableNames(state.truthTable);
    const minterms = uniqueSorted([...state.manualMinterms.minterms, value]);
    const rawInput = formatMintermInput(minterms);
    const outputLabel = state.manualMinterms.outputLabel || getPreferredOutputLabel(state.truthTable);
    const variables = buildVariableNamesForCount(variableCount, [...state.manualMinterms.variables, ...preferred]);

    set({
      manualMinterms: syncManualMinterms(
        buildManualMintermState({
          rawInput,
          outputLabel,
          variableCount,
          variables,
          minterms,
          dontCares: state.manualMinterms.dontCares
        }),
        state.truthTable
      ),
      minimizedResult: null
    });

    return {
      success: true
    };
  },

  clearManualMinterms: () => {
    const state = get();
    const preferred = getInputVariableNames(state.truthTable);
    const variableCount = Math.max(2, preferred.length || 2);

    set({
      manualMinterms: {
        enabled: false,
        sourceType: "truth-table",
        outputLabel: getPreferredOutputLabel(state.truthTable),
        variableCount,
        variables: buildVariableNamesForCount(variableCount, preferred),
        minterms: [],
        dontCares: [],
        canonicalSopExpression: buildCanonicalSopExpression(
          getPreferredOutputLabel(state.truthTable),
          buildVariableNamesForCount(variableCount, preferred),
          []
        ),
        rawInput: "",
        error: undefined
      },
      minimizedResult: null
    });
  },

  setDesignName: (name) => {
    set({ designName: name });
  }
}));

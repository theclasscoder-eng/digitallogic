import type { Edge, Node } from "@xyflow/react";
import type { ManualMintermState } from "../minterms/mintermTypes";
import type { MinimizationMethod } from "../minimize/minimizationMethod";

export type GateType =
  | "AND"
  | "OR"
  | "NOT"
  | "NAND"
  | "NOR"
  | "XOR"
  | "XNOR";

export type WorkspaceMode = "gates" | "mux" | "rom" | "sequential";

export interface LogicInput extends Record<string, unknown> {
  id: string;
  label: string;
  value: 0 | 1;
  isConstant?: boolean;
}

export interface GateNodeData extends Record<string, unknown> {
  id: string;
  gateType: GateType;
  label: string;
  inputCount: number;
  outputCount: number;
  outputValue?: 0 | 1;
}

export interface OutputNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  value?: 0 | 1;
}

export interface WireData extends Record<string, unknown> {
  id: string;
  sourceNodeId: string;
  sourceHandleId: string;
  targetNodeId: string;
  targetHandleId: string;
  value?: 0 | 1;
  expression?: string;
}

export interface CircuitSaveData {
  nodes: any[];
  edges: any[];
  createdAt: string;
  updatedAt: string;
  name: string;
  manualMinterms?: ManualMintermState;
  minimizationMethod?: MinimizationMethod;
}

export interface InputNodeData extends LogicInput {
  nodeKind: "input";
}

export interface GateVisualData extends GateNodeData {
  nodeKind: "gate";
}

export interface OutputVisualData extends OutputNodeData {
  nodeKind: "output";
}

export type LogicNodeData = InputNodeData | GateVisualData | OutputVisualData;

export type LogicNodeType = "inputNode" | "gateNode" | "outputNode";

export type LogicNode = Node<LogicNodeData, LogicNodeType>;
export type LogicEdge = Edge<WireData>;

export interface OutputExpression {
  outputId: string;
  label: string;
  expression: string;
}

export interface TruthTableColumn {
  id: string;
  label: string;
  kind: "input" | "output";
}

export interface TruthTableData {
  columns: TruthTableColumn[];
  rows: Array<Record<string, 0 | 1>>;
  tooManyVariables?: boolean;
  variableLimit?: number;
}

export interface KMapCell {
  minterm: number;
  value: 0 | 1;
  rowBits: string;
  colBits: string;
}

export interface KMapData {
  variables: string[];
  rowLabels: string[];
  colLabels: string[];
  cells: KMapCell[][];
}

export interface SimulationResult {
  nodeValues: Record<string, 0 | 1>;
  edgeValues: Record<string, 0 | 1>;
  outputValues: Record<string, 0 | 1>;
  hasCycle: boolean;
}

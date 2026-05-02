import { compareVariableNames, sortVariableNames } from "../expression/variableUtils";
import { buildCanonicalSopExpression } from "../minterms/canonicalSop";
import { buildVariableNamesForCount } from "../minterms/mintermParser";
import type { ManualMintermState } from "../minterms/mintermTypes";
import type { OutputExpression, TruthTableColumn, TruthTableData } from "../types/circuit";
import { minimizeByBooleanAlgebra } from "./booleanAlgebraMinimizer";
import {
  DEFAULT_MINIMIZATION_OPTIONS,
  resolveMethodUsed,
  type MinimizationOptions
} from "./minimizationMethod";
import type { MinimizationResult } from "./minimizationTypes";
import { minimizeByKMap } from "./kmapMinimizer";

interface MinimizationSource {
  outputLabel: string;
  variables: string[];
  minterms: number[];
  originalExpression: string;
}

function chooseOutputColumn(columns: TruthTableColumn[], expressions: OutputExpression[]): TruthTableColumn | null {
  const outputColumns = columns.filter((column) => column.kind === "output");
  if (outputColumns.length === 0) {
    return null;
  }

  const preferredLabel =
    expressions.find((expression) => expression.label.toUpperCase() === "F")?.label ??
    expressions[0]?.label;

  if (preferredLabel) {
    const preferred = outputColumns.find((column) => column.label === preferredLabel);
    if (preferred) {
      return preferred;
    }
  }

  return outputColumns.sort((a, b) => compareVariableNames(a.label, b.label))[0];
}

function unsupportedResult(
  reason: string,
  methodUsed: "kmap" | "boolean-algebra",
  outputLabel = "F"
): MinimizationResult {
  return {
    originalExpression: `${outputLabel} = 0`,
    minimizedExpression: "0",
    minterms: [],
    kmapSteps: [],
    algebraSteps: [],
    groups: [],
    steps: [],
    isAlreadyMinimal: true,
    variableCount: 0,
    supported: false,
    methodUsed,
    reason,
    outputLabel
  };
}

function buildManualOriginalExpression(
  outputLabel: string,
  variables: string[],
  minterms: number[],
  manualMinterms?: ManualMintermState
): string {
  if (manualMinterms?.canonicalSopExpression) {
    return manualMinterms.canonicalSopExpression;
  }

  if (minterms.length > 0) {
    return buildCanonicalSopExpression(outputLabel, variables, minterms);
  }

  return `${outputLabel} = 0`;
}

function extractSource(params: {
  truthTable: TruthTableData;
  expressions: OutputExpression[];
  manualMinterms?: ManualMintermState;
}): MinimizationSource | null {
  const { truthTable, expressions, manualMinterms } = params;
  const outputColumn = chooseOutputColumn(truthTable.columns, expressions);
  const hasManualMinterms = Boolean(manualMinterms?.enabled && manualMinterms.minterms.length > 0);
  const inputColumns = truthTable.columns.filter((column) => column.kind === "input");
  const preferredVariableNames = sortVariableNames(inputColumns.map((column) => column.label));

  if (hasManualMinterms && manualMinterms) {
    const fallbackCount = preferredVariableNames.length > 0 ? preferredVariableNames.length : 2;
    const variableCount = Math.max(1, manualMinterms.variableCount || fallbackCount);
    const variables = buildVariableNamesForCount(variableCount, [
      ...manualMinterms.variables,
      ...preferredVariableNames
    ]);
    const minterms = [...new Set(manualMinterms.minterms)].sort((a, b) => a - b);
    const outputLabel = manualMinterms.outputLabel || outputColumn?.label || "F";

    return {
      outputLabel,
      variables,
      minterms,
      originalExpression: buildManualOriginalExpression(outputLabel, variables, minterms, manualMinterms)
    };
  }

  if (!outputColumn) {
    return null;
  }

  const inputColumnByLabel = new Map(inputColumns.map((column) => [column.label, column]));
  const variables = sortVariableNames(inputColumns.map((column) => column.label));
  const orderedInputColumns = variables
    .map((label) => inputColumnByLabel.get(label))
    .filter(Boolean) as TruthTableColumn[];

  const minterms = truthTable.rows
    .filter((row) => (row[outputColumn.id] ?? 0) === 1)
    .map((row) => {
      const bits = orderedInputColumns.map((column) => row[column.id] ?? 0).join("");
      return bits.length > 0 ? Number.parseInt(bits, 2) : 0;
    })
    .sort((a, b) => a - b);

  const outputLabel = outputColumn.label;
  const originalExpressionValue =
    expressions.find((expression) => expression.label === outputLabel)?.expression ??
    expressions[0]?.expression ??
    buildCanonicalSopExpression(outputLabel, variables, minterms).split("=")[1]?.trim() ??
    "0";

  return {
    outputLabel,
    variables,
    minterms,
    originalExpression: `${outputLabel} = ${originalExpressionValue}`
  };
}

export function minimizeCurrentCircuit(params: {
  truthTable: TruthTableData;
  expressions: OutputExpression[];
  manualMinterms?: ManualMintermState;
  options?: Partial<MinimizationOptions>;
}): MinimizationResult {
  const options: MinimizationOptions = {
    ...DEFAULT_MINIMIZATION_OPTIONS,
    ...(params.options ?? {})
  };

  const source = extractSource(params);
  if (!source) {
    const methodUsed = options.method === "boolean-algebra" ? "boolean-algebra" : "kmap";
    return unsupportedResult("Create and connect an output node before minimizing.", methodUsed);
  }

  const variableCount = source.variables.length;
  const methodUsed = resolveMethodUsed(options, variableCount);

  if (options.method === "kmap" && variableCount > options.maxKMapVariables) {
    return unsupportedResult(
      "K-map minimization supports up to 4 variables. Switch to Boolean Algebra for larger expressions.",
      "kmap",
      source.outputLabel
    );
  }

  if (methodUsed === "kmap") {
    return minimizeByKMap({
      outputLabel: source.outputLabel,
      variables: source.variables,
      minterms: source.minterms,
      originalExpression: source.originalExpression
    });
  }

  return minimizeByBooleanAlgebra({
    outputLabel: source.outputLabel,
    variables: source.variables,
    minterms: source.minterms,
    originalExpression: source.originalExpression
  });
}


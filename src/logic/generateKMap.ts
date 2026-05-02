import { sortVariableNames } from "../expression/variableUtils";
import { buildVariableNamesForCount } from "../minterms/mintermParser";
import type { ManualMintermState } from "../minterms/mintermTypes";
import type { KMapCell, KMapData, TruthTableData } from "../types/circuit";

interface KMapGenerationResult {
  data?: KMapData;
  message?: string;
  outputLabel?: string;
}

interface KMapGenerationOptions {
  manualMinterms?: ManualMintermState;
}

function grayCode(bits: number): string[] {
  const count = 2 ** bits;
  const labels: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const gray = i ^ (i >> 1);
    labels.push(gray.toString(2).padStart(bits, "0"));
  }

  return labels;
}

function buildKMapCells(variableCount: number, minterms: number[]): KMapData {
  const rowVarCount = variableCount === 2 ? 1 : variableCount === 3 ? 1 : 2;
  const colVarCount = variableCount - rowVarCount;

  const rowLabels = grayCode(rowVarCount);
  const colLabels = grayCode(colVarCount);
  const mintermSet = new Set(minterms);

  const cells: KMapCell[][] = rowLabels.map((rowBits) =>
    colLabels.map((colBits) => {
      const bits = `${rowBits}${colBits}`;
      const minterm = Number.parseInt(bits, 2);

      return {
        minterm,
        value: mintermSet.has(minterm) ? 1 : 0,
        rowBits,
        colBits
      };
    })
  );

  return {
    variables: [],
    rowLabels,
    colLabels,
    cells
  };
}

function getOutputLabel(truthTable: TruthTableData): string {
  return truthTable.columns.find((column) => column.kind === "output")?.label ?? "F";
}

function generateFromManualMinterms(
  truthTable: TruthTableData,
  manualMinterms: ManualMintermState
): KMapGenerationResult {
  const variableCount = manualMinterms.variableCount;
  if (variableCount < 2) {
    return { message: "Add at least 2 variables to generate a K-map." };
  }

  if (variableCount > 4) {
    return { message: "K-map currently supports up to 4 variables." };
  }

  const preferredVariables = sortVariableNames(
    truthTable.columns.filter((column) => column.kind === "input").map((column) => column.label)
  );
  const variables = buildVariableNamesForCount(variableCount, [
    ...manualMinterms.variables,
    ...preferredVariables
  ]);

  const map = buildKMapCells(variableCount, manualMinterms.minterms);
  map.variables = variables;

  return {
    data: map,
    outputLabel: manualMinterms.outputLabel || getOutputLabel(truthTable)
  };
}

export function generateKMap(
  truthTable: TruthTableData,
  options: KMapGenerationOptions = {}
): KMapGenerationResult {
  const { manualMinterms } = options;
  const useManualMinterms = Boolean(manualMinterms?.enabled && manualMinterms.minterms.length > 0);

  if (useManualMinterms && manualMinterms) {
    return generateFromManualMinterms(truthTable, manualMinterms);
  }

  const inputColumns = truthTable.columns.filter((column) => column.kind === "input");
  const outputColumns = truthTable.columns.filter((column) => column.kind === "output");

  if (inputColumns.length < 2) {
    return { message: "Add at least 2 variables to generate a K-map." };
  }

  if (inputColumns.length > 4) {
    return { message: "K-map currently supports up to 4 variables." };
  }

  if (outputColumns.length === 0) {
    return { message: "Connect a circuit output to generate a K-map." };
  }

  const outputColumn = outputColumns[0];
  const columnByLabel = new Map(inputColumns.map((column) => [column.label, column]));
  const variableNames = sortVariableNames(inputColumns.map((column) => column.label));
  const orderedInputColumns = variableNames.map((label) => columnByLabel.get(label)).filter(Boolean) as typeof inputColumns;

  const variableCount = orderedInputColumns.length;
  const variables = orderedInputColumns.map((column) => column.label);
  const rowVarCount = variableCount === 2 ? 1 : variableCount === 3 ? 1 : 2;
  const colVarCount = variableCount - rowVarCount;
  const rowLabels = grayCode(rowVarCount);
  const colLabels = grayCode(colVarCount);

  const cells: KMapCell[][] = rowLabels.map((rowBits) =>
    colLabels.map((colBits) => {
      const bits = `${rowBits}${colBits}`;
      const minterm = Number.parseInt(bits, 2);
      return {
        minterm,
        value: 0,
        rowBits,
        colBits
      };
    })
  );

  const rowIndexByBits = new Map(rowLabels.map((label, index) => [label, index]));
  const colIndexByBits = new Map(colLabels.map((label, index) => [label, index]));

  truthTable.rows.forEach((row) => {
    const bits = orderedInputColumns.map((column) => row[column.id] ?? 0).join("");
    const rowBits = bits.slice(0, rowVarCount);
    const colBits = bits.slice(rowVarCount);
    const rowIndex = rowIndexByBits.get(rowBits);
    const colIndex = colIndexByBits.get(colBits);

    if (rowIndex === undefined || colIndex === undefined) {
      return;
    }

    cells[rowIndex][colIndex] = {
      minterm: Number.parseInt(bits, 2),
      value: (row[outputColumn.id] ?? 0) as 0 | 1,
      rowBits,
      colBits
    };
  });

  return {
    data: {
      variables,
      rowLabels,
      colLabels,
      cells
    },
    outputLabel: outputColumn.label
  };
}

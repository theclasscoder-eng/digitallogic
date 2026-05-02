import type { RomRealization, RomTruthRow } from "./romTypes";

export function extractOutputMinterms(rows: RomTruthRow[]): Record<string, number[]> {
  const outputNames = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row.outputs).forEach((name) => outputNames.add(name));
  });

  const result: Record<string, number[]> = {};
  outputNames.forEach((name) => {
    result[name] = rows
      .filter((row) => row.outputs[name] === 1)
      .map((row) => row.address)
      .sort((a, b) => a - b);
  });

  return result;
}

export function buildRomRealization(rows: RomTruthRow[]): RomRealization {
  const inputCount = rows[0] ? Object.keys(rows[0].inputs).length : 0;
  const outputCount = rows[0] ? Object.keys(rows[0].outputs).length : 0;
  const addressCount = rows.length;
  const sizeLabel = `${addressCount} x ${outputCount}`;

  return {
    addressLineCount: inputCount,
    addressCount,
    outputCount,
    wordSize: outputCount,
    sizeLabel,
    truthRows: rows,
    outputMinterms: extractOutputMinterms(rows)
  };
}

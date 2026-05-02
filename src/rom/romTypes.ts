export interface RomOutputDefinition {
  label: string;
  expression?: string;
  truthBits?: string;
}

export interface RomConfig {
  id: string;
  inputVariables: string[];
  outputs: RomOutputDefinition[];
}

export interface RomTruthRow {
  address: number;
  addressBits: string;
  inputs: Record<string, 0 | 1>;
  outputs: Record<string, 0 | 1>;
  dataWord: string;
}

export interface RomRealization {
  addressLineCount: number;
  addressCount: number;
  outputCount: number;
  wordSize: number;
  sizeLabel: string;
  truthRows: RomTruthRow[];
  outputMinterms: Record<string, number[]>;
}

export interface RomTruthResult {
  rows: RomTruthRow[];
  error?: string;
}

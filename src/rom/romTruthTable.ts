import { normalizeVariableName } from "../expression/variableUtils";
import { evaluateRomOutput } from "./romEvaluator";
import type { RomConfig, RomTruthResult, RomTruthRow } from "./romTypes";

function bitsFromAddress(address: number, width: number): string {
  return address.toString(2).padStart(width, "0");
}

function normalizeInputVariables(inputVariables: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  inputVariables.forEach((name) => {
    const clean = normalizeVariableName(name);
    if (!clean || clean === "0" || clean === "1" || seen.has(clean)) {
      return;
    }

    seen.add(clean);
    normalized.push(clean);
  });

  return normalized;
}

export function generateRomTruthTable(config: RomConfig): RomTruthResult {
  const inputVariables = normalizeInputVariables(config.inputVariables);

  if (inputVariables.length === 0) {
    return {
      rows: [],
      error: "Add at least one ROM input variable."
    };
  }

  if (config.outputs.length === 0) {
    return {
      rows: [],
      error: "Add at least one ROM output."
    };
  }

  const addressCount = 2 ** inputVariables.length;
  const rows: RomTruthRow[] = [];

  for (let address = 0; address < addressCount; address += 1) {
    const addressBits = bitsFromAddress(address, inputVariables.length);
    const inputs: Record<string, 0 | 1> = {};

    inputVariables.forEach((variable, variableIndex) => {
      inputs[variable] = (addressBits[variableIndex] === "1" ? 1 : 0) as 0 | 1;
    });

    const outputs: Record<string, 0 | 1> = {};
    for (const output of config.outputs) {
      const label = output.label.trim() || `Y${Object.keys(outputs).length}`;
      try {
        outputs[label] = evaluateRomOutput(output, inputs, address);
      } catch (error) {
        return {
          rows: [],
          error: `Could not evaluate output ${label}. ${error instanceof Error ? error.message : "Check expression syntax."}`
        };
      }
    }

    const dataWord = config.outputs
      .map((output) => {
        const label = output.label.trim() || `Y${config.outputs.indexOf(output)}`;
        return outputs[label] ?? 0;
      })
      .join("");

    rows.push({
      address,
      addressBits,
      inputs,
      outputs,
      dataWord
    });
  }

  return { rows };
}

export function normalizeRomInputVariables(inputVariables: string[]): string[] {
  return normalizeInputVariables(inputVariables);
}

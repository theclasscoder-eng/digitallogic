import { sortVariableNames } from "../expression/variableUtils";
import { evaluateMuxRow } from "./muxEvaluator";
import type { MuxConfig, MuxTruthRow } from "./muxTypes";

function toBits(value: number, width: number): string {
  return value.toString(2).padStart(width, "0");
}

export function generateMuxTruthTable(config: MuxConfig): MuxTruthRow[] {
  const variables = sortVariableNames(config.variables);
  const rows: MuxTruthRow[] = [];
  const combinations = 2 ** variables.length;

  for (let index = 0; index < combinations; index += 1) {
    const bits = toBits(index, variables.length);
    const values: Record<string, 0 | 1> = {};

    variables.forEach((variable, variableIndex) => {
      values[variable] = (bits[variableIndex] === "1" ? 1 : 0) as 0 | 1;
    });

    const evaluated = evaluateMuxRow(config, values);
    rows.push({
      values,
      selectedInputIndex: evaluated.selectedInputIndex,
      selectedInputValue: evaluated.selectedInputValue,
      output: evaluated.output
    });
  }

  return rows;
}

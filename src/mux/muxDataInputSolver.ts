import { evaluateExprNode, type BinaryValue, type VariableAssignment } from "../expression/evaluator";
import { parseBooleanExpression } from "../expression/parser";
import { collectVariablesFromAst, normalizeVariableName, sortVariableNames } from "../expression/variableUtils";
import type { MuxSize, SolveMuxDataInputResult, SolvedMuxDataInput } from "./muxTypes";

interface SolveMuxDataInputParams {
  expression: string;
  size: MuxSize;
  selectVariables: string[];
  variables?: string[];
}

interface OutputPattern {
  index: number;
  bits: string;
  values: Record<string, 0 | 1>;
  output: BinaryValue;
}

function assignmentWithAliases(values: Record<string, 0 | 1>): VariableAssignment {
  const assignment: VariableAssignment = {};

  Object.entries(values).forEach(([name, value]) => {
    assignment[name] = value;
    assignment[name.toUpperCase()] = value;
    assignment[name.toLowerCase()] = value;
  });

  return assignment;
}

function bitsFromIndex(index: number, width: number): string {
  return index.toString(2).padStart(width, "0");
}

function simplifyPattern(remainingVariables: string[], patterns: OutputPattern[]): string {
  if (patterns.length === 0) {
    return "0";
  }

  const ones = patterns.filter((entry) => entry.output === 1);
  if (ones.length === 0) {
    return "0";
  }

  if (ones.length === patterns.length) {
    return "1";
  }

  for (const variable of remainingVariables) {
    const matchesVariable = patterns.every((entry) => entry.output === entry.values[variable]);
    if (matchesVariable) {
      return variable;
    }

    const matchesNegated = patterns.every((entry) => entry.output === (entry.values[variable] === 1 ? 0 : 1));
    if (matchesNegated) {
      return `${variable}'`;
    }
  }

  const terms = ones
    .sort((a, b) => a.index - b.index)
    .map((entry) => {
      if (remainingVariables.length === 0) {
        return "1";
      }

      return remainingVariables
        .map((variable, idx) => (entry.bits[idx] === "1" ? variable : `${variable}'`))
        .join("");
    });

  return terms.join(" + ");
}

export function solveMuxDataInputsFromExpression(params: SolveMuxDataInputParams): SolveMuxDataInputResult {
  const expression = params.expression.trim();
  if (!expression) {
    return {
      success: false,
      dataInputs: [],
      variableOrder: [],
      error: "Enter a Boolean expression before generating MUX data inputs."
    };
  }

  try {
    const parsed = parseBooleanExpression(expression);
    const expressionVariables = collectVariablesFromAst(parsed.expression);
    const mergedVariables = sortVariableNames([...(params.variables ?? []), ...expressionVariables]);

    const selectCount = Math.log2(params.size);
    const normalizedSelectVariables = params.selectVariables
      .map((name) => normalizeVariableName(name))
      .filter((name) => name.length > 0)
      .slice(0, selectCount);

    if (normalizedSelectVariables.length !== selectCount) {
      return {
        success: false,
        dataInputs: [],
        variableOrder: mergedVariables,
        error: `Select exactly ${selectCount} variable${selectCount > 1 ? "s" : ""} for a ${params.size}:1 MUX.`
      };
    }

    const selectSet = new Set(normalizedSelectVariables);
    if (selectSet.size !== normalizedSelectVariables.length) {
      return {
        success: false,
        dataInputs: [],
        variableOrder: mergedVariables,
        error: "Select variables must be unique."
      };
    }

    const missingSelect = normalizedSelectVariables.find((variable) => !mergedVariables.includes(variable));
    if (missingSelect) {
      return {
        success: false,
        dataInputs: [],
        variableOrder: mergedVariables,
        error: `Select variable ${missingSelect} is not present in the expression variables.`
      };
    }

    const remainingVariables = mergedVariables.filter((variable) => !selectSet.has(variable));
    const dataInputs: SolvedMuxDataInput[] = [];

    for (let inputIndex = 0; inputIndex < params.size; inputIndex += 1) {
      const selectAssignments: Record<string, 0 | 1> = {};
      for (let selectIdx = 0; selectIdx < normalizedSelectVariables.length; selectIdx += 1) {
        const bit = ((inputIndex >> selectIdx) & 1) as 0 | 1;
        selectAssignments[normalizedSelectVariables[selectIdx]] = bit;
      }

      const remainingCombinations = 2 ** remainingVariables.length;
      const patterns: OutputPattern[] = [];

      for (let combinationIndex = 0; combinationIndex < remainingCombinations; combinationIndex += 1) {
        const bits = bitsFromIndex(combinationIndex, remainingVariables.length);
        const values: Record<string, 0 | 1> = { ...selectAssignments };

        remainingVariables.forEach((variable, variableIndex) => {
          values[variable] = (bits[variableIndex] === "1" ? 1 : 0) as 0 | 1;
        });

        const output = evaluateExprNode(parsed.expression, assignmentWithAliases(values));
        patterns.push({
          index: combinationIndex,
          bits,
          values,
          output
        });
      }

      dataInputs.push({
        index: inputIndex,
        expression: simplifyPattern(remainingVariables, patterns)
      });
    }

    return {
      success: true,
      dataInputs,
      variableOrder: mergedVariables
    };
  } catch (error) {
    return {
      success: false,
      dataInputs: [],
      variableOrder: [],
      error: error instanceof Error ? error.message : "Could not parse the expression."
    };
  }
}

import { buildCanonicalSopExpression } from "./canonicalSop";

export interface ParsedFunctionMinterms {
  outputLabel: string;
  variables: string[];
  minterms: number[];
  dontCares: number[];
  variableCount: number;
  canonicalSopExpression: string;
  error?: string;
}

function stripLatexWrappers(input: string): string {
  let value = input.trim();

  if (value.startsWith("$") && value.endsWith("$")) {
    value = value.slice(1, -1).trim();
  }

  value = value
    .replace(/^\\\[\s*/, "")
    .replace(/\s*\\\]$/, "")
    .replace(/^\\\(\s*/, "")
    .replace(/\s*\\\)$/, "")
    .trim();

  return value;
}

function normalizeFunctionInput(input: string): string {
  return stripLatexWrappers(input)
    .replace(/\\sum/gi, "SUM")
    .replace(/\\sigma/gi, "SUM")
    .replace(/[\u03A3]/g, "SUM")
    .replace(/\bSIGMA\b/gi, "SUM")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumberList(body: string): { values: number[]; error?: string } {
  const tokens = body
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return { values: [], error: "Enter at least one minterm." };
  }

  const values: number[] = [];
  for (const token of tokens) {
    if (!/^\d+$/.test(token)) {
      return { values: [], error: `Invalid minterm "${token}". Use comma-separated integers.` };
    }

    const parsed = Number.parseInt(token, 10);
    values.push(parsed);
  }

  return {
    values: [...new Set(values)].sort((a, b) => a - b)
  };
}

function validateRange(values: number[], variableCount: number): string | undefined {
  if (variableCount < 1) {
    return "At least one variable is required.";
  }

  const maxValue = 2 ** variableCount - 1;
  const invalid = values.find((value) => value < 0 || value > maxValue);
  if (invalid !== undefined) {
    return `Minterm ${invalid} is invalid for ${variableCount} variables. Valid range is 0-${maxValue}.`;
  }

  return undefined;
}

function parseFunctionHeader(input: string): {
  outputLabel: string;
  variables: string[];
  rightSide: string;
  error?: string;
} {
  const match = input.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*=\s*(.+)$/);
  if (!match) {
    return {
      outputLabel: "F",
      variables: [],
      rightSide: "",
      error: "Expected function format like f(a,b,c,d) = SUM m(1,2,3)."
    };
  }

  const outputLabel = match[1];
  const rawVariables = match[2]
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (rawVariables.length === 0) {
    return {
      outputLabel,
      variables: [],
      rightSide: "",
      error: "Function variable list cannot be empty."
    };
  }

  const uniqueVariables: string[] = [];
  const seen = new Set<string>();
  for (const variable of rawVariables) {
    const normalized = variable.toUpperCase();
    if (seen.has(normalized)) {
      return {
        outputLabel,
        variables: [],
        rightSide: "",
        error: "Function variable list contains duplicate names."
      };
    }

    uniqueVariables.push(normalized);
    seen.add(normalized);
  }

  if (uniqueVariables.length !== rawVariables.length) {
    return {
      outputLabel,
      variables: [],
      rightSide: "",
      error: "Function variable list contains duplicate names."
    };
  }

  return {
    outputLabel,
    variables: uniqueVariables,
    rightSide: match[3].trim()
  };
}

function extractDontCares(rightSide: string): { cleanedRight: string; dontCares: number[]; error?: string } {
  const dontCareMatch = rightSide.match(/\+\s*D\s*\(([^)]*)\)\s*$/i) ?? rightSide.match(/^D\s*\(([^)]*)\)\s*$/i);
  if (!dontCareMatch) {
    return {
      cleanedRight: rightSide,
      dontCares: []
    };
  }

  const parsed = parseNumberList(dontCareMatch[1]);
  if (parsed.error) {
    return {
      cleanedRight: rightSide,
      dontCares: [],
      error: `Invalid don't-care list. ${parsed.error}`
    };
  }

  return {
    cleanedRight: rightSide.slice(0, dontCareMatch.index).trim(),
    dontCares: parsed.values
  };
}

function extractMinterms(rightSide: string): { minterms: number[]; error?: string } {
  const normalized = rightSide.replace(/\s+/g, "");
  const match =
    normalized.match(/^(?:SUM|S)?M\(([^)]*)\)$/i) ??
    normalized.match(/^(?:SUM|S)\(([^)]*)\)$/i) ??
    normalized.match(/^M\(([^)]*)\)$/i);

  if (!match) {
    return {
      minterms: [],
      error: "Could not find minterms. Use formats like SUM m(2,3,8) or m(2,3,8)."
    };
  }

  const parsed = parseNumberList(match[1]);
  if (parsed.error) {
    return {
      minterms: [],
      error: parsed.error
    };
  }

  return {
    minterms: parsed.values
  };
}

export function parseFunctionMintermInput(rawInput: string): ParsedFunctionMinterms {
  const normalized = normalizeFunctionInput(rawInput);
  if (!normalized) {
    return {
      outputLabel: "F",
      variables: [],
      minterms: [],
      dontCares: [],
      variableCount: 0,
      canonicalSopExpression: "F = 0",
      error: "Input is empty."
    };
  }

  const header = parseFunctionHeader(normalized);
  if (header.error) {
    return {
      outputLabel: "F",
      variables: [],
      minterms: [],
      dontCares: [],
      variableCount: 0,
      canonicalSopExpression: "F = 0",
      error: header.error
    };
  }

  const variableCount = header.variables.length;
  const dontCareExtraction = extractDontCares(header.rightSide);
  if (dontCareExtraction.error) {
    return {
      outputLabel: header.outputLabel,
      variables: header.variables,
      minterms: [],
      dontCares: [],
      variableCount,
      canonicalSopExpression: `${header.outputLabel} = 0`,
      error: dontCareExtraction.error
    };
  }

  const mintermExtraction = extractMinterms(dontCareExtraction.cleanedRight);
  if (mintermExtraction.error) {
    return {
      outputLabel: header.outputLabel,
      variables: header.variables,
      minterms: [],
      dontCares: dontCareExtraction.dontCares,
      variableCount,
      canonicalSopExpression: `${header.outputLabel} = 0`,
      error: mintermExtraction.error
    };
  }

  const rangeError = validateRange(mintermExtraction.minterms, variableCount) ??
    validateRange(dontCareExtraction.dontCares, variableCount);
  if (rangeError) {
    return {
      outputLabel: header.outputLabel,
      variables: header.variables,
      minterms: mintermExtraction.minterms,
      dontCares: dontCareExtraction.dontCares,
      variableCount,
      canonicalSopExpression: `${header.outputLabel} = 0`,
      error: rangeError
    };
  }

  const dontCareSet = new Set(dontCareExtraction.dontCares);
  const minterms = mintermExtraction.minterms.filter((minterm) => !dontCareSet.has(minterm));
  const canonicalSopExpression = buildCanonicalSopExpression(header.outputLabel, header.variables, minterms);

  return {
    outputLabel: header.outputLabel,
    variables: header.variables,
    minterms,
    dontCares: dontCareExtraction.dontCares,
    variableCount,
    canonicalSopExpression
  };
}

import type { ParsedMinterms } from "./mintermTypes";

const WRAPPED_MINTERM_PATTERN = /^(?:(?:\u03A3|SUM|SIGMA|S)\s*)?M?\s*\((.*)\)$/i;
const MAX_FALLBACK_LETTERS = 26;

function normalizeIntegerToken(token: string): number | null {
  if (!/^\d+$/.test(token)) {
    return null;
  }

  const parsed = Number.parseInt(token, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function tokenizeMintermBody(rawBody: string): string[] {
  return rawBody
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function defaultVariableNameAt(index: number): string {
  if (index < MAX_FALLBACK_LETTERS) {
    return String.fromCharCode("A".charCodeAt(0) + index);
  }

  return `X${index - MAX_FALLBACK_LETTERS + 1}`;
}

export function buildVariableNamesForCount(variableCount: number, preferredNames: string[] = []): string[] {
  const cleanedPreferred = preferredNames.map((name) => name.trim()).filter((name) => name.length > 0);
  const names: string[] = [];
  const used = new Set<string>();

  cleanedPreferred.forEach((name) => {
    if (names.length >= variableCount || used.has(name)) {
      return;
    }

    names.push(name);
    used.add(name);
  });

  let index = 0;
  while (names.length < variableCount) {
    const fallback = defaultVariableNameAt(index);
    index += 1;

    if (used.has(fallback)) {
      continue;
    }

    names.push(fallback);
    used.add(fallback);
  }

  return names;
}

export function parseMintermInput(rawInput: string, variableCount?: number): ParsedMinterms {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      minterms: [],
      variableCount,
      error: "Enter at least one minterm."
    };
  }

  let body = trimmed;
  const wrappedMatch = trimmed.match(WRAPPED_MINTERM_PATTERN);
  if (wrappedMatch) {
    body = wrappedMatch[1];
  }

  if (body.startsWith("(") && body.endsWith(")")) {
    body = body.slice(1, -1);
  }

  const tokens = tokenizeMintermBody(body);
  if (tokens.length === 0) {
    return {
      minterms: [],
      variableCount,
      error: "Enter at least one minterm."
    };
  }

  const minterms: number[] = [];
  for (const token of tokens) {
    const value = normalizeIntegerToken(token);
    if (value === null) {
      return {
        minterms: [],
        variableCount,
        error: `Invalid minterm "${token}". Use comma-separated integers.`
      };
    }

    if (value < 0) {
      return {
        minterms: [],
        variableCount,
        error: `Invalid minterm "${token}". Use non-negative integers.`
      };
    }

    minterms.push(value);
  }

  const uniqueSorted = [...new Set(minterms)].sort((a, b) => a - b);

  if (typeof variableCount === "number" && variableCount > 0) {
    const maxValue = 2 ** variableCount - 1;
    const invalid = uniqueSorted.find((value) => value > maxValue);
    if (invalid !== undefined) {
      return {
        minterms: uniqueSorted,
        variableCount,
        error: `Minterm ${invalid} is invalid for ${variableCount} variables. Valid range is 0-${maxValue}.`
      };
    }
  }

  return {
    minterms: uniqueSorted,
    variableCount
  };
}

export function formatMintermInput(minterms: number[]): string {
  return [...new Set(minterms)].sort((a, b) => a - b).join(",");
}

import type { Implicant, KMapGroup } from "./minimizationTypes";

const VALID_GROUP_SIZES = new Set([1, 2, 4, 8, 16]);

export function toBits(index: number, variableCount: number): string {
  return index.toString(2).padStart(variableCount, "0");
}

export function grayCodeLabels(bitCount: number): string[] {
  const labels: string[] = [];
  const total = 2 ** bitCount;

  for (let index = 0; index < total; index += 1) {
    const gray = index ^ (index >> 1);
    labels.push(toBits(gray, bitCount));
  }

  return labels;
}

export function getMintermsForPattern(pattern: string): number[] {
  const output: number[] = [];

  const walk = (position: number, prefix: string) => {
    if (position === pattern.length) {
      output.push(Number.parseInt(prefix, 2));
      return;
    }

    const symbol = pattern[position];

    if (symbol === "-") {
      walk(position + 1, `${prefix}0`);
      walk(position + 1, `${prefix}1`);
      return;
    }

    walk(position + 1, `${prefix}${symbol}`);
  };

  walk(0, "");
  return output.sort((a, b) => a - b);
}

export function productTermFromPattern(pattern: string, variables: string[]): {
  productTerm: string;
  constantVariables: string[];
  eliminatedVariables: string[];
  literalCount: number;
} {
  const literals: string[] = [];
  const constantVariables: string[] = [];
  const eliminatedVariables: string[] = [];

  for (let index = 0; index < pattern.length; index += 1) {
    const bit = pattern[index];
    const variable = variables[index];

    if (bit === "1") {
      literals.push(variable);
      constantVariables.push(`${variable}=1`);
      continue;
    }

    if (bit === "0") {
      literals.push(`${variable}'`);
      constantVariables.push(`${variable}=0`);
      continue;
    }

    eliminatedVariables.push(variable);
  }

  return {
    productTerm: literals.length > 0 ? literals.join("") : "1",
    constantVariables,
    eliminatedVariables,
    literalCount: literals.length
  };
}

export function generateValidImplicants(variables: string[], minterms: number[]): Implicant[] {
  const variableCount = variables.length;
  const mintermSet = new Set(minterms);
  const patterns = new Set<string>();

  const generatePatterns = (position: number, current: string) => {
    if (position === variableCount) {
      patterns.add(current);
      return;
    }

    generatePatterns(position + 1, `${current}0`);
    generatePatterns(position + 1, `${current}1`);
    generatePatterns(position + 1, `${current}-`);
  };

  generatePatterns(0, "");

  const implicants: Implicant[] = [];

  patterns.forEach((pattern) => {
    const covered = getMintermsForPattern(pattern);

    if (covered.length === 0 || !VALID_GROUP_SIZES.has(covered.length)) {
      return;
    }

    const allCoveredAreOnes = covered.every((minterm) => mintermSet.has(minterm));
    if (!allCoveredAreOnes) {
      return;
    }

    const includesAtLeastOneOne = covered.some((minterm) => mintermSet.has(minterm));
    if (!includesAtLeastOneOne) {
      return;
    }

    const { productTerm, constantVariables, eliminatedVariables, literalCount } = productTermFromPattern(
      pattern,
      variables
    );

    implicants.push({
      id: `imp-${pattern}`,
      pattern,
      minterms: covered,
      size: covered.length as 1 | 2 | 4 | 8 | 16,
      literalCount,
      productTerm,
      constantVariables,
      eliminatedVariables
    });
  });

  return implicants;
}

export function isSubset(subset: number[], superset: number[]): boolean {
  const superSetLookup = new Set(superset);
  return subset.every((value) => superSetLookup.has(value));
}

export function removeDuplicateImplicants(implicants: Implicant[]): Implicant[] {
  const seen = new Set<string>();

  return implicants.filter((implicant) => {
    const key = implicant.pattern;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function getPrimeImplicants(implicants: Implicant[]): Implicant[] {
  return implicants.filter((candidate, index) => {
    return !implicants.some((other, otherIndex) => {
      if (index === otherIndex) {
        return false;
      }

      if (other.size < candidate.size) {
        return false;
      }

      if (!isSubset(candidate.minterms, other.minterms)) {
        return false;
      }

      return other.size > candidate.size || other.literalCount <= candidate.literalCount;
    });
  });
}

export function implicantsToKMapGroups(
  implicants: Implicant[],
  variables: string[],
  groupPrefix: string
): KMapGroup[] {
  const variableCount = variables.length;
  const rowVariableCount = variableCount === 2 ? 1 : variableCount === 3 ? 1 : 2;
  const colVariableCount = variableCount - rowVariableCount;
  const rowLabels = grayCodeLabels(rowVariableCount);
  const colLabels = grayCodeLabels(colVariableCount);
  const rowLookup = new Map(rowLabels.map((label, index) => [label, index]));
  const colLookup = new Map(colLabels.map((label, index) => [label, index]));

  return implicants.map((implicant, index) => {
    const rowPositions = new Set<number>();
    const colPositions = new Set<number>();

    implicant.minterms.forEach((minterm) => {
      const bits = toBits(minterm, variableCount);
      const rowBits = bits.slice(0, rowVariableCount);
      const colBits = bits.slice(rowVariableCount);
      rowPositions.add(rowLookup.get(rowBits) ?? 0);
      colPositions.add(colLookup.get(colBits) ?? 0);
    });

    return {
      id: `${groupPrefix}-${index + 1}`,
      minterms: [...implicant.minterms],
      size: implicant.size,
      rowPositions: [...rowPositions].sort((a, b) => a - b),
      colPositions: [...colPositions].sort((a, b) => a - b),
      constantVariables: [...implicant.constantVariables],
      eliminatedVariables: [...implicant.eliminatedVariables],
      productTerm: implicant.productTerm
    };
  });
}

export function normalizeExpressionForCompare(expression: string): string {
  return expression.replace(/\s+/g, "").toUpperCase();
}

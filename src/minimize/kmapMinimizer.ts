import {
  generateValidImplicants,
  getPrimeImplicants,
  implicantsToKMapGroups,
  normalizeExpressionForCompare,
  removeDuplicateImplicants
} from "./implicantUtils";
import type { Implicant, MinimizationResult } from "./minimizationTypes";
import { buildRuleSteps } from "./ruleExplainer";
import { sortVariableNames } from "../expression/variableUtils";
import { buildBooleanAlgebraSteps } from "./booleanStepExplainer";

function selectCoveringImplicants(primeImplicants: Implicant[], minterms: number[]): Implicant[] {
  const selected: Implicant[] = [];
  const mintermSet = new Set(minterms);

  const coverMap = new Map<number, Implicant[]>();
  minterms.forEach((minterm) => {
    const covering = primeImplicants.filter((implicant) => implicant.minterms.includes(minterm));
    coverMap.set(minterm, covering);
  });

  const selectedSet = new Set<string>();

  minterms.forEach((minterm) => {
    const covering = coverMap.get(minterm) ?? [];
    if (covering.length === 1) {
      const implicant = covering[0];
      if (!selectedSet.has(implicant.id)) {
        selected.push(implicant);
        selectedSet.add(implicant.id);
      }
    }
  });

  const covered = new Set<number>();
  selected.forEach((implicant) => {
    implicant.minterms.forEach((minterm) => {
      if (mintermSet.has(minterm)) {
        covered.add(minterm);
      }
    });
  });

  while (covered.size < minterms.length) {
    const uncovered = minterms.filter((minterm) => !covered.has(minterm));

    const best = primeImplicants
      .filter((implicant) => !selectedSet.has(implicant.id))
      .map((implicant) => {
        const newCoverage = implicant.minterms.filter((minterm) => uncovered.includes(minterm)).length;
        return { implicant, newCoverage };
      })
      .filter((entry) => entry.newCoverage > 0)
      .sort((a, b) => {
        if (b.newCoverage !== a.newCoverage) {
          return b.newCoverage - a.newCoverage;
        }

        if (b.implicant.size !== a.implicant.size) {
          return b.implicant.size - a.implicant.size;
        }

        if (a.implicant.literalCount !== b.implicant.literalCount) {
          return a.implicant.literalCount - b.implicant.literalCount;
        }

        return a.implicant.pattern.localeCompare(b.implicant.pattern);
      })[0];

    if (!best) {
      break;
    }

    selected.push(best.implicant);
    selectedSet.add(best.implicant.id);
    best.implicant.minterms.forEach((minterm) => {
      if (mintermSet.has(minterm)) {
        covered.add(minterm);
      }
    });
  }

  return selected.filter((candidate) => {
    const others = selected.filter((other) => other.id !== candidate.id);

    return candidate.minterms.some((minterm) => {
      if (!mintermSet.has(minterm)) {
        return false;
      }

      return !others.some((other) => other.minterms.includes(minterm));
    });
  });
}

function expressionFromImplicants(implicants: Implicant[]): string {
  if (implicants.length === 0) {
    return "0";
  }

  if (implicants.length === 1 && implicants[0].productTerm === "1") {
    return "1";
  }

  return implicants.map((implicant) => implicant.productTerm).join(" + ");
}

function createResult(params: {
  outputLabel: string;
  originalExpression: string;
  minimizedExpression: string;
  minterms: number[];
  groups: ReturnType<typeof implicantsToKMapGroups>;
  variables: string[];
  variableCount: number;
  supported: boolean;
  reason?: string;
}): MinimizationResult {
  const {
    outputLabel,
    originalExpression,
    minimizedExpression,
    minterms,
    groups,
    variables,
    variableCount,
    supported,
    reason
  } = params;

  const kmapSteps = supported
    ? buildRuleSteps({
        outputLabel,
        originalExpression,
        minterms,
        groups,
        minimizedExpression
      })
    : [];

  const algebraSteps = supported
    ? buildBooleanAlgebraSteps({
        outputLabel,
        originalExpression,
        minimizedExpression,
        minterms,
        variables,
        groups
      })
    : [];

  return {
    originalExpression,
    minimizedExpression,
    minterms,
    groups,
    kmapSteps,
    algebraSteps,
    steps: kmapSteps,
    isAlreadyMinimal:
      normalizeExpressionForCompare(originalExpression.split("=").pop() ?? "") ===
      normalizeExpressionForCompare(minimizedExpression),
    variableCount,
    supported,
    methodUsed: "kmap",
    reason,
    outputLabel
  };
}

export function minimizeByKMap(params: {
  outputLabel: string;
  variables: string[];
  minterms: number[];
  originalExpression: string;
}): MinimizationResult {
  const { outputLabel, minterms, originalExpression } = params;
  const variables = sortVariableNames(params.variables);
  const variableCount = variables.length;

  if (variableCount < 2) {
    return createResult({
      outputLabel,
      originalExpression,
      minimizedExpression: originalExpression.split("=").pop()?.trim() ?? "0",
      minterms,
      groups: [],
      variables,
      variableCount,
      supported: false,
      reason: "Add at least 2 variables to perform K-map minimization."
    });
  }

  if (variableCount > 4) {
    return createResult({
      outputLabel,
      originalExpression,
      minimizedExpression: originalExpression.split("=").pop()?.trim() ?? "0",
      minterms,
      groups: [],
      variables,
      variableCount,
      supported: false,
      reason: "K-map minimization currently supports up to 4 variables."
    });
  }

  const totalMinterms = 2 ** variableCount;
  const uniqueMinterms = [...new Set(minterms)].sort((a, b) => a - b);

  if (uniqueMinterms.length === 0) {
    const minimizedExpression = "0";
    const groups: ReturnType<typeof implicantsToKMapGroups> = [];
    const kmapSteps = buildRuleSteps({
      outputLabel,
      originalExpression,
      minterms: uniqueMinterms,
      groups,
      minimizedExpression
    });
    const algebraSteps = buildBooleanAlgebraSteps({
      outputLabel,
      originalExpression,
      minimizedExpression,
      minterms: uniqueMinterms,
      variables,
      groups
    });

    return {
      originalExpression,
      minimizedExpression,
      minterms: uniqueMinterms,
      groups,
      kmapSteps,
      algebraSteps,
      steps: kmapSteps,
      isAlreadyMinimal:
        normalizeExpressionForCompare(originalExpression.split("=").pop() ?? "") ===
        normalizeExpressionForCompare(minimizedExpression),
      variableCount,
      supported: true,
      methodUsed: "kmap",
      outputLabel
    };
  }

  if (uniqueMinterms.length === totalMinterms) {
    const allImplicant: Implicant = {
      id: "imp-all",
      pattern: "-".repeat(variableCount),
      minterms: uniqueMinterms,
      size: uniqueMinterms.length as 1 | 2 | 4 | 8 | 16,
      literalCount: 0,
      productTerm: "1",
      constantVariables: [],
      eliminatedVariables: [...variables]
    };

    const groups = implicantsToKMapGroups([allImplicant], variables, "group");
    const minimizedExpression = "1";
    const kmapSteps = buildRuleSteps({
      outputLabel,
      originalExpression,
      minterms: uniqueMinterms,
      groups,
      minimizedExpression
    });
    const algebraSteps = buildBooleanAlgebraSteps({
      outputLabel,
      originalExpression,
      minimizedExpression,
      minterms: uniqueMinterms,
      variables,
      groups
    });

    return {
      originalExpression,
      minimizedExpression,
      minterms: uniqueMinterms,
      groups,
      kmapSteps,
      algebraSteps,
      steps: kmapSteps,
      isAlreadyMinimal:
        normalizeExpressionForCompare(originalExpression.split("=").pop() ?? "") ===
        normalizeExpressionForCompare(minimizedExpression),
      variableCount,
      supported: true,
      methodUsed: "kmap",
      outputLabel
    };
  }

  const allImplicants = removeDuplicateImplicants(generateValidImplicants(variables, uniqueMinterms));
  const primeImplicants = getPrimeImplicants(allImplicants);
  const chosenImplicants = selectCoveringImplicants(primeImplicants, uniqueMinterms).sort((a, b) => {
    if (b.size !== a.size) {
      return b.size - a.size;
    }

    if (a.literalCount !== b.literalCount) {
      return a.literalCount - b.literalCount;
    }

    return a.productTerm.localeCompare(b.productTerm);
  });

  const minimizedExpression = expressionFromImplicants(chosenImplicants);
  const groups = implicantsToKMapGroups(chosenImplicants, variables, "group");
  const kmapSteps = buildRuleSteps({
    outputLabel,
    originalExpression,
    minterms: uniqueMinterms,
    groups,
    minimizedExpression
  });
  const algebraSteps = buildBooleanAlgebraSteps({
    outputLabel,
    originalExpression,
    minimizedExpression,
    minterms: uniqueMinterms,
    variables,
    groups
  });

  return {
    originalExpression,
    minimizedExpression,
    minterms: uniqueMinterms,
    groups,
    kmapSteps,
    algebraSteps,
    steps: kmapSteps,
    isAlreadyMinimal:
      normalizeExpressionForCompare(originalExpression.split("=").pop() ?? "") ===
      normalizeExpressionForCompare(minimizedExpression),
    variableCount,
    supported: true,
    methodUsed: "kmap",
    outputLabel
  };
}

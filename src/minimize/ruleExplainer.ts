import type { KMapGroup, MinimizationStep } from "./minimizationTypes";

export function buildRuleSteps(params: {
  outputLabel: string;
  originalExpression: string;
  minterms: number[];
  groups: KMapGroup[];
  minimizedExpression: string;
}): MinimizationStep[] {
  const { outputLabel, originalExpression, minterms, groups, minimizedExpression } = params;
  const steps: MinimizationStep[] = [];

  steps.push({
    title: "Identify Minterms",
    explanation:
      minterms.length === 0
        ? `No minterms evaluate to 1, so ${outputLabel} is always 0.`
        : `From the truth table, ${outputLabel}=1 at minterms Σm(${minterms.join(", ")}).`,
    ruleName: "K-map setup"
  });

  groups.forEach((group, index) => {
    const constantText =
      group.constantVariables.length > 0
        ? group.constantVariables.join(", ")
        : "No variable stays constant";
    const eliminatedText =
      group.eliminatedVariables.length > 0
        ? group.eliminatedVariables.join(", ")
        : "No variables are eliminated";

    steps.push({
      title: `Group ${index + 1}`,
      explanation: `Group minterms {${group.minterms.join(", ")}}. Constants: ${constantText}. Eliminated: ${eliminatedText}. Product term: ${group.productTerm}.`,
      ruleName: "Adjacency elimination"
    });

    if (group.eliminatedVariables.length > 0) {
      steps.push({
        title: `Rule Applied for Group ${index + 1}`,
        explanation: `Changing variables cancel by complement pairs (X + X' = 1), so only constants remain in the term ${group.productTerm}.`,
        ruleName: "Complement rule"
      });
    }
  });

  if (minimizedExpression === "0") {
    steps.push({
      title: "Final Simplification",
      explanation: `${outputLabel} has no true minterms, so the minimized expression is 0.`,
      ruleName: "Null rule",
      before: originalExpression,
      after: `${outputLabel} = 0`
    });

    return steps;
  }

  if (minimizedExpression === "1") {
    steps.push({
      title: "Final Simplification",
      explanation: `All minterms are true, so ${outputLabel} simplifies to 1.`,
      ruleName: "Domination rule",
      before: originalExpression,
      after: `${outputLabel} = 1`
    });

    return steps;
  }

  steps.push({
    title: "Combine Product Terms",
    explanation: `OR all selected product terms from the K-map groups to get the minimized SOP expression.`,
    ruleName: "Sum of Products",
    before: originalExpression,
    after: `${outputLabel} = ${minimizedExpression}`
  });

  if (groups.length === 1 && groups[0].productTerm !== "1") {
    steps.push({
      title: "Identity Cleanup",
      explanation: `Single-term result uses identity rule (X·1 = X), so the expression stays ${groups[0].productTerm}.`,
      ruleName: "Identity rule"
    });
  }

  return steps;
}

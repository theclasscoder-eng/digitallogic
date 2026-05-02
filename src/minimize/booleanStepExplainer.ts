import { getRuleDefinition } from "./algebraRules";
import type { AlgebraStep, KMapGroup } from "./minimizationTypes";
import { normalizeExpressionForCompare, toBits } from "./implicantUtils";

interface BuildAlgebraStepsParams {
  outputLabel: string;
  originalExpression: string;
  minimizedExpression: string;
  minterms: number[];
  variables: string[];
  groups: KMapGroup[];
}

interface Literal {
  name: string;
  negated: boolean;
}

function literalToString(literal: Literal): string {
  return `${literal.name}${literal.negated ? "'" : ""}`;
}

function termToString(literals: Literal[]): string {
  if (literals.length === 0) {
    return "1";
  }

  return literals.map((literal) => literalToString(literal)).join("");
}

function splitTopLevelOr(expression: string): string[] {
  const terms: string[] = [];
  let depth = 0;
  let current = "";

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
    }

    if (char === "+" && depth === 0) {
      terms.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim().length > 0) {
    terms.push(current.trim());
  }

  return terms;
}

function parseAndTerm(term: string): Literal[] | null {
  const compact = term.replace(/\s+/g, "");
  if (!compact || compact === "0" || compact === "1" || compact.includes("(") || compact.includes(")") || compact.includes("⊕")) {
    return null;
  }

  const normalized = compact.replace(/[·*]/g, "");
  const literals: Literal[] = [];
  let index = 0;

  while (index < normalized.length) {
    const char = normalized[index];
    let variableName = "";

    if (/[A-Z]/.test(char)) {
      let uppercaseEnd = index;
      while (uppercaseEnd < normalized.length && /[A-Z]/.test(normalized[uppercaseEnd])) {
        uppercaseEnd += 1;
      }

      const nextAfterUppercase = normalized[uppercaseEnd];
      if (nextAfterUppercase && /[a-z0-9_]/.test(nextAfterUppercase)) {
        let identifierEnd = uppercaseEnd;
        while (identifierEnd < normalized.length && /[A-Za-z0-9_]/.test(normalized[identifierEnd])) {
          identifierEnd += 1;
        }
        variableName = normalized.slice(index, identifierEnd);
        index = identifierEnd;
      } else {
        variableName = normalized[index];
        index += 1;
      }
    } else if (/[a-z_]/.test(char)) {
      let identifierEnd = index + 1;
      while (identifierEnd < normalized.length && /[A-Za-z0-9_]/.test(normalized[identifierEnd])) {
        identifierEnd += 1;
      }
      variableName = normalized.slice(index, identifierEnd);
      index = identifierEnd;
    } else {
      return null;
    }

    let negated = false;
    if (normalized[index] === "'") {
      negated = true;
      index += 1;
    }

    literals.push({
      name: variableName,
      negated
    });
  }

  return literals;
}

function getRightHandExpression(expressionLine: string): string {
  const equalIndex = expressionLine.indexOf("=");
  if (equalIndex === -1) {
    return expressionLine.trim();
  }

  return expressionLine.slice(equalIndex + 1).trim();
}

function buildCanonicalTerm(minterm: number, variables: string[]): string {
  const bits = toBits(minterm, variables.length);
  return variables
    .map((variable, index) => (bits[index] === "1" ? variable : `${variable}'`))
    .join("");
}

function buildCanonicalSop(minterms: number[], variables: string[]): string {
  if (minterms.length === 0) {
    return "0";
  }

  if (variables.length === 0) {
    return minterms.length > 0 ? "1" : "0";
  }

  return minterms.map((minterm) => buildCanonicalTerm(minterm, variables)).join(" + ");
}

function parseSingleLiteral(expression: string): Literal | null {
  const compact = expression.replace(/\s+/g, "");
  const match = compact.match(/^([A-Za-z_][A-Za-z0-9_]*)(\')?$/);
  if (!match) {
    return null;
  }

  return {
    name: match[1],
    negated: Boolean(match[2])
  };
}

function detectTwoTermPattern(params: {
  outputLabel: string;
  originalRight: string;
  minimizedExpression: string;
}): Omit<AlgebraStep, "stepNumber">[] | null {
  const { outputLabel, originalRight, minimizedExpression } = params;
  const terms = splitTopLevelOr(originalRight);
  if (terms.length !== 2) {
    return null;
  }

  const left = parseAndTerm(terms[0]);
  const right = parseAndTerm(terms[1]);
  if (!left || !right) {
    return null;
  }

  const leftByName = new Map(left.map((literal) => [literal.name, literal]));
  const rightByName = new Map(right.map((literal) => [literal.name, literal]));

  const shared = left.find((literal) => {
    const other = rightByName.get(literal.name);
    return other && other.negated === literal.negated;
  });

  if (shared) {
    const leftUnique = left.find((literal) => literal.name !== shared.name);
    const rightUnique = right.find((literal) => literal.name !== shared.name);

    if (leftUnique && rightUnique && leftUnique.name === rightUnique.name && leftUnique.negated !== rightUnique.negated) {
      const sharedText = literalToString(shared);
      const before = `${outputLabel} = ${originalRight}`;
      const factored = `${outputLabel} = ${sharedText}(${literalToString(leftUnique)} + ${literalToString(rightUnique)})`;
      const complement = `${outputLabel} = ${sharedText}(1)`;
      const finalLine = `${outputLabel} = ${sharedText}`;

      return [
        {
          title: "Factor common literal",
          beforeExpression: before,
          afterExpression: factored,
          ruleName: getRuleDefinition("distributive").name,
          ruleFormula: getRuleDefinition("distributive").formula,
          explanation: "Both product terms share a literal, so factor it outside parentheses."
        },
        {
          title: "Apply complement inside parentheses",
          beforeExpression: factored,
          afterExpression: complement,
          ruleName: getRuleDefinition("complement").name,
          ruleFormula: getRuleDefinition("complement").formula,
          explanation: "A variable OR its complement simplifies to 1."
        },
        {
          title: "Remove multiplicative identity",
          beforeExpression: complement,
          afterExpression: finalLine,
          ruleName: getRuleDefinition("identity").name,
          ruleFormula: getRuleDefinition("identity").formula,
          explanation: "Multiplying by 1 leaves the literal unchanged."
        }
      ];
    }

    if (left.length === 2 && right.length === 2) {
      const leftUnique = left.find((literal) => literal.name !== shared.name);
      const rightUnique = right.find((literal) => literal.name !== shared.name);
      if (leftUnique && rightUnique) {
        const factoredRight = `${literalToString(shared)}(${literalToString(leftUnique)} + ${literalToString(rightUnique)})`;
        const before = `${outputLabel} = ${originalRight}`;
        const after = `${outputLabel} = ${factoredRight}`;

        if (normalizeExpressionForCompare(originalRight) !== normalizeExpressionForCompare(factoredRight)) {
          return [
            {
              title: "Factor common literal",
              beforeExpression: before,
              afterExpression: after,
              ruleName: getRuleDefinition("distributive").name,
              ruleFormula: getRuleDefinition("distributive").formula,
              explanation:
                normalizeExpressionForCompare(minimizedExpression) === normalizeExpressionForCompare(originalRight)
                  ? "This form is equivalent and may be easier for students to read."
                  : "Factoring highlights shared structure before final simplification."
            }
          ];
        }
      }
    }
  }

  const single = left.length === 1 ? left[0] : right.length === 1 ? right[0] : null;
  const compound = left.length === 1 ? right : right.length === 1 ? left : null;

  if (single && compound) {
    const identical = compound.find((literal) => literal.name === single.name && literal.negated === single.negated);
    if (identical) {
      return [
        {
          title: "Apply absorption",
          beforeExpression: `${outputLabel} = ${originalRight}`,
          afterExpression: `${outputLabel} = ${literalToString(single)}`,
          ruleName: getRuleDefinition("absorption").name,
          ruleFormula: getRuleDefinition("absorption").formula,
          explanation: "The broader literal absorbs the redundant product term."
        }
      ];
    }

    const complement = compound.find((literal) => literal.name === single.name && literal.negated !== single.negated);
    if (complement && compound.length === 2) {
      const other = compound.find((literal) => literal.name !== single.name);
      if (other) {
        return [
          {
            title: "Apply redundancy form",
            beforeExpression: `${outputLabel} = ${originalRight}`,
            afterExpression: `${outputLabel} = ${literalToString(single)} + ${literalToString(other)}`,
            ruleName: getRuleDefinition("absorption").name,
            ruleFormula: "A + A'B = A + B",
            explanation: "When one term has A and another has A' multiplied by B, A + B is equivalent."
          }
        ];
      }
    }
  }

  if (left.length === 1 && right.length === 1 && left[0].name === right[0].name) {
    if (left[0].negated !== right[0].negated) {
      return [
        {
          title: "Complement pair",
          beforeExpression: `${outputLabel} = ${originalRight}`,
          afterExpression: `${outputLabel} = 1`,
          ruleName: getRuleDefinition("complement").name,
          ruleFormula: getRuleDefinition("complement").formula,
          explanation: "A literal OR its complement is always 1."
        }
      ];
    }

    return [
      {
        title: "Remove duplicate literal",
        beforeExpression: `${outputLabel} = ${originalRight}`,
        afterExpression: `${outputLabel} = ${literalToString(left[0])}`,
        ruleName: getRuleDefinition("idempotent").name,
        ruleFormula: getRuleDefinition("idempotent").formula,
        explanation: "Duplicate literals collapse to one copy."
      }
    ];
  }

  const minimizedNormalized = normalizeExpressionForCompare(minimizedExpression);
  if (minimizedNormalized === normalizeExpressionForCompare(originalRight)) {
    return null;
  }

  return null;
}

function detectCanonicalCoverageSteps(params: {
  outputLabel: string;
  canonicalExpression: string;
  variables: string[];
  minterms: number[];
  minimizedExpression: string;
}): Omit<AlgebraStep, "stepNumber">[] | null {
  const { outputLabel, canonicalExpression, variables, minterms, minimizedExpression } = params;
  const singleLiteral = parseSingleLiteral(minimizedExpression);
  if (!singleLiteral || variables.length < 2 || minterms.length === 0) {
    return null;
  }

  const literalIndex = variables.findIndex((variable) => variable === singleLiteral.name);
  if (literalIndex < 0) {
    return null;
  }

  const expectedCount = 2 ** (variables.length - 1);
  if (minterms.length !== expectedCount) {
    return null;
  }

  const constantBit = singleLiteral.negated ? "0" : "1";
  const allHaveConstant = minterms.every((minterm) => toBits(minterm, variables.length)[literalIndex] === constantBit);
  if (!allHaveConstant) {
    return null;
  }

  const remainingVariables = variables.filter((_, index) => index !== literalIndex);
  const remainderTerms = minterms.map((minterm) => {
    const bits = toBits(minterm, variables.length);
    const literals: Literal[] = [];
    remainingVariables.forEach((variable, index) => {
      const sourceIndex = index < literalIndex ? index : index + 1;
      literals.push({
        name: variable,
        negated: bits[sourceIndex] === "0"
      });
    });
    return termToString(literals);
  });

  const uniqueRemainders = [...new Set(remainderTerms)].sort((a, b) => a.localeCompare(b));
  const factoredLiteral = literalToString(singleLiteral);
  const groupedInside = uniqueRemainders.join(" + ");
  const groupedLine = `${outputLabel} = ${factoredLiteral}(${groupedInside})`;
  const coveredLine = `${outputLabel} = ${factoredLiteral}(1)`;
  const finalLine = `${outputLabel} = ${factoredLiteral}`;

  return [
    {
      title: "Factor constant literal from grouped minterms",
      beforeExpression: `${outputLabel} = ${canonicalExpression}`,
      afterExpression: groupedLine,
      ruleName: getRuleDefinition("distributive").name,
      ruleFormula: getRuleDefinition("distributive").formula,
      explanation: `${singleLiteral.name}${singleLiteral.negated ? "=0" : "=1"} stays constant across grouped minterms.`
    },
    {
      title: "Collapse all changing combinations",
      beforeExpression: groupedLine,
      afterExpression: coveredLine,
      ruleName: getRuleDefinition("coverage").name,
      ruleFormula: getRuleDefinition("coverage").formula,
      explanation: "The remaining variables span every combination, so the parenthesized sum simplifies to 1."
    },
    {
      title: "Apply identity",
      beforeExpression: coveredLine,
      afterExpression: finalLine,
      ruleName: getRuleDefinition("identity").name,
      ruleFormula: getRuleDefinition("identity").formula,
      explanation: "Multiplication by 1 leaves the factored term unchanged."
    }
  ];
}

export function buildBooleanAlgebraSteps(params: BuildAlgebraStepsParams): AlgebraStep[] {
  const { outputLabel, originalExpression, minimizedExpression, minterms, variables, groups } = params;
  const steps: AlgebraStep[] = [];
  let stepNumber = 1;

  const addStep = (step: Omit<AlgebraStep, "stepNumber">) => {
    steps.push({
      ...step,
      stepNumber
    });
    stepNumber += 1;
  };

  const originalRight = getRightHandExpression(originalExpression);
  const minimizedRight = minimizedExpression.trim();
  const canonicalExpression = buildCanonicalSop(minterms, variables);
  const sigmaLine = `${outputLabel} = Σm(${minterms.join(",")})`;
  const canonicalLine = `${outputLabel} = ${canonicalExpression}`;

  if (minterms.length === 0) {
    addStep({
      title: "No true minterms",
      beforeExpression: originalExpression,
      afterExpression: `${outputLabel} = 0`,
      ruleName: getRuleDefinition("null").name,
      ruleFormula: getRuleDefinition("null").formula,
      explanation: "When no minterms evaluate to 1, the function is always 0."
    });
    return steps;
  }

  if (minterms.length === 2 ** variables.length) {
    addStep({
      title: "All minterms are true",
      beforeExpression: sigmaLine,
      afterExpression: `${outputLabel} = 1`,
      ruleName: getRuleDefinition("null").name,
      ruleFormula: getRuleDefinition("null").formula,
      explanation: "Every input combination maps to 1, so the function is constant 1."
    });
    return steps;
  }

  if (normalizeExpressionForCompare(originalRight) !== normalizeExpressionForCompare(canonicalExpression)) {
    addStep({
      title: "Expand to canonical SOP",
      beforeExpression: sigmaLine,
      afterExpression: canonicalLine,
      ruleName: getRuleDefinition("canonical").name,
      ruleFormula: getRuleDefinition("canonical").formula,
      explanation: "Expand each listed minterm into a full product term and OR them together."
    });
  }

  const directPatternSteps = detectTwoTermPattern({
    outputLabel,
    originalRight,
    minimizedExpression: minimizedRight
  });

  if (directPatternSteps && directPatternSteps.length > 0) {
    directPatternSteps.forEach((step) => addStep(step));

    const finalAfter = directPatternSteps[directPatternSteps.length - 1].afterExpression;
    const finalRight = getRightHandExpression(finalAfter);
    if (normalizeExpressionForCompare(finalRight) !== normalizeExpressionForCompare(minimizedRight)) {
      addStep({
        title: "Use K-map equivalent simplification",
        beforeExpression: `${outputLabel} = ${finalRight}`,
        afterExpression: `${outputLabel} = ${minimizedRight}`,
        ruleName: getRuleDefinition("kmap").name,
        ruleFormula: getRuleDefinition("kmap").formula,
        explanation: "K-map grouping confirms the final minimal SOP result."
      });
    }

    return steps;
  }

  const canonicalPatternSteps = detectTwoTermPattern({
    outputLabel,
    originalRight: canonicalExpression,
    minimizedExpression: minimizedRight
  });

  if (canonicalPatternSteps && canonicalPatternSteps.length > 0) {
    canonicalPatternSteps.forEach((step) => addStep(step));

    const finalAfter = canonicalPatternSteps[canonicalPatternSteps.length - 1].afterExpression;
    const finalRight = getRightHandExpression(finalAfter);
    if (normalizeExpressionForCompare(finalRight) !== normalizeExpressionForCompare(minimizedRight)) {
      addStep({
        title: "Use K-map equivalent simplification",
        beforeExpression: `${outputLabel} = ${finalRight}`,
        afterExpression: `${outputLabel} = ${minimizedRight}`,
        ruleName: getRuleDefinition("kmap").name,
        ruleFormula: getRuleDefinition("kmap").formula,
        explanation: "K-map grouping confirms the final minimal SOP result."
      });
    }

    return steps;
  }

  const coverageSteps = detectCanonicalCoverageSteps({
    outputLabel,
    canonicalExpression,
    variables,
    minterms,
    minimizedExpression: minimizedRight
  });

  if (coverageSteps) {
    coverageSteps.forEach((step) => addStep(step));
    return steps;
  }

  const groupedTerms = groups.map((group) => group.productTerm).join(" + ");
  if (groupedTerms && normalizeExpressionForCompare(groupedTerms) !== normalizeExpressionForCompare(minimizedRight)) {
    addStep({
      title: "Combine grouped terms",
      beforeExpression: canonicalLine,
      afterExpression: `${outputLabel} = ${groupedTerms}`,
      ruleName: getRuleDefinition("kmap").name,
      ruleFormula: getRuleDefinition("kmap").formula,
      explanation: "Each K-map group contributes one product term."
    });
  }

  if (normalizeExpressionForCompare(canonicalExpression) !== normalizeExpressionForCompare(minimizedRight)) {
    addStep({
      title: "Final minimized expression",
      beforeExpression: `${outputLabel} = ${groupedTerms || canonicalExpression}`,
      afterExpression: `${outputLabel} = ${minimizedRight}`,
      ruleName: getRuleDefinition("kmap").name,
      ruleFormula: getRuleDefinition("kmap").formula,
      explanation: "Keep only essential implicant terms for minimal SOP."
    });
  } else {
    addStep({
      title: "Already minimal",
      beforeExpression: `${outputLabel} = ${minimizedRight}`,
      afterExpression: `${outputLabel} = ${minimizedRight}`,
      ruleName: getRuleDefinition("idempotent").name,
      ruleFormula: getRuleDefinition("idempotent").formula,
      explanation: "No additional reduction was found from K-map grouping."
    });
  }

  return steps;
}

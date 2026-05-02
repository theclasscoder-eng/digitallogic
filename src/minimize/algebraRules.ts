export interface AlgebraRuleDefinition {
  name: string;
  formula: string;
  explanation: string;
}

export const ALGEBRA_RULES: Record<string, AlgebraRuleDefinition> = {
  complement: {
    name: "Complement Law",
    formula: "A + A' = 1, A * A' = 0",
    explanation: "A variable and its complement cancel to either 1 (OR) or 0 (AND)."
  },
  identity: {
    name: "Identity Law",
    formula: "A + 0 = A, A * 1 = A",
    explanation: "Identity values keep the original variable unchanged."
  },
  null: {
    name: "Null Law",
    formula: "A + 1 = 1, A * 0 = 0",
    explanation: "Dominating values force OR to 1 and AND to 0."
  },
  idempotent: {
    name: "Idempotent Law",
    formula: "A + A = A, A * A = A",
    explanation: "Repeating the same literal does not change the expression."
  },
  doubleNegation: {
    name: "Double Negation",
    formula: "(A')' = A",
    explanation: "Two inversions on the same term cancel out."
  },
  absorption: {
    name: "Absorption Law",
    formula: "A + AB = A, A(A + B) = A",
    explanation: "A broader term absorbs a more specific redundant term."
  },
  distributive: {
    name: "Distributive Law",
    formula: "AB + AC = A(B + C), A + BC = (A + B)(A + C)",
    explanation: "Factor out common literals to simplify term combinations."
  },
  consensus: {
    name: "Consensus Law",
    formula: "AB + A'C + BC = AB + A'C",
    explanation: "Consensus term BC is redundant when AB and A'C already exist."
  },
  deMorgan: {
    name: "De Morgan's Law",
    formula: "(A + B)' = A'B', (AB)' = A' + B'",
    explanation: "Negation distributes across grouped OR/AND by flipping operators."
  },
  canonical: {
    name: "Canonical SOP",
    formula: "F = Σm(...)",
    explanation: "Write the function as the OR of all true minterms."
  },
  kmap: {
    name: "K-map Adjacency",
    formula: "Adjacent 1-cells eliminate changing variables",
    explanation: "In each group, only literals constant across all covered minterms remain."
  },
  coverage: {
    name: "Complete Coverage",
    formula: "A'B' + A'B + AB' + AB = 1",
    explanation: "All combinations of the changing variables are covered, so they collapse to 1."
  },
  flattening: {
    name: "Flattening",
    formula: "A + (B + C) = A + B + C, A(BC) = ABC",
    explanation: "Associative regrouping removes unnecessary nested structure."
  }
};

export function getRuleDefinition(ruleKey: keyof typeof ALGEBRA_RULES): AlgebraRuleDefinition {
  return ALGEBRA_RULES[ruleKey];
}


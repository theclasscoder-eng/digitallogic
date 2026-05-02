import type { AndNode, ExprNode, NotNode, OrNode, VariableNode, XorNode } from "../expression/ast";
import { parseBooleanExpression } from "../expression/parser";
import { compareVariableNames } from "../expression/variableUtils";
import { getRuleDefinition } from "./algebraRules";
import { normalizeExpressionForCompare } from "./implicantUtils";
import type { AlgebraStep, MinimizationResult } from "./minimizationTypes";

interface Literal {
  name: string;
  negated: boolean;
}

type RuleKey =
  | "identity"
  | "null"
  | "idempotent"
  | "complement"
  | "doubleNegation"
  | "absorption"
  | "distributive"
  | "consensus"
  | "flattening";

interface AppliedRewrite {
  ruleKey: RuleKey;
  title: string;
  explanation: string;
}

interface RewriteResult {
  node: ExprNode;
  applied?: AppliedRewrite;
}

function literalKey(literal: Literal): string {
  return `${literal.name}:${literal.negated ? "1" : "0"}`;
}

function isLiteralNode(node: ExprNode): boolean {
  return node.type === "variable" || (node.type === "not" && node.child.type === "variable");
}

function toLiteral(node: ExprNode): Literal | null {
  if (node.type === "variable") {
    return {
      name: node.name,
      negated: false
    };
  }

  if (node.type === "not" && node.child.type === "variable") {
    return {
      name: node.child.name,
      negated: true
    };
  }

  return null;
}

function literalToNode(literal: Literal): ExprNode {
  if (!literal.negated) {
    return {
      type: "variable",
      name: literal.name
    } satisfies VariableNode;
  }

  return {
    type: "not",
    child: {
      type: "variable",
      name: literal.name
    } satisfies VariableNode
  } satisfies NotNode;
}

function complementLiteral(literal: Literal): Literal {
  return {
    name: literal.name,
    negated: !literal.negated
  };
}

function canonicalNodeKey(node: ExprNode): string {
  if (node.type === "variable") {
    return `v(${node.name})`;
  }

  if (node.type === "constant") {
    return `c(${node.value})`;
  }

  if (node.type === "not") {
    return `n(${canonicalNodeKey(node.child)})`;
  }

  const typePrefix = node.type === "and" ? "a" : node.type === "or" ? "o" : "x";
  const childKeys = node.children.map((child) => canonicalNodeKey(child)).sort((a, b) => a.localeCompare(b));
  return `${typePrefix}(${childKeys.join(",")})`;
}

function sortNodes(nodes: ExprNode[]): ExprNode[] {
  return [...nodes].sort((left, right) => canonicalNodeKey(left).localeCompare(canonicalNodeKey(right)));
}

function parseRightExpression(expressionLine: string): string {
  const equalsIndex = expressionLine.indexOf("=");
  if (equalsIndex === -1) {
    return expressionLine.trim();
  }

  return expressionLine.slice(equalsIndex + 1).trim();
}

function nodePrecedence(node: ExprNode): number {
  if (node.type === "or") {
    return 1;
  }

  if (node.type === "xor") {
    return 2;
  }

  if (node.type === "and") {
    return 3;
  }

  if (node.type === "not") {
    return 4;
  }

  return 5;
}

function nodeToExpression(node: ExprNode, parentPrecedence = 0): string {
  if (node.type === "variable") {
    return node.name;
  }

  if (node.type === "constant") {
    return String(node.value);
  }

  if (node.type === "not") {
    const child = node.child;
    const childExpression = nodeToExpression(child, nodePrecedence(node));
    if (child.type === "variable" || child.type === "constant") {
      return `${childExpression}'`;
    }

    return `(${childExpression})'`;
  }

  if (node.type === "and") {
    const expression = node.children
      .map((child) => {
        const childExpression = nodeToExpression(child, 0);
        if (child.type === "or" || child.type === "xor") {
          return `(${childExpression})`;
        }
        return childExpression;
      })
      .join("");

    if (nodePrecedence(node) < parentPrecedence) {
      return `(${expression})`;
    }

    return expression;
  }

  if (node.type === "xor") {
    const expression = node.children
      .map((child) => {
        const childExpression = nodeToExpression(child, 0);
        if (nodePrecedence(child) < nodePrecedence(node)) {
          return `(${childExpression})`;
        }
        return childExpression;
      })
      .join(" ⊕ ");

    if (nodePrecedence(node) < parentPrecedence) {
      return `(${expression})`;
    }

    return expression;
  }

  const expression = node.children
    .map((child) => {
      const childExpression = nodeToExpression(child, 0);
      if (nodePrecedence(child) < nodePrecedence(node)) {
        return `(${childExpression})`;
      }
      return childExpression;
    })
    .join(" + ");

  if (nodePrecedence(node) < parentPrecedence) {
    return `(${expression})`;
  }

  return expression;
}

function buildFlatNode(type: "and" | "or" | "xor", children: ExprNode[]): ExprNode {
  if (children.length === 1) {
    return children[0];
  }

  if (type === "and") {
    return {
      type: "and",
      children: sortNodes(children)
    } satisfies AndNode;
  }

  if (type === "or") {
    return {
      type: "or",
      children: sortNodes(children)
    } satisfies OrNode;
  }

  return {
    type: "xor",
    children: sortNodes(children)
  } satisfies XorNode;
}

function flattenSameType(node: ExprNode): ExprNode {
  if (node.type !== "and" && node.type !== "or" && node.type !== "xor") {
    return node;
  }

  const flattened: ExprNode[] = [];
  node.children.forEach((child) => {
    if (child.type === node.type) {
      flattened.push(...child.children);
      return;
    }

    flattened.push(child);
  });

  return buildFlatNode(node.type, flattened);
}

function canonicalize(node: ExprNode): ExprNode {
  if (node.type === "variable" || node.type === "constant") {
    return node;
  }

  if (node.type === "not") {
    return {
      type: "not",
      child: canonicalize(node.child)
    } satisfies NotNode;
  }

  const children = node.children.map((child) => canonicalize(child));
  return flattenSameType(buildFlatNode(node.type, children));
}

function containsNode(children: ExprNode[], candidate: ExprNode): boolean {
  const candidateKey = canonicalNodeKey(candidate);
  return children.some((child) => canonicalNodeKey(child) === candidateKey);
}

function asLiteralConjunction(node: ExprNode): Literal[] | null {
  if (node.type === "constant") {
    return node.value === 1 ? [] : null;
  }

  if (isLiteralNode(node)) {
    const literal = toLiteral(node);
    return literal ? [literal] : null;
  }

  if (node.type !== "and") {
    return null;
  }

  const literalMap = new Map<string, Literal>();

  for (const child of node.children) {
    const literal = toLiteral(child);
    if (!literal) {
      return null;
    }

    const inverseKey = literalKey(complementLiteral(literal));
    if (literalMap.has(inverseKey)) {
      return null;
    }

    literalMap.set(literalKey(literal), literal);
  }

  return [...literalMap.values()].sort((left, right) => {
    const byName = compareVariableNames(left.name, right.name);
    if (byName !== 0) {
      return byName;
    }
    return Number(left.negated) - Number(right.negated);
  });
}

function nodeFromLiteralConjunction(literals: Literal[]): ExprNode {
  if (literals.length === 0) {
    return {
      type: "constant",
      value: 1
    };
  }

  const deduped = new Map<string, Literal>();
  for (const literal of literals) {
    const inverseKey = literalKey(complementLiteral(literal));
    if (deduped.has(inverseKey)) {
      return {
        type: "constant",
        value: 0
      };
    }
    deduped.set(literalKey(literal), literal);
  }

  const nodes = [...deduped.values()]
    .sort((left, right) => {
      const byName = compareVariableNames(left.name, right.name);
      if (byName !== 0) {
        return byName;
      }
      return Number(left.negated) - Number(right.negated);
    })
    .map((literal) => literalToNode(literal));

  return buildFlatNode("and", nodes);
}

function removeDuplicates(children: ExprNode[]): ExprNode[] {
  const seen = new Set<string>();
  const result: ExprNode[] = [];

  for (const child of children) {
    const key = canonicalNodeKey(child);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(child);
  }

  return result;
}

function rewriteNot(node: NotNode): RewriteResult {
  if (node.child.type === "not") {
    return {
      node: node.child.child,
      applied: {
        ruleKey: "doubleNegation",
        title: "Apply Double Negation",
        explanation: "Two consecutive inversions cancel each other."
      }
    };
  }

  if (node.child.type === "constant") {
    return {
      node: {
        type: "constant",
        value: node.child.value === 1 ? 0 : 1
      },
      applied: {
        ruleKey: "complement",
        title: "Negate Constant",
        explanation: "Negating 0 gives 1 and negating 1 gives 0."
      }
    };
  }

  return { node };
}

function rewriteAnd(node: AndNode): RewriteResult {
  const children = sortNodes([...node.children]);

  if (children.some((child) => child.type === "constant" && child.value === 0)) {
    return {
      node: {
        type: "constant",
        value: 0
      },
      applied: {
        ruleKey: "null",
        title: "Apply Null Law",
        explanation: "Any term multiplied by 0 is 0."
      }
    };
  }

  const withoutOne = children.filter((child) => !(child.type === "constant" && child.value === 1));
  if (withoutOne.length !== children.length) {
    return {
      node: withoutOne.length === 0 ? { type: "constant", value: 1 } : buildFlatNode("and", withoutOne),
      applied: {
        ruleKey: "identity",
        title: "Apply Identity Law",
        explanation: "Multiplying by 1 does not change the expression."
      }
    };
  }

  const deduped = removeDuplicates(children);
  if (deduped.length !== children.length) {
    return {
      node: deduped.length === 1 ? deduped[0] : buildFlatNode("and", deduped),
      applied: {
        ruleKey: "idempotent",
        title: "Remove Duplicate Factors",
        explanation: "Repeated product factors collapse to a single factor."
      }
    };
  }

  const literals = deduped.map((child) => toLiteral(child)).filter((literal): literal is Literal => Boolean(literal));
  const literalSet = new Set(literals.map((literal) => literalKey(literal)));
  for (const literal of literals) {
    if (literalSet.has(literalKey(complementLiteral(literal)))) {
      return {
        node: {
          type: "constant",
          value: 0
        },
        applied: {
          ruleKey: "complement",
          title: "Apply Complement Law",
          explanation: "A literal AND its complement is always 0."
        }
      };
    }
  }

  for (const literalChild of deduped) {
    for (let index = 0; index < deduped.length; index += 1) {
      const candidate = deduped[index];
      if (candidate.type !== "or") {
        continue;
      }

      if (!containsNode(candidate.children, literalChild)) {
        continue;
      }

      const nextChildren = deduped.filter((_, childIndex) => childIndex !== index);
      return {
        node: nextChildren.length === 1 ? nextChildren[0] : buildFlatNode("and", nextChildren),
        applied: {
          ruleKey: "absorption",
          title: "Apply Absorption Law",
          explanation: "A(A + B) simplifies to A."
        }
      };
    }
  }

  return { node: buildFlatNode("and", deduped) };
}

function combineComplementaryTerms(left: Literal[], right: Literal[]): Literal[] | null {
  if (left.length !== right.length || left.length === 0) {
    return null;
  }

  const rightByName = new Map(right.map((literal) => [literal.name, literal]));
  const differences: Literal[] = [];
  const shared: Literal[] = [];

  for (const literal of left) {
    const match = rightByName.get(literal.name);
    if (!match) {
      return null;
    }

    if (match.negated === literal.negated) {
      shared.push(literal);
      continue;
    }

    differences.push(literal);
  }

  if (differences.length !== 1) {
    return null;
  }

  return shared;
}

function rewriteOr(node: OrNode): RewriteResult {
  const children = sortNodes([...node.children]);

  if (children.some((child) => child.type === "constant" && child.value === 1)) {
    return {
      node: {
        type: "constant",
        value: 1
      },
      applied: {
        ruleKey: "null",
        title: "Apply Null Law",
        explanation: "Any term OR 1 is always 1."
      }
    };
  }

  const withoutZero = children.filter((child) => !(child.type === "constant" && child.value === 0));
  if (withoutZero.length !== children.length) {
    return {
      node: withoutZero.length === 0 ? { type: "constant", value: 0 } : buildFlatNode("or", withoutZero),
      applied: {
        ruleKey: "identity",
        title: "Apply Identity Law",
        explanation: "Adding 0 does not change the expression."
      }
    };
  }

  const deduped = removeDuplicates(withoutZero);
  if (deduped.length !== withoutZero.length) {
    return {
      node: deduped.length === 1 ? deduped[0] : buildFlatNode("or", deduped),
      applied: {
        ruleKey: "idempotent",
        title: "Remove Duplicate Terms",
        explanation: "Repeated sum terms collapse to one copy."
      }
    };
  }

  const literals = deduped.map((child) => toLiteral(child)).filter((literal): literal is Literal => Boolean(literal));
  const literalSet = new Set(literals.map((literal) => literalKey(literal)));
  for (const literal of literals) {
    if (literalSet.has(literalKey(complementLiteral(literal)))) {
      return {
        node: {
          type: "constant",
          value: 1
        },
        applied: {
          ruleKey: "complement",
          title: "Apply Complement Law",
          explanation: "A literal OR its complement is always 1."
        }
      };
    }
  }

  for (const broadTerm of deduped) {
    for (let index = 0; index < deduped.length; index += 1) {
      const candidate = deduped[index];
      if (candidate.type !== "and") {
        continue;
      }

      if (!containsNode(candidate.children, broadTerm)) {
        continue;
      }

      const nextChildren = deduped.filter((_, childIndex) => childIndex !== index);
      return {
        node: nextChildren.length === 1 ? nextChildren[0] : buildFlatNode("or", nextChildren),
        applied: {
          ruleKey: "absorption",
          title: "Apply Absorption Law",
          explanation: "A + AB simplifies to A."
        }
      };
    }
  }

  for (const baseLiteralNode of deduped) {
    const baseLiteral = toLiteral(baseLiteralNode);
    if (!baseLiteral) {
      continue;
    }

    for (let index = 0; index < deduped.length; index += 1) {
      const candidate = deduped[index];
      const candidateLiterals = asLiteralConjunction(candidate);
      if (!candidateLiterals || candidateLiterals.length < 2) {
        continue;
      }

      const inverse = literalKey(complementLiteral(baseLiteral));
      const hasInverse = candidateLiterals.some((literal) => literalKey(literal) === inverse);
      if (!hasInverse) {
        continue;
      }

      const reduced = candidateLiterals.filter((literal) => literalKey(literal) !== inverse);
      const reducedNode = nodeFromLiteralConjunction(reduced);
      const nextChildren = deduped.map((child, childIndex) => (childIndex === index ? reducedNode : child));
      return {
        node: buildFlatNode("or", nextChildren),
        applied: {
          ruleKey: "absorption",
          title: "Apply Redundancy Form",
          explanation: "A + A'B simplifies to A + B."
        }
      };
    }
  }

  const termLiterals = deduped.map((child) => asLiteralConjunction(child));
  for (let leftIndex = 0; leftIndex < deduped.length; leftIndex += 1) {
    const left = termLiterals[leftIndex];
    if (!left) {
      continue;
    }

    for (let rightIndex = leftIndex + 1; rightIndex < deduped.length; rightIndex += 1) {
      const right = termLiterals[rightIndex];
      if (!right) {
        continue;
      }

      const combined = combineComplementaryTerms(left, right);
      if (combined) {
        const mergedNode = nodeFromLiteralConjunction(combined);
        const nextChildren = deduped.filter((_, index) => index !== leftIndex && index !== rightIndex);
        nextChildren.push(mergedNode);
        return {
          node: buildFlatNode("or", nextChildren),
          applied: {
            ruleKey: "complement",
            title: "Combine Complementary Product Terms",
            explanation: "Terms that differ by one complemented literal collapse to their shared factors."
          }
        };
      }
    }
  }

  for (let leftIndex = 0; leftIndex < deduped.length; leftIndex += 1) {
    const left = termLiterals[leftIndex];
    if (!left || left.length < 2) {
      continue;
    }

    for (let rightIndex = leftIndex + 1; rightIndex < deduped.length; rightIndex += 1) {
      const right = termLiterals[rightIndex];
      if (!right || right.length < 2) {
        continue;
      }

      const rightLookup = new Map(right.map((literal) => [literalKey(literal), literal]));
      const shared = left.filter((literal) => rightLookup.has(literalKey(literal)));
      if (shared.length === 0) {
        continue;
      }

      const sharedKeys = new Set(shared.map((literal) => literalKey(literal)));
      const leftResidual = left.filter((literal) => !sharedKeys.has(literalKey(literal)));
      const rightResidual = right.filter((literal) => !sharedKeys.has(literalKey(literal)));
      if (leftResidual.length === 0 || rightResidual.length === 0) {
        continue;
      }

      const factorNode = nodeFromLiteralConjunction(shared);
      const leftNode = nodeFromLiteralConjunction(leftResidual);
      const rightNode = nodeFromLiteralConjunction(rightResidual);
      const factoredNode = buildFlatNode("and", [factorNode, buildFlatNode("or", [leftNode, rightNode])]);
      const nextChildren = deduped.filter((_, index) => index !== leftIndex && index !== rightIndex);
      nextChildren.push(factoredNode);

      return {
        node: buildFlatNode("or", nextChildren),
        applied: {
          ruleKey: "distributive",
          title: "Factor Common Literal",
          explanation: "AB + AC can be rewritten as A(B + C)."
        }
      };
    }
  }

  for (let firstIndex = 0; firstIndex < deduped.length; firstIndex += 1) {
    const first = termLiterals[firstIndex];
    if (!first || first.length !== 2) {
      continue;
    }

    for (let secondIndex = firstIndex + 1; secondIndex < deduped.length; secondIndex += 1) {
      const second = termLiterals[secondIndex];
      if (!second || second.length !== 2) {
        continue;
      }

      for (const firstLiteral of first) {
        const secondComplement = second.find(
          (candidate) => candidate.name === firstLiteral.name && candidate.negated !== firstLiteral.negated
        );
        if (!secondComplement) {
          continue;
        }

        const firstOther = first.find((candidate) => candidate.name !== firstLiteral.name);
        const secondOther = second.find((candidate) => candidate.name !== firstLiteral.name);
        if (!firstOther || !secondOther) {
          continue;
        }

        const consensusLiterals = [firstOther, secondOther].sort((left, right) => {
          const byName = compareVariableNames(left.name, right.name);
          if (byName !== 0) {
            return byName;
          }
          return Number(left.negated) - Number(right.negated);
        });

        for (let consensusIndex = 0; consensusIndex < deduped.length; consensusIndex += 1) {
          if (consensusIndex === firstIndex || consensusIndex === secondIndex) {
            continue;
          }

          const consensus = termLiterals[consensusIndex];
          if (!consensus || consensus.length !== 2) {
            continue;
          }

          const consensusMatch =
            literalKey(consensus[0]) === literalKey(consensusLiterals[0]) &&
            literalKey(consensus[1]) === literalKey(consensusLiterals[1]);

          if (!consensusMatch) {
            continue;
          }

          const nextChildren = deduped.filter((_, index) => index !== consensusIndex);
          return {
            node: buildFlatNode("or", nextChildren),
            applied: {
              ruleKey: "consensus",
              title: "Apply Consensus Law",
              explanation: "The consensus term is redundant and can be removed."
            }
          };
        }
      }
    }
  }

  return {
    node: buildFlatNode("or", deduped)
  };
}

function rewriteXor(node: XorNode): RewriteResult {
  const children = sortNodes([...node.children]);

  const withoutZero = children.filter((child) => !(child.type === "constant" && child.value === 0));
  if (withoutZero.length !== children.length) {
    return {
      node: withoutZero.length === 0 ? { type: "constant", value: 0 } : buildFlatNode("xor", withoutZero),
      applied: {
        ruleKey: "identity",
        title: "Remove XOR Identity",
        explanation: "X ⊕ 0 = X."
      }
    };
  }

  const counts = new Map<string, { node: ExprNode; count: number }>();
  withoutZero.forEach((child) => {
    const key = canonicalNodeKey(child);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }

    counts.set(key, { node: child, count: 1 });
  });

  const reduced: ExprNode[] = [];
  counts.forEach((entry) => {
    if (entry.count % 2 === 1) {
      reduced.push(entry.node);
    }
  });

  if (reduced.length !== withoutZero.length) {
    return {
      node: reduced.length === 0 ? { type: "constant", value: 0 } : buildFlatNode("xor", reduced),
      applied: {
        ruleKey: "idempotent",
        title: "Cancel Duplicate XOR Terms",
        explanation: "X ⊕ X = 0, so duplicate XOR operands cancel in pairs."
      }
    };
  }

  return {
    node: buildFlatNode("xor", reduced)
  };
}

function rewriteRecursive(node: ExprNode): RewriteResult {
  if (node.type === "variable" || node.type === "constant") {
    return { node };
  }

  if (node.type === "not") {
    const rewrittenChild = rewriteRecursive(node.child);
    if (rewrittenChild.applied) {
      return {
        node: canonicalize({
          type: "not",
          child: rewrittenChild.node
        }),
        applied: rewrittenChild.applied
      };
    }

    return rewriteNot({
      type: "not",
      child: canonicalize(node.child)
    });
  }

  if (node.type === "and" || node.type === "or" || node.type === "xor") {
    const flattened = flattenSameType(node);
    if (canonicalNodeKey(flattened) !== canonicalNodeKey(node)) {
      return {
        node: canonicalize(flattened),
        applied: {
          ruleKey: "flattening",
          title: "Flatten Nested Terms",
          explanation: "Associative regrouping removes unnecessary nesting."
        }
      };
    }

    for (let index = 0; index < node.children.length; index += 1) {
      const rewrittenChild = rewriteRecursive(node.children[index]);
      if (!rewrittenChild.applied) {
        continue;
      }

      const nextChildren = [...node.children];
      nextChildren[index] = rewrittenChild.node;
      return {
        node: canonicalize({
          type: node.type,
          children: nextChildren
        } as AndNode | OrNode | XorNode),
        applied: rewrittenChild.applied
      };
    }

    const canonicalNode = canonicalize(node);
    if (canonicalNode.type === "and") {
      return rewriteAnd(canonicalNode);
    }

    if (canonicalNode.type === "or") {
      return rewriteOr(canonicalNode);
    }

    if (canonicalNode.type === "xor") {
      return rewriteXor(canonicalNode);
    }

    return { node: canonicalNode };
  }

  return { node };
}

function buildAlgebraStep(
  stepNumber: number,
  outputLabel: string,
  beforeNode: ExprNode,
  afterNode: ExprNode,
  applied: AppliedRewrite
): AlgebraStep {
  const definition = getRuleDefinition(applied.ruleKey);
  return {
    stepNumber,
    title: applied.title,
    beforeExpression: `${outputLabel} = ${nodeToExpression(beforeNode)}`,
    afterExpression: `${outputLabel} = ${nodeToExpression(afterNode)}`,
    ruleName: definition.name,
    ruleFormula: definition.formula,
    explanation: applied.explanation
  };
}

function simplifyExpressionAst(outputLabel: string, root: ExprNode): { node: ExprNode; steps: AlgebraStep[] } {
  let current = canonicalize(root);
  const steps: AlgebraStep[] = [];
  const MAX_PASSES = 80;

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const rewrite = rewriteRecursive(current);
    if (!rewrite.applied) {
      break;
    }

    const next = canonicalize(rewrite.node);
    const beforeExpression = nodeToExpression(current);
    const afterExpression = nodeToExpression(next);
    if (normalizeExpressionForCompare(beforeExpression) === normalizeExpressionForCompare(afterExpression)) {
      current = next;
      continue;
    }

    steps.push(buildAlgebraStep(steps.length + 1, outputLabel, current, next, rewrite.applied));
    current = next;
  }

  return {
    node: current,
    steps
  };
}

function parseExpressionAst(outputLabel: string, originalExpression: string): ExprNode | null {
  try {
    return parseBooleanExpression(originalExpression).expression;
  } catch {
    try {
      const rhs = parseRightExpression(originalExpression);
      return parseBooleanExpression(`${outputLabel} = ${rhs}`).expression;
    } catch {
      return null;
    }
  }
}

export function minimizeByBooleanAlgebra(params: {
  outputLabel: string;
  variables: string[];
  minterms: number[];
  originalExpression: string;
}): MinimizationResult {
  const { outputLabel, variables, minterms, originalExpression } = params;
  const parsed = parseExpressionAst(outputLabel, originalExpression);
  const originalRight = parseRightExpression(originalExpression);

  if (!parsed) {
    const fallbackExpression = originalRight || "0";
    return {
      originalExpression: `${outputLabel} = ${fallbackExpression}`,
      minimizedExpression: fallbackExpression,
      minterms,
      groups: [],
      kmapSteps: [],
      algebraSteps: [
        {
          stepNumber: 1,
          title: "No further safe reductions",
          beforeExpression: `${outputLabel} = ${fallbackExpression}`,
          afterExpression: `${outputLabel} = ${fallbackExpression}`,
          ruleName: "Boolean Algebra Rule Sweep",
          ruleFormula: "Identity, Null, Idempotent, Complement, Absorption, Distributive, Consensus",
          explanation:
            "Boolean Algebra simplification applied available rules. No further safe reductions were found."
        }
      ],
      steps: [],
      isAlreadyMinimal: true,
      variableCount: variables.length,
      supported: true,
      methodUsed: "boolean-algebra",
      outputLabel
    };
  }

  const simplified = simplifyExpressionAst(outputLabel, parsed);
  const minimizedExpression = nodeToExpression(simplified.node);
  const normalizedOriginal = normalizeExpressionForCompare(originalRight || "0");
  const normalizedMinimized = normalizeExpressionForCompare(minimizedExpression);

  const algebraSteps = [...simplified.steps];
  if (algebraSteps.length === 0) {
    algebraSteps.push({
      stepNumber: 1,
      title: "No further safe reductions",
      beforeExpression: `${outputLabel} = ${minimizedExpression}`,
      afterExpression: `${outputLabel} = ${minimizedExpression}`,
      ruleName: "Boolean Algebra Rule Sweep",
      ruleFormula: "Identity, Null, Idempotent, Complement, Absorption, Distributive, Consensus",
      explanation:
        "Boolean Algebra simplification applied available rules. No further safe reductions were found."
    });
  }

  return {
    originalExpression,
    minimizedExpression,
    minterms,
    groups: [],
    kmapSteps: [],
    algebraSteps,
    steps: [],
    isAlreadyMinimal: normalizedOriginal === normalizedMinimized,
    variableCount: variables.length,
    supported: true,
    methodUsed: "boolean-algebra",
    outputLabel
  };
}

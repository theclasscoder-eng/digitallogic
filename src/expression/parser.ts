import type {
  AndNode,
  ConstantNode,
  ExprNode,
  OrNode,
  ParsedExpression,
  VariableNode,
  XorNode
} from "./ast";
import { ExpressionError } from "./expressionErrors";
import { tokenizeExpression, type Token, type TokenType } from "./tokenizer";

function isStartOfUnary(token: Token): boolean {
  return token.type === "variable" || token.type === "constant" || token.type === "lparen" || token.type === "not";
}

class Parser {
  private readonly tokens: Token[];
  private index = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ParsedExpression {
    const equalsIndexes = this.tokens
      .map((token, tokenIndex) => ({ token, tokenIndex }))
      .filter(({ token }) => token.type === "equals")
      .map(({ tokenIndex }) => tokenIndex);

    let outputName = "F";

    if (equalsIndexes.length > 0) {
      if (equalsIndexes.length > 1) {
        throw new ExpressionError("Only one output assignment is supported.", this.peek().position);
      }

      const equalsIndex = equalsIndexes[0];
      if (equalsIndex !== 1 || this.tokens[0].type !== "variable") {
        throw new ExpressionError("Assignment must be in the form Output = expression.", this.tokens[equalsIndex].position);
      }

      outputName = this.tokens[0].value as string;
      this.index = 2;
    }

    const expression = this.parseOr();
    this.expect("eof", "Unexpected token after expression.");

    return {
      outputName,
      expression
    };
  }

  private parseOr(): ExprNode {
    const items: ExprNode[] = [this.parseXor()];

    while (this.match("plus")) {
      items.push(this.parseXor());
    }

    return foldOr(items);
  }

  private parseXor(): ExprNode {
    const items: ExprNode[] = [this.parseAnd()];

    while (this.match("xor")) {
      items.push(this.parseAnd());
    }

    return foldXor(items);
  }

  private parseAnd(): ExprNode {
    const items: ExprNode[] = [this.parseNot()];

    while (true) {
      if (this.match("and")) {
        items.push(this.parseNot());
        continue;
      }

      const next = this.peek();
      if (isStartOfUnary(next)) {
        items.push(this.parseNot());
        continue;
      }

      break;
    }

    return foldAnd(items);
  }

  private parseNot(): ExprNode {
    if (this.match("not")) {
      return {
        type: "not",
        child: this.parseNot()
      };
    }

    let node = this.parsePrimary();

    while (this.match("apostrophe")) {
      node = {
        type: "not",
        child: node
      };
    }

    return node;
  }

  private parsePrimary(): ExprNode {
    const token = this.peek();

    if (token.type === "variable") {
      this.advance();
      return {
        type: "variable",
        name: token.value as string
      } satisfies VariableNode;
    }

    if (token.type === "constant") {
      this.advance();
      return {
        type: "constant",
        value: token.value === "1" ? 1 : 0
      } satisfies ConstantNode;
    }

    if (this.match("lparen")) {
      const expression = this.parseOr();
      this.expect("rparen", "Missing closing parenthesis.");
      return expression;
    }

    throw new ExpressionError("Expected variable, constant, or parenthesized expression.", token.position);
  }

  private peek(): Token {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    const token = this.peek();
    this.index += 1;
    return token;
  }

  private match(type: TokenType): boolean {
    if (this.peek().type !== type) {
      return false;
    }

    this.index += 1;
    return true;
  }

  private expect(type: TokenType, message: string): Token {
    const token = this.peek();

    if (token.type !== type) {
      throw new ExpressionError(message, token.position);
    }

    this.index += 1;
    return token;
  }
}

function foldAnd(children: ExprNode[]): ExprNode {
  if (children.length === 1) {
    return children[0];
  }

  const flat: ExprNode[] = [];
  children.forEach((child) => {
    if (child.type === "and") {
      flat.push(...child.children);
    } else {
      flat.push(child);
    }
  });

  return { type: "and", children: flat } satisfies AndNode;
}

function foldOr(children: ExprNode[]): ExprNode {
  if (children.length === 1) {
    return children[0];
  }

  const flat: ExprNode[] = [];
  children.forEach((child) => {
    if (child.type === "or") {
      flat.push(...child.children);
    } else {
      flat.push(child);
    }
  });

  return { type: "or", children: flat } satisfies OrNode;
}

function foldXor(children: ExprNode[]): ExprNode {
  if (children.length === 1) {
    return children[0];
  }

  const flat: ExprNode[] = [];
  children.forEach((child) => {
    if (child.type === "xor") {
      flat.push(...child.children);
    } else {
      flat.push(child);
    }
  });

  return { type: "xor", children: flat } satisfies XorNode;
}

export function parseBooleanExpression(input: string): ParsedExpression {
  if (!input.trim()) {
    throw new ExpressionError("Expression cannot be empty.", 0);
  }

  const tokens = tokenizeExpression(input);
  const parser = new Parser(tokens);
  return parser.parse();
}

import { ExpressionError } from "./expressionErrors";

export type TokenType =
  | "variable"
  | "constant"
  | "plus"
  | "and"
  | "xor"
  | "not"
  | "apostrophe"
  | "lparen"
  | "rparen"
  | "equals"
  | "eof";

export interface Token {
  type: TokenType;
  value?: string;
  position: number;
}

function isUppercase(char: string): boolean {
  return /[A-Z]/.test(char);
}

function isLowercaseOrUnderscore(char: string): boolean {
  return /[a-z_]/.test(char);
}

function isDigit(char: string): boolean {
  return /\d/.test(char);
}

function isIdentifierChar(char: string): boolean {
  return /[A-Za-z0-9_]/.test(char);
}

export function tokenizeExpression(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (isUppercase(char)) {
      const start = index;
      let uppercaseEnd = index;
      while (uppercaseEnd < input.length && isUppercase(input[uppercaseEnd])) {
        uppercaseEnd += 1;
      }

      const nextAfterUppercase = input[uppercaseEnd];

      // Keep uppercase identifiers with numeric/lowercase suffixes together: X1, IN1, CLK_main.
      if (nextAfterUppercase && (isLowercaseOrUnderscore(nextAfterUppercase) || isDigit(nextAfterUppercase))) {
        index = uppercaseEnd;
        while (index < input.length && isIdentifierChar(input[index])) {
          index += 1;
        }

        tokens.push({
          type: "variable",
          value: input.slice(start, index),
          position: start
        });
        continue;
      }

      // Compact boolean mode: pure uppercase runs are split as implicit AND terms (AB -> A, B).
      for (let cursor = start; cursor < uppercaseEnd; cursor += 1) {
        tokens.push({
          type: "variable",
          value: input[cursor],
          position: cursor
        });
      }
      index = uppercaseEnd;
      continue;
    }

    if (isLowercaseOrUnderscore(char)) {
      const start = index;
      index += 1;
      while (index < input.length && isIdentifierChar(input[index])) {
        index += 1;
      }

      tokens.push({
        type: "variable",
        value: input.slice(start, index),
        position: start
      });
      continue;
    }

    if (char === "0" || char === "1") {
      const next = input[index + 1];
      if (next && isIdentifierChar(next)) {
        throw new ExpressionError("Variable names cannot begin with a digit.", index);
      }

      tokens.push({
        type: "constant",
        value: char,
        position: index
      });
      index += 1;
      continue;
    }

    if (isDigit(char)) {
      throw new ExpressionError("Only constants 0 and 1 are supported.", index);
    }

    if (char === "+") {
      tokens.push({ type: "plus", position: index });
      index += 1;
      continue;
    }

    if (char === "*" || char === "·") {
      tokens.push({ type: "and", position: index });
      index += 1;
      continue;
    }

    if (char === "^" || char === "⊕") {
      tokens.push({ type: "xor", position: index });
      index += 1;
      continue;
    }

    if (char === "!") {
      tokens.push({ type: "not", position: index });
      index += 1;
      continue;
    }

    if (char === "'") {
      tokens.push({ type: "apostrophe", position: index });
      index += 1;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "lparen", position: index });
      index += 1;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: "rparen", position: index });
      index += 1;
      continue;
    }

    if (char === "=") {
      tokens.push({ type: "equals", position: index });
      index += 1;
      continue;
    }

    throw new ExpressionError(`Unsupported character \"${char}\".`, index);
  }

  tokens.push({ type: "eof", position: input.length });
  return tokens;
}

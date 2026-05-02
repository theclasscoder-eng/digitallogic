export class ExpressionError extends Error {
  public readonly position: number;

  constructor(message: string, position = 0) {
    super(message);
    this.name = "ExpressionError";
    this.position = position;
  }
}

export function formatExpressionError(input: string, error: ExpressionError): string {
  const pointerPosition = Math.max(0, Math.min(error.position, input.length));
  const pointerLine = `${" ".repeat(pointerPosition)}^`;
  return `${error.message}\n${input}\n${pointerLine}`;
}

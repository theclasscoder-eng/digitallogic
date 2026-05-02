export type MinimizationMethod = "auto" | "kmap" | "boolean-algebra";
export type MinimizationMethodUsed = "kmap" | "boolean-algebra";

export interface MinimizationOptions {
  method: MinimizationMethod;
  maxKMapVariables: number;
}

export const DEFAULT_MINIMIZATION_OPTIONS: MinimizationOptions = {
  method: "auto",
  maxKMapVariables: 4
};

export function resolveMethodUsed(options: MinimizationOptions, variableCount: number): MinimizationMethodUsed {
  if (options.method === "kmap") {
    return "kmap";
  }

  if (options.method === "boolean-algebra") {
    return "boolean-algebra";
  }

  if (variableCount >= 2 && variableCount <= options.maxKMapVariables) {
    return "kmap";
  }

  return "boolean-algebra";
}

export function formatMethodLabel(method: MinimizationMethodUsed): string {
  return method === "kmap" ? "K-map" : "Boolean Algebra";
}


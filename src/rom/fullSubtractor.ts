import type { RomConfig } from "./romTypes";

export function createFullSubtractorRomConfig(): RomConfig {
  return {
    id: `rom-full-subtractor-${Date.now().toString(36)}`,
    inputVariables: ["A", "B", "Bin"],
    outputs: [
      {
        label: "Diff",
        expression: "A ? B ? Bin"
      },
      {
        label: "Bout",
        expression: "A'B + A'Bin + B Bin"
      }
    ]
  };
}


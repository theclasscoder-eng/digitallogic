import type { SequentialStep } from "./sequentialTypes";

export interface WaveformTrace {
  name: string;
  values: Array<0 | 1>;
}

const INPUT_PRIORITY = ["S", "R", "D", "J", "K", "T", "Enable", "Clock", "Preset", "Clear"];

export function buildWaveformTraces(steps: SequentialStep[]): WaveformTrace[] {
  if (steps.length === 0) {
    return [];
  }

  const inputSet = new Set<string>();
  steps.forEach((step) => {
    Object.keys(step.inputs).forEach((name) => {
      inputSet.add(name);
    });
  });

  const sortedInputs = [...inputSet].sort((a, b) => {
    const idxA = INPUT_PRIORITY.indexOf(a);
    const idxB = INPUT_PRIORITY.indexOf(b);

    if (idxA >= 0 && idxB >= 0) {
      return idxA - idxB;
    }

    if (idxA >= 0) {
      return -1;
    }

    if (idxB >= 0) {
      return 1;
    }

    return a.localeCompare(b);
  });

  const traces: WaveformTrace[] = sortedInputs.map((inputName) => ({
    name: inputName,
    values: steps.map((step) => (step.inputs[inputName as keyof typeof step.inputs] === 1 ? 1 : 0))
  }));

  traces.push({
    name: "Q",
    values: steps.map((step) => step.nextQ)
  });

  traces.push({
    name: "Q'",
    values: steps.map((step) => step.QBar)
  });

  return traces;
}

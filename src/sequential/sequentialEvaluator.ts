import type {
  SequentialComponentDefinition,
  SequentialComponentType,
  SequentialInputs,
  SequentialState,
  SequentialStep
} from "./sequentialTypes";

export const SEQUENTIAL_COMPONENTS: SequentialComponentDefinition[] = [
  {
    type: "SR_LATCH",
    label: "SR Latch",
    shortLabel: "SR",
    requiredInputs: ["S", "R"],
    usesClock: false
  },
  {
    type: "GATED_SR_LATCH",
    label: "Gated SR Latch",
    shortLabel: "GSR",
    requiredInputs: ["S", "R", "Enable"],
    usesClock: false
  },
  {
    type: "D_LATCH",
    label: "D Latch",
    shortLabel: "DL",
    requiredInputs: ["D", "Enable"],
    usesClock: false
  },
  {
    type: "D_FLIP_FLOP",
    label: "D Flip-Flop",
    shortLabel: "DFF",
    requiredInputs: ["D", "Clock"],
    usesClock: true
  },
  {
    type: "JK_FLIP_FLOP",
    label: "JK Flip-Flop",
    shortLabel: "JK",
    requiredInputs: ["J", "K", "Clock"],
    usesClock: true
  },
  {
    type: "T_FLIP_FLOP",
    label: "T Flip-Flop",
    shortLabel: "TFF",
    requiredInputs: ["T", "Clock"],
    usesClock: true
  }
];

export function getComponentDefinition(type: SequentialComponentType): SequentialComponentDefinition {
  return SEQUENTIAL_COMPONENTS.find((entry) => entry.type === type) ?? SEQUENTIAL_COMPONENTS[0];
}

export function createInitialSequentialState(): SequentialState {
  return {
    Q: 0,
    QBar: 1,
    previousClock: 0
  };
}

export function createDefaultInputs(): SequentialInputs {
  return {
    S: 0,
    R: 0,
    D: 0,
    J: 0,
    K: 0,
    T: 0,
    Enable: 0,
    Clock: 0,
    Preset: 0,
    Clear: 0
  };
}

function toBinary(value: 0 | 1 | undefined): 0 | 1 {
  return value === 1 ? 1 : 0;
}

function evaluateSrLike(previousQ: 0 | 1, s: 0 | 1, r: 0 | 1): { nextQ: 0 | 1; warning?: string } {
  if (s === 1 && r === 1) {
    return {
      nextQ: previousQ,
      warning: "Invalid SR condition: S=1 and R=1 is forbidden for NOR SR latch."
    };
  }

  if (s === 1) {
    return { nextQ: 1 };
  }

  if (r === 1) {
    return { nextQ: 0 };
  }

  return { nextQ: previousQ };
}

function evaluateComponent(
  componentType: SequentialComponentType,
  previousState: SequentialState,
  inputs: SequentialInputs
): { nextQ: 0 | 1; triggered: boolean; warning?: string } {
  const previousQ = previousState.Q;
  const clock = toBinary(inputs.Clock);
  const risingEdge = previousState.previousClock === 0 && clock === 1;

  const preset = toBinary(inputs.Preset);
  const clear = toBinary(inputs.Clear);
  if (preset === 1 && clear === 1) {
    return {
      nextQ: previousQ,
      triggered: true,
      warning: "Invalid asynchronous condition: Preset and Clear are both active."
    };
  }

  if (preset === 1) {
    return {
      nextQ: 1,
      triggered: true
    };
  }

  if (clear === 1) {
    return {
      nextQ: 0,
      triggered: true
    };
  }

  if (componentType === "SR_LATCH") {
    const sr = evaluateSrLike(previousQ, toBinary(inputs.S), toBinary(inputs.R));
    return {
      nextQ: sr.nextQ,
      triggered: true,
      warning: sr.warning
    };
  }

  if (componentType === "GATED_SR_LATCH") {
    const enable = toBinary(inputs.Enable);
    if (enable === 0) {
      return {
        nextQ: previousQ,
        triggered: false
      };
    }

    const sr = evaluateSrLike(previousQ, toBinary(inputs.S), toBinary(inputs.R));
    return {
      nextQ: sr.nextQ,
      triggered: true,
      warning: sr.warning
    };
  }

  if (componentType === "D_LATCH") {
    const enable = toBinary(inputs.Enable);
    if (enable === 0) {
      return {
        nextQ: previousQ,
        triggered: false
      };
    }

    return {
      nextQ: toBinary(inputs.D),
      triggered: true
    };
  }

  if (componentType === "D_FLIP_FLOP") {
    if (!risingEdge) {
      return {
        nextQ: previousQ,
        triggered: false
      };
    }

    return {
      nextQ: toBinary(inputs.D),
      triggered: true
    };
  }

  if (componentType === "JK_FLIP_FLOP") {
    if (!risingEdge) {
      return {
        nextQ: previousQ,
        triggered: false
      };
    }

    const j = toBinary(inputs.J);
    const k = toBinary(inputs.K);
    if (j === 0 && k === 0) {
      return { nextQ: previousQ, triggered: true };
    }

    if (j === 1 && k === 0) {
      return { nextQ: 1, triggered: true };
    }

    if (j === 0 && k === 1) {
      return { nextQ: 0, triggered: true };
    }

    return {
      nextQ: previousQ === 1 ? 0 : 1,
      triggered: true
    };
  }

  if (!risingEdge) {
    return {
      nextQ: previousQ,
      triggered: false
    };
  }

  const t = toBinary(inputs.T);
  return {
    nextQ: t === 1 ? (previousQ === 1 ? 0 : 1) : previousQ,
    triggered: true
  };
}

export function evaluateSequentialStep(params: {
  componentType: SequentialComponentType;
  currentState: SequentialState;
  inputs: SequentialInputs;
  stepIndex: number;
}): { nextState: SequentialState; step: SequentialStep } {
  const { componentType, currentState, inputs, stepIndex } = params;

  const previousQ = currentState.Q;
  const clock = toBinary(inputs.Clock);
  const evaluated = evaluateComponent(componentType, currentState, inputs);
  const nextQ = evaluated.nextQ;
  const nextState: SequentialState = {
    Q: nextQ,
    QBar: nextQ === 1 ? 0 : 1,
    previousClock: clock,
    warning: evaluated.warning
  };

  const step: SequentialStep = {
    index: stepIndex,
    componentType,
    inputs: { ...inputs, Clock: clock },
    previousQ,
    nextQ,
    QBar: nextState.QBar,
    triggered: evaluated.triggered,
    warning: evaluated.warning
  };

  return {
    nextState,
    step
  };
}

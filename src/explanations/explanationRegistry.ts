import type { ExplanationContent, ExplanationTopic } from "./explanationTypes";

export const explanationRegistry: Record<ExplanationTopic, ExplanationContent> = {
  gates: {
    title: "Logic Gates",
    shortSummary: "Logic gates transform binary inputs (0/1) into binary outputs based on fixed rules.",
    whyItMakesSense: [
      "AND outputs 1 only when all inputs are 1.",
      "OR outputs 1 when any input is 1.",
      "NOT flips one signal: 0 becomes 1, and 1 becomes 0.",
      "NAND, NOR, XOR, and XNOR are useful combinations/inversions of these basic behaviors.",
      "Each wire carries a signal and now also shows the expression flowing through it."
    ],
    steps: [
      "Place input nodes.",
      "Add gates and connect outputs to inputs.",
      "Connect final result to an output node (F, G, Y, etc.).",
      "Read simulation values and generated expressions."
    ],
    example: "If A and B go into AND, the output is AB.",
    commonMistakes: [
      "Connecting output-to-output or input-to-input handles.",
      "Forgetting to connect a gate chain to an output node.",
      "Assuming an unconnected gate input is 1 (it is treated as 0)."
    ]
  },
  "expression-builder": {
    title: "Expression Builder",
    shortSummary: "Expression Builder converts Boolean expressions into visual circuits.",
    whyItMakesSense: [
      "A parsed expression is represented as an AST (tree).",
      "AND terms become AND gates, OR sums become OR gates, and negations become NOT gates.",
      "This lets students move between algebra form and circuit form quickly."
    ],
    steps: [
      "Enter expression, for example F = A'B + C.",
      "Choose replace or append mode.",
      "Generate the circuit and inspect wires/outputs."
    ],
    example: "A'B + C means NOT A and B feed an AND, then OR with C.",
    commonMistakes: [
      "Typing invalid syntax like missing parenthesis.",
      "Forgetting that apostrophe (') is NOT.",
      "Using output label on the right side as if it were an input variable."
    ]
  },
  "truth-table": {
    title: "Truth Table",
    shortSummary: "A truth table lists every possible input combination and the resulting output(s).",
    whyItMakesSense: [
      "For n inputs, there are 2^n combinations.",
      "Each row is one concrete test case for the logic function.",
      "Two circuits are equivalent if they match across all rows."
    ],
    steps: [
      "Detect active input variables.",
      "Generate all binary combinations.",
      "Evaluate circuit outputs for each row."
    ],
    example: "With A and B, rows are 00, 01, 10, 11.",
    commonMistakes: [
      "Confusing Gray code ordering (K-map) with binary counting (truth table).",
      "Counting constants 0/1 as variables."
    ]
  },
  kmap: {
    title: "Karnaugh Map (K-map)",
    shortSummary: "K-map arranges minterms in Gray-code order so simplification patterns are visible.",
    whyItMakesSense: [
      "Adjacent cells differ by one variable only.",
      "Grouping 1s in powers of two (1,2,4,8,...) eliminates variables that change.",
      "Larger valid groups generally give simpler expressions."
    ],
    steps: [
      "Plot minterms where output is 1.",
      "Create largest possible power-of-two groups.",
      "For each group, keep only variables that stay constant.",
      "OR all product terms to get minimized SOP."
    ],
    example: "Grouping m1,m3,m5,m7 in a 3-variable map gives C.",
    commonMistakes: [
      "Using binary order instead of Gray code order.",
      "Creating non-rectangular groups.",
      "Ignoring wraparound adjacency at map edges."
    ]
  },
  minimization: {
    title: "Minimization",
    shortSummary: "Minimization reduces gate count while preserving identical truth-table behavior.",
    whyItMakesSense: [
      "K-map minimization is visual and strong for 2-4 variables.",
      "Boolean algebra minimization applies rewrite laws on expressions/AST.",
      "Both methods should produce an equivalent function."
    ],
    steps: [
      "Derive minterms from truth table or manual source.",
      "Apply selected method: Auto, K-map, or Boolean Algebra.",
      "Review steps and generate minimized circuit."
    ],
    example: "A + AB = A by absorption.",
    commonMistakes: [
      "Assuming any shorter-looking expression is equivalent without checking.",
      "Using K-map on >4 variables (unsupported in this app)."
    ]
  },
  mux: {
    title: "Multiplexer (MUX)",
    shortSummary: "A MUX routes one of many data inputs to a single output based on select lines.",
    whyItMakesSense: [
      "A 4:1 MUX has 4 data inputs and 2 select lines.",
      "Select bits choose exactly one D input index.",
      "Each D input can be 0, 1, a variable, a negated variable, or an expression."
    ],
    steps: [
      "Choose MUX size.",
      "Choose select variables (S0, S1, ...).",
      "Define D0..Dn-1 values or auto-solve from expression.",
      "Generate table and verify output."
    ],
    example: "For 4:1, S1S0=10 selects D2.",
    commonMistakes: [
      "Selecting duplicate variables for different select lines.",
      "Forgetting that index is binary from select lines.",
      "Entering invalid expression syntax in data inputs."
    ]
  },
  rom: {
    title: "ROM Realization",
    shortSummary: "ROM stores truth-table outputs as memory words indexed by input address bits.",
    whyItMakesSense: [
      "Input variables form the address bus.",
      "Each address stores output bits (data word).",
      "High-level view is memory block; low-level view is decoder + OR realization."
    ],
    steps: [
      "Define input variables.",
      "Define output expressions or truth bits.",
      "Generate table and ROM size (2^n x m).",
      "Inspect high-level and low-level diagrams."
    ],
    example: "A,B,Bin with Diff,Bout gives ROM size 8 x 2.",
    commonMistakes: [
      "Using inconsistent variable order between expressions and interpretation.",
      "Supplying truth-bit strings with wrong length."
    ]
  },
  sequential: {
    title: "Sequential Logic",
    shortSummary: "Sequential circuits have memory: output depends on current inputs and previous state.",
    whyItMakesSense: [
      "Q stores state and Q' is its complement.",
      "Latches are level-sensitive (Enable), flip-flops are edge-triggered (Clock).",
      "State tables and timing traces show how memory evolves over time."
    ],
    steps: [
      "Choose a latch or flip-flop type.",
      "Set inputs and optional async preset/clear.",
      "Apply step or clock pulse.",
      "Observe next state, history log, and waveform."
    ],
    example: "D flip-flop captures D only on rising clock edge.",
    commonMistakes: [
      "Expecting flip-flop output to change without a clock edge.",
      "Ignoring invalid async condition Preset=1 and Clear=1."
    ]
  },
  "sr-latch": {
    title: "SR Latch",
    shortSummary: "SR latch stores one bit with Set and Reset control lines.",
    whyItMakesSense: [
      "S=1,R=0 forces Q=1 (set).",
      "S=0,R=1 forces Q=0 (reset).",
      "S=0,R=0 holds last state.",
      "S=1,R=1 is forbidden for NOR-based SR latch."
    ],
    example: "If Q was 0 and inputs become S=1,R=0, next Q becomes 1.",
    commonMistakes: [
      "Using S=R=1 and expecting stable valid behavior."
    ]
  },
  "d-latch": {
    title: "D Latch",
    shortSummary: "D latch uses one data input and an enable line to avoid SR invalid combination.",
    whyItMakesSense: [
      "Enable=1 makes latch transparent: Q follows D.",
      "Enable=0 makes latch hold current state."
    ],
    example: "D=1, Enable=1 gives Q=1; then Enable=0 holds 1.",
    commonMistakes: [
      "Assuming it is edge-triggered like flip-flop; it is level-sensitive."
    ]
  },
  "d-flip-flop": {
    title: "D Flip-Flop",
    shortSummary: "D flip-flop samples D only at the active clock edge and stores it.",
    whyItMakesSense: [
      "Between edges, output holds state.",
      "At rising edge, Q takes the current D value."
    ],
    example: "If D=0 then rising edge occurs, Q becomes 0.",
    commonMistakes: [
      "Changing D without a clock edge and expecting Q to update."
    ]
  },
  "jk-flip-flop": {
    title: "JK Flip-Flop",
    shortSummary: "JK flip-flop generalizes SR behavior and uses J=K=1 as toggle.",
    whyItMakesSense: [
      "On rising edge: 00 hold, 10 set, 01 reset, 11 toggle.",
      "It removes SR's forbidden 11 case by defining a toggle action."
    ],
    example: "If Q=0 and J=K=1 at rising edge, Q toggles to 1.",
    commonMistakes: [
      "Forgetting JK decisions are applied only on the clock edge."
    ]
  },
  "t-flip-flop": {
    title: "T Flip-Flop",
    shortSummary: "T flip-flop toggles state when T=1 on a clock edge.",
    whyItMakesSense: [
      "T=0 means hold state.",
      "T=1 means invert stored state at rising edge."
    ],
    example: "Q sequence with repeated T=1 edges: 0,1,0,1,...",
    commonMistakes: [
      "Assuming toggle happens continuously while clock is high; it happens on edge."
    ]
  }
};

export function getExplanationContent(topic: ExplanationTopic): ExplanationContent {
  return explanationRegistry[topic];
}

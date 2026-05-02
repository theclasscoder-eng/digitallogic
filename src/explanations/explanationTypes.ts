export type ExplanationTopic =
  | "gates"
  | "expression-builder"
  | "truth-table"
  | "kmap"
  | "minimization"
  | "mux"
  | "rom"
  | "sequential"
  | "sr-latch"
  | "d-latch"
  | "d-flip-flop"
  | "jk-flip-flop"
  | "t-flip-flop";

export interface ExplanationContent {
  title: string;
  shortSummary: string;
  whyItMakesSense: string[];
  steps?: string[];
  example?: string;
  commonMistakes?: string[];
}

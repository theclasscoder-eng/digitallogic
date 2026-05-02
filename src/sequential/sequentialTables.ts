import type { SequentialComponentType, SequentialTableRow } from "./sequentialTypes";

const srTable: SequentialTableRow[] = [
  { inputs: { S: 0, R: 0 }, previousQ: "Q", nextQ: "Q", description: "Hold current state" },
  { inputs: { S: 1, R: 0 }, previousQ: "Q", nextQ: 1, description: "Set" },
  { inputs: { S: 0, R: 1 }, previousQ: "Q", nextQ: 0, description: "Reset" },
  { inputs: { S: 1, R: 1 }, previousQ: "Q", nextQ: "Q", description: "Invalid for NOR SR latch", invalid: true }
];

const gatedSrTable: SequentialTableRow[] = [
  { inputs: { Enable: 0, S: "X", R: "X" }, previousQ: "Q", nextQ: "Q", description: "Enable=0 hold" },
  { inputs: { Enable: 1, S: 0, R: 0 }, previousQ: "Q", nextQ: "Q", description: "Hold" },
  { inputs: { Enable: 1, S: 1, R: 0 }, previousQ: "Q", nextQ: 1, description: "Set" },
  { inputs: { Enable: 1, S: 0, R: 1 }, previousQ: "Q", nextQ: 0, description: "Reset" },
  { inputs: { Enable: 1, S: 1, R: 1 }, previousQ: "Q", nextQ: "Q", description: "Invalid", invalid: true }
];

const dLatchTable: SequentialTableRow[] = [
  { inputs: { Enable: 0, D: "X" }, previousQ: "Q", nextQ: "Q", description: "Hold" },
  { inputs: { Enable: 1, D: 0 }, previousQ: "Q", nextQ: 0, description: "Transparent: Q follows D" },
  { inputs: { Enable: 1, D: 1 }, previousQ: "Q", nextQ: 1, description: "Transparent: Q follows D" }
];

const dffTable: SequentialTableRow[] = [
  { inputs: { Clock: 0, D: "X" }, previousQ: "Q", nextQ: "Q", description: "No rising edge: hold" },
  { inputs: { Clock: 1, D: 0 }, previousQ: "Q", nextQ: 0, description: "On rising edge capture D=0" },
  { inputs: { Clock: 1, D: 1 }, previousQ: "Q", nextQ: 1, description: "On rising edge capture D=1" }
];

const jkTable: SequentialTableRow[] = [
  { inputs: { Clock: 1, J: 0, K: 0 }, previousQ: "Q", nextQ: "Q", description: "Hold" },
  { inputs: { Clock: 1, J: 1, K: 0 }, previousQ: "Q", nextQ: 1, description: "Set" },
  { inputs: { Clock: 1, J: 0, K: 1 }, previousQ: "Q", nextQ: 0, description: "Reset" },
  { inputs: { Clock: 1, J: 1, K: 1 }, previousQ: "Q", nextQ: "Q'", description: "Toggle" }
];

const tTable: SequentialTableRow[] = [
  { inputs: { Clock: 1, T: 0 }, previousQ: "Q", nextQ: "Q", description: "Hold" },
  { inputs: { Clock: 1, T: 1 }, previousQ: "Q", nextQ: "Q'", description: "Toggle" }
];

export function getSequentialTableRows(componentType: SequentialComponentType): SequentialTableRow[] {
  if (componentType === "SR_LATCH") {
    return srTable;
  }

  if (componentType === "GATED_SR_LATCH") {
    return gatedSrTable;
  }

  if (componentType === "D_LATCH") {
    return dLatchTable;
  }

  if (componentType === "D_FLIP_FLOP") {
    return dffTable;
  }

  if (componentType === "JK_FLIP_FLOP") {
    return jkTable;
  }

  return tTable;
}

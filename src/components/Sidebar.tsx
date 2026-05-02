import { useCircuitStore } from "../state/useCircuitStore";
import BriefDescriptionButton from "./common/BriefDescriptionButton";
import ScrollableSection from "./layout/ScrollableSection";
import type { GateType } from "../types/circuit";

const quickInputs = ["A", "B", "C", "D", "X1", "X2", "X3", "0", "1"];
const gates: GateType[] = ["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR"];

export default function Sidebar() {
  const addInput = useCircuitStore((state) => state.addInput);
  const addGate = useCircuitStore((state) => state.addGate);
  const addOutput = useCircuitStore((state) => state.addOutput);

  const handleCustomInput = () => {
    const label = window.prompt("Enter input name (e.g., P, Q, CLK):", "X");
    if (!label) {
      return;
    }

    const normalized = label.trim();
    if (!normalized) {
      return;
    }

    const isConstant = normalized === "0" || normalized === "1";
    addInput(normalized, isConstant);
  };

  const handleAddOutput = () => {
    const label = window.prompt("Output label:", "F")?.trim();
    if (!label) {
      return;
    }

    addOutput(label);
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-b border-slate-200/80 bg-white/90 p-4 backdrop-blur md:w-[280px] md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-600">Components</h2>
        <BriefDescriptionButton topic="gates" />
      </div>

      <div className="mt-4 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-3 overflow-hidden">
        <ScrollableSection title="Input Variables" className="min-h-0">
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 md:grid-cols-3">
              {quickInputs.map((label) => {
                const isConstant = label === "0" || label === "1";
                return (
                  <button
                    key={label}
                    type="button"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-2 py-2 text-sm font-bold text-slate-700 transition hover:border-cyan-400 hover:bg-cyan-50"
                    onClick={() => addInput(label, isConstant)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="w-full rounded-xl border border-cyan-400 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-100"
              onClick={handleCustomInput}
            >
              + Custom Input
            </button>
          </div>
        </ScrollableSection>

        <ScrollableSection title="Logic Gates" className="min-h-0">
          <div className="min-h-0">
            <div className="grid grid-cols-2 gap-2">
              {gates.map((gate) => (
                <button
                  key={gate}
                  type="button"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-amber-400 hover:bg-amber-50"
                  onClick={() => addGate(gate)}
                >
                  {gate}
                </button>
              ))}
            </div>
          </div>
        </ScrollableSection>

        <ScrollableSection title="Output" className="min-h-0">
          <button
            type="button"
            className="w-full rounded-xl border border-emerald-400 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            onClick={handleAddOutput}
          >
            + Add Output (F)
          </button>
        </ScrollableSection>

        <div className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
          Tip: Drag from blue output circles to amber input circles to wire your circuit.
        </div>
      </div>
    </aside>
  );
}

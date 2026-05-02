import { useMemo } from "react";
import { collectVariablesFromCircuit } from "../expression/variableUtils";
import { useCircuitStore } from "../state/useCircuitStore";

export default function ExpressionPanel() {
  const expressions = useCircuitStore((state) => state.expressions);
  const hasCycle = useCircuitStore((state) => state.simulation.hasCycle);
  const nodes = useCircuitStore((state) => state.nodes);
  const manualMinterms = useCircuitStore((state) => state.manualMinterms);
  const minimizationMethod = useCircuitStore((state) => state.minimizationMethod);
  const variables = useMemo(() => collectVariablesFromCircuit(nodes), [nodes]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">Boolean Expression</h2>
        {hasCycle ? (
          <span className="rounded bg-rose-100 px-2 py-1 text-[10px] font-bold uppercase text-rose-700">
            Loop Detected
          </span>
        ) : null}
      </div>

      {expressions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Create an output node and connect your circuit to see F.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {expressions.map((entry) => (
            <div key={entry.outputId} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm font-bold text-slate-700">
                {entry.label} = <span className="font-mono text-cyan-700">{entry.expression}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs font-semibold text-slate-600">
        Variables ({variables.length}): {variables.length > 0 ? variables.join(", ") : "none"}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-600">
        Minimization method:{" "}
        {minimizationMethod === "auto"
          ? "Auto"
          : minimizationMethod === "kmap"
            ? "K-map"
            : "Boolean Algebra"}
      </p>

      {manualMinterms.enabled && manualMinterms.minterms.length > 0 ? (
        <div className="mt-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800">
          <p>
            Source: {manualMinterms.sourceType} | Output: {manualMinterms.outputLabel}
          </p>
          <p>Minterms: Σm({manualMinterms.minterms.join(", ")})</p>
          {manualMinterms.canonicalSopExpression ? (
            <p className="mt-1 font-mono text-[11px] text-cyan-900">{manualMinterms.canonicalSopExpression}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

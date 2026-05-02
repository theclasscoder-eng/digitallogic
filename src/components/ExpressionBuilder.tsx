import { useMemo, useState } from "react";
import { useCircuitStore } from "../state/useCircuitStore";
import BriefDescriptionButton from "./common/BriefDescriptionButton";

const examples = [
  "F = AB",
  "F = A + B",
  "F = A'B + C",
  "F = (A + B)C",
  "F = A ^ B",
  "F = A'B + B'C + AE + AB'C'D'E"
];

export default function ExpressionBuilder() {
  const generateCircuitFromExpression = useCircuitStore((state) => state.generateCircuitFromExpression);
  const minimizeCurrentCircuit = useCircuitStore((state) => state.minimizeCurrentCircuit);
  const [expressionText, setExpressionText] = useState("F = A'B + B'C + AE + AB'C'D'E");
  const [replaceCurrent, setReplaceCurrent] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const helperText = useMemo(
    () =>
      replaceCurrent
        ? "Generated circuit will replace the current canvas."
        : "Generated circuit will be added to the current canvas.",
    [replaceCurrent]
  );

  const runGenerate = (forceReplace?: boolean) => {
    const shouldReplace = forceReplace ?? replaceCurrent;
    const result = generateCircuitFromExpression(expressionText, shouldReplace);

    if (!result.success) {
      setSuccessMessage(null);
      setErrorMessage(result.error ?? "Could not generate circuit.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(shouldReplace ? "Circuit replaced from expression." : "Circuit added from expression.");
  };

  const handleMinimize = () => {
    const result = minimizeCurrentCircuit();

    if (!result.supported) {
      setErrorMessage(result.reason ?? "Minimization is unavailable for this circuit.");
      setSuccessMessage(null);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(
      `Minimized (${result.methodUsed === "kmap" ? "K-map" : "Boolean Algebra"}): ${result.outputLabel ?? "F"} = ${result.minimizedExpression}`
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">Expression Builder</h2>
        <BriefDescriptionButton topic="expression-builder" />
      </div>

      <textarea
        value={expressionText}
        onChange={(event) => setExpressionText(event.target.value)}
        className="mt-3 h-28 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm text-slate-800 focus:border-cyan-500 focus:outline-none"
        placeholder="F = A'B + B'C"
      />

      <div className="mt-2 flex items-center gap-2">
        <input
          id="replace-current-circuit"
          type="checkbox"
          checked={replaceCurrent}
          onChange={(event) => setReplaceCurrent(event.target.checked)}
          className="h-4 w-4 accent-cyan-600"
        />
        <label htmlFor="replace-current-circuit" className="text-xs font-semibold text-slate-600">
          Replace current circuit
        </label>
      </div>

      <p className="mt-1 text-xs text-slate-500">{helperText}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-cyan-400 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-100"
          onClick={() => runGenerate()}
        >
          Generate Circuit
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-cyan-400"
          onClick={() => runGenerate(true)}
        >
          Clear and Generate
        </button>
        <button
          type="button"
          className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
          onClick={handleMinimize}
        >
          Minimize
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Examples</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              className="rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] text-slate-700 hover:border-cyan-400"
              onClick={() => setExpressionText(example)}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

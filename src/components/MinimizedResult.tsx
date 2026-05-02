import { useMemo, useState } from "react";
import { useCircuitStore } from "../state/useCircuitStore";
import BriefDescriptionButton from "./common/BriefDescriptionButton";

type MinimizedTab = "summary" | "kmap" | "algebra";

export default function MinimizedResult() {
  const minimizedResult = useCircuitStore((state) => state.minimizedResult);
  const generateMinimizedCircuit = useCircuitStore((state) => state.generateMinimizedCircuit);
  const clearMinimizationResult = useCircuitStore((state) => state.clearMinimizationResult);
  const [activeTab, setActiveTab] = useState<MinimizedTab>("summary");

  const expressionLine = useMemo(() => {
    if (!minimizedResult) {
      return "";
    }

    const label = minimizedResult.outputLabel ?? "F";
    return `${label} = ${minimizedResult.minimizedExpression}`;
  }, [minimizedResult]);

  const methodLabel = useMemo(() => {
    if (!minimizedResult) {
      return "";
    }

    return minimizedResult.methodUsed === "kmap" ? "K-map" : "Boolean Algebra";
  }, [minimizedResult]);

  if (!minimizedResult) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">Minimized Result</h2>
          <BriefDescriptionButton topic="minimization" />
        </div>
        <p className="mt-3 text-sm text-slate-500">Click Minimize to analyze and simplify the current circuit.</p>
      </section>
    );
  }

  const handleGenerate = (replaceCurrent: boolean) => {
    const result = generateMinimizedCircuit(replaceCurrent);

    if (!result.success) {
      window.alert(result.error ?? "Could not generate minimized circuit.");
      return;
    }

    window.alert(replaceCurrent ? "Current circuit replaced with minimized version." : "Minimized circuit added.");
  };

  const handleCopy = async () => {
    if (!expressionLine) {
      return;
    }

    try {
      await navigator.clipboard.writeText(expressionLine);
      window.alert("Minimized expression copied.");
    } catch {
      window.alert("Clipboard is unavailable.");
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">Minimized Result</h2>
        <div className="flex items-center gap-2">
          <BriefDescriptionButton topic="minimization" />
          <button
            type="button"
            className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-cyan-400"
            onClick={clearMinimizationResult}
          >
            Clear
          </button>
        </div>
      </div>

      {!minimizedResult.supported ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {minimizedResult.reason ?? "Minimization is unavailable for the current circuit."}
        </p>
      ) : (
        <>
          <div className="mt-3 inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1">
            <button
              type="button"
              className={`rounded-md px-3 py-1 text-xs font-bold ${
                activeTab === "summary" ? "bg-white text-slate-800 shadow" : "text-slate-600"
              }`}
              onClick={() => setActiveTab("summary")}
            >
              Summary
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1 text-xs font-bold ${
                activeTab === "kmap" ? "bg-white text-slate-800 shadow" : "text-slate-600"
              }`}
              onClick={() => setActiveTab("kmap")}
            >
              K-map Steps
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1 text-xs font-bold ${
                activeTab === "algebra" ? "bg-white text-slate-800 shadow" : "text-slate-600"
              }`}
              onClick={() => setActiveTab("algebra")}
            >
              Algebra Steps
            </button>
          </div>

          {activeTab === "summary" ? (
            <div className="mt-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Original Expression</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-700">{minimizedResult.originalExpression}</p>
              </div>

              <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Minimized Expression</p>
                <p className="mt-1 font-mono text-sm font-bold text-emerald-800">{expressionLine}</p>
              </div>

              <p className="mt-2 text-xs font-semibold text-slate-600">
                Minterms: {minimizedResult.minterms.length > 0 ? `Σm(${minimizedResult.minterms.join(", ")})` : "Σm()"}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600">Variable count: {minimizedResult.variableCount}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">Method used: {methodLabel}</p>

              {minimizedResult.isAlreadyMinimal ? (
                <p className="mt-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
                  This expression is already minimal based on the selected minimization method.
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-cyan-400 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-100"
                  onClick={() => handleGenerate(false)}
                >
                  Generate Minimized Circuit
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-cyan-400"
                  onClick={() => handleGenerate(true)}
                >
                  Replace Current Circuit
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-400"
                  onClick={handleCopy}
                >
                  Copy Expression
                </button>
              </div>
            </div>
          ) : null}

          {activeTab === "kmap" ? (
            <div className="mt-3">
              {minimizedResult.methodUsed !== "kmap" ? (
                <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  K-map was not used for this minimization.
                </p>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Groups</p>
                {minimizedResult.groups.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No K-map groups were required for this result.</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {minimizedResult.groups.map((group) => (
                      <li key={group.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="font-semibold text-slate-800">
                          {group.id}: term {group.productTerm}
                        </p>
                        <p className="text-xs text-slate-600">Minterms: {group.minterms.join(", ")} | Size: {group.size}</p>
                        <p className="text-xs text-slate-600">
                          Constants: {group.constantVariables.length > 0 ? group.constantVariables.join(", ") : "none"}
                        </p>
                        <p className="text-xs text-slate-600">
                          Eliminated: {group.eliminatedVariables.length > 0 ? group.eliminatedVariables.join(", ") : "none"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">K-map Explanation</p>
                {minimizedResult.kmapSteps.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No K-map steps were generated.</p>
                ) : (
                  <ol className="mt-2 space-y-2 text-sm text-slate-700">
                    {minimizedResult.kmapSteps.map((step, index) => (
                      <li key={`${step.title}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="font-semibold text-slate-800">
                          {index + 1}. {step.title}
                        </p>
                        {step.ruleName ? <p className="text-xs font-semibold text-cyan-700">Rule: {step.ruleName}</p> : null}
                        <p className="mt-1 text-xs text-slate-600">{step.explanation}</p>
                        {step.before || step.after ? (
                          <p className="mt-1 font-mono text-xs text-slate-600">
                            {step.before ? `Before: ${step.before}` : ""}
                            {step.before && step.after ? " | " : ""}
                            {step.after ? `After: ${step.after}` : ""}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "algebra" ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Boolean Algebra Equation Steps</p>
              {minimizedResult.algebraSteps.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No Boolean algebra steps were generated.</p>
              ) : (
                <ol className="mt-2 space-y-2 text-sm text-slate-700">
                  {minimizedResult.algebraSteps.map((step) => (
                    <li key={`${step.stepNumber}-${step.title}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="font-semibold text-slate-800">
                        Step {step.stepNumber}: {step.title}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-600">{step.beforeExpression}</p>
                      <p className="mt-1 font-mono text-xs font-semibold text-slate-700">{step.afterExpression}</p>
                      <p className="mt-2 text-xs font-semibold text-cyan-700">Rule: {step.ruleName}</p>
                      <p className="text-xs font-mono text-slate-600">{step.ruleFormula}</p>
                      <p className="mt-1 text-xs text-slate-600">{step.explanation}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

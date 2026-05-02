import { useState } from "react";
import { useCircuitStore } from "../state/useCircuitStore";
import type { MinimizationMethod } from "../minimize/minimizationMethod";

function methodLabel(method: MinimizationMethod): string {
  if (method === "kmap") {
    return "K-map";
  }

  if (method === "boolean-algebra") {
    return "Boolean Algebra";
  }

  return "Auto";
}

export default function MintermInput() {
  const manualMinterms = useCircuitStore((state) => state.manualMinterms);
  const minimizationMethod = useCircuitStore((state) => state.minimizationMethod);
  const setMinimizationMethod = useCircuitStore((state) => state.setMinimizationMethod);
  const setManualMintermRawInput = useCircuitStore((state) => state.setManualMintermRawInput);
  const setManualMintermVariableCount = useCircuitStore((state) => state.setManualMintermVariableCount);
  const generateFromInput = useCircuitStore((state) => state.generateFromInput);
  const generateKMapFromInput = useCircuitStore((state) => state.generateKMapFromInput);
  const generateCircuitFromInput = useCircuitStore((state) => state.generateCircuitFromInput);
  const addManualMinterm = useCircuitStore((state) => state.addManualMinterm);
  const clearManualMinterms = useCircuitStore((state) => state.clearManualMinterms);
  const minimizeCurrentCircuit = useCircuitStore((state) => state.minimizeCurrentCircuit);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleGenerateFromInput = () => {
    const result = generateFromInput();
    setStatusMessage(result.success ? "Generated from input." : result.error ?? "Could not parse input.");
  };

  const handleGenerateKMap = () => {
    const result = generateKMapFromInput();
    setStatusMessage(result.success ? "K-map source updated from input." : result.error ?? "Could not parse input.");
  };

  const handleGenerateCircuit = () => {
    const result = generateCircuitFromInput(true);
    setStatusMessage(result.success ? "Circuit generated from input." : result.error ?? "Could not generate circuit.");
  };

  const handleMinimize = () => {
    const result = minimizeCurrentCircuit();
    setStatusMessage(
      result.supported
        ? `Minimized with ${result.methodUsed === "kmap" ? "K-map" : "Boolean Algebra"}.`
        : result.reason ?? "Minimization unavailable."
    );
  };

  const handleAdd = () => {
    const raw = window.prompt("Enter a minterm value to add:");
    if (raw === null) {
      return;
    }

    const parsed = Number.parseInt(raw.trim(), 10);
    if (!Number.isInteger(parsed)) {
      setStatusMessage("Please enter an integer minterm value.");
      return;
    }

    const result = addManualMinterm(parsed);
    setStatusMessage(result.success ? `Added minterm ${parsed}.` : result.error ?? "Could not add minterm.");
  };

  return (
    <section className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="manual-minterms-input" className="text-xs font-bold uppercase tracking-wide text-slate-600">
          Expression or Minterm Function
        </label>
        {manualMinterms.enabled ? (
          <span className="rounded bg-cyan-100 px-2 py-1 text-[10px] font-bold uppercase text-cyan-800">
            {manualMinterms.sourceType}
          </span>
        ) : null}
      </div>

      <textarea
        id="manual-minterms-input"
        value={manualMinterms.rawInput}
        onChange={(event) => {
          setStatusMessage(null);
          setManualMintermRawInput(event.target.value);
        }}
        placeholder="f(a, b, c, d) = Σm(2, 3, 8, 9, 14, 15)"
        className="mt-2 h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-800 focus:border-cyan-500 focus:outline-none"
      />

      <div className="mt-2 flex items-center gap-2">
        <label htmlFor="manual-minterm-var-count" className="text-xs font-semibold text-slate-600">
          Variables
        </label>
        <select
          id="manual-minterm-var-count"
          value={manualMinterms.variableCount}
          onChange={(event) => setManualMintermVariableCount(Number.parseInt(event.target.value, 10))}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:border-cyan-500 focus:outline-none"
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5+</option>
        </select>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label htmlFor="minimization-method" className="text-xs font-semibold text-slate-600">
          Minimization Method
        </label>
        <select
          id="minimization-method"
          value={minimizationMethod}
          onChange={(event) => setMinimizationMethod(event.target.value as MinimizationMethod)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:border-cyan-500 focus:outline-none"
        >
          <option value="auto">Auto</option>
          <option value="kmap">K-map</option>
          <option value="boolean-algebra">Boolean Algebra</option>
        </select>
        <span className="rounded bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-slate-700">
          {methodLabel(minimizationMethod)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-cyan-400 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
          onClick={handleGenerateFromInput}
        >
          Generate From Input
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-cyan-400"
          onClick={handleGenerateKMap}
        >
          Generate K-map
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-cyan-400"
          onClick={handleGenerateCircuit}
        >
          Generate Circuit
        </button>
        <button
          type="button"
          className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
          onClick={handleMinimize}
        >
          Minimize
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-cyan-400"
          onClick={handleAdd}
        >
          Add Minterm
        </button>
        <button
          type="button"
          className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:border-rose-400"
          onClick={() => {
            clearManualMinterms();
            setStatusMessage("Manual minterms cleared.");
          }}
        >
          Clear Minterms
        </button>
      </div>

      {manualMinterms.error ? (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {manualMinterms.error}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
          {statusMessage}
        </p>
      ) : null}

      {manualMinterms.enabled ? (
        <div className="mt-2 space-y-1 text-xs font-semibold text-slate-600">
          <p>
            Output: {manualMinterms.outputLabel} | Variables ({manualMinterms.variableCount}):{" "}
            {manualMinterms.variables.join(", ")}
          </p>
          <p>Minterms: {manualMinterms.minterms.length > 0 ? `Σm(${manualMinterms.minterms.join(", ")})` : "Σm()"}</p>
          {manualMinterms.dontCares.length > 0 ? <p>Don't-cares: d({manualMinterms.dontCares.join(", ")})</p> : null}
          {manualMinterms.canonicalSopExpression ? (
            <p className="font-mono text-[11px] text-slate-700">{manualMinterms.canonicalSopExpression}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

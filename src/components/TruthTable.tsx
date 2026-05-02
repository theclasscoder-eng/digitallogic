import { useState } from "react";
import { useCircuitStore } from "../state/useCircuitStore";
import BriefDescriptionButton from "./common/BriefDescriptionButton";
import KMap from "./KMap";
import MintermInput from "./MintermInput";

type TableTab = "truth" | "kmap";

export default function TruthTable() {
  const truthTable = useCircuitStore((state) => state.truthTable);
  const [activeTab, setActiveTab] = useState<TableTab>("truth");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">Analysis</h2>
          <BriefDescriptionButton topic="truth-table" />
        </div>
        <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1">
          <button
            type="button"
            className={`rounded-md px-3 py-1 text-xs font-bold ${
              activeTab === "truth" ? "bg-white text-slate-800 shadow" : "text-slate-600"
            }`}
            onClick={() => setActiveTab("truth")}
          >
            Truth Table
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1 text-xs font-bold ${
              activeTab === "kmap" ? "bg-white text-slate-800 shadow" : "text-slate-600"
            }`}
            onClick={() => setActiveTab("kmap")}
          >
            K-map
          </button>
        </div>
      </div>

      {activeTab === "truth" ? (
        <TruthTableGrid />
      ) : (
        <KMap />
      )}

      <MintermInput />

      {activeTab === "truth" && truthTable.tooManyVariables ? (
        <p className="mt-3 text-sm text-amber-700">
          Too many variables for table generation. Limit is {truthTable.variableLimit} input variables.
        </p>
      ) : null}
    </section>
  );
}

function TruthTableGrid() {
  const truthTable = useCircuitStore((state) => state.truthTable);

  if (truthTable.columns.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">Add input and output nodes to generate a truth table.</p>;
  }

  if (truthTable.tooManyVariables) {
    return null;
  }

  return (
    <div className="mt-3 max-h-[260px] overflow-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-slate-100">
          <tr>
            {truthTable.columns.map((column) => (
              <th
                key={column.id}
                className="border-b border-slate-200 px-3 py-2 text-left font-bold text-slate-700"
              >
                <span className="mr-1">{column.label}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    column.kind === "input" ? "bg-cyan-100 text-cyan-800" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {column.kind === "input" ? "IN" : "OUT"}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {truthTable.rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="odd:bg-white even:bg-slate-50">
              {truthTable.columns.map((column) => (
                <td key={column.id} className="border-b border-slate-100 px-3 py-1.5 font-mono text-slate-700">
                  {row[column.id] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

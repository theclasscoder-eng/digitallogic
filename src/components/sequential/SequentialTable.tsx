import { getSequentialTableRows } from "../../sequential/sequentialTables";
import type { SequentialComponentType, SequentialStep, SequentialTableRow } from "../../sequential/sequentialTypes";

interface SequentialTableProps {
  componentType: SequentialComponentType;
  history: SequentialStep[];
}

function formatInputs(row: SequentialTableRow): string {
  return Object.entries(row.inputs)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
}

export default function SequentialTable({ componentType, history }: SequentialTableProps) {
  const rows = getSequentialTableRows(componentType);

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Characteristic / State Table</h3>
        <div className="mt-2 max-h-52 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100">
              <tr>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">Inputs</th>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">Prev Q</th>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">Next Q</th>
                <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`row-${idx}`} className={`odd:bg-white even:bg-slate-50 ${row.invalid ? "bg-rose-50" : ""}`}>
                  <td className="border-b border-slate-100 px-2 py-1.5 font-mono text-slate-700">{formatInputs(row)}</td>
                  <td className="border-b border-slate-100 px-2 py-1.5 font-mono text-slate-700">{row.previousQ}</td>
                  <td className="border-b border-slate-100 px-2 py-1.5 font-mono text-slate-700">{row.nextQ}</td>
                  <td className="border-b border-slate-100 px-2 py-1.5 text-slate-700">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Timing / History Log</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Apply inputs to start the sequential history.</p>
        ) : (
          <div className="mt-2 max-h-52 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100">
                <tr>
                  <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">Step</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">Inputs</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">Q</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">Triggered</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">Warning</th>
                </tr>
              </thead>
              <tbody>
                {history.map((step) => {
                  const inputText = Object.entries(step.inputs)
                    .map(([key, value]) => `${key}=${value}`)
                    .join(" ");
                  return (
                    <tr key={`history-${step.index}`} className="odd:bg-white even:bg-slate-50">
                      <td className="border-b border-slate-100 px-2 py-1.5 font-mono text-slate-700">{step.index}</td>
                      <td className="border-b border-slate-100 px-2 py-1.5 font-mono text-slate-700">{inputText}</td>
                      <td className="border-b border-slate-100 px-2 py-1.5 font-mono text-slate-700">
                        {step.previousQ} ? {step.nextQ}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1.5 text-slate-700">{step.triggered ? "Yes" : "No"}</td>
                      <td className="border-b border-slate-100 px-2 py-1.5 text-rose-700">{step.warning ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

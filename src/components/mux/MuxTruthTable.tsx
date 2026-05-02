import type { MuxConfig, MuxTruthRow } from "../../mux/muxTypes";

interface MuxTruthTableProps {
  config: MuxConfig;
  rows: MuxTruthRow[];
}

export default function MuxTruthTable({ config, rows }: MuxTruthTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Generate a MUX truth table to view results.</p>;
  }

  const variableColumns = config.variables;

  return (
    <div className="overflow-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-slate-100">
          <tr>
            {variableColumns.map((variable) => (
              <th key={variable} className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">
                {variable}
              </th>
            ))}
            <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">Selected D</th>
            <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">D Value</th>
            <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">
              {config.outputLabel || "F"}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`mux-row-${idx}`} className="odd:bg-white even:bg-slate-50">
              {variableColumns.map((variable) => (
                <td key={`${idx}-${variable}`} className="border-b border-slate-100 px-2 py-1.5 font-mono text-slate-700">
                  {row.values[variable] ?? 0}
                </td>
              ))}
              <td className="border-b border-slate-100 px-2 py-1.5 font-mono text-slate-700">D{row.selectedInputIndex}</td>
              <td className="border-b border-slate-100 px-2 py-1.5 font-mono text-cyan-700">{row.selectedInputValue}</td>
              <td
                className={`border-b border-slate-100 px-2 py-1.5 font-mono font-bold ${
                  row.output === 1 ? "text-emerald-700" : "text-slate-700"
                }`}
              >
                {row.output}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

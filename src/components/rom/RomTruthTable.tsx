import type { RomConfig, RomTruthRow } from "../../rom/romTypes";

interface RomTruthTableProps {
  config: RomConfig;
  rows: RomTruthRow[];
}

export default function RomTruthTable({ config, rows }: RomTruthTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Generate the ROM table to view address and output words.</p>;
  }

  const outputLabels = config.outputs.map((output, index) => output.label.trim() || `Y${index}`);

  return (
    <div className="overflow-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-slate-100">
          <tr>
            <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">Address</th>
            {config.inputVariables.map((variable) => (
              <th key={variable} className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">
                {variable}
              </th>
            ))}
            {outputLabels.map((label) => (
              <th key={label} className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">
                {label}
              </th>
            ))}
            <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">Data Word</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`rom-row-${row.address}`} className="odd:bg-white even:bg-slate-50">
              <td className="border-b border-slate-100 px-2 py-1.5 font-mono text-slate-700">{row.addressBits}</td>
              {config.inputVariables.map((variable) => (
                <td key={`${row.address}-${variable}`} className="border-b border-slate-100 px-2 py-1.5 font-mono text-slate-700">
                  {row.inputs[variable] ?? 0}
                </td>
              ))}
              {outputLabels.map((label) => (
                <td
                  key={`${row.address}-${label}`}
                  className={`border-b border-slate-100 px-2 py-1.5 font-mono font-bold ${
                    (row.outputs[label] ?? 0) === 1 ? "text-emerald-700" : "text-slate-700"
                  }`}
                >
                  {row.outputs[label] ?? 0}
                </td>
              ))}
              <td className="border-b border-slate-100 px-2 py-1.5 font-mono text-cyan-700">{row.dataWord}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

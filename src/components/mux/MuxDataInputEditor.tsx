import type { MuxDataInput } from "../../mux/muxTypes";

interface MuxDataInputEditorProps {
  dataInputs: MuxDataInput[];
  onChange: (next: MuxDataInput[]) => void;
}

export default function MuxDataInputEditor({ dataInputs, onChange }: MuxDataInputEditorProps) {
  const handleInputChange = (index: number, value: string) => {
    onChange(
      dataInputs.map((entry) =>
        entry.index === index
          ? {
              ...entry,
              value
            }
          : entry
      )
    );
  };

  return (
    <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-slate-100">
          <tr>
            <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">Data</th>
            <th className="border-b border-slate-200 px-2 py-2 text-left font-bold text-slate-700">Value / Expression</th>
          </tr>
        </thead>
        <tbody>
          {dataInputs.map((input) => (
            <tr key={input.index} className="odd:bg-white even:bg-slate-50">
              <td className="border-b border-slate-100 px-2 py-2 font-mono font-semibold text-slate-700">{input.label}</td>
              <td className="border-b border-slate-100 px-2 py-1.5">
                <input
                  value={input.value}
                  onChange={(event) => handleInputChange(input.index, event.target.value)}
                  placeholder="0, 1, X, X', A+B"
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-800 focus:border-cyan-500 focus:outline-none"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

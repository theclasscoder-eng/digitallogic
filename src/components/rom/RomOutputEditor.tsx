import type { RomOutputDefinition } from "../../rom/romTypes";

interface RomOutputEditorProps {
  outputs: RomOutputDefinition[];
  onChange: (outputs: RomOutputDefinition[]) => void;
}

export default function RomOutputEditor({ outputs, onChange }: RomOutputEditorProps) {
  const updateOutput = (index: number, patch: Partial<RomOutputDefinition>) => {
    onChange(
      outputs.map((output, outputIndex) =>
        outputIndex === index
          ? {
              ...output,
              ...patch
            }
          : output
      )
    );
  };

  const removeOutput = (index: number) => {
    if (outputs.length <= 1) {
      return;
    }

    onChange(outputs.filter((_, outputIndex) => outputIndex !== index));
  };

  return (
    <div className="space-y-2">
      {outputs.map((output, index) => (
        <div key={`${output.label}-${index}`} className="rounded-lg border border-slate-200 bg-white p-2">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[90px_minmax(0,1fr)]">
            <label className="text-xs font-semibold text-slate-600">Label</label>
            <input
              value={output.label}
              onChange={(event) => updateOutput(index, { label: event.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm font-semibold text-slate-700 focus:border-cyan-500 focus:outline-none"
              placeholder={`Y${index}`}
            />

            <label className="text-xs font-semibold text-slate-600">Expression</label>
            <input
              value={output.expression ?? ""}
              onChange={(event) => updateOutput(index, { expression: event.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1 font-mono text-sm text-slate-700 focus:border-cyan-500 focus:outline-none"
              placeholder="A'B + C"
            />

            <label className="text-xs font-semibold text-slate-600">Truth Bits</label>
            <input
              value={output.truthBits ?? ""}
              onChange={(event) => updateOutput(index, { truthBits: event.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1 font-mono text-sm text-slate-700 focus:border-cyan-500 focus:outline-none"
              placeholder="Optional: 01101001"
            />
          </div>

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="rounded-md border border-rose-300 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700 hover:border-rose-400"
              onClick={() => removeOutput(index)}
              disabled={outputs.length <= 1}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

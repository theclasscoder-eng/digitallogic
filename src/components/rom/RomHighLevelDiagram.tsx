import type { RomConfig, RomRealization } from "../../rom/romTypes";

interface RomHighLevelDiagramProps {
  config: RomConfig;
  realization: RomRealization | null;
}

export default function RomHighLevelDiagram({ config, realization }: RomHighLevelDiagramProps) {
  const inputVariables = config.inputVariables;
  const outputLabels = config.outputs.map((output, idx) => output.label.trim() || `Y${idx}`);

  const height = Math.max(280, inputVariables.length * 42 + outputLabels.length * 34 + 80);
  const width = 900;
  const inputSpacingDenominator = Math.max(1, inputVariables.length - 1);
  const outputSpacingDenominator = Math.max(1, outputLabels.length - 1);

  const sizeLabel = realization?.sizeLabel ?? `${2 ** inputVariables.length} x ${outputLabels.length}`;

  return (
    <div id="rom-high-level-diagram" className="overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[760px] w-full">
        <defs>
          <marker id="rom-arrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L10,4 L0,8 z" fill="#0f172a" />
          </marker>
        </defs>

        <rect x={320} y={40} width={280} height={height - 80} rx={18} fill="#f8fafc" stroke="#1e293b" strokeWidth={2.4} />
        <text x={460} y={height / 2 - 20} textAnchor="middle" className="fill-slate-800 text-[30px] font-extrabold">
          ROM
        </text>
        <text x={460} y={height / 2 + 14} textAnchor="middle" className="fill-slate-600 text-[15px] font-semibold">
          {sizeLabel}
        </text>
        <text x={460} y={height / 2 + 38} textAnchor="middle" className="fill-slate-500 text-[12px] font-semibold">
          Address lines: {inputVariables.length} | Data lines: {outputLabels.length}
        </text>

        {inputVariables.map((variable, index) => {
          const y = 80 + index * ((height - 160) / inputSpacingDenominator);
          return (
            <g key={`in-${variable}`}>
              <line x1={60} y1={y} x2={320} y2={y} stroke="#334155" strokeWidth={1.8} markerEnd="url(#rom-arrow)" />
              <text x={16} y={y + 4} className="fill-slate-700 text-[12px] font-bold">
                {variable}
              </text>
            </g>
          );
        })}

        {outputLabels.map((label, index) => {
          const y = 80 + index * ((height - 160) / outputSpacingDenominator);
          return (
            <g key={`out-${label}`}>
              <line x1={600} y1={y} x2={840} y2={y} stroke="#334155" strokeWidth={1.8} markerEnd="url(#rom-arrow)" />
              <text x={850} y={y + 4} className="fill-emerald-700 text-[12px] font-bold">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

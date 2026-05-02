import type { RomRealization } from "../../rom/romTypes";

interface RomLowLevelDiagramProps {
  realization: RomRealization | null;
}

function sigmaLabel(minterms: number[]): string {
  return minterms.length > 0 ? `Sm(${minterms.join(",")})` : "Sm()";
}

export default function RomLowLevelDiagram({ realization }: RomLowLevelDiagramProps) {
  if (!realization) {
    return <p className="text-sm text-slate-500">Generate ROM realization to see decoder + OR structure.</p>;
  }

  const outputs = Object.keys(realization.outputMinterms);
  const addressCount = realization.addressCount;
  const height = Math.max(340, addressCount * 26 + outputs.length * 44 + 120);
  const width = 980;
  const outputSpacingDenominator = Math.max(1, outputs.length - 1);

  const mintermY = (index: number): number => 60 + index * 24;
  const outputY = (index: number): number => 80 + index * ((height - 180) / outputSpacingDenominator);

  return (
    <div id="rom-low-level-diagram" className="overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[820px] w-full">
        <defs>
          <marker id="rom-low-arrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L10,4 L0,8 z" fill="#0f172a" />
          </marker>
        </defs>

        <rect x={40} y={40} width={180} height={height - 80} rx={12} fill="#f8fafc" stroke="#1e293b" strokeWidth={2} />
        <text x={130} y={height / 2 - 12} textAnchor="middle" className="fill-slate-800 text-[18px] font-bold">
          Decoder
        </text>
        <text x={130} y={height / 2 + 16} textAnchor="middle" className="fill-slate-600 text-[12px] font-semibold">
          {realization.addressLineCount}-to-{realization.addressCount}
        </text>

        {Array.from({ length: addressCount }, (_, index) => (
          <g key={`m-${index}`}>
            <line x1={220} y1={mintermY(index)} x2={680} y2={mintermY(index)} stroke="#cbd5e1" strokeWidth={1.2} />
            <text x={228} y={mintermY(index) - 3} className="fill-slate-500 text-[10px] font-mono">
              m{index}
            </text>
          </g>
        ))}

        {outputs.map((output, outputIndex) => {
          const gateY = outputY(outputIndex);
          const minterms = realization.outputMinterms[output] ?? [];

          return (
            <g key={`out-${output}`}>
              <ellipse cx={760} cy={gateY} rx={38} ry={22} fill="#ecfeff" stroke="#0f172a" strokeWidth={1.8} />
              <text x={760} y={gateY + 4} textAnchor="middle" className="fill-slate-800 text-[11px] font-bold">
                OR
              </text>

              {minterms.map((minterm) => (
                <polyline
                  key={`${output}-${minterm}`}
                  points={`680,${mintermY(minterm)} 715,${mintermY(minterm)} 715,${gateY} 722,${gateY}`}
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth={1.4}
                />
              ))}

              <line x1={798} y1={gateY} x2={920} y2={gateY} stroke="#0f172a" strokeWidth={1.8} markerEnd="url(#rom-low-arrow)" />
              <text x={928} y={gateY + 4} className="fill-emerald-700 text-[12px] font-bold">
                {output}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-700">
        {Object.entries(realization.outputMinterms).map(([output, minterms]) => (
          <p key={`eq-${output}`} className="font-mono">
            {output} = {sigmaLabel(minterms)}
          </p>
        ))}
      </div>
    </div>
  );
}

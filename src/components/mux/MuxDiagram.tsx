import { useMemo } from "react";
import type { MuxConfig } from "../../mux/muxTypes";

interface MuxDiagramProps {
  config: MuxConfig;
}

function selectLineCount(size: number): number {
  return Math.log2(size);
}

export default function MuxDiagram({ config }: MuxDiagramProps) {
  const dataInputCount = config.size;
  const selectorCount = selectLineCount(config.size);

  const height = Math.max(260, dataInputCount * 28 + 80);
  const width = 900;

  const inputYPositions = useMemo(() => {
    const top = 40;
    const bottom = height - 40;
    const spacing = (bottom - top) / Math.max(1, dataInputCount - 1);
    return Array.from({ length: dataInputCount }, (_, idx) => top + idx * spacing);
  }, [dataInputCount, height]);

  const selectXPositions = useMemo(() => {
    const start = 430;
    const end = 560;
    if (selectorCount <= 1) {
      return [495];
    }

    const spacing = (end - start) / (selectorCount - 1);
    return Array.from({ length: selectorCount }, (_, idx) => start + idx * spacing);
  }, [selectorCount]);

  return (
    <div id="mux-diagram-root" className="overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[760px] w-full">
        <defs>
          <marker id="mux-arrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L10,4 L0,8 z" fill="#0f172a" />
          </marker>
        </defs>

        {inputYPositions.map((y, index) => {
          const input = config.dataInputs.find((entry) => entry.index === index);
          const value = input?.value?.trim() || "0";
          return (
            <g key={`din-${index}`}>
              <line x1={70} y1={y} x2={280} y2={y} stroke="#334155" strokeWidth={1.8} />
              <text x={20} y={y + 4} className="fill-slate-700 text-[12px] font-semibold">
                D{index}
              </text>
              <text x={86} y={y - 6} className="fill-cyan-700 text-[11px] font-mono">
                {value}
              </text>
            </g>
          );
        })}

        <polygon
          points={`280,24 620,64 620,${height - 64} 280,${height - 24}`}
          fill="#f8fafc"
          stroke="#1e293b"
          strokeWidth={2.2}
        />

        <text x={450} y={height / 2 - 14} textAnchor="middle" className="fill-slate-800 text-[22px] font-extrabold">
          {config.size}:1 MUX
        </text>
        <text x={450} y={height / 2 + 16} textAnchor="middle" className="fill-slate-600 text-[13px] font-semibold">
          Output: {config.outputLabel || "F"}
        </text>

        <line
          x1={620}
          y1={height / 2}
          x2={820}
          y2={height / 2}
          stroke="#0f172a"
          strokeWidth={2.4}
          markerEnd="url(#mux-arrow)"
        />
        <circle cx={620} cy={height / 2} r={5} fill="#0f172a" />
        <text x={832} y={height / 2 + 4} className="fill-emerald-700 text-[14px] font-bold">
          {config.outputLabel || "F"}
        </text>

        {selectXPositions.map((x, idx) => {
          const variable = config.selectVariables[idx] || `S${idx}`;
          return (
            <g key={`sel-${idx}`}>
              <line x1={x} y1={height + 2} x2={x} y2={height - 34} stroke="#334155" strokeWidth={1.8} />
              <text x={x - 12} y={height - 42} className="fill-slate-700 text-[11px] font-semibold">
                S{idx}
              </text>
              <text x={x - 14} y={height + 18} className="fill-cyan-700 text-[11px] font-mono">
                {variable}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

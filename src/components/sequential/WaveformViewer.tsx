import { useMemo } from "react";
import { buildWaveformTraces } from "../../sequential/waveformUtils";
import type { SequentialStep } from "../../sequential/sequentialTypes";

interface WaveformViewerProps {
  history: SequentialStep[];
}

export default function WaveformViewer({ history }: WaveformViewerProps) {
  const traces = useMemo(() => buildWaveformTraces(history), [history]);

  if (traces.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Waveform</h3>
        <p className="mt-2 text-sm text-slate-500">Run steps to populate the waveform timeline.</p>
      </section>
    );
  }

  const stepCount = history.length;
  const rowHeight = 34;
  const traceHeight = rowHeight * traces.length + 40;
  const width = Math.max(760, 80 + stepCount * 52);
  const leftPad = 84;
  const stepWidth = 48;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Waveform</h3>
      <div className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-slate-50">
        <svg viewBox={`0 0 ${width} ${traceHeight}`} className="h-auto min-w-[760px] w-full">
          {traces.map((trace, traceIndex) => {
            const baseY = 28 + traceIndex * rowHeight;
            const highY = baseY - 10;
            const lowY = baseY + 8;

            const points: string[] = [];
            trace.values.forEach((value, valueIndex) => {
              const xStart = leftPad + valueIndex * stepWidth;
              const xEnd = xStart + stepWidth;
              const y = value === 1 ? highY : lowY;

              if (valueIndex === 0) {
                points.push(`${xStart},${y}`);
              } else {
                const previousValue = trace.values[valueIndex - 1];
                const previousY = previousValue === 1 ? highY : lowY;
                points.push(`${xStart},${previousY}`);
                points.push(`${xStart},${y}`);
              }

              points.push(`${xEnd},${y}`);
            });

            return (
              <g key={trace.name}>
                <text x={8} y={baseY + 2} className="fill-slate-700 text-[11px] font-bold">
                  {trace.name}
                </text>
                <line x1={leftPad} y1={baseY} x2={width - 12} y2={baseY} stroke="#cbd5e1" strokeWidth={1} />
                <polyline
                  points={points.join(" ")}
                  fill="none"
                  stroke={trace.name === "Q" ? "#059669" : trace.name === "Q'" ? "#0891b2" : "#334155"}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {Array.from({ length: stepCount }, (_, idx) => {
            const x = leftPad + idx * stepWidth;
            return (
              <g key={`tick-${idx}`}>
                <line x1={x} y1={10} x2={x} y2={traceHeight - 10} stroke="#e2e8f0" strokeWidth={1} />
                <text x={x + 4} y={14} className="fill-slate-500 text-[10px] font-mono">
                  {idx + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

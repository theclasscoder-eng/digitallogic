import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useCircuitStore } from "../state/useCircuitStore";
import type { OutputVisualData } from "../types/circuit";

type OutputFlowNode = Node<OutputVisualData, "outputNode">;

export default function OutputNode({ id, data, selected }: NodeProps<OutputFlowNode>) {
  const outputValue = useCircuitStore((state) => state.simulation.outputValues[id] ?? 0);

  return (
    <div
      className={`relative min-w-[130px] rounded-2xl border bg-white/95 px-4 py-3 shadow-soft transition ${
        selected ? "border-cyan-500" : "border-slate-200"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wide text-slate-500">Output</p>
      <p className="text-2xl font-black leading-none text-slate-900">{data.label}</p>
      <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1">
        <span className="text-xs font-semibold text-slate-500">Value</span>
        <span
          className={`text-lg font-black ${outputValue === 1 ? "text-emerald-700" : "text-slate-700"}`}
        >
          {outputValue}
        </span>
      </div>

      <Handle
        id="in"
        type="target"
        position={Position.Left}
        className="!h-4 !w-4 !border-2 !border-white !bg-amber-500"
        style={{ left: -9, top: "50%" }}
      />
    </div>
  );
}

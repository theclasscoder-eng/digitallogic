import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useCircuitStore } from "../state/useCircuitStore";
import type { InputNodeData } from "../types/circuit";

type InputFlowNode = Node<InputNodeData, "inputNode">;

export default function InputNode({ id, data, selected }: NodeProps<InputFlowNode>) {
  const toggleInputValue = useCircuitStore((state) => state.toggleInputValue);

  return (
    <div
      className={`relative min-w-[130px] rounded-2xl border bg-white/95 px-3 py-3 text-slate-800 shadow-soft transition ${
        selected ? "border-cyan-500" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Input</p>
          <p className="text-lg font-bold leading-none">{data.label}</p>
        </div>
        {data.isConstant ? (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
            CONST
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">Signal</span>
        <button
          type="button"
          className={`nodrag rounded-lg border px-3 py-1 text-sm font-bold transition ${
            data.value === 1
              ? "border-emerald-600 bg-emerald-100 text-emerald-800"
              : "border-slate-300 bg-slate-100 text-slate-700"
          } ${data.isConstant ? "cursor-not-allowed opacity-80" : "hover:border-cyan-400"}`}
          disabled={data.isConstant}
          onClick={() => toggleInputValue(id)}
          title={data.isConstant ? "Constants cannot be toggled" : "Toggle between 0 and 1"}
        >
          {data.value}
        </button>
      </div>

      <Handle
        id="output-0"
        type="source"
        position={Position.Right}
        className="!h-4 !w-4 !border-2 !border-white !bg-cyan-500"
        style={{ right: -9, top: "50%" }}
      />
    </div>
  );
}

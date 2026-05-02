import { useEffect, useMemo, useState } from "react";
import { useCircuitStore } from "../state/useCircuitStore";
import type { GateVisualData, InputNodeData, OutputVisualData } from "../types/circuit";

export default function PropertiesPanel() {
  const selectedNodeId = useCircuitStore((state) => state.selectedNodeId);
  const nodes = useCircuitStore((state) => state.nodes);
  const updateNodeLabel = useCircuitStore((state) => state.updateNodeLabel);
  const setInputValue = useCircuitStore((state) => state.setInputValue);
  const setGateInputCount = useCircuitStore((state) => state.setGateInputCount);
  const removeSelectedNode = useCircuitStore((state) => state.removeSelectedNode);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const [labelDraft, setLabelDraft] = useState("");

  useEffect(() => {
    setLabelDraft(selectedNode?.data.label ?? "");
  }, [selectedNode?.id, selectedNode?.data.label]);

  const applyLabel = () => {
    if (!selectedNode) {
      return;
    }

    if (labelDraft.trim() && labelDraft.trim() !== selectedNode.data.label) {
      updateNodeLabel(selectedNode.id, labelDraft.trim());
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">Properties</h2>

      {!selectedNode ? (
        <p className="mt-3 text-sm text-slate-500">Select a node to edit label and settings.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Label
            </label>
            <div className="flex items-center gap-2">
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-cyan-500 focus:outline-none"
                value={labelDraft}
                onChange={(event) => setLabelDraft(event.target.value)}
                onBlur={applyLabel}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyLabel();
                  }
                }}
              />
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-cyan-400"
                onClick={applyLabel}
              >
                Apply
              </button>
            </div>
          </div>

          {selectedNode.type === "inputNode" ? (
            <InputProperties node={selectedNode.data as InputNodeData} nodeId={selectedNode.id} setInputValue={setInputValue} />
          ) : null}

          {selectedNode.type === "gateNode" ? (
            <GateProperties
              node={selectedNode.data as GateVisualData}
              nodeId={selectedNode.id}
              setGateInputCount={setGateInputCount}
            />
          ) : null}

          {selectedNode.type === "outputNode" ? (
            <OutputProperties node={selectedNode.data as OutputVisualData} />
          ) : null}

          <button
            type="button"
            className="w-full rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:border-rose-400 hover:bg-rose-100"
            onClick={removeSelectedNode}
          >
            Remove Node
          </button>
        </div>
      )}
    </section>
  );
}

function InputProperties({
  node,
  nodeId,
  setInputValue
}: {
  node: InputNodeData;
  nodeId: string;
  setInputValue: (nodeId: string, value: 0 | 1) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Input Settings</p>
      <p className="mt-1 text-sm text-slate-700">Current value: {node.value}</p>
      {node.isConstant ? (
        <p className="mt-1 text-xs text-slate-500">Constant inputs are fixed.</p>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className={`rounded-md border px-3 py-1 text-sm font-bold ${
              node.value === 0
                ? "border-slate-700 bg-slate-700 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
            onClick={() => setInputValue(nodeId, 0)}
          >
            0
          </button>
          <button
            type="button"
            className={`rounded-md border px-3 py-1 text-sm font-bold ${
              node.value === 1
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
            onClick={() => setInputValue(nodeId, 1)}
          >
            1
          </button>
        </div>
      )}
    </div>
  );
}

function GateProperties({
  node,
  nodeId,
  setGateInputCount
}: {
  node: GateVisualData;
  nodeId: string;
  setGateInputCount: (nodeId: string, count: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Gate Settings</p>
      <p className="mt-1 text-sm text-slate-700">Type: {node.gateType}</p>
      <p className="text-sm text-slate-700">Inputs: {node.inputCount}</p>
      {node.gateType !== "NOT" ? (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 hover:border-cyan-400"
            onClick={() => setGateInputCount(nodeId, node.inputCount - 1)}
          >
            - Input
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 hover:border-cyan-400"
            onClick={() => setGateInputCount(nodeId, node.inputCount + 1)}
          >
            + Input
          </button>
        </div>
      ) : (
        <p className="mt-1 text-xs text-slate-500">NOT gates always have one input.</p>
      )}
    </div>
  );
}

function OutputProperties({ node }: { node: OutputVisualData }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Output Settings</p>
      <p className="mt-1 text-sm text-slate-700">Label: {node.label}</p>
      <p className="text-xs text-slate-500">Connect a gate or variable directly to this output.</p>
    </div>
  );
}

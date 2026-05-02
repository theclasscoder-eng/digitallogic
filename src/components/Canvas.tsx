import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type EdgeTypes,
  type NodeTypes
} from "@xyflow/react";
import InputNode from "../nodes/InputNode";
import GateNode from "../nodes/GateNode";
import OutputNode from "../nodes/OutputNode";
import ExpressionEdge from "../edges/ExpressionEdge";
import { buildNodeExpressionComputer } from "../logic/computeNodeExpression";
import { useCircuitStore } from "../state/useCircuitStore";
import type { LogicEdge, LogicNode, WireData } from "../types/circuit";

const nodeTypes = {
  inputNode: InputNode,
  gateNode: GateNode,
  outputNode: OutputNode
} as unknown as NodeTypes;

const edgeTypes = {
  expression: ExpressionEdge
} as unknown as EdgeTypes;

export default function Canvas() {
  const nodes = useCircuitStore((state) => state.nodes);
  const edges = useCircuitStore((state) => state.edges);
  const simulation = useCircuitStore((state) => state.simulation);
  const onNodesChange = useCircuitStore((state) => state.onNodesChange);
  const onEdgesChange = useCircuitStore((state) => state.onEdgesChange);
  const onConnect = useCircuitStore((state) => state.onConnect);
  const isValidConnection = useCircuitStore((state) => state.isValidConnection);
  const setSelectedNode = useCircuitStore((state) => state.setSelectedNode);
  const snapshotHistory = useCircuitStore((state) => state.snapshotHistory);

  const styledEdges = useMemo<LogicEdge[]>(
    () => {
      const expressionComputer = buildNodeExpressionComputer(nodes, edges, {
        missingInputToken: "?"
      });

      return edges.map((edge) => {
        const isHigh = simulation.edgeValues[edge.id] === 1;
        const expression = expressionComputer.compute(edge.source);
        const edgeData: WireData = {
          id: edge.data?.id ?? edge.id,
          sourceNodeId: edge.data?.sourceNodeId ?? edge.source,
          sourceHandleId: edge.data?.sourceHandleId ?? edge.sourceHandle ?? "output-0",
          targetNodeId: edge.data?.targetNodeId ?? edge.target,
          targetHandleId: edge.data?.targetHandleId ?? edge.targetHandle ?? "input-0",
          value: edge.data?.value,
          expression
        };

        return {
          ...edge,
          type: "expression",
          data: edgeData,
          animated: isHigh,
          style: {
            stroke: isHigh ? "#0ea5e9" : "#94a3b8",
            strokeWidth: isHigh ? 3 : 2
          }
        };
      });
    },
    [edges, nodes, simulation.edgeValues]
  );

  return (
    <div id="logic-canvas-root" className="relative h-full w-full rounded-2xl border border-slate-200 bg-white">
      <ReactFlow<LogicNode, LogicEdge>
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={() => snapshotHistory()}
        onSelectionChange={({ nodes: selectedNodes }) => {
          setSelectedNode(selectedNodes[0]?.id ?? null);
        }}
        onPaneClick={() => setSelectedNode(null)}
        deleteKeyCode={["Backspace", "Delete"]}
        isValidConnection={(connectionOrEdge) =>
          isValidConnection({
            source: connectionOrEdge.source,
            target: connectionOrEdge.target,
            sourceHandle: connectionOrEdge.sourceHandle ?? null,
            targetHandle: connectionOrEdge.targetHandle ?? null
          })
        }
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        connectionRadius={24}
        connectionLineStyle={{ stroke: "#0ea5e9", strokeWidth: 2 }}
        edgeTypes={edgeTypes}
        className="rounded-2xl"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.1} color="#cbd5e1" />
        <MiniMap
          pannable
          zoomable
          className="!bg-white/95"
          nodeStrokeColor="#0ea5e9"
          nodeColor="#f8fafc"
        />
        <Controls className="!rounded-xl !border !border-slate-200 !bg-white !shadow-soft" />
      </ReactFlow>

      {nodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white/90 p-5 text-center shadow-soft backdrop-blur">
            <h3 className="text-lg font-extrabold text-slate-800">Start Building Your Circuit</h3>
            <p className="mt-2 text-sm text-slate-600">
              Add inputs and gates from the left sidebar, then drag from blue output circles to amber
              input circles. Finish by connecting to an output node such as F.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

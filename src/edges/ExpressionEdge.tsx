import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import type { LogicEdge } from "../types/circuit";

type ExpressionEdgeProps = EdgeProps<LogicEdge>;

export default function ExpressionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerStart,
  markerEnd,
  data
}: ExpressionEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition
  });

  const expression = typeof data?.expression === "string" && data.expression.trim() ? data.expression : "?";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        markerStart={markerStart}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          className="pointer-events-none absolute nodrag nopan -translate-x-1/2 -translate-y-1/2 rounded-md border border-slate-300 bg-white/95 px-2 py-1 font-mono text-xs text-slate-700 shadow-sm"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`
          }}
        >
          {expression}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}


import { useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type Node, type NodeProps } from "@xyflow/react";
import { normalizeInputCount } from "../logic/gateDefinitions";
import type { GateVisualData } from "../types/circuit";

type GateFlowNode = Node<GateVisualData, "gateNode">;

const VIEWBOX_WIDTH = 120;
const VIEWBOX_HEIGHT = 80;
const INPUT_DOT_X = 12;
const OUTPUT_DOT_X = 108;
const SHAPE_STROKE_WIDTH = 2;

function getInputYPositions(inputCount: number): number[] {
  if (inputCount <= 1) {
    return [40];
  }

  if (inputCount === 2) {
    return [24, 56];
  }

  const top = 14;
  const bottom = 66;
  const step = (bottom - top) / (inputCount - 1);
  return Array.from({ length: inputCount }, (_, index) => top + step * index);
}

function getGateInputCount(data: GateVisualData): number {
  return normalizeInputCount(data.gateType, data.inputCount);
}

function GateShape({
  gateType,
  selected
}: {
  gateType: GateVisualData["gateType"];
  selected: boolean;
}) {
  const stroke = selected ? "#0284c7" : "#334155";
  const fill = "#ffffff";
  const labelStyle = {
    fontSize: "11px",
    fontWeight: 700
  };

  if (gateType === "NOT") {
    return (
      <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="h-full w-full">
        <path d="M26 10 L78 40 L26 70 Z" fill={fill} stroke={stroke} strokeWidth={SHAPE_STROKE_WIDTH} />
        <circle cx="86" cy="40" r="4" fill={fill} stroke={stroke} strokeWidth={SHAPE_STROKE_WIDTH} />
        <text x="52" y="44" fill={stroke} textAnchor="middle" style={labelStyle}>
          NOT
        </text>
      </svg>
    );
  }

  if (gateType === "AND" || gateType === "NAND") {
    return (
      <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="h-full w-full">
        <path d="M20 10 H54 A30 30 0 0 1 54 70 H20 Z" fill={fill} stroke={stroke} strokeWidth={SHAPE_STROKE_WIDTH} />
        {gateType === "NAND" ? (
          <circle cx="88" cy="40" r="4" fill={fill} stroke={stroke} strokeWidth={SHAPE_STROKE_WIDTH} />
        ) : null}
        <text x="46" y="44" fill={stroke} textAnchor="middle" style={labelStyle}>
          {gateType}
        </text>
      </svg>
    );
  }

  const hasBubble = gateType === "NOR" || gateType === "XNOR";
  const hasXorCurve = gateType === "XOR" || gateType === "XNOR";

  return (
    <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="h-full w-full">
      {hasXorCurve ? (
        <path d="M14 10 Q34 40 14 70" fill="none" stroke={stroke} strokeWidth={SHAPE_STROKE_WIDTH} />
      ) : null}
      <path
        d="M20 10 Q46 40 20 70 Q52 70 80 58 Q100 50 102 40 Q100 30 80 22 Q52 10 20 10 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={SHAPE_STROKE_WIDTH}
      />
      <path d="M20 10 Q40 40 20 70" fill="none" stroke={stroke} strokeWidth={SHAPE_STROKE_WIDTH} />
      {hasBubble ? (
        <circle cx="106" cy="40" r="4" fill={fill} stroke={stroke} strokeWidth={SHAPE_STROKE_WIDTH} />
      ) : null}
      <text x="62" y="44" fill={stroke} textAnchor="middle" style={labelStyle}>
        {gateType}
      </text>
    </svg>
  );
}

export default function GateNode({ id, data, selected }: NodeProps<GateFlowNode>) {
  const updateNodeInternals = useUpdateNodeInternals();
  const inputCount = getGateInputCount(data);
  const inputYPositions = getInputYPositions(inputCount);

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, inputCount, data.gateType, updateNodeInternals]);

  return (
    <div className="relative h-[80px] w-[120px]">
      <GateShape gateType={data.gateType} selected={selected} />

      {inputYPositions.map((y, index) => (
        <Handle
          key={`input-${index}`}
          id={`input-${index}`}
          type="target"
          position={Position.Left}
          className="!h-[10px] !w-[10px] !border-0 !bg-slate-700"
          style={{
            left: INPUT_DOT_X,
            top: `${(y / VIEWBOX_HEIGHT) * 100}%`
          }}
        />
      ))}

      <Handle
        id="output-0"
        type="source"
        position={Position.Right}
        className="!h-[10px] !w-[10px] !border-0 !bg-slate-700"
        style={{
          right: VIEWBOX_WIDTH - OUTPUT_DOT_X,
          top: "50%"
        }}
      />
    </div>
  );
}

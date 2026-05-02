import { buildNodeExpressionComputer } from "./computeNodeExpression";
import type { LogicEdge, LogicNode, OutputExpression, OutputNodeData } from "../types/circuit";

export function generateExpression(nodes: LogicNode[], edges: LogicEdge[]): OutputExpression[] {
  const computer = buildNodeExpressionComputer(nodes, edges, {
    missingInputToken: "0"
  });
  const outputNodes = nodes.filter((node) => node.type === "outputNode");

  return outputNodes.map((node) => {
    const outputData = node.data as OutputNodeData;
    return {
      outputId: node.id,
      label: outputData.label,
      expression: computer.compute(node.id)
    };
  });
}

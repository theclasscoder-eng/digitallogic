export type ExprNode =
  | VariableNode
  | ConstantNode
  | NotNode
  | AndNode
  | OrNode
  | XorNode;

export interface VariableNode {
  type: "variable";
  name: string;
}

export interface ConstantNode {
  type: "constant";
  value: 0 | 1;
}

export interface NotNode {
  type: "not";
  child: ExprNode;
}

export interface AndNode {
  type: "and";
  children: ExprNode[];
}

export interface OrNode {
  type: "or";
  children: ExprNode[];
}

export interface XorNode {
  type: "xor";
  children: ExprNode[];
}

export interface ParsedExpression {
  outputName: string;
  expression: ExprNode;
}

function toBits(minterm: number, width: number): string {
  return minterm.toString(2).padStart(width, "0");
}

function buildProductTerm(variables: string[], minterm: number): string {
  const bits = toBits(minterm, variables.length);
  return variables
    .map((variable, index) => (bits[index] === "1" ? variable : `${variable}'`))
    .join("");
}

export function buildCanonicalSopExpression(
  outputLabel: string,
  variables: string[],
  minterms: number[]
): string {
  const uniqueSortedMinterms = [...new Set(minterms)].sort((a, b) => a - b);
  if (uniqueSortedMinterms.length === 0) {
    return `${outputLabel} = 0`;
  }

  const terms = uniqueSortedMinterms.map((minterm) => buildProductTerm(variables, minterm));
  return `${outputLabel} = ${terms.join(" + ")}`;
}

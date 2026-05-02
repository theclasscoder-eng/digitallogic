import { useMemo } from "react";
import { generateKMap } from "../logic/generateKMap";
import { useCircuitStore } from "../state/useCircuitStore";
import BriefDescriptionButton from "./common/BriefDescriptionButton";

export default function KMap() {
  const truthTable = useCircuitStore((state) => state.truthTable);
  const manualMinterms = useCircuitStore((state) => state.manualMinterms);

  const mapResult = useMemo(
    () => generateKMap(truthTable, { manualMinterms }),
    [manualMinterms, truthTable]
  );

  if (mapResult.message) {
    return <p className="mt-3 text-sm text-slate-500">{mapResult.message}</p>;
  }

  if (!mapResult.data) {
    return <p className="mt-3 text-sm text-slate-500">K-map is unavailable for this circuit.</p>;
  }

  const { data, outputLabel } = mapResult;

  const rowAxisLabel = data.variables.slice(0, data.variables.length === 2 ? 1 : data.variables.length === 3 ? 1 : 2).join("");
  const colAxisLabel = data.variables.slice(data.variables.length === 2 ? 1 : data.variables.length === 3 ? 1 : 2).join("");

  return (
    <div className="mt-3 overflow-auto rounded-xl border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">K-map</h3>
        <BriefDescriptionButton topic="kmap" />
      </div>
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
        Variables ({data.variables.length}): {data.variables.join(", ")}
        {manualMinterms.enabled && manualMinterms.minterms.length > 0
          ? ` | Source: ${manualMinterms.sourceType}`
          : ""}
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="border-b border-r border-slate-200 px-3 py-2 text-left font-bold text-slate-700">
              <div className="flex flex-col">
                <span>{rowAxisLabel || "Rows"}</span>
                <span className="text-[10px] font-semibold text-slate-500">\{colAxisLabel || "Cols"}</span>
              </div>
            </th>
            {data.colLabels.map((label) => (
              <th key={label} className="border-b border-slate-200 px-3 py-2 text-left font-bold text-slate-700">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.cells.map((row, rowIndex) => (
            <tr key={data.rowLabels[rowIndex]} className="odd:bg-white even:bg-slate-50">
              <th className="border-r border-slate-200 px-3 py-2 text-left font-bold text-slate-700">
                {data.rowLabels[rowIndex]}
              </th>
              {row.map((cell) => (
                <td
                  key={`${cell.rowBits}-${cell.colBits}`}
                  className={`border-b border-slate-100 px-3 py-2 ${
                    cell.value === 1 ? "bg-emerald-100/70" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-500">m{cell.minterm}</span>
                    <span className={`font-mono text-lg font-bold ${cell.value === 1 ? "text-emerald-700" : "text-slate-700"}`}>
                      {cell.value}
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
        Output: {outputLabel ?? "F"}
      </div>
    </div>
  );
}

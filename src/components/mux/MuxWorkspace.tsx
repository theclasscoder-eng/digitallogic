import { useMemo, useState } from "react";
import { toPng } from "html-to-image";
import { normalizeVariableName, sortVariableNames } from "../../expression/variableUtils";
import BriefDescriptionButton from "../common/BriefDescriptionButton";
import { solveMuxDataInputsFromExpression } from "../../mux/muxDataInputSolver";
import { collectMuxVariablesFromExpression } from "../../mux/muxEvaluator";
import { generateMuxTruthTable } from "../../mux/muxTruthTable";
import type { MuxConfig, MuxDataInput, MuxSize, MuxTruthRow } from "../../mux/muxTypes";
import MuxDataInputEditor from "./MuxDataInputEditor";
import MuxDiagram from "./MuxDiagram";
import MuxTruthTable from "./MuxTruthTable";

type MuxViewTab = "diagram" | "truth";

function createMuxDataInputs(size: MuxSize): MuxDataInput[] {
  return Array.from({ length: size }, (_, index) => ({
    index,
    label: `D${index}`,
    value: "0"
  }));
}

function createDefaultMuxConfig(): MuxConfig {
  return {
    id: `mux-${Date.now().toString(36)}`,
    size: 4,
    outputLabel: "F",
    variables: ["A", "B", "C"],
    selectVariables: ["A", "B"],
    dataInputs: createMuxDataInputs(4),
    sourceExpression: "F = A'B + C"
  };
}

function selectLineCount(size: MuxSize): number {
  return Math.log2(size);
}

function parseVariableText(raw: string): string[] {
  const tokens = raw
    .split(/[\s,]+/)
    .map((entry) => normalizeVariableName(entry))
    .filter((entry) => entry.length > 0 && entry !== "0" && entry !== "1");

  if (tokens.length === 0) {
    return [];
  }

  return sortVariableNames(tokens);
}

function padSelectVariables(variables: string[], size: MuxSize, currentSelects: string[]): string[] {
  const count = selectLineCount(size);
  const padded = [...currentSelects].slice(0, count);

  while (padded.length < count) {
    const candidate = variables.find((variable) => !padded.includes(variable));
    padded.push(candidate ?? variables[0] ?? `S${padded.length}`);
  }

  return padded;
}

export default function MuxWorkspace() {
  const [config, setConfig] = useState<MuxConfig>(() => createDefaultMuxConfig());
  const [variablesText, setVariablesText] = useState("A, B, C");
  const [activeTab, setActiveTab] = useState<MuxViewTab>("diagram");
  const [rows, setRows] = useState<MuxTruthRow[]>(() => generateMuxTruthTable(createDefaultMuxConfig()));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectCount = useMemo(() => selectLineCount(config.size), [config.size]);

  const applyConfig = (next: MuxConfig) => {
    setConfig(next);
    setRows(generateMuxTruthTable(next));
  };

  const handleSizeChange = (size: MuxSize) => {
    const variables = config.variables.length > 0 ? config.variables : ["A", "B"];
    const next: MuxConfig = {
      ...config,
      size,
      dataInputs: createMuxDataInputs(size),
      selectVariables: padSelectVariables(variables, size, config.selectVariables)
    };

    applyConfig(next);
    setMessage(`Switched to ${size}:1 MUX.`);
    setError(null);
  };

  const handleVariablesApply = () => {
    const parsedVariables = parseVariableText(variablesText);
    if (parsedVariables.length === 0) {
      setError("Enter at least one variable name.");
      setMessage(null);
      return;
    }

    const next: MuxConfig = {
      ...config,
      variables: parsedVariables,
      selectVariables: padSelectVariables(parsedVariables, config.size, config.selectVariables)
    };

    applyConfig(next);
    setError(null);
    setMessage("Variable list updated.");
  };

  const handleSelectVariableChange = (selectIndex: number, variable: string) => {
    const selectVariables = [...config.selectVariables];
    selectVariables[selectIndex] = variable;

    applyConfig({
      ...config,
      selectVariables
    });
  };

  const handleGenerateFromExpression = () => {
    const expression = config.sourceExpression?.trim();
    if (!expression) {
      setError("Enter a source expression first.");
      setMessage(null);
      return;
    }

    const expressionVariables = collectMuxVariablesFromExpression(expression);
    const variables = expressionVariables.length > 0 ? expressionVariables : config.variables;
    const selectVariables = padSelectVariables(variables, config.size, config.selectVariables);

    const solved = solveMuxDataInputsFromExpression({
      expression,
      size: config.size,
      selectVariables,
      variables
    });

    if (!solved.success) {
      setError(solved.error ?? "Could not generate data inputs from expression.");
      setMessage(null);
      return;
    }

    const nextDataInputs = createMuxDataInputs(config.size).map((input) => {
      const solvedInput = solved.dataInputs.find((entry) => entry.index === input.index);
      return {
        ...input,
        value: solvedInput?.expression ?? "0"
      };
    });

    const nextConfig: MuxConfig = {
      ...config,
      variables: solved.variableOrder.length > 0 ? solved.variableOrder : variables,
      selectVariables,
      dataInputs: nextDataInputs
    };

    setVariablesText(nextConfig.variables.join(", "));
    applyConfig(nextConfig);
    setError(null);
    setMessage("Generated MUX realization from expression.");
  };

  const handleGenerateTruthTable = () => {
    setRows(generateMuxTruthTable(config));
    setMessage("MUX truth table generated.");
    setError(null);
  };

  const handleExportDiagram = async () => {
    const diagram = document.getElementById("mux-diagram-root");
    if (!diagram) {
      setError("MUX diagram is unavailable for export.");
      return;
    }

    try {
      const image = await toPng(diagram, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff"
      });

      const link = document.createElement("a");
      link.href = image;
      link.download = `${(config.outputLabel || "mux").toLowerCase()}-mux-diagram.png`;
      link.click();
      setError(null);
      setMessage("MUX diagram exported.");
    } catch {
      setError("Could not export the MUX diagram.");
      setMessage(null);
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">MUX Workspace</h2>
          <BriefDescriptionButton topic="mux" />
        </div>

        <div className="mt-3 space-y-3 overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">MUX Size</label>
            <select
              value={config.size}
              onChange={(event) => handleSizeChange(Number.parseInt(event.target.value, 10) as MuxSize)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:border-cyan-500 focus:outline-none"
            >
              <option value={2}>2:1</option>
              <option value={4}>4:1</option>
              <option value={8}>8:1</option>
              <option value={16}>16:1</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Input Variables</label>
            <textarea
              value={variablesText}
              onChange={(event) => setVariablesText(event.target.value)}
              className="mt-1 h-20 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-800 focus:border-cyan-500 focus:outline-none"
              placeholder="A, B, C, D"
            />
            <button
              type="button"
              className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-cyan-400"
              onClick={handleVariablesApply}
            >
              Apply Variables
            </button>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Select Line Variables</label>
            <div className="mt-1 space-y-2">
              {Array.from({ length: selectCount }, (_, index) => (
                <div key={`select-line-${index}`} className="flex items-center gap-2">
                  <span className="w-12 text-xs font-semibold text-slate-600">S{index}</span>
                  <select
                    value={config.selectVariables[index] ?? ""}
                    onChange={(event) => handleSelectVariableChange(index, event.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 focus:border-cyan-500 focus:outline-none"
                  >
                    {config.variables.map((variable) => (
                      <option key={variable} value={variable}>
                        {variable}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Output Label</label>
            <input
              value={config.outputLabel}
              onChange={(event) => applyConfig({ ...config, outputLabel: event.target.value || "F" })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-cyan-500 focus:outline-none"
              placeholder="F"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Source Expression</label>
            <textarea
              value={config.sourceExpression ?? ""}
              onChange={(event) => applyConfig({ ...config, sourceExpression: event.target.value })}
              className="mt-1 h-24 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-800 focus:border-cyan-500 focus:outline-none"
              placeholder="F = A'B + C"
            />
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Data Inputs</h3>
            <div className="mt-1">
              <MuxDataInputEditor
                dataInputs={config.dataInputs}
                onChange={(nextDataInputs) => applyConfig({ ...config, dataInputs: nextDataInputs })}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-cyan-400 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
              onClick={handleGenerateFromExpression}
            >
              Generate MUX Realization
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-cyan-400"
              onClick={handleGenerateTruthTable}
            >
              Generate Truth Table
            </button>
            <button
              type="button"
              className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-400"
              onClick={handleExportDiagram}
            >
              Export MUX Diagram
            </button>
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>
          ) : null}

          {message ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">{message}</p>
          ) : null}
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">MUX Results</h2>
          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("diagram")}
              className={`rounded-md px-3 py-1 text-xs font-bold ${
                activeTab === "diagram" ? "bg-white text-slate-800 shadow" : "text-slate-600"
              }`}
            >
              Diagram
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("truth")}
              className={`rounded-md px-3 py-1 text-xs font-bold ${
                activeTab === "truth" ? "bg-white text-slate-800 shadow" : "text-slate-600"
              }`}
            >
              Truth Table
            </button>
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-auto">
          {activeTab === "diagram" ? <MuxDiagram config={config} /> : <MuxTruthTable config={config} rows={rows} />}
        </div>
      </section>
    </div>
  );
}

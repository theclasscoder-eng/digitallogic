import { useState } from "react";
import { toPng } from "html-to-image";
import { normalizeVariableName, sortVariableNames } from "../../expression/variableUtils";
import BriefDescriptionButton from "../common/BriefDescriptionButton";
import { createFullSubtractorRomConfig } from "../../rom/fullSubtractor";
import { buildRomRealization } from "../../rom/romMinterms";
import { generateRomTruthTable, normalizeRomInputVariables } from "../../rom/romTruthTable";
import type { RomConfig, RomOutputDefinition, RomRealization, RomTruthRow } from "../../rom/romTypes";
import RomHighLevelDiagram from "./RomHighLevelDiagram";
import RomLowLevelDiagram from "./RomLowLevelDiagram";
import RomOutputEditor from "./RomOutputEditor";
import RomTruthTable from "./RomTruthTable";

type RomViewTab = "diagram" | "truth" | "realization" | "notes";

function createDefaultRomConfig(): RomConfig {
  return createFullSubtractorRomConfig();
}

function normalizeVariablesFromText(text: string): string[] {
  const tokens = text
    .split(/[\s,]+/)
    .map((entry) => normalizeVariableName(entry))
    .filter((entry) => entry.length > 0 && entry !== "0" && entry !== "1");

  if (tokens.length === 0) {
    return [];
  }

  return normalizeRomInputVariables(sortVariableNames(tokens));
}

function buildInitialRows(config: RomConfig): RomTruthRow[] {
  const result = generateRomTruthTable(config);
  return result.rows;
}

function createOutput(label: string): RomOutputDefinition {
  return {
    label,
    expression: "0"
  };
}

export default function RomWorkspace() {
  const [config, setConfig] = useState<RomConfig>(() => createDefaultRomConfig());
  const [inputVariablesText, setInputVariablesText] = useState("A, B, Bin");
  const [rows, setRows] = useState<RomTruthRow[]>(() => buildInitialRows(createDefaultRomConfig()));
  const [realization, setRealization] = useState<RomRealization | null>(() =>
    buildRomRealization(buildInitialRows(createDefaultRomConfig()))
  );
  const [activeTab, setActiveTab] = useState<RomViewTab>("diagram");
  const [message, setMessage] = useState<string | null>("Loaded full subtractor ROM example.");
  const [error, setError] = useState<string | null>(null);

  const applyConfig = (next: RomConfig) => {
    setConfig(next);
    const result = generateRomTruthTable(next);

    if (result.error) {
      setRows([]);
      setRealization(null);
      setError(result.error);
      setMessage(null);
      return;
    }

    setRows(result.rows);
    setRealization(buildRomRealization(result.rows));
    setError(null);
  };

  const handleApplyVariables = () => {
    const variables = normalizeVariablesFromText(inputVariablesText);
    if (variables.length === 0) {
      setError("Enter at least one input variable.");
      setMessage(null);
      return;
    }

    applyConfig({
      ...config,
      inputVariables: variables
    });
    setMessage("ROM input variables updated.");
  };

  const handleGenerateTable = () => {
    const result = generateRomTruthTable(config);
    if (result.error) {
      setError(result.error);
      setMessage(null);
      return;
    }

    setRows(result.rows);
    setRealization(buildRomRealization(result.rows));
    setError(null);
    setMessage("ROM truth table generated.");
  };

  const handleLoadFullSubtractor = () => {
    const next = createFullSubtractorRomConfig();
    setInputVariablesText(next.inputVariables.join(", "));
    setConfig(next);

    const result = generateRomTruthTable(next);
    if (result.error) {
      setRows([]);
      setRealization(null);
      setError(result.error);
      setMessage(null);
      return;
    }

    setRows(result.rows);
    setRealization(buildRomRealization(result.rows));
    setError(null);
    setMessage("Loaded full subtractor example.");
    setActiveTab("truth");
  };

  const handleExportDiagram = async () => {
    const targetId = activeTab === "realization" ? "rom-low-level-diagram" : "rom-high-level-diagram";
    const element = document.getElementById(targetId);

    if (!element) {
      setError("No ROM diagram is available to export in the active tab.");
      setMessage(null);
      return;
    }

    try {
      const image = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff"
      });

      const link = document.createElement("a");
      link.href = image;
      link.download = `rom-${activeTab === "realization" ? "low-level" : "high-level"}.png`;
      link.click();

      setError(null);
      setMessage("ROM diagram exported.");
    } catch {
      setError("Could not export ROM diagram.");
      setMessage(null);
    }
  };

  const addOutput = () => {
    const label = window.prompt("Output label", `Y${config.outputs.length}`)?.trim();
    if (!label) {
      return;
    }

    applyConfig({
      ...config,
      outputs: [...config.outputs, createOutput(label)]
    });
    setMessage(`Output ${label} added.`);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[380px_minmax(0,1fr)]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">ROM Workspace</h2>
          <BriefDescriptionButton topic="rom" />
        </div>

        <div className="mt-3 space-y-3 overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Input Variables</label>
            <textarea
              value={inputVariablesText}
              onChange={(event) => setInputVariablesText(event.target.value)}
              className="mt-1 h-20 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-800 focus:border-cyan-500 focus:outline-none"
              placeholder="A, B, Bin"
            />
            <button
              type="button"
              className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-cyan-400"
              onClick={handleApplyVariables}
            >
              Apply Variables
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Output Functions</h3>
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-cyan-400"
                onClick={addOutput}
              >
                Add Output
              </button>
            </div>
            <div className="mt-1">
              <RomOutputEditor
                outputs={config.outputs}
                onChange={(outputs) => applyConfig({ ...config, outputs })}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-cyan-400 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
              onClick={handleGenerateTable}
            >
              Generate ROM Table
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-cyan-400"
              onClick={handleLoadFullSubtractor}
            >
              Load Full Subtractor Example
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-cyan-400"
              onClick={() => setActiveTab("diagram")}
            >
              Generate High-Level ROM Diagram
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-cyan-400"
              onClick={() => setActiveTab("realization")}
            >
              Generate Low-Level ROM Realization
            </button>
            <button
              type="button"
              className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-400"
              onClick={handleExportDiagram}
            >
              Export ROM Diagram
            </button>
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>
          ) : null}

          {message ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">{message}</p>
          ) : null}

          {realization ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-700">
              <p>ROM Size: {realization.sizeLabel}</p>
              <p>
                Address Lines: {realization.addressLineCount} | Output Lines: {realization.outputCount}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">ROM Results</h2>
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
            <button
              type="button"
              onClick={() => setActiveTab("realization")}
              className={`rounded-md px-3 py-1 text-xs font-bold ${
                activeTab === "realization" ? "bg-white text-slate-800 shadow" : "text-slate-600"
              }`}
            >
              Realization
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("notes")}
              className={`rounded-md px-3 py-1 text-xs font-bold ${
                activeTab === "notes" ? "bg-white text-slate-800 shadow" : "text-slate-600"
              }`}
            >
              Notes
            </button>
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-auto">
          {activeTab === "diagram" ? <RomHighLevelDiagram config={config} realization={realization} /> : null}
          {activeTab === "truth" ? <RomTruthTable config={config} rows={rows} /> : null}
          {activeTab === "realization" ? <RomLowLevelDiagram realization={realization} /> : null}
          {activeTab === "notes" ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold">ROM Classroom Notes</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                <li>Address lines correspond to input variables in order.</li>
                <li>Each address maps to one stored data word.</li>
                <li>The low-level view shows decoder outputs (minterms) feeding OR gates for each output bit.</li>
                <li>Use expression fields or explicit truth-bit strings to define each output.</li>
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

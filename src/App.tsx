import { useCallback, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { toPng } from "html-to-image";
import Sidebar from "./components/Sidebar";
import Toolbar from "./components/Toolbar";
import Canvas from "./components/Canvas";
import TruthTable from "./components/TruthTable";
import ExpressionPanel from "./components/ExpressionPanel";
import PropertiesPanel from "./components/PropertiesPanel";
import ExpressionBuilder from "./components/ExpressionBuilder";
import MinimizedResult from "./components/MinimizedResult";
import MuxWorkspace from "./components/mux/MuxWorkspace";
import RomWorkspace from "./components/rom/RomWorkspace";
import SequentialWorkspace from "./components/sequential/SequentialWorkspace";
import { useCircuitStore } from "./state/useCircuitStore";
import type { CircuitSaveData, WorkspaceMode } from "./types/circuit";

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("gates");
  const getSaveData = useCircuitStore((state) => state.getSaveData);
  const loadFromData = useCircuitStore((state) => state.loadFromData);
  const designName = useCircuitStore((state) => state.designName);

  const handleExportImage = useCallback(async () => {
    const canvasElement = document.getElementById("logic-canvas-root");
    if (!canvasElement) {
      return;
    }

    try {
      const image = await toPng(canvasElement, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#f8fafc"
      });

      const link = document.createElement("a");
      link.download = `${designName.replace(/\s+/g, "-").toLowerCase() || "logic-circuit"}.png`;
      link.href = image;
      link.click();
    } catch {
      window.alert("Unable to export image.");
    }
  }, [designName]);

  const handleExportJson = useCallback(() => {
    const saveData = getSaveData(designName);
    downloadFile(
      `${designName.replace(/\s+/g, "-").toLowerCase() || "logic-circuit"}.json`,
      JSON.stringify(saveData, null, 2),
      "application/json"
    );
  }, [designName, getSaveData]);

  const handleImportJson = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as CircuitSaveData;

        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
          throw new Error("Invalid JSON schema");
        }

        loadFromData(parsed);
        window.alert("Design imported successfully.");
      } catch {
        window.alert("Invalid JSON file.");
      }
    },
    [loadFromData]
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-app-pattern text-slate-800">
      <Toolbar
        onExportImage={handleExportImage}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        workspaceMode={workspaceMode}
        onWorkspaceModeChange={setWorkspaceMode}
      />

      <div className="min-h-0 flex-1 overflow-hidden p-3 md:p-4">
        <div className={workspaceMode === "gates" ? "flex h-full min-h-0 flex-col overflow-hidden md:flex-row" : "hidden h-full"}>
          <Sidebar />

          <main className="min-h-0 min-w-0 flex-1 p-3 md:p-4">
            <ReactFlowProvider>
              <Canvas />
            </ReactFlowProvider>
          </main>

          <aside className="w-full min-h-0 overflow-y-auto border-t border-slate-200/80 bg-white/90 p-3 md:w-[360px] md:border-l md:border-t-0 md:p-4">
            <div className="space-y-4">
              <ExpressionBuilder />
              <MinimizedResult />
              <ExpressionPanel />
              <TruthTable />
              <PropertiesPanel />
            </div>
          </aside>
        </div>

        <div className={workspaceMode === "mux" ? "h-full min-h-0 overflow-hidden" : "hidden h-full min-h-0"}>
          <MuxWorkspace />
        </div>

        <div className={workspaceMode === "rom" ? "h-full min-h-0 overflow-hidden" : "hidden h-full min-h-0"}>
          <RomWorkspace />
        </div>

        <div className={workspaceMode === "sequential" ? "h-full min-h-0 overflow-hidden" : "hidden h-full min-h-0"}>
          <SequentialWorkspace />
        </div>
      </div>
    </div>
  );
}

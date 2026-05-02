import { useRef, type ChangeEvent } from "react";
import { useCircuitStore } from "../state/useCircuitStore";
import type { WorkspaceMode } from "../types/circuit";

interface ToolbarProps {
  onExportImage: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  workspaceMode: WorkspaceMode;
  onWorkspaceModeChange: (mode: WorkspaceMode) => void;
}

function ActionButton({
  label,
  onClick,
  disabled = false,
  tone = "default"
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  const base =
    "rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
  const variant =
    tone === "danger"
      ? "border-rose-300 bg-rose-50 text-rose-700 hover:border-rose-400 hover:bg-rose-100"
      : "border-slate-300 bg-white text-slate-700 hover:border-cyan-400 hover:bg-cyan-50";

  return (
    <button type="button" className={`${base} ${variant}`} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

function WorkspaceTab({
  label,
  mode,
  activeMode,
  onClick
}: {
  label: string;
  mode: WorkspaceMode;
  activeMode: WorkspaceMode;
  onClick: (mode: WorkspaceMode) => void;
}) {
  const active = activeMode === mode;
  return (
    <button
      type="button"
      className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
        active
          ? "bg-cyan-600 text-white shadow"
          : "bg-white text-slate-700 hover:bg-cyan-50 hover:text-cyan-800"
      }`}
      onClick={() => onClick(mode)}
    >
      {label}
    </button>
  );
}

export default function Toolbar({
  onExportImage,
  onExportJson,
  onImportJson,
  workspaceMode,
  onWorkspaceModeChange
}: ToolbarProps) {
  const clearCanvas = useCircuitStore((state) => state.clearCanvas);
  const undo = useCircuitStore((state) => state.undo);
  const redo = useCircuitStore((state) => state.redo);
  const canUndo = useCircuitStore((state) => state.canUndo());
  const canRedo = useCircuitStore((state) => state.canRedo());
  const saveToLocalStorage = useCircuitStore((state) => state.saveToLocalStorage);
  const loadFromLocalStorage = useCircuitStore((state) => state.loadFromLocalStorage);
  const designName = useCircuitStore((state) => state.designName);
  const setDesignName = useCircuitStore((state) => state.setDesignName);

  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleSave = () => {
    const success = saveToLocalStorage(designName);
    window.alert(success ? "Design saved to localStorage." : "Could not save design.");
  };

  const handleLoad = () => {
    const success = loadFromLocalStorage();
    window.alert(success ? "Design loaded from localStorage." : "No saved design found.");
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    onImportJson(file);
    event.target.value = "";
  };

  return (
    <header className="border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
          <WorkspaceTab
            label="Gates"
            mode="gates"
            activeMode={workspaceMode}
            onClick={onWorkspaceModeChange}
          />
          <WorkspaceTab label="MUX" mode="mux" activeMode={workspaceMode} onClick={onWorkspaceModeChange} />
          <WorkspaceTab label="ROM" mode="rom" activeMode={workspaceMode} onClick={onWorkspaceModeChange} />
          <WorkspaceTab
            label="Sequential"
            mode="sequential"
            activeMode={workspaceMode}
            onClick={onWorkspaceModeChange}
          />
        </div>

        {workspaceMode === "gates" ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={designName}
              onChange={(event) => setDesignName(event.target.value)}
              className="min-w-[200px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:border-cyan-500 focus:outline-none"
              placeholder="Design name"
            />

            <ActionButton label="Save Design" onClick={handleSave} />
            <ActionButton label="Load Design" onClick={handleLoad} />
            <ActionButton label="Export JSON" onClick={onExportJson} />
            <ActionButton label="Import JSON" onClick={handleImportClick} />
            <ActionButton label="Export Image" onClick={onExportImage} />
            <ActionButton label="Undo" onClick={undo} disabled={!canUndo} />
            <ActionButton label="Redo" onClick={redo} disabled={!canRedo} />
            <ActionButton label="Clear Canvas" onClick={clearCanvas} tone="danger" />
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-600">
            {workspaceMode === "mux"
              ? "MUX workspace tools are shown in the left panel."
              : workspaceMode === "rom"
                ? "ROM workspace tools are shown in the left panel."
                : "Sequential workspace tools are shown in the left panel."}
          </p>
        )}
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileChange}
      />
    </header>
  );
}

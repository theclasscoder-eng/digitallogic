import BriefDescriptionButton from "../common/BriefDescriptionButton";
import ScrollableSection from "../layout/ScrollableSection";
import { getComponentDefinition, SEQUENTIAL_COMPONENTS } from "../../sequential/sequentialEvaluator";
import type {
  SequentialComponentType,
  SequentialInputs
} from "../../sequential/sequentialTypes";
import type { ExplanationTopic } from "../../explanations/explanationTypes";

interface SequentialControlsProps {
  componentType: SequentialComponentType;
  inputs: SequentialInputs;
  onComponentChange: (type: SequentialComponentType) => void;
  onInputChange: (name: keyof SequentialInputs, value: 0 | 1) => void;
  onApplyStep: () => void;
  onClockPulse: () => void;
  onResetState: () => void;
}

const INPUT_ORDER: Array<keyof SequentialInputs> = [
  "S",
  "R",
  "D",
  "J",
  "K",
  "T",
  "Enable",
  "Clock",
  "Preset",
  "Clear"
];

function topicFromComponent(type: SequentialComponentType): ExplanationTopic {
  if (type === "SR_LATCH" || type === "GATED_SR_LATCH") {
    return "sr-latch";
  }

  if (type === "D_LATCH") {
    return "d-latch";
  }

  if (type === "D_FLIP_FLOP") {
    return "d-flip-flop";
  }

  if (type === "JK_FLIP_FLOP") {
    return "jk-flip-flop";
  }

  return "t-flip-flop";
}

function inputLabel(name: keyof SequentialInputs): string {
  return name === "Enable" ? "EN" : name;
}

export default function SequentialControls({
  componentType,
  inputs,
  onComponentChange,
  onInputChange,
  onApplyStep,
  onClockPulse,
  onResetState
}: SequentialControlsProps) {
  const definition = getComponentDefinition(componentType);
  const activeInputs = new Set<keyof SequentialInputs>([
    ...definition.requiredInputs,
    "Preset",
    "Clear"
  ]);

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">Sequential Controls</h2>
        <BriefDescriptionButton topic="sequential" />
      </div>

      <div className="mt-3 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden">
        <ScrollableSection title="Component" className="min-h-0">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Select latch/flip-flop type</span>
              <BriefDescriptionButton topic={topicFromComponent(componentType)} className="ml-auto" />
            </div>
            <select
              value={componentType}
              onChange={(event) => onComponentChange(event.target.value as SequentialComponentType)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:border-cyan-500 focus:outline-none"
            >
              {SEQUENTIAL_COMPONENTS.map((component) => (
                <option key={component.type} value={component.type}>
                  {component.label}
                </option>
              ))}
            </select>
          </div>
        </ScrollableSection>

        <ScrollableSection title="Input Toggles" className="min-h-0">
          <div className="grid grid-cols-2 gap-2">
            {INPUT_ORDER.filter((name) => activeInputs.has(name)).map((inputName) => {
              const value = inputs[inputName] === 1 ? 1 : 0;
              return (
                <button
                  key={inputName}
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
                    value === 1
                      ? "border-cyan-400 bg-cyan-50 text-cyan-800"
                      : "border-slate-300 bg-white text-slate-700 hover:border-cyan-300"
                  }`}
                  onClick={() => onInputChange(inputName, value === 1 ? 0 : 1)}
                >
                  {inputLabel(inputName)}: {value}
                </button>
              );
            })}
          </div>
        </ScrollableSection>

        <ScrollableSection title="Sequential Actions" className="min-h-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-lg border border-cyan-400 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-100"
              onClick={onApplyStep}
            >
              Step / Apply Inputs
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-cyan-400"
              onClick={onClockPulse}
            >
              Clock Pulse
            </button>
            <button
              type="button"
              className="col-span-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:border-rose-400"
              onClick={onResetState}
            >
              Reset State
            </button>
          </div>
        </ScrollableSection>
      </div>
    </section>
  );
}

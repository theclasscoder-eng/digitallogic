import { useMemo, useState } from "react";
import BriefDescriptionButton from "../common/BriefDescriptionButton";
import {
  createDefaultInputs,
  createInitialSequentialState,
  evaluateSequentialStep,
  getComponentDefinition
} from "../../sequential/sequentialEvaluator";
import type { SequentialComponentType, SequentialInputs, SequentialState, SequentialStep } from "../../sequential/sequentialTypes";
import SequentialControls from "./SequentialControls";
import SequentialDiagram from "./SequentialDiagram";
import SequentialTable from "./SequentialTable";
import WaveformViewer from "./WaveformViewer";
import StateBadge from "./StateBadge";

function shouldUseClockPulse(componentType: SequentialComponentType): boolean {
  const definition = getComponentDefinition(componentType);
  return definition.usesClock;
}

export default function SequentialWorkspace() {
  const [componentType, setComponentType] = useState<SequentialComponentType>("SR_LATCH");
  const [inputs, setInputs] = useState<SequentialInputs>(() => createDefaultInputs());
  const [state, setState] = useState<SequentialState>(() => createInitialSequentialState());
  const [history, setHistory] = useState<SequentialStep[]>([]);

  const nextStatePreview = useMemo(() => {
    const result = evaluateSequentialStep({
      componentType,
      currentState: state,
      inputs,
      stepIndex: history.length + 1
    });

    return result.step;
  }, [componentType, history.length, inputs, state]);

  const appendStep = (step: SequentialStep, next: SequentialState) => {
    setState(next);
    setHistory((prev) => [...prev, step]);
  };

  const runStep = (activeInputs: SequentialInputs) => {
    const result = evaluateSequentialStep({
      componentType,
      currentState: state,
      inputs: activeInputs,
      stepIndex: history.length + 1
    });

    appendStep(result.step, result.nextState);
  };

  const handleComponentChange = (type: SequentialComponentType) => {
    setComponentType(type);
    const defaults = createDefaultInputs();
    setInputs((prev) => ({ ...defaults, Preset: prev.Preset ?? 0, Clear: prev.Clear ?? 0 }));
    setState(createInitialSequentialState());
    setHistory([]);
  };

  const handleInputChange = (name: keyof SequentialInputs, value: 0 | 1) => {
    setInputs((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyStep = () => {
    runStep(inputs);
  };

  const handleClockPulse = () => {
    if (!shouldUseClockPulse(componentType)) {
      const step: SequentialStep = {
        index: history.length + 1,
        componentType,
        inputs,
        previousQ: state.Q,
        nextQ: state.Q,
        QBar: state.QBar,
        triggered: false,
        warning: "Clock pulse is only meaningful for edge-triggered flip-flops."
      };

      setState((prev) => ({ ...prev, warning: step.warning }));
      setHistory((prev) => [...prev, step]);
      return;
    }

    const risingInputs: SequentialInputs = {
      ...inputs,
      Clock: 1
    };

    const risingResult = evaluateSequentialStep({
      componentType,
      currentState: state,
      inputs: risingInputs,
      stepIndex: history.length + 1
    });

    const settledState: SequentialState = {
      ...risingResult.nextState,
      previousClock: 0
    };

    setInputs((prev) => ({ ...prev, Clock: 0 }));
    appendStep(
      {
        ...risingResult.step,
        inputs: { ...risingResult.step.inputs, Clock: 1 }
      },
      settledState
    );
  };

  const handleResetState = () => {
    setState(createInitialSequentialState());
    setHistory([]);
    setInputs(createDefaultInputs());
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[340px_minmax(0,1fr)_380px]">
      <SequentialControls
        componentType={componentType}
        inputs={inputs}
        onComponentChange={handleComponentChange}
        onInputChange={handleInputChange}
        onApplyStep={handleApplyStep}
        onClockPulse={handleClockPulse}
        onResetState={handleResetState}
      />

      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">Diagram and Waveform</h2>
          <BriefDescriptionButton topic="sequential" />
        </div>

        <div className="mt-3 min-h-0 space-y-3 overflow-y-auto pr-1">
          <StateBadge state={state} />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-700">
            <p>
              Next preview: Q {nextStatePreview.previousQ} ? {nextStatePreview.nextQ}
            </p>
            <p>
              Triggered: {nextStatePreview.triggered ? "Yes" : "No"}
              {nextStatePreview.warning ? ` | ${nextStatePreview.warning}` : ""}
            </p>
          </div>

          <SequentialDiagram componentType={componentType} state={state} />
          <WaveformViewer history={history} />
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">State Tables</h2>
          <BriefDescriptionButton topic="sequential" />
        </div>

        <div className="mt-3 min-h-0 overflow-y-auto pr-1">
          <SequentialTable componentType={componentType} history={history} />
        </div>
      </section>
    </div>
  );
}

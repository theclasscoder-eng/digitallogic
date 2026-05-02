import type { SequentialState } from "../../sequential/sequentialTypes";

interface StateBadgeProps {
  state: SequentialState;
}

export default function StateBadge({ state }: StateBadgeProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Current State</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-700">
          Q = {state.Q}
        </span>
        <span className="rounded-lg border border-cyan-300 bg-cyan-50 px-2 py-1 text-sm font-bold text-cyan-700">
          Q' = {state.QBar}
        </span>
      </div>
      {state.warning ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
          {state.warning}
        </p>
      ) : null}
    </div>
  );
}

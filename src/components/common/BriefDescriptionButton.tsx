import { useMemo, useState } from "react";
import { getExplanationContent } from "../../explanations/explanationRegistry";
import type { ExplanationTopic } from "../../explanations/explanationTypes";
import ExplanationModal from "./ExplanationModal";

interface BriefDescriptionButtonProps {
  topic: ExplanationTopic;
  className?: string;
  label?: string;
}

export default function BriefDescriptionButton({
  topic,
  className,
  label = "Brief Description"
}: BriefDescriptionButtonProps) {
  const [open, setOpen] = useState(false);
  const content = useMemo(() => getExplanationContent(topic), [topic]);

  return (
    <>
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-cyan-400 hover:text-cyan-800 ${className ?? ""}`}
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current" aria-hidden>
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-5.5h-1.5V9.25h1.5v3.25zM10 7.75a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
        {label}
      </button>
      <ExplanationModal open={open} content={content} onClose={() => setOpen(false)} />
    </>
  );
}

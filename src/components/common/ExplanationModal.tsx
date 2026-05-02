import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import type { ExplanationContent } from "../../explanations/explanationTypes";

interface ExplanationModalProps {
  open: boolean;
  content: ExplanationContent;
  onClose: () => void;
}

export default function ExplanationModal({ open, content, onClose }: ExplanationModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">{content.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{content.shortSummary}</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-cyan-400"
                onClick={onClose}
              >
                Close
              </button>
            </div>

            <section className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Why This Makes Sense</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {content.whyItMakesSense.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>

            {content.steps && content.steps.length > 0 ? (
              <section className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Steps</h4>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                  {content.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>
            ) : null}

            {content.example ? (
              <section className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-cyan-700">Example</h4>
                <p className="mt-1 font-mono text-sm text-cyan-900">{content.example}</p>
              </section>
            ) : null}

            {content.commonMistakes && content.commonMistakes.length > 0 ? (
              <section className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Common Mistakes</h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {content.commonMistakes.map((mistake) => (
                    <li key={mistake}>{mistake}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

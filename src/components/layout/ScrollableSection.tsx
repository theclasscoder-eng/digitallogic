import type { ReactNode } from "react";

export interface ScrollableSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export default function ScrollableSection({
  title,
  children,
  className,
  contentClassName
}: ScrollableSectionProps) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/70 ${className ?? ""}`}
    >
      <div className="shrink-0 border-b border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
        {title}
      </div>
      <div
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pr-1 ${contentClassName ?? ""}`}
      >
        {children}
      </div>
    </section>
  );
}

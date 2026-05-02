import { getComponentDefinition } from "../../sequential/sequentialEvaluator";
import type { SequentialComponentType, SequentialState } from "../../sequential/sequentialTypes";

interface SequentialDiagramProps {
  componentType: SequentialComponentType;
  state: SequentialState;
}

function renderSrLatch(height: number) {
  return (
    <g>
      <rect x={230} y={80} width={180} height={90} rx={12} fill="#f8fafc" stroke="#1e293b" strokeWidth={2} />
      <rect x={230} y={210} width={180} height={90} rx={12} fill="#f8fafc" stroke="#1e293b" strokeWidth={2} />
      <text x={320} y={130} textAnchor="middle" className="fill-slate-700 text-[16px] font-bold">NOR</text>
      <text x={320} y={260} textAnchor="middle" className="fill-slate-700 text-[16px] font-bold">NOR</text>

      <line x1={80} y1={125} x2={230} y2={125} stroke="#334155" strokeWidth={2} />
      <line x1={80} y1={255} x2={230} y2={255} stroke="#334155" strokeWidth={2} />
      <text x={58} y={129} className="fill-slate-700 text-[14px] font-bold">S</text>
      <text x={58} y={259} className="fill-slate-700 text-[14px] font-bold">R</text>

      <line x1={410} y1={125} x2={560} y2={125} stroke="#334155" strokeWidth={2} />
      <line x1={410} y1={255} x2={560} y2={255} stroke="#334155" strokeWidth={2} />
      <text x={570} y={129} className="fill-emerald-700 text-[14px] font-bold">Q</text>
      <text x={570} y={259} className="fill-cyan-700 text-[14px] font-bold">Q'</text>

      <polyline points="410,125 470,125 470,210 230,210" fill="none" stroke="#0ea5e9" strokeWidth={1.8} />
      <polyline points="410,255 470,255 470,170 230,170" fill="none" stroke="#f59e0b" strokeWidth={1.8} />

      <text x={320} y={height - 24} textAnchor="middle" className="fill-slate-500 text-[12px] font-semibold">
        Cross-coupled NOR structure
      </text>
    </g>
  );
}

function renderGatedSr(height: number) {
  return (
    <g>
      <rect x={110} y={90} width={100} height={70} rx={8} fill="#ffffff" stroke="#1e293b" strokeWidth={1.8} />
      <rect x={110} y={220} width={100} height={70} rx={8} fill="#ffffff" stroke="#1e293b" strokeWidth={1.8} />
      <text x={160} y={132} textAnchor="middle" className="fill-slate-700 text-[13px] font-bold">AND</text>
      <text x={160} y={262} textAnchor="middle" className="fill-slate-700 text-[13px] font-bold">AND</text>

      <line x1={50} y1={120} x2={110} y2={120} stroke="#334155" strokeWidth={2} />
      <line x1={50} y1={250} x2={110} y2={250} stroke="#334155" strokeWidth={2} />
      <line x1={50} y1={185} x2={110} y2={185} stroke="#334155" strokeWidth={2} />
      <line x1={50} y1={185} x2={110} y2={285} stroke="#334155" strokeWidth={2} />
      <text x={28} y={124} className="fill-slate-700 text-[13px] font-bold">S</text>
      <text x={28} y={254} className="fill-slate-700 text-[13px] font-bold">R</text>
      <text x={22} y={189} className="fill-slate-700 text-[13px] font-bold">EN</text>

      <g transform="translate(180,0)">{renderSrLatch(height)}</g>

      <line x1={210} y1={120} x2={410} y2={120} stroke="#334155" strokeWidth={2} />
      <line x1={210} y1={250} x2={410} y2={250} stroke="#334155" strokeWidth={2} />
    </g>
  );
}

function renderDLatch(height: number) {
  return (
    <g>
      <rect x={80} y={120} width={110} height={70} rx={8} fill="#ffffff" stroke="#1e293b" strokeWidth={1.8} />
      <text x={135} y={162} textAnchor="middle" className="fill-slate-700 text-[13px] font-bold">NOT</text>

      <rect x={220} y={90} width={110} height={70} rx={8} fill="#ffffff" stroke="#1e293b" strokeWidth={1.8} />
      <rect x={220} y={220} width={110} height={70} rx={8} fill="#ffffff" stroke="#1e293b" strokeWidth={1.8} />
      <text x={275} y={132} textAnchor="middle" className="fill-slate-700 text-[13px] font-bold">AND</text>
      <text x={275} y={262} textAnchor="middle" className="fill-slate-700 text-[13px] font-bold">AND</text>

      <line x1={30} y1={110} x2={220} y2={110} stroke="#334155" strokeWidth={2} />
      <line x1={30} y1={110} x2={80} y2={155} stroke="#334155" strokeWidth={2} />
      <line x1={190} y1={155} x2={220} y2={240} stroke="#334155" strokeWidth={2} />
      <text x={14} y={114} className="fill-slate-700 text-[13px] font-bold">D</text>

      <line x1={30} y1={185} x2={220} y2={185} stroke="#334155" strokeWidth={2} />
      <line x1={30} y1={185} x2={220} y2={285} stroke="#334155" strokeWidth={2} />
      <text x={10} y={189} className="fill-slate-700 text-[13px] font-bold">EN</text>

      <line x1={330} y1={110} x2={410} y2={110} stroke="#334155" strokeWidth={2} />
      <line x1={330} y1={240} x2={410} y2={240} stroke="#334155" strokeWidth={2} />

      <g transform="translate(180,0)">{renderSrLatch(height)}</g>

      <text x={350} y={height - 24} textAnchor="middle" className="fill-slate-500 text-[12px] font-semibold">
        D and D' feed gated SR core when Enable is active.
      </text>
    </g>
  );
}

function renderBlock(title: string, showClock: boolean, height: number) {
  return (
    <g>
      <rect x={220} y={90} width={260} height={220} rx={16} fill="#f8fafc" stroke="#1e293b" strokeWidth={2.2} />
      <text x={350} y={155} textAnchor="middle" className="fill-slate-800 text-[24px] font-extrabold">{title}</text>
      <text x={350} y={180} textAnchor="middle" className="fill-slate-500 text-[12px] font-semibold">Sequential block</text>

      <line x1={80} y1={140} x2={220} y2={140} stroke="#334155" strokeWidth={2} />
      <line x1={80} y1={210} x2={220} y2={210} stroke="#334155" strokeWidth={2} />
      <text x={52} y={144} className="fill-slate-700 text-[13px] font-bold">Input</text>
      <text x={44} y={214} className="fill-slate-700 text-[13px] font-bold">Control</text>

      {showClock ? (
        <g>
          <line x1={330} y1={350} x2={330} y2={310} stroke="#334155" strokeWidth={2} />
          <polygon points="320,310 340,310 330,296" fill="#334155" />
          <text x={310} y={372} className="fill-slate-700 text-[12px] font-bold">CLK</text>
        </g>
      ) : null}

      <line x1={480} y1={160} x2={620} y2={160} stroke="#334155" strokeWidth={2} />
      <line x1={480} y1={240} x2={620} y2={240} stroke="#334155" strokeWidth={2} />
      <text x={632} y={164} className="fill-emerald-700 text-[14px] font-bold">Q</text>
      <text x={632} y={244} className="fill-cyan-700 text-[14px] font-bold">Q'</text>

      <text x={350} y={height - 28} textAnchor="middle" className="fill-slate-500 text-[12px] font-semibold">
        Edge behavior and hold behavior are shown in the table and waveform.
      </text>
    </g>
  );
}

export default function SequentialDiagram({ componentType, state }: SequentialDiagramProps) {
  const definition = getComponentDefinition(componentType);
  const width = 760;
  const height = 400;

  return (
    <div className="overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[700px] w-full">
        {componentType === "SR_LATCH" ? renderSrLatch(height) : null}
        {componentType === "GATED_SR_LATCH" ? renderGatedSr(height) : null}
        {componentType === "D_LATCH" ? renderDLatch(height) : null}
        {componentType === "D_FLIP_FLOP" ? renderBlock("D Flip-Flop", true, height) : null}
        {componentType === "JK_FLIP_FLOP" ? renderBlock("JK Flip-Flop", true, height) : null}
        {componentType === "T_FLIP_FLOP" ? renderBlock("T Flip-Flop", true, height) : null}

        <rect x={18} y={16} width={180} height={56} rx={10} fill="#ecfeff" stroke="#0ea5e9" strokeWidth={1.4} />
        <text x={108} y={40} textAnchor="middle" className="fill-cyan-800 text-[12px] font-bold">{definition.label}</text>
        <text x={108} y={60} textAnchor="middle" className="fill-cyan-700 text-[12px] font-mono">
          Q={state.Q}  Q'={state.QBar}
        </text>
      </svg>
    </div>
  );
}

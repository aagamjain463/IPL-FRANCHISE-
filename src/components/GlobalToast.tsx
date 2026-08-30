import React from 'react';
import { useGame } from '../context/GameContext';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

/** Global feedback toast rendered once inside GameProvider. */
export const GlobalToast: React.FC = () => {
  const { toast } = useGame();

  if (!toast) return null;

  const toneStyles = {
    info: 'border-cyan-500/40 bg-[#07131f]/95 text-cyan-200',
    success: 'border-[#00FF87]/50 bg-[#05170e]/95 text-emerald-200',
    warn: 'border-amber-500/50 bg-[#1a1206]/95 text-amber-200',
    danger: 'border-rose-500/50 bg-[#1c0710]/95 text-rose-200'
  }[toast.tone || 'info'];

  const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'danger' ? XCircle : toast.tone === 'warn' ? AlertTriangle : Info;

  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] w-[92vw] max-w-md animate-toast-in pointer-events-none"
    >
      <span className={`${toneStyles} w-full flex items-start gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md`}>
        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
        <span className="text-xs font-semibold leading-snug">{toast.message}</span>
      </span>
    </div>
  );
};

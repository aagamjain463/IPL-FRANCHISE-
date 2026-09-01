import React from 'react';

interface ProgressBarProps {
  value: number;
  tone?: 'gold' | 'volt' | 'cyan' | 'ruby';
}

const toneMap = {
  gold: 'from-[#FFE27D] via-[#D4AF37] to-[#B8871F]',
  volt: 'from-[#00FF87] via-[#00E5FF] to-[#10B981]',
  cyan: 'from-[#00E5FF] via-[#3B82F6] to-[#8B5CF6]',
  ruby: 'from-[#FF1E56] via-[#F97316] to-[#FFE27D]'
};

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, tone = 'volt' }) => {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="fc-bar h-3 rounded-full overflow-hidden bg-black/70 border border-white/15">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${toneMap[tone]} transition-[width] duration-150 ease-out shadow-[0_0_28px_rgba(0,255,135,.35)]`}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
};

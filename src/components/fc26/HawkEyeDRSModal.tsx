import React, { useState, useEffect } from 'react';
import { HawkEyeDRSReview } from '../../types/fc26';
import { generateHawkEyeReview } from '../../engine/fc26Engine';
import { Activity, Shield, CheckCircle2, XCircle, AlertTriangle, ChevronRight, X, Volume2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface HawkEyeDRSModalProps {
  review?: HawkEyeDRSReview;
  batterName?: string;
  bowlerName?: string;
  reviewType?: 'LBW' | 'Caught Behind' | 'Stumping';
  originalDecision?: 'Out' | 'Not Out';
  onComplete?: (review: HawkEyeDRSReview) => void;
  onClose: () => void;
}

export const HawkEyeDRSModal: React.FC<HawkEyeDRSModalProps> = ({
  review: customReview,
  batterName = 'Batter',
  bowlerName = 'Bowler',
  reviewType = 'LBW',
  originalDecision = 'Out',
  onComplete,
  onClose
}) => {
  const [review] = useState<HawkEyeDRSReview>(() => 
    customReview || generateHawkEyeReview(
      batterName, 
      bowlerName, 
      reviewType as 'LBW' | 'Caught Behind' | 'Stumping', 
      originalDecision as 'Out' | 'Not Out'
    )
  );

  // Animation Stage: 0: UltraEdge, 1: Pitching, 2: Impact, 3: Wickets / Final Decision
  const [stage, setStage] = useState<number>(0);
  const [soundWaveTime, setSoundWaveTime] = useState<number>(0);

  useEffect(() => {
    // Sound wave ticker
    const interval = setInterval(() => {
      setSoundWaveTime(prev => prev + 1);
    }, 100);

    // Timeline steps
    const t1 = setTimeout(() => setStage(1), 1800);
    const t2 = setTimeout(() => setStage(2), 3400);
    const t3 = setTimeout(() => {
      setStage(3);
      if (review.finalDecision === 'OUT') {
        try {
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
        } catch {}
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [review]);

  const handleFinish = () => {
    onComplete(review);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 select-none animate-fade-in">
      
      {/* Broadcast TV Style Header */}
      <div className="relative w-full max-w-3xl rounded-3xl bg-[#070b14] border border-blue-500/30 overflow-hidden shadow-2xl flex flex-col">
        
        {/* Top TV Bar */}
        <div className="p-4 bg-[#0a101f] border-b border-blue-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-md bg-blue-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-1.5 shadow">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>HAWK-EYE 3D DRS</span>
            </div>
            <div className="text-xs font-bold text-slate-300">
              {review.reviewType} REVIEW • <span className="text-amber-400">{review.batterName}</span> vs <span className="text-cyan-400">{review.bowlerName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              ORIGINAL: {review.originalOnFieldDecision.toUpperCase()}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAIN VISUALIZER SCREEN */}
        <div className="p-6 flex flex-col items-center justify-center space-y-6">
          
          {/* 1. ULTRA-EDGE SOUNDWAVE GRAPH */}
          <div className="w-full p-4 rounded-2xl bg-[#04060a] border border-[#1e293b] flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-cyan-400">
                <Volume2 className="w-4 h-4" />
                <span>Ultra-Edge Real-Time Frequency Wave</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                RADAR SPEED: {review.ballSpeedKmph} KM/H
              </span>
            </div>

            {/* Sound Wave Canvas Bars */}
            <div className="w-full h-24 flex items-center justify-center gap-1 overflow-hidden px-4 bg-black/60 rounded-xl border border-cyan-950/50">
              {Array.from({ length: 48 }).map((_, idx) => {
                const isCenterSpike = idx >= 22 && idx <= 26 && review.snickoSpikeOccurred;
                const heightPercent = isCenterSpike 
                  ? Math.min(95, 60 + Math.sin((soundWaveTime + idx) * 2) * 35)
                  : Math.max(10, Math.sin((soundWaveTime + idx) * 0.8) * 25 + 15);

                return (
                  <div
                    key={idx}
                    className={`w-1.5 rounded-full transition-all duration-75 ${
                      isCenterSpike 
                        ? 'bg-gradient-to-t from-red-500 via-amber-400 to-yellow-200 shadow-[0_0_10px_rgba(239,68,68,0.8)]' 
                        : 'bg-gradient-to-t from-cyan-900 to-cyan-400 opacity-60'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                );
              })}
            </div>

            <div className="text-[11px] font-bold mt-2 text-slate-300">
              {review.snickoSpikeOccurred ? (
                <span className="text-red-400 font-black">⚠️ SPIKE DETECTED — CLEAR BAT / GLOVE CONTACT</span>
              ) : (
                <span className="text-emerald-400 font-black">✅ FLAT LINE — NO BAT INVOLVEMENT DETECTED</span>
              )}
            </div>
          </div>

          {/* 2. LBW BALL-TRACKING 3D TELEMETRY (If LBW) */}
          {review.reviewType === 'LBW' && (
            <div className="w-full grid grid-cols-3 gap-3">
              
              {/* Pitching */}
              <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-300 ${
                stage >= 1 
                  ? review.pitching === 'In Line' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' : 'bg-red-950/40 border-red-500 text-red-400'
                  : 'bg-[#0f172a] border-[#1e293b] opacity-40 text-slate-500'
              }`}>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">1. PITCHING</span>
                <span className="text-sm font-black mt-1 font-mono-sport">
                  {stage >= 1 ? review.pitching.toUpperCase() : 'ANALYZING...'}
                </span>
                {stage >= 1 && (
                  review.pitching === 'In Line' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-1" /> : <XCircle className="w-5 h-5 text-red-400 mt-1" />
                )}
              </div>

              {/* Impact */}
              <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-300 ${
                stage >= 2 
                  ? review.impact === 'In Line' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' : 'bg-red-950/40 border-red-500 text-red-400'
                  : 'bg-[#0f172a] border-[#1e293b] opacity-40 text-slate-500'
              }`}>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">2. IMPACT</span>
                <span className="text-sm font-black mt-1 font-mono-sport">
                  {stage >= 2 ? review.impact.toUpperCase() : 'ANALYZING...'}
                </span>
                {stage >= 2 && (
                  review.impact === 'In Line' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-1" /> : <XCircle className="w-5 h-5 text-red-400 mt-1" />
                )}
              </div>

              {/* Wickets */}
              <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-300 ${
                stage >= 3 
                  ? review.wickets === 'Hitting' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' : review.wickets === "Umpire's Call" ? 'bg-amber-950/40 border-amber-500 text-amber-400' : 'bg-red-950/40 border-red-500 text-red-400'
                  : 'bg-[#0f172a] border-[#1e293b] opacity-40 text-slate-500'
              }`}>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">3. WICKETS</span>
                <span className="text-sm font-black mt-1 font-mono-sport">
                  {stage >= 3 ? review.wickets.toUpperCase() : 'ANALYZING...'}
                </span>
                {stage >= 3 && (
                  review.wickets === 'Hitting' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-1" /> : review.wickets === "Umpire's Call" ? <AlertTriangle className="w-5 h-5 text-amber-400 mt-1" /> : <XCircle className="w-5 h-5 text-red-400 mt-1" />
                )}
              </div>

            </div>
          )}

          {/* 3. 3RD UMPIRE DIALOGUE TICKER */}
          <div className="w-full p-3 rounded-xl bg-[#0c1220] border border-[#1e293b] text-left font-mono text-[11px] text-slate-300 space-y-1">
            <div className="text-[10px] font-bold text-amber-400 uppercase">
              🎙️ TV Umpire Audio Feed:
            </div>
            {review.thirdUmpireDialogues.map((line, i) => (
              <div key={i} className="leading-snug text-slate-300">
                • "{line}"
              </div>
            ))}
          </div>

          {/* FINAL DECISION BROADCAST GRAPHIC */}
          {stage >= 3 && (
            <div className="w-full flex flex-col items-center animate-scale-up">
              <div className={`px-8 py-3 rounded-2xl font-black text-2xl uppercase tracking-widest shadow-2xl border flex items-center gap-3 ${
                review.finalDecision === 'OUT'
                  ? 'bg-red-600 text-white border-red-400 shadow-red-600/50'
                  : 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-600/50'
              }`}>
                <span>DECISION: {review.finalDecision}</span>
                {review.isOverturned && (
                  <span className="text-xs px-2 py-1 rounded bg-black/40 text-amber-300 font-bold border border-amber-300/30">
                    OVERTURNED
                  </span>
                )}
              </div>

              <button
                id="btn-confirm-drs-decision"
                onClick={handleFinish}
                className="mt-4 px-8 py-3 rounded-full bg-[#D4AF37] hover:bg-[#e5c158] text-black font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform shadow-xl shadow-[#D4AF37]/30 cursor-pointer"
              >
                Return to Match Broadcast
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

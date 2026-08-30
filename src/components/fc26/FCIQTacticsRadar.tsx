import React, { useState } from 'react';
import { FCIQTacticPreset, FCPositionPlacement } from '../../types/fc26';
import { FC_IQ_PRESETS } from '../../engine/fc26Engine';
import { Shield, Sparkles, Sliders, CheckCircle2, RotateCcw, Crosshair, Users, Activity } from 'lucide-react';

interface FCIQTacticsRadarProps {
  onApplyTactics?: (preset: FCIQTacticPreset) => void;
  className?: string;
}

export const FCIQTacticsRadar: React.FC<FCIQTacticsRadarProps> = ({
  onApplyTactics,
  className = ''
}) => {
  const [selectedPreset, setSelectedPreset] = useState<FCIQTacticPreset>(FC_IQ_PRESETS[0]);
  const [positions, setPositions] = useState<FCPositionPlacement[]>(FC_IQ_PRESETS[0].defaultPositions);
  const [selectedFielderId, setSelectedFielderId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const handleSelectPreset = (preset: FCIQTacticPreset) => {
    setSelectedPreset(preset);
    setPositions([...preset.defaultPositions]);
    setIsSaved(false);
  };

  const handlePitchClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedFielderId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(8, Math.min(92, ((e.clientY - rect.top) / rect.height) * 100));

    // Determine zone
    const distFromCenter = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(y - 50, 2));
    const zone = distFromCenter > 32 ? 'Deep Boundary' : distFromCenter < 12 ? 'Close In' : 'Inner Ring';

    setPositions(prev => prev.map(p => {
      if (p.id === selectedFielderId) {
        return { ...p, x, y, zone };
      }
      return p;
    }));

    setSelectedFielderId(null);
    setIsSaved(false);
  };

  const calculateCatchConversion = () => {
    const boundaryCount = positions.filter(p => p.zone === 'Deep Boundary').length;
    const ringCount = positions.filter(p => p.zone === 'Inner Ring').length;
    return Math.min(98, 65 + (boundaryCount * 3) + (ringCount * 2));
  };

  const calculateDotBallSqueeze = () => {
    const ringCount = positions.filter(p => p.zone === 'Inner Ring').length;
    return Math.min(95, 50 + (ringCount * 6));
  };

  const handleSaveAndApply = () => {
    setIsSaved(true);
    if (onApplyTactics) {
      onApplyTactics({
        ...selectedPreset,
        defaultPositions: positions
      });
    }
  };

  return (
    <div className={`p-5 rounded-2xl bg-[#090d16] border border-[#1e293b] text-white shadow-2xl flex flex-col lg:flex-row gap-6 ${className}`}>
      
      {/* LEFT: 3D Ground & Field Radar Canvas */}
      <div className="flex-1 flex flex-col items-center">
        
        {/* Radar Controls Header */}
        <div className="w-full flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37]">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 font-heading">
                FC IQ Tactical Ground Radar
              </h3>
              <span className="text-[10px] text-slate-400">
                {selectedFielderId ? 'Click on the ground to re-position selected fielder' : 'Select any fielder dot to adjust coordinates'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
              9 Fielders Active
            </span>
          </div>
        </div>

        {/* Cricket Ground Radar Oval */}
        <div 
          onClick={handlePitchClick}
          className="relative w-full max-w-[420px] aspect-square rounded-full border-2 border-emerald-500/30 p-4 flex items-center justify-center cursor-crosshair overflow-hidden shadow-2xl"
          style={{
            background: 'radial-gradient(circle at 50% 50%, #064e3b 0%, #022c22 65%, #021a14 100%)'
          }}
        >
          {/* Outer Boundary Ropes Ring */}
          <div className="absolute inset-2 rounded-full border border-dashed border-emerald-400/40 pointer-events-none" />

          {/* 30-Yard Inner Circle */}
          <div className="absolute w-[60%] h-[60%] rounded-full border border-white/25 pointer-events-none flex items-center justify-center">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest pointer-events-none">
              30-YARD RING
            </span>
          </div>

          {/* Pitch Strip Center */}
          <div className="absolute w-7 h-28 rounded-xs bg-amber-700/80 border border-amber-500/60 shadow-inner flex flex-col justify-between py-1 items-center pointer-events-none">
            {/* Bowling Crease Stumps */}
            <div className="w-4 h-1 bg-white rounded-xs" />
            <span className="text-[7px] font-mono text-amber-200 uppercase transform -rotate-90">22 YDS</span>
            {/* Batting Crease Stumps */}
            <div className="w-4 h-1 bg-white rounded-xs" />
          </div>

          {/* Interactive Fielders Markers */}
          {positions.map((pos) => {
            const isSelected = selectedFielderId === pos.id;
            return (
              <div
                key={pos.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFielderId(isSelected ? null : pos.id);
                }}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                className={`absolute z-30 flex flex-col items-center group cursor-pointer transition-all duration-150 ${isSelected ? 'scale-125 z-40' : 'hover:scale-110'}`}
              >
                <div 
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shadow-lg border ${
                    isSelected 
                      ? 'bg-amber-400 text-black border-white animate-bounce ring-4 ring-amber-400/40' 
                      : pos.zone === 'Deep Boundary'
                        ? 'bg-blue-500 text-white border-blue-200'
                        : pos.zone === 'Slip Cordon'
                          ? 'bg-purple-500 text-white border-purple-200'
                          : 'bg-emerald-400 text-black border-emerald-100'
                  }`}
                >
                  {pos.name.slice(0, 1)}
                </div>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 whitespace-nowrap drop-shadow ${
                  isSelected ? 'bg-amber-400 text-black' : 'bg-black/75 text-slate-200'
                }`}>
                  {pos.name}
                </span>
              </div>
            );
          })}

        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Inner Ring (Cut 1s)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Deep Boundary</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Slip Cordon</span>
          </div>
        </div>

      </div>

      {/* RIGHT: FC IQ Tactical Presets & Analytics Engine */}
      <div className="w-full lg:w-80 flex flex-col justify-between">
        
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 fill-amber-400" />
              <span>FC IQ Tactical Archetypes</span>
            </h4>
            <span className="text-[10px] font-mono text-slate-400">{selectedPreset.code}</span>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2 mb-4">
            {FC_IQ_PRESETS.map((preset) => {
              const isActive = selectedPreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-[#131d35] border-amber-400/80 shadow-[0_0_15px_rgba(212,175,55,0.2)] text-white'
                      : 'bg-[#0f172a] border-[#1e293b] hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black">{preset.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${isActive ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-400'}`}>
                        {preset.mentality}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                      {preset.description}
                    </p>
                  </div>
                  {isActive && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* FC IQ Tactical Telemetry Metrics */}
          <div className="p-3.5 rounded-xl bg-[#0c1220] border border-[#1e293b] space-y-2.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>FC IQ Telemetry Index</span>
              <span className="text-amber-400">OPTIMIZED</span>
            </div>

            {/* Metric 1: Catch Conversion */}
            <div>
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-slate-300">Catch Conversion Rate</span>
                <span className="text-emerald-400 font-mono">{calculateCatchConversion()}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${calculateCatchConversion()}%` }} />
              </div>
            </div>

            {/* Metric 2: Dot Ball Squeeze */}
            <div>
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-slate-300">Dot Ball Pressure Squeeze</span>
                <span className="text-cyan-400 font-mono">{calculateDotBallSqueeze()}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all duration-300" style={{ width: `${calculateDotBallSqueeze()}%` }} />
              </div>
            </div>

            <div className="text-[10px] text-amber-300/90 pt-1 border-t border-slate-800">
              ⚡ Synergy Boost: <span className="font-bold">{selectedPreset.keyPlayStyleSynergy}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4">
          <button
            id="btn-apply-fciq-tactics"
            onClick={handleSaveAndApply}
            className="w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#e5c158] text-black font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Sliders className="w-4 h-4" />}
            <span>{isSaved ? 'Tactics Locked & Deployed' : 'Deploy FC IQ Field'}</span>
          </button>
        </div>

      </div>

    </div>
  );
};

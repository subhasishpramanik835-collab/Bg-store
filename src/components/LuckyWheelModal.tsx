import React, { useState } from 'react';
import { X, Dices, Trophy, Sparkles, Gift } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface LuckyWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimReward: (rewardAmount: number) => void;
  lastSpinTime?: number;
}

const WHEEL_SECTORS = [
  { label: '₹50', amount: 50, color: '#D4AF37' },
  { label: '₹100', amount: 100, color: '#059669' },
  { label: '₹250', amount: 250, color: '#2563EB' },
  { label: '₹500', amount: 500, color: '#7C3AED' },
  { label: '₹1,000', amount: 1000, color: '#DB2777' },
  { label: '₹2,500', amount: 2500, color: '#EA580C' },
  { label: '₹100', amount: 100, color: '#059669' },
  { label: '₹5,000', amount: 5000, color: '#EAB308' }
];

export const LuckyWheelModal: React.FC<LuckyWheelModalProps> = ({
  isOpen,
  onClose,
  onClaimReward,
  lastSpinTime
}) => {
  const [spinning, setSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [wonReward, setWonReward] = useState<number | null>(null);

  if (!isOpen) return null;

  const now = Date.now();
  const COOLDOWN_MS = 24 * 3600 * 1000; // 24 hours cooldown
  const canSpin = !lastSpinTime || now - lastSpinTime > COOLDOWN_MS;

  const handleSpin = () => {
    if (spinning || (!canSpin && wonReward === null)) return;

    soundFx.playClick();
    setSpinning(true);
    setWonReward(null);

    // Random sector index
    const winningIdx = Math.floor(Math.random() * WHEEL_SECTORS.length);
    const reward = WHEEL_SECTORS[winningIdx].amount;

    // Calculate degrees: 360 / sectors = 45 deg per sector
    const sectorDeg = 360 / WHEEL_SECTORS.length;
    // Add extra rotations (e.g. 5 full spins = 1800 deg) + offset
    const extraDegrees = 360 * 5 + (360 - winningIdx * sectorDeg - sectorDeg / 2);
    const newRotation = rotation + extraDegrees;

    setRotation(newRotation);

    // Play tick sound periodically
    const tickInterval = setInterval(() => {
      soundFx.playSpinTick();
    }, 150);

    setTimeout(() => {
      clearInterval(tickInterval);
      setSpinning(false);
      setWonReward(reward);
      soundFx.playWinFanfare();
      onClaimReward(reward);
    }, 4500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Dices className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white font-mono">Daily Lucky Spin Wheel</h2>
              <p className="text-[10px] text-amber-400/80">Spin to Win Free Bonus Cash!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center space-y-6 flex flex-col items-center">
          
          {/* Wheel Graphic Container */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            
            {/* Pointer / Needle */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 drop-shadow-[0_4px_8px_rgba(245,158,11,0.8)]"></div>

            {/* Rotating SVG Wheel */}
            <div
              className="w-full h-full rounded-full border-4 border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-transform ease-out"
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: spinning ? '4.5s' : '0s'
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full rounded-full overflow-hidden">
                {WHEEL_SECTORS.map((sector, i) => {
                  const angle = 360 / WHEEL_SECTORS.length;
                  const startAngle = i * angle;
                  const endAngle = (i + 1) * angle;

                  const x1 = 50 + 50 * Math.cos((Math.PI * (startAngle - 90)) / 180);
                  const y1 = 50 + 50 * Math.sin((Math.PI * (startAngle - 90)) / 180);
                  const x2 = 50 + 50 * Math.cos((Math.PI * (endAngle - 90)) / 180);
                  const y2 = 50 + 50 * Math.sin((Math.PI * (endAngle - 90)) / 180);

                  const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

                  return (
                    <g key={i}>
                      <path d={pathData} fill={sector.color} opacity="0.9" stroke="#0f172a" strokeWidth="0.5" />
                      <text
                        x="50"
                        y="18"
                        fill="#ffffff"
                        fontSize="6"
                        fontWeight="900"
                        textAnchor="middle"
                        transform={`rotate(${startAngle + angle / 2}, 50, 50)`}
                      >
                        {sector.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Center Cap Button */}
            <div className="absolute w-14 h-14 rounded-full bg-slate-950 border-2 border-amber-400 shadow-xl flex items-center justify-center z-10">
              <Gift className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>

          </div>

          {/* Reward Banner if Won */}
          {wonReward !== null && (
            <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl animate-bounce">
              <h4 className="text-xl font-black text-white font-mono flex items-center justify-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                CONGRATS! YOU WON ₹{wonReward}!
              </h4>
              <p className="text-xs text-emerald-300">Added to your wallet balance instantly.</p>
            </div>
          )}

          {/* Spin Trigger Button */}
          <button
            onClick={handleSpin}
            disabled={spinning || (!canSpin && wonReward === null)}
            className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
              canSpin || wonReward !== null
                ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/20 hover:scale-105 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {spinning
                ? 'SPINNING THE LUCKY WHEEL...'
                : canSpin
                ? 'SPIN NOW (FREE)'
                : 'ALREADY SPUN TODAY (BACK TOMORROW)'}
            </span>
          </button>

        </div>

      </div>
    </div>
  );
};

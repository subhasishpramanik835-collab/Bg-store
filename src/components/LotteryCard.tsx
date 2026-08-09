import React, { useState, useEffect } from 'react';
import { Trophy, Ticket, Sparkles, Clock, ArrowRight, Flame } from 'lucide-react';
import { LotteryDraw } from '../types';
import { soundFx } from '../utils/audio';

interface LotteryCardProps {
  draw: LotteryDraw;
  onBuyTicket: (draw: LotteryDraw) => void;
  compact?: boolean;
}

export const LotteryCard: React.FC<LotteryCardProps> = ({ draw, onBuyTicket, compact = true }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });
  const [isOpen, setIsOpen] = useState<boolean>(true);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, draw.endTime - now);
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
      setIsOpen(diff > 0);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [draw.endTime]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="relative group bg-slate-900/95 border border-amber-500/30 hover:border-amber-400 rounded-2xl p-2.5 sm:p-3.5 shadow-lg shadow-black/60 transition-all duration-200 hover:scale-[1.02] overflow-hidden flex flex-col justify-between">
      
      {/* Top Banner Accent Line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${draw.bannerGradient}`}></div>

      {/* Background Subtle Glow */}
      <div className="absolute -right-8 -top-8 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all"></div>

      <div>
        {/* Top Header Row: Category Badge + Status */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="bg-amber-500/10 border border-amber-500/30 text-amber-300 font-extrabold text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 truncate max-w-[60%]">
            <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
            <span className="truncate">{draw.badgeText || draw.category}</span>
          </span>

          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
            isOpen
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800 animate-pulse'
              : 'bg-rose-950/80 text-rose-300 border-rose-800'
          }`}>
            {isOpen ? 'OPEN' : 'CLOSED'}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xs sm:text-sm font-black text-white font-mono tracking-tight group-hover:text-amber-300 transition-colors line-clamp-1 leading-snug">
          {draw.title}
        </h3>

        {/* Issue / Period number badge */}
        <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono mb-2 flex items-center justify-between">
          <span className="text-slate-500">Period: #{draw.id.slice(-6).toUpperCase()}</span>
          <div className="flex items-center gap-1 text-amber-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
            <Clock className="w-2.5 h-2.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}</span>
          </div>
        </div>

        {/* Jackpot / First Prize Highlight Box */}
        <div className="p-2 sm:p-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 rounded-xl border border-amber-500/20 mb-2.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-amber-400/80 tracking-wider block">
                1st Prize
              </span>
              <span className="text-sm sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 font-mono">
                ₹{draw.firstPrize.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Price & Buy Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-400 uppercase font-medium">Ticket</span>
          <span className="text-xs sm:text-sm font-black text-amber-300 font-mono">₹{draw.ticketPrice}</span>
        </div>

        <button
          onClick={() => {
            soundFx.playClick();
            onBuyTicket(draw);
          }}
          disabled={!isOpen}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-[10px] sm:text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
            !isOpen ? 'opacity-50 cursor-not-allowed grayscale' : ''
          }`}
        >
          <Ticket className="w-3 h-3" />
          <span>PLAY</span>
          <ArrowRight className="w-3 h-3 stroke-[3]" />
        </button>
      </div>

    </div>
  );
};

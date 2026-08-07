import React, { useState, useEffect } from 'react';
import { Trophy, Ticket, Sparkles, Clock, ArrowRight, Zap } from 'lucide-react';
import { LotteryDraw } from '../types';
import { soundFx } from '../utils/audio';

interface LotteryCardProps {
  draw: LotteryDraw;
  onBuyTicket: (draw: LotteryDraw) => void;
}

export const LotteryCard: React.FC<LotteryCardProps> = ({ draw, onBuyTicket }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, draw.endTime - now);
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [draw.endTime]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="relative group bg-slate-900/90 border border-amber-500/30 hover:border-amber-400 rounded-3xl p-5 shadow-xl shadow-black/60 transition-all duration-300 hover:scale-[1.01] overflow-hidden flex flex-col justify-between">
      
      {/* Top Banner Accent */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${draw.bannerGradient}`}></div>

      {/* Background Subtle Glow */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all"></div>

      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-3">
          <span className="bg-amber-500/10 border border-amber-500/30 text-amber-300 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            {draw.badgeText}
          </span>
          <div className="flex items-center gap-1 bg-slate-950/80 px-2.5 py-1 rounded-full border border-slate-800 text-[11px] font-mono font-bold text-amber-400">
            <Clock className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>
              {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
            </span>
          </div>
        </div>

        {/* Title & Subtitle */}
        <h3 className="text-lg font-black text-white font-mono tracking-tight group-hover:text-amber-300 transition-colors">
          {draw.title}
        </h3>
        <p className="text-xs text-slate-400 mb-4 line-clamp-1">{draw.subtitle}</p>

        {/* Jackpot / First Prize Highlight Box */}
        <div className="p-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 rounded-2xl border border-amber-500/20 mb-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-400/80 tracking-wider block">
                1st Prize Guaranteed
              </span>
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 font-mono">
                ₹{draw.firstPrize.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
              <Trophy className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-5 font-mono">
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">Prize Pool</span>
            <span className="font-bold text-emerald-400">₹{draw.prizePool.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">Tickets Sold</span>
            <span className="font-bold text-slate-200">{draw.totalTicketsSold.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Buy CTA Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Ticket Price</span>
          <span className="text-lg font-black text-amber-300 font-mono">₹{draw.ticketPrice}</span>
        </div>

        <button
          onClick={() => {
            soundFx.playClick();
            onBuyTicket(draw);
          }}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <Ticket className="w-4 h-4" />
          <span>BUY TICKET</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
        </button>
      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { Flame, Sparkles, Filter, Trophy, Zap } from 'lucide-react';
import { LotteryDraw } from '../types';
import { LotteryCard } from './LotteryCard';

interface LotterySectionProps {
  draws: LotteryDraw[];
  onBuyTicket: (draw: LotteryDraw) => void;
}

export const LotterySection: React.FC<LotterySectionProps> = ({ draws, onBuyTicket }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Bumper', 'Speed 1m', 'Daily Mega', '4D Express'];

  const filteredDraws = selectedCategory === 'All'
    ? draws
    : draws.filter(d => d.category === selectedCategory || d.badgeText?.includes(selectedCategory));

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 pb-24 font-sans">
      
      {/* Section Header */}
      <div className="bg-slate-900/90 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20 shrink-0">
            <Flame className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white font-mono tracking-tight flex items-center gap-2">
              <span>Lottery</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-sans">
                {draws.length} Live
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Select a lottery card below to pick numbers and enter draw
            </p>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* SINGLE COMPACT GRID FOR ALL LOTTERIES */}
      {/* Mobile: 2 per row | Tablet: 3 per row | Desktop: 4-5 per row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {filteredDraws.map((draw) => (
          <LotteryCard
            key={draw.id}
            draw={draw}
            onBuyTicket={onBuyTicket}
            compact={true}
          />
        ))}
      </div>

      {filteredDraws.length === 0 && (
        <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-500 text-xs font-bold">
          No lotteries currently active under this category.
        </div>
      )}

    </div>
  );
};

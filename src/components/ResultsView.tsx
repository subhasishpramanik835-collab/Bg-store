import React, { useState } from 'react';
import { Award, Search, Trophy, Sparkles, Calendar, ArrowUpRight } from 'lucide-react';
import { LotteryDraw } from '../types';

interface ResultsViewProps {
  draws: LotteryDraw[];
  onOpenBuyTicket: (draw: LotteryDraw) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ draws, onOpenBuyTicket }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const sampleResults = [
    {
      drawId: 'draw-bumper-099',
      title: 'BETGURU BUMPER LAKHPATI #099',
      date: new Date(Date.now() - 3600000 * 3).toLocaleString('en-IN'),
      winningNumbers: [4, 8, 2, 9, 1, 0],
      firstPrize: 100000,
      totalWinners: 42
    },
    {
      drawId: 'draw-speed-776',
      title: 'GOLDEN 777 SPEED EXPRESS #776',
      date: new Date(Date.now() - 3600000 * 1).toLocaleString('en-IN'),
      winningNumbers: [7, 7, 2, 9],
      firstPrize: 10000,
      totalWinners: 18
    },
    {
      drawId: 'draw-mega-045',
      title: 'MEGA CROREPATI DRAWS #045',
      date: new Date(Date.now() - 3600000 * 24).toLocaleString('en-IN'),
      winningNumbers: [9, 1, 5, 2, 8, 3],
      firstPrize: 1000000,
      totalWinners: 120
    }
  ];

  const filteredResults = sampleResults.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.drawId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.winningNumbers.join('').includes(searchTerm)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-amber-500/20 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <Award className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-mono">Official Lottery Results</h1>
            <p className="text-xs text-slate-400">Verified winning numbers & prize distribution history</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search draw ID or digits..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white font-mono text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all"
          />
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {filteredResults.map((res) => (
          <div
            key={res.drawId}
            className="bg-slate-900/90 border border-amber-500/20 hover:border-amber-400/40 rounded-3xl p-5 shadow-xl transition-all"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    {res.drawId}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {res.date}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white font-mono">{res.title}</h3>
              </div>

              {/* Winning Digits Display */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-amber-500/30 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="flex items-center gap-1.5">
                  {res.winningNumbers.map((digit, idx) => (
                    <span
                      key={idx}
                      className="w-8 h-9 bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 font-black font-mono text-base rounded-lg flex items-center justify-center shadow-md"
                    >
                      {digit}
                    </span>
                  ))}
                </div>
              </div>

              {/* Prize & Action */}
              <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                <div className="text-left md:text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-sans block">1st Prize Winner</span>
                  <span className="text-base font-black text-emerald-400 font-mono">₹{res.firstPrize.toLocaleString('en-IN')}</span>
                </div>

                <button
                  onClick={() => onOpenBuyTicket(draws[0])}
                  className="px-4 py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1 border border-slate-700"
                >
                  <span>Play Next Draw</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { Award, Search, Trophy, Sparkles, Calendar, ArrowUpRight, Zap, ShieldCheck } from 'lucide-react';
import { LotteryDraw, SuperCarDrawIssue, SuperCarConfig } from '../types';
import { getSuperCarInfo } from '../utils/supercar';

interface ResultsViewProps {
  draws: LotteryDraw[];
  onOpenBuyTicket: (draw: LotteryDraw) => void;
  supercarPastDraws?: SuperCarDrawIssue[];
  supercarConfig?: SuperCarConfig;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  draws,
  onOpenBuyTicket,
  supercarPastDraws = [],
  supercarConfig
}) => {
  const [activeTab, setActiveTab] = useState<'supercar' | 'lottery'>('supercar');
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

  const filteredLottery = sampleResults.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.drawId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.winningNumbers || []).join('').includes(searchTerm)
  );

  const filteredSupercars = supercarPastDraws.filter(s =>
    s.issueId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.winningCar.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.drawTime || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5 sm:space-y-6 pb-24 font-mono">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-amber-500/30 p-4 sm:p-5 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20 shrink-0">
            <Award className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>LIVE DRAW RESULTS ARCHIVE</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-sans">
                REALTIME FIREBASE
              </span>
            </h1>
            <p className="text-xs text-slate-400">Verified winning numbers & supercar slot archives</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search issue ID or car color..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white font-mono text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('supercar')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'supercar'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>THREE SUPER CAR DRAWS ({supercarPastDraws.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('lottery')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'lottery'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>LOTTERY DRAWS</span>
        </button>
      </div>

      {/* TAB 1: SUPER CAR DRAW RESULTS */}
      {activeTab === 'supercar' && (
        <div className="space-y-3">
          {filteredSupercars.length === 0 ? (
            <div className="p-8 bg-slate-900/80 border border-slate-800 rounded-3xl text-center space-y-3">
              <Zap className="w-10 h-10 text-amber-500 mx-auto animate-bounce" />
              <h3 className="text-sm font-bold text-white uppercase">No Super Car Draw Results Found</h3>
              <p className="text-xs text-slate-400">
                When 30-minute daily supercar slots resolve or when admins publish results, they appear here instantly!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSupercars.map((res) => {
                const carInfo = getSuperCarInfo(res.winningCar, supercarConfig);
                const multiplier = res.prizeMultiplier || supercarConfig?.prizeMultiplier || 2.8;

                return (
                  <div
                    key={res.issueId}
                    className="p-4 bg-slate-900 border border-amber-500/30 hover:border-amber-400 rounded-3xl shadow-xl flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-800 shrink-0">
                        <img src={carInfo.image} alt={carInfo.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent"></div>
                        <span className={`absolute bottom-1 left-1 text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                          res.winningCar === 'red' ? 'bg-rose-500 text-white' : res.winningCar === 'black' ? 'bg-amber-500 text-slate-950' : 'bg-yellow-400 text-slate-950'
                        }`}>
                          {res.winningCar}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            #{res.issueId}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {res.drawTime || 'Completed'}
                          </span>
                        </div>

                        <h3 className="text-sm font-black text-white uppercase tracking-tight">
                          {carInfo.name} WINNER
                        </h3>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>Payout: <strong className="text-emerald-400">{multiplier}x</strong></span>
                          <span>•</span>
                          <span className="text-emerald-300 font-bold flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            VERIFIED RESULT
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-2xl border border-slate-800 text-center shrink-0 min-w-[80px]">
                      <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                      <span className="text-[9px] text-slate-400 uppercase block font-bold">WINNER</span>
                      <span className="text-xs font-black text-amber-300 uppercase">{res.winningCar}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOTTERY DRAWS RESULTS */}
      {activeTab === 'lottery' && (
        <div className="space-y-4">
          {filteredLottery.map((res) => (
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
                    {(res.winningNumbers || []).map((digit, idx) => (
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
                    className="px-4 py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <span>Play Next Draw</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};


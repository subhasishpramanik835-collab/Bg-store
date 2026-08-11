import React, { useState, useEffect } from 'react';
import { Award, Search, Trophy, Sparkles, Calendar, ArrowUpRight, Zap, ShieldCheck, Clock, Flame } from 'lucide-react';
import { LotteryDraw, SuperCarDrawIssue, SuperCarConfig } from '../types';
import { getSuperCarInfo, getSuperCarDailySlots, formatCountdown, sortSuperCarSlotsSmart, SuperCarSlotItem } from '../utils/supercar';
import { soundFx } from '../utils/audio';

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
  const [selectedDateStr, setSelectedDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [slotFilter, setSlotFilter] = useState<'all' | 'completed' | 'active' | 'upcoming'>('all');
  const [nowTick, setNowTick] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [y, m, d] = selectedDateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  const dailySlots: SuperCarSlotItem[] = getSuperCarDailySlots(targetDate, supercarPastDraws, supercarConfig);

  const filteredSlots = dailySlots.filter((slot) => {
    if (slotFilter === 'completed' && slot.status !== 'completed') return false;
    if (slotFilter === 'active' && slot.status !== 'active') return false;
    if (slotFilter === 'upcoming' && slot.status !== 'upcoming') return false;

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchDateStr = selectedDateStr.includes(q) || targetDate.toLocaleDateString('en-US').includes(q) || targetDate.toLocaleDateString('en-GB').includes(q);
      return (
        slot.slotLabel.toLowerCase().includes(q) ||
        slot.timeLabel.toLowerCase().includes(q) ||
        slot.issueId.toLowerCase().includes(q) ||
        (slot.winningCar && slot.winningCar.toLowerCase().includes(q)) ||
        matchDateStr
      );
    }
    return true;
  });

  const sortedSlots = sortSuperCarSlotsSmart(filteredSlots);

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

      {/* TAB 1: SUPER CAR DRAW RESULTS (84 Daily 10-Min Slots) */}
      {activeTab === 'supercar' && (
        <div className="space-y-4">
          
          {/* Sub-Filters: Date & Status */}
          <div className="p-3.5 bg-slate-900/90 border border-amber-500/30 rounded-3xl space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Daily 84 Slots (08:00 AM – 10:00 PM)</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setSelectedDateStr(new Date().toISOString().split('T')[0]);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    selectedDateStr === new Date().toISOString().split('T')[0]
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setSelectedDateStr(d.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
                >
                  Yesterday
                </button>

                <input
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => {
                    soundFx.playClick();
                    setSelectedDateStr(e.target.value);
                  }}
                  className="bg-slate-950 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-center">
              {[
                { id: 'all', label: 'All Slots' },
                { id: 'completed', label: 'Completed' },
                { id: 'active', label: 'Active Live' },
                { id: 'upcoming', label: 'Upcoming' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSlotFilter(tab.id as any)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    slotFilter === tab.id
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {sortedSlots.length === 0 ? (
            <div className="p-8 bg-slate-900/80 border border-slate-800 rounded-3xl text-center space-y-3">
              <Zap className="w-10 h-10 text-amber-500 mx-auto animate-bounce" />
              <h3 className="text-sm font-bold text-white uppercase">No Super Car Slots Found</h3>
              <p className="text-xs text-slate-400">
                Adjust your filters or search term to view supercar draw slots.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {sortedSlots.map((slot, index) => {
                const isLatest = slot.status === 'completed' && (index === 0 || sortedSlots[index - 1]?.status === 'active');
                const winningCarInfo = slot.winningCar ? getSuperCarInfo(slot.winningCar, supercarConfig) : null;
                const multiplier = supercarConfig?.carMultipliers?.[slot.winningCar || 'black'] || supercarConfig?.prizeMultiplier || 2.8;

                return (
                  <div
                    key={slot.issueId}
                    className={`p-4 rounded-3xl border transition-all shadow-xl space-y-3 ${
                      slot.status === 'active'
                        ? 'bg-slate-900 border-amber-400 shadow-amber-500/20 ring-1 ring-amber-400/40'
                        : isLatest
                        ? 'bg-slate-900 border-amber-500/50'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                          {slot.slotLabel}
                        </span>
                        <span className="text-xs font-bold text-slate-300">{slot.timeLabel}</span>
                      </div>

                      {slot.status === 'active' ? (
                        <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                          <Sparkles className="w-3 h-3 fill-slate-950" /> LIVE
                        </span>
                      ) : isLatest ? (
                        <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full uppercase">
                          📌 LATEST RESULT
                        </span>
                      ) : slot.status === 'completed' ? (
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full uppercase">
                          COMPLETED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 rounded-full uppercase">
                          UPCOMING
                        </span>
                      )}
                    </div>

                    {slot.status === 'active' && (
                      <div className="p-3 bg-gradient-to-r from-amber-950/60 to-slate-950 border border-amber-500/40 rounded-2xl text-center space-y-1.5">
                        <span className="text-[10px] font-bold text-amber-300 uppercase block tracking-wider">
                          ACTIVE LIVE DRAW IN PROGRESS
                        </span>
                        <div className="text-sm font-black text-white flex items-center justify-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                          <span>{formatCountdown(slot.timeRemainingMs)} remaining</span>
                        </div>
                      </div>
                    )}

                    {slot.status === 'completed' && winningCarInfo && (
                      <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-950 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3">
                          <img src={winningCarInfo.image} alt={winningCarInfo.name} className="w-14 h-10 object-cover rounded-xl border border-slate-700" />
                          <div>
                            <span className="text-xs font-black text-white uppercase block">{winningCarInfo.name}</span>
                            <span className="text-[10px] text-emerald-400 font-bold block">Winner • {multiplier}x Payout</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block font-bold">PAYOUT</span>
                          <span className="text-xs font-black text-amber-300">₹{(100 * multiplier).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    )}

                    {slot.status === 'upcoming' && (
                      <div className="p-2.5 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                        <span>Upcoming Slot #{slot.slotNum}</span>
                        <span>Starts {slot.timeLabel}</span>
                      </div>
                    )}
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


import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, Flame, Disc, Clock, ShieldCheck, Ticket, ChevronRight, Zap } from 'lucide-react';
import { SuperCarColor, SuperCarDrawIssue, SuperCarConfig, PurchasedTicket } from '../types';
import { SUPER_CARS, getSuperCarInfo, getCurrentSuperCarSchedule, formatCountdown } from '../utils/supercar';
import { SuperCarTicketModal } from './SuperCarTicketModal';
import { SuperCarResultsModal } from './SuperCarResultsModal';
import { soundFx } from '../utils/audio';

interface SuperCarDrawSectionProps {
  userBalance: number;
  config: SuperCarConfig;
  currentIssue: SuperCarDrawIssue | null;
  userTickets: PurchasedTicket[];
  pastDraws: SuperCarDrawIssue[];
  onConfirmBuyTicket: (carColor: SuperCarColor, quantity: number, totalCost: number) => void;
  onDrawResolved?: (issueId: string, winningCar: SuperCarColor) => void;
}

export const SuperCarDrawSection: React.FC<SuperCarDrawSectionProps> = ({
  userBalance,
  config,
  currentIssue,
  userTickets,
  pastDraws,
  onConfirmBuyTicket,
  onDrawResolved
}) => {
  const [scheduleInfo, setScheduleInfo] = useState(() => getCurrentSuperCarSchedule(config));
  const [selectedBuyCar, setSelectedBuyCar] = useState<SuperCarColor | null>(null);
  const [isResultsOpen, setIsResultsOpen] = useState<boolean>(false);
  const [activeTabCar, setActiveTabCar] = useState<SuperCarColor>('red');
  const [shufflingIndex, setShufflingIndex] = useState<number>(0);

  // Robust check for enabled status: default to true if undefined, handle string "true"/"false" or boolean
  const isEnabled = config?.enabled === undefined
    ? true
    : (config.enabled === true || String(config.enabled).toLowerCase() === 'true');

  // Debug log for component mounting, config properties, and Red car image URL
  useEffect(() => {
    const redInfo = getSuperCarInfo('red', config);
    console.log('[SuperCarDrawSection] Mounted/Updated.');
    console.log('  -> supercarConfig:', config);
    console.log('  -> config.enabled raw value:', config?.enabled, 'parsed isEnabled:', isEnabled);
    console.log('  -> Red Car Image URL:', redInfo.image);
    console.log('  -> Red Car Info:', redInfo);

    const containerEl = document.getElementById('supercar-draw-section-root');
    if (containerEl) {
      console.log('[SuperCarDrawSection] Root container height:', containerEl.getBoundingClientRect().height);
    }
  }, [config, isEnabled]);

  // Early return if game is disabled in config
  if (!config || !isEnabled) {
    console.log('[SuperCarDrawSection] Game disabled or config missing, returning null. config?.enabled:', config?.enabled);
    return null;
  }

  // Synchronized tick interval for live countdown and shuffle animation
  useEffect(() => {
    const timer = setInterval(() => {
      const updatedSchedule = getCurrentSuperCarSchedule(config);
      setScheduleInfo(updatedSchedule);

      // Handle draw completion at 0s if active
      if (updatedSchedule.isOpen && updatedSchedule.timeRemainingMs <= 0) {
        if (onDrawResolved && currentIssue && currentIssue.status !== 'completed') {
          // Resolve winner automatically or via config manual winner
          const winner: SuperCarColor = config.resultMode === 'manual' && config.manualWinner
            ? config.manualWinner
            : (['red', 'black', 'yellow'] as SuperCarColor[])[Math.floor(Math.random() * 3)];
          
          onDrawResolved(currentIssue.issueId, winner);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [config, currentIssue, onDrawResolved]);

  // High-speed car shuffle animation interval when in final 30 seconds
  useEffect(() => {
    if (!scheduleInfo.isShuffling) return;

    const shuffleInterval = setInterval(() => {
      setShufflingIndex((prev) => (prev + 1) % 3);
    }, 150);

    return () => clearInterval(shuffleInterval);
  }, [scheduleInfo.isShuffling]);

  const carsList: SuperCarColor[] = ['red', 'black', 'yellow'];

  return (
    <div id="supercar-draw-section-root" className="relative rounded-3xl bg-slate-900/90 border border-amber-500/30 p-3.5 sm:p-6 shadow-2xl overflow-hidden space-y-4 sm:space-y-5">
      {/* Background Decorative Speed Lines & Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5 sm:pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Zap className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black font-mono tracking-tight text-white flex flex-wrap items-center gap-2">
                <span>THREE SUPER CAR DRAW</span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase shrink-0">
                  LIVE 30M
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 font-mono">
                Operating Daily: 08:00 AM to 10:00 PM • One Draw Every 30 Minutes
              </p>
            </div>
          </div>
        </div>

        {/* Operating Status / Countdown Badge */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          {scheduleInfo.isOpen ? (
            <div className={`p-2 sm:p-2.5 rounded-2xl border flex items-center gap-2 font-mono flex-1 sm:flex-initial justify-between sm:justify-start ${
              scheduleInfo.isShuffling
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-slate-950/90 border-amber-500/40 text-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 shrink-0 ${scheduleInfo.isShuffling ? 'text-rose-400 animate-spin' : 'text-amber-400'}`} />
                <div>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-bold leading-tight">
                    {scheduleInfo.isShuffling ? 'SHUFFLING NOW' : `Issue #${scheduleInfo.issueId}`}
                  </span>
                  <span className="text-xs sm:text-sm font-black tracking-wider text-white">
                    {formatCountdown(scheduleInfo.timeRemainingMs)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 rounded-2xl bg-rose-950/50 border border-rose-500/30 text-rose-300 font-mono text-xs flex items-center gap-2 flex-1 sm:flex-initial justify-center">
              <Clock className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Closed • Opens at 08:00 AM</span>
            </div>
          )}

          <button
            onClick={() => {
              soundFx.playClick();
              setIsResultsOpen(true);
            }}
            className="p-2 sm:p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer shrink-0"
          >
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Results</span>
            <span className="inline sm:hidden text-[10px]">Results</span>
          </button>
        </div>
      </div>

      {/* SHUFFLE / RACE ANIMATION BANNER (Final 30 Seconds) */}
      {scheduleInfo.isShuffling && (
        <div className="relative p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-rose-950 via-slate-950 to-amber-950 border-2 border-amber-400 shadow-2xl space-y-2.5 sm:space-y-3 overflow-hidden text-center animate-pulse">
          <div className="flex items-center justify-center gap-1.5 text-amber-300 font-black font-mono text-[10px] sm:text-xs uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce shrink-0" />
            <span>30s SUPER CAR SHUFFLE IN PROGRESS - DRAWS CLOSING!</span>
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce shrink-0" />
          </div>

          {/* Animated Supercar Racing Track Visual */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-w-md mx-auto">
            {carsList.map((carKey, idx) => {
              const car = getSuperCarInfo(carKey, config);
              const isActiveShuffleCar = shufflingIndex === idx;

              return (
                <div
                  key={carKey}
                  className={`p-1.5 sm:p-2 rounded-xl border transition-all duration-150 transform ${
                    isActiveShuffleCar
                      ? 'scale-105 bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/40'
                      : 'scale-95 bg-slate-950 border-slate-800 opacity-60'
                  }`}
                >
                  <img
                    src={car.image}
                    alt={car.name}
                    className="w-full h-8 sm:h-10 object-cover rounded-lg border border-slate-700"
                  />
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-300 mt-1 block truncate">
                    {car.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LATEST DRAW WINNER BANNER (Realtime Result Display) */}
      {pastDraws && pastDraws.length > 0 && (
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-950/80 via-slate-950 to-slate-900 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl animate-fade-in font-mono">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-12 rounded-xl overflow-hidden border border-amber-500/50 shrink-0 shadow-lg group">
              <img
                src={getSuperCarInfo(pastDraws[0].winningCar, config).image}
                alt={pastDraws[0].winningCar}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider block">
                  LATEST WINNING RESULT (#{pastDraws[0].issueId})
                </span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-sans font-bold">
                  RESOLVED
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm sm:text-base font-black text-white uppercase">
                  {getSuperCarInfo(pastDraws[0].winningCar, config).name}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${
                  pastDraws[0].winningCar === 'red' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                  pastDraws[0].winningCar === 'black' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                  'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                }`}>
                  {pastDraws[0].winningCar} CAR WINNER
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
            <span className="text-xs text-slate-300 font-bold">
              Odds Payout: <strong className="text-emerald-400 font-black">{pastDraws[0].prizeMultiplier || config.prizeMultiplier || 2.8}x</strong>
            </span>
            <button
              onClick={() => {
                soundFx.playClick();
                setIsResultsOpen(true);
              }}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-md"
            >
              <span>Past Results ({pastDraws.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3 SUPERCAR CARDS GRID (Lottery Style Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4.5">
        {carsList.map((carKey) => {
          const car = getSuperCarInfo(carKey, config);
          const ticketPrice = config.carPrices?.[carKey] || config.ticketPrice || 100;
          const prizeMultiplier = config.carMultipliers?.[carKey] || config.prizeMultiplier || 2.8;
          const isDrawClosed = !scheduleInfo.isOpen || scheduleInfo.isShuffling;

          return (
            <div
              key={carKey}
              className={`group relative rounded-3xl bg-slate-950/95 border transition-all duration-300 hover:scale-[1.015] flex flex-col justify-between overflow-hidden shadow-2xl ${
                carKey === 'red'
                  ? 'border-rose-500/40 hover:border-rose-500/90 shadow-rose-950/40'
                  : carKey === 'black'
                  ? 'border-amber-500/40 hover:border-amber-500/90 shadow-amber-950/40'
                  : 'border-yellow-500/40 hover:border-yellow-500/90 shadow-yellow-950/40'
              }`}
            >
              {/* Top Banner Accent Line */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 z-20 ${
                carKey === 'red' ? 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-400' :
                carKey === 'black' ? 'bg-gradient-to-r from-slate-600 via-amber-500 to-amber-300' :
                'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-200'
              }`}></div>

              {/* Card Header Image Banner */}
              <div className="relative h-36 sm:h-44 overflow-hidden">
                <img
                  src={car.image}
                  alt={car.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent"></div>

                {/* Badge Tag */}
                <div className="absolute top-2.5 left-2.5 bg-slate-950/90 backdrop-blur-md border border-amber-500/40 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-mono font-black text-amber-300 shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{car.badge}</span>
                </div>

                <div className="absolute top-2.5 right-2.5 bg-emerald-500/30 backdrop-blur-md border border-emerald-500/60 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-mono font-black text-emerald-300 shadow-md">
                  {prizeMultiplier}x PAYOUT
                </div>

                {/* Car Title Overlay */}
                <div className="absolute bottom-2.5 left-3 right-3">
                  <h3 className="text-base sm:text-lg font-black font-mono text-white tracking-tight leading-none drop-shadow-md">
                    {car.name}
                  </h3>
                  <p className="text-[10px] text-slate-300 font-mono mt-0.5 opacity-90 truncate">
                    {car.tagline}
                  </p>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-3 sm:p-3.5 space-y-2.5 sm:space-y-3 flex-1 flex flex-col justify-between">
                
                {/* Est. Win Prize Box (Lottery Card Style) */}
                <div className="p-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 rounded-2xl border border-amber-500/30 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[8px] sm:text-[9px] uppercase font-bold text-amber-400/90 tracking-wider block font-mono">
                        Max Estimated Win
                      </span>
                      <span className="text-base sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 font-mono">
                        ₹{Math.round(ticketPrice * prizeMultiplier).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                      <Trophy className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                {/* Ticket Price & Speed Specs */}
                <div className="grid grid-cols-2 gap-2 text-center font-mono">
                  <div className="p-2 bg-slate-900/90 rounded-2xl border border-slate-800/80">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Ticket Price</span>
                    <span className="text-xs font-black text-amber-300">₹{ticketPrice}</span>
                  </div>

                  <div className="p-2 bg-slate-900/90 rounded-2xl border border-slate-800/80">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Top Speed</span>
                    <span className="text-xs font-black text-slate-200">{car.topSpeed}</span>
                  </div>
                </div>

                {/* Dynamic Synchronized Countdown Timer Bar inside Card */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/95 rounded-2xl border border-amber-500/30 font-mono">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Draw Countdown</span>
                  </span>
                  <span className="text-xs font-black text-amber-300 tracking-wider">
                    {scheduleInfo.isOpen ? formatCountdown(scheduleInfo.timeRemainingMs) : 'Opens 08:00 AM'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-1.5 pt-0.5">
                  <button
                    onClick={() => {
                      if (isDrawClosed) return;
                      soundFx.playClick();
                      setSelectedBuyCar(carKey);
                    }}
                    disabled={isDrawClosed}
                    className={`w-full py-2.5 rounded-2xl font-black font-mono text-xs tracking-wide shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !isDrawClosed
                        ? carKey === 'red'
                          ? 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 hover:from-rose-400 hover:to-red-400 text-white shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98]'
                          : carKey === 'black'
                          ? 'bg-gradient-to-r from-slate-700 via-amber-500 to-slate-800 hover:from-slate-600 hover:to-amber-400 text-white shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]'
                          : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5 shrink-0" />
                    <span>{isDrawClosed ? 'DRAW LOCKED' : `BUY ${carKey.toUpperCase()} TICKET`}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        soundFx.playClick();
                        setSelectedBuyCar(carKey);
                      }}
                      className="py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-mono text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      View Draw
                    </button>
                    <button
                      onClick={() => {
                        soundFx.playClick();
                        setIsResultsOpen(true);
                      }}
                      className="py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-mono text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      View Result
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Buy Ticket Modal */}
      {selectedBuyCar && (
        <SuperCarTicketModal
          isOpen={!!selectedBuyCar}
          onClose={() => setSelectedBuyCar(null)}
          selectedCarColor={selectedBuyCar}
          currentIssue={currentIssue}
          userBalance={userBalance}
          ticketPrice={config.ticketPrice || 100}
          prizeMultiplier={config.prizeMultiplier || 2.8}
          onConfirmBuy={(carColor, quantity, totalCost) => {
            onConfirmBuyTicket(carColor, quantity, totalCost);
            setSelectedBuyCar(null);
          }}
        />
      )}

      {/* Results Modal */}
      {isResultsOpen && (
        <SuperCarResultsModal
          isOpen={isResultsOpen}
          onClose={() => setIsResultsOpen(false)}
          pastDraws={pastDraws}
          userTickets={userTickets}
        />
      )}
    </div>
  );
};

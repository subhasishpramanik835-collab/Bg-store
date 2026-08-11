import React from 'react';
import { X, Trophy, Flame, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { SuperCarDrawIssue, PurchasedTicket, SuperCarConfig } from '../types';
import { SUPER_CARS, getSuperCarInfo } from '../utils/supercar';
import { soundFx } from '../utils/audio';

interface SuperCarResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pastDraws: SuperCarDrawIssue[];
  userTickets: PurchasedTicket[];
  config?: SuperCarConfig;
}

export const SuperCarResultsModal: React.FC<SuperCarResultsModalProps> = ({
  isOpen,
  onClose,
  pastDraws,
  userTickets,
  config
}) => {
  if (!isOpen) return null;

  const supercarTickets = userTickets.filter(
    (t) => t.category === 'Three Super Car Draw' || t.drawTitle.includes('Super Car')
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden text-white space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black font-mono text-white tracking-tight">
                SUPER CAR DRAW RESULTS
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Recent 30-Minute Winner Supercars
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Results Content */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1 custom-scrollbar">
          {/* Section 0: 29 Draw Slots Today Overview */}
          <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2">
            <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Today's 29 Draw Slots Schedule</span>
              </span>
              <span className="text-[10px] text-slate-400">08:00 AM – 10:00 PM</span>
            </h4>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-1">
              {Array.from({ length: 29 }, (_, i) => {
                const slotNum = i + 1;
                const startMins = 8 * 60 + i * 30; // 08:00 start
                const h = Math.floor(startMins / 60);
                const m = startMins % 60;
                const ampm = h >= 12 ? 'PM' : 'AM';
                const formattedH = h % 12 === 0 ? 12 : h % 12;
                const timeLabel = `${String(formattedH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;

                // Check if this slot was drawn in pastDraws
                const matchedDraw = pastDraws.find((d) => d.drawIndex === slotNum || d.issueId.endsWith(`-${String(slotNum).padStart(2, '0')}`));
                const winningCarKey = matchedDraw?.winningCar;

                return (
                  <div
                    key={slotNum}
                    className={`p-1.5 rounded-xl border text-center font-mono ${
                      winningCarKey
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="text-[9px] font-bold block opacity-75">#{String(slotNum).padStart(2, '0')}</span>
                    <span className="text-[10px] font-black text-white block">{timeLabel}</span>
                    {winningCarKey ? (
                      <span className={`text-[8px] font-black uppercase px-1 rounded block mt-0.5 ${
                        winningCarKey === 'red' ? 'bg-rose-500 text-slate-950' : winningCarKey === 'black' ? 'bg-amber-500 text-slate-950' : 'bg-yellow-400 text-slate-950'
                      }`}>
                        {winningCarKey}
                      </span>
                    ) : (
                      <span className="text-[8px] text-slate-500 block mt-0.5">30m</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 1: Recent Winning Supercars */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Live Draw Winners Archive</span>
            </h4>

            {pastDraws.length === 0 ? (
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center text-xs font-mono text-slate-400">
                No past draws completed yet today. Results will appear automatically after each 30-minute draw.
              </div>
            ) : (
              <div className="space-y-2">
                {pastDraws.map((draw) => {
                  const winningCar = draw.winningCar ? getSuperCarInfo(draw.winningCar, config) : null;

                  return (
                    <div
                      key={draw.id || draw.issueId}
                      className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <span className="text-xs font-black font-mono text-white block">
                          Issue #{draw.issueId}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {new Date(draw.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {draw.totalTicketsSold || 0} Tickets
                        </span>
                      </div>

                      {winningCar ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={winningCar.image}
                            alt={winningCar.name}
                            className="w-10 h-7 object-cover rounded-lg border border-slate-700"
                          />
                          <div className="text-right font-mono">
                            <span className="text-[10px] font-bold text-amber-300 block">
                              {winningCar.name}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded-md inline-block">
                              WINNER ({draw.prizeMultiplier || 2.8}x)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-mono font-bold text-slate-500">Pending</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: User's Purchased Supercar Tickets */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Your Super Car Tickets ({supercarTickets.length})</span>
            </h4>

            {supercarTickets.length === 0 ? (
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center text-xs font-mono text-slate-400">
                You haven't bought any Super Car tickets yet. Select Red, Black, or Yellow Super Car to play!
              </div>
            ) : (
              <div className="space-y-2">
                {supercarTickets.map((ticket) => {
                  const carKey = ticket.selectedCar || 'red';
                  const carInfo = SUPER_CARS[carKey];

                  return (
                    <div
                      key={ticket.id}
                      className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={carInfo.image}
                          alt={carInfo.name}
                          className="w-10 h-7 object-cover rounded-lg border border-slate-700"
                        />
                        <div>
                          <span className="text-xs font-bold font-mono text-white block">
                            {ticket.ticketNumber}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            Draw #{ticket.drawId} • ₹{ticket.price}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        {ticket.status === 'win' ? (
                          <div className="text-right">
                            <span className="text-xs font-black text-emerald-400 block">
                              +₹{ticket.wonAmount || 0} WON
                            </span>
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5 border border-emerald-500/40">
                              <CheckCircle2 className="w-3 h-3" /> Winner
                            </span>
                          </div>
                        ) : ticket.status === 'loss' ? (
                          <span className="text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full border border-slate-700">
                            No Win
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-500/10 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3 animate-spin [animation-duration:3s]" /> Live Ticket
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 shrink-0 text-center">
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-black font-mono text-xs rounded-xl transition-colors cursor-pointer"
          >
            CLOSE RESULTS
          </button>
        </div>
      </div>
    </div>
  );
};

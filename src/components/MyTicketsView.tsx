import React, { useState } from 'react';
import { Ticket, Trophy, XCircle, Clock, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import { PurchasedTicket } from '../types';

interface MyTicketsViewProps {
  tickets: PurchasedTicket[];
  onOpenBuyTicket: () => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({ tickets, onOpenBuyTicket }) => {
  const [filter, setFilter] = useState<'all' | 'win' | 'loss' | 'active'>('all');

  const filteredTickets = tickets.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-amber-500/20 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <Ticket className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-mono">My Lottery Tickets</h1>
            <p className="text-xs text-slate-400">Track live draw countdowns, winning status, and payouts</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 self-stretch sm:self-auto overflow-x-auto">
          {(['all', 'active', 'win', 'loss'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold capitalize transition-all ${
                filter === f
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f === 'active' ? 'Live / Active' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredTickets.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/60 rounded-3xl border border-slate-800 p-8 space-y-4">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white font-mono">No Tickets Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You don't have any tickets under the <span className="text-amber-400 uppercase font-bold">{filter}</span> category.
          </p>
          <button
            onClick={onOpenBuyTicket}
            className="px-6 py-2.5 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Browse Active Lottery Draws</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map((t) => (
            <div
              key={t.id}
              className={`relative bg-slate-900 border rounded-3xl p-5 shadow-xl overflow-hidden transition-all hover:scale-[1.01] ${
                t.status === 'win'
                  ? 'border-emerald-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30'
                  : t.status === 'loss'
                  ? 'border-rose-500/20 opacity-85'
                  : 'border-amber-500/30'
              }`}
            >
              {/* Top Row: Title & Status Badge */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-slate-400">{t.id}</span>
                <span
                  className={`text-[10px] font-extrabold uppercase font-mono px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                    t.status === 'win'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : t.status === 'loss'
                      ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                      : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                  }`}
                >
                  {t.status === 'win' && <Trophy className="w-3 h-3 text-emerald-400" />}
                  {t.status === 'loss' && <XCircle className="w-3 h-3 text-rose-400" />}
                  {t.status === 'active' && <Clock className="w-3 h-3 text-amber-400 animate-spin" />}
                  {t.status === 'win' ? 'WINNER' : t.status === 'loss' ? 'RESULT LOST' : 'DRAW ACTIVE'}
                </span>
              </div>

              {/* Draw Title */}
              <h3 className="text-base font-extrabold text-white font-mono mb-3">{t.drawTitle}</h3>

              {/* Selected Digits Display Box */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 mb-4">
                <span className="text-[10px] uppercase text-slate-400 font-sans block mb-2 font-bold">
                  Your Ticket Number:
                </span>
                <div className="flex items-center justify-center gap-2">
                  {t.selectedNumbers.map((num, idx) => (
                    <span
                      key={idx}
                      className="w-9 h-10 bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono font-black text-lg rounded-xl flex items-center justify-center shadow-inner"
                    >
                      {num}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ticket Footer Meta */}
              <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-800 text-slate-400">
                <div>
                  <span className="text-[10px] block font-sans">Purchased</span>
                  <span className="text-white font-bold">{t.purchaseDate}</span>
                </div>

                {t.status === 'win' ? (
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 block font-sans">Prize Won</span>
                    <span className="text-emerald-400 font-black text-base">₹{t.wonAmount?.toLocaleString('en-IN')}</span>
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="text-[10px] block font-sans">Ticket Price</span>
                    <span className="text-amber-400 font-bold">₹{t.price}</span>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

import React, { useState } from 'react';
import { Ticket, Trophy, XCircle, Clock, Sparkles, Filter, CheckCircle2, Zap } from 'lucide-react';
import { PurchasedTicket } from '../types';
import { SUPER_CARS, formatTicketExactDateTime, sortChronologicalNewestFirst } from '../utils/supercar';
import { PaginationBar } from './PaginationBar';

interface MyTicketsViewProps {
  tickets: PurchasedTicket[];
  onOpenBuyTicket: () => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({ tickets, onOpenBuyTicket }) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'win' | 'loss' | 'supercar'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const sortedTickets = sortChronologicalNewestFirst(tickets);

  const filteredTickets = sortedTickets.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'supercar') return t.category === 'Three Super Car Draw' || t.drawTitle.includes('Super Car');
    return t.status === filter;
  });

  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleFilterChange = (f: 'all' | 'active' | 'win' | 'loss' | 'supercar') => {
    setFilter(f);
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-amber-500/20 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <Ticket className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-mono">My Lottery & Game Tickets</h1>
            <p className="text-xs text-slate-400">Track live draw countdowns, supercar entries, winning status, and payouts</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 self-stretch sm:self-auto overflow-x-auto">
          {(['all', 'active', 'win', 'loss', 'supercar'] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold capitalize transition-all whitespace-nowrap cursor-pointer ${
                filter === f
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f === 'active' ? 'Live / Active' : f === 'supercar' ? 'Super Car Draw' : f}
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
            className="px-6 py-2.5 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Browse Active Lottery Draws</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedTickets.map((t) => {
            const isSuperCarTicket = t.category === 'Three Super Car Draw' || t.selectedCar !== undefined;
            const carInfo = isSuperCarTicket && t.selectedCar ? SUPER_CARS[t.selectedCar] : null;

            return (
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
                {/* Glowing Animated Purchase Time Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400 px-2.5 py-1 rounded-full text-amber-300 font-mono font-black text-[11px] shadow-[0_0_12px_rgba(245,158,11,0.35)] animate-pulse">
                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin [animation-duration:3s]" />
                    <span>TIME: {formatTicketExactDateTime(t)}</span>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold uppercase font-mono px-2.5 py-1 rounded-full border flex items-center gap-1 shrink-0 ${
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

                {/* Top Row: Title & Ticket ID */}
                <div className="flex items-center justify-between mb-2 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">#{t.ticketNumber || t.id}</span>
                    {isSuperCarTicket && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> Super Car
                      </span>
                    )}
                  </div>
                </div>

                {/* Draw Title */}
                <h3 className="text-sm sm:text-base font-extrabold text-white font-mono mb-3">{t.drawTitle}</h3>

                {/* Selected Digits OR Supercar Box */}
                {carInfo ? (
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-11 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                        <img
                          src={carInfo.image}
                          alt={carInfo.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                      </div>
                      <div>
                        <span className="text-xs font-black font-mono text-amber-300 block">
                          {carInfo.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Ticket Price: <strong className="text-emerald-400">₹{t.price}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <span className="text-[10px] text-slate-400 block font-bold">CAR CHOICE</span>
                      <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${
                        t.selectedCar === 'red' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : t.selectedCar === 'black' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                      }`}>{t.selectedCar} CAR</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 mb-4">
                    <span className="text-[10px] uppercase text-slate-400 font-sans block mb-2 font-bold">
                      Your Ticket Number:
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      {(t.selectedNumbers || (t as any).numbers || []).map((num, idx) => (
                        <span
                          key={idx}
                          className="w-9 h-10 bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono font-black text-lg rounded-xl flex items-center justify-center shadow-inner"
                        >
                          {num}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ticket Footer Meta */}
                <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-800 text-slate-400">
                  <div>
                    <span className="text-[10px] block font-sans">Purchased Date</span>
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
            );
          })}
          </div>

          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredTickets.length}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[6, 12, 24, 50]}
            label="tickets"
          />
        </div>
      )}

    </div>
  );
};

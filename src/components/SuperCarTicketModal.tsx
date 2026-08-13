import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Ticket } from 'lucide-react';
import { SuperCarColor, SuperCarDrawIssue } from '../types';
import { SUPER_CARS } from '../utils/supercar';
import { soundFx } from '../utils/audio';

interface SuperCarTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCarColor: SuperCarColor;
  currentIssue: SuperCarDrawIssue | null;
  userBalance: number;
  ticketPrice: number;
  prizeMultiplier: number;
  onConfirmBuy: (carColor: SuperCarColor, quantity: number, totalCost: number) => void;
}

export const SuperCarTicketModal: React.FC<SuperCarTicketModalProps> = ({
  isOpen,
  onClose,
  selectedCarColor: initialCar,
  currentIssue,
  userBalance,
  ticketPrice,
  prizeMultiplier,
  onConfirmBuy
}) => {
  const [selectedCar, setSelectedCar] = useState<SuperCarColor>(initialCar);
  const [quantity, setQuantity] = useState<number>(1);
  const [isBuying, setIsBuying] = useState<boolean>(false);

  if (!isOpen) return null;

  const carInfo = SUPER_CARS[selectedCar];
  const totalCost = quantity * ticketPrice;
  const potentialWin = Math.round(totalCost * prizeMultiplier);
  const hasEnoughBalance = userBalance >= totalCost;

  const handleBuy = () => {
    if (!hasEnoughBalance || isBuying) return;
    setIsBuying(true);
    soundFx.playClick();
    setTimeout(() => {
      onConfirmBuy(selectedCar, quantity, totalCost);
      setIsBuying(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden text-white space-y-4">
        {/* Background Ambient Glow */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black font-mono text-white tracking-tight">
                BUY SUPER CAR TICKET
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {currentIssue ? `Issue #${currentIssue.issueId}` : '30-Min Live Draw'}
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

        {/* Car Selection Tabs */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
            1. Choose Winning Super Car
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['red', 'black', 'yellow'] as SuperCarColor[]).map((carKey) => {
              const info = SUPER_CARS[carKey];
              const isSelected = selectedCar === carKey;
              return (
                <button
                  key={carKey}
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setSelectedCar(carKey);
                  }}
                  className={`relative p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-amber-400 ring-2 ring-amber-400/50 shadow-lg scale-102'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img
                    src={info.image}
                    alt={info.name}
                    className="w-12 h-8 object-cover rounded-lg border border-slate-700/50"
                  />
                  <span className="text-[10px] font-mono font-bold text-white tracking-tight text-center line-clamp-1">
                    {info.name}
                  </span>
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 rounded-full p-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Car Details Box */}
        <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={carInfo.image}
              alt={carInfo.name}
              className="w-16 h-10 object-cover rounded-xl border border-slate-700 shadow-md"
            />
            <div>
              <span className="text-xs font-black font-mono text-amber-300 block">
                {carInfo.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                {carInfo.tagline}
              </span>
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-400 block">Payout Odds</span>
            <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
              {prizeMultiplier}x Win
            </span>
          </div>
        </div>

        {/* Quantity Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
              2. Select Ticket Quantity (Type or Click)
            </label>
            <span className="text-xs font-mono font-bold text-amber-400">
              ₹{ticketPrice} / ticket
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setQuantity(Math.max(1, quantity - 1));
              }}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              -
            </button>

            <div className="flex items-center justify-center gap-1.5 flex-1">
              <input
                type="number"
                min="1"
                max="1000"
                value={quantity || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQuantity(isNaN(val) ? 1 : Math.max(1, val));
                }}
                className="w-20 bg-slate-900 border border-amber-500/50 rounded-xl px-2 py-1 text-center font-mono font-black text-amber-300 text-lg focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
              <span className="text-xs font-mono font-bold text-slate-400">
                {quantity === 1 ? 'Ticket' : 'Tickets'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setQuantity(quantity + 1);
              }}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              +
            </button>
          </div>

          {/* Quick Quantity Buttons */}
          <div className="grid grid-cols-6 gap-1.5 pt-1">
            {[1, 5, 10, 50, 80, 100].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setQuantity(num);
                }}
                className={`py-1.5 rounded-xl text-[11px] font-mono font-bold border transition-colors cursor-pointer text-center ${
                  quantity === num
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {num}x
              </button>
            ))}
          </div>
        </div>

        {/* Calculation & Balance Summary */}
        <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>Total Cost:</span>
            <span className="font-bold text-white text-sm">₹{totalCost}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Potential Win (Est.):</span>
            <span className="font-bold text-emerald-400 text-sm">₹{potentialWin}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400">Wallet Balance:</span>
            <span className={`font-bold ${hasEnoughBalance ? 'text-amber-400' : 'text-rose-400'}`}>
              ₹{userBalance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Warning if insufficient balance */}
        {!hasEnoughBalance && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Insufficient wallet balance. Please deposit funds first.</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleBuy}
          disabled={!hasEnoughBalance || isBuying}
          className={`w-full py-3.5 rounded-2xl font-black font-mono text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            hasEnoughBalance && !isBuying
              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/20 hover:scale-102 active:scale-98'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>
            {isBuying ? 'PROCESSING TICKET...' : `CONFIRM & PAY ₹${totalCost}`}
          </span>
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>100% Transparent Firebase Live Super Car Draw</span>
        </div>
      </div>
    </div>
  );
};

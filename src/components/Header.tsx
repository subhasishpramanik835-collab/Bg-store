import React from 'react';
import { Wallet, Plus, Bell, Shield, Volume2, VolumeX, Sparkles, UserCheck } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface HeaderProps {
  balance: number;
  unreadNotificationsCount: number;
  onOpenDeposit: () => void;
  onOpenNotifications: () => void;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  onOpenProfile: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  balance,
  unreadNotificationsCount,
  onOpenDeposit,
  onOpenNotifications,
  isAdmin,
  onToggleAdmin,
  onOpenProfile,
  muted,
  onToggleMute
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-amber-500/20 shadow-lg shadow-black/50 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Animated HD Logo */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onOpenProfile}>
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-700 p-0.5 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center relative overflow-hidden">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              <div className="absolute inset-0 bg-amber-400/10 blur-sm"></div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-sm font-mono">
                BETGURU
              </span>
              <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30 uppercase tracking-widest hidden sm:inline-block">
                HD LOTTERY
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium tracking-tight -mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              INSTANT PAYOUTS
            </span>
          </div>
        </div>

        {/* Balance & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* INR Balance Badge */}
          <div 
            onClick={onOpenDeposit}
            className="flex items-center gap-2 bg-gradient-to-r from-slate-900 to-slate-900/90 border border-amber-500/30 hover:border-amber-400/60 rounded-full px-3 py-1.5 cursor-pointer shadow-inner transition-all hover:scale-[1.02] group"
          >
            <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Wallet</span>
              <span className="text-sm font-extrabold text-amber-300 font-mono tracking-tight">
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="hidden sm:flex ml-1 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 items-center justify-center">
              <Plus className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Quick Deposit Button */}
          <button
            onClick={() => { soundFx.playClick(); onOpenDeposit(); }}
            className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all hover:shadow-emerald-500/40 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden xs:inline">Deposit</span>
          </button>

          {/* Mute/Sound Button */}
          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-500/30 transition-all"
            title={muted ? "Unmute sound" : "Mute sound"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => { soundFx.playClick(); onOpenNotifications(); }}
            className="relative p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-500/30 transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce shadow-md">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Admin Switcher Toggle */}
          <button
            onClick={() => { soundFx.playClick(); onToggleAdmin(); }}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isAdmin
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 font-bold'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/40 hover:text-amber-300'
            }`}
            title="Switch User/Admin Panel"
          >
            {isAdmin ? <Shield className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden md:inline">{isAdmin ? 'Admin Panel' : 'Player Mode'}</span>
          </button>

        </div>
      </div>
    </header>
  );
};

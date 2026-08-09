import React from 'react';
import { Home, Flame, ArrowUpRight, Ticket, User as UserIcon, Disc, Award } from 'lucide-react';
import { soundFx } from '../utils/audio';

export type NavTab = 'home' | 'lottery' | 'withdrawal' | 'tickets' | 'results' | 'lucky_wheel' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeTicketsCount: number;
  onOpenRoulette?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  activeTicketsCount,
  onOpenRoulette
}) => {
  const tabs = [
    { 
      id: 'home' as NavTab, 
      label: 'Home', 
      icon: Home,
      animationClass: 'group-hover:scale-110 group-active:scale-95'
    },
    { 
      id: 'lottery' as NavTab, 
      label: 'Lottery', 
      icon: Flame,
      animationClass: 'group-hover:scale-110 group-active:scale-95'
    },
    { 
      id: 'withdrawal' as NavTab, 
      label: 'Withdraw', 
      icon: ArrowUpRight,
      animationClass: 'group-hover:scale-110 group-active:scale-95'
    },
    { 
      id: 'tickets' as NavTab, 
      label: 'Tickets', 
      icon: Ticket, 
      badge: activeTicketsCount,
      animationClass: 'group-hover:-rotate-12 group-active:rotate-0'
    },
    { 
      id: 'profile' as NavTab, 
      label: 'Profile', 
      icon: UserIcon,
      animationClass: 'group-hover:-translate-y-1 group-active:translate-y-0'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-amber-500/30 backdrop-blur-xl px-1.5 py-1.5 shadow-2xl shadow-black">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                soundFx.playClick();
                onSelectTab(tab.id);
              }}
              className={`group relative flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-200 active:opacity-50 active:scale-90 cursor-pointer ${
                isActive
                  ? 'text-amber-400 font-extrabold scale-105'
                  : 'text-slate-400 hover:text-slate-100 font-medium'
              }`}
            >
              {/* Highlight Glow for Active Tab */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-amber-500/5 rounded-2xl blur-xs -z-10 animate-pulse"></div>
              )}

              <div className="relative">
                <Icon
                  className={`w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2] transition-transform duration-200 ease-out ${tab.animationClass} ${
                    isActive
                      ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                      : 'text-slate-400 group-hover:text-amber-300'
                  }`}
                />

                {/* Badge if available */}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-slate-950 shadow-md animate-bounce">
                    {tab.badge}
                  </span>
                ) : null}
              </div>

              <span className={`text-[9px] sm:text-[10px] mt-0.5 tracking-tight transition-colors duration-200 ${isActive ? 'text-amber-300 font-bold' : 'text-slate-400 group-hover:text-slate-200'}`}>
                {tab.label}
              </span>

              {/* Active Indicator Pill */}
              {isActive && (
                <div className="w-4 h-0.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full mt-0.5 shadow-sm shadow-amber-500/50"></div>
              )}
            </button>
          );
        })}

        {/* Dedicated Live Roulette Launcher */}
        {onOpenRoulette && (
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenRoulette();
            }}
            className="group relative flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-200 text-amber-400 font-extrabold active:opacity-50 active:scale-90 cursor-pointer"
            title="Play Live Roulette"
          >
            <div className="relative">
              <Disc className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 animate-spin [animation-duration:6s] drop-shadow-[0_0_12px_rgba(245,158,11,0.7)] group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[7px] font-black px-1 py-0.2 rounded-full animate-pulse border border-rose-400 shadow-md">
                LIVE
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight text-amber-300 font-bold group-hover:text-amber-200">
              Casino
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};

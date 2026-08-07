import React from 'react';
import { Home, Ticket, Award, User as UserIcon, Disc } from 'lucide-react';
import { soundFx } from '../utils/audio';

export type NavTab = 'home' | 'tickets' | 'results' | 'lucky_wheel' | 'profile';

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
  // Navigation tabs list with Spin & Win removed as requested
  const tabs = [
    { 
      id: 'home' as NavTab, 
      label: 'Home', 
      icon: Home,
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
      id: 'results' as NavTab, 
      label: 'Results', 
      icon: Award,
      animationClass: 'group-hover:scale-125 group-hover:rotate-6'
    },
    { 
      id: 'profile' as NavTab, 
      label: 'Profile', 
      icon: UserIcon,
      animationClass: 'group-hover:-translate-y-1 group-active:translate-y-0'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-amber-500/30 backdrop-blur-xl px-2 py-2 shadow-2xl shadow-black">
      <div className="max-w-lg mx-auto flex items-center justify-around">
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
              className={`group relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 active:opacity-50 active:scale-90 ${
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
                  className={`w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] transition-transform duration-300 ease-out ${tab.animationClass} ${
                    isActive
                      ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                      : 'text-slate-400 group-hover:text-amber-300'
                  }`}
                />

                {/* Badge if available */}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 bg-emerald-500 text-slate-950 text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md animate-bounce">
                    {tab.badge}
                  </span>
                ) : null}
              </div>

              <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight transition-colors duration-200 ${isActive ? 'text-amber-300 font-bold' : 'text-slate-400 group-hover:text-slate-200'}`}>
                {tab.label}
              </span>

              {/* Active Indicator Pill */}
              {isActive && (
                <div className="w-5 h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full mt-0.5 shadow-sm shadow-amber-500/50"></div>
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
            className="group relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 text-amber-400 font-extrabold active:opacity-50 active:scale-90"
            title="Play Live Roulette"
          >
            <div className="relative">
              <Disc className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 animate-spin [animation-duration:6s] drop-shadow-[0_0_12px_rgba(245,158,11,0.7)] group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[8px] font-black px-1 py-0.2 rounded-full animate-pulse border border-rose-400 shadow-md">
                LIVE
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] mt-1 tracking-tight text-amber-300 font-bold group-hover:text-amber-200">
              Roulette
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};


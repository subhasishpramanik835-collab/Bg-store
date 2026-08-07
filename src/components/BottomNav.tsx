import React from 'react';
import { Home, Ticket, Award, User as UserIcon, Dices, Disc } from 'lucide-react';
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
  const tabs = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'tickets' as NavTab, label: 'Tickets', icon: Ticket, badge: activeTicketsCount },
    { id: 'lucky_wheel' as NavTab, label: 'Spin & Win', icon: Dices },
    { id: 'results' as NavTab, label: 'Results', icon: Award },
    { id: 'profile' as NavTab, label: 'Profile', icon: UserIcon }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-amber-500/20 backdrop-blur-lg px-2 py-2 shadow-2xl shadow-black">
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
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-amber-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              {/* Highlight Glow for Active Tab */}
              {isActive && (
                <div className="absolute inset-0 bg-amber-500/10 rounded-xl blur-sm -z-10"></div>
              )}

              <div className="relative">
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : 'text-slate-400'
                  }`}
                />

                {/* Badge if available */}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </div>

              <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight ${isActive ? 'text-amber-300 font-bold' : 'text-slate-400'}`}>
                {tab.label}
              </span>

              {/* Active Indicator Bar */}
              {isActive && (
                <div className="w-4 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full mt-0.5"></div>
              )}
            </button>
          );
        })}

        {/* Dedicated Fullscreen Live Roulette Launcher */}
        {onOpenRoulette && (
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenRoulette();
            }}
            className="relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 text-amber-400 font-bold hover:scale-105 group"
          >
            <div className="relative">
              <Disc className="w-5 h-5 text-amber-400 animate-spin [animation-duration:8s] drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
              <span className="absolute -top-1 -right-2 bg-rose-600 text-white text-[8px] font-black px-1 rounded-full animate-pulse">
                LIVE
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] mt-1 tracking-tight text-amber-300 font-bold">
              Roulette
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};

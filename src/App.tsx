/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, Wallet, Dices, Plus, ArrowUpRight, ShieldCheck, Flame, Star, CheckCircle2, Disc, Play } from 'lucide-react';
import { User, LotteryDraw, DepositRequest, WithdrawalRequest, PurchasedTicket, WalletTransaction, NotificationItem, PaymentMethodType } from './types';
import { loadState, saveState } from './utils/storage';
import { soundFx } from './utils/audio';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { LotteryCard } from './components/LotteryCard';
import { DepositModal } from './components/DepositModal';
import { WithdrawModal } from './components/WithdrawModal';
import { TicketBuyModal } from './components/TicketBuyModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { LuckyWheelModal } from './components/LuckyWheelModal';
import { LiveWinnersTicker } from './components/LiveWinnersTicker';
import { MyTicketsView } from './components/MyTicketsView';
import { ResultsView } from './components/ResultsView';
import { ProfileView } from './components/ProfileView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthScreen } from './components/AuthScreen';
import { LiveRoulette } from './components/LiveRoulette';
import { auth, db, testConnection } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import confetti from 'canvas-confetti';

export default function App() {
  const [initialState] = useState(() => loadState());

  const [user, setUser] = useState<User>(initialState.user);
  const [draws, setDraws] = useState<LotteryDraw[]>(initialState.draws);
  const [deposits, setDeposits] = useState<DepositRequest[]>(initialState.deposits);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(initialState.withdrawals);
  const [tickets, setTickets] = useState<PurchasedTicket[]>(initialState.tickets);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(initialState.transactions);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialState.notifications);

  // Navigation & Modals UI state
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isDepositOpen, setIsDepositOpen] = useState<boolean>(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isLuckyWheelOpen, setIsLuckyWheelOpen] = useState<boolean>(false);
  const [isLiveRouletteOpen, setIsLiveRouletteOpen] = useState<boolean>(false);
  const [buyTicketDraw, setBuyTicketDraw] = useState<LotteryDraw | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Initialize Firebase connection test & auth listener
  useEffect(() => {
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setCurrentUser(fbUser);
        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data() as User;
            setUser({
              ...data,
              id: fbUser.uid,
              email: fbUser.email || data.email,
              avatarUrl: fbUser.photoURL || data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
            });
          } else {
            const newUserDoc: User = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'BETGURU Player',
              phone: fbUser.phoneNumber || '+91 9876543210',
              email: fbUser.email || '',
              avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              balance: 100,
              totalWon: 0,
              totalSpent: 0,
              referralCode: `BG${Math.floor(100000 + Math.random() * 900000)}`,
              totalReferrals: 0,
              lastSpinTime: 0,
              status: 'active',
              vipLevel: 'Gold',
              regDate: new Date().toLocaleDateString('en-IN')
            };
            await setDoc(userRef, newUserDoc);
            setUser(newUserDoc);
          }
        } catch (e) {
          console.error('Error syncing user with Firestore:', e);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (e) {
      console.error('Error signing out:', e);
    }
  };

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    saveState({ user, draws, deposits, withdrawals, tickets, transactions, notifications });
  }, [user, draws, deposits, withdrawals, tickets, transactions, notifications]);

  // Audio mute toggle
  const handleToggleMute = () => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
  };

  // Helper to trigger confetti celebrations
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.log('Confetti failed', e);
    }
  };

  // Automated Draw Resolution Timer Check (Runs every 10 sec)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      let hasUpdates = false;

      const updatedDraws = draws.map((draw) => {
        if (draw.endTime <= now) {
          hasUpdates = true;
          // Generate winning numbers if not already set
          const digitLen = draw.category === '4D Express' ? 4 : 6;
          const winningDigits = draw.winningNumbers || Array.from({ length: digitLen }, () => Math.floor(Math.random() * 10));

          // Evaluate player tickets for this draw
          tickets.forEach((t) => {
            if (t.drawId === draw.id && t.status === 'active') {
              const isWin = t.selectedNumbers.join('') === winningDigits.join('');
              const status = isWin ? 'win' : 'loss';
              const wonAmount = isWin ? draw.firstPrize : 0;

              t.status = status;
              t.wonAmount = wonAmount;

              if (isWin) {
                // Auto add funds to user wallet
                setUser((prev) => ({
                  ...prev,
                  balance: prev.balance + wonAmount,
                  totalWon: prev.totalWon + wonAmount
                }));

                // Add win transaction
                const winTx: WalletTransaction = {
                  id: `TXN-WIN-${Date.now().toString().slice(-4)}`,
                  userId: user.id,
                  type: 'win_payout',
                  amount: wonAmount,
                  description: `Jackpot Win! ${draw.title}`,
                  status: 'completed',
                  date: new Date().toLocaleString('en-IN')
                };
                setTransactions((prev) => [winTx, ...prev]);

                // Add notification
                const winNtf: NotificationItem = {
                  id: `NTF-${Date.now()}`,
                  userId: user.id,
                  title: `🎉 JACKPOT WINNER! You Won ₹${wonAmount.toLocaleString('en-IN')}`,
                  message: `Your ticket for ${draw.title} matched all numbers (${winningDigits.join(' ')})!`,
                  type: 'win',
                  date: 'Just now',
                  read: false
                };
                setNotifications((prev) => [winNtf, ...prev]);
                triggerConfetti();
              }
            }
          });

          // Reset draw countdown for next round
          return {
            ...draw,
            endTime: now + draw.drawDurationMs,
            winningNumbers: winningDigits,
            totalTicketsSold: Math.floor(Math.random() * 200) + 100
          };
        }
        return draw;
      });

      if (hasUpdates) {
        setDraws(updatedDraws);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [draws, tickets, user.id]);

  // Auto-dismiss non-critical informational notifications after 5 seconds
  useEffect(() => {
    const autoDismissTimer = setInterval(() => {
      const now = Date.now();
      setNotifications((prev) =>
        prev.filter((ntf) => {
          if (ntf.type === 'system' && !ntf.isCritical) {
            const age = now - (ntf.createdAt || now);
            return age < 5000;
          }
          return true;
        })
      );
    }, 1000);

    return () => clearInterval(autoDismissTimer);
  }, []);

  // Handle Deposit Submission
  const handleDepositSubmit = (amount: number, method: PaymentMethodType, utr: string, screenshotUrl: string) => {
    const newDep: DepositRequest = {
      id: `DEP-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      amount,
      method,
      utr,
      screenshotUrl,
      date: new Date().toLocaleString('en-IN'),
      status: 'pending'
    };

    setDeposits((prev) => [newDep, ...prev]);

    // Add user notification
    const depNtf: NotificationItem = {
      id: `NTF-${Date.now()}`,
      userId: user.id,
      title: '⏳ Deposit Submitted under Verification',
      message: `Your deposit request of ₹${amount} via ${method.toUpperCase()} (UTR: ${utr}) is under verification.`,
      type: 'deposit',
      date: 'Just now',
      read: false
    };
    setNotifications((prev) => [depNtf, ...prev]);
  };

  // Handle Admin Approve Deposit
  const handleAdminApproveDeposit = (depositId: string) => {
    const dep = deposits.find((d) => d.id === depositId);
    if (!dep || dep.status !== 'pending') return;

    setDeposits((prev) =>
      prev.map((d) => (d.id === depositId ? { ...d, status: 'approved' } : d))
    );

    // Add funds to user wallet
    setUser((prev) => ({
      ...prev,
      balance: prev.balance + dep.amount
    }));

    // Add transaction
    const depTx: WalletTransaction = {
      id: `TXN-DEP-${Date.now().toString().slice(-4)}`,
      userId: dep.userId,
      type: 'deposit',
      amount: dep.amount,
      description: `Approved Deposit via ${dep.method.toUpperCase()} (UTR: ${dep.utr})`,
      status: 'completed',
      date: new Date().toLocaleString('en-IN')
    };
    setTransactions((prev) => [depTx, ...prev]);

    // Send Notification
    const approveNtf: NotificationItem = {
      id: `NTF-${Date.now()}`,
      userId: dep.userId,
      title: `✅ Deposit Approved (₹${dep.amount})`,
      message: `Your deposit of ₹${dep.amount} has been verified and added to your wallet!`,
      type: 'deposit',
      date: 'Just now',
      read: false
    };
    setNotifications((prev) => [approveNtf, ...prev]);
    triggerConfetti();
  };

  // Handle Admin Reject Deposit
  const handleAdminRejectDeposit = (depositId: string, reason: string) => {
    setDeposits((prev) =>
      prev.map((d) => (d.id === depositId ? { ...d, status: 'rejected', rejectReason: reason } : d))
    );
  };

  // Handle Withdrawal Submission
  const handleWithdrawSubmit = (amount: number, fullName: string, accountNumber: string, ifscCode: string, upiId: string) => {
    // Deduct balance transiently
    setUser((prev) => ({
      ...prev,
      balance: prev.balance - amount
    }));

    const newWth: WithdrawalRequest = {
      id: `WTH-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      amount,
      fullName,
      accountNumber,
      ifscCode,
      upiId,
      date: new Date().toLocaleString('en-IN'),
      status: 'pending'
    };

    setWithdrawals((prev) => [newWth, ...prev]);

    // Add wallet ledger tx
    const wthTx: WalletTransaction = {
      id: `TXN-WTH-${Date.now().toString().slice(-4)}`,
      userId: user.id,
      type: 'withdrawal',
      amount: -amount,
      description: `Withdrawal Request to A/C ending ${accountNumber.slice(-4)}`,
      status: 'pending',
      date: new Date().toLocaleString('en-IN')
    };
    setTransactions((prev) => [wthTx, ...prev]);
  };

  // Handle Admin Approve Withdrawal
  const handleAdminApproveWithdrawal = (withdrawalId: string) => {
    setWithdrawals((prev) =>
      prev.map((w) => (w.id === withdrawalId ? { ...w, status: 'approved' } : w))
    );

    const wth = withdrawals.find((w) => w.id === withdrawalId);
    if (wth) {
      const approveNtf: NotificationItem = {
        id: `NTF-${Date.now()}`,
        userId: wth.userId,
        title: `✅ Withdrawal Approved (₹${wth.amount})`,
        message: `Your withdrawal of ₹${wth.amount} has been processed to A/C ${wth.accountNumber}.`,
        type: 'withdrawal',
        date: 'Just now',
        read: false
      };
      setNotifications((prev) => [approveNtf, ...prev]);
    }
  };

  // Handle Admin Reject Withdrawal
  const handleAdminRejectWithdrawal = (withdrawalId: string, reason: string) => {
    const wth = withdrawals.find((w) => w.id === withdrawalId);
    if (wth) {
      // Refund user balance
      setUser((prev) => ({
        ...prev,
        balance: prev.balance + wth.amount
      }));
    }

    setWithdrawals((prev) =>
      prev.map((w) => (w.id === withdrawalId ? { ...w, status: 'rejected', rejectReason: reason } : w))
    );
  };

  // Handle Ticket Purchase Confirmation
  const handleConfirmTicketBuy = (draw: LotteryDraw, ticketDigitsArray: number[][], totalPrice: number) => {
    // Award VIP Points (1 Point per ₹10 spent)
    const earnedVipPts = Math.floor(totalPrice / 10);

    // Deduct user balance & add VIP Points
    setUser((prev) => {
      const newPts = (prev.vipPoints || 120) + earnedVipPts;
      let newLevel = prev.vipLevel;
      if (newPts >= 10000) newLevel = 'VIP Platinum';
      else if (newPts >= 2000) newLevel = 'Gold';
      else if (newPts >= 500) newLevel = 'Silver';

      return {
        ...prev,
        balance: prev.balance - totalPrice,
        totalSpent: prev.totalSpent + totalPrice,
        vipPoints: newPts,
        vipLevel: newLevel
      };
    });

    // Create tickets
    const newTickets: PurchasedTicket[] = ticketDigitsArray.map((digits) => ({
      id: `TCK-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: user.id,
      drawId: draw.id,
      drawTitle: draw.title,
      ticketNumber: digits.join(' '),
      selectedNumbers: digits,
      price: draw.ticketPrice,
      purchaseDate: new Date().toLocaleString('en-IN'),
      drawTime: draw.endTime,
      status: 'active'
    }));

    setTickets((prev) => [...newTickets, ...prev]);

    // Log transaction
    const tx: WalletTransaction = {
      id: `TXN-BUY-${Date.now().toString().slice(-4)}`,
      userId: user.id,
      type: 'ticket_buy',
      amount: -totalPrice,
      description: `Purchased ${ticketDigitsArray.length} Ticket(s) - ${draw.title} (+${earnedVipPts} VIP Pts)`,
      status: 'completed',
      date: new Date().toLocaleString('en-IN')
    };
    setTransactions((prev) => [tx, ...prev]);

    // Update tickets sold count
    setDraws((prev) =>
      prev.map((d) => (d.id === draw.id ? { ...d, totalTicketsSold: d.totalTicketsSold + ticketDigitsArray.length } : d))
    );

    triggerConfetti();
  };

  // Handle Weekly VIP Bonus Claim
  const handleClaimVipBonus = (bonusAmount: number) => {
    setUser((prev) => ({
      ...prev,
      balance: prev.balance + bonusAmount
    }));

    const vipTx: WalletTransaction = {
      id: `TXN-VIP-${Date.now().toString().slice(-4)}`,
      userId: user.id,
      type: 'vip_bonus',
      amount: bonusAmount,
      description: `Weekly VIP Club Cash Bonus (${user.vipLevel})`,
      status: 'completed',
      date: new Date().toLocaleString('en-IN')
    };
    setTransactions((prev) => [vipTx, ...prev]);

    const ntf: NotificationItem = {
      id: `NTF-${Date.now()}`,
      userId: user.id,
      title: `👑 Weekly VIP Bonus (₹${bonusAmount})`,
      message: `You claimed your weekly VIP bonus payout of ₹${bonusAmount}!`,
      type: 'win',
      date: 'Just now',
      read: false
    };
    setNotifications((prev) => [ntf, ...prev]);
    triggerConfetti();
  };

  // Handle Claim Spin Reward
  const handleClaimWheelReward = (rewardAmount: number) => {
    setUser((prev) => ({
      ...prev,
      balance: prev.balance + rewardAmount,
      lastSpinTime: Date.now()
    }));

    const wheelTx: WalletTransaction = {
      id: `TXN-WHEEL-${Date.now().toString().slice(-4)}`,
      userId: user.id,
      type: 'wheel_bonus',
      amount: rewardAmount,
      description: `Lucky Wheel Bonus Reward`,
      status: 'completed',
      date: new Date().toLocaleString('en-IN')
    };
    setTransactions((prev) => [wheelTx, ...prev]);

    const ntf: NotificationItem = {
      id: `NTF-${Date.now()}`,
      userId: user.id,
      title: `🎁 Lucky Wheel Cash Bonus (₹${rewardAmount})`,
      message: `You won ₹${rewardAmount} from the Daily Lucky Wheel!`,
      type: 'win',
      date: 'Just now',
      read: false
    };
    setNotifications((prev) => [ntf, ...prev]);
    triggerConfetti();
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const activeTicketsCount = tickets.filter((t) => t.status === 'active').length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-0.5 animate-bounce shadow-2xl shadow-amber-500/30">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>
        </div>
        <p className="mt-4 text-xs font-mono font-bold text-amber-400 tracking-widest uppercase animate-pulse">
          AUTHENTICATING WITH BETGURU...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen gold-bg-hd text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 flex flex-col antialiased relative overflow-x-hidden">
      
      {/* Premium HD Gold Ambient Background Lighting */}
      <div className="fixed -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-amber-500/15 via-yellow-500/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed top-1/2 -left-32 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed bottom-10 -right-32 w-[450px] h-[450px] bg-yellow-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      
      {/* Top Header */}
      <Header
        balance={user.balance}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenDeposit={() => setIsDepositOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenProfile={() => setActiveTab('profile')}
        muted={isMuted}
        onToggleMute={handleToggleMute}
        user={user}
      />

      {/* Live Winners Horizontal Marquee */}
      <LiveWinnersTicker />

      {/* Main View Router */}
      <main className="flex-1">
        {isAdminMode ? (
          <AdminDashboard
            deposits={deposits}
            withdrawals={withdrawals}
            draws={draws}
            tickets={tickets}
            user={user}
            transactions={transactions}
            onApproveDeposit={handleAdminApproveDeposit}
            onRejectDeposit={handleAdminRejectDeposit}
            onApproveWithdrawal={handleAdminApproveWithdrawal}
            onRejectWithdrawal={handleAdminRejectWithdrawal}
            onTriggerDrawResult={(drawId, winningNumbers) => {
              setDraws((prev) =>
                prev.map((d) => (d.id === drawId ? { ...d, winningNumbers } : d))
              );
            }}
            onUpdateUserBalance={(newBalance) => {
              setUser((prev) => ({ ...prev, balance: newBalance }));
            }}
            onUpdateUserBonusBalance={(newBonus) => {
              setUser((prev) => ({ ...prev, bonusBalance: newBonus }));
            }}
            onToggleUserStatus={() => {
              setUser((prev) => ({ ...prev, status: prev.status === 'active' ? 'suspended' : 'active' }));
            }}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 pb-28">
                
                {/* Hero Banner with HD Glow */}
                <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 p-6 sm:p-8 shadow-2xl overflow-hidden">
                  <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="relative z-10 max-w-2xl space-y-4">
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-amber-300 text-xs font-mono font-bold">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>INDIA'S #1 HD LOTTERY PLATFORM</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black text-white font-mono tracking-tight leading-tight">
                      PLAY & WIN <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">REAL CASH</span> JACKPOTS!
                    </h1>

                    <p className="text-sm text-slate-300 font-medium leading-relaxed">
                      Instant wallet deposits via UPI & PhonePe, guaranteed 100% transparent live draws, and lightning-fast bank withdrawals within minutes.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={() => { soundFx.playClick(); setIsLiveRouletteOpen(true); }}
                        className="px-6 py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm font-mono rounded-2xl shadow-xl shadow-amber-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                      >
                        <Disc className="w-5 h-5 text-slate-950 animate-spin [animation-duration:8s]" />
                        <span>PLAY LIVE ROULETTE (CASINO)</span>
                      </button>

                      <button
                        onClick={() => { soundFx.playClick(); setIsDepositOpen(true); }}
                        className="px-5 py-3 bg-slate-900/90 hover:bg-slate-800 text-amber-400 font-bold text-xs sm:text-sm rounded-2xl border border-amber-500/30 flex items-center gap-2 transition-all hover:scale-105"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>DEPOSIT FUNDS</span>
                      </button>

                      <button
                        onClick={() => { soundFx.playClick(); setIsLuckyWheelOpen(true); }}
                        className="px-5 py-3 bg-slate-900/90 hover:bg-slate-800 text-emerald-400 font-bold text-xs sm:text-sm rounded-2xl border border-emerald-500/30 flex items-center gap-2 transition-all hover:scale-105"
                      >
                        <Dices className="w-4 h-4" />
                        <span>FREE DAILY SPIN</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active HD Lottery Draws Section */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                        <Flame className="w-4 h-4 fill-amber-400" />
                      </div>
                      <h2 className="text-xl font-black text-white font-mono">LIVE HD LOTTERY DRAWS</h2>
                    </div>
                    <span className="text-xs font-mono text-amber-400 font-bold">UPDATES AUTOMATICALLY</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {draws.map((draw) => (
                      <LotteryCard
                        key={draw.id}
                        draw={draw}
                        onBuyTicket={(selectedDraw) => setBuyTicketDraw(selectedDraw)}
                      />
                    ))}
                  </div>
                </div>

                {/* How to Play 3-Step Section */}
                <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 space-y-4">
                  <h3 className="text-center text-sm font-extrabold text-amber-400 font-mono uppercase tracking-wider">
                    How BETGURU Lottery Works
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-extrabold font-mono flex items-center justify-center mx-auto text-sm">1</div>
                      <h4 className="text-xs font-bold text-white font-mono">1. Deposit Wallet</h4>
                      <p className="text-[11px] text-slate-400">Pay via PhonePe, GPay, Paytm or UPI with instant verification.</p>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-extrabold font-mono flex items-center justify-center mx-auto text-sm">2</div>
                      <h4 className="text-xs font-bold text-white font-mono">2. Buy Lucky Ticket</h4>
                      <p className="text-[11px] text-slate-400">Pick manual lucky numbers or click Quick Pick for auto-generation.</p>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-extrabold font-mono flex items-center justify-center mx-auto text-sm">3</div>
                      <h4 className="text-xs font-bold text-white font-mono">3. Win & Withdraw</h4>
                      <p className="text-[11px] text-slate-400">Match digits during draw time and receive instant cash payouts!</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'tickets' && (
              <MyTicketsView
                tickets={tickets}
                onOpenBuyTicket={() => {
                  setActiveTab('home');
                  setBuyTicketDraw(draws[0]);
                }}
              />
            )}

            {activeTab === 'results' && (
              <ResultsView
                draws={draws}
                onOpenBuyTicket={(d) => setBuyTicketDraw(d)}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                user={user}
                deposits={deposits}
                withdrawals={withdrawals}
                tickets={tickets}
                transactions={transactions}
                onOpenDeposit={() => setIsDepositOpen(true)}
                onOpenWithdraw={() => setIsWithdrawOpen(true)}
                onLogout={handleLogout}
                onClaimVipBonus={handleClaimVipBonus}
                onOpenAdmin={() => setIsAdminMode(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Fixed Responsive Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setIsAdminMode(false);
          if (tab === 'lucky_wheel') {
            setIsLuckyWheelOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        activeTicketsCount={activeTicketsCount}
        onOpenRoulette={() => setIsLiveRouletteOpen(true)}
      />

      {/* FULLSCREEN IMMERSIVE LIVE ROULETTE CASINO MODULE */}
      {isLiveRouletteOpen && (
        <LiveRoulette
          user={user}
          onUpdateBalance={(newBalance) => {
            setUser((prev) => ({ ...prev, balance: newBalance }));
          }}
          onAddTransaction={(tx) => {
            setTransactions((prev) => [tx, ...prev]);
          }}
          onClose={() => setIsLiveRouletteOpen(false)}
          onOpenDeposit={() => {
            setIsLiveRouletteOpen(false);
            setIsDepositOpen(true);
          }}
        />
      )}

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSubmitDeposit={handleDepositSubmit}
      />

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        userBalance={user.balance}
        userVipLevel={user.vipLevel}
        onSubmitWithdrawal={handleWithdrawSubmit}
      />

      {/* Ticket Purchasing Drawer */}
      <TicketBuyModal
        draw={buyTicketDraw}
        userBalance={user.balance}
        onClose={() => setBuyTicketDraw(null)}
        onConfirmPurchase={handleConfirmTicketBuy}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={() => {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
        onClearAll={() => {
          setNotifications([]);
        }}
        onRemoveNotification={(id) => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }}
      />

      {/* Daily Lucky Wheel Modal */}
      <LuckyWheelModal
        isOpen={isLuckyWheelOpen}
        onClose={() => setIsLuckyWheelOpen(false)}
        onClaimReward={handleClaimWheelReward}
        lastSpinTime={user.lastSpinTime}
      />

    </div>
  );
}

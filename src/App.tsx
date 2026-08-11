/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, Wallet, Dices, Plus, ArrowUpRight, ShieldCheck, ShieldAlert, Flame, Star, CheckCircle2, Disc, Play } from 'lucide-react';
import { User, LotteryDraw, DepositRequest, WithdrawalRequest, PurchasedTicket, WalletTransaction, NotificationItem, PaymentMethodType, UserSettings } from './types';
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
import { SettingsView } from './components/SettingsView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthScreen } from './components/AuthScreen';
import { LiveRoulette } from './components/LiveRoulette';
import { LotterySection } from './components/LotterySection';
import { WithdrawalSection } from './components/WithdrawalSection';
import { SuperCarDrawSection } from './components/SuperCarDrawSection';
import { SuperCarWinToast, SuperCarWinToastData } from './components/SuperCarWinToast';
import { SuperCarConfig, SuperCarDrawIssue, SuperCarColor } from './types';
import { DEFAULT_SUPERCAR_CONFIG, getSuperCarInfo } from './utils/supercar';
import { auth, db, testConnection } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { logAnalyticsEvent } from './utils/analytics';
import confetti from 'canvas-confetti';
import { 
  notifyDepositSubmitted, 
  notifyDepositApproved, 
  notifyDepositRejected, 
  notifyWithdrawalSubmitted, 
  notifyWithdrawalApproved, 
  notifyWithdrawalRejected,
  notifyBonusCredited
} from './utils/emailNotifier';

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
  const [activeTab, setActiveTab] = useState<NavTab | 'settings'>('home');
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isDepositOpen, setIsDepositOpen] = useState<boolean>(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isLuckyWheelOpen, setIsLuckyWheelOpen] = useState<boolean>(false);
  const [isLiveRouletteOpen, setIsLiveRouletteOpen] = useState<boolean>(false);
  const [buyTicketDraw, setBuyTicketDraw] = useState<LotteryDraw | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // SuperCar States
  const [supercarConfig, setSupercarConfig] = useState<SuperCarConfig>(DEFAULT_SUPERCAR_CONFIG);
  const [supercarCurrentIssue, setSupercarCurrentIssue] = useState<SuperCarDrawIssue | null>(null);
  const [supercarPastDraws, setSupercarPastDraws] = useState<SuperCarDrawIssue[]>([]);
  const [superCarWinToast, setSuperCarWinToast] = useState<SuperCarWinToastData | null>(null);
  const notifiedWinTicketIdsRef = React.useRef<Set<string>>(new Set());

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [userHasAdminClaim, setUserHasAdminClaim] = useState<boolean>(false);

  // Firestore Persistence Helpers
  const persistUserBalance = async (userId: string, newBalance: number, newBonusBalance?: number) => {
    try {
      const userRef = doc(db, 'users', userId);
      const updateData: any = { balance: newBalance };
      if (typeof newBonusBalance === 'number') {
        updateData.bonusBalance = newBonusBalance;
      }
      await setDoc(userRef, updateData, { merge: true });
    } catch (err) {
      console.error('Error persisting balance to Firestore:', err);
    }
  };

  const persistTransaction = async (tx: WalletTransaction) => {
    try {
      const txRef = doc(db, 'transactions', tx.id);
      await setDoc(txRef, tx, { merge: true });
    } catch (err) {
      console.error('Error persisting transaction to Firestore:', err);
    }
  };

  const persistDeposit = async (dep: DepositRequest) => {
    try {
      const depRef = doc(db, 'deposits', dep.id);
      // Ensure screenshotUrl base64 doesn't exceed Firestore document size limit (1MB)
      let sanitizedDep = { ...dep };
      if (sanitizedDep.screenshotUrl && sanitizedDep.screenshotUrl.length > 300000) {
        sanitizedDep.screenshotUrl = 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80';
      }
      await setDoc(depRef, sanitizedDep, { merge: true });
    } catch (err) {
      console.error('Error persisting deposit to Firestore:', err);
    }
  };

  const persistWithdrawal = async (wth: WithdrawalRequest) => {
    try {
      const wthRef = doc(db, 'withdrawals', wth.id);
      await setDoc(wthRef, wth, { merge: true });
    } catch (err) {
      console.error('Error persisting withdrawal to Firestore:', err);
    }
  };

  const persistTicket = async (ticket: PurchasedTicket) => {
    try {
      const ticketRef = doc(db, 'tickets', ticket.id);
      await setDoc(ticketRef, ticket, { merge: true });
    } catch (err) {
      console.error('Error persisting ticket to Firestore:', err);
    }
  };

  const persistNotification = async (ntf: NotificationItem) => {
    try {
      const ntfRef = doc(db, 'notifications', ntf.id);
      await setDoc(ntfRef, ntf, { merge: true });
    } catch (err) {
      console.error('Error persisting notification to Firestore:', err);
    }
  };

  // Helper to reset user history states to prevent cross-user cached data leakage
  const resetUserDataState = () => {
    setTransactions([]);
    setDeposits([]);
    setWithdrawals([]);
    setTickets([]);
    setNotifications([]);
  };

  // Initialize Firebase connection test & auth listener
  useEffect(() => {
    testConnection();

    let unsubUser: (() => void) | null = null;
    let unsubTx: (() => void) | null = null;
    let unsubDeposits: (() => void) | null = null;
    let unsubWithdrawals: (() => void) | null = null;
    let unsubTickets: (() => void) | null = null;
    let unsubRoulette: (() => void) | null = null;
    let unsubNotifications: (() => void) | null = null;

    const cleanupListeners = () => {
      if (unsubUser) { try { unsubUser(); } catch (_) {} unsubUser = null; }
      if (unsubTx) { try { unsubTx(); } catch (_) {} unsubTx = null; }
      if (unsubDeposits) { try { unsubDeposits(); } catch (_) {} unsubDeposits = null; }
      if (unsubWithdrawals) { try { unsubWithdrawals(); } catch (_) {} unsubWithdrawals = null; }
      if (unsubTickets) { try { unsubTickets(); } catch (_) {} unsubTickets = null; }
      if (unsubRoulette) { try { unsubRoulette(); } catch (_) {} unsubRoulette = null; }
      if (unsubNotifications) { try { unsubNotifications(); } catch (_) {} unsubNotifications = null; }
    };

    const sortChronologicalNewestFirst = <T extends { date?: string; purchaseDate?: string; id: string }>(items: T[]): T[] => {
      return [...items].sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : (a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0);
        const timeB = b.date ? new Date(b.date).getTime() : (b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0);
        if (timeA !== timeB && !isNaN(timeA) && !isNaN(timeB)) return timeB - timeA;
        return b.id.localeCompare(a.id);
      });
    };

    const attachRealtimeUserListeners = (activeUid: string, claimsAdmin: boolean) => {
      cleanupListeners();

      // 1. Real-time user profile & balance listener
      const userRef = doc(db, 'users', activeUid);
      unsubUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const uData = docSnap.data() as User;
          setUser((prev) => ({
            ...prev,
            ...uData,
            balance: typeof uData.balance === 'number' ? uData.balance : (prev?.balance ?? 100),
            bonusBalance: typeof uData.bonusBalance === 'number' ? uData.bonusBalance : (prev?.bonusBalance ?? 100)
          }));
        }
      }, (err) => console.warn('Real-time user snapshot notice:', err.message));

      // 2. Real-time Transactions query
      let qTx;
      try {
        qTx = query(collection(db, 'transactions'), where('userId', '==', activeUid), orderBy('date', 'desc'), limit(100));
      } catch (_) {
        qTx = query(collection(db, 'transactions'), where('userId', '==', activeUid), limit(100));
      }
      unsubTx = onSnapshot(qTx, (txSnap) => {
        if (!txSnap.empty) {
          const loadedTxs = sortChronologicalNewestFirst(txSnap.docs.map((d) => d.data() as WalletTransaction));
          setTransactions(loadedTxs);
        } else {
          setTransactions([]);
        }
      }, (err) => {
        console.warn('Real-time transactions snapshot notice:', err.message);
        const fallbackQ = query(collection(db, 'transactions'), where('userId', '==', activeUid), limit(100));
        onSnapshot(fallbackQ, (fSnap) => {
          if (!fSnap.empty) {
            setTransactions(sortChronologicalNewestFirst(fSnap.docs.map((d) => d.data() as WalletTransaction)));
          } else {
            setTransactions([]);
          }
        });
      });

      // 3. Real-time Deposit Requests query
      const qDeposits = claimsAdmin
        ? query(collection(db, 'deposits'), orderBy('date', 'desc'), limit(100))
        : query(collection(db, 'deposits'), where('userId', '==', activeUid), orderBy('date', 'desc'), limit(100));
      unsubDeposits = onSnapshot(qDeposits, (snap) => {
        if (!snap.empty) {
          const list = sortChronologicalNewestFirst(snap.docs.map((d) => d.data() as DepositRequest));
          setDeposits(list);
        } else {
          setDeposits([]);
        }
      }, (err) => {
        console.warn('Real-time deposits snapshot notice:', err.message);
        const fallbackQ = claimsAdmin
          ? query(collection(db, 'deposits'), limit(100))
          : query(collection(db, 'deposits'), where('userId', '==', activeUid), limit(100));
        onSnapshot(fallbackQ, (fSnap) => {
          if (!fSnap.empty) {
            setDeposits(sortChronologicalNewestFirst(fSnap.docs.map((d) => d.data() as DepositRequest)));
          } else {
            setDeposits([]);
          }
        });
      });

      // 4. Real-time Withdrawal Requests query
      const qWithdrawals = claimsAdmin
        ? query(collection(db, 'withdrawals'), orderBy('date', 'desc'), limit(100))
        : query(collection(db, 'withdrawals'), where('userId', '==', activeUid), orderBy('date', 'desc'), limit(100));
      unsubWithdrawals = onSnapshot(qWithdrawals, (snap) => {
        if (!snap.empty) {
          const list = sortChronologicalNewestFirst(snap.docs.map((d) => d.data() as WithdrawalRequest));
          setWithdrawals(list);
        } else {
          setWithdrawals([]);
        }
      }, (err) => {
        console.warn('Real-time withdrawals snapshot notice:', err.message);
        const fallbackQ = claimsAdmin
          ? query(collection(db, 'withdrawals'), limit(100))
          : query(collection(db, 'withdrawals'), where('userId', '==', activeUid), limit(100));
        onSnapshot(fallbackQ, (fSnap) => {
          if (!fSnap.empty) {
            setWithdrawals(sortChronologicalNewestFirst(fSnap.docs.map((d) => d.data() as WithdrawalRequest)));
          } else {
            setWithdrawals([]);
          }
        });
      });

      // 5. Real-time Lottery Tickets query
      const qTickets = claimsAdmin
        ? query(collection(db, 'tickets'), orderBy('purchaseDate', 'desc'), limit(100))
        : query(collection(db, 'tickets'), where('userId', '==', activeUid), orderBy('purchaseDate', 'desc'), limit(100));
      unsubTickets = onSnapshot(qTickets, (ticketSnap) => {
        if (!ticketSnap.empty) {
          const list = sortChronologicalNewestFirst(ticketSnap.docs.map((d) => d.data() as PurchasedTicket));
          setTickets(list);
        } else {
          setTickets([]);
        }
      }, (err) => {
        console.warn('Real-time tickets snapshot notice:', err.message);
        const fallbackQ = claimsAdmin
          ? query(collection(db, 'tickets'), limit(100))
          : query(collection(db, 'tickets'), where('userId', '==', activeUid), limit(100));
        onSnapshot(fallbackQ, (fSnap) => {
          if (!fSnap.empty) {
            setTickets(sortChronologicalNewestFirst(fSnap.docs.map((d) => d.data() as PurchasedTicket)));
          } else {
            setTickets([]);
          }
        });
      });

      // 6. Real-time Notifications query
      const qNotifications = claimsAdmin
        ? query(collection(db, 'notifications'), limit(50))
        : query(collection(db, 'notifications'), where('userId', '==', activeUid), limit(50));
      unsubNotifications = onSnapshot(qNotifications, (ntfSnap) => {
        if (!ntfSnap.empty) {
          const list = sortChronologicalNewestFirst(ntfSnap.docs.map((d) => d.data() as NotificationItem));
          setNotifications(list);
        } else {
          setNotifications([]);
        }
      }, (err) => console.warn('Real-time notifications snapshot notice:', err.message));
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      cleanupListeners();

      if (fbUser) {
        setCurrentUser(fbUser);
        resetUserDataState();

        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const isAdminEmail = fbUser.email?.toLowerCase() === 'subhasishpramanik835@gmail.com' || fbUser.email?.toLowerCase() === 'asishp92@gmail.com';
          
          let claimsAdmin = false;
          try {
            const tokenResult = await fbUser.getIdTokenResult();
            const claims = tokenResult.claims;
            const roleClaim = claims.role || (claims.admin ? 'admin' : claims.super_admin ? 'super_admin' : undefined);
            claimsAdmin = roleClaim === 'admin' || roleClaim === 'super_admin' || claims.admin === true || claims.super_admin === true || isAdminEmail;
          } catch (tokenErr) {
            console.warn('Error reading ID token custom claims:', tokenErr);
            claimsAdmin = isAdminEmail;
          }
          setUserHasAdminClaim(claimsAdmin);

          let userSnap: any = null;
          try {
            userSnap = await getDoc(userRef);
          } catch (offlineErr) {
            console.warn('Firestore user fetch offline or network delay:', offlineErr);
          }

          if (userSnap && userSnap.exists()) {
            const data = userSnap.data() as User;
            const updatedUser: User = {
              ...data,
              id: fbUser.uid,
              name: data.name || fbUser.displayName || 'BETGURU Player',
              email: fbUser.email || data.email || '',
              avatarUrl: fbUser.photoURL || data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              role: claimsAdmin ? 'admin' : (data.role || 'user'),
              bonusBalance: typeof data.bonusBalance === 'number' ? data.bonusBalance : 100,
              balance: typeof data.balance === 'number' ? data.balance : 100
            };
            setUser(updatedUser);

            if (data.settings) {
              soundFx.setBgMusicEnabled(data.settings.bgMusicEnabled ?? true);
              soundFx.setSoundEffectsEnabled(data.settings.soundEffectsEnabled ?? true);
              soundFx.setHapticEnabled(data.settings.hapticEnabled ?? true);
            }

            setDoc(userRef, {
              name: updatedUser.name,
              email: updatedUser.email,
              avatarUrl: updatedUser.avatarUrl,
              role: updatedUser.role,
              lastLogin: new Date().toISOString()
            }, { merge: true }).catch((err) => console.warn('Deferred user update notice:', err));
          } else {
            const newUserDoc: User = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'BETGURU Player',
              phone: fbUser.phoneNumber || '+91 9876543210',
              email: fbUser.email || '',
              avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              balance: 100,
              bonusBalance: 100,
              totalWon: 0,
              totalSpent: 0,
              referralCode: `BG${Math.floor(100000 + Math.random() * 900000)}`,
              totalReferrals: 0,
              lastSpinTime: 0,
              status: 'active',
              role: isAdminEmail ? 'admin' : 'user',
              vipLevel: 'Bronze',
              vipPoints: 120,
              regDate: new Date().toLocaleDateString('en-IN')
            };
            setUser(newUserDoc);
            setDoc(userRef, newUserDoc, { merge: true }).catch((err) => console.warn('Deferred new user creation notice:', err));
          }

          attachRealtimeUserListeners(fbUser.uid, claimsAdmin);

        } catch (e) {
          console.error('Error syncing user with Firestore:', e);
        }
      } else {
        const directSession = localStorage.getItem('betguru_direct_user_session');
        if (directSession) {
          try {
            const parsed = JSON.parse(directSession);
            if (parsed && parsed.uid) {
              const directUid = parsed.uid;
              resetUserDataState();
              const directRef = doc(db, 'users', directUid);
              const directSnap = await getDoc(directRef);
              if (directSnap.exists()) {
                const uData = directSnap.data() as User;
                const isAdminEmail = (uData.email || '').toLowerCase() === 'subhasishpramanik835@gmail.com' || (uData.email || '').toLowerCase() === 'asishp92@gmail.com' || uData.role === 'admin';
                const loadedUser: User = {
                  ...uData,
                  id: directUid,
                  role: isAdminEmail ? 'admin' : (uData.role || 'user'),
                  balance: typeof uData.balance === 'number' ? uData.balance : 100,
                  bonusBalance: typeof uData.bonusBalance === 'number' ? uData.bonusBalance : 100
                };
                setUser(loadedUser);
                setCurrentUser({ uid: directUid, email: loadedUser.email, displayName: loadedUser.name } as any);
                setUserHasAdminClaim(isAdminEmail);

                attachRealtimeUserListeners(directUid, isAdminEmail);
              }
            }
          } catch (e) {
            console.warn('Error reading direct user session:', e);
          }
        } else {
          setCurrentUser(null);
          setUser(null as any);
          resetUserDataState();
        }
      }
      setAuthLoading(false);
    });

    const handleDirectAuthChanged = () => {
      if (!auth.currentUser) {
        const directSession = localStorage.getItem('betguru_direct_user_session');
        if (directSession) {
          try {
            const parsed = JSON.parse(directSession);
            if (parsed && parsed.uid) {
              resetUserDataState();
              getDoc(doc(db, 'users', parsed.uid)).then((snap) => {
                if (snap.exists()) {
                  const uData = snap.data() as User;
                  const isAdminEmail = (uData.email || '').toLowerCase() === 'subhasishpramanik835@gmail.com' || (uData.email || '').toLowerCase() === 'asishp92@gmail.com' || uData.role === 'admin';
                  setUser({
                    ...uData,
                    id: parsed.uid,
                    role: isAdminEmail ? 'admin' : (uData.role || 'user')
                  });
                  setCurrentUser({ uid: parsed.uid, email: uData.email, displayName: uData.name } as any);
                  setUserHasAdminClaim(isAdminEmail);

                  attachRealtimeUserListeners(parsed.uid, isAdminEmail);
                }
              });
            }
          } catch (e) {
            console.warn('Direct auth changed listener notice:', e);
          }
        } else {
          setCurrentUser(null);
          setUser(null as any);
          resetUserDataState();
        }
      }
    };

    window.addEventListener('betguru_direct_auth_changed', handleDirectAuthChanged);

    return () => {
      cleanupListeners();
      unsubscribeAuth();
      window.removeEventListener('betguru_direct_auth_changed', handleDirectAuthChanged);
    };
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    try {
      localStorage.removeItem('betguru_direct_user_session');
      localStorage.removeItem('betguru_user');
      localStorage.removeItem('betguru_deposits');
      localStorage.removeItem('betguru_withdrawals');
      localStorage.removeItem('betguru_tickets');
      localStorage.removeItem('betguru_transactions');
      localStorage.removeItem('betguru_notifications');
      await signOut(auth);
      setCurrentUser(null);
      setUser(null as any);
      resetUserDataState();
    } catch (e) {
      console.error('Error signing out:', e);
    }
  };

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    saveState({ user, draws, deposits, withdrawals, tickets, transactions, notifications });
  }, [user, draws, deposits, withdrawals, tickets, transactions, notifications]);

  // SuperCar Config & Draws Real-time Listener
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'supercar_config', 'main'), (snap) => {
      if (snap.exists()) {
        const remoteData = snap.data();
        console.log('[App.tsx] Real-time supercar_config updated from Firestore:', remoteData);
        setSupercarConfig((prev) => ({ ...prev, ...remoteData }));
      }
    }, (err) => console.warn('Supercar config listener notice:', err.message));

    const qSuperCar = query(collection(db, 'supercar_draws'), limit(50));
    const unsubDraws = onSnapshot(qSuperCar, (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map((d) => d.data() as SuperCarDrawIssue);
        list.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (timeA !== timeB && !isNaN(timeA) && !isNaN(timeB)) return timeB - timeA;
          return (b.issueId || '').localeCompare(a.issueId || '');
        });
        setSupercarPastDraws(list);
      } else {
        setSupercarPastDraws([]);
      }
    }, (err) => console.warn('Supercar draws listener notice:', err.message));

    return () => {
      unsubConfig();
      unsubDraws();
    };
  }, []);

  // Robust boolean check for SuperCar draw section visibility
  const isSuperCarEnabled = supercarConfig?.enabled === undefined
    ? true
    : (supercarConfig.enabled === true || String(supercarConfig.enabled).toLowerCase() === 'true');

  // Forced debug log of supercarConfig upon mount/update to verify Red car image URL
  useEffect(() => {
    const redCarInfo = getSuperCarInfo('red', supercarConfig);
    console.log('[App.tsx] Mount/Update supercarConfig state:', supercarConfig);
    console.log('[App.tsx] supercarConfig.enabled raw:', supercarConfig?.enabled, 'parsed isSuperCarEnabled:', isSuperCarEnabled);
    console.log('[App.tsx] Red Car Image URL:', redCarInfo.image);
    console.log('[App.tsx] Red Car Full Details:', redCarInfo);
  }, [supercarConfig, isSuperCarEnabled]);

  // SuperCar Ticket Purchase Handler
  const handleConfirmSuperCarTicketBuy = async (carColor: SuperCarColor, quantity: number, totalCost: number) => {
    logAnalyticsEvent('ticket_buy', { category: 'Three Super Car Draw', carColor, quantity, totalCost }, user.id, user.email);

    if (user.balance < totalCost) {
      alert(`Insufficient Wallet Balance! Required ₹${totalCost}, Available ₹${user.balance}. Please deposit funds.`);
      setIsDepositOpen(true);
      return;
    }

    const newBal = user.balance - totalCost;
    const earnedVipPts = Math.floor(totalCost / 10);
    const updatedVipPts = user.vipPoints + earnedVipPts;

    setUser((prev) => ({
      ...prev,
      balance: newBal,
      vipPoints: updatedVipPts
    }));
    if (user?.id) persistUserBalance(user.id, newBal);

    const nowStr = new Date().toLocaleString('en-IN');
    const newTickets: PurchasedTicket[] = [];

    for (let i = 0; i < quantity; i++) {
      const ticketNum = `CAR-${carColor.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newTicket: PurchasedTicket = {
        id: `TKT-SC-${Date.now()}-${i}`,
        userId: user.id,
        drawId: `SUPERCAR-${Date.now().toString().slice(-6)}`,
        drawTitle: `Super Car - ${carColor.toUpperCase()} CAR`,
        category: 'Three Super Car Draw',
        selectedNumbers: [carColor.toUpperCase()],
        ticketNumber: ticketNum,
        price: supercarConfig.ticketPrice || 100,
        purchaseDate: nowStr,
        drawDate: 'Today 30-min Draw',
        status: 'active',
        selectedCar: carColor
      };
      newTickets.push(newTicket);
    }

    setTickets((prev) => [...newTickets, ...prev]);
    newTickets.forEach((t) => persistTicket(t));

    const tx: WalletTransaction = {
      id: `TXN-SUPERCAR-${Date.now().toString().slice(-4)}`,
      userId: user.id,
      type: 'ticket_buy',
      amount: -totalCost,
      description: `Purchased ${quantity}x ${carColor.toUpperCase()} Super Car Ticket(s) (+${earnedVipPts} VIP Pts)`,
      status: 'completed',
      date: nowStr
    };
    setTransactions((prev) => [tx, ...prev]);
    persistTransaction(tx);

    triggerConfetti();
  };

  // SuperCar Draw Resolved Handler
  const handleSuperCarDrawResolved = async (issueId: string, winningCar: SuperCarColor) => {
    soundFx.playWinFanfare();
    triggerConfetti();

    let totalWonAmount = 0;
    const multiplier = supercarConfig.prizeMultiplier || 2.8;

    const updatedTickets = tickets.map((t) => {
      if (t.category === 'Three Super Car Draw' && t.status === 'active') {
        if (t.selectedCar === winningCar) {
          const winAmt = Math.round(t.price * multiplier);
          totalWonAmount += winAmt;
          const updatedT = { ...t, status: 'win' as const, winAmount: winAmt };
          persistTicket(updatedT);
          return updatedT;
        } else {
          const updatedT = { ...t, status: 'loss' as const };
          persistTicket(updatedT);
          return updatedT;
        }
      }
      return t;
    });

    setTickets(updatedTickets);

    if (totalWonAmount > 0) {
      const newBal = user.balance + totalWonAmount;
      setUser((prev) => ({ ...prev, balance: newBal }));
      if (user?.id) persistUserBalance(user.id, newBal);

      const winTx: WalletTransaction = {
        id: `TXN-SC-WIN-${Date.now().toString().slice(-4)}`,
        userId: user.id,
        type: 'ticket_win',
        amount: totalWonAmount,
        description: `🏆 WON Super Car Draw Jackpot (${winningCar.toUpperCase()} Car Winner!)`,
        status: 'completed',
        date: new Date().toLocaleString('en-IN')
      };
      setTransactions((prev) => [winTx, ...prev]);
      persistTransaction(winTx);

      // Trigger High-Visibility Toast Notification
      setSuperCarWinToast({
        id: `sc-toast-manual-${Date.now()}`,
        winningCar,
        amountWon: totalWonAmount,
        issueId
      });
    }

    try {
      const drawIssueDoc: SuperCarDrawIssue = {
        id: issueId,
        issueId,
        drawTime: new Date().toLocaleString('en-IN'),
        winningCar,
        status: 'completed'
      };
      await setDoc(doc(db, 'supercar_draws', issueId), drawIssueDoc, { merge: true });
    } catch (err) {
      console.error('Error recording supercar draw result:', err);
    }
  };

  // Automated Real-time SuperCar Win Toast Detector for user tickets
  useEffect(() => {
    if (!tickets || tickets.length === 0) return;

    const winningSuperCarTickets = tickets.filter(
      (t) => t.category === 'Three Super Car Draw' && t.status === 'win' && (t.winAmount || 0) > 0
    );

    for (const t of winningSuperCarTickets) {
      if (!notifiedWinTicketIdsRef.current.has(t.id)) {
        notifiedWinTicketIdsRef.current.add(t.id);
        const winningCar = (t.selectedCar || (t.selectedNumbers?.[0]?.toLowerCase() as SuperCarColor) || 'red') as SuperCarColor;
        const amountWon = t.winAmount || Math.round((t.price || 100) * (supercarConfig.prizeMultiplier || 2.8));

        setSuperCarWinToast({
          id: `sc-toast-auto-${t.id}`,
          winningCar,
          amountWon,
          issueId: t.drawId
        });
        try {
          soundFx.playWinFanfare();
        } catch (e) {
          console.warn('Audio play notice:', e);
        }
        triggerConfetti();
        break;
      }
    }
  }, [tickets, supercarPastDraws, supercarConfig]);

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
              const selectedStr = (t.selectedNumbers || (t as any).numbers || []).join('');
              const winStr = (winningDigits || []).join('');
              const isWin = selectedStr === winStr;
              const status = isWin ? 'win' : 'loss';
              const wonAmount = isWin ? draw.firstPrize : 0;

              t.status = status;
              t.wonAmount = wonAmount;

              if (isWin) {
                // Auto add funds to user wallet
                setUser((prev) => {
                  const newBal = prev.balance + wonAmount;
                  persistUserBalance(user.id, newBal);
                  return {
                    ...prev,
                    balance: newBal,
                    totalWon: prev.totalWon + wonAmount
                  };
                });

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
                persistTransaction(winTx);

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
    logAnalyticsEvent('deposit_attempt', { amount, method, utr }, user.id, user.email);

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
    persistDeposit(newDep);

    // Send real-time SMTP Email notification
    notifyDepositSubmitted(user.email, user.name, amount, method, utr).catch((err) =>
      console.warn('Deposit submission email error:', err)
    );

    // Add user notification
    const depNtf: NotificationItem = {
      id: `NTF-${Date.now()}`,
      userId: user.id,
      title: '⏳ Deposit Submitted under Verification',
      message: `Your deposit request of ₹${amount} via ${(method || 'UPI').toString().toUpperCase()} (UTR: ${utr}) is under verification.`,
      type: 'deposit',
      date: 'Just now',
      read: false
    };
    setNotifications((prev) => [depNtf, ...prev]);
  };

  // Handle Admin Approve Deposit
  const handleAdminApproveDeposit = async (depositId: string) => {
    const dep = deposits.find((d) => d.id === depositId);
    if (!dep || dep.status !== 'pending') return;

    const updatedDep: DepositRequest = { ...dep, status: 'approved' };
    setDeposits((prev) =>
      prev.map((d) => (d.id === depositId ? updatedDep : d))
    );
    persistDeposit(updatedDep);

    try {
      // Fetch the target user's current doc from Firestore to get their real balance
      const targetUserRef = doc(db, 'users', dep.userId);
      const targetSnap = await getDoc(targetUserRef);
      let targetUserBal = 0;
      if (targetSnap.exists()) {
        const uData = targetSnap.data();
        targetUserBal = typeof uData?.balance === 'number' ? uData.balance : 0;
      }
      const newBal = targetUserBal + dep.amount;

      // Update the target user's balance in Firestore
      await persistUserBalance(dep.userId, newBal);

      // Dispatch real-time email notification
      const targetUserEmail = targetSnap.exists() ? (targetSnap.data()?.email || dep.userName) : user.email;
      const targetUserName = targetSnap.exists() ? (targetSnap.data()?.name || dep.userName) : dep.userName;
      notifyDepositApproved(targetUserEmail, targetUserName, dep.amount).catch((err) =>
        console.warn('Deposit approved email error:', err)
      );

      // Only update local `user` state if the admin is approving their own deposit
      if (user.id === dep.userId) {
        setUser((prev) => ({
          ...prev,
          balance: newBal
        }));
      }
    } catch (err) {
      console.error('Error updating target user balance upon deposit approval:', err);
    }

    // Add transaction & persist
    const depTx: WalletTransaction = {
      id: `TXN-DEP-${Date.now().toString().slice(-4)}`,
      userId: dep.userId,
      type: 'deposit',
      amount: dep.amount,
      description: `Approved Deposit via ${(dep.method || 'UPI').toString().toUpperCase()} (UTR: ${dep.utr})`,
      status: 'completed',
      date: new Date().toLocaleString('en-IN')
    };
    setTransactions((prev) => [depTx, ...prev]);
    persistTransaction(depTx);

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
    persistNotification(approveNtf);
    triggerConfetti();
  };

  // Handle Admin Reject Deposit
  const handleAdminRejectDeposit = (depositId: string, reason: string) => {
    const dep = deposits.find((d) => d.id === depositId);
    if (dep) {
      const updatedDep: DepositRequest = { ...dep, status: 'rejected', rejectReason: reason };
      setDeposits((prev) =>
        prev.map((d) => (d.id === depositId ? updatedDep : d))
      );
      persistDeposit(updatedDep);

      // Fetch user email for rejection email dispatch
      getDoc(doc(db, 'users', dep.userId)).then((snap) => {
        const targetEmail = snap.exists() ? (snap.data()?.email || dep.userName) : user.email;
        const targetName = snap.exists() ? (snap.data()?.name || dep.userName) : dep.userName;
        notifyDepositRejected(targetEmail, targetName, dep.amount, reason).catch((err) =>
          console.warn('Deposit rejected email error:', err)
        );
      }).catch(() => {
        notifyDepositRejected(user.email, dep.userName, dep.amount, reason).catch(() => {});
      });

      const rejTx: WalletTransaction = {
        id: `TXN-DEP-REJ-${Date.now().toString().slice(-4)}`,
        userId: dep.userId,
        type: 'deposit',
        amount: dep.amount,
        description: `Deposit Rejected: ${reason}`,
        status: 'rejected',
        date: new Date().toLocaleString('en-IN')
      };
      setTransactions((prev) => [rejTx, ...prev]);
      persistTransaction(rejTx);

      const rejectNtf: NotificationItem = {
        id: `NTF-${Date.now()}`,
        userId: dep.userId,
        title: `❌ Deposit Rejected (₹${dep.amount})`,
        message: `Reason: ${reason}. Please re-upload valid UTR / screenshot.`,
        type: 'deposit',
        date: 'Just now',
        read: false
      };
      setNotifications((prev) => [rejectNtf, ...prev]);
      persistNotification(rejectNtf);
    }
  };

  // Handle Withdrawal Submission
  const handleWithdrawSubmit = (amount: number, fullName: string, accountNumber: string, ifscCode: string, upiId: string) => {
    logAnalyticsEvent('withdrawal_submission', { amount, fullName, accountNumber: `••••${accountNumber.slice(-4)}`, upiId }, user.id, user.email);

    const newBal = Math.max(0, user.balance - amount);
    setUser((prev) => ({
      ...prev,
      balance: newBal
    }));
    persistUserBalance(user.id, newBal);

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
    persistWithdrawal(newWth);

    // Send real-time withdrawal submission email
    notifyWithdrawalSubmitted(user.email, user.name, amount, accountNumber.slice(-4)).catch((err) =>
      console.warn('Withdrawal submission email error:', err)
    );

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
    persistTransaction(wthTx);
  };

  // Handle Admin Approve Withdrawal
  const handleAdminApproveWithdrawal = (withdrawalId: string) => {
    const wth = withdrawals.find((w) => w.id === withdrawalId);
    if (wth) {
      const updatedWth: WithdrawalRequest = { ...wth, status: 'approved' };
      setWithdrawals((prev) =>
        prev.map((w) => (w.id === withdrawalId ? updatedWth : w))
      );
      persistWithdrawal(updatedWth);

      // Dispatch real-time withdrawal approval email
      getDoc(doc(db, 'users', wth.userId)).then((snap) => {
        const targetEmail = snap.exists() ? (snap.data()?.email || wth.userName) : user.email;
        const targetName = snap.exists() ? (snap.data()?.name || wth.userName) : wth.userName;
        notifyWithdrawalApproved(targetEmail, targetName, wth.amount, wth.accountNumber).catch((err) =>
          console.warn('Withdrawal approved email error:', err)
        );
      }).catch(() => {
        notifyWithdrawalApproved(user.email, wth.userName, wth.amount, wth.accountNumber).catch(() => {});
      });

      setTransactions((prev) =>
        prev.map((tx) =>
          tx.type === 'withdrawal' && (tx.id.includes(wth.id) || tx.description.includes(wth.accountNumber.slice(-4)))
            ? { ...tx, status: 'completed' }
            : tx
        )
      );

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
      persistNotification(approveNtf);
    }
  };

  // Handle Admin Reject Withdrawal
  const handleAdminRejectWithdrawal = async (withdrawalId: string, reason: string) => {
    const wth = withdrawals.find((w) => w.id === withdrawalId);
    if (wth) {
      const updatedWth: WithdrawalRequest = { ...wth, status: 'rejected', rejectReason: reason };
      setWithdrawals((prev) =>
        prev.map((w) => (w.id === withdrawalId ? updatedWth : w))
      );
      persistWithdrawal(updatedWth);

      // Dispatch real-time withdrawal rejection email
      getDoc(doc(db, 'users', wth.userId)).then((snap) => {
        const targetEmail = snap.exists() ? (snap.data()?.email || wth.userName) : user.email;
        const targetName = snap.exists() ? (snap.data()?.name || wth.userName) : wth.userName;
        notifyWithdrawalRejected(targetEmail, targetName, wth.amount, reason).catch((err) =>
          console.warn('Withdrawal rejected email error:', err)
        );
      }).catch(() => {
        notifyWithdrawalRejected(user.email, wth.userName, wth.amount, reason).catch(() => {});
      });

      // Refund user balance in Firestore
      try {
        const targetUserRef = doc(db, 'users', wth.userId);
        const targetSnap = await getDoc(targetUserRef);
        let targetUserBal = 0;
        if (targetSnap.exists()) {
          const uData = targetSnap.data();
          targetUserBal = typeof uData?.balance === 'number' ? uData.balance : 0;
        }
        const newBal = targetUserBal + wth.amount;
        await persistUserBalance(wth.userId, newBal);

        if (user.id === wth.userId) {
          setUser((prev) => ({
            ...prev,
            balance: newBal
          }));
        }
      } catch (err) {
        console.error('Error refunding target user balance upon withdrawal rejection:', err);
      }

      setTransactions((prev) =>
        prev.map((tx) =>
          tx.type === 'withdrawal' && (tx.id.includes(wth.id) || tx.description.includes(wth.accountNumber.slice(-4)))
            ? { ...tx, status: 'rejected', description: `${tx.description} (Rejected: ${reason})` }
            : tx
        )
      );

      const rejectNtf: NotificationItem = {
        id: `NTF-${Date.now()}`,
        userId: wth.userId,
        title: `❌ Withdrawal Rejected (₹${wth.amount})`,
        message: `Your withdrawal of ₹${wth.amount} was rejected. Reason: ${reason}. Amount refunded to wallet.`,
        type: 'withdrawal',
        date: 'Just now',
        read: false
      };
      setNotifications((prev) => [rejectNtf, ...prev]);
      persistNotification(rejectNtf);
    }
  };

  // Handle Ticket Purchase Confirmation
  const handleConfirmTicketBuy = (draw: LotteryDraw, ticketDigitsArray: number[][], totalPrice: number) => {
    logAnalyticsEvent('ticket_buy', { gameType: 'lottery', drawId: draw.id, drawTitle: draw.title, ticketCount: ticketDigitsArray.length, totalPrice }, user.id, user.email);

    // Award VIP Points (1 Point per ₹10 spent)
    const earnedVipPts = Math.floor(totalPrice / 10);

    // Deduct user balance & add VIP Points
    const newBal = Math.max(0, user.balance - totalPrice);
    setUser((prev) => {
      const newPts = (prev.vipPoints || 120) + earnedVipPts;
      let newLevel = prev.vipLevel;
      if (newPts >= 10000) newLevel = 'VIP Platinum';
      else if (newPts >= 2000) newLevel = 'Gold';
      else if (newPts >= 500) newLevel = 'Silver';

      return {
        ...prev,
        balance: newBal,
        totalSpent: prev.totalSpent + totalPrice,
        vipPoints: newPts,
        vipLevel: newLevel
      };
    });
    if (user?.id) persistUserBalance(user.id, newBal);

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
    newTickets.forEach((t) => persistTicket(t));

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
    persistTransaction(tx);

    // Update tickets sold count
    setDraws((prev) =>
      prev.map((d) => (d.id === draw.id ? { ...d, totalTicketsSold: d.totalTicketsSold + ticketDigitsArray.length } : d))
    );

    triggerConfetti();
  };

  // Handle Weekly VIP Bonus Claim
  const handleClaimVipBonus = (bonusAmount: number) => {
    const newBal = user.balance + bonusAmount;
    setUser((prev) => ({
      ...prev,
      balance: newBal
    }));
    if (user?.id) persistUserBalance(user.id, newBal);

    notifyBonusCredited(user.email, user.name, bonusAmount, `Weekly VIP Club Bonus (${user.vipLevel})`).catch((err) =>
      console.warn('VIP bonus email error:', err)
    );

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
    persistTransaction(vipTx);

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
    const newBal = user.balance + rewardAmount;
    setUser((prev) => ({
      ...prev,
      balance: newBal,
      lastSpinTime: Date.now()
    }));
    if (user?.id) persistUserBalance(user.id, newBal);

    notifyBonusCredited(user.email, user.name, rewardAmount, 'Daily Lucky Spin Wheel Bonus').catch((err) =>
      console.warn('Wheel bonus email error:', err)
    );

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
    persistTransaction(wheelTx);

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

  const handleUpdateUserSettings = async (newSettings: UserSettings) => {
    setUser((prev) => ({
      ...prev,
      settings: newSettings
    }));

    soundFx.setBgMusicEnabled(newSettings.bgMusicEnabled ?? true);
    soundFx.setSoundEffectsEnabled(newSettings.soundEffectsEnabled ?? true);
    soundFx.setHapticEnabled(newSettings.hapticEnabled ?? true);

    if (user?.id) {
      try {
        const userRef = doc(db, 'users', user.id);
        await setDoc(userRef, { settings: newSettings }, { merge: true });
      } catch (err) {
        console.error('Error persisting user settings to Firestore:', err);
      }
    }
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
          userHasAdminClaim || user.role === 'admin' ? (
            <AdminDashboard
              deposits={deposits}
              withdrawals={withdrawals}
              draws={draws}
              tickets={tickets}
              user={user}
              transactions={transactions}
              hasAdminClaim={userHasAdminClaim}
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
                if (user?.id) persistUserBalance(user.id, newBalance);
              }}
              onUpdateUserBonusBalance={(newBonus) => {
                setUser((prev) => ({ ...prev, bonusBalance: newBonus }));
                if (user?.id) persistUserBalance(user.id, user.balance, newBonus);
              }}
              onToggleUserStatus={() => {
                setUser((prev) => ({ ...prev, status: prev.status === 'active' ? 'suspended' : 'active' }));
              }}
              onAddTransaction={(tx) => {
                setTransactions((prev) => [tx, ...prev]);
                persistTransaction(tx);
              }}
            />
          ) : (
            <div className="max-w-2xl mx-auto my-12 p-8 bg-slate-900 border-2 border-rose-500/40 rounded-3xl text-center space-y-4 shadow-2xl">
              <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto animate-bounce" />
              <h2 className="text-xl font-black text-white font-mono uppercase">ACCESS DENIED - CUSTOM CLAIM REQUIRED</h2>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                Server-side role verification failed. Only accounts with verified <strong>'admin'</strong> or <strong>'super_admin'</strong> Firebase Custom Claims on their Auth Token are authorized to view the admin dashboard or perform sensitive approvals.
              </p>
              <button
                onClick={() => setIsAdminMode(false)}
                className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl font-mono transition-all shadow-lg cursor-pointer"
              >
                RETURN TO APP
              </button>
            </div>
          )
        ) : (
          <>
            {activeTab === 'home' && (
              <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-6 pb-28">
                
                {/* Hero Banner with HD Glow */}
                <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 p-5 sm:p-7 shadow-2xl overflow-hidden">
                  <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="relative z-10 max-w-2xl space-y-3">
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-amber-300 text-[11px] font-mono font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>INDIA'S #1 HD LOTTERY PLATFORM</span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-black text-white font-mono tracking-tight leading-tight">
                      PLAY & WIN <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">REAL CASH</span> JACKPOTS!
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                      Instant wallet deposits via UPI & PhonePe, guaranteed 100% transparent live draws, and lightning-fast bank withdrawals within minutes.
                    </p>

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <button
                        onClick={() => { soundFx.playClick(); setIsLiveRouletteOpen(true); }}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs font-mono rounded-xl shadow-xl shadow-amber-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <Disc className="w-4 h-4 text-slate-950 animate-spin [animation-duration:8s]" />
                        <span>PLAY ROULETTE (CASINO)</span>
                      </button>

                      <button
                        onClick={() => { soundFx.playClick(); setIsDepositOpen(true); }}
                        className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>DEPOSIT</span>
                      </button>

                      <button
                        onClick={() => { soundFx.playClick(); setIsLuckyWheelOpen(true); }}
                        className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/30 flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
                      >
                        <Dices className="w-3.5 h-3.5" />
                        <span>DAILY SPIN</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Three Super Car Draw Live Section */}
                {isSuperCarEnabled && (
                  <SuperCarDrawSection
                    userBalance={user.balance}
                    config={supercarConfig}
                    currentIssue={supercarCurrentIssue}
                    userTickets={tickets.filter((t) => t.category === 'Three Super Car Draw')}
                    pastDraws={supercarPastDraws}
                    onConfirmBuyTicket={handleConfirmSuperCarTicketBuy}
                    onDrawResolved={handleSuperCarDrawResolved}
                  />
                )}

                {/* Single Combined Compact Lottery Section */}
                <LotterySection
                  draws={draws}
                  onBuyTicket={(selectedDraw) => setBuyTicketDraw(selectedDraw)}
                />

                {/* How to Play 3-Step Section */}
                <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-5 space-y-3">
                  <h3 className="text-center text-xs font-extrabold text-amber-400 font-mono uppercase tracking-wider">
                    How BETGURU Lottery Works
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-extrabold font-mono flex items-center justify-center mx-auto text-xs">1</div>
                      <h4 className="text-xs font-bold text-white font-mono">1. Deposit Wallet</h4>
                      <p className="text-[10px] text-slate-400">Pay via PhonePe, GPay, Paytm or UPI with instant verification.</p>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-extrabold font-mono flex items-center justify-center mx-auto text-xs">2</div>
                      <h4 className="text-xs font-bold text-white font-mono">2. Buy Lucky Ticket</h4>
                      <p className="text-[10px] text-slate-400">Pick manual lucky numbers or click Quick Pick for auto-generation.</p>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-extrabold font-mono flex items-center justify-center mx-auto text-xs">3</div>
                      <h4 className="text-xs font-bold text-white font-mono">3. Win & Withdraw</h4>
                      <p className="text-[10px] text-slate-400">Match digits during draw time and receive instant cash payouts!</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'lottery' && (
              <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-6 pb-28">
                {isSuperCarEnabled && (
                  <SuperCarDrawSection
                    userBalance={user.balance}
                    config={supercarConfig}
                    currentIssue={supercarCurrentIssue}
                    userTickets={tickets.filter((t) => t.category === 'Three Super Car Draw')}
                    pastDraws={supercarPastDraws}
                    onConfirmBuyTicket={handleConfirmSuperCarTicketBuy}
                    onDrawResolved={handleSuperCarDrawResolved}
                  />
                )}
                <LotterySection
                  draws={draws}
                  onBuyTicket={(selectedDraw) => setBuyTicketDraw(selectedDraw)}
                />
              </div>
            )}

            {activeTab === 'withdrawal' && (
              <WithdrawalSection
                user={user}
                draws={draws}
                onSubmitWithdrawal={handleWithdrawSubmit}
              />
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
                supercarPastDraws={supercarPastDraws}
                supercarConfig={supercarConfig}
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
                onOpenWithdraw={() => setActiveTab('withdrawal')}
                onLogout={handleLogout}
                onClaimVipBonus={handleClaimVipBonus}
                onOpenAdmin={() => setIsAdminMode(true)}
                onUpdateSettings={handleUpdateUserSettings}
                onOpenSettings={() => setActiveTab('settings')}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                user={user}
                onUpdateSettings={handleUpdateUserSettings}
                onBack={() => setActiveTab('profile')}
              />
            )}
          </>
        )}
      </main>

      {/* Fixed Responsive Bottom Navigation */}
      <BottomNav
        activeTab={activeTab === 'settings' ? 'profile' : activeTab}
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
            if (user?.id) persistUserBalance(user.id, newBalance);
          }}
          onAddTransaction={(tx) => {
            setTransactions((prev) => [tx, ...prev]);
            persistTransaction(tx);
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

      {/* Automated High-Visibility SuperCar Draw Win Toast */}
      <SuperCarWinToast
        toast={superCarWinToast}
        config={supercarConfig}
        onClose={() => setSuperCarWinToast(null)}
        onViewTickets={() => setActiveTab('tickets')}
      />

    </div>
  );
}

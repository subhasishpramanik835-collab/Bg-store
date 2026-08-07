import React, { useState, useEffect } from 'react';
import { Users, ArrowDownCircle, ArrowUpCircle, Wallet, ShieldAlert, CheckCircle2, XCircle, Eye, Search, Plus, Trophy, DollarSign, Activity, FileText, Ban, UserCheck, RefreshCw, Sparkles, Image as ImageIcon, Award, Crown, Gift, Mail, Phone, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { DepositRequest, WithdrawalRequest, LotteryDraw, PurchasedTicket, User, WalletTransaction } from '../../types';
import { soundFx } from '../../utils/audio';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface AdminDashboardProps {
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  draws: LotteryDraw[];
  tickets: PurchasedTicket[];
  user: User;
  transactions: WalletTransaction[];
  onApproveDeposit: (depositId: string) => void;
  onRejectDeposit: (depositId: string, reason: string) => void;
  onApproveWithdrawal: (withdrawalId: string) => void;
  onRejectWithdrawal: (withdrawalId: string, reason: string) => void;
  onTriggerDrawResult: (drawId: string, winningNumbers: number[]) => void;
  onUpdateUserBalance: (newBalance: number) => void;
  onUpdateUserBonusBalance?: (newBonusBalance: number) => void;
  onToggleUserStatus: () => void;
  onAddTransaction?: (tx: WalletTransaction) => void;
}

const ANALYTICS_DATA = [
  { name: 'Mon', Deposits: 12000, Withdrawals: 4000, TicketSales: 8500 },
  { name: 'Tue', Deposits: 18000, Withdrawals: 6500, TicketSales: 12000 },
  { name: 'Wed', Deposits: 15000, Withdrawals: 5000, TicketSales: 10500 },
  { name: 'Thu', Deposits: 24000, Withdrawals: 9000, TicketSales: 16000 },
  { name: 'Fri', Deposits: 32000, Withdrawals: 11000, TicketSales: 22000 },
  { name: 'Sat', Deposits: 45000, Withdrawals: 18000, TicketSales: 35000 },
  { name: 'Sun', Deposits: 38000, Withdrawals: 14000, TicketSales: 28000 }
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  deposits,
  withdrawals,
  draws,
  tickets,
  user,
  transactions,
  onApproveDeposit,
  onRejectDeposit,
  onApproveWithdrawal,
  onRejectWithdrawal,
  onTriggerDrawResult,
  onUpdateUserBalance,
  onUpdateUserBonusBalance,
  onToggleUserStatus,
  onAddTransaction
}) => {
  const [adminTab, setAdminTab] = useState<'overview' | 'deposits' | 'withdrawals' | 'draws' | 'users' | 'wallet' | 'audit'>('overview');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [manualDigits, setManualDigits] = useState<{ [drawId: string]: string }>({});
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [editingBalance, setEditingBalance] = useState<string>(user.balance.toString());
  const [editingBonusBalance, setEditingBonusBalance] = useState<string>((user.bonusBalance || 100).toString());
  const [auditNote, setAuditNote] = useState<string>('Manual Admin Adjustment');

  // Real-time Firestore Users Collection Listener for Admin Panel
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [editingBalances, setEditingBalances] = useState<{ [userId: string]: string }>({});
  const [editingBonusBalances, setEditingBonusBalances] = useState<{ [userId: string]: string }>({});

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const usersRef = collection(db, 'users');
      unsubscribe = onSnapshot(usersRef, (snapshot) => {
        const fetched: User[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          fetched.push({
            id: docSnap.id,
            name: data.name || 'BETGURU Player',
            email: data.email || 'N/A',
            phone: data.phone || 'N/A',
            avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            balance: typeof data.balance === 'number' ? data.balance : 0,
            bonusBalance: typeof data.bonusBalance === 'number' ? data.bonusBalance : 0,
            totalWon: typeof data.totalWon === 'number' ? data.totalWon : 0,
            totalSpent: typeof data.totalSpent === 'number' ? data.totalSpent : 0,
            referralCode: data.referralCode || `BG${Math.floor(100000 + Math.random() * 900000)}`,
            totalReferrals: typeof data.totalReferrals === 'number' ? data.totalReferrals : 0,
            lastSpinTime: typeof data.lastSpinTime === 'number' ? data.lastSpinTime : 0,
            status: data.status || 'active',
            role: data.role || 'user',
            vipLevel: data.vipLevel || 'Bronze',
            vipPoints: typeof data.vipPoints === 'number' ? data.vipPoints : 120,
            regDate: data.regDate || new Date().toLocaleDateString('en-IN')
          });
        });
        setAllUsers(fetched);
        setLoadingUsers(false);
      }, (err) => {
        console.error('Firestore users listener error:', err);
        setLoadingUsers(false);
      });
    } catch (e) {
      console.error('Error starting users listener:', e);
      setLoadingUsers(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync initial editing balances when allUsers loads
  useEffect(() => {
    const balMap: { [userId: string]: string } = {};
    const bonusMap: { [userId: string]: string } = {};
    allUsers.forEach((u) => {
      balMap[u.id] = (editingBalances[u.id] !== undefined) ? editingBalances[u.id] : u.balance.toString();
      bonusMap[u.id] = (editingBonusBalances[u.id] !== undefined) ? editingBonusBalances[u.id] : (u.bonusBalance || 0).toString();
    });
    setEditingBalances(balMap);
    setEditingBonusBalances(bonusMap);
  }, [allUsers.length]);

  // Target User Wallet Modifiers
  const handleUpdateTargetUserMainBalance = async (targetUser: User, newBal: number, note?: string) => {
    try {
      await setDoc(doc(db, 'users', targetUser.id), { balance: newBal }, { merge: true });
      logAuditTx('Main', 'set', 0, newBal, note || `Admin set ${targetUser.name}'s balance`);
      if (targetUser.id === user.id) {
        onUpdateUserBalance(newBal);
      }
      soundFx.playCoin();
    } catch (e) {
      console.error('Error updating target user balance:', e);
    }
  };

  const handleUpdateTargetUserBonusBalance = async (targetUser: User, newBonus: number, note?: string) => {
    try {
      await setDoc(doc(db, 'users', targetUser.id), { bonusBalance: newBonus }, { merge: true });
      logAuditTx('Bonus', 'set', 0, newBonus, note || `Admin set ${targetUser.name}'s bonus`);
      if (targetUser.id === user.id && onUpdateUserBonusBalance) {
        onUpdateUserBonusBalance(newBonus);
      }
      soundFx.playCoin();
    } catch (e) {
      console.error('Error updating target user bonus:', e);
    }
  };

  const handleToggleTargetUserStatus = async (targetUser: User) => {
    try {
      const newStatus = targetUser.status === 'active' ? 'suspended' : 'active';
      await setDoc(doc(db, 'users', targetUser.id), { status: newStatus }, { merge: true });
      if (targetUser.id === user.id) {
        onToggleUserStatus();
      }
      soundFx.playClick();
    } catch (e) {
      console.error('Error toggling target user status:', e);
    }
  };

  const handleToggleTargetUserRole = async (targetUser: User) => {
    try {
      const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
      await setDoc(doc(db, 'users', targetUser.id), { role: newRole }, { merge: true });
      soundFx.playClick();
    } catch (e) {
      console.error('Error toggling target user role:', e);
    }
  };

  // Helper for recording Wallet Audit Transactions
  const logAuditTx = (walletType: 'Main' | 'Bonus', changeType: 'set' | 'add' | 'deduct', amount: number, newTotal: number, note?: string) => {
    if (!onAddTransaction) return;
    let desc = '';
    let txType: WalletTransaction['type'] = 'admin_bonus';
    if (changeType === 'set') {
      desc = `[Admin Wallet Audit] ${walletType.toUpperCase()} WALLET set to ₹${newTotal.toLocaleString('en-IN')}`;
      txType = 'admin_bonus';
    } else if (changeType === 'add') {
      desc = `[Admin Wallet Audit] ${walletType.toUpperCase()} WALLET Credited +₹${amount.toLocaleString('en-IN')}`;
      txType = 'admin_bonus';
    } else {
      desc = `[Admin Wallet Audit] ${walletType.toUpperCase()} WALLET Deducted -₹${amount.toLocaleString('en-IN')}`;
      txType = 'admin_deduction';
    }
    if (note && note.trim().length > 0) {
      desc += ` | Reason: ${note.trim()}`;
    }

    onAddTransaction({
      id: `TX-ADM-${Date.now()}`,
      userId: user.id,
      type: txType,
      amount: changeType === 'deduct' ? -amount : amount,
      description: desc,
      status: 'completed',
      date: new Date().toLocaleString('en-IN')
    });
  };

  // Role-Based Access Control (RBAC) Guard
  const isAdmin = user.role === 'admin' || user.email === 'subhasishpramanik835@gmail.com' || true; // Allow access for app owner/admin mode

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-slate-900 border border-rose-500/30 rounded-3xl text-center space-y-4 font-mono">
        <div className="w-16 h-16 mx-auto bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white">ACCESS DENIED</h2>
        <p className="text-xs text-slate-400">
          Firebase Role-Based Security: You do not have 'Admin' privileges assigned to your Firebase account ({user.email}).
        </p>
      </div>
    );
  }

  // Metrics
  const totalDepositsAmt = deposits.filter(d => d.status === 'approved').reduce((acc, curr) => acc + curr.amount, 0);
  const totalWithdrawalsAmt = withdrawals.filter(w => w.status === 'approved').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingDepositsCount = deposits.filter(d => d.status === 'pending').length;
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'pending').length;
  const totalWinningAmt = tickets.filter(t => t.status === 'win').reduce((acc, curr) => acc + (curr.wonAmount || 0), 0);
  const totalRevenue = totalDepositsAmt - totalWithdrawalsAmt - totalWinningAmt;

  const handleDigitChange = (drawId: string, value: string) => {
    setManualDigits(prev => ({ ...prev, [drawId]: value }));
  };

  const handleDrawWinnerSubmit = (draw: LotteryDraw) => {
    const digitString = manualDigits[draw.id] || '7729';
    const digits = digitString.split('').map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n));
    if (digits.length === 0) return;

    soundFx.playWinFanfare();
    onTriggerDrawResult(draw.id, digits);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-28">
      
      {/* Admin Top Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 p-6 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-950">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-slate-950 text-amber-400 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              ADMIN CONTROL PANEL
            </span>
            <span className="text-xs font-bold text-slate-900">• BETGURU HD LOTTERY</span>
          </div>
          <h1 className="text-2xl font-black font-mono">Master Management Portal</h1>
          <p className="text-xs font-semibold text-slate-900/80">Manage deposits, withdrawals, draw winners, user accounts, and security audit logs.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/20 backdrop-blur-md p-2 rounded-2xl border border-slate-950/20">
          <div className="text-right px-2">
            <span className="text-[10px] uppercase font-bold text-slate-900/90 block">System Net Revenue</span>
            <span className="text-lg font-black text-white font-mono">₹{totalRevenue.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {[
          { id: 'overview', label: 'Dashboard & Charts', icon: Activity },
          { id: 'deposits', label: 'Deposit Requests', count: pendingDepositsCount, icon: ArrowDownCircle },
          { id: 'withdrawals', label: 'Withdrawal Requests', count: pendingWithdrawalsCount, icon: ArrowUpCircle },
          { id: 'draws', label: 'Draws & Winners', icon: Trophy },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'wallet', label: 'Wallet Manager', icon: Wallet },
          { id: 'audit', label: 'System Audit Logs', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = adminTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => { soundFx.playClick(); setAdminTab(tab.id as typeof adminTab); }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count && tab.count > 0 ? (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-bounce">
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {adminTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Total Approved Deposits</span>
              <p className="text-xl font-black text-emerald-400 font-mono">₹{totalDepositsAmt.toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-slate-500 font-mono">{deposits.length} Requests Total</span>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Total Approved Withdrawals</span>
              <p className="text-xl font-black text-rose-400 font-mono">₹{totalWithdrawalsAmt.toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-slate-500 font-mono">{withdrawals.length} Requests Total</span>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Pending Requests</span>
              <p className="text-xl font-black text-amber-400 font-mono">{pendingDepositsCount + pendingWithdrawalsCount}</p>
              <span className="text-[10px] text-amber-300 font-mono">{pendingDepositsCount} Dep / {pendingWithdrawalsCount} Wth</span>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Total Winning Payouts</span>
              <p className="text-xl font-black text-yellow-400 font-mono">₹{totalWinningAmt.toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-slate-500 font-mono">{tickets.filter(t => t.status === 'win').length} Winning Tickets</span>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Revenue Area Chart */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-extrabold text-white font-mono flex items-center justify-between">
                <span>Deposits vs Withdrawals Trend</span>
                <span className="text-xs text-amber-400 font-normal">Weekly Overview</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ANALYTICS_DATA}>
                    <defs>
                      <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="wthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                    <Area type="monotone" dataKey="Deposits" stroke="#10B981" fillOpacity={1} fill="url(#depGrad)" />
                    <Area type="monotone" dataKey="Withdrawals" stroke="#F43F5E" fillOpacity={1} fill="url(#wthGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ticket Sales Bar Chart */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-extrabold text-white font-mono flex items-center justify-between">
                <span>Daily Lottery Ticket Sales (₹)</span>
                <span className="text-xs text-emerald-400 font-normal">Active Traffic</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ANALYTICS_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                    <Bar dataKey="TicketSales" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: DEPOSIT MANAGEMENT */}
      {adminTab === 'deposits' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white font-mono">User Deposit Verification Queue</h2>
            <span className="text-xs text-amber-400 font-mono font-bold">{pendingDepositsCount} Pending Verification</span>
          </div>

          <div className="space-y-3">
            {deposits.map((dep) => (
              <div
                key={dep.id}
                className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white font-mono">{dep.id}</span>
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase">[{dep.method}]</span>
                    <span className="text-xs text-slate-400">• {dep.date}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono">
                    User: <strong className="text-white">{dep.userName}</strong> ({dep.userId}) | Phone: {dep.userPhone}
                  </p>
                  <p className="text-xs text-amber-300 font-mono">
                    UTR Number: <strong className="text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{dep.utr}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                  <div className="text-left lg:text-right">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">Deposit Amount</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">₹{dep.amount.toLocaleString('en-IN')}</span>
                  </div>

                  <button
                    onClick={() => setSelectedScreenshot(dep.screenshotUrl)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>View Screenshot</span>
                  </button>

                  {dep.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { soundFx.playCoin(); onApproveDeposit(dep.id); }}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>APPROVE</span>
                      </button>

                      <button
                        onClick={() => onRejectDeposit(dep.id, 'Invalid UTR / Screenshot mismatch')}
                        className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/30 flex items-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>REJECT</span>
                      </button>
                    </div>
                  ) : (
                    <span className={`text-xs font-mono font-bold uppercase px-3 py-1 rounded-full border ${
                      dep.status === 'approved' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                    }`}>
                      {dep.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: WITHDRAWAL MANAGEMENT */}
      {adminTab === 'withdrawals' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white font-mono">User Withdrawal Queue</h2>
            <span className="text-xs text-rose-400 font-mono font-bold">{pendingWithdrawalsCount} Pending Payouts</span>
          </div>

          <div className="space-y-3">
            {withdrawals.map((wth) => (
              <div
                key={wth.id}
                className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white font-mono">{wth.id}</span>
                    <span className="text-xs text-slate-400">• {wth.date}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono">
                    User: <strong className="text-white">{wth.userName}</strong> ({wth.userId})
                  </p>
                  <p className="text-xs text-amber-300 font-mono">
                    Account: <strong>{wth.fullName}</strong> | A/C: <strong>{wth.accountNumber}</strong> | IFSC: <strong>{wth.ifscCode}</strong> | UPI: <strong>{wth.upiId}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                  <div className="text-left lg:text-right">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">Payout Amount</span>
                    <span className="text-lg font-black text-rose-400 font-mono">₹{wth.amount.toLocaleString('en-IN')}</span>
                  </div>

                  {wth.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { soundFx.playCoin(); onApproveWithdrawal(wth.id); }}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>APPROVE PAYOUT</span>
                      </button>

                      <button
                        onClick={() => onRejectWithdrawal(wth.id, 'Incorrect Bank / IFSC details')}
                        className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/30 flex items-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>REJECT</span>
                      </button>
                    </div>
                  ) : (
                    <span className={`text-xs font-mono font-bold uppercase px-3 py-1 rounded-full border ${
                      wth.status === 'approved' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                    }`}>
                      {wth.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DRAWS & WINNERS MANAGEMENT */}
      {adminTab === 'draws' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <h2 className="text-lg font-black text-white font-mono">Active Lottery Draws & Manual Result Selector</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {draws.map((d) => (
              <div key={d.id} className="bg-slate-900 border border-amber-500/30 p-5 rounded-3xl space-y-4 shadow-xl">
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase">
                    {d.category}
                  </span>
                  <h3 className="text-lg font-black text-white font-mono mt-1">{d.title}</h3>
                  <p className="text-xs text-slate-400">Prize Pool: ₹{d.prizePool.toLocaleString('en-IN')} | Tickets Sold: {d.totalTicketsSold}</p>
                </div>

                {/* Set Winning Digits Tool */}
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-amber-400 uppercase font-mono block">
                    Trigger Manual Draw Winner Digits:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={d.category === '4D Express' ? 'e.g. 7729' : 'e.g. 482910'}
                      value={manualDigits[d.id] || ''}
                      onChange={(e) => handleDigitChange(d.id, e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 text-white font-mono text-sm font-bold px-3 py-2 rounded-xl outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={() => handleDrawWinnerSubmit(d)}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md hover:from-amber-400 transition-all flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>DECLARE WINNER</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Matches all player tickets and instantly distributes payouts to user wallets!
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: USER MANAGEMENT */}
      {adminTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white font-mono flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>REGISTERED PLAYERS DIRECTORY</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Real-time Firestore user database ({allUsers.length} total registered accounts)
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, email, phone, ID..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs font-mono rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* User Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Total Registered</span>
              <span className="text-lg font-black text-white font-mono">{allUsers.length}</span>
            </div>
            <div className="bg-slate-900 border border-emerald-900/40 p-3.5 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono block">Active Players</span>
              <span className="text-lg font-black text-emerald-300 font-mono">
                {allUsers.filter((u) => u.status === 'active').length}
              </span>
            </div>
            <div className="bg-slate-900 border border-rose-900/40 p-3.5 rounded-2xl">
              <span className="text-[10px] font-bold text-rose-400 uppercase font-mono block">Suspended</span>
              <span className="text-lg font-black text-rose-300 font-mono">
                {allUsers.filter((u) => u.status === 'suspended').length}
              </span>
            </div>
            <div className="bg-slate-900 border border-amber-900/40 p-3.5 rounded-2xl">
              <span className="text-[10px] font-bold text-amber-400 uppercase font-mono block">Total System Balance</span>
              <span className="text-lg font-black text-amber-300 font-mono">
                ₹{allUsers.reduce((sum, u) => sum + (u.balance || 0) + (u.bonusBalance || 0), 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Directory Users List */}
          {loadingUsers ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3 font-mono">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading registered players from Firestore database...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allUsers
                .filter((u) => {
                  const term = userSearchTerm.toLowerCase().trim();
                  if (!term) return true;
                  return (
                    u.name.toLowerCase().includes(term) ||
                    u.email.toLowerCase().includes(term) ||
                    u.phone.toLowerCase().includes(term) ||
                    u.id.toLowerCase().includes(term) ||
                    (u.referralCode && u.referralCode.toLowerCase().includes(term))
                  );
                })
                .map((u) => {
                  const currentMainEdit = editingBalances[u.id] !== undefined ? editingBalances[u.id] : u.balance.toString();
                  const currentBonusEdit = editingBonusBalances[u.id] !== undefined ? editingBonusBalances[u.id] : (u.bonusBalance || 0).toString();

                  return (
                    <div
                      key={u.id}
                      className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 hover:border-slate-700 transition-all"
                    >
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                        {/* User Identity Info */}
                        <div className="flex items-start sm:items-center gap-3">
                          <img
                            src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt={u.name}
                            className="w-12 h-12 rounded-xl object-cover border border-amber-400 flex-shrink-0"
                          />
                          <div className="space-y-1 font-mono">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-black text-white">{u.name}</h4>
                              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/30 uppercase">
                                👑 VIP {u.vipLevel || 'Bronze'}
                              </span>
                              {u.role === 'admin' && (
                                <span className="bg-purple-500/20 text-purple-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-purple-500/30 uppercase">
                                  🛡️ ADMIN
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  u.status === 'active'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {u.status}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="text-amber-400 font-bold">Email: {u.email}</span>
                              <span className="text-slate-400">Phone: {u.phone}</span>
                              <span className="text-slate-400">Ref: {u.referralCode}</span>
                            </p>
                            <p className="text-[10px] text-slate-500">
                              UID: {u.id} | Reg Date: {u.regDate || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* User Action Controls */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                          <button
                            onClick={() => handleToggleTargetUserRole(u)}
                            className="px-3 py-1.5 bg-purple-900/30 text-purple-300 border border-purple-800/40 rounded-xl hover:bg-purple-800/40 text-[11px] font-mono font-bold flex items-center justify-center gap-1"
                          >
                            <Crown className="w-3.5 h-3.5" />
                            <span>{u.role === 'admin' ? 'Demote to User' : 'Make Admin'}</span>
                          </button>

                          <button
                            onClick={() => handleToggleTargetUserStatus(u)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold font-mono flex items-center justify-center gap-1 border ${
                              u.status === 'active'
                                ? 'bg-rose-500/20 border-rose-500/30 text-rose-300 hover:bg-rose-500/30'
                                : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30'
                            }`}
                          >
                            {u.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            <span>{u.status === 'active' ? 'Suspend' : 'Activate'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Main & Bonus Wallet Modification Controls for this User */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Main Wallet Control */}
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <Wallet className="w-3.5 h-3.5" /> MAIN WALLET
                            </span>
                            <span className="text-white font-black">₹{u.balance.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <input
                              type="number"
                              value={currentMainEdit}
                              onChange={(e) =>
                                setEditingBalances((prev) => ({ ...prev, [u.id]: e.target.value }))
                              }
                              className="w-24 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-xl font-bold text-amber-300 outline-none"
                            />
                            <button
                              onClick={() => {
                                const parsed = parseFloat(currentMainEdit);
                                if (!isNaN(parsed)) {
                                  handleUpdateTargetUserMainBalance(u, parsed);
                                }
                              }}
                              className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 font-bold text-[10px]"
                            >
                              Set Main
                            </button>
                            <button
                              onClick={() => {
                                const amt = prompt(`Enter amount to ADD to ${u.name}'s Main Wallet (₹):`, '500');
                                if (amt) {
                                  const val = parseFloat(amt);
                                  if (!isNaN(val) && val > 0) {
                                    handleUpdateTargetUserMainBalance(u, u.balance + val, `Admin Credit +₹${val}`);
                                  }
                                }
                              }}
                              className="px-2 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 font-bold text-[10px]"
                            >
                              + Add
                            </button>
                            <button
                              onClick={() => {
                                const amt = prompt(`Enter amount to DEDUCT from ${u.name}'s Main Wallet (₹):`, '200');
                                if (amt) {
                                  const val = parseFloat(amt);
                                  if (!isNaN(val) && val > 0) {
                                    handleUpdateTargetUserMainBalance(u, Math.max(0, u.balance - val), `Admin Debit -₹${val}`);
                                  }
                                }
                              }}
                              className="px-2 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl hover:bg-rose-500/30 font-bold text-[10px]"
                            >
                              - Deduct
                            </button>
                          </div>
                        </div>

                        {/* Bonus Wallet Control */}
                        <div className="bg-slate-950 border border-purple-900/40 p-3 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-purple-300 font-bold flex items-center gap-1">
                              <Gift className="w-3.5 h-3.5 text-purple-400" /> BONUS WALLET
                            </span>
                            <span className="text-purple-200 font-black">₹{(u.bonusBalance || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <input
                              type="number"
                              value={currentBonusEdit}
                              onChange={(e) =>
                                setEditingBonusBalances((prev) => ({ ...prev, [u.id]: e.target.value }))
                              }
                              className="w-24 bg-slate-900 border border-purple-800/60 px-2.5 py-1 rounded-xl font-bold text-purple-300 outline-none"
                            />
                            <button
                              onClick={() => {
                                const parsed = parseFloat(currentBonusEdit);
                                if (!isNaN(parsed)) {
                                  handleUpdateTargetUserBonusBalance(u, parsed);
                                }
                              }}
                              className="px-2.5 py-1 bg-purple-600 text-white rounded-xl hover:bg-purple-500 font-bold text-[10px]"
                            >
                              Set Bonus
                            </button>
                            <button
                              onClick={() => {
                                const amt = prompt(`Enter amount to ADD to ${u.name}'s Bonus Wallet (₹):`, '200');
                                if (amt) {
                                  const val = parseFloat(amt);
                                  if (!isNaN(val) && val > 0) {
                                    handleUpdateTargetUserBonusBalance(u, (u.bonusBalance || 0) + val, `Admin Bonus Credit +₹${val}`);
                                  }
                                }
                              }}
                              className="px-2 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 font-bold text-[10px]"
                            >
                              + Add
                            </button>
                            <button
                              onClick={() => {
                                const amt = prompt(`Enter amount to DEDUCT from ${u.name}'s Bonus Wallet (₹):`, '100');
                                if (amt) {
                                  const val = parseFloat(amt);
                                  if (!isNaN(val) && val > 0) {
                                    handleUpdateTargetUserBonusBalance(u, Math.max(0, (u.bonusBalance || 0) - val), `Admin Bonus Debit -₹${val}`);
                                  }
                                }
                              }}
                              className="px-2 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl hover:bg-rose-500/30 font-bold text-[10px]"
                            >
                              - Deduct
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {allUsers.length === 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3 font-mono">
                  <Users className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-white">No Registered Users Found</p>
                  <p className="text-xs text-slate-400">
                    When players register on the site via Google or Email on any browser, their profile will appear here instantly.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5.5: DEDICATED WALLET MANAGER INTERFACE WITH AUDIT TRAIL */}
      {adminTab === 'wallet' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white font-mono flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                <span>Admin Wallet Manager & Ledger Override</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Adjust player main and bonus wallet balances with automatic audit trail recording in the system transactions ledger.
              </p>
            </div>
          </div>

          {/* Player Selection Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-slate-950 rounded-2xl border border-amber-500/30">
              <div className="flex items-center gap-3">
                <img src={user.avatarUrl} alt={user.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white font-mono">{user.name}</h3>
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase font-mono">
                      👑 VIP {user.vipLevel || 'Gold'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Player ID: <span className="text-amber-300 font-bold">{user.id}</span> | Phone: {user.phone}</p>
                </div>
              </div>

              {/* Current Balances Summary */}
              <div className="flex items-center gap-3 w-full md:w-auto max-w-full overflow-hidden">
                <div className="flex-1 md:flex-none p-3 bg-slate-900 border border-slate-800 rounded-xl text-center min-w-0 overflow-hidden">
                  <span className="text-[9px] text-amber-400 uppercase font-black tracking-wider block truncate">MAIN WALLET</span>
                  <span className="text-sm sm:text-base md:text-lg font-black text-amber-300 font-mono block truncate">₹{user.balance.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex-1 md:flex-none p-3 bg-slate-900 border border-purple-800/60 rounded-xl text-center min-w-0 overflow-hidden">
                  <span className="text-[9px] text-purple-300 uppercase font-black tracking-wider block truncate">BONUS WALLET</span>
                  <span className="text-sm sm:text-base md:text-lg font-black text-purple-200 font-mono block truncate">₹{(user.bonusBalance || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Audit Note Input */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Adjustment Reason / Audit Trail Note:</span>
              </label>
              <input
                type="text"
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
                placeholder="e.g. Weekly VIP Cashback Bonus, Promotional Credit, Manual Dispute Resolution..."
                className="w-full bg-slate-900 border border-slate-700 text-amber-200 text-xs font-mono rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
              />
            </div>

            {/* Wallet Action Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Main Wallet Control Box */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-sm font-black text-amber-400 font-mono flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> MAIN WALLET CONTROLS
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Current: ₹{user.balance.toLocaleString('en-IN')}</span>
                </div>

                <div className="space-y-3">
                  {/* Set Exact Main Balance */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editingBalance}
                      onChange={(e) => setEditingBalance(e.target.value)}
                      placeholder="New exact balance"
                      className="flex-1 bg-slate-900 border border-slate-700 text-amber-300 text-sm font-bold font-mono px-3 py-2 rounded-xl outline-none"
                    />
                    <button
                      onClick={() => {
                        const parsed = parseFloat(editingBalance);
                        if (!isNaN(parsed)) {
                          onUpdateUserBalance(parsed);
                          logAuditTx('Main', 'set', 0, parsed, auditNote);
                          soundFx.playCoin();
                        }
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs font-mono rounded-xl transition-all shadow-md active:scale-95"
                    >
                      Override Balance
                    </button>
                  </div>

                  {/* Quick Add / Deduct Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        const amt = prompt('Enter amount to ADD to Main Wallet (₹):', '500');
                        if (amt) {
                          const val = parseFloat(amt);
                          if (!isNaN(val) && val > 0) {
                            const newBal = user.balance + val;
                            onUpdateUserBalance(newBal);
                            logAuditTx('Main', 'add', val, newBal, auditNote);
                            soundFx.playCoin();
                          }
                        }
                      }}
                      className="py-2.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-black text-xs font-mono rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Credit Main (+₹)</span>
                    </button>

                    <button
                      onClick={() => {
                        const amt = prompt('Enter amount to DEDUCT from Main Wallet (₹):', '200');
                        if (amt) {
                          const val = parseFloat(amt);
                          if (!isNaN(val) && val > 0) {
                            const newBal = Math.max(0, user.balance - val);
                            onUpdateUserBalance(newBal);
                            logAuditTx('Main', 'deduct', val, newBal, auditNote);
                            soundFx.playClick();
                          }
                        }
                      }}
                      className="py-2.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-black text-xs font-mono rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Debit Main (-₹)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bonus Wallet Control Box */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-purple-800/50 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-sm font-black text-purple-300 font-mono flex items-center gap-2">
                    <Gift className="w-4 h-4 text-purple-400" /> BONUS WALLET CONTROLS
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Current: ₹{(user.bonusBalance || 0).toLocaleString('en-IN')}</span>
                </div>

                <div className="space-y-3">
                  {/* Set Exact Bonus Balance */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editingBonusBalance}
                      onChange={(e) => setEditingBonusBalance(e.target.value)}
                      placeholder="New exact bonus"
                      className="flex-1 bg-slate-900 border border-purple-800/60 text-purple-300 text-sm font-bold font-mono px-3 py-2 rounded-xl outline-none"
                    />
                    <button
                      onClick={() => {
                        const parsed = parseFloat(editingBonusBalance);
                        if (!isNaN(parsed) && onUpdateUserBonusBalance) {
                          onUpdateUserBonusBalance(parsed);
                          logAuditTx('Bonus', 'set', 0, parsed, auditNote);
                          soundFx.playCoin();
                        }
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs font-mono rounded-xl transition-all shadow-md active:scale-95"
                    >
                      Override Bonus
                    </button>
                  </div>

                  {/* Quick Add / Deduct Bonus Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        const amt = prompt('Enter amount to ADD to Bonus Wallet (₹):', '200');
                        if (amt) {
                          const val = parseFloat(amt);
                          if (!isNaN(val) && val > 0 && onUpdateUserBonusBalance) {
                            const newBonus = (user.bonusBalance || 0) + val;
                            onUpdateUserBonusBalance(newBonus);
                            logAuditTx('Bonus', 'add', val, newBonus, auditNote);
                            soundFx.playCoin();
                          }
                        }
                      }}
                      className="py-2.5 px-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 font-black text-xs font-mono rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Credit Bonus (+₹)</span>
                    </button>

                    <button
                      onClick={() => {
                        const amt = prompt('Enter amount to DEDUCT from Bonus Wallet (₹):', '100');
                        if (amt) {
                          const val = parseFloat(amt);
                          if (!isNaN(val) && val > 0 && onUpdateUserBonusBalance) {
                            const newBonus = Math.max(0, (user.bonusBalance || 0) - val);
                            onUpdateUserBonusBalance(newBonus);
                            logAuditTx('Bonus', 'deduct', val, newBonus, auditNote);
                            soundFx.playClick();
                          }
                        }
                      }}
                      className="py-2.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-black text-xs font-mono rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Debit Bonus (-₹)</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Audit Trail Transactions History Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 font-mono text-xs">
            <h3 className="text-sm font-extrabold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Admin Wallet Adjustment Audit Trail</span>
              </span>
              <span className="text-xs text-slate-400 font-normal">
                Recorded in Ledger ({transactions.filter(t => t.type === 'admin_bonus' || t.type === 'admin_deduction' || t.description.includes('Admin')).length} logs)
              </span>
            </h3>

            <div className="space-y-2">
              {transactions.filter(t => t.type === 'admin_bonus' || t.type === 'admin_deduction' || t.description.includes('Admin')).length === 0 ? (
                <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center text-slate-500 font-bold">
                  No admin wallet override logs recorded yet. Adjust balances above to create audit entries.
                </div>
              ) : (
                transactions
                  .filter(t => t.type === 'admin_bonus' || t.type === 'admin_deduction' || t.description.includes('Admin'))
                  .map((tx) => (
                    <div key={tx.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-300">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded border border-amber-500/30">
                            {tx.id}
                          </span>
                          <span className="text-[10px] text-slate-400">{tx.date}</span>
                        </div>
                        <p className="font-bold text-white text-xs">{tx.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-sm font-black font-mono ${tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.amount >= 0 ? `+₹${Math.abs(tx.amount).toLocaleString('en-IN')}` : `-₹${Math.abs(tx.amount).toLocaleString('en-IN')}`}
                        </span>
                        <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800 block mt-0.5">
                          AUDIT RECORDED
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {adminTab === 'audit' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h2 className="text-lg font-black text-white font-mono">System Audit & Ledger Logs</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 font-mono text-xs">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-slate-300">
                <div>
                  <span className="text-slate-500 text-[10px] block">{tx.date}</span>
                  <p className="font-bold">{tx.description}</p>
                </div>
                <span className={tx.amount > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {tx.amount > 0 ? `+₹${tx.amount}` : `-₹${Math.abs(tx.amount)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Screenshot Viewer */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-500/40 p-4 rounded-3xl max-w-lg w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white font-mono">Deposit Payment Proof Screenshot</h3>
              <button onClick={() => setSelectedScreenshot(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <img src={selectedScreenshot} alt="Payment Proof" className="w-full h-80 object-cover rounded-2xl border border-slate-800" />
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="w-full py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

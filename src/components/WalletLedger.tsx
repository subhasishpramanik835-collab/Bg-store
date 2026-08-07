import React, { useState } from 'react';
import { 
  Wallet, ArrowDownLeft, ArrowUpRight, Ticket, Trophy, Gift, ShieldAlert,
  Search, Filter, CheckCircle2, Clock, AlertCircle, Copy, Check, ChevronRight,
  TrendingUp, TrendingDown, ArrowUpDown, Sparkles, Share2, Download, ShieldCheck
} from 'lucide-react';
import { WalletTransaction } from '../types';
import { soundFx } from '../utils/audio';

interface WalletLedgerProps {
  transactions: WalletTransaction[];
  onOpenDeposit?: () => void;
  onOpenWithdraw?: () => void;
}

export const WalletLedger: React.FC<WalletLedgerProps> = ({
  transactions,
  onOpenDeposit,
  onOpenWithdraw
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    soundFx.playClick();
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper functions for classification
  const isLossTx = (tx: WalletTransaction) => {
    const lossTypes = ['roulette_bet', 'ticket_buy', 'loss', 'admin_deduction', 'withdrawal'];
    if (lossTypes.includes(tx.type)) return true;
    if (tx.amount < 0) return true;
    return false;
  };

  const isWinTx = (tx: WalletTransaction) => {
    const winTypes = ['roulette_win', 'win_payout', 'win', 'wheel_bonus', 'deposit', 'admin_bonus', 'vip_bonus'];
    if (winTypes.includes(tx.type)) return true;
    if (tx.amount > 0 && !isLossTx(tx)) return true;
    return false;
  };

  // High-Definition Voucher Slip Canvas PNG Export & Share Generator
  const handleShareVoucherPNG = (tx: WalletTransaction) => {
    soundFx.playCoin();
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 780;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Luxury Slate Mesh Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 780);
    grad.addColorStop(0, '#020617');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#030712');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 780);

    // Outer Gold Border Frame
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 568, 748);

    // Inner Subtle Gold Line
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 22, 556, 736);

    // B Logo Box
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(260, 40, 80, 50, 12);
    ctx.fill();

    ctx.fillStyle = '#020617';
    ctx.font = '900 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('B', 300, 76);

    // Title
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 24px monospace';
    ctx.fillText('ETGURU HD', 300, 122);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 11px monospace';
    ctx.fillText('OFFICIAL CASINO & LOTTERY TRANSACTION VOUCHER SLIP', 300, 142);

    // Divider Line
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 160);
    ctx.lineTo(560, 160);
    ctx.stroke();

    // Voucher Card Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(40, 180, 520, 480);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.strokeRect(40, 180, 520, 480);

    const isWin = isWinTx(tx);
    const isLoss = isLossTx(tx);

    // Status Banner Box
    ctx.fillStyle = isWin ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)';
    ctx.fillRect(60, 205, 480, 50);
    ctx.strokeStyle = isWin ? '#10b981' : '#f43f5e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(60, 205, 480, 50);

    ctx.fillStyle = isWin ? '#34d399' : '#f87171';
    ctx.font = '900 18px monospace';
    ctx.fillText(isWin ? 'STATUS: WIN (SUCCESS)' : 'STATUS: BET LOSS (SETTLED)', 300, 236);

    // Amount Display
    ctx.fillStyle = isWin ? '#34d399' : '#f87171';
    ctx.font = '900 36px monospace';
    const amountText = isWin ? `win+ ₹${Math.abs(tx.amount).toLocaleString('en-IN')}` : `-loss ₹${Math.abs(tx.amount).toLocaleString('en-IN')}`;
    ctx.fillText(amountText, 300, 305);

    // Details Table
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';

    const items = [
      ['Voucher ID', `#BG-SLIP-${tx.id}`],
      ['Transaction Type', tx.type.toUpperCase().replace('_', ' ')],
      ['Date & Time', tx.date],
      ['Bank UTR / Ref', tx.utr || 'N/A (Internal Game)'],
      ['Security Audit', '100% PROOF OF FAIRNESS']
    ];

    let startY = 360;
    items.forEach(([label, val]) => {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(label, 70, startY);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(val, 260, startY);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(70, startY + 10);
      ctx.lineTo(530, startY + 10);
      ctx.stroke();

      startY += 40;
    });

    // Notes
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Description:', 70, startY);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 11px monospace';
    ctx.fillText(tx.description.substring(0, 55), 70, startY + 20);

    // Footer Watermark & Security Seal
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 12px monospace';
    ctx.fillText('VERIFIED & GUARANTEED BY B ETGURU SECURITY ENGINE', 300, 700);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 10px monospace';
    ctx.fillText(`GENERATED ON ${new Date().toLocaleString('en-IN')} • OFFICIAL DIGITAL VOUCHER`, 300, 725);

    // Trigger Download PNG or Web Share API
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `BETGURU_Voucher_${tx.id}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: `B ETGURU Transaction Voucher ${tx.id}`,
          text: `Here is my official transaction voucher slip from B ETGURU HD!`
        }).catch((err) => console.log('Share canceled', err));
      } else {
        const link = document.createElement('a');
        link.download = `BETGURU_Voucher_${tx.id}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
      }
    });
  };

  // Filter & Search Logic
  const filteredTransactions = transactions
    .filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesId = tx.id.toLowerCase().includes(query);
        const matchesDesc = tx.description.toLowerCase().includes(query);
        const matchesUtr = tx.utr ? tx.utr.toLowerCase().includes(query) : false;
        return matchesId || matchesDesc || matchesUtr;
      }
      return true;
    });

  // Calculate Ledger Statistics
  const totalInflow = transactions
    .filter((tx) => tx.amount > 0 && tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalOutflow = transactions
    .filter((tx) => tx.amount < 0 && (tx.status === 'completed' || tx.status === 'pending'))
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  // Helper for Transaction Type Display
  const getTypeBadge = (type: WalletTransaction['type']) => {
    switch (type) {
      case 'deposit':
        return {
          label: 'Deposit',
          icon: <ArrowDownLeft className="w-4 h-4 text-emerald-400" />,
          bgColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          sign: '+'
        };
      case 'withdrawal':
        return {
          label: 'Withdrawal',
          icon: <ArrowUpRight className="w-4 h-4 text-rose-400" />,
          bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          sign: '-'
        };
      case 'ticket_buy':
        return {
          label: 'Ticket Bet (-loss)',
          icon: <Ticket className="w-4 h-4 text-amber-400" />,
          bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          sign: '-loss'
        };
      case 'roulette_bet':
        return {
          label: 'Roulette Bet (-loss)',
          icon: <TrendingDown className="w-4 h-4 text-rose-400" />,
          bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          sign: '-loss'
        };
      case 'loss':
        return {
          label: 'Bet Loss',
          icon: <TrendingDown className="w-4 h-4 text-rose-400" />,
          bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          sign: '-loss'
        };
      case 'win_payout':
      case 'win':
      case 'roulette_win':
        return {
          label: 'Game Win (win+)',
          icon: <Trophy className="w-4 h-4 text-yellow-400" />,
          bgColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          sign: 'win+'
        };
      case 'wheel_bonus':
        return {
          label: 'Wheel Bonus',
          icon: <Gift className="w-4 h-4 text-purple-400" />,
          bgColor: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
          sign: 'win+'
        };
      case 'admin_bonus':
        return {
          label: 'System Credit',
          icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
          bgColor: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          sign: '+'
        };
      case 'admin_deduction':
        return {
          label: 'Admin Deduction',
          icon: <TrendingDown className="w-4 h-4 text-rose-400" />,
          bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          sign: '-loss'
        };
      default:
        return {
          label: 'Transaction',
          icon: <Wallet className="w-4 h-4 text-slate-400" />,
          bgColor: 'bg-slate-800 border-slate-700 text-slate-300',
          sign: ''
        };
    }
  };

  // Helper for Outcome Signal Badge with Zoom In / Out Animation
  const getOutcomeBadge = (tx: WalletTransaction) => {
    const isWin = isWinTx(tx);
    const isLoss = isLossTx(tx);

    if (isWin) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-black px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400 animate-zoom-green shadow-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>WIN</span>
        </span>
      );
    } else if (isLoss) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-black px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400 animate-zoom-red shadow-lg">
          <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          <span>LOSS</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{tx.status.toUpperCase()}</span>
        </span>
      );
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Wallet Ledger Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Total Inflow */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-mono font-semibold uppercase tracking-wider">Total Cash Inflow</span>
            <div className="text-xl font-black text-emerald-400 font-mono">
              +₹{totalInflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Outflow */}
        <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-mono font-semibold uppercase tracking-wider">Total Outflow / Spent</span>
            <div className="text-xl font-black text-rose-400 font-mono">
              -₹{totalOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Total Transactions Count */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-mono font-semibold uppercase tracking-wider">Ledger Entries</span>
            <div className="text-xl font-black text-amber-300 font-mono">
              {transactions.length} <span className="text-xs font-normal text-slate-400">records</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Ledger Filter & Search Control Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by TXN ID, UTR, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono transition-all"
          />
        </div>

        {/* Type & Status Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => { soundFx.playClick(); setTypeFilter(e.target.value); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="deposit">Deposits (+)</option>
            <option value="withdrawal">Withdrawals (-)</option>
            <option value="ticket_buy">Ticket Buys (-)</option>
            <option value="win_payout">Win Payouts (+)</option>
            <option value="wheel_bonus">Wheel Bonuses (+)</option>
            <option value="admin_bonus">System Credits (+)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { soundFx.playClick(); setStatusFilter(e.target.value); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected/Failed</option>
          </select>

        </div>

      </div>

      {/* Transactions Chronological List */}
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
            <ShieldAlert className="w-10 h-10 text-slate-500 mx-auto" />
            <div className="text-sm font-mono font-bold text-slate-300">No ledger transactions found</div>
            <p className="text-xs text-slate-400">Try adjusting your search terms or filter selections.</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const badgeInfo = getTypeBadge(tx.type);
            const isPositive = isWinTx(tx);

            return (
              <div
                key={tx.id}
                onClick={() => { soundFx.playClick(); setSelectedTx(tx); }}
                className="group p-4 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all cursor-pointer shadow-md hover:shadow-lg hover:shadow-amber-500/5"
              >
                
                {/* Left Section: Icon & Info */}
                <div className="flex items-center gap-3">
                  
                  {/* Category Type Icon Container */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${badgeInfo.bgColor}`}>
                    {badgeInfo.icon}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-black text-amber-400 tracking-wide">{tx.id}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${badgeInfo.bgColor}`}>
                        {badgeInfo.label}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-white font-mono line-clamp-1">{tx.description}</p>
                    
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                      <span>{tx.date}</span>
                      {tx.utr && <span className="text-slate-400">UTR: <strong className="text-amber-300/80">{tx.utr}</strong></span>}
                    </div>
                  </div>

                </div>

                {/* Right Section: Amount & Signal Zoom Animation Badge */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80 shrink-0">
                  
                  <div className="text-left sm:text-right">
                    <div className={`text-base font-black font-mono tracking-tight ${
                      isPositive ? 'text-emerald-400 animate-zoom-green' : 'text-rose-400 animate-zoom-red'
                    }`}>
                      {isPositive ? `win+ ₹${Math.abs(tx.amount).toLocaleString('en-IN')}` : `-loss ₹${Math.abs(tx.amount).toLocaleString('en-IN')}`}
                    </div>
                    <div className="mt-1">{getOutcomeBadge(tx)}</div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all hidden sm:block" />

                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Transaction Detail & Shareable Voucher Slip Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white font-mono uppercase">Transaction Ledger Details</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Official Shareable Voucher Slip Card */}
            <div className="relative bg-slate-950 p-5 rounded-2xl border-2 border-amber-500/40 space-y-4 shadow-xl overflow-hidden">
              
              {/* Background Watermark Stamp */}
              <div className="absolute right-2 bottom-2 text-[60px] font-black text-amber-500/5 select-none pointer-events-none font-mono">
                B ETGURU
              </div>

              {/* Voucher Header Banner */}
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center font-mono text-base">
                    B
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-300 font-mono leading-none">ETGURU HD</h4>
                    <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Official Voucher Slip</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-mono block">Voucher Ref</span>
                  <span className="text-xs font-mono font-bold text-white">#BG-SLIP-{selectedTx.id.slice(-6)}</span>
                </div>
              </div>

              {/* Outcome Banner with Signal Zoom Animation */}
              <div className="flex flex-col items-center justify-center py-3 bg-slate-900/80 rounded-xl border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-bold">Transaction Outcome</span>
                <div className="my-1">{getOutcomeBadge(selectedTx)}</div>
                
                <div className={`text-2xl font-black font-mono tracking-tight mt-1 ${
                  isWinTx(selectedTx)
                    ? 'text-emerald-400 animate-zoom-green' 
                    : 'text-rose-400 animate-zoom-red'
                }`}>
                  {isWinTx(selectedTx)
                    ? `win+ ₹${Math.abs(selectedTx.amount).toLocaleString('en-IN')}` 
                    : `-loss ₹${Math.abs(selectedTx.amount).toLocaleString('en-IN')}`}
                </div>
              </div>

              {/* Transaction Key Details */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Transaction ID</span>
                  <div className="flex items-center gap-1 font-bold text-amber-300">
                    <span>{selectedTx.id}</span>
                    <button
                      onClick={() => handleCopy(selectedTx.id, 'tx_id')}
                      className="p-1 text-slate-400 hover:text-amber-400"
                    >
                      {copiedId === 'tx_id' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Category</span>
                  <span className="font-bold text-white capitalize">{selectedTx.type.replace('_', ' ')}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Date & Time</span>
                  <span className="text-slate-200">{selectedTx.date}</span>
                </div>

                {selectedTx.utr && (
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Bank UTR / Ref</span>
                    <span className="font-bold text-emerald-400">{selectedTx.utr}</span>
                  </div>
                )}

                <div className="pt-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Description Note</span>
                  <p className="text-xs text-slate-200 bg-slate-900 p-2.5 rounded-xl border border-slate-800 leading-relaxed font-mono">
                    {selectedTx.description}
                  </p>
                </div>
              </div>

              {/* Security Audit Badge */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400/90 font-mono bg-amber-500/10 py-1.5 rounded-xl border border-amber-500/20">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>100% Verified & Encrypted by B ETGURU Security Engine</span>
              </div>

            </div>

            {/* Action Buttons: Share Voucher PNG & Close */}
            <div className="space-y-2">
              <button
                onClick={() => handleShareVoucherPNG(selectedTx)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs font-mono rounded-xl golden-shadow-btn flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Share2 className="w-4 h-4" />
                <span>SHARE VOUCHER SLIP (PNG)</span>
              </button>

              <button
                onClick={() => setSelectedTx(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-extrabold text-xs font-mono rounded-xl transition-all"
              >
                CLOSE DETAILS
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};


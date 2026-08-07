import React, { useState } from 'react';
import { 
  Wallet, ArrowDownLeft, ArrowUpRight, Ticket, Trophy, Gift, ShieldAlert,
  Search, Filter, CheckCircle2, Clock, AlertCircle, Copy, Check, ChevronRight,
  TrendingUp, TrendingDown, ArrowUpDown, Sparkles
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

  // Filter & Search Logic
  const filteredTransactions = transactions
    .filter((tx) => {
      // Type match
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      // Status match
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      // Search match
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesId = tx.id.toLowerCase().includes(query);
        const matchesDesc = tx.description.toLowerCase().includes(query);
        const matchesUtr = tx.utr ? tx.utr.toLowerCase().includes(query) : false;
        return matchesId || matchesDesc || matchesUtr;
      }
      return true;
    })
    .sort((a, b) => {
      // Basic timestamp string comparison or fallback to array order
      if (sortOrder === 'newest') return 0; // assuming list is already newest first
      return 0;
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
          label: 'Ticket Purchase',
          icon: <Ticket className="w-4 h-4 text-amber-400" />,
          bgColor: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          sign: '-'
        };
      case 'win_payout':
        return {
          label: 'Prize Win',
          icon: <Trophy className="w-4 h-4 text-yellow-400" />,
          bgColor: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
          sign: '+'
        };
      case 'wheel_bonus':
        return {
          label: 'Wheel Bonus',
          icon: <Gift className="w-4 h-4 text-purple-400" />,
          bgColor: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
          sign: '+'
        };
      case 'admin_bonus':
        return {
          label: 'System Credit',
          icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
          bgColor: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          sign: '+'
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

  // Helper for Status Badge
  const getStatusBadge = (status: WalletTransaction['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>COMPLETED</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>PENDING</span>
          </span>
        );
      case 'rejected':
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>{status.toUpperCase()}</span>
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
            const isPositive = tx.amount > 0;

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

                {/* Right Section: Amount & Status Badge */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80 shrink-0">
                  
                  <div className="text-left sm:text-right">
                    <div className={`text-base font-black font-mono tracking-tight ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isPositive ? `+₹${tx.amount.toLocaleString('en-IN')}` : `-₹${Math.abs(tx.amount).toLocaleString('en-IN')}`}
                    </div>
                    <div className="mt-0.5">{getStatusBadge(tx.status)}</div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all hidden sm:block" />

                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Transaction Detail Drawer Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
            
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

            {/* Main Details Panel */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Transaction ID</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-amber-300">{selectedTx.id}</span>
                  <button
                    onClick={() => handleCopy(selectedTx.id, 'tx_id')}
                    className="p-1 text-slate-400 hover:text-amber-400"
                  >
                    {copiedId === 'tx_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Type</span>
                <span className="font-bold text-white capitalize">{selectedTx.type.replace('_', ' ')}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Amount</span>
                <span className={`font-black text-sm ${selectedTx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedTx.amount > 0 ? `+₹${selectedTx.amount}` : `-₹${Math.abs(selectedTx.amount)}`}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Status</span>
                <div>{getStatusBadge(selectedTx.status)}</div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Date & Time</span>
                <span className="text-slate-200">{selectedTx.date}</span>
              </div>

              {selectedTx.utr && (
                <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-800">
                  <span className="text-slate-400">Bank UTR / Ref</span>
                  <span className="font-bold text-emerald-400">{selectedTx.utr}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-mono">Description / Notes</span>
                <p className="text-xs text-slate-200 font-mono bg-slate-900 p-2 rounded-xl border border-slate-800">
                  {selectedTx.description}
                </p>
              </div>

            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs font-mono rounded-xl transition-all"
            >
              CLOSE DETAILS
            </button>

          </div>
        </div>
      )}

    </div>
  );
};

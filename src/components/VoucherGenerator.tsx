import React, { useState } from 'react';
import { 
  Share2, Download, Check, Copy, ShieldCheck, Sparkles, X, Wallet, 
  CheckCircle2, TrendingDown, Clock, Tag
} from 'lucide-react';
import { WalletTransaction, DepositRequest, WithdrawalRequest, PurchasedTicket } from '../types';
import { soundFx } from '../utils/audio';

export type AnyTransaction = WalletTransaction | DepositRequest | WithdrawalRequest | PurchasedTicket | {
  id: string;
  date?: string;
  purchaseDate?: string;
  amount?: number;
  price?: number;
  wonAmount?: number;
  type?: string;
  status: string;
  description?: string;
  drawTitle?: string;
  utr?: string;
};

interface VoucherGeneratorProps {
  transaction: AnyTransaction;
  onClose?: () => void;
}

export const VoucherGenerator: React.FC<VoucherGeneratorProps> = ({
  transaction,
  onClose
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Normalize transaction fields
  const getNormalizedDetails = () => {
    let id = transaction.id || 'N/A';
    let date = (transaction as any).date || (transaction as any).purchaseDate || new Date().toLocaleString();
    let status = ((transaction as any).status || 'completed').toLowerCase();
    let utr = (transaction as any).utr || undefined;
    let description = (transaction as any).description || (transaction as any).drawTitle || 'Official Transaction';
    let type = ((transaction as any).type || 'transaction').toLowerCase();
    let amount = 0;

    if ('amount' in transaction && typeof transaction.amount === 'number') {
      amount = transaction.amount;
    } else if ('wonAmount' in transaction && typeof (transaction as any).wonAmount === 'number' && (transaction as any).wonAmount > 0) {
      amount = (transaction as any).wonAmount;
    } else if ('price' in transaction && typeof (transaction as any).price === 'number') {
      amount = -(transaction as any).price;
    }

    let isWin = false;
    let isLoss = false;
    let isPending = status === 'pending';
    let isRejected = status === 'rejected' || status === 'failed';
    let displayType = '';
    let displayStatus = status.toUpperCase();

    // Specific category formatting
    if (type === 'deposit') {
      if (isRejected) {
        displayType = 'DEPOSIT REJECTED';
        displayStatus = 'REJECTED';
        isLoss = true;
      } else if (status === 'approved' || status === 'completed') {
        displayType = 'DEPOSIT SUCCESSFUL';
        displayStatus = 'APPROVED';
        isWin = true;
      } else {
        displayType = 'DEPOSIT PENDING';
        displayStatus = 'PENDING';
      }
    } else if (type === 'withdrawal') {
      if (isRejected) {
        displayType = 'WITHDRAWAL REJECTED';
        displayStatus = 'REJECTED';
        isLoss = true;
      } else if (status === 'approved' || status === 'completed' || status === 'successful') {
        displayType = 'WITHDRAWAL SUCCESSFUL';
        displayStatus = 'SUCCESSFUL';
        isWin = true;
      } else {
        displayType = 'WITHDRAWAL PENDING';
        displayStatus = 'PENDING';
      }
    } else if (type === 'roulette_win') {
      displayType = 'ROULETTE WIN';
      displayStatus = 'WON';
      isWin = true;
    } else if (type === 'roulette_bet' || type === 'roulette_loss') {
      displayType = 'ROULETTE LOSS';
      displayStatus = 'LOST';
      isLoss = true;
    } else if (type === 'ticket_buy' || type === 'ticket') {
      if (status === 'win') {
        displayType = 'TICKET WIN';
        displayStatus = 'WON';
        isWin = true;
      } else if (status === 'loss') {
        displayType = 'TICKET LOST';
        displayStatus = 'LOST';
        isLoss = true;
      } else {
        displayType = 'TICKET BOUGHT';
        displayStatus = status.toUpperCase();
        isLoss = true;
      }
    } else if (type === 'win_payout' || type === 'win') {
      displayType = 'GAME WIN';
      displayStatus = 'WON';
      isWin = true;
    } else if (type === 'loss') {
      displayType = 'GAME LOSS';
      displayStatus = 'LOST';
      isLoss = true;
    } else if (type === 'wheel_bonus' || type === 'admin_bonus' || type === 'vip_bonus') {
      displayType = 'BONUS CREDIT';
      displayStatus = 'CREDITED';
      isWin = true;
    } else if (type === 'admin_deduction') {
      displayType = 'ADMIN DEDUCTION';
      displayStatus = 'DEDUCTED';
      isLoss = true;
    } else {
      displayType = type.replace('_', ' ').toUpperCase();
      if (amount > 0) isWin = true;
      else if (amount < 0) isLoss = true;
    }

    return {
      id,
      date,
      amount,
      type: displayType,
      status: displayStatus,
      utr,
      description,
      isWin,
      isLoss,
      isPending,
      isRejected,
      rawType: type,
      rawStatus: status
    };
  };

  const details = getNormalizedDetails();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    soundFx.playClick();
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Generate High-Definition Canvas PNG (800x1040)
  const generateCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1040;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Outer Background - Deep Slate Mesh Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1040);
    grad.addColorStop(0, '#020617');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#030712');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 1040);

    // Golden Outer Border Frame
    ctx.strokeStyle = details.isWin ? '#10b981' : details.isLoss ? '#f43f5e' : '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 760, 1000);

    // Inner Accent Border Line
    ctx.strokeStyle = details.isWin ? 'rgba(16, 185, 129, 0.4)' : details.isLoss ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, 744, 984);

    // Logo & Header Box
    const logoX = 350;
    const logoY = 50;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(logoX, logoY, 100, 60, 16);
    ctx.fill();

    ctx.fillStyle = '#020617';
    ctx.font = '900 40px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('B', logoX + 50, logoY + 44);

    // Brand Title
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 32px monospace';
    ctx.fillText('ETGURU HD', 400, 150);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 13px monospace';
    ctx.fillText('OFFICIAL DIGITAL CASINO & LOTTERY VOUCHER', 400, 175);

    // Header Divider
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, 195);
    ctx.lineTo(740, 195);
    ctx.stroke();

    // Main Card Box Container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(60, 220, 680, 650);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(60, 220, 680, 650);

    // Outcome Status Banner Box
    const statusBg = details.isWin ? 'rgba(16, 185, 129, 0.25)' : details.isLoss ? 'rgba(244, 63, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)';
    const statusBorder = details.isWin ? '#10b981' : details.isLoss ? '#f43f5e' : '#f59e0b';
    const statusColor = details.isWin ? '#34d399' : details.isLoss ? '#f87171' : '#fbbf24';

    ctx.fillStyle = statusBg;
    ctx.fillRect(90, 250, 620, 70);
    ctx.strokeStyle = statusBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(90, 250, 620, 70);

    ctx.fillStyle = statusColor;
    ctx.font = '900 24px monospace';
    ctx.fillText(`TRANSACTION TYPE: ${details.type}`, 400, 292);

    // Amount Display Big Text
    ctx.fillStyle = details.isWin ? '#34d399' : details.isLoss ? '#f87171' : '#f8fafc';
    ctx.font = '900 48px monospace';
    const absAmt = Math.abs(details.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const signLabel = details.isWin ? `WIN +₹${absAmt}` : details.isLoss ? `LOSS -₹${absAmt}` : `₹${absAmt}`;
    ctx.fillText(signLabel, 400, 380);

    // Transaction Details Table
    ctx.textAlign = 'left';
    ctx.font = '700 16px monospace';

    const items = [
      ['Voucher Ref ID', `#BG-VOUCHER-${details.id}`],
      ['Transaction Date', details.date],
      ['Current Status', details.status],
      ['Bank UTR / Ref', details.utr || 'N/A (Internal Game)'],
      ['Security Level', '100% PROOF OF FAIRNESS ENCRYPTED']
    ];

    let currentY = 440;
    items.forEach(([label, value]) => {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(label, 100, currentY);

      if (label === 'Current Status') {
        ctx.fillStyle = statusColor;
      } else {
        ctx.fillStyle = '#f8fafc';
      }
      ctx.fillText(value, 360, currentY);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(100, currentY + 12);
      ctx.lineTo(700, currentY + 12);
      ctx.stroke();

      currentY += 50;
    });

    // Description Box
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Description:', 100, currentY);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 14px monospace';
    ctx.fillText(details.description.substring(0, 50), 100, currentY + 28);

    // Decorative Barcode graphic
    ctx.fillStyle = '#f59e0b';
    let barX = 100;
    for (let i = 0; i < 40; i++) {
      const w = (i % 3 === 0) ? 6 : (i % 2 === 0) ? 3 : 1.5;
      ctx.fillRect(barX, currentY + 70, w, 40);
      barX += w + 8;
    }

    // Security Footer Watermark
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 14px monospace';
    ctx.fillText('VERIFIED & GUARANTEED BY B ETGURU SECURITY ENGINE', 400, 915);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 12px monospace';
    ctx.fillText(`ISSUED: ${new Date().toLocaleString('en-IN')} • OFFICIAL DIGITAL SLIP`, 400, 945);

    return canvas;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  // Web Share API Handler with Fallback
  const handleShareVoucherPNG = () => {
    soundFx.playCoin();
    setIsGenerating(true);
    setShareFeedback(null);

    setTimeout(() => {
      try {
        const canvas = generateCanvas();
        canvas.toBlob(async (blob) => {
          if (!blob) {
            setIsGenerating(false);
            return;
          }

          const filename = `BETGURU_Voucher_${details.id}.png`;
          const file = new File([blob], filename, { type: 'image/png' });

          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: `BETGURU Voucher #${details.id}`,
                text: `Check out my official BETGURU HD transaction voucher slip!`
              });
              setShareFeedback('Voucher shared successfully!');
            } catch (err: any) {
              if (err.name !== 'AbortError') {
                console.warn('Share error, downloading instead:', err);
                downloadBlob(blob, filename);
                setShareFeedback('Downloaded voucher PNG file.');
              }
            }
          } else {
            downloadBlob(blob, filename);
            setShareFeedback('Downloaded HD Voucher PNG image.');
          }
          setIsGenerating(false);
          setTimeout(() => setShareFeedback(null), 3000);
        }, 'image/png');
      } catch (e) {
        console.error('Error generating voucher PNG', e);
        setIsGenerating(false);
      }
    }, 100);
  };

  // Direct PNG Download Button Handler
  const handleDownloadPNG = () => {
    soundFx.playClick();
    setIsGenerating(true);
    setTimeout(() => {
      const canvas = generateCanvas();
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, `BETGURU_Voucher_${details.id}.png`);
        }
        setIsGenerating(false);
      }, 'image/png');
    }, 100);
  };

  return (
    <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative space-y-5 overflow-hidden">
      
      {/* Modal Close Button if supplied */}
      {onClose && (
        <button
          onClick={() => { soundFx.playClick(); onClose(); }}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header Title */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 pr-8">
        <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center font-mono text-lg shadow-md">
          B
        </div>
        <div>
          <h3 className="text-base font-black text-amber-300 font-mono tracking-wide leading-none">
            ETGURU HD VOUCHER
          </h3>
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            Official Proof of Transaction
          </span>
        </div>
      </div>

      {/* Visual Voucher Card Slip */}
      <div className={`relative bg-slate-950 p-5 rounded-2xl border-2 transition-all space-y-4 shadow-2xl overflow-hidden ${
        details.isWin 
          ? 'border-emerald-500/60 bg-emerald-950/20' 
          : details.isLoss 
          ? 'border-rose-500/60 bg-rose-950/20' 
          : 'border-amber-500/50'
      }`}>
        
        {/* Background Branding Watermark */}
        <div className="absolute right-2 bottom-2 text-[52px] font-black text-amber-500/5 select-none pointer-events-none font-mono">
          B ETGURU
        </div>

        {/* Signal Outcome Indicator Banner */}
        <div className={`flex flex-col items-center justify-center py-3.5 rounded-xl border text-center space-y-1 shadow-lg ${
          details.isWin
            ? 'bg-emerald-500/15 border-emerald-500/40 animate-zoom-green'
            : details.isLoss
            ? 'bg-rose-500/15 border-rose-500/40 animate-zoom-red'
            : 'bg-amber-500/15 border-amber-500/40'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full animate-ping ${
              details.isWin ? 'bg-emerald-400' : details.isLoss ? 'bg-rose-400' : 'bg-amber-400'
            }`}></span>

            <span className={`text-xs font-black font-mono tracking-wider ${
              details.isWin ? 'text-emerald-300' : details.isLoss ? 'text-rose-300' : 'text-amber-300'
            }`}>
              {details.type}
            </span>
          </div>

          <div className={`text-2xl font-black font-mono tracking-tight ${
            details.isWin ? 'text-emerald-400' : details.isLoss ? 'text-rose-400' : 'text-amber-300'
          }`}>
            {details.isWin
              ? `WIN +₹${Math.abs(details.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              : details.isLoss
              ? `LOSS -₹${Math.abs(details.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              : `₹${Math.abs(details.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </div>
        </div>

        {/* Structured Transaction Data List */}
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between py-1.5 border-b border-slate-800/80">
            <span className="text-slate-400">Voucher Ref ID</span>
            <div className="flex items-center gap-1 font-bold text-amber-300">
              <span>{details.id}</span>
              <button
                onClick={() => handleCopy(details.id)}
                className="p-1 text-slate-400 hover:text-amber-300 transition-colors"
                title="Copy Transaction ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-800/80">
            <span className="text-slate-400">Date & Time</span>
            <span className="text-slate-200 font-semibold">{details.date}</span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-800/80">
            <span className="text-slate-400">Transaction Status</span>
            <span className={`font-bold px-2 py-0.5 rounded-full border text-[10px] ${
              details.isWin
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : details.isLoss
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              {details.status}
            </span>
          </div>

          {details.utr && (
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Bank UTR / Ref</span>
              <span className="font-mono font-bold text-emerald-400">{details.utr}</span>
            </div>
          )}

          <div className="pt-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Description / Game
            </span>
            <p className="text-xs text-slate-200 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 leading-relaxed font-mono">
              {details.description}
            </p>
          </div>
        </div>

        {/* Security Seal */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400/90 font-mono bg-amber-500/10 py-1.5 rounded-xl border border-amber-500/20">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>100% Encrypted & Authenticated Voucher</span>
        </div>

      </div>

      {shareFeedback && (
        <div className="text-center text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 p-2 rounded-xl border border-emerald-500/40 animate-in fade-in">
          {shareFeedback}
        </div>
      )}

      {/* Share & Download Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
        
        {/* Mobile Web Share Button */}
        <button
          onClick={handleShareVoucherPNG}
          disabled={isGenerating}
          className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl golden-shadow-btn flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          <Share2 className="w-4 h-4 stroke-[2.5]" />
          <span>{isGenerating ? 'GENERATING...' : 'SHARE VOUCHER'}</span>
        </button>

        {/* Download PNG Button */}
        <button
          onClick={handleDownloadPNG}
          disabled={isGenerating}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-amber-300 font-black text-xs rounded-xl border border-amber-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>DOWNLOAD HD PNG</span>
        </button>

      </div>

    </div>
  );
};

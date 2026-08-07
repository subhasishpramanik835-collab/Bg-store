import React, { useState } from 'react';
import { X, CheckCircle2, Copy, Upload, ArrowRight, ShieldCheck, QrCode, AlertCircle, Sparkles } from 'lucide-react';
import { PaymentMethodType } from '../types';
import { soundFx } from '../utils/audio';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitDeposit: (amount: number, method: PaymentMethodType, utr: string, screenshotUrl: string) => void;
}

const PRESET_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];

const PAYMENT_METHODS: { id: PaymentMethodType; name: string; color: string; upiId: string; icon: string }[] = [
  { id: 'phonepe', name: 'PhonePe', color: 'from-purple-600 to-indigo-700', upiId: 'betguru.pay@ybl', icon: '📱' },
  { id: 'gpay', name: 'Google Pay', color: 'from-blue-600 to-cyan-600', upiId: 'betguru.gpay@okaxis', icon: '💳' },
  { id: 'paytm', name: 'Paytm UPI', color: 'from-sky-500 to-blue-700', upiId: 'betguru@paytm', icon: '🔷' },
  { id: 'upi', name: 'BHIM / Any UPI', color: 'from-amber-600 to-emerald-600', upiId: 'betguru.official@upi', icon: '⚡' }
];

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  onSubmitDeposit
}) => {
  const [method, setMethod] = useState<PaymentMethodType>('phonepe');
  const [amount, setAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('1000');
  const [utr, setUtr] = useState<string>('');
  const [screenshot, setScreenshot] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const currentMethod = PAYMENT_METHODS.find(m => m.id === method) || PAYMENT_METHODS[0];

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(currentMethod.upiId);
    setCopiedUpi(true);
    soundFx.playClick();
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleAmountSelect = (val: number) => {
    soundFx.playClick();
    setAmount(val);
    setCustomAmount(val.toString());
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setAmount(parsed);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (amount < 100) {
      setErrorMsg('Minimum deposit amount is ₹100.');
      return;
    }

    if (!utr || utr.trim().length < 8) {
      setErrorMsg('Please enter a valid 12-digit UTR / Reference Number.');
      return;
    }

    if (!screenshot) {
      // If user hasn't uploaded a file, provide a default proof screenshot placeholder
      setScreenshot('https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80');
    }

    soundFx.playCoin();
    onSubmitDeposit(amount, method, utr, screenshot || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80');
    setShowSuccessPopup(true);
  };

  const handleFinish = () => {
    setShowSuccessPopup(false);
    onClose();
    // Reset fields
    setUtr('');
    setScreenshot('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white font-mono">Deposit Funds</h2>
              <p className="text-[11px] text-amber-400/80">Instant Wallet Top-Up via UPI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Popup View */}
        {showSuccessPopup ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white font-mono mb-2">Deposit Submitted!</h3>
            <p className="text-amber-300 font-medium text-sm leading-relaxed max-w-md bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 mb-6">
              "Please wait a few minutes. Your deposit request of <span className="font-extrabold text-white">₹{amount}</span> has been submitted successfully and is under verification."
            </p>
            <div className="w-full bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-left text-xs space-y-2 font-mono text-slate-300 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-bold text-amber-400 uppercase">{method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">UTR Number:</span>
                <span className="font-bold text-white">{utr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-amber-400 font-bold uppercase flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  Pending Verification
                </span>
              </div>
            </div>
            <button
              onClick={handleFinish}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-400 transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            
            {/* Step 1: Select Payment Method */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 block">
                1. Select Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => { soundFx.playClick(); setMethod(pm.id); }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      method === pm.id
                        ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-amber-400 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xl">{pm.icon}</span>
                    <span className="font-bold text-xs sm:text-sm">{pm.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Amount Selection */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 block">
                2. Select Deposit Amount (₹)
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleAmountSelect(amt)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                      amount === amt
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950/80 border-slate-800 text-amber-300 hover:border-amber-500/40'
                    }`}
                  >
                    +₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              {/* Custom Amount Input */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold font-mono">₹</span>
                <input
                  type="number"
                  min="100"
                  max="100000"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="Enter custom deposit amount"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white font-mono font-bold text-sm rounded-xl pl-8 pr-4 py-2.5 outline-none transition-all"
                />
              </div>
            </div>

            {/* Payment Details & QR Code */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/20 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-28 h-28 bg-white p-2 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-lg">
                {/* Simulated QR Code matrix visual */}
                <div className="w-full h-full bg-slate-950 p-1.5 rounded flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-5 h-5 bg-amber-400 border-2 border-white"></div>
                    <div className="w-5 h-5 bg-amber-400 border-2 border-white"></div>
                  </div>
                  <div className="text-[8px] font-mono font-bold text-amber-400 text-center tracking-tighter">
                    SCAN TO PAY
                  </div>
                  <div className="flex justify-between">
                    <div className="w-5 h-5 bg-amber-400 border-2 border-white"></div>
                    <div className="w-2 h-2 bg-emerald-400"></div>
                  </div>
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex items-center justify-center sm:justify-start gap-1 text-xs text-slate-400">
                  <span>Pay via</span>
                  <span className="font-bold text-amber-400 uppercase">{currentMethod.name}</span>
                </div>
                <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-white truncate">{currentMethod.upiId}</span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="text-amber-400 hover:text-amber-300 p-1 font-bold text-xs flex items-center gap-1"
                  >
                    {copiedUpi ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Scan QR code or pay to UPI ID, then paste your 12-digit UTR below.
                </p>
              </div>
            </div>

            {/* Step 3: Payment Proof Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center justify-between">
                  <span>UTR / Ref Number <span className="text-rose-400">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Mandatory 12 Digits</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={16}
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  placeholder="e.g. 423189071234"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white font-mono text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1 block">
                  Payment Screenshot <span className="text-rose-400">*</span>
                </label>
                <div className="relative border-2 border-dashed border-slate-800 hover:border-amber-500/40 rounded-2xl p-3 text-center bg-slate-950/60 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {screenshot ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Screenshot Attached Successfully</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>Click or drag image to upload screenshot proof</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95"
            >
              <span>Submit ₹{amount.toLocaleString('en-IN')} Deposit</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>256-Bit SSL Encrypted & Instant Verification</span>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

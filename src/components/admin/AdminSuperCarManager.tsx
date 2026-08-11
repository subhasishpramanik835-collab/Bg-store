import React, { useState, useEffect } from 'react';
import {
  Upload, Trash2, Image as ImageIcon, CheckCircle, AlertCircle, Loader2, RefreshCw,
  Lock, DollarSign, Sparkles, TrendingUp, CheckCircle2, XCircle, Search,
  Filter, Grid, Table as TableIcon, Users, Clock, Award, ShieldAlert, ArrowUpRight, RotateCcw,
  Activity, PieChart as PieChartIcon, BarChart2, Trophy
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, collection, onSnapshot, getDoc } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import { SuperCarConfig, SuperCarColor, PurchasedTicket, User } from '../../types';
import { getSuperCarInfo } from '../../utils/supercar';
import { soundFx } from '../../utils/audio';
import { PaginationBar } from '../PaginationBar';

interface AdminSuperCarManagerProps {
  config: SuperCarConfig;
  onUpdateConfig: (updated: Partial<SuperCarConfig>) => Promise<void>;
}

export const AdminSuperCarManager: React.FC<AdminSuperCarManagerProps> = ({ config, onUpdateConfig }) => {
  // Top Navigation Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<'monitor' | 'draws' | 'tickets' | 'images'>('monitor');

  // Real-time Firestore State
  const [tickets, setTickets] = useState<PurchasedTicket[]>([]);
  const [usersMap, setUsersMap] = useState<{ [uid: string]: User }>({});
  const [drawsMap, setDrawsMap] = useState<{ [issueId: string]: any }>({});

  // Uploader & Action States
  const [uploadingCar, setUploadingCar] = useState<SuperCarColor | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [urlInputs, setUrlInputs] = useState<{ [key in SuperCarColor]?: string }>({});

  // Sub-Tab 1 (Sales Monitor) State
  const [selectedMonitorSlot, setSelectedMonitorSlot] = useState<number | 'all'>('all');

  // Sub-Tab 2 (Daily Draws Results) State
  const [drawsSearchTerm, setDrawsSearchTerm] = useState<string>('');
  const [drawsViewMode, setDrawsViewMode] = useState<'grid' | 'table'>('grid');
  const [drawsFilterStatus, setDrawsFilterStatus] = useState<'all' | 'completed' | 'active'>('all');

  // Sub-Tab 3 (User Ticket Audit) State
  const [ticketSearchTerm, setTicketSearchTerm] = useState<string>('');
  const [ticketSlotFilter, setTicketSlotFilter] = useState<number | 'all'>('all');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'active' | 'win' | 'loss'>('all');
  const [ticketCarFilter, setTicketCarFilter] = useState<'all' | SuperCarColor>('all');
  const [ticketPage, setTicketPage] = useState<number>(1);
  const [ticketPageSize, setTicketPageSize] = useState<number>(10);
  const [settlingTicketId, setSettlingTicketId] = useState<string | null>(null);

  // Real-time Firestore Listeners
  useEffect(() => {
    // 1. Listen to all supercar tickets
    const unsubTickets = onSnapshot(collection(db, 'tickets'), (snap) => {
      const fetched: PurchasedTicket[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as PurchasedTicket;
        if (data.category === 'Three Super Car Draw' || data.drawTitle?.includes('Super Car')) {
          fetched.push({ ...data, id: docSnap.id });
        }
      });
      setTickets(fetched);
    }, (err) => console.warn('Supercar tickets listener notice:', err.message));

    // 2. Listen to supercar draws history
    const unsubDraws = onSnapshot(collection(db, 'supercar_draws'), (snap) => {
      const map: { [issueId: string]: any } = {};
      snap.forEach((docSnap) => {
        map[docSnap.id] = docSnap.data();
      });
      setDrawsMap(map);
    }, (err) => console.warn('Supercar draws listener notice:', err.message));

    // 3. Listen to users directory
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const map: { [uid: string]: User } = {};
      snap.forEach((docSnap) => {
        map[docSnap.id] = { ...docSnap.data(), id: docSnap.id } as User;
      });
      setUsersMap(map);
    }, (err) => console.warn('Users listener notice:', err.message));

    return () => {
      unsubTickets();
      unsubDraws();
      unsubUsers();
    };
  }, []);

  // Filter tickets for Super Car
  const supercarTickets = tickets.filter(
    (t) => t.category === 'Three Super Car Draw' || t.drawTitle?.includes('Super Car')
  );

  // Format slot time helper (1 to 29 slots: 08:00 AM to 10:00 PM)
  const getSlotTimeLabel = (slotNum: number) => {
    const startMins = 8 * 60 + (slotNum - 1) * 30;
    const h = Math.floor(startMins / 60);
    const m = startMins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 === 0 ? 12 : h % 12;
    return `${String(formattedH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Image Upload Handler
  const handleFileUpload = async (carKey: SuperCarColor, file: File) => {
    setStatusMessage(null);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setStatusMessage({ type: 'error', text: 'Invalid image format! Please upload JPG, PNG, or WebP.' });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'File size exceeds 15MB! Please select a smaller image.' });
      return;
    }

    setUploadingCar(carKey);
    setUploadProgress(20);

    try {
      const compressedBlob = await compressImage(file, 800, 0.75);
      setUploadProgress(50);

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(compressedBlob);
      });

      setUploadProgress(75);
      const updatedCarImages = { ...(config.carImages || {}), [carKey]: dataUrl };
      await onUpdateConfig({ carImages: updatedCarImages });

      setUploadProgress(100);
      try { soundFx.playWinFanfare(); } catch (_) {}
      setStatusMessage({
        type: 'success',
        text: `Successfully uploaded & updated ${carKey.toUpperCase()} supercar image! Syncing to user UI in real-time.`
      });

      // Background storage upload
      (async () => {
        try {
          const storagePath = `supercar_images/${carKey}_${Date.now()}.webp`;
          const storageRef = ref(storage, storagePath);
          const uploadTask = uploadBytesResumable(storageRef, compressedBlob);

          const storageUrl = await Promise.race<string | null>([
            new Promise<string | null>((resolve) => {
              uploadTask.on(
                'state_changed',
                null,
                () => resolve(null),
                async () => {
                  try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                  } catch { resolve(null); }
                }
              );
            }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
          ]);

          if (storageUrl) {
            await onUpdateConfig({ carImages: { ...(config.carImages || {}), [carKey]: storageUrl } });
          }
        } catch (_) {}
      })();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Upload failed: ${err.message || 'Unknown error'}` });
    } finally {
      setUploadingCar(null);
      setUploadProgress(0);
    }
  };

  const compressImage = (file: File, maxWidth: number, quality: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(file); return; }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob || file), 'image/webp', quality);
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = async (carKey: SuperCarColor) => {
    soundFx.playClick();
    const newCarImages = { ...config.carImages };
    delete newCarImages[carKey];
    await onUpdateConfig({ carImages: newCarImages });
    setStatusMessage({ type: 'success', text: `Reset ${carKey.toUpperCase()} car image to default.` });
  };

  // Publish Winner for a Daily Slot
  const handlePublishSlotWinner = async (slotNum: number, winningCar: SuperCarColor) => {
    soundFx.playWinFanfare();
    const timeLabel = getSlotTimeLabel(slotNum);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const issueId = `CAR-${dateStr}-${String(slotNum).padStart(2, '0')}`;

    const drawIssueDoc = {
      id: issueId,
      issueId,
      drawIndex: slotNum,
      drawTime: `${now.toLocaleDateString('en-IN')} ${timeLabel}`,
      winningCar,
      status: 'completed',
      prizeMultiplier: config.carMultipliers?.[winningCar] || config.prizeMultiplier || 2.8,
      declaredAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'supercar_draws', issueId), drawIssueDoc, { merge: true });

      // Settle tickets for this slot automatically
      const multiplier = config.carMultipliers?.[winningCar] || config.prizeMultiplier || 2.8;
      const slotTickets = supercarTickets.filter((t) => {
        return t.drawTime?.toString().includes(timeLabel) || t.drawTitle?.includes(timeLabel) || t.drawTitle?.includes(`Slot #${String(slotNum).padStart(2, '0')}`);
      });

      for (const t of slotTickets) {
        const choice = (t.selectedCar || t.selectedNumbers?.[0] as string || '').toLowerCase();
        const isWinner = choice === winningCar;
        const payout = isWinner ? Math.round((t.price || 100) * multiplier) : 0;

        await setDoc(doc(db, 'tickets', t.id), {
          status: isWinner ? 'win' : 'loss',
          wonAmount: payout,
          settledAt: new Date().toISOString()
        }, { merge: true });

        if (isWinner && payout > 0) {
          const userDocRef = doc(db, 'users', t.userId);
          const uSnap = await getDoc(userDocRef);
          if (uSnap.exists()) {
            const uData = uSnap.data();
            const newBal = (uData.balance || 0) + payout;
            const newWon = (uData.totalWon || 0) + payout;
            await setDoc(userDocRef, { balance: newBal, totalWon: newWon }, { merge: true });

            // Log Transaction
            const txId = `TXN-WIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await setDoc(doc(db, 'transactions', txId), {
              id: txId,
              userId: t.userId,
              type: 'win',
              amount: payout,
              description: `3 Super Car Draw Win Payout: Slot #${slotNum} (${winningCar.toUpperCase()} CAR)`,
              date: new Date().toLocaleString()
            }, { merge: true });
          }
        }
      }

      const updatedSlotWinners = { ...(config.manualSlotWinners || {}), [slotNum]: winningCar };
      await onUpdateConfig({ manualSlotWinners: updatedSlotWinners });

      setStatusMessage({
        type: 'success',
        text: `🏆 Slot #${String(slotNum).padStart(2, '0')} (${winningCar.toUpperCase()} CAR) published! Settled ${slotTickets.length} tickets with real-time wallet credits.`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Failed to publish result: ${err.message}` });
    }
  };

  // Manual Win/Loss Settlement Control for Individual Tickets
  const handleManualSettleTicket = async (ticket: PurchasedTicket, targetStatus: 'win' | 'loss' | 'active') => {
    setSettlingTicketId(ticket.id);
    try {
      const carChoice = (ticket.selectedCar || ticket.selectedNumbers?.[0] as string || 'red').toLowerCase() as SuperCarColor;
      const multiplier = config.carMultipliers?.[carChoice] || config.prizeMultiplier || 2.8;
      const payoutAmount = targetStatus === 'win' ? Math.round((ticket.price || 100) * multiplier) : 0;

      await setDoc(doc(db, 'tickets', ticket.id), {
        status: targetStatus,
        wonAmount: payoutAmount,
        updatedByAdminAt: new Date().toISOString()
      }, { merge: true });

      if (targetStatus === 'win' && payoutAmount > 0) {
        soundFx.playWinFanfare();
        const userRef = doc(db, 'users', ticket.userId);
        const uSnap = await getDoc(userRef);
        if (uSnap.exists()) {
          const uData = uSnap.data();
          const currentBal = uData.balance || 0;
          const currentWon = uData.totalWon || 0;
          await setDoc(userRef, {
            balance: currentBal + payoutAmount,
            totalWon: currentWon + payoutAmount
          }, { merge: true });

          const txId = `TXN-MANUAL-WIN-${Date.now()}`;
          await setDoc(doc(db, 'transactions', txId), {
            id: txId,
            userId: ticket.userId,
            type: 'win',
            amount: payoutAmount,
            description: `Admin Manual Win Payout: Ticket #${ticket.ticketNumber || ticket.id} (${carChoice.toUpperCase()} CAR)`,
            date: new Date().toLocaleString()
          }, { merge: true });
        }
        setStatusMessage({ type: 'success', text: `✓ Ticket #${ticket.ticketNumber || ticket.id} set to WIN! Credited ₹${payoutAmount.toLocaleString('en-IN')} to player balance.` });
      } else if (targetStatus === 'loss') {
        soundFx.playClick();
        setStatusMessage({ type: 'success', text: `⊘ Ticket #${ticket.ticketNumber || ticket.id} set to LOSS.` });
      } else {
        soundFx.playClick();
        setStatusMessage({ type: 'success', text: `↺ Ticket #${ticket.ticketNumber || ticket.id} reset to ACTIVE.` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Failed to update ticket: ${err.message}` });
    } finally {
      setSettlingTicketId(null);
    }
  };

  // Filtered tickets for Monitor
  const monitorFilteredTickets = supercarTickets.filter((t) => {
    if (selectedMonitorSlot === 'all') return true;
    const timeLabel = getSlotTimeLabel(selectedMonitorSlot as number);
    return t.drawTime?.toString().includes(timeLabel) || t.drawTitle?.includes(timeLabel) || t.drawTitle?.includes(`Slot #${String(selectedMonitorSlot).padStart(2, '0')}`);
  });

  const monitorRedTickets = monitorFilteredTickets.filter((t) => (t.selectedCar || t.selectedNumbers?.[0]) === 'red');
  const monitorBlackTickets = monitorFilteredTickets.filter((t) => (t.selectedCar || t.selectedNumbers?.[0]) === 'black');
  const monitorYellowTickets = monitorFilteredTickets.filter((t) => (t.selectedCar || t.selectedNumbers?.[0]) === 'yellow');

  const monitorRedVol = monitorRedTickets.reduce((sum, t) => sum + (t.price || 0), 0);
  const monitorBlackVol = monitorBlackTickets.reduce((sum, t) => sum + (t.price || 0), 0);
  const monitorYellowVol = monitorYellowTickets.reduce((sum, t) => sum + (t.price || 0), 0);
  const monitorTotalRev = monitorRedVol + monitorBlackVol + monitorYellowVol;
  const monitorTotalCount = monitorFilteredTickets.length;

  // Determine Leader
  let leaderColor = 'RED CAR';
  let leadingShare = '0%';
  if (monitorTotalCount > 0) {
    if (monitorRedTickets.length >= monitorBlackTickets.length && monitorRedTickets.length >= monitorYellowTickets.length) {
      leaderColor = 'RED CAR';
      leadingShare = `${Math.round((monitorRedTickets.length / monitorTotalCount) * 100)}%`;
    } else if (monitorBlackTickets.length >= monitorRedTickets.length && monitorBlackTickets.length >= monitorYellowTickets.length) {
      leaderColor = 'BLACK CAR';
      leadingShare = `${Math.round((monitorBlackTickets.length / monitorTotalCount) * 100)}%`;
    } else {
      leaderColor = 'YELLOW CAR';
      leadingShare = `${Math.round((monitorYellowTickets.length / monitorTotalCount) * 100)}%`;
    }
  }

  // Recharts Data Format
  const rechartsData = [
    { name: 'RED CAR', tickets: monitorRedTickets.length, revenue: monitorRedVol, price: config.carPrices?.red || config.ticketPrice || 100, fill: '#f43f5e' },
    { name: 'BLACK CAR', tickets: monitorBlackTickets.length, revenue: monitorBlackVol, price: config.carPrices?.black || config.ticketPrice || 100, fill: '#f59e0b' },
    { name: 'YELLOW CAR', tickets: monitorYellowTickets.length, revenue: monitorYellowVol, price: config.carPrices?.yellow || config.ticketPrice || 100, fill: '#eab308' }
  ];

  // Audit Tab Filtered Tickets
  const auditFilteredTickets = supercarTickets.filter((t) => {
    if (ticketSlotFilter !== 'all') {
      const timeLabel = getSlotTimeLabel(ticketSlotFilter as number);
      const matchesSlot = t.drawTime?.toString().includes(timeLabel) || t.drawTitle?.includes(timeLabel) || t.drawTitle?.includes(`Slot #${String(ticketSlotFilter).padStart(2, '0')}`);
      if (!matchesSlot) return false;
    }

    if (ticketStatusFilter !== 'all') {
      if (ticketStatusFilter === 'active' && t.status !== 'active' && t.status !== 'pending') return false;
      if (ticketStatusFilter === 'win' && t.status !== 'win') return false;
      if (ticketStatusFilter === 'loss' && t.status !== 'loss') return false;
    }

    if (ticketCarFilter !== 'all') {
      const carChoice = (t.selectedCar || t.selectedNumbers?.[0] as string || '').toLowerCase();
      if (carChoice !== ticketCarFilter) return false;
    }

    if (ticketSearchTerm.trim()) {
      const term = ticketSearchTerm.toLowerCase();
      const uObj = usersMap[t.userId];
      const name = uObj?.name?.toLowerCase() || '';
      const phone = uObj?.phone || '';
      const tNum = (t.ticketNumber || t.id).toLowerCase();
      return name.includes(term) || phone.includes(term) || tNum.includes(term) || t.userId.toLowerCase().includes(term);
    }

    return true;
  });

  const totalAutoWonAmt = supercarTickets.filter((t) => t.status === 'win').reduce((sum, t) => sum + (t.wonAmount || 0), 0);
  const totalAutoWonCount = supercarTickets.filter((t) => t.status === 'win').length;
  const totalAutoLostCount = supercarTickets.filter((t) => t.status === 'loss').length;
  const totalPendingCount = supercarTickets.filter((t) => t.status === 'active' || t.status === 'pending').length;

  const carsList: SuperCarColor[] = ['red', 'black', 'yellow'];

  return (
    <div className="space-y-6 font-mono">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-amber-950/60 to-slate-950 rounded-3xl border border-amber-500/30 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">3 Super Car Admin Control Hub</h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold uppercase animate-pulse">
                REALTIME FIREBASE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live Sales Recharts Monitor • 29 Daily Slot Winner Reveals • User Ticket Payout Audit • HD Image Uploads
            </p>
          </div>
        </div>

        {/* Global Game Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundFx.playClick();
              onUpdateConfig({ enabled: !config.enabled });
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-lg ${
              config.enabled
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 hover:bg-emerald-400'
                : 'bg-rose-950 border border-rose-500/50 text-rose-300 hover:bg-rose-900'
            }`}
          >
            {config.enabled ? '🟢 GAME ACTIVE (PLAYERS CAN BET)' : '🔴 GAME DISABLED (LOCKED)'}
          </button>
        </div>
      </div>

      {/* Top Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
        {[
          { id: 'monitor', label: '📊 Live Sales Monitor (Recharts)', icon: TrendingUp },
          { id: 'draws', label: '🏆 Daily Draw Results (29 Slots)', icon: Lock },
          { id: 'tickets', label: '👤 User Ticket Audit & Settlement', icon: Users },
          { id: 'images', label: '⚙️ HD Car Images & Pricing Config', icon: ImageIcon }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { soundFx.playClick(); setActiveSubTab(tab.id as any); }}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Status Notification Banner */}
      {statusMessage && (
        <div className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 shadow-lg animate-in fade-in duration-200 ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
            : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
          <span className="font-bold">{statusMessage.text}</span>
        </div>
      )}

      {/* =========================================================
          SUB-TAB 1: 3 SUPER CAR LIVE SALES MONITOR (RECHARTS)
         ========================================================= */}
      {activeSubTab === 'monitor' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 bg-slate-900 border border-amber-500/30 rounded-3xl">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  <span>3 SUPER CAR LIVE SALES MONITOR</span>
                </h3>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase">
                  📈 REAL-TIME RECHARTS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Live Ticket Distribution & Revenue Breakdown per slot</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-rose-500/20 text-rose-300 text-xs font-black px-3 py-1.5 rounded-xl border border-rose-500/30">
                🔥 LEADER: {leaderColor}
              </span>

              <select
                value={selectedMonitorSlot}
                onChange={(e) => setSelectedMonitorSlot(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 text-amber-300 font-black text-xs rounded-xl px-3 py-2 outline-none cursor-pointer"
              >
                <option value="all">All 29 Daily Slots</option>
                {Array.from({ length: 29 }, (_, i) => {
                  const sNum = i + 1;
                  return (
                    <option key={sNum} value={sNum}>
                      Slot #{String(sNum).padStart(2, '0')} ({getSlotTimeLabel(sNum)})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* 4 Metric KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-black block">SLOT WINDOW</span>
              <span className="text-lg font-black text-white block mt-1">
                {selectedMonitorSlot === 'all' ? '08:00 AM - 10:00 PM' : getSlotTimeLabel(selectedMonitorSlot as number)}
              </span>
              <span className="text-[10px] text-amber-400 block mt-0.5">
                {selectedMonitorSlot === 'all' ? '29 Daily Slots' : `Slot #${String(selectedMonitorSlot).padStart(2, '0')}`}
              </span>
            </div>

            <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-black block">TOTAL TICKETS SOLD</span>
              <span className="text-xl font-black text-white block mt-1">{monitorTotalCount} Tickets</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Live Firestore Feed</span>
            </div>

            <div className="p-4 bg-slate-900 rounded-3xl border border-emerald-900/40">
              <span className="text-[10px] text-emerald-400 uppercase font-black block">TOTAL REVENUE</span>
              <span className="text-xl font-black text-emerald-300 block mt-1">₹{monitorTotalRev.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Gross Sales Volume</span>
            </div>

            <div className="p-4 bg-gradient-to-br from-slate-900 to-amber-950/40 rounded-3xl border border-amber-500/40">
              <span className="text-[10px] text-amber-400 uppercase font-black block">LEADING SHARE</span>
              <span className="text-xl font-black text-amber-300 block mt-1">{leadingShare}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Held by {leaderColor}</span>
            </div>
          </div>

          {/* Recharts Bar Chart Container */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-400" />
                <span>REAL-TIME TICKET DISTRIBUTION BAR CHART (RECHARTS)</span>
              </h4>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded border border-amber-500/20 uppercase font-bold">
                {selectedMonitorSlot === 'all' ? 'ALL SLOTS ACTIVE' : `SLOT #${selectedMonitorSlot} ACTIVE`}
              </span>
            </div>

            {/* Recharts Component */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rechartsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-amber-500/40 p-3 rounded-xl shadow-2xl font-mono text-xs">
                            <p className="font-black text-amber-400 uppercase">{data.name}</p>
                            <p className="text-white mt-1">Tickets Sold: <strong className="text-amber-300">{data.tickets}</strong> ({monitorTotalCount > 0 ? Math.round((data.tickets / monitorTotalCount) * 100) : 0}%)</p>
                            <p className="text-white">Revenue: <strong className="text-emerald-400">₹{data.revenue.toLocaleString('en-IN')}</strong></p>
                            <p className="text-slate-400 text-[10px]">Price per ticket: ₹{data.price}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="tickets" radius={[8, 8, 0, 0]}>
                    {rechartsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Color Breakdown Sub-Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-rose-500/30">
                <span className="text-xs font-black text-rose-400 uppercase">Red Supercar</span>
                <div className="text-lg font-black text-white mt-1">{monitorRedTickets.length} Tickets</div>
                <div className="text-xs text-emerald-400 font-bold">₹{monitorRedVol.toLocaleString('en-IN')}</div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-amber-500/30">
                <span className="text-xs font-black text-amber-400 uppercase">Black Supercar</span>
                <div className="text-lg font-black text-white mt-1">{monitorBlackTickets.length} Tickets</div>
                <div className="text-xs text-emerald-400 font-bold">₹{monitorBlackVol.toLocaleString('en-IN')}</div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-yellow-500/30">
                <span className="text-xs font-black text-yellow-400 uppercase">Yellow Supercar</span>
                <div className="text-lg font-black text-white mt-1">{monitorYellowTickets.length} Tickets</div>
                <div className="text-xs text-emerald-400 font-bold">₹{monitorYellowVol.toLocaleString('en-IN')}</div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* =========================================================
          SUB-TAB 2: 🏆 3 SUPER CAR DAILY DRAW RESULTS (29 SLOTS)
         ========================================================= */}
      {activeSubTab === 'draws' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-3xl">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>3 Super Car Daily Draw Results</span>
                </h3>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase">
                  🕒 29 DAILY SLOTS (08:00 AM - 10:00 PM)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Real-time slot results, winner history, and ticket entries for all 29 daily draws.</p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Slot # (1-29), Time, or RED/BLACK/YELLOW..."
                  value={drawsSearchTerm}
                  onChange={(e) => setDrawsSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl pl-9 pr-3 py-2 outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setDrawsViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${drawsViewMode === 'grid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDrawsViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${drawsViewMode === 'table' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  title="Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 29 Slot Grid / Table */}
          {drawsViewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 29 }, (_, i) => {
                const slotNum = i + 1;
                const timeLabel = getSlotTimeLabel(slotNum);

                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const dateStr = `${year}${month}${day}`;
                const issueId = `CAR-${dateStr}-${String(slotNum).padStart(2, '0')}`;

                const drawData = drawsMap[issueId];
                const winningColor: SuperCarColor | undefined = drawData?.winningCar || config.manualSlotWinners?.[slotNum];
                const isCompleted = Boolean(winningColor) || drawData?.status === 'completed';

                // Slot Tickets
                const slotTickets = supercarTickets.filter(
                  (t) => t.drawTime?.toString().includes(timeLabel) || t.drawTitle?.includes(timeLabel) || t.drawTitle?.includes(`Slot #${String(slotNum).padStart(2, '0')}`)
                );

                if (drawsSearchTerm.trim()) {
                  const term = drawsSearchTerm.toLowerCase();
                  const matchesTerm =
                    `slot #${slotNum}`.includes(term) ||
                    timeLabel.toLowerCase().includes(term) ||
                    (winningColor && winningColor.includes(term));
                  if (!matchesTerm) return null;
                }

                return (
                  <div key={slotNum} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-xl hover:border-amber-500/40 transition-all flex flex-col justify-between">
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-400 font-mono">Slot #{String(slotNum).padStart(2, '0')}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                        }`}>
                          {isCompleted ? 'COMPLETED' : 'LIVE / OPEN'}
                        </span>
                      </div>

                      {/* Time & Sync Health */}
                      <div className="mt-2 space-y-0.5">
                        <span className="text-lg font-black text-white block">{timeLabel}</span>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>COUNTDOWN: {isCompleted ? 'COMPLETED' : 'ACTIVE'}</span>
                          <span className="text-emerald-400 font-bold">+0ms Sync</span>
                        </div>
                      </div>

                      {/* Result Box */}
                      <div className="mt-3 p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">WINNING RESULT</span>
                        {winningColor ? (
                          <span className={`text-xs font-black uppercase px-3 py-1 rounded-xl border block ${
                            winningColor === 'red' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : winningColor === 'black' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                          }`}>
                            🏆 REVEALED: {winningColor.toUpperCase()} CAR
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-500 block">PENDING RESULT REVEAL</span>
                        )}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{slotTickets.length} tickets placed</span>
                        <span className="text-amber-400 font-bold">Status: {isCompleted ? 'Closed' : 'Open'}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        <button
                          onClick={() => handlePublishSlotWinner(slotNum, 'red')}
                          className="py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[10px] font-black rounded-xl transition-all cursor-pointer"
                        >
                          RED
                        </button>
                        <button
                          onClick={() => handlePublishSlotWinner(slotNum, 'black')}
                          className="py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-black rounded-xl transition-all cursor-pointer"
                        >
                          BLACK
                        </button>
                        <button
                          onClick={() => handlePublishSlotWinner(slotNum, 'yellow')}
                          className="py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 text-[10px] font-black rounded-xl transition-all cursor-pointer"
                        >
                          YELLOW
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="p-3">Slot #</th>
                    <th className="p-3">Time Window</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Winning Result</th>
                    <th className="p-3">Tickets Sold</th>
                    <th className="p-3 text-right">Quick Declare Winner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Array.from({ length: 29 }, (_, i) => {
                    const slotNum = i + 1;
                    const timeLabel = getSlotTimeLabel(slotNum);
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const dateStr = `${year}${month}${day}`;
                    const issueId = `CAR-${dateStr}-${String(slotNum).padStart(2, '0')}`;
                    const drawData = drawsMap[issueId];
                    const winningColor: SuperCarColor | undefined = drawData?.winningCar || config.manualSlotWinners?.[slotNum];
                    const isCompleted = Boolean(winningColor) || drawData?.status === 'completed';

                    const slotTickets = supercarTickets.filter(
                      (t) => t.drawTime?.toString().includes(timeLabel) || t.drawTitle?.includes(timeLabel) || t.drawTitle?.includes(`Slot #${String(slotNum).padStart(2, '0')}`)
                    );

                    return (
                      <tr key={slotNum} className="hover:bg-slate-950/50">
                        <td className="p-3 font-black text-amber-400">Slot #{String(slotNum).padStart(2, '0')}</td>
                        <td className="p-3 font-bold text-white">{timeLabel}</td>
                        <td className="p-3">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${isCompleted ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                            {isCompleted ? 'Completed' : 'Active'}
                          </span>
                        </td>
                        <td className="p-3">
                          {winningColor ? (
                            <span className="font-black text-amber-300 uppercase">🏆 {winningColor} CAR</span>
                          ) : (
                            <span className="text-slate-500">Pending</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-white">{slotTickets.length} tickets</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handlePublishSlotWinner(slotNum, 'red')} className="px-2 py-1 bg-rose-500/20 text-rose-300 rounded hover:bg-rose-500/30 text-[10px] font-bold">Red</button>
                            <button onClick={() => handlePublishSlotWinner(slotNum, 'black')} className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded hover:bg-amber-500/30 text-[10px] font-bold">Black</button>
                            <button onClick={() => handlePublishSlotWinner(slotNum, 'yellow')} className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded hover:bg-yellow-500/30 text-[10px] font-bold">Yellow</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* =========================================================
          SUB-TAB 3: 👤 USER TICKET AUDIT & MANUAL WIN / LOSE
         ========================================================= */}
      {activeSubTab === 'tickets' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header & Title */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-3xl">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>User Ticket Purchase History & Manual Settlement</span>
                </h3>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase">
                  👤 USER TICKET AUDIT & MANUAL WIN / LOSE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">View all user ticket purchases, track winning auto-payouts, or manually force Win/Lose outcomes for individual user tickets.</p>
            </div>
          </div>

          {/* 4 Summary Badges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-black block">TOTAL TICKETS SOLD</span>
              <span className="text-xl font-black text-white block mt-1">{supercarTickets.length} Tickets</span>
            </div>

            <div className="p-4 bg-slate-900 rounded-3xl border border-emerald-900/40">
              <span className="text-[10px] text-emerald-400 uppercase font-black block">🟢 AUTO-WON ({totalAutoWonCount})</span>
              <span className="text-xl font-black text-emerald-300 block mt-1">₹{totalAutoWonAmt.toLocaleString('en-IN')}</span>
            </div>

            <div className="p-4 bg-slate-900 rounded-3xl border border-rose-900/40">
              <span className="text-[10px] text-rose-400 uppercase font-black block">🔴 AUTO-LOST ({totalAutoLostCount})</span>
              <span className="text-xl font-black text-rose-300 block mt-1">₹0 (No Refund)</span>
            </div>

            <div className="p-4 bg-slate-900 rounded-3xl border border-amber-900/40">
              <span className="text-[10px] text-amber-400 uppercase font-black block">⌛ ACTIVE PENDING ({totalPendingCount})</span>
              <span className="text-xl font-black text-amber-300 block mt-1">
                ₹{supercarTickets.filter(t => t.status === 'active' || t.status === 'pending').reduce((sum, t) => sum + (t.price || 0), 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Automatic Settlement Engine Rule Banner */}
          <div className="p-3.5 bg-slate-950 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-xs text-amber-300">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              <strong>⚡ AUTOMATIC WIN/LOSS SETTLEMENT ENGINE ACTIVE:</strong> If result matches player car choice -&gt; Auto Wallet Credit | If result differs -&gt; Loss Logged (No Refund)
            </span>
          </div>

          {/* Multi-Filters Bar */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user name, phone, or ticket #..."
                value={ticketSearchTerm}
                onChange={(e) => setTicketSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl pl-9 pr-3 py-2 outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={ticketSlotFilter}
                onChange={(e) => setTicketSlotFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 text-amber-300 font-bold text-xs rounded-xl px-2.5 py-2 outline-none"
              >
                <option value="all">All Slots (1 to 29)</option>
                {Array.from({ length: 29 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Slot #{String(i + 1).padStart(2, '0')}</option>
                ))}
              </select>

              <select
                value={ticketStatusFilter}
                onChange={(e) => setTicketStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-amber-300 font-bold text-xs rounded-xl px-2.5 py-2 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Pending</option>
                <option value="win">Won Tickets</option>
                <option value="loss">Lost Tickets</option>
              </select>

              <select
                value={ticketCarFilter}
                onChange={(e) => setTicketCarFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-amber-300 font-bold text-xs rounded-xl px-2.5 py-2 outline-none"
              >
                <option value="all">All Car Types</option>
                <option value="red">Red Only</option>
                <option value="black">Black Only</option>
                <option value="yellow">Yellow Only</option>
              </select>
            </div>
          </div>

          {/* Interactive Tickets Table */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
            {auditFilteredTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-bold">
                No tickets match the selected filter criteria.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {auditFilteredTickets
                    .slice((ticketPage - 1) * ticketPageSize, ticketPage * ticketPageSize)
                    .map((ticket) => {
                      const uObj = usersMap[ticket.userId];
                      const name = (ticket as any).userName || uObj?.name || 'BETGURU Player';
                      const phone = (ticket as any).userPhone || uObj?.phone || 'N/A';
                      const carChoice = (ticket.selectedCar || ticket.selectedNumbers?.[0] as string || 'red').toLowerCase() as SuperCarColor;
                      const isSettling = settlingTicketId === ticket.id;

                      return (
                        <div key={ticket.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg hover:border-amber-500/40 transition-all">
                          {/* Ticket Info */}
                          <div className="space-y-1 font-mono">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black text-amber-400">#{ticket.ticketNumber || ticket.id}</span>
                              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                                carChoice === 'red' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : carChoice === 'black' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                              }`}>
                                {carChoice.toUpperCase()} CAR
                              </span>
                              <span className="text-xs font-bold text-white">• {ticket.drawTitle || '3 Super Car Draw'}</span>
                            </div>

                            <p className="text-xs text-slate-300">
                              Player: <strong className="text-white">{name}</strong> ({phone}) | UID: <span className="text-amber-300">{ticket.userId}</span>
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Purchased At: {ticket.purchaseDate || 'N/A'} | Ticket Price: <span className="text-emerald-400 font-bold">₹{ticket.price}</span>
                            </p>
                          </div>

                          {/* Right Controls: Status & Win / Lose Buttons */}
                          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                            <div className="text-left md:text-right">
                              <span className="text-[9px] text-slate-400 uppercase block">Current Status</span>
                              <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border block ${
                                ticket.status === 'win'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : ticket.status === 'loss'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              }`}>
                                {ticket.status === 'win' ? `WON ₹${(ticket.wonAmount || 0).toLocaleString('en-IN')}` : ticket.status}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                disabled={isSettling}
                                onClick={() => handleManualSettleTicket(ticket, 'win')}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>✓ WIN</span>
                              </button>

                              <button
                                disabled={isSettling}
                                onClick={() => handleManualSettleTicket(ticket, 'loss')}
                                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-black text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>⊘ LOSE</span>
                              </button>

                              <button
                                disabled={isSettling}
                                onClick={() => handleManualSettleTicket(ticket, 'active')}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                                title="Reset status to active"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                </div>

                <PaginationBar
                  currentPage={ticketPage}
                  totalPages={Math.ceil(auditFilteredTickets.length / ticketPageSize) || 1}
                  pageSize={ticketPageSize}
                  totalItems={auditFilteredTickets.length}
                  onPageChange={(page) => setTicketPage(page)}
                  onPageSizeChange={(size) => {
                    setTicketPageSize(size);
                    setTicketPage(1);
                  }}
                  pageSizeOptions={[10, 20, 50, 100]}
                  label="purchased user tickets"
                />
              </>
            )}
          </div>

        </div>
      )}

      {/* =========================================================
          SUB-TAB 4: ⚙️ HD CAR IMAGES & PRICING CONFIG
         ========================================================= */}
      {activeSubTab === 'images' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* SECTION 1: SUPER CAR IMAGE MANAGER */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-black text-amber-400 font-mono uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Super Car HD Image Manager (Red, Black, Yellow)</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Max 15MB • Client WebP Compression</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {carsList.map((carKey) => {
                const carInfo = getSuperCarInfo(carKey, config);
                const isCustom = Boolean(config.carImages?.[carKey]);
                const isUploading = uploadingCar === carKey;
                const price = config.carPrices?.[carKey] || config.ticketPrice || 100;
                const multiplier = config.carMultipliers?.[carKey] || config.prizeMultiplier || 2.8;

                return (
                  <div key={carKey} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black font-mono text-white uppercase">{carInfo.name}</span>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${
                          carKey === 'red' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : carKey === 'black' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                        }`}>
                          {carKey}
                        </span>
                      </div>

                      <div className="relative h-36 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group">
                        <img src={carInfo.image} alt={carInfo.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent"></div>

                        {isCustom && (
                          <span className="absolute top-2 left-2 text-[9px] font-mono font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                            CUSTOM IMAGE
                          </span>
                        )}

                        {isUploading && (
                          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-3 space-y-2">
                            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                            <span className="text-xs font-mono font-bold text-amber-300">Uploading {uploadProgress}%</span>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 font-mono">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 font-bold block">Ticket Price (₹)</label>
                          <input
                            type="number"
                            value={price}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 100;
                              onUpdateConfig({ carPrices: { ...config.carPrices, [carKey]: val } });
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-amber-300 font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 font-bold block">Multiplier (x)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={multiplier}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 2.8;
                              onUpdateConfig({ carMultipliers: { ...config.carMultipliers, [carKey]: val } });
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-emerald-400 font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-900 font-mono">
                      <div className="flex gap-2">
                        <label className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isCustom ? 'Replace Image' : 'Upload Image'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(carKey, file);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>

                        {isCustom && (
                          <button
                            onClick={() => handleRemoveImage(carKey)}
                            className="p-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-300 cursor-pointer transition-all"
                            title="Reset image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex gap-1.5 items-center pt-1">
                        <input
                          type="text"
                          value={
                            urlInputs[carKey] !== undefined
                              ? urlInputs[carKey]
                              : config.carImages?.[carKey]?.startsWith('data:')
                              ? ''
                              : config.carImages?.[carKey] || ''
                          }
                          placeholder={
                            config.carImages?.[carKey]?.startsWith('data:')
                              ? 'Uploaded File (Paste new image URL...)'
                              : 'Or paste HD Image URL...'
                          }
                          onChange={(e) => setUrlInputs({ ...urlInputs, [carKey]: e.target.value })}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[10px] text-slate-300 font-mono focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const val = urlInputs[carKey]?.trim();
                            if (val) {
                              await onUpdateConfig({ carImages: { ...(config.carImages || {}), [carKey]: val } });
                              setUrlInputs({ ...urlInputs, [carKey]: '' });
                              setStatusMessage({ type: 'success', text: `Updated ${carKey.toUpperCase()} image URL!` });
                            }
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 border border-slate-700 rounded-xl text-[10px] font-bold font-mono transition-all shrink-0"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: LOCK SLOTS OVERRIDE */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>29 Daily Slots Manual Slot Locking Engine</span>
              </h4>
              <span className="text-[10px] text-slate-400">Lock specific slots to prevent user bets</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {Array.from({ length: 29 }, (_, i) => {
                const slotNum = i + 1;
                const timeLabel = getSlotTimeLabel(slotNum);
                const lockedSlots = config.lockedSlots || [];
                const isLocked = lockedSlots.includes(slotNum);

                return (
                  <div key={slotNum} className="p-2.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 text-center">
                    <span className="text-[10px] font-bold text-amber-300 block">Slot #{String(slotNum).padStart(2, '0')}</span>
                    <span className="text-xs font-black text-white block">{timeLabel}</span>
                    <button
                      onClick={() => {
                        soundFx.playClick();
                        const newLocked = isLocked ? lockedSlots.filter((s) => s !== slotNum) : [...lockedSlots, slotNum];
                        onUpdateConfig({ lockedSlots: newLocked });
                      }}
                      className={`w-full py-1 rounded text-[9px] font-black transition-all cursor-pointer ${
                        isLocked ? 'bg-rose-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isLocked ? 'LOCKED' : 'LOCK SLOT'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

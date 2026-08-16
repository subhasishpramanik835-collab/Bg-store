import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, X, Volume2, VolumeX, Sparkles, RefreshCw, Trophy, 
  RotateCcw, Zap, DollarSign, ChevronRight, ShieldCheck, Play, HelpCircle,
  History, BarChart2, CheckCircle2
} from 'lucide-react';
import { User, WalletTransaction, RouletteConfig } from '../types';
import { soundFx } from '../utils/audio';
import { logAnalyticsEvent } from '../utils/analytics';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import confetti from 'canvas-confetti';

interface LiveRouletteProps {
  user: User;
  onUpdateBalance: (newBalance: number) => void;
  onAddTransaction: (tx: WalletTransaction) => void;
  onClose: () => void;
  onOpenDeposit: () => void;
}

export interface RoundHistoryItem {
  id: string;
  roundId: string;
  number: number;
  color: 'green' | 'red' | 'black';
  parity: 'even' | 'odd' | 'zero';
  range: '1-18' | '19-36' | 'zero';
  dozen: '1st 12' | '2nd 12' | '3rd 12' | 'zero';
  column: 'Col 1' | 'Col 2' | 'Col 3' | 'zero';
  timestamp: string;
}

// European Roulette Numbers in Clockwise Order
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

const CHIP_VALUES = [10, 50, 100, 500, 1000, 5000];

type BetType = 
  | { kind: 'number'; value: number }
  | { kind: 'color'; value: 'red' | 'black' }
  | { kind: 'parity'; value: 'even' | 'odd' }
  | { kind: 'range'; value: '1-18' | '19-36' }
  | { kind: 'dozen'; value: '1st12' | '2nd12' | '3rd12' }
  | { kind: 'column'; value: 'col1' | 'col2' | 'col3' };

interface PlacedBet {
  id: string;
  type: BetType;
  label: string;
  amount: number;
}

export const LiveRoulette: React.FC<LiveRouletteProps> = ({
  user,
  onUpdateBalance,
  onAddTransaction,
  onClose,
  onOpenDeposit
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(100);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [lastBets, setLastBets] = useState<PlacedBet[]>([]);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [gamePhase, setGamePhase] = useState<'betting' | 'spinning' | 'settled'>('betting');
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [isResultRevealed, setIsResultRevealed] = useState<boolean>(false);
  const [recentHistory, setRecentHistory] = useState<number[]>([17, 32, 0, 5, 22, 14, 29, 8, 36, 21]);
  const [fullHistory, setFullHistory] = useState<RoundHistoryItem[]>([
    { id: '1', roundId: 'BG-RL-395560', number: 17, color: 'black', parity: 'odd', range: '1-18', dozen: '2nd 12', column: 'Col 2', timestamp: '12:04:12' },
    { id: '2', roundId: 'BG-RL-395559', number: 32, color: 'red', parity: 'even', range: '19-36', dozen: '3rd 12', column: 'Col 2', timestamp: '12:03:46' },
    { id: '3', roundId: 'BG-RL-395558', number: 0, color: 'green', parity: 'zero', range: 'zero', dozen: 'zero', column: 'zero', timestamp: '12:03:20' },
    { id: '4', roundId: 'BG-RL-395557', number: 5, color: 'red', parity: 'odd', range: '1-18', dozen: '1st 12', column: 'Col 2', timestamp: '12:02:54' },
    { id: '5', roundId: 'BG-RL-395556', number: 22, color: 'black', parity: 'even', range: '19-36', dozen: '2nd 12', column: 'Col 1', timestamp: '12:02:28' },
    { id: '6', roundId: 'BG-RL-395555', number: 14, color: 'red', parity: 'even', range: '1-18', dozen: '2nd 12', column: 'Col 2', timestamp: '12:02:02' },
    { id: '7', roundId: 'BG-RL-395554', number: 29, color: 'black', parity: 'odd', range: '19-36', dozen: '3rd 12', column: 'Col 2', timestamp: '12:01:36' },
    { id: '8', roundId: 'BG-RL-395553', number: 8, color: 'black', parity: 'even', range: '1-18', dozen: '1st 12', column: 'Col 2', timestamp: '12:01:10' },
    { id: '9', roundId: 'BG-RL-395552', number: 36, color: 'red', parity: 'even', range: '19-36', dozen: '3rd 12', column: 'Col 3', timestamp: '12:00:44' },
    { id: '10', roundId: 'BG-RL-395551', number: 21, color: 'red', parity: 'odd', range: '19-36', dozen: '2nd 12', column: 'Col 3', timestamp: '12:00:18' },
  ]);
  const [showHistoryOverlay, setShowHistoryOverlay] = useState<boolean>(false);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [roundId, setRoundId] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(20);
  const [betsLocked, setBetsLocked] = useState<boolean>(false);
  
  // Real-time Roulette Configuration from Admin
  const [rouletteConfig, setRouletteConfig] = useState<RouletteConfig>(() => {
    try {
      const cached = localStorage.getItem('bg_roulette_config');
      if (cached) {
        return {
          rtpPercentage: 97.3,
          houseEdgePercentage: 2.7,
          rtpMode: 'european_standard',
          manualNextNumber: 17,
          manualNextNumberActive: false,
          minBet: 10,
          maxBet: 50000,
          isRouletteEnabled: true,
          ...JSON.parse(cached)
        };
      }
    } catch (e) {
      console.warn('Failed to parse cached roulette config in LiveRoulette:', e);
    }
    return {
      rtpPercentage: 97.3,
      houseEdgePercentage: 2.7,
      rtpMode: 'european_standard',
      manualNextNumber: 17,
      manualNextNumberActive: false,
      minBet: 10,
      maxBet: 50000,
      isRouletteEnabled: true
    };
  });
  const rouletteConfigRef = useRef<RouletteConfig>(rouletteConfig);
  rouletteConfigRef.current = rouletteConfig;

  useEffect(() => {
    // 1. Listen to Firestore collection `game_settings` (primary real-time source)
    const unsubGameSettings = onSnapshot(doc(db, 'game_settings', 'roulette'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setRouletteConfig((prev) => {
          const next: RouletteConfig = {
            ...prev,
            rtpPercentage: typeof data.rtpPercentage === 'number' ? data.rtpPercentage : prev.rtpPercentage,
            houseEdgePercentage: typeof data.houseEdgePercentage === 'number' ? data.houseEdgePercentage : prev.houseEdgePercentage,
            rtpMode: data.rtpMode === 'fair_rng' ? 'european_standard' : data.rtpMode === 'house_protect' ? 'house_protection' : (data.rtpMode || prev.rtpMode),
            isRouletteEnabled: data.isEnabled !== undefined ? data.isEnabled : prev.isRouletteEnabled,
            minBet: data.minBet !== undefined ? data.minBet : prev.minBet,
            maxBet: data.maxBet !== undefined ? data.maxBet : prev.maxBet,
          };
          try {
            localStorage.setItem('bg_roulette_config', JSON.stringify(next));
          } catch (e) {}
          return next;
        });
      }
    }, (err) => console.warn('LiveRoulette game_settings sync error:', err.message));

    // 2. Legacy fallback listener
    const unsub = onSnapshot(doc(db, 'roulette_config', 'main'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<RouletteConfig>;
        setRouletteConfig((prev) => {
          const next = {
            ...prev,
            ...data
          };
          try {
            localStorage.setItem('bg_roulette_config', JSON.stringify(next));
          } catch (e) {}
          return next;
        });
      }
    }, (err) => console.warn('LiveRoulette config sync error:', err.message));

    // 3. Listen to instant local window event
    const handleLocalConfigChange = (e: any) => {
      if (e.detail) {
        setRouletteConfig((prev) => ({
          ...prev,
          ...e.detail
        }));
      }
    };
    window.addEventListener('bg_roulette_config_change', handleLocalConfigChange);

    // 4. Listen to storage changes across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bg_roulette_config' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setRouletteConfig((prev) => ({ ...prev, ...parsed }));
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubGameSettings();
      unsub();
      window.removeEventListener('bg_roulette_config_change', handleLocalConfigChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Wheel Animation States
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [ballAngle, setBallAngle] = useState<number>(0);
  const [ballRadius, setBallRadius] = useState<number>(105); // px from center in SVG units
  const [showResultOverlay, setShowResultOverlay] = useState<boolean>(false);

  const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);

  // Synchronized 24/7 Round Cycle Engine (20s betting + 6s spin/settle = 26s cycle)
  const CYCLE_DURATION = 26;
  const BETTING_DURATION = 20;

  const currentRoundSeedRef = useRef<number>(0);
  const hasSpunCurrentRoundRef = useRef<boolean>(false);
  const betsRef = useRef<PlacedBet[]>([]);
  betsRef.current = bets;

  const userBalanceRef = useRef<number>(user.balance);
  userBalanceRef.current = user.balance;

  // Voice Croupier helper
  const announceVoice = (text: string) => {
    if (isMuted) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Speech synthesis error', e);
    }
  };

  // Synchronized Deterministic Random Number Generator for anti-cheat & multi-user sync
  const getSyncedWinNumber = (roundSeed: number): number => {
    const x = Math.sin(roundSeed * 9999 + 12345) * 10000;
    const rand = Math.abs(x - Math.floor(x));
    return WHEEL_NUMBERS[Math.floor(rand * WHEEL_NUMBERS.length)];
  };

  // Helper to calculate total payout for a candidate pocket based on current placed bets
  const calculateCandidatePayout = (candidateNum: number, placedBets: PlacedBet[]): number => {
    const color = getNumberColor(candidateNum);
    const isEven = candidateNum !== 0 && candidateNum % 2 === 0;
    const isOdd = candidateNum !== 0 && candidateNum % 2 !== 0;
    let totalWin = 0;
    placedBets.forEach((bet) => {
      if (bet.type.kind === 'number' && bet.type.value === candidateNum) {
        totalWin += bet.amount * 36;
      } else if (bet.type.kind === 'color' && bet.type.value === color) {
        totalWin += bet.amount * 2;
      } else if (bet.type.kind === 'parity') {
        if ((bet.type.value === 'even' && isEven) || (bet.type.value === 'odd' && isOdd)) {
          totalWin += bet.amount * 2;
        }
      } else if (bet.type.kind === 'range') {
        if (
          (bet.type.value === '1-18' && candidateNum >= 1 && candidateNum <= 18) ||
          (bet.type.value === '19-36' && candidateNum >= 19 && candidateNum <= 36)
        ) {
          totalWin += bet.amount * 2;
        }
      } else if (bet.type.kind === 'dozen') {
        if (
          (bet.type.value === '1st12' && candidateNum >= 1 && candidateNum <= 12) ||
          (bet.type.value === '2nd12' && candidateNum >= 13 && candidateNum <= 24) ||
          (bet.type.value === '3rd12' && candidateNum >= 25 && candidateNum <= 36)
        ) {
          totalWin += bet.amount * 3;
        }
      } else if (bet.type.kind === 'column') {
        if (
          (bet.type.value === 'col1' && candidateNum > 0 && candidateNum % 3 === 1) ||
          (bet.type.value === 'col2' && candidateNum > 0 && candidateNum % 3 === 2) ||
          (bet.type.value === 'col3' && candidateNum > 0 && candidateNum % 3 === 0)
        ) {
          totalWin += bet.amount * 3;
        }
      }
    });
    return totalWin;
  };

  // Outcome resolution engine obeying Admin RTP, House Edge, or Manual Target
  const getResolvedWinNumber = (roundSeed: number, placedBets: PlacedBet[]): number => {
    const currentCfg = rouletteConfigRef.current;

    // 1. Manual Next Number Override (Explicit Admin target pocket)
    if (
      currentCfg.manualNextNumberActive && 
      typeof currentCfg.manualNextNumber === 'number' && 
      currentCfg.manualNextNumber >= 0 && 
      currentCfg.manualNextNumber <= 36
    ) {
      return currentCfg.manualNextNumber;
    }

    const naturalNum = getSyncedWinNumber(roundSeed);
    const totalBet = placedBets.reduce((s, b) => s + b.amount, 0);

    // If player placed no bets in this round, return natural physical pocket
    if (totalBet === 0 || placedBets.length === 0) {
      return naturalNum;
    }

    // 2. Target RTP percentage (e.g. 0%, 10%, 20%, 50%, 75%, 97.3%)
    const targetRtp = typeof currentCfg.rtpPercentage === 'number' 
      ? Math.max(0, Math.min(100, currentCfg.rtpPercentage))
      : 97.3;

    // If target RTP is standard European (97.3%) and mode is european_standard, follow natural physics
    if (targetRtp >= 97.3 && currentCfg.rtpMode === 'european_standard') {
      return naturalNum;
    }

    // Calculate exact potential payout for all 37 pockets based on current bets
    const pocketPayouts = WHEEL_NUMBERS.map((num) => ({
      number: num,
      payout: calculateCandidatePayout(num, placedBets)
    }));

    const zeroPayoutPockets = pocketPayouts.filter((p) => p.payout === 0);
    const lowPayoutPockets = pocketPayouts.filter((p) => p.payout > 0 && p.payout < totalBet);
    const losingPockets = [...zeroPayoutPockets, ...lowPayoutPockets];
    const winningPockets = pocketPayouts.filter((p) => p.payout >= totalBet);

    // Roll random percentage (0.00 to 100.00)
    const roll = Math.random() * 100;

    // If roll >= targetRtp: House Edge retains the round (Player LOSES on their bet)
    if (roll >= targetRtp) {
      if (zeroPayoutPockets.length > 0) {
        // Pick one of the pockets where user wins ₹0
        const idx = Math.floor(Math.random() * zeroPayoutPockets.length);
        return zeroPayoutPockets[idx].number;
      } else if (losingPockets.length > 0) {
        const idx = Math.floor(Math.random() * losingPockets.length);
        return losingPockets[idx].number;
      } else {
        // If user covered the whole table, select the pocket with the absolute lowest payout
        const sorted = [...pocketPayouts].sort((a, b) => a.payout - b.payout);
        return sorted[0].number;
      }
    } else {
      // Within player RTP allowance (Player WINS)
      if (winningPockets.length > 0) {
        const idx = Math.floor(Math.random() * winningPockets.length);
        return winningPockets[idx].number;
      }
    }

    return naturalNum;
  };

  // 24/7 Global Time Loop Hook
  useEffect(() => {
    const interval = setInterval(() => {
      const nowSec = Math.floor(Date.now() / 1000);
      const cycleSec = nowSec % CYCLE_DURATION;
      const roundSeed = Math.floor(Date.now() / (CYCLE_DURATION * 1000));

      const newRoundId = `BG-RL-${(roundSeed % 900000) + 100000}`;
      setRoundId(newRoundId);

      if (cycleSec < BETTING_DURATION) {
        // Betting Phase (20s -> 0s)
        const rem = BETTING_DURATION - cycleSec;
        setCountdown(rem);
        setBetsLocked(false);
        setGamePhase('betting');
        setShowResultOverlay(false);
        setIsResultRevealed(false);

        if (hasSpunCurrentRoundRef.current && cycleSec === 0) {
          hasSpunCurrentRoundRef.current = false;
          setBets([]);
          announceVoice('Place your bets, please!');
        }

        // Ticking sounds during countdown
        soundFx.playCountdownTick();
      } else {
        // Spinning Phase (At 0s Countdown)
        setCountdown(0);
        setBetsLocked(true);

        if (!hasSpunCurrentRoundRef.current) {
          hasSpunCurrentRoundRef.current = true;
          currentRoundSeedRef.current = roundSeed;
          triggerAutoSpin(roundSeed);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const triggerAutoSpin = (roundSeed: number) => {
    setIsSpinning(true);
    setGamePhase('spinning');
    setShowResultOverlay(false);
    setIsResultRevealed(false);
    setWinningNumber(null);

    soundFx.playSpinWhoosh();
    soundFx.playClick();
    announceVoice('No more bets, thank you!');

    const currentPlacedBets = [...betsRef.current];
    const betTotal = currentPlacedBets.reduce((s, b) => s + b.amount, 0);

    // If player placed bets, deduct total bet from wallet
    let currentBal = userBalanceRef.current;
    if (betTotal > 0) {
      logAnalyticsEvent('game_start', { gameType: 'roulette', roundId, betTotal, betCount: currentPlacedBets.length }, user.id, user.email);
      currentBal = Math.max(0, currentBal - betTotal);
      onUpdateBalance(currentBal);
      onAddTransaction({
        id: `TX-BET-${Date.now()}`,
        userId: user.id,
        type: 'roulette_bet',
        amount: -betTotal,
        description: `Bets placed on Live Roulette Round #${roundId}`,
        status: 'completed',
        date: new Date().toLocaleString('en-IN'),
        createdAt: new Date().toISOString()
      });
      setLastBets(currentPlacedBets);
    }

    // Determine winning pocket according to Admin RTP & Resolution engine
    const targetWinNum = getResolvedWinNumber(roundSeed, currentPlacedBets);
    const targetPocketIndex = WHEEL_NUMBERS.indexOf(targetWinNum);
    const pocketDeg = 360 / 37;
    const pocketCenterOffset = pocketDeg / 2; // Center of pocket slice
    const targetPocketAngleOnWheel = targetPocketIndex * pocketDeg + pocketCenterOffset;

    const extraRotations = 5;
    const targetWheelRotation = wheelRotation + (360 * extraRotations) + (360 - (targetPocketAngleOnWheel % 360));

    const startTime = performance.now();
    const duration = 5000;
    const startWheelRot = wheelRotation;

    let bounceCount = 0;

    const animateFrame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentWheelRot = startWheelRot + (targetWheelRotation - startWheelRot) * easeOut;
      setWheelRotation(currentWheelRot);

      const ballSpins = 7 * (1 - easeOut);
      const currentBallAngle = (currentWheelRot + targetPocketAngleOnWheel + (ballSpins * 360)) % 360;
      setBallAngle(currentBallAngle);

      // Ball radius drop & bounce physics from outer track (132px) down to pocket center (105px)
      if (progress > 0.65) {
        const dropP = (progress - 0.65) / 0.35;
        const smoothDrop = Math.pow(dropP, 2);
        const bounce = Math.abs(Math.sin(dropP * Math.PI * 3.5)) * (1 - dropP) * 12;
        setBallRadius(132 - (27 * smoothDrop) + bounce);

        // Play ball bounce clicks on bounce peaks
        const currentBounce = Math.floor(dropP * 3.5);
        if (currentBounce > bounceCount) {
          bounceCount = currentBounce;
          soundFx.playBallClick();
        }
      } else {
        setBallRadius(132);
      }

      if (progress < 1) {
        requestAnimationFrame(animateFrame);
      } else {
        // Ball has landed inside winning pocket!
        setBallRadius(105);
        setWinningNumber(targetWinNum);
        setIsSpinning(false);
        soundFx.playCoin();

        // 1.5s Pause while ball rests silently in pocket BEFORE revealing result to UI!
        setTimeout(() => {
          setIsResultRevealed(true);
          setGamePhase('settled');
          setShowResultOverlay(true);

          const color = getNumberColor(targetWinNum);
          const parity = targetWinNum === 0 ? 'zero' : (targetWinNum % 2 === 0 ? 'even' : 'odd');
          const range = targetWinNum === 0 ? 'zero' : (targetWinNum <= 18 ? '1-18' : '19-36');
          const dozen = targetWinNum === 0 ? 'zero' : (targetWinNum <= 12 ? '1st 12' : targetWinNum <= 24 ? '2nd 12' : '3rd 12');
          const column = targetWinNum === 0 ? 'zero' : (targetWinNum % 3 === 1 ? 'Col 1' : targetWinNum % 3 === 2 ? 'Col 2' : 'Col 3');

          // Update recent history & full history log
          setRecentHistory(prev => [targetWinNum, ...prev.slice(0, 9)]);
          const newHistItem: RoundHistoryItem = {
            id: `${Date.now()}`,
            roundId,
            number: targetWinNum,
            color,
            parity,
            range,
            dozen,
            column,
            timestamp: new Date().toLocaleTimeString('en-IN')
          };
          setFullHistory(prev => [newHistItem, ...prev.slice(0, 19)]);

          // Evaluate winnings
          let totalWin = 0;
          const isEven = targetWinNum !== 0 && targetWinNum % 2 === 0;
          const isOdd = targetWinNum !== 0 && targetWinNum % 2 !== 0;

          currentPlacedBets.forEach((bet) => {
            if (bet.type.kind === 'number' && bet.type.value === targetWinNum) {
              totalWin += bet.amount * 36;
            } else if (bet.type.kind === 'color' && bet.type.value === color) {
              totalWin += bet.amount * 2;
            } else if (bet.type.kind === 'parity') {
              if ((bet.type.value === 'even' && isEven) || (bet.type.value === 'odd' && isOdd)) {
                totalWin += bet.amount * 2;
              }
            } else if (bet.type.kind === 'range') {
              if (
                (bet.type.value === '1-18' && targetWinNum >= 1 && targetWinNum <= 18) ||
                (bet.type.value === '19-36' && targetWinNum >= 19 && targetWinNum <= 36)
              ) {
                totalWin += bet.amount * 2;
              }
            } else if (bet.type.kind === 'dozen') {
              if (
                (bet.type.value === '1st12' && targetWinNum >= 1 && targetWinNum <= 12) ||
                (bet.type.value === '2nd12' && targetWinNum >= 13 && targetWinNum <= 24) ||
                (bet.type.value === '3rd12' && targetWinNum >= 25 && targetWinNum <= 36)
              ) {
                totalWin += bet.amount * 3;
              }
            } else if (bet.type.kind === 'column') {
              if (
                (bet.type.value === 'col1' && targetWinNum > 0 && targetWinNum % 3 === 1) ||
                (bet.type.value === 'col2' && targetWinNum > 0 && targetWinNum % 3 === 2) ||
                (bet.type.value === 'col3' && targetWinNum > 0 && targetWinNum % 3 === 0)
              ) {
                totalWin += bet.amount * 3;
              }
            }
          });

          const colorText = color === 'green' ? 'Zero Green' : `${color.toUpperCase()}`;
          const parityText = targetWinNum === 0 ? '' : `, ${isEven ? 'EVEN' : 'ODD'}`;

          if (totalWin > 0) {
            setLastWinAmount(totalWin);
            soundFx.playCheer();
            soundFx.playWinFanfare();
            confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });

            onUpdateBalance(currentBal + totalWin);
            onAddTransaction({
              id: `TX-WIN-${Date.now()}`,
              userId: user.id,
              type: 'roulette_win',
              amount: totalWin,
              description: `Won ₹${totalWin} on Live Roulette Round #${roundId} (Number ${targetWinNum})`,
              status: 'completed',
              date: new Date().toLocaleString('en-IN'),
              createdAt: new Date().toISOString()
            });

            announceVoice(`Winning number ${targetWinNum}, ${colorText}${parityText}! Congratulations, you won Rupees ${totalWin}!`);
          } else {
            announceVoice(`Winning number ${targetWinNum}, ${colorText}${parityText}.`);
          }
        }, 1500);
      }
    };

    requestAnimationFrame(animateFrame);
  };

  const getNumberColor = (num: number): 'green' | 'red' | 'black' => {
    if (num === 0) return 'green';
    return RED_NUMBERS.has(num) ? 'red' : 'black';
  };

  // Place a bet on a target
  const handlePlaceBet = (type: BetType, label: string) => {
    if (isSpinning || betsLocked || gamePhase !== 'betting') {
      soundFx.playClick();
      return;
    }

    if (rouletteConfig.isRouletteEnabled === false) {
      alert('The Live Roulette table is currently undergoing scheduled maintenance. Please try again shortly.');
      return;
    }

    if (totalBetAmount + selectedChip > (rouletteConfig.maxBet || 50000)) {
      alert(`Maximum bet limit per round is ₹${(rouletteConfig.maxBet || 50000).toLocaleString('en-IN')}.`);
      return;
    }

    if (user.balance < totalBetAmount + selectedChip) {
      soundFx.playClick();
      alert('Insufficient wallet balance! Please deposit funds to place this bet.');
      return;
    }

    soundFx.playCoin();

    const existingIndex = bets.findIndex(b => JSON.stringify(b.type) === JSON.stringify(type));
    if (existingIndex >= 0) {
      const updated = [...bets];
      updated[existingIndex].amount += selectedChip;
      setBets(updated);
    } else {
      const newBet: PlacedBet = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        label,
        amount: selectedChip
      };
      setBets([...bets, newBet]);
    }
  };

  const handleClearBets = () => {
    if (isSpinning || betsLocked) return;
    soundFx.playClick();
    setBets([]);
  };

  const handleDoubleBets = () => {
    if (isSpinning || betsLocked || bets.length === 0) return;
    const currentTotal = totalBetAmount;
    if (user.balance < currentTotal * 2) {
      alert('Insufficient balance to double current bets!');
      return;
    }
    soundFx.playCoin();
    setBets(bets.map(b => ({ ...b, amount: b.amount * 2 })));
  };

  const handleRepeatBets = () => {
    if (isSpinning || betsLocked || lastBets.length === 0) return;
    const lastTotal = lastBets.reduce((sum, b) => sum + b.amount, 0);
    if (user.balance < lastTotal) {
      alert('Insufficient balance to repeat last bets!');
      return;
    }
    soundFx.playCoin();
    setBets([...lastBets]);
  };

  // Helper to check if a bet exists on a spot
  const getBetAmountForSpot = (type: BetType) => {
    const bet = bets.find(b => JSON.stringify(b.type) === JSON.stringify(type));
    return bet ? bet.amount : 0;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col h-screen overflow-hidden font-sans select-none">
      
      {/* FULLSCREEN TOP CONTROL BAR */}
      <div className="h-14 bg-slate-900/90 border-b border-amber-500/30 px-3 flex items-center justify-between shrink-0 backdrop-blur-md z-30">
        
        {/* Left: Close/Back Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { soundFx.playClick(); onClose(); }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl border border-amber-500/30 transition-all flex items-center gap-1 font-mono text-xs font-bold active:scale-95"
            title="Exit Live Casino"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">EXIT</span>
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-black font-mono text-white tracking-wider">LIVE ROULETTE</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">ROUND #{roundId}</span>
          </div>
        </div>

        {/* Center: Live Synchronized Countdown Timer Badge */}
        <div className="flex items-center gap-2 bg-slate-950/90 border border-amber-500/40 px-3 py-1 rounded-2xl shadow-lg">
          {betsLocked || isSpinning ? (
            <div className="flex items-center gap-1.5 text-rose-400 font-black font-mono text-xs sm:text-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>🔒 NO MORE BETS</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-black">
              <span className="text-slate-400">BETTING ENDS IN:</span>
              <span className={`px-2 py-0.5 rounded-lg text-slate-950 font-black ${
                countdown <= 5 ? 'bg-rose-500 text-white animate-bounce' : 'bg-amber-400'
              }`}>
                {countdown}s
              </span>
            </div>
          )}
        </div>

        {/* Right: Wallet Balance, History & Audio Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { soundFx.playClick(); setShowHistoryOverlay(true); }}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl border border-amber-500/30 transition-all flex items-center gap-1.5 font-mono text-xs font-bold active:scale-95 shadow-md"
            title="View Round History & Stats"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">HISTORY</span>
          </button>

          <div className="bg-slate-950 border border-amber-500/40 px-3 py-1 rounded-xl flex items-center gap-2">
            <div className="text-right">
              <span className="text-[9px] text-slate-400 font-mono block leading-none uppercase">WALLET</span>
              <span className="text-xs sm:text-sm font-black font-mono text-amber-400">₹{user.balance.toLocaleString('en-IN')}</span>
            </div>
            <button
              onClick={() => { soundFx.playClick(); onOpenDeposit(); }}
              className="p-1 bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-all font-mono font-bold text-xs"
            >
              +
            </button>
          </div>

          <button
            onClick={() => setIsMuted(soundFx.toggleMute())}
            className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

      </div>

      {/* RECENT WINNING HISTORY TICKER BAR */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-3 py-1 flex items-center justify-between gap-2 overflow-x-auto shrink-0 font-mono text-xs text-slate-400">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] uppercase font-bold text-amber-400/80 shrink-0">LAST RESULTS:</span>
          <div className="flex items-center gap-1">
            {recentHistory.map((num, idx) => {
              const col = getNumberColor(num);
              return (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] shadow-sm ${
                    col === 'green'
                      ? 'bg-emerald-600 text-white'
                      : col === 'red'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                  }`}
                >
                  {num}
                </span>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => { soundFx.playClick(); setShowHistoryOverlay(true); }}
          className="text-[10px] font-mono text-amber-400 hover:underline flex items-center gap-1 shrink-0 font-bold"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          FULL HISTORY & STATS
        </button>
      </div>

      {/* MAIN GAME CONTAINER: FLEX 1 SPLIT VIEW (WHEEL TOP/LEFT + TABLE BOTTOM/RIGHT) */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-between p-2 sm:p-4 gap-2 sm:gap-4 overflow-hidden relative">
        
        {/* WHEEL DISPLAY SECTION */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center relative shrink-0">
          
          {/* European Roulette 3D Wheel SVG */}
          <div className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 flex items-center justify-center">
            
            {/* Outer Mahogany Wood Ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-950 via-amber-900 to-amber-950 border-4 border-amber-500/40 shadow-2xl shadow-black p-2">
              
              {/* Gold Pocket Ring */}
              <div className="w-full h-full rounded-full bg-slate-900 border-2 border-yellow-500/50 relative overflow-hidden flex items-center justify-center">
                
                {/* Rotating Wheel Group */}
                <div
                  className="w-full h-full rounded-full relative transition-transform duration-75 ease-out"
                  style={{ transform: `rotate(${wheelRotation}deg)` }}
                >
                  <svg className="w-full h-full viewBox-0 0 300 300" viewBox="0 0 300 300">
                    <circle cx="150" cy="150" r="145" fill="#0f172a" stroke="#d97706" strokeWidth="2" />
                    
                    {/* Render 37 Pockets */}
                    {WHEEL_NUMBERS.map((num, i) => {
                      const angle = (i * 360) / 37;
                      const nextAngle = ((i + 1) * 360) / 37;
                      const rad1 = (angle * Math.PI) / 180;
                      const rad2 = (nextAngle * Math.PI) / 180;
                      
                      const x1 = 150 + 140 * Math.sin(rad1);
                      const y1 = 150 - 140 * Math.cos(rad1);
                      const x2 = 150 + 140 * Math.sin(rad2);
                      const y2 = 150 - 140 * Math.cos(rad2);

                      const col = getNumberColor(num);
                      const fill = col === 'green' ? '#059669' : col === 'red' ? '#dc2626' : '#1e293b';

                      // Text radial position
                      const midRad = ((angle + (360 / 37) / 2) * Math.PI) / 180;
                      const tx = 150 + 115 * Math.sin(midRad);
                      const ty = 150 - 115 * Math.cos(midRad);

                      return (
                        <g key={num}>
                          <path
                            d={`M 150 150 L ${x1} ${y1} A 140 140 0 0 1 ${x2} ${y2} Z`}
                            fill={fill}
                            stroke="#fbbf24"
                            strokeWidth="0.5"
                          />
                          <text
                            x={tx}
                            y={ty}
                            fill="#ffffff"
                            fontSize="9"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor="middle"
                            dominantBaseline="central"
                            transform={`rotate(${angle + 360 / 74}, ${tx}, ${ty})`}
                          >
                            {num}
                          </text>
                        </g>
                      );
                    })}

                    {/* Brass Inner Turret */}
                    <circle cx="150" cy="150" r="70" fill="url(#brassGradient)" stroke="#fbbf24" strokeWidth="2" />
                    <circle cx="150" cy="150" r="30" fill="#78350f" stroke="#f59e0b" strokeWidth="1" />
                    
                    <defs>
                      <radialGradient id="brassGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="60%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#78350f" />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>

                {/* Animated 3D Pearl Marble Ball Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 300 300">
                  <defs>
                    <radialGradient id="marbleGrad" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="60%" stopColor="#f1f5f9" />
                      <stop offset="100%" stopColor="#94a3b8" />
                    </radialGradient>
                  </defs>

                  <g id="marble-ball">
                    {/* Shadow under ball */}
                    <ellipse
                      cx={150 + (ballRadius + 2) * Math.sin((ballAngle * Math.PI) / 180)}
                      cy={150 - (ballRadius - 2) * Math.cos((ballAngle * Math.PI) / 180)}
                      rx="6"
                      ry="4"
                      fill="rgba(0,0,0,0.5)"
                    />
                    {/* White Pearl Marble */}
                    <circle
                      cx={150 + ballRadius * Math.sin((ballAngle * Math.PI) / 180)}
                      cy={150 - ballRadius * Math.cos((ballAngle * Math.PI) / 180)}
                      r="6.5"
                      fill="url(#marbleGrad)"
                      stroke="#ffffff"
                      strokeWidth="1"
                      filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.8))"
                    />
                    {/* Specular Highlight */}
                    <circle
                      cx={150 + ballRadius * Math.sin((ballAngle * Math.PI) / 180) - 2}
                      cy={150 - ballRadius * Math.cos((ballAngle * Math.PI) / 180) - 2}
                      r="2"
                      fill="#ffffff"
                      opacity="0.9"
                    />
                  </g>
                </svg>

                {/* Top Wheel Pocket Pointer */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[12px] border-t-amber-400 z-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"></div>

              </div>
            </div>

          </div>

          {/* Settled Result Display Banner */}
          {showResultOverlay && isResultRevealed && winningNumber !== null && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-30 animate-in zoom-in-95 duration-200 rounded-2xl">
              <div className="text-center space-y-2 p-4">
                <span className="text-[10px] font-mono font-black text-amber-400 tracking-widest uppercase">WINNING NUMBER</span>
                
                <div className="flex items-center justify-center gap-3">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black font-mono shadow-2xl border-2 ${
                      getNumberColor(winningNumber) === 'green'
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : getNumberColor(winningNumber) === 'red'
                        ? 'bg-rose-600 border-rose-400 text-white'
                        : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  >
                    {winningNumber}
                  </div>
                </div>

                <div className="text-xs font-mono font-bold text-slate-300">
                  {winningNumber === 0
                    ? 'ZERO GREEN'
                    : `${getNumberColor(winningNumber).toUpperCase()} • ${
                        winningNumber % 2 === 0 ? 'EVEN' : 'ODD'
                      } • ${winningNumber <= 18 ? '1-18 LOW' : '19-36 HIGH'}`}
                </div>

                {lastWinAmount !== null && lastWinAmount > 0 ? (
                  <div className="bg-emerald-500/20 border border-emerald-500/50 px-4 py-2 rounded-xl text-emerald-400 font-mono font-black text-sm animate-bounce">
                    🎉 YOU WON ₹{lastWinAmount.toLocaleString('en-IN')}!
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 font-mono">
                    Better luck next round!
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* BETTING TABLE SECTION (FITS 100% IN SINGLE VIEWPORT WITHOUT SCROLLING) */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between gap-1.5 sm:gap-2 flex-1 max-h-full">
          
          {/* Main 0-36 Numbers Grid */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-1.5 shadow-xl flex gap-1">
            
            {/* Zero (0) Column */}
            <button
              onClick={() => handlePlaceBet({ kind: 'number', value: 0 }, '0')}
              className={`w-10 sm:w-12 bg-emerald-700 hover:bg-emerald-600 text-white font-black font-mono text-sm sm:text-base rounded-xl border border-emerald-500/50 flex flex-col items-center justify-center relative transition-all active:scale-95 ${
                getBetAmountForSpot({ kind: 'number', value: 0 }) > 0 ? 'ring-2 ring-amber-400' : ''
              }`}
            >
              <span>0</span>
              {getBetAmountForSpot({ kind: 'number', value: 0 }) > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[9px] px-1 rounded-full shadow">
                  ₹{getBetAmountForSpot({ kind: 'number', value: 0 })}
                </span>
              )}
            </button>

            {/* 3x12 Numbers Matrix */}
            <div className="flex-1 grid grid-cols-12 gap-0.5 sm:gap-1">
              {[
                [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
                [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
                [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
              ].map((row, rIdx) => (
                <React.Fragment key={rIdx}>
                  {row.map((num) => {
                    const col = getNumberColor(num);
                    const betAmt = getBetAmountForSpot({ kind: 'number', value: num });
                    return (
                      <button
                        key={num}
                        onClick={() => handlePlaceBet({ kind: 'number', value: num }, `${num}`)}
                        className={`h-8 sm:h-10 text-xs sm:text-sm font-black font-mono rounded-lg border flex flex-col items-center justify-center relative transition-all active:scale-95 ${
                          col === 'red'
                            ? 'bg-rose-700 hover:bg-rose-600 border-rose-500/40 text-white'
                            : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-white'
                        } ${betAmt > 0 ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                      >
                        <span>{num}</span>
                        {betAmt > 0 && (
                          <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[8px] sm:text-[9px] px-1 rounded-full shadow">
                            ₹{betAmt}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            {/* Column Bets (2:1) */}
            <div className="flex flex-col gap-0.5 sm:gap-1 w-9 sm:w-10">
              {['col3', 'col2', 'col1'].map((colKey, idx) => {
                const betAmt = getBetAmountForSpot({ kind: 'column', value: colKey as any });
                return (
                  <button
                    key={colKey}
                    onClick={() => handlePlaceBet({ kind: 'column', value: colKey as any }, '2:1 Col')}
                    className={`h-8 sm:h-10 bg-slate-800 hover:bg-slate-700 text-amber-400 text-[10px] sm:text-xs font-black font-mono rounded-lg border border-amber-500/30 flex items-center justify-center relative transition-all active:scale-95 ${
                      betAmt > 0 ? 'ring-2 ring-amber-400' : ''
                    }`}
                  >
                    <span>2:1</span>
                    {betAmt > 0 && (
                      <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[8px] px-1 rounded-full">
                        ₹{betAmt}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

          </div>

          {/* Outside Bets: Dozens (1st 12, 2nd 12, 3rd 12) */}
          <div className="grid grid-cols-3 gap-1">
            {[
              { key: '1st12', label: '1ST 12 (1-12)' },
              { key: '2nd12', label: '2ND 12 (13-24)' },
              { key: '3rd12', label: '3RD 12 (25-36)' }
            ].map((d) => {
              const betAmt = getBetAmountForSpot({ kind: 'dozen', value: d.key as any });
              return (
                <button
                  key={d.key}
                  onClick={() => handlePlaceBet({ kind: 'dozen', value: d.key as any }, d.label)}
                  className={`py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-mono font-bold text-[10px] sm:text-xs rounded-xl border border-amber-500/30 flex items-center justify-center relative transition-all active:scale-95 ${
                    betAmt > 0 ? 'ring-2 ring-amber-400' : ''
                  }`}
                >
                  <span>{d.label}</span>
                  {betAmt > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[8px] px-1 rounded-full">
                      ₹{betAmt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Outside Bets: 1-18, EVEN, RED, BLACK, ODD, 19-36 */}
          <div className="grid grid-cols-6 gap-1">
            {[
              { type: { kind: 'range', value: '1-18' }, label: '1-18', cls: 'bg-slate-900 border-slate-700 text-slate-200' },
              { type: { kind: 'parity', value: 'even' }, label: 'EVEN', cls: 'bg-slate-900 border-slate-700 text-slate-200' },
              { type: { kind: 'color', value: 'red' }, label: 'RED', cls: 'bg-rose-700 border-rose-500 text-white' },
              { type: { kind: 'color', value: 'black' }, label: 'BLACK', cls: 'bg-slate-950 border-slate-700 text-white' },
              { type: { kind: 'parity', value: 'odd' }, label: 'ODD', cls: 'bg-slate-900 border-slate-700 text-slate-200' },
              { type: { kind: 'range', value: '19-36' }, label: '19-36', cls: 'bg-slate-900 border-slate-700 text-slate-200' }
            ].map((item, idx) => {
              const betAmt = getBetAmountForSpot(item.type as BetType);
              return (
                <button
                  key={idx}
                  onClick={() => handlePlaceBet(item.type as BetType, item.label)}
                  className={`py-2 sm:py-2.5 font-mono font-black text-[10px] sm:text-xs rounded-xl border flex items-center justify-center relative transition-all active:scale-95 ${item.cls} ${
                    betAmt > 0 ? 'ring-2 ring-amber-400' : ''
                  }`}
                >
                  <span>{item.label}</span>
                  {betAmt > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[8px] px-1 rounded-full">
                      ₹{betAmt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* CHIP SELECTOR & ACTION BAR */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-2 space-y-2 shrink-0">
            
            {/* Chip Selector Row */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold shrink-0">CHIPS:</span>
              <div className="flex items-center gap-1.5">
                {CHIP_VALUES.map((val) => (
                  <button
                    key={val}
                    onClick={() => { soundFx.playClick(); setSelectedChip(val); }}
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full font-mono font-black text-[10px] sm:text-xs flex items-center justify-center border-2 shadow-lg transition-all active:scale-90 ${
                      selectedChip === val
                        ? 'bg-amber-500 text-slate-950 border-white ring-4 ring-amber-500/30 scale-110 z-10'
                        : 'bg-slate-950 text-amber-400 border-amber-500/40 hover:border-amber-400'
                    }`}
                  >
                    ₹{val >= 1000 ? `${val / 1000}k` : val}
                  </button>
                ))}
              </div>
            </div>

            {/* Betting Controls & Auto-Spin Status Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <div className="grid grid-cols-3 gap-1.5 w-full sm:flex-1">
                <button
                  onClick={handleClearBets}
                  disabled={isSpinning || betsLocked || bets.length === 0}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold text-xs rounded-xl border border-slate-700 disabled:opacity-50 transition-all active:scale-95"
                >
                  CLEAR
                </button>

                <button
                  onClick={handleDoubleBets}
                  disabled={isSpinning || betsLocked || bets.length === 0}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-mono font-bold text-xs rounded-xl border border-amber-500/30 disabled:opacity-50 transition-all active:scale-95"
                >
                  2X DOUBLE
                </button>

                <button
                  onClick={handleRepeatBets}
                  disabled={isSpinning || betsLocked || lastBets.length === 0}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono font-bold text-xs rounded-xl border border-emerald-500/30 disabled:opacity-50 transition-all active:scale-95"
                >
                  REPEAT
                </button>
              </div>

              {/* Total Bet & Live Round Auto-Spin Badge */}
              <div className="w-full sm:w-auto px-4 py-2 bg-slate-950 border border-amber-500/40 rounded-xl flex items-center justify-between sm:justify-center gap-3 font-mono shrink-0">
                <div className="text-left">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">TOTAL BET</span>
                  <span className="text-xs sm:text-sm font-black text-amber-400 leading-tight">₹{totalBetAmount}</span>
                </div>
                <div className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-[10px] font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span>AUTO-SPIN AT 0s</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ROUND HISTORY & STATS OVERLAY MODAL */}
      {showHistoryOverlay && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-mono font-black text-white text-base">ROUND HISTORY & STATS</h3>
                  <p className="text-xs text-slate-400 font-mono">Last {fullHistory.length} Live European Roulette Rounds</p>
                </div>
              </div>
              <button
                onClick={() => { soundFx.playClick(); setShowHistoryOverlay(false); }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Color Stats Summary */}
            <div className="p-4 bg-slate-950/40 border-b border-slate-800 grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <div className="bg-rose-950/40 border border-rose-500/30 p-2 rounded-2xl">
                <span className="text-rose-400 font-bold block text-[10px] uppercase">RED</span>
                <span className="text-lg font-black text-white">
                  {fullHistory.length > 0 ? Math.round((fullHistory.filter(h => h.color === 'red').length / fullHistory.length) * 100) : 0}%
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-700 p-2 rounded-2xl">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">BLACK</span>
                <span className="text-lg font-black text-white">
                  {fullHistory.length > 0 ? Math.round((fullHistory.filter(h => h.color === 'black').length / fullHistory.length) * 100) : 0}%
                </span>
              </div>
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-2xl">
                <span className="text-emerald-400 font-bold block text-[10px] uppercase">ZERO GREEN</span>
                <span className="text-lg font-black text-white">
                  {fullHistory.length > 0 ? Math.round((fullHistory.filter(h => h.color === 'green').length / fullHistory.length) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Scrollable Horizontal List of Recent Winning Numbers */}
            <div className="p-3 bg-slate-900 border-b border-slate-800">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-2">QUICK SCROLLABLE TAPE (LAST 10 ROUNDS):</span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {fullHistory.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className={`px-3 py-2 rounded-2xl flex flex-col items-center justify-center shrink-0 border min-w-[56px] shadow-md font-mono ${
                      item.color === 'red'
                        ? 'bg-rose-600/90 border-rose-400 text-white'
                        : item.color === 'black'
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-emerald-600 border-emerald-400 text-white'
                    }`}
                  >
                    <span className="text-base font-black leading-none">{item.number}</span>
                    <span className="text-[9px] opacity-80 mt-1 uppercase font-semibold">
                      {item.number === 0 ? 'ZERO' : item.parity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable History Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="pb-2">ROUND ID</th>
                    <th className="pb-2">WINNING NUMBER</th>
                    <th className="pb-2">COLOR</th>
                    <th className="pb-2">PROPERTIES</th>
                    <th className="pb-2 text-right">TIME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {fullHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 font-bold text-slate-400">{item.roundId}</td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-sm ${
                          item.color === 'red'
                            ? 'bg-rose-600 text-white'
                            : item.color === 'black'
                            ? 'bg-slate-950 border border-slate-700 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}>
                          {item.number}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.color === 'red'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : item.color === 'black'
                            ? 'bg-slate-800 text-slate-300 border border-slate-700'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {item.color}
                        </span>
                      </td>
                      <td className="py-2.5 text-[11px] text-slate-300">
                        {item.number === 0
                          ? 'Zero Green / Single'
                          : `${item.parity.toUpperCase()} • ${item.range} • ${item.dozen} • ${item.column}`}
                      </td>
                      <td className="py-2.5 text-right text-slate-400 text-[10px]">{item.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

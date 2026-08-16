import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Volume2, VolumeX, Sparkles, RefreshCw, Trophy, 
  RotateCcw, Zap, HelpCircle, History
} from 'lucide-react';
import { User, WalletTransaction, LightningRouletteConfig, LightningLuckyNumber, LightningMultiplier } from '../types';
import { soundFx } from '../utils/audio';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import lightningBannerImg from '../assets/images/banner_lightning_roulette_1786807743295.jpg';

interface LightningRouletteGameProps {
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
  multiplier?: number;
  timestamp: string;
}

// European Roulette Numbers in exact clockwise physical wheel sequence
export const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

const CHIP_VALUES = [10, 50, 100, 500, 1000, 5000];
const MULTIPLIER_POOL: LightningMultiplier[] = [50, 100, 150, 200, 250, 300, 400, 500];

export type BetType = 
  | { kind: 'number'; value: number }
  | { kind: 'color'; value: 'red' | 'black' }
  | { kind: 'parity'; value: 'even' | 'odd' }
  | { kind: 'range'; value: '1-18' | '19-36' }
  | { kind: 'dozen'; value: '1st12' | '2nd12' | '3rd12' }
  | { kind: 'column'; value: 'col1' | 'col2' | 'col3' };

export interface PlacedBet {
  id: string;
  type: BetType;
  label: string;
  amount: number;
}

export const LightningRouletteGame: React.FC<LightningRouletteGameProps> = ({
  user,
  onUpdateBalance,
  onAddTransaction,
  onClose,
  onOpenDeposit
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(100);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [lastBets, setLastBets] = useState<PlacedBet[]>([]);
  
  const betsRef = useRef<PlacedBet[]>([]);
  betsRef.current = bets;

  const [gamePhase, setGamePhase] = useState<'betting' | 'lightning' | 'spinning' | 'settled'>('betting');
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [luckyNumbers, setLuckyNumbers] = useState<LightningLuckyNumber[]>([]);
  const [activeStrikes, setActiveStrikes] = useState<number[]>([]);
  const [lightningFlashActive, setLightningFlashActive] = useState<boolean>(false);
  
  // Real-time recent history (newest at index 0 on the left, pushes right)
  const [recentHistory, setRecentHistory] = useState<RoundHistoryItem[]>([
    { id: '1', roundId: 'EV-LR-8921', number: 17, color: 'black', multiplier: 100, timestamp: '12:15' },
    { id: '2', roundId: 'EV-LR-8920', number: 32, color: 'red', timestamp: '12:14' },
    { id: '3', roundId: 'EV-LR-8919', number: 0, color: 'green', multiplier: 500, timestamp: '12:13' },
    { id: '4', roundId: 'EV-LR-8918', number: 5, color: 'red', timestamp: '12:12' },
    { id: '5', roundId: 'EV-LR-8917', number: 29, color: 'black', timestamp: '12:11' },
    { id: '6', roundId: 'EV-LR-8916', number: 7, color: 'red', multiplier: 50, timestamp: '12:10' },
  ]);
  
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);
  const [hitLightningMultiplier, setHitLightningMultiplier] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [roundId, setRoundId] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(18);

  // Real 3D Vector Wheel rotation and marble ball physics
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const wheelRotationRef = useRef<number>(0);
  const [ballAngle, setBallAngle] = useState<number>(0);
  const [ballRadius, setBallRadius] = useState<number>(132);
  const [highlightedPocket, setHighlightedPocket] = useState<number | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const isSettlingRef = useRef<boolean>(false);

  // Synchronous user ref
  const userRef = useRef<User>(user);
  userRef.current = user;

  // Real-time listener for current user's balance from Firestore
  useEffect(() => {
    if (!user?.id) return;
    const unsub = onSnapshot(doc(db, 'users', user.id), (snap) => {
      if (snap.exists()) {
        const uData = snap.data();
        if (typeof uData.balance === 'number' && userRef.current) {
          userRef.current.balance = uData.balance;
        }
      }
    }, (err) => console.warn('Lightning Roulette user balance listener notice:', err));
    return () => unsub();
  }, [user?.id]);

  // Voice Announcer using Web Speech API
  const announceVoice = (text: string) => {
    if (isMuted) return;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Speech synthesis notice:', e);
    }
  };

  // Lightning Config & Firestore sync
  const [config, setConfig] = useState<LightningRouletteConfig>(() => {
    return {
      isEnabled: true,
      minBet: 10,
      maxBet: 50000,
      bettingDurationSeconds: 16,
      straightUpPayoutMultiplier: 30,
      rtpPercentage: 97.3,
      houseEdgePercentage: 2.7,
      rtpMode: 'fair_rng',
      luckyNumbersCountMin: 1,
      luckyNumbersCountMax: 5,
    };
  });

  const configRef = useRef<LightningRouletteConfig>(config);
  configRef.current = config;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'game_settings', 'lightning_roulette'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<LightningRouletteConfig>;
        setConfig((prev) => ({ ...prev, ...data }));
      }
    }, () => {});
    return () => unsub();
  }, []);

  // Initialize Round
  useEffect(() => {
    const initNewRound = () => {
      const now = new Date();
      const code = `EV-LR-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${Math.floor(10 + Math.random() * 90)}`;
      setRoundId(code);
      setGamePhase('betting');
      setCountdown(configRef.current.bettingDurationSeconds || 16);
      setWinningNumber(null);
      setLuckyNumbers([]);
      setActiveStrikes([]);
      setLastWinAmount(null);
      setHitLightningMultiplier(null);
      setHighlightedPocket(null);
      isSettlingRef.current = false;
      announceVoice('Place your bets');
    };

    initNewRound();
  }, []);

  // Main Game Loop Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gamePhase === 'betting') {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            startLightningSequence();
            return 0;
          }
          if (prev === 4) {
            soundFx.playBetsClosing();
            announceVoice('Final bets');
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gamePhase]);

  // Phase 2: Start Lightning Sequence with intense electric animation
  const startLightningSequence = () => {
    soundFx.playBetsClosed();
    announceVoice('No more bets');
    setGamePhase('lightning');
    setLightningFlashActive(true);

    if (betsRef.current.length > 0) {
      setLastBets(betsRef.current);
    }

    // Generate 2 to 5 Lucky Numbers
    const numLucky = Math.floor(Math.random() * 4) + 2;
    const chosenNums: number[] = [];
    while (chosenNums.length < numLucky) {
      const rNum = Math.floor(Math.random() * 37);
      if (!chosenNums.includes(rNum)) {
        chosenNums.push(rNum);
      }
    }

    const generatedLuckyNumbers: LightningLuckyNumber[] = chosenNums.map((num) => {
      const mult = MULTIPLIER_POOL[Math.floor(Math.random() * MULTIPLIER_POOL.length)];
      const color = num === 0 ? 'green' : RED_NUMBERS.has(num) ? 'red' : 'black';
      return { number: num, multiplier: mult, color };
    });

    setLuckyNumbers(generatedLuckyNumbers);

    // Staggered Lightning Strikes with thunder sounds & flash
    generatedLuckyNumbers.forEach((_, idx) => {
      setTimeout(() => {
        soundFx.playLightningStrike();
        setActiveStrikes((prev) => [...prev, idx]);
        setLightningFlashActive(true);
        setTimeout(() => setLightningFlashActive(false), 200);
      }, 400 + idx * 550);
    });

    const totalLightningTime = 500 + generatedLuckyNumbers.length * 550 + 600;
    setTimeout(() => {
      startBallPhysicsSpin(generatedLuckyNumbers);
    }, totalLightningTime);
  };

  // Phase 3: Start Real 3D Vector Wheel Spin & Smooth Marble Ball Physics
  // We align the wheel & ball so the ball stops at the exact top pointer (0 deg), ensuring a single unambiguous result
  const startBallPhysicsSpin = (roundLuckyNumbers: LightningLuckyNumber[]) => {
    setGamePhase('spinning');
    soundFx.playSpinWhoosh();

    // Determine winning number (considering manual force or fair RNG)
    let selectedWinner: number;
    if (configRef.current.rtpMode === 'manual_force' && typeof configRef.current.manualForceNumber === 'number') {
      selectedWinner = configRef.current.manualForceNumber;
    } else {
      selectedWinner = Math.floor(Math.random() * 37);
    }

    setWinningNumber(selectedWinner);

    const targetPocketIndex = WHEEL_NUMBERS.indexOf(selectedWinner);
    const pocketDeg = 360 / 37;
    const pocketCenterAngle = (targetPocketIndex + 0.5) * pocketDeg;

    // Mathematical formula to align target pocket exactly at top (0 deg / 12 o'clock):
    // After wheel rotates by targetWheelRotation, (pocketCenterAngle + targetWheelRotation) % 360 = 0
    const desiredNormalized = (360 - (pocketCenterAngle % 360)) % 360;
    const startWheelRot = wheelRotationRef.current;
    const currentNormalized = ((startWheelRot % 360) + 360) % 360;
    let delta = (desiredNormalized - currentNormalized + 360) % 360;
    if (delta < 30) {
      delta += 360;
    }

    const minFullSpins = 6;
    const targetWheelRotation = startWheelRot + (minFullSpins * 360) + delta;

    const startTime = performance.now();
    const duration = 5600;

    let bounceCount = 0;

    const animateFrame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth cubic deceleration curve for the wheel
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentWheelRot = startWheelRot + (targetWheelRotation - startWheelRot) * easeOut;
      wheelRotationRef.current = currentWheelRot;
      setWheelRotation(currentWheelRot);

      // Ball rotates around track and settles into 0 deg (top pocket)
      const remainingBallSpins = 9 * (1 - easeOut);
      const currentBallAngle = (remainingBallSpins * 360) % 360;
      setBallAngle(currentBallAngle);

      // Ball radius drops from outer rim (134px) into winning pocket center (108px)
      if (progress > 0.65) {
        const dropP = (progress - 0.65) / 0.35;
        const smoothDrop = Math.pow(dropP, 1.8);
        const bounce = Math.abs(Math.sin(dropP * Math.PI * 4)) * (1 - dropP) * 12;
        setBallRadius(134 - (26 * smoothDrop) + bounce);

        // Click sounds on bounce peaks
        const currentBounce = Math.floor(dropP * 4);
        if (currentBounce > bounceCount) {
          bounceCount = currentBounce;
          soundFx.playBallClick();
        }
      } else {
        setBallRadius(134);
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateFrame);
      } else {
        // Final precise positioning
        wheelRotationRef.current = targetWheelRotation;
        setWheelRotation(targetWheelRotation);
        setBallRadius(108);
        setBallAngle(0); // Settled directly at the top pointer pocket
        setHighlightedPocket(selectedWinner);

        if (!isSettlingRef.current) {
          isSettlingRef.current = true;
          resolveRoundOutcome(selectedWinner, roundLuckyNumbers);
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateFrame);
  };

  // Phase 4: Settle Round Outcome & Credit Wallet
  const resolveRoundOutcome = async (winner: number, roundLuckyNumbers: LightningLuckyNumber[]) => {
    setGamePhase('settled');

    const isWinnerLucky = roundLuckyNumbers.find((l) => l.number === winner);
    const isWinnerRed = RED_NUMBERS.has(winner);
    const isWinnerBlack = BLACK_NUMBERS.has(winner);
    const isWinnerEven = winner !== 0 && winner % 2 === 0;
    const isWinnerOdd = winner !== 0 && winner % 2 !== 0;
    const isWinnerLow = winner >= 1 && winner <= 18;
    const isWinnerHigh = winner >= 19 && winner <= 36;
    const isWinner1st12 = winner >= 1 && winner <= 12;
    const isWinner2nd12 = winner >= 13 && winner <= 24;
    const isWinner3rd12 = winner >= 25 && winner <= 36;
    const isWinnerCol1 = winner !== 0 && winner % 3 === 1;
    const isWinnerCol2 = winner !== 0 && winner % 3 === 2;
    const isWinnerCol3 = winner !== 0 && winner % 3 === 0;

    let totalWin = 0;
    let hitMultiplier: number | null = null;

    const currentBets = [...betsRef.current];

    currentBets.forEach((b) => {
      if (b.type.kind === 'number') {
        if (b.type.value === winner) {
          if (isWinnerLucky) {
            const win = b.amount * isWinnerLucky.multiplier;
            totalWin += win;
            hitMultiplier = isWinnerLucky.multiplier;
          } else {
            const win = b.amount * (configRef.current.straightUpPayoutMultiplier || 30);
            totalWin += win;
          }
        }
      } else if (b.type.kind === 'color') {
        if ((b.type.value === 'red' && isWinnerRed) || (b.type.value === 'black' && isWinnerBlack)) {
          totalWin += b.amount * 2;
        }
      } else if (b.type.kind === 'parity') {
        if ((b.type.value === 'even' && isWinnerEven) || (b.type.value === 'odd' && isWinnerOdd)) {
          totalWin += b.amount * 2;
        }
      } else if (b.type.kind === 'range') {
        if ((b.type.value === '1-18' && isWinnerLow) || (b.type.value === '19-36' && isWinnerHigh)) {
          totalWin += b.amount * 2;
        }
      } else if (b.type.kind === 'dozen') {
        if ((b.type.value === '1st12' && isWinner1st12) || (b.type.value === '2nd12' && isWinner2nd12) || (b.type.value === '3rd12' && isWinner3rd12)) {
          totalWin += b.amount * 3;
        }
      } else if (b.type.kind === 'column') {
        if ((b.type.value === 'col1' && isWinnerCol1) || (b.type.value === 'col2' && isWinnerCol2) || (b.type.value === 'col3' && isWinnerCol3)) {
          totalWin += b.amount * 3;
        }
      }
    });

    setLastWinAmount(totalWin);
    setHitLightningMultiplier(hitMultiplier);

    // Voice announcement of single clean result
    const colorWord = winner === 0 ? 'Green' : isWinnerRed ? 'Red' : 'Black';
    if (hitMultiplier) {
      announceVoice(`Winning number ${winner}, ${colorWord}! ${hitMultiplier}X Lightning Hit!`);
    } else {
      announceVoice(`Winning number ${winner}, ${colorWord}`);
    }

    // Audio & Confetti Celebration
    if (totalWin > 0) {
      if (hitMultiplier && hitMultiplier >= 50) {
        soundFx.playMultiplierReveal();
        soundFx.playLoudWinSound();
        confetti({
          particleCount: 180,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#FFD700', '#FFA500', '#00FFFF', '#FFFFFF']
        });
      } else {
        soundFx.playWinFanfare();
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.5 }
        });
      }

      // Credit User Balance
      const currentBal = typeof userRef.current?.balance === 'number' ? userRef.current.balance : (user.balance || 0);
      const newBal = currentBal + totalWin;
      if (userRef.current) {
        userRef.current.balance = newBal;
      }
      onUpdateBalance(newBal);

      // Real-time Firestore sync
      if (user?.id) {
        setDoc(doc(db, 'users', user.id), {
          balance: newBal,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }

      // Record Transaction
      const tx: WalletTransaction = {
        id: `TX-LR-WIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        type: 'lightning_roulette_win',
        amount: totalWin,
        description: `Lightning Roulette Win - #${winner} ${hitMultiplier ? `[${hitMultiplier}X LIGHTNING]` : ''} (${roundId})`,
        status: 'completed',
        date: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString()
      };
      onAddTransaction(tx);
      if (user?.id) {
        setDoc(doc(db, 'transactions', tx.id), tx, { merge: true }).catch(() => {});
      }
    } else if (currentBets.length > 0) {
      soundFx.playLossSound();
    }

    // Add outcome to top history bar (Prepends to LEFT at index 0, pushing older to right)
    const historyItem: RoundHistoryItem = {
      id: Date.now().toString(),
      roundId,
      number: winner,
      color: winner === 0 ? 'green' : RED_NUMBERS.has(winner) ? 'red' : 'black',
      multiplier: hitMultiplier || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setRecentHistory((prev) => [historyItem, ...prev.slice(0, 19)]);

    // Prepare next round after 6 seconds
    setTimeout(() => {
      setBets([]);
      betsRef.current = [];
      const now = new Date();
      const code = `EV-LR-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${Math.floor(10 + Math.random() * 90)}`;
      setRoundId(code);
      setGamePhase('betting');
      setCountdown(configRef.current.bettingDurationSeconds || 16);
      setWinningNumber(null);
      setLuckyNumbers([]);
      setActiveStrikes([]);
      setLastWinAmount(null);
      setHitLightningMultiplier(null);
      setHighlightedPocket(null);
      isSettlingRef.current = false;
      announceVoice('Place your bets');
    }, 6000);
  };

  // Place Bet
  const handlePlaceBet = (type: BetType, label: string) => {
    if (gamePhase !== 'betting') return;

    const currentBal = typeof userRef.current?.balance === 'number' ? userRef.current.balance : (user.balance || 0);
    if (currentBal < selectedChip) {
      soundFx.playError();
      onOpenDeposit();
      return;
    }

    const newBal = currentBal - selectedChip;
    if (userRef.current) {
      userRef.current.balance = newBal;
    }
    onUpdateBalance(newBal);

    if (user?.id) {
      setDoc(doc(db, 'users', user.id), {
        balance: newBal,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }

    const betTx: WalletTransaction = {
      id: `TX-LR-BET-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: user.id,
      type: 'lightning_roulette_bet',
      amount: selectedChip,
      description: `Lightning Roulette Bet on ${label} (${roundId})`,
      status: 'completed',
      date: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };
    onAddTransaction(betTx);
    if (user?.id) {
      setDoc(doc(db, 'transactions', betTx.id), betTx, { merge: true }).catch(() => {});
    }

    soundFx.playChipPlacement();

    setBets((prev) => {
      const existingIdx = prev.findIndex((b) => JSON.stringify(b.type) === JSON.stringify(type));
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].amount += selectedChip;
        betsRef.current = updated;
        return updated;
      }
      const next = [...prev, { id: Date.now().toString(), type, label, amount: selectedChip }];
      betsRef.current = next;
      return next;
    });
  };

  // Clear Bets
  const handleClearBets = () => {
    if (gamePhase !== 'betting' || bets.length === 0) return;
    const refundTotal = bets.reduce((acc, b) => acc + b.amount, 0);

    const currentBal = typeof userRef.current?.balance === 'number' ? userRef.current.balance : (user.balance || 0);
    const newBal = currentBal + refundTotal;
    if (userRef.current) {
      userRef.current.balance = newBal;
    }
    onUpdateBalance(newBal);

    if (user?.id) {
      setDoc(doc(db, 'users', user.id), {
        balance: newBal,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }

    soundFx.playClick();
    setBets([]);
    betsRef.current = [];
  };

  // Double Bets
  const handleDoubleBets = () => {
    if (gamePhase !== 'betting' || bets.length === 0) return;
    const totalPlaced = bets.reduce((acc, b) => acc + b.amount, 0);

    const currentBal = typeof userRef.current?.balance === 'number' ? userRef.current.balance : (user.balance || 0);
    if (currentBal < totalPlaced) {
      soundFx.playError();
      return;
    }

    soundFx.playChipPlacement();
    const newBal = currentBal - totalPlaced;
    if (userRef.current) {
      userRef.current.balance = newBal;
    }
    onUpdateBalance(newBal);

    if (user?.id) {
      setDoc(doc(db, 'users', user.id), {
        balance: newBal,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }

    setBets((prev) => {
      const doubled = prev.map((b) => ({ ...b, amount: b.amount * 2 }));
      betsRef.current = doubled;
      return doubled;
    });
  };

  // Re-bet
  const handleRebet = () => {
    if (gamePhase !== 'betting' || lastBets.length === 0) return;
    const needed = lastBets.reduce((acc, b) => acc + b.amount, 0);

    const currentBal = typeof userRef.current?.balance === 'number' ? userRef.current.balance : (user.balance || 0);
    if (currentBal < needed) {
      soundFx.playError();
      return;
    }

    soundFx.playChipPlacement();
    const newBal = currentBal - needed;
    if (userRef.current) {
      userRef.current.balance = newBal;
    }
    onUpdateBalance(newBal);

    if (user?.id) {
      setDoc(doc(db, 'users', user.id), {
        balance: newBal,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }

    setBets(lastBets);
    betsRef.current = lastBets;
  };

  const getBetOn = (type: BetType): number => {
    const found = bets.find((b) => JSON.stringify(b.type) === JSON.stringify(type));
    return found ? found.amount : 0;
  };

  const totalCurrentBet = bets.reduce((acc, b) => acc + b.amount, 0);

  const getNumberColor = (num: number): 'green' | 'red' | 'black' => {
    if (num === 0) return 'green';
    return RED_NUMBERS.has(num) ? 'red' : 'black';
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070b14] text-slate-100 flex flex-col h-[100dvh] max-h-[100dvh] w-full overflow-hidden select-none font-sans">
      {/* Dynamic Lightning Electric Flash Overlay */}
      {lightningFlashActive && (
        <div className="absolute inset-0 z-40 bg-amber-300/15 pointer-events-none transition-opacity duration-150" />
      )}

      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <img 
          src={lightningBannerImg} 
          alt="Lightning Studio" 
          className="w-full h-full object-cover filter blur-[3px]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/90 to-black/80" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-20 px-3 sm:px-5 py-1.5 bg-slate-950/95 border-b border-amber-500/30 backdrop-blur-md flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              soundFx.playClick();
              if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-amber-500/40 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-md active:scale-95"
            title="Exit Game"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-md shadow-md flex items-center gap-1 border border-amber-300">
              <Zap className="w-3.5 h-3.5 text-slate-950 fill-slate-950 animate-pulse" />
              <span className="text-[11px] font-black text-slate-950 uppercase tracking-wider">
                LIGHTNING ROULETTE
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-black/60 border border-amber-500/30 text-[8px] font-bold text-amber-300 uppercase">
              500X LIVE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct Wallet Balance */}
          <div 
            onClick={onOpenDeposit}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 border border-amber-500/40 rounded-lg cursor-pointer hover:border-amber-400 transition-all shadow-md group"
          >
            <span className="text-[9px] text-amber-300 font-bold uppercase">WALLET:</span>
            <span className="text-xs sm:text-sm font-black text-amber-400 group-hover:text-amber-300">
              ₹{(userRef.current?.balance ?? user.balance ?? 0).toLocaleString()}
            </span>
            <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-black">
              +
            </span>
          </div>

          <button 
            onClick={() => setShowHistoryModal(true)}
            className="w-7 h-7 rounded-lg bg-slate-900/80 border border-amber-500/30 text-amber-400 flex items-center justify-center hover:bg-slate-800 transition-all text-xs"
            title="History"
          >
            <History className="w-3.5 h-3.5" />
          </button>

          <button 
            onClick={() => setShowHelpModal(true)}
            className="w-7 h-7 rounded-lg bg-slate-900/80 border border-amber-500/30 text-amber-400 flex items-center justify-center hover:bg-slate-800 transition-all"
            title="Rules"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          <button 
            onClick={() => {
              const muted = soundFx.toggleMute();
              setIsMuted(muted);
            }}
            className="w-7 h-7 rounded-lg bg-slate-900/80 border border-amber-500/30 text-amber-400 flex items-center justify-center hover:bg-slate-800 transition-all"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* TOP COMPACT RECENT RESULTS TICKER BAR (Newest on the LEFT, pushing older to the RIGHT) */}
      <div className="relative z-20 px-3 py-1 bg-slate-950/95 border-b border-amber-500/20 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto flex-1 py-0.5 no-scrollbar">
          <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider shrink-0 mr-1">
            LAST RESULTS:
          </span>
          {recentHistory.slice(0, 10).map((item, idx) => (
            <div
              key={item.id || idx}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black font-mono shadow transition-all duration-300 shrink-0 ${
                idx === 0 ? 'scale-105 ring-1 ring-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse' : 'opacity-85'
              } ${
                item.number === 0
                  ? 'bg-emerald-600 text-white'
                  : item.color === 'red'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-900 text-white border border-slate-700'
              }`}
            >
              <span>{item.number}</span>
              {item.multiplier && (
                <span className="text-[8px] text-yellow-300 font-extrabold flex items-center ml-0.5">
                  ⚡{item.multiplier}x
                </span>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowHistoryModal(true)}
          className="text-[9px] font-bold text-amber-400 hover:text-amber-300 shrink-0 uppercase tracking-tight flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-amber-500/30"
        >
          <span>||| STATS</span>
        </button>
      </div>

      {/* Main Single-Screen Viewport Container */}
      <div className="relative z-10 flex-1 flex flex-col justify-between p-1.5 sm:p-2.5 max-w-5xl w-full mx-auto overflow-hidden">
        
        {/* LIVE LIGHTNING CARDS & STRIKE HUD */}
        <div className="px-2 py-1.5 rounded-xl bg-gradient-to-r from-slate-950 via-amber-950/40 to-slate-950 border border-amber-500/30 shadow-lg flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-[10px] font-black text-amber-300 font-mono">{roundId}</span>
          </div>

          {/* Phase Badge */}
          <div className="flex items-center gap-1">
            {gamePhase === 'betting' && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/20 border border-amber-400/50 rounded-lg">
                <span className="text-[10px] font-black text-amber-300">BETS:</span>
                <span className="text-xs font-black text-amber-400 font-mono animate-pulse">{countdown}s</span>
              </div>
            )}
            {gamePhase === 'lightning' && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 font-black text-[10px] rounded-lg shadow-md animate-bounce">
                <Zap className="w-3 h-3 fill-slate-950 animate-ping" />
                <span>LIGHTNING STRIKING!</span>
              </div>
            )}
            {gamePhase === 'spinning' && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 border border-blue-400/50 rounded-lg text-blue-300 text-[10px] font-black">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>BALL IN MOTION</span>
              </div>
            )}
            {gamePhase === 'settled' && winningNumber !== null && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/50 rounded-lg text-emerald-300 text-[10px] font-black animate-pulse">
                <Trophy className="w-3 h-3 text-emerald-400" />
                <span>WINNER: #{winningNumber}</span>
              </div>
            )}
          </div>

          {/* Struck Multipliers Horizontal Display */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[55%]">
            {luckyNumbers.length === 0 ? (
              <span className="text-[9px] text-amber-300/70 font-semibold italic">⚡ 50x-500x Lucky Strikes</span>
            ) : (
              luckyNumbers.map((lucky, idx) => {
                const isStruck = activeStrikes.includes(idx);
                const isWinner = winningNumber === lucky.number;
                return (
                  <div 
                    key={idx}
                    className={`px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-all duration-300 relative overflow-hidden ${
                      isStruck 
                        ? 'bg-gradient-to-r from-amber-500/40 via-yellow-400/30 to-amber-500/40 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.8)] scale-105 animate-pulse'
                        : 'bg-slate-900 border-slate-800 opacity-40'
                    } ${isWinner && gamePhase === 'settled' ? 'ring-2 ring-yellow-300 shadow-[0_0_20px_#f59e0b]' : ''}`}
                  >
                    {isStruck && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer pointer-events-none" />
                    )}
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white ${
                      lucky.color === 'red' ? 'bg-red-600' : lucky.color === 'black' ? 'bg-slate-900 border border-slate-700' : 'bg-emerald-600'
                    }`}>
                      {lucky.number}
                    </span>
                    <span className="text-[10px] font-black text-amber-300 font-mono">
                      {lucky.multiplier}x
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MIDDLE ARENA: 3D VECTOR LUXURY ROULETTE WHEEL WITH REAL ROTATION & PEARL MARBLE BALL PHYSICS */}
        <div className="flex-1 flex items-center justify-center my-0.5 relative">
          <div className="relative w-[215px] h-[215px] sm:w-[260px] sm:h-[260px] flex items-center justify-center">
            
            {/* Outer Mahogany Wood Ring with Radial Gradient & Border */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-950 via-amber-900 to-amber-950 border-4 border-amber-500/40 shadow-2xl shadow-black p-2 flex items-center justify-center">
              
              {/* Gold Pocket Ring Frame */}
              <div className="w-full h-full rounded-full bg-slate-900 border-2 border-yellow-500/50 relative overflow-hidden flex items-center justify-center">
                
                {/* Rotating Wheel Group */}
                <div
                  className="w-full h-full rounded-full relative"
                  style={{ transform: `rotate(${wheelRotation}deg)` }}
                >
                  <svg className="w-full h-full" viewBox="0 0 300 300">
                    <circle cx="150" cy="150" r="145" fill="#0f172a" stroke="#d97706" strokeWidth="2" />
                    
                    {/* Render 37 European Number Pockets */}
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
                      const lucky = luckyNumbers.find((l) => l.number === num);
                      const isStruck = lucky && activeStrikes.length > 0;
                      const isHit = highlightedPocket === num;

                      let fill = col === 'green' ? '#059669' : col === 'red' ? '#dc2626' : '#1e293b';
                      if (isStruck && gamePhase !== 'betting') {
                        fill = '#b45309'; // Lightning golden pocket glow
                      }
                      if (isHit && gamePhase === 'settled') {
                        fill = col === 'green' ? '#10b981' : col === 'red' ? '#ef4444' : '#334155';
                      }

                      // Text radial position
                      const midRad = ((angle + (360 / 37) / 2) * Math.PI) / 180;
                      const tx = 150 + 115 * Math.sin(midRad);
                      const ty = 150 - 115 * Math.cos(midRad);

                      return (
                        <g key={num}>
                          <path
                            d={`M 150 150 L ${x1} ${y1} A 140 140 0 0 1 ${x2} ${y2} Z`}
                            fill={fill}
                            stroke={isHit && gamePhase === 'settled' ? '#fef08a' : isStruck ? '#fbbf24' : '#d97706'}
                            strokeWidth={isHit && gamePhase === 'settled' ? '2.5' : isStruck ? '1.5' : '0.5'}
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

                    {/* Center Brass Spindle Turret */}
                    <circle cx="150" cy="150" r="70" fill="url(#brassGradientLightning)" stroke="#fbbf24" strokeWidth="2" />
                    <circle cx="150" cy="150" r="30" fill="#78350f" stroke="#f59e0b" strokeWidth="1" />
                    
                    <defs>
                      <radialGradient id="brassGradientLightning" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="60%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#78350f" />
                      </radialGradient>
                      <radialGradient id="marbleGradLightning" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="60%" stopColor="#f1f5f9" />
                        <stop offset="100%" stopColor="#94a3b8" />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>

                {/* Animated 3D Pearl Marble Ball Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 300 300">
                  <g id="marble-ball">
                    {/* Shadow under ball */}
                    <ellipse
                      cx={150 + (ballRadius + 2) * Math.sin((ballAngle * Math.PI) / 180)}
                      cy={150 - (ballRadius - 2) * Math.cos((ballAngle * Math.PI) / 180)}
                      rx="6"
                      ry="4"
                      fill="rgba(0,0,0,0.5)"
                    />
                    {/* White Pearl Marble Ball */}
                    <circle
                      cx={150 + ballRadius * Math.sin((ballAngle * Math.PI) / 180)}
                      cy={150 - ballRadius * Math.cos((ballAngle * Math.PI) / 180)}
                      r="6.5"
                      fill="url(#marbleGradLightning)"
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

                {/* Top Wheel Pocket Pointer & Lighting Aura */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[12px] border-t-amber-400 z-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />

              </div>
            </div>

            {/* Single Clean Center Result Popup (Appears strictly when ball settles) */}
            {gamePhase === 'settled' && winningNumber !== null && (
              <div className="absolute z-30 flex flex-col items-center justify-center animate-zoom-in pointer-events-none">
                <div className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl font-black shadow-2xl border-2 border-white ${
                  winningNumber === 0 ? 'bg-emerald-600 text-white' : RED_NUMBERS.has(winningNumber) ? 'bg-red-600 text-white' : 'bg-slate-950 text-white'
                }`}>
                  {winningNumber}
                </div>
                {hitLightningMultiplier && (
                  <span className="mt-1 px-2.5 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-[10px] font-black rounded-full shadow-lg border border-amber-200 animate-pulse">
                    ⚡ {hitLightningMultiplier}X HIT!
                  </span>
                )}
                {lastWinAmount !== null && lastWinAmount > 0 && (
                  <span className="mt-1 px-2.5 py-0.5 bg-emerald-500 text-slate-950 text-[11px] font-black rounded-md shadow-lg animate-bounce">
                    +₹{lastWinAmount.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM COMPACT BETTING GRID: Single zero + 12 columns of 3 rows + Dozens + Outside bets */}
        <div className="rounded-xl bg-slate-950/90 border border-amber-500/30 p-1.5 sm:p-2 shadow-xl shrink-0">
          
          {/* Main Grid: 0 + Numbers 1-36 */}
          <div className="grid grid-cols-13 gap-0.5 text-center">
            {/* Zero Cell */}
            <button
              onClick={() => handlePlaceBet({ kind: 'number', value: 0 }, 'Number 0')}
              disabled={gamePhase !== 'betting'}
              className="row-span-3 rounded bg-emerald-700 hover:bg-emerald-600 border border-emerald-400/50 flex flex-col items-center justify-center font-black text-white text-xs sm:text-sm shadow relative active:scale-95 transition-all disabled:opacity-75"
            >
              <span>0</span>
              {getBetOn({ kind: 'number', value: 0 }) > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[8px] font-black flex items-center justify-center shadow">
                  {getBetOn({ kind: 'number', value: 0 })}
                </div>
              )}
            </button>

            {/* Row 1: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36 */}
            {[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].map((num) => {
              const isRed = RED_NUMBERS.has(num);
              const lucky = luckyNumbers.find((l) => l.number === num);
              const betAmt = getBetOn({ kind: 'number', value: num });
              return (
                <button
                  key={num}
                  onClick={() => handlePlaceBet({ kind: 'number', value: num }, `Number ${num}`)}
                  disabled={gamePhase !== 'betting'}
                  className={`h-7 sm:h-8 rounded border flex flex-col items-center justify-center font-black text-white text-[11px] sm:text-xs relative shadow transition-all active:scale-95 disabled:opacity-80 ${
                    isRed ? 'bg-red-700 hover:bg-red-600 border-red-500/50' : 'bg-slate-900 hover:bg-slate-800 border-slate-700'
                  } ${lucky && gamePhase !== 'betting' ? 'ring-1 ring-amber-400 bg-amber-950 shadow-[0_0_8px_#f59e0b]' : ''}`}
                >
                  <span>{num}</span>
                  {lucky && gamePhase !== 'betting' && (
                    <span className="absolute bottom-0 text-[6px] font-black text-amber-300">⚡{lucky.multiplier}x</span>
                  )}
                  {betAmt > 0 && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 text-[7px] font-black flex items-center justify-center shadow">
                      {betAmt}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Row 2: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35 */}
            {[2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].map((num) => {
              const isRed = RED_NUMBERS.has(num);
              const lucky = luckyNumbers.find((l) => l.number === num);
              const betAmt = getBetOn({ kind: 'number', value: num });
              return (
                <button
                  key={num}
                  onClick={() => handlePlaceBet({ kind: 'number', value: num }, `Number ${num}`)}
                  disabled={gamePhase !== 'betting'}
                  className={`h-7 sm:h-8 rounded border flex flex-col items-center justify-center font-black text-white text-[11px] sm:text-xs relative shadow transition-all active:scale-95 disabled:opacity-80 ${
                    isRed ? 'bg-red-700 hover:bg-red-600 border-red-500/50' : 'bg-slate-900 hover:bg-slate-800 border-slate-700'
                  } ${lucky && gamePhase !== 'betting' ? 'ring-1 ring-amber-400 bg-amber-950 shadow-[0_0_8px_#f59e0b]' : ''}`}
                >
                  <span>{num}</span>
                  {lucky && gamePhase !== 'betting' && (
                    <span className="absolute bottom-0 text-[6px] font-black text-amber-300">⚡{lucky.multiplier}x</span>
                  )}
                  {betAmt > 0 && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 text-[7px] font-black flex items-center justify-center shadow">
                      {betAmt}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Row 3: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34 */}
            {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].map((num) => {
              const isRed = RED_NUMBERS.has(num);
              const lucky = luckyNumbers.find((l) => l.number === num);
              const betAmt = getBetOn({ kind: 'number', value: num });
              return (
                <button
                  key={num}
                  onClick={() => handlePlaceBet({ kind: 'number', value: num }, `Number ${num}`)}
                  disabled={gamePhase !== 'betting'}
                  className={`h-7 sm:h-8 rounded border flex flex-col items-center justify-center font-black text-white text-[11px] sm:text-xs relative shadow transition-all active:scale-95 disabled:opacity-80 ${
                    isRed ? 'bg-red-700 hover:bg-red-600 border-red-500/50' : 'bg-slate-900 hover:bg-slate-800 border-slate-700'
                  } ${lucky && gamePhase !== 'betting' ? 'ring-1 ring-amber-400 bg-amber-950 shadow-[0_0_8px_#f59e0b]' : ''}`}
                >
                  <span>{num}</span>
                  {lucky && gamePhase !== 'betting' && (
                    <span className="absolute bottom-0 text-[6px] font-black text-amber-300">⚡{lucky.multiplier}x</span>
                  )}
                  {betAmt > 0 && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 text-[7px] font-black flex items-center justify-center shadow">
                      {betAmt}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Dozens Row */}
          <div className="grid grid-cols-3 gap-1 mt-1">
            {[
              { label: '1st 12 (1-12)', value: '1st12' as const },
              { label: '2nd 12 (13-24)', value: '2nd12' as const },
              { label: '3rd 12 (25-36)', value: '3rd12' as const },
            ].map((d) => {
              const betAmt = getBetOn({ kind: 'dozen', value: d.value });
              return (
                <button
                  key={d.value}
                  onClick={() => handlePlaceBet({ kind: 'dozen', value: d.value }, d.label)}
                  disabled={gamePhase !== 'betting'}
                  className="py-1 rounded bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-[10px] font-black shadow relative active:scale-95 transition-all disabled:opacity-75"
                >
                  <span>{d.label} • 3X</span>
                  {betAmt > 0 && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 text-[7px] font-black flex items-center justify-center shadow">
                      {betAmt}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Outside Bets (1-18, EVEN, RED, BLACK, ODD, 19-36) */}
          <div className="grid grid-cols-6 gap-1 mt-1">
            {[
              { label: '1-18', type: { kind: 'range', value: '1-18' } as BetType, bg: 'bg-slate-900' },
              { label: 'EVEN', type: { kind: 'parity', value: 'even' } as BetType, bg: 'bg-slate-900' },
              { label: 'RED', type: { kind: 'color', value: 'red' } as BetType, bg: 'bg-red-700 text-white' },
              { label: 'BLACK', type: { kind: 'color', value: 'black' } as BetType, bg: 'bg-slate-950 text-white border-slate-700' },
              { label: 'ODD', type: { kind: 'parity', value: 'odd' } as BetType, bg: 'bg-slate-900' },
              { label: '19-36', type: { kind: 'range', value: '19-36' } as BetType, bg: 'bg-slate-900' },
            ].map((out, idx) => {
              const betAmt = getBetOn(out.type);
              return (
                <button
                  key={idx}
                  onClick={() => handlePlaceBet(out.type, out.label)}
                  disabled={gamePhase !== 'betting'}
                  className={`py-1 rounded border border-amber-500/30 font-black text-[10px] shadow relative active:scale-95 transition-all disabled:opacity-75 ${out.bg}`}
                >
                  <span>{out.label}</span>
                  {betAmt > 0 && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 text-[7px] font-black flex items-center justify-center shadow">
                      {betAmt}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM ACTION BAR: Clear, 2X, Re-bet + Chip Selectors + Total Bet */}
        <div className="px-2 py-1.5 rounded-xl bg-slate-950 border border-amber-500/30 shadow-2xl flex items-center justify-between gap-2 shrink-0">
          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearBets}
              disabled={gamePhase !== 'betting' || totalCurrentBet <= 0}
              className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 disabled:opacity-40 active:scale-95 shadow"
            >
              <RotateCcw className="w-3 h-3" />
              <span>CLEAR</span>
            </button>

            <button
              onClick={handleDoubleBets}
              disabled={gamePhase !== 'betting' || totalCurrentBet <= 0}
              className="px-2 py-1 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-300 text-[10px] font-black flex items-center gap-1 disabled:opacity-40 active:scale-95 shadow"
            >
              <Sparkles className="w-3 h-3" />
              <span>2X</span>
            </button>

            <button
              onClick={handleRebet}
              disabled={gamePhase !== 'betting' || lastBets.length === 0}
              className="px-2 py-1 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-300 text-[10px] font-black flex items-center gap-1 disabled:opacity-40 active:scale-95 shadow"
            >
              <RefreshCw className="w-3 h-3" />
              <span>RE-BET</span>
            </button>
          </div>

          {/* Chips */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {CHIP_VALUES.map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  soundFx.playClick();
                  setSelectedChip(chip);
                }}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full font-black text-[10px] flex items-center justify-center transition-all duration-200 shadow-md ${
                  selectedChip === chip
                    ? 'ring-2 ring-amber-300 scale-110 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                    : 'opacity-70 hover:opacity-100'
                } ${
                  chip === 10
                    ? 'bg-amber-600 text-white'
                    : chip === 50
                    ? 'bg-blue-600 text-white'
                    : chip === 100
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : chip === 500
                    ? 'bg-purple-600 text-white'
                    : chip === 1000
                    ? 'bg-rose-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                ₹{chip >= 1000 ? `${chip / 1000}k` : chip}
              </button>
            ))}
          </div>

          {/* Total Bet Display */}
          <div className="px-2 py-1 rounded-lg bg-slate-900/90 border border-amber-500/30 flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase">BET:</span>
            <span className="text-xs font-black text-amber-400 font-mono">
              ₹{totalCurrentBet.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-amber-500/40 rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h3 className="font-black text-amber-300 text-sm">Round History & Statistics</h3>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {recentHistory.map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
                >
                  <span className="font-mono text-slate-400 text-[10px]">{item.roundId}</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${
                      item.color === 'red' ? 'bg-red-600' : item.color === 'black' ? 'bg-slate-950 border border-slate-700' : 'bg-emerald-600'
                    }`}>
                      {item.number}
                    </span>
                    {item.multiplier && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black text-[9px] border border-amber-500/40">
                        ⚡ {item.multiplier}x
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HELP & RULES MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-amber-500/40 rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <h3 className="font-black text-amber-300 text-sm">Lightning Roulette Rules</h3>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2 max-h-72 overflow-y-auto">
              <p>⚡ <strong>Lightning Multipliers:</strong> In each round, 1 to 5 Lucky Numbers are struck with random multipliers from <strong>50x up to 500x</strong>.</p>
              <p>🎯 <strong>Straight-Up Bets:</strong> Bet directly on single numbers (0-36). If a winning number is a Lucky Number, you receive the Lightning Multiplier payout! Unmultiplied Straight-Up bets pay 30:1.</p>
              <p>🔴 <strong>Outside Bets:</strong> Red/Black, Even/Odd, 1-18/19-36 pay 1:1 (2x return). Dozens & Columns pay 2:1 (3x return).</p>
              <p>🛡️ <strong>Fair RNG & Instant Payouts:</strong> Certified random generation with instant wallet balance updates and Firestore sync.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

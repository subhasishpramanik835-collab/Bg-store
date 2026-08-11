import { SuperCarInfo, SuperCarColor, SuperCarDrawIssue, SuperCarConfig } from '../types';
import redCarImg from '../assets/images/red_ferrari_v12_supercar_1786381249141.jpg';
import blackCarImg from '../assets/images/black_supercar_showroom_1786334137173.jpg';
import yellowCarImg from '../assets/images/yellow_supercar_showroom_1786334154910.jpg';

export const SUPER_CARS: Record<SuperCarColor, SuperCarInfo> = {
  red: {
    id: 'red',
    name: 'Red Super Car',
    tagline: 'Ferrari V12 Turbo • Speed King',
    image: redCarImg,
    accentColor: 'from-rose-600 to-red-600',
    glowColor: 'rgba(239, 68, 68, 0.5)',
    badge: 'RED V12',
    topSpeed: '340 km/h',
    acceleration: '2.8s'
  },
  black: {
    id: 'black',
    name: 'Black Super Car',
    tagline: 'Lamborghini Stealth • Shadow Beast',
    image: blackCarImg,
    accentColor: 'from-slate-700 via-zinc-800 to-stone-900',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    badge: 'STEALTH V10',
    topSpeed: '355 km/h',
    acceleration: '2.6s'
  },
  yellow: {
    id: 'yellow',
    name: 'Yellow Super Car',
    tagline: 'McLaren GT • Lightning Fast',
    image: yellowCarImg,
    accentColor: 'from-amber-400 to-yellow-500',
    glowColor: 'rgba(234, 179, 8, 0.5)',
    badge: 'YELLOW TURBO',
    topSpeed: '348 km/h',
    acceleration: '2.7s'
  }
};

/**
 * Returns supercar info with dynamic custom overrides if configured in admin
 */
export function getSuperCarInfo(carKey: SuperCarColor, config?: SuperCarConfig): SuperCarInfo {
  const base = SUPER_CARS[carKey];
  if (!config) return base;

  const customImage = config.carImages?.[carKey];
  return {
    ...base,
    image: customImage && customImage.trim() !== '' ? customImage : base.image
  };
}

export const DEFAULT_SUPERCAR_CONFIG: SuperCarConfig = {
  enabled: true,
  ticketPrice: 100,
  prizeMultiplier: 2.8,
  carMultipliers: {
    red: 2.0,
    black: 2.8,
    yellow: 3.5
  },
  resultMode: 'auto',
  operatingStartHour: 8,  // 08:00 AM
  operatingEndHour: 22,   // 10:00 PM
  drawIntervalMinutes: 10 // 10 minutes per draw slot
};

export interface DrawScheduleInfo {
  isOpen: boolean;
  issueId: string;
  drawIndex: number;
  startTime: number;
  endTime: number;
  timeRemainingMs: number;
  isShuffling: boolean; // final 30 seconds
  nextOpenTime?: number;
}

export interface SuperCarSlotItem {
  slotNum: number;
  slotLabel: string;
  timeLabel: string;
  startTime: number;
  endTime: number;
  issueId: string;
  status: 'completed' | 'active' | 'upcoming';
  timeRemainingMs: number;
  winningCar?: SuperCarColor;
  matchedDraw?: SuperCarDrawIssue;
}

/**
 * Calculates current 10-minute draw schedule state based on operating hours (08:00 AM to 10:00 PM).
 */
export function getCurrentSuperCarSchedule(config: SuperCarConfig = DEFAULT_SUPERCAR_CONFIG): DrawScheduleInfo {
  const intervalMinutes = config.drawIntervalMinutes || 10;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const startHour = config.operatingStartHour ?? 8; // 8:00 AM
  const endHour = config.operatingEndHour ?? 22;     // 10:00 PM

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, 0, 0, 0).getTime();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, 0, 0, 0).getTime();

  const currentTime = now.getTime();

  if (currentTime < todayStart) {
    // Before 8:00 AM today
    return {
      isOpen: false,
      issueId: `CAR-${dateStr}-01`,
      drawIndex: 1,
      startTime: todayStart,
      endTime: todayStart + intervalMinutes * 60 * 1000,
      timeRemainingMs: todayStart - currentTime,
      isShuffling: false,
      nextOpenTime: todayStart
    };
  }

  if (currentTime >= todayEnd) {
    // After 10:00 PM today -> Next open is tomorrow 8:00 AM
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, startHour, 0, 0, 0).getTime();
    const tomNow = new Date(tomorrowStart);
    const tomY = tomNow.getFullYear();
    const tomM = String(tomNow.getMonth() + 1).padStart(2, '0');
    const tomD = String(tomNow.getDate()).padStart(2, '0');

    return {
      isOpen: false,
      issueId: `CAR-${tomY}${tomM}${tomD}-01`,
      drawIndex: 1,
      startTime: tomorrowStart,
      endTime: tomorrowStart + intervalMinutes * 60 * 1000,
      timeRemainingMs: tomorrowStart - currentTime,
      isShuffling: false,
      nextOpenTime: tomorrowStart
    };
  }

  // Currently operating between 08:00 AM and 10:00 PM!
  const elapsedMsSinceStart = currentTime - todayStart;
  const intervalMs = intervalMinutes * 60 * 1000;
  const drawIndex = Math.floor(elapsedMsSinceStart / intervalMs) + 1;

  const currentDrawStart = todayStart + (drawIndex - 1) * intervalMs;
  const currentDrawEnd = currentDrawStart + intervalMs;
  const timeRemainingMs = Math.max(0, currentDrawEnd - currentTime);

  const issueId = `CAR-${dateStr}-${String(drawIndex).padStart(2, '0')}`;
  const isShuffling = timeRemainingMs <= 30000 && timeRemainingMs > 0;

  return {
    isOpen: true,
    issueId,
    drawIndex,
    startTime: currentDrawStart,
    endTime: currentDrawEnd,
    timeRemainingMs,
    isShuffling
  };
}

/**
 * Returns all daily 10-minute slots (8:00 AM to 10:00 PM, 84 slots total) for UI rendering
 */
export function getSuperCarDailySlots(
  targetDate: Date = new Date(),
  pastDraws: SuperCarDrawIssue[] = [],
  config: SuperCarConfig = DEFAULT_SUPERCAR_CONFIG
): SuperCarSlotItem[] {
  const intervalMinutes = config.drawIntervalMinutes || 10;
  const startHour = config.operatingStartHour ?? 8;
  const endHour = config.operatingEndHour ?? 22;

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const dayStart = new Date(year, targetDate.getMonth(), targetDate.getDate(), startHour, 0, 0, 0).getTime();
  const totalMins = (endHour - startHour) * 60;
  const totalSlotsCount = Math.floor(totalMins / intervalMinutes); // 84 slots for 14 hours at 10 mins each

  const currentTime = Date.now();
  const slots: SuperCarSlotItem[] = [];

  for (let i = 0; i < totalSlotsCount; i++) {
    const slotNum = i + 1;
    const startTime = dayStart + i * intervalMinutes * 60 * 1000;
    const endTime = startTime + intervalMinutes * 60 * 1000;
    const issueId = `CAR-${dateStr}-${String(slotNum).padStart(2, '0')}`;

    // Format time label using target draw time (endTime) (e.g. 08:10 AM, 04:00 PM)
    const slotDate = new Date(endTime);
    const h = slotDate.getHours();
    const m = slotDate.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 === 0 ? 12 : h % 12;
    const timeLabel = `${String(formattedH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;

    let status: 'completed' | 'active' | 'upcoming' = 'upcoming';
    let timeRemainingMs = 0;

    if (currentTime >= endTime) {
      status = 'completed';
    } else if (currentTime >= startTime && currentTime < endTime) {
      status = 'active';
      timeRemainingMs = Math.max(0, endTime - currentTime);
    } else {
      status = 'upcoming';
      timeRemainingMs = Math.max(0, startTime - currentTime);
    }

    // Match past draw or manual override winner specifically for THIS issueId / dateStr
    const matchedDraw = pastDraws.find((d) => {
      if (!d) return false;
      if (d.issueId === issueId || d.id === issueId) return true;
      if (d.issueId && d.issueId.includes(dateStr) && (d.drawIndex === slotNum || d.issueId.endsWith(`-${String(slotNum).padStart(2, '0')}`))) return true;
      return false;
    });

    // Check manual override slot winner if set in config for issueId or slotNum
    const manualSlotWinner = config.manualSlotWinners?.[issueId] || config.manualSlotWinners?.[slotNum];
    
    // Auto deterministic color if not manually set in auto mode
    const autoColors: SuperCarColor[] = ['red', 'black', 'yellow'];
    const autoColor = autoColors[(slotNum * 7 + Number(dateStr)) % 3];

    const winningCar = matchedDraw?.winningCar || manualSlotWinner || (status === 'completed' && config.resultMode !== 'manual' ? autoColor : undefined);

    slots.push({
      slotNum,
      slotLabel: `SLOT #${String(slotNum).padStart(2, '0')}`,
      timeLabel,
      startTime,
      endTime,
      issueId,
      status,
      timeRemainingMs,
      winningCar,
      matchedDraw
    });
  }

  return slots;
}

/**
 * Format milliseconds into MM:SS display
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Smart sorts slots for optimal UI rendering:
 * 1. Active live draw first at top
 * 2. Completed draws next, newest completed first (descending slotNum)
 * 3. Upcoming draws last (ascending slotNum)
 */
export function sortSuperCarSlotsSmart(slots: SuperCarSlotItem[]): SuperCarSlotItem[] {
  const active = slots.filter((s) => s.status === 'active');
  const completed = slots.filter((s) => s.status === 'completed').sort((a, b) => b.slotNum - a.slotNum);
  const upcoming = slots.filter((s) => s.status === 'upcoming').sort((a, b) => a.slotNum - b.slotNum);

  return [...active, ...completed, ...upcoming];
}

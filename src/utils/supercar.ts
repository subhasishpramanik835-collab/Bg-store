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
  drawIntervalMinutes: 30
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

/**
 * Calculates current 30-minute draw schedule state based on operating hours (08:00 AM to 10:00 PM).
 */
export function getCurrentSuperCarSchedule(config: SuperCarConfig = DEFAULT_SUPERCAR_CONFIG): DrawScheduleInfo {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const startHour = config.operatingStartHour; // 8
  const endHour = config.operatingEndHour;     // 22

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
      endTime: todayStart + config.drawIntervalMinutes * 60 * 1000,
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
      endTime: tomorrowStart + config.drawIntervalMinutes * 60 * 1000,
      timeRemainingMs: tomorrowStart - currentTime,
      isShuffling: false,
      nextOpenTime: tomorrowStart
    };
  }

  // Currently operating between 08:00 AM and 10:00 PM!
  const elapsedMsSinceStart = currentTime - todayStart;
  const intervalMs = config.drawIntervalMinutes * 60 * 1000; // 30 mins = 1800000ms
  const drawIndex = Math.floor(elapsedMsSinceStart / intervalMs) + 1; // 1 to 28

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
 * Format milliseconds into MM:SS display
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

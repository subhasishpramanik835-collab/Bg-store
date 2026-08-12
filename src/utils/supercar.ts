import { SuperCarInfo, SuperCarColor, SuperCarDrawIssue, SuperCarConfig, PurchasedTicket } from '../types';
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
  drawIntervalMinutes: 10 // 10 minutes per draw slot (LIVE 10M)
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


/**
 * Returns winning car for a specific slot and issue ID
 */
export function getWinningCarForSlot(
  slotNum: number,
  issueId: string,
  pastDraws: SuperCarDrawIssue[] = [],
  config?: SuperCarConfig
): SuperCarColor {
  if (config?.resultMode === 'manual' && config?.manualWinner) {
    return config.manualWinner;
  }
  const manualSlotWinner = config?.manualSlotWinners?.[issueId] || config?.manualSlotWinners?.[slotNum];
  if (manualSlotWinner) {
    return manualSlotWinner;
  }
  const matchedDraw = pastDraws.find((d) => {
    if (!d) return false;
    if (d.issueId === issueId || d.id === issueId) return true;
    if (d.issueId && (d.drawIndex === slotNum || d.issueId.endsWith(`-${String(slotNum).padStart(2, '0')}`))) return true;
    return false;
  });
  if (matchedDraw?.winningCar) {
    return matchedDraw.winningCar;
  }
  const autoColors: SuperCarColor[] = ['red', 'black', 'yellow'];
  const dateMatch = issueId.match(/CAR-(\d{8})/);
  const dateNum = dateMatch && dateMatch[1] ? Number(dateMatch[1]) : 20260812;
  return autoColors[(slotNum * 7 + dateNum) % 3];
}

/**
 * Calculates accurate slot number, issueId, and draw expiration time for any ticket
 */
export function getSlotFromTicket(
  ticket: PurchasedTicket,
  config?: SuperCarConfig
): { slotNum: number; issueId: string; drawEndTimeMs: number; slotTimeLabel: string } {
  const createdDate = ticket.createdAt ? new Date(ticket.createdAt) : new Date();
  const year = createdDate.getFullYear();
  const month = String(createdDate.getMonth() + 1).padStart(2, '0');
  const day = String(createdDate.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const startHour = config?.operatingStartHour ?? 8;
  const intervalMins = config?.drawIntervalMinutes ?? 10;

  // If ticket explicitly has valid slotNum > 1 or matching drawId
  if (ticket.slotNum && ticket.slotNum > 0 && ticket.drawId && ticket.drawId.includes(`-${String(ticket.slotNum).padStart(2, '0')}`)) {
    const dayStart = new Date(year, createdDate.getMonth(), createdDate.getDate(), startHour, 0, 0, 0).getTime();
    const drawEndTimeMs = dayStart + ticket.slotNum * intervalMins * 60 * 1000;
    return {
      slotNum: ticket.slotNum,
      issueId: ticket.drawId,
      drawEndTimeMs,
      slotTimeLabel: String(ticket.drawTime || '10M Draw')
    };
  }

  const dayStart = new Date(year, createdDate.getMonth(), createdDate.getDate(), startHour, 0, 0, 0).getTime();
  const timeMs = createdDate.getTime();
  
  let minsFromStart = Math.floor((timeMs - dayStart) / (1000 * 60));
  if (minsFromStart < 0) minsFromStart = 0;

  const slotNum = Math.floor(minsFromStart / intervalMins) + 1;
  const issueId = `CAR-${dateStr}-${String(slotNum).padStart(2, '0')}`;
  const drawEndTimeMs = dayStart + slotNum * intervalMins * 60 * 1000;

  const slotDate = new Date(drawEndTimeMs);
  const h = slotDate.getHours();
  const m = slotDate.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedH = h % 12 === 0 ? 12 : h % 12;
  const slotTimeLabel = `${String(formattedH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;

  return {
    slotNum,
    issueId,
    drawEndTimeMs,
    slotTimeLabel
  };
}

/**
 * Format ticket exact purchase time (hh:mm:ss AM/PM)
 */
export function formatTicketExactTime(ticket: { createdAt?: string; purchaseTime?: string; purchaseDate?: string; id?: string }): string {
  if (ticket.purchaseTime && ticket.purchaseTime.trim()) return ticket.purchaseTime;
  if (ticket.createdAt) {
    const d = new Date(ticket.createdAt);
    if (!isNaN(d.getTime()) && d.getTime() > 0) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }
  }
  if (ticket.id) {
    const match = ticket.id.match(/TKT-SC-(\d+)/) || ticket.id.match(/(\d{13})/);
    if (match && match[1]) {
      const ts = parseInt(match[1], 10);
      if (!isNaN(ts) && ts > 1000000000000) {
        const d = new Date(ts);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      }
    }
  }
  return 'N/A';
}

/**
 * Format ticket exact purchase full date & time (YYYY-MM-DD hh:mm:ss AM/PM)
 */
export function formatTicketExactDateTime(ticket: { createdAt?: string; purchaseDate?: string; purchaseTime?: string; id?: string }): string {
  const timeStr = formatTicketExactTime(ticket);
  let dateStr = ticket.purchaseDate || '';
  if (!dateStr && ticket.createdAt) {
    const d = new Date(ticket.createdAt);
    if (!isNaN(d.getTime())) {
      dateStr = d.toISOString().split('T')[0];
    }
  }
  if (!dateStr && ticket.id) {
    const match = ticket.id.match(/TKT-SC-(\d+)/) || ticket.id.match(/(\d{13})/);
    if (match && match[1]) {
      const ts = parseInt(match[1], 10);
      if (!isNaN(ts) && ts > 1000000000000) {
        const d = new Date(ts);
        dateStr = d.toISOString().split('T')[0];
      }
    }
  }

  if (dateStr && timeStr && timeStr !== 'N/A') {
    return `${dateStr} ${timeStr}`;
  }
  return dateStr || timeStr || 'N/A';
}

/**
 * Extracts numeric millisecond timestamp from any transaction, ticket, or log item
 */
export function getExactTimestampMs(item: any): number {
  if (!item) return 0;

  // 1. Check numeric createdAt or timestamp
  if (typeof item.createdAt === 'number') return item.createdAt;
  if (typeof item.timestamp === 'number') return item.timestamp;

  // 2. Check string ISO createdAt or timestamp
  if (typeof item.createdAt === 'string') {
    const ms = Date.parse(item.createdAt);
    if (!isNaN(ms) && ms > 0) return ms;
  }
  if (typeof item.timestamp === 'string') {
    const ms = Date.parse(item.timestamp);
    if (!isNaN(ms) && ms > 0) return ms;
  }

  // 3. Check date or purchaseDate string or purchaseTime
  const dateStr = item.date || item.purchaseDate || item.purchaseTime;
  if (dateStr) {
    if (typeof dateStr === 'number') return dateStr;
    const ms = Date.parse(dateStr);
    if (!isNaN(ms) && ms > 0) return ms;

    // Try replacing commas e.g. "12/8/2026, 1:48:49 pm"
    try {
      const cleaned = String(dateStr).replace(/,/g, '');
      const msCleaned = Date.parse(cleaned);
      if (!isNaN(msCleaned) && msCleaned > 0) return msCleaned;
    } catch (_) {}
  }

  // 4. Extract timestamp embedded in ID (e.g. TXN-1786381249141, TKT-SC-1786381249141)
  if (item.id) {
    const matches = String(item.id).match(/\d{10,15}/);
    if (matches && matches[0]) {
      const extractedNum = Number(matches[0]);
      if (!isNaN(extractedNum) && extractedNum > 1000000000000) {
        return extractedNum;
      }
    }
  }

  return 0;
}

/**
 * Universal Chronological Sort Utility: Newest (latest) items FIRST at the top
 */
export function sortChronologicalNewestFirst<T>(items: T[]): T[] {
  if (!items || !Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const timeA = getExactTimestampMs(a);
    const timeB = getExactTimestampMs(b);
    if (timeA !== timeB) {
      return timeB - timeA; // Higher time (newer) comes first at the top
    }
    const idA = String((a as any)?.id || '');
    const idB = String((b as any)?.id || '');
    return idB.localeCompare(idA);
  });
}


export type PaymentMethodType = 'phonepe' | 'gpay' | 'paytm' | 'upi';

export type TransactionStatus = 'pending' | 'approved' | 'rejected';
export type TicketStatus = 'active' | 'win' | 'loss';

export interface UserSettings {
  bgMusicEnabled?: boolean;
  soundEffectsEnabled?: boolean;
  hapticEnabled?: boolean;
  fireFxEnabled?: boolean;
  fontSize?: 'compact' | 'normal' | 'large';
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
  bonusBalance?: number;
  avatarUrl: string;
  regDate: string;
  vipLevel: 'Bronze' | 'Silver' | 'Gold' | 'VIP Platinum';
  vipPoints?: number;
  referralCode: string;
  totalWon: number;
  totalSpent: number;
  status: 'active' | 'suspended';
  lastSpinTime?: number; // timestamp of last lucky wheel spin
  totalReferrals?: number;
  role?: 'user' | 'admin';
  settings?: UserSettings;
  isSuspicious?: boolean;
  suspiciousReason?: string;
  suspiciousDate?: string;
}

export interface RegistrationConfig {
  bonusAmount: number;
  isBonusEnabled: boolean;
  duplicateDetectionEnabled: boolean;
  updatedAt?: string;
}

export interface NotificationConfig {
  chimeSoundUrl?: string;
  chimeType?: 'bell' | 'chime' | 'fanfare';
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'ticket_buy' | 'win_payout' | 'wheel_bonus' | 'admin_bonus' | 'admin_deduction' | 'roulette_bet' | 'roulette_win' | 'vip_bonus' | 'loss' | 'win' | 'ticket_win';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed' | 'rejected';
  date: string;
  utr?: string;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  method: PaymentMethodType;
  utr: string;
  screenshotUrl: string;
  date: string;
  status: TransactionStatus;
  rejectReason?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  fullName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  date: string;
  status: TransactionStatus;
  rejectReason?: string;
}

export interface LotteryDraw {
  id: string;
  title: string;
  subtitle: string;
  category: 'Bumper' | 'Speed 1m' | 'Daily Mega' | '4D Express';
  ticketPrice: number;
  prizePool: number;
  firstPrize: number;
  secondPrize: number;
  thirdPrize: number;
  endTime: number; // Unix timestamp in ms
  drawDurationMs: number; // duration for auto-reset
  winningNumbers?: number[]; // array of winning digits/numbers
  status: 'upcoming' | 'live' | 'completed';
  totalTicketsSold: number;
  bannerGradient: string;
  badgeText: string;
}

export interface PurchasedTicket {
  id: string;
  userId: string;
  drawId: string;
  drawTitle: string;
  ticketNumber: string; // e.g. "482910" or [4,8,2,9,1,0] or "CAR-RED-8932"
  selectedNumbers: (number | string)[];
  price: number;
  purchaseDate: string;
  drawTime?: number | string;
  drawDate?: string;
  status: TicketStatus;
  wonAmount?: number;
  matchCount?: number;
  selectedCar?: 'red' | 'black' | 'yellow';
  category?: string;
}

export type SuperCarColor = 'red' | 'black' | 'yellow';

export interface SuperCarInfo {
  id: SuperCarColor;
  name: string;
  tagline: string;
  image: string;
  accentColor: string;
  glowColor: string;
  badge: string;
  topSpeed: string;
  acceleration: string;
}

export interface SuperCarDrawIssue {
  id: string; // e.g. "CAR-20260809-14"
  issueId: string;
  drawIndex?: number; // 1 to 28
  startTime?: number;
  endTime?: number;
  drawTime?: string;
  status: 'active' | 'shuffling' | 'completed' | 'closed';
  winningCar?: SuperCarColor;
  ticketPrice?: number;
  prizeMultiplier?: number;
  totalTicketsSold?: number;
  totalBets?: {
    red: number;
    black: number;
    yellow: number;
  };
  createdAt?: number;
}

export interface SuperCarConfig {
  enabled: boolean;
  ticketPrice: number;
  prizeMultiplier: number;
  resultMode: 'auto' | 'manual';
  manualWinner?: SuperCarColor;
  operatingStartHour: number; // 8 (08:00 AM)
  operatingEndHour: number;   // 22 (10:00 PM)
  drawIntervalMinutes: number; // 30
  carImages?: {
    red?: string;
    black?: string;
    yellow?: string;
  };
  carPrices?: {
    red?: number;
    black?: number;
    yellow?: number;
  };
  carMultipliers?: {
    red?: number;
    black?: number;
    yellow?: number;
  };
  lockedSlots?: number[]; // array of slot indices locked by admin
  manualSlotWinners?: Record<number, SuperCarColor>; // manual winner per slot index 1..29
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'deposit' | 'withdrawal' | 'win' | 'loss' | 'system';
  date: string;
  read: boolean;
  createdAt?: number;
  isCritical?: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingDepositsCount: number;
  pendingWithdrawalsCount: number;
  totalRevenue: number;
  totalPayouts: number;
}

export interface PaymentConfig {
  upiId: string;
  qrCodeUrl: string;
  accountName: string;
  minDeposit: number;
  maxDeposit: number;
  instructions: string;
  updatedAt?: string;
}

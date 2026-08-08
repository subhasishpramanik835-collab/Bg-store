export type PaymentMethodType = 'phonepe' | 'gpay' | 'paytm' | 'upi';

export type TransactionStatus = 'pending' | 'approved' | 'rejected';
export type TicketStatus = 'active' | 'win' | 'loss';

export interface UserSettings {
  bgMusicEnabled?: boolean;
  soundEffectsEnabled?: boolean;
  hapticEnabled?: boolean;
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
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'ticket_buy' | 'win_payout' | 'wheel_bonus' | 'admin_bonus' | 'admin_deduction' | 'roulette_bet' | 'roulette_win' | 'vip_bonus' | 'loss' | 'win';
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
  ticketNumber: string; // e.g. "482910" or [4,8,2,9,1,0]
  selectedNumbers: number[];
  price: number;
  purchaseDate: string;
  drawTime: number;
  status: TicketStatus;
  wonAmount?: number;
  matchCount?: number;
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

import { User, LotteryDraw, DepositRequest, WithdrawalRequest, PurchasedTicket, WalletTransaction, NotificationItem } from '../types';

export const INITIAL_USER: User = {
  id: 'BG-789012',
  name: 'Rahul Sharma',
  email: 'rahul.sharma@betguru.com',
  phone: '+91 98765 43210',
  balance: 5250.00,
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  regDate: '2025-11-15',
  vipLevel: 'Gold',
  referralCode: 'GURU999',
  totalWon: 18500,
  totalSpent: 8200,
  status: 'active'
};

const now = Date.now();

export const INITIAL_DRAWS: LotteryDraw[] = [
  {
    id: 'draw-bumper-101',
    title: 'BETGURU BUMPER LAKHPATI',
    subtitle: '1st Prize Guaranteed ₹1,00,000 Cash',
    category: 'Bumper',
    ticketPrice: 100,
    prizePool: 500000,
    firstPrize: 100000,
    secondPrize: 25000,
    thirdPrize: 5000,
    endTime: now + 8 * 60 * 1000 + 45 * 1000, // ~8 mins from now
    drawDurationMs: 15 * 60 * 1000, // 15 mins repeat
    status: 'live',
    totalTicketsSold: 428,
    bannerGradient: 'from-amber-600 via-yellow-500 to-amber-700',
    badgeText: '🔥 HOT BUMPER'
  },
  {
    id: 'draw-speed-777',
    title: 'GOLDEN 777 SPEED EXPRESS',
    subtitle: 'Lightning Draw - Winner Every 3 Minutes!',
    category: 'Speed 1m',
    ticketPrice: 20,
    prizePool: 25000,
    firstPrize: 10000,
    secondPrize: 2500,
    thirdPrize: 500,
    endTime: now + 2 * 60 * 1000 + 15 * 1000, // ~2 mins from now
    drawDurationMs: 3 * 60 * 1000, // 3 mins repeat
    status: 'live',
    totalTicketsSold: 1142,
    bannerGradient: 'from-emerald-600 via-teal-500 to-emerald-800',
    badgeText: '⚡ SPEED DRAW'
  },
  {
    id: 'draw-mega-crore',
    title: 'MEGA CROREPATI DRAWS',
    subtitle: 'Grand Weekly Jackpot ₹10,00,000',
    category: 'Daily Mega',
    ticketPrice: 500,
    prizePool: 2500000,
    firstPrize: 1000000,
    secondPrize: 200000,
    thirdPrize: 50000,
    endTime: now + 4 * 3600 * 1000, // ~4 hours from now
    drawDurationMs: 24 * 3600 * 1000,
    status: 'live',
    totalTicketsSold: 890,
    bannerGradient: 'from-purple-800 via-yellow-600 to-amber-900',
    badgeText: '👑 GRAND JACKPOT'
  },
  {
    id: 'draw-4d-pick',
    title: '3D/4D LUCKY DIGIT PICK',
    subtitle: 'Pick 4 Lucky Numbers & Win 500X Multiplier',
    category: '4D Express',
    ticketPrice: 50,
    prizePool: 100000,
    firstPrize: 50000,
    secondPrize: 10000,
    thirdPrize: 2000,
    endTime: now + 12 * 60 * 1000,
    drawDurationMs: 20 * 60 * 1000,
    status: 'live',
    totalTicketsSold: 312,
    bannerGradient: 'from-cyan-700 via-blue-600 to-indigo-900',
    badgeText: '🎯 500X WIN'
  }
];

export const INITIAL_DEPOSITS: DepositRequest[] = [
  {
    id: 'DEP-9021',
    userId: 'BG-789012',
    userName: 'Rahul Sharma',
    userPhone: '+91 98765 43210',
    amount: 2000,
    method: 'phonepe',
    utr: '423189071234',
    screenshotUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80',
    date: new Date(Date.now() - 3600000 * 5).toLocaleString('en-IN'),
    status: 'approved'
  },
  {
    id: 'DEP-9022',
    userId: 'BG-789012',
    userName: 'Rahul Sharma',
    userPhone: '+91 98765 43210',
    amount: 1000,
    method: 'gpay',
    utr: '512984018273',
    screenshotUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80',
    date: new Date(Date.now() - 3600000 * 2).toLocaleString('en-IN'),
    status: 'approved'
  },
  {
    id: 'DEP-9023',
    userId: 'BG-109283',
    userName: 'Vikram Singh',
    userPhone: '+91 91234 56789',
    amount: 5000,
    method: 'upi',
    utr: '901284716253',
    screenshotUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80',
    date: new Date(Date.now() - 1800000).toLocaleString('en-IN'),
    status: 'pending'
  }
];

export const INITIAL_WITHDRAWALS: WithdrawalRequest[] = [
  {
    id: 'WTH-4012',
    userId: 'BG-789012',
    userName: 'Rahul Sharma',
    userPhone: '+91 98765 43210',
    amount: 1500,
    fullName: 'Rahul Sharma',
    accountNumber: '918237461928',
    ifscCode: 'SBIN0004921',
    upiId: 'rahul@upi',
    date: new Date(Date.now() - 3600000 * 24).toLocaleString('en-IN'),
    status: 'approved'
  },
  {
    id: 'WTH-4013',
    userId: 'BG-304912',
    userName: 'Aman Patel',
    userPhone: '+91 98111 22233',
    amount: 3000,
    fullName: 'Aman Patel',
    accountNumber: '501002938475',
    ifscCode: 'HDFC0001234',
    upiId: 'aman@paytm',
    date: new Date(Date.now() - 3600000 * 1).toLocaleString('en-IN'),
    status: 'pending'
  }
];

export const INITIAL_TICKETS: PurchasedTicket[] = [
  {
    id: 'TCK-882190',
    userId: 'BG-789012',
    drawId: 'draw-speed-777',
    drawTitle: 'GOLDEN 777 SPEED EXPRESS',
    ticketNumber: '7 7 2 9',
    selectedNumbers: [7, 7, 2, 9],
    price: 20,
    purchaseDate: new Date(Date.now() - 1800000).toLocaleString('en-IN'),
    drawTime: now - 900000,
    status: 'win',
    wonAmount: 500,
    matchCount: 3
  },
  {
    id: 'TCK-882191',
    userId: 'BG-789012',
    drawId: 'draw-bumper-101',
    drawTitle: 'BETGURU BUMPER LAKHPATI',
    ticketNumber: '4 8 2 9 1 0',
    selectedNumbers: [4, 8, 2, 9, 1, 0],
    price: 100,
    purchaseDate: new Date(Date.now() - 600000).toLocaleString('en-IN'),
    drawTime: now + 8 * 60 * 1000 + 45 * 1000,
    status: 'active'
  }
];

export const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'TXN-101',
    userId: 'BG-789012',
    type: 'deposit',
    amount: 2000,
    description: 'Deposit via PhonePe (UTR: 423189071234)',
    status: 'completed',
    date: new Date(Date.now() - 3600000 * 5).toLocaleString('en-IN')
  },
  {
    id: 'TXN-102',
    userId: 'BG-789012',
    type: 'ticket_buy',
    amount: -100,
    description: 'Ticket Purchase - BETGURU BUMPER LAKHPATI',
    status: 'completed',
    date: new Date(Date.now() - 600000).toLocaleString('en-IN')
  },
  {
    id: 'TXN-103',
    userId: 'BG-789012',
    type: 'win_payout',
    amount: 500,
    description: 'Prize Won - GOLDEN 777 SPEED EXPRESS',
    status: 'completed',
    date: new Date(Date.now() - 900000).toLocaleString('en-IN')
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'NTF-1',
    userId: 'BG-789012',
    title: '🎉 Congratulations! You Won ₹500',
    message: 'Your ticket 7-7-2-9 matched 3 numbers in Golden 777 Speed Express!',
    type: 'win',
    date: '10 mins ago',
    read: false
  },
  {
    id: 'NTF-2',
    userId: 'BG-789012',
    title: '✅ Deposit Approved (₹2,000)',
    message: 'Your PhonePe deposit request with UTR 423189071234 was verified and added to wallet.',
    type: 'deposit',
    date: '5 hours ago',
    read: true
  },
  {
    id: 'NTF-3',
    userId: 'BG-789012',
    title: '🚀 Bumper Mega Draw live now!',
    message: 'BETGURU Lakhpati Bumper 1st Prize ₹1,00,000 is open now. Buy your lucky ticket now!',
    type: 'system',
    date: '1 day ago',
    read: true
  }
];

export const LIVE_WINNERS_FEED = [
  { name: 'Amit K.', amount: 25000, drawName: 'BUMPER LAKHPATI', time: '1 min ago' },
  { name: 'Sandeep V.', amount: 5000, drawName: 'GOLDEN 777 EXPRESS', time: '3 mins ago' },
  { name: 'Priya M.', amount: 100000, drawName: 'MEGA CROREPATI', time: '6 mins ago' },
  { name: 'Karan R.', amount: 2000, drawName: '3D LUCKY PICK', time: '8 mins ago' },
  { name: 'Vijay S.', amount: 10000, drawName: 'GOLDEN 777 EXPRESS', time: '12 mins ago' }
];

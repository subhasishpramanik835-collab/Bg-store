import React, { useState } from 'react';
import { 
  Sparkles, Lock, Mail, User, Phone, ArrowRight, AlertCircle, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { soundFx } from '../utils/audio';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Auth Handler
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      soundFx.playClick();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Sync user profile in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const newUserDoc = {
          id: user.uid,
          name: user.displayName || 'BETGURU Player',
          phone: user.phoneNumber || '+91 9876543210',
          email: user.email || '',
          avatarUrl: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          balance: 100, // Welcome Bonus
          totalWon: 0,
          totalSpent: 0,
          referralCode: `BG${Math.floor(100000 + Math.random() * 900000)}`,
          totalReferrals: 0,
          lastSpinTime: 0,
          status: 'active',
          role: 'user'
        };
        await setDoc(userRef, newUserDoc);
      } else {
        if (user.photoURL) {
          await setDoc(userRef, { avatarUrl: user.photoURL }, { merge: true });
        }
      }

      soundFx.playCoin();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      soundFx.playClick();

      if (mode === 'login') {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Ensure user document exists in Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const newUserDoc = {
            id: user.uid,
            name: user.displayName || email.split('@')[0],
            phone: phone || '+91 9876543210',
            email: email,
            balance: 100,
            totalWon: 0,
            totalSpent: 0,
            referralCode: `BG${Math.floor(100000 + Math.random() * 900000)}`,
            totalReferrals: 0,
            lastSpinTime: 0,
            status: 'active',
            role: 'user'
          };
          await setDoc(userRef, newUserDoc);
        }
      } else {
        // Signup
        if (!name.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        await updateProfile(user, { displayName: name });

        const newUserDoc = {
          id: user.uid,
          name: name,
          phone: phone || '+91 9876543210',
          email: email,
          balance: 100, // ₹100 Free Welcome Bonus
          totalWon: 0,
          totalSpent: 0,
          referralCode: `BG${Math.floor(100000 + Math.random() * 900000)}`,
          totalReferrals: 0,
          lastSpinTime: 0,
          status: 'active',
          role: 'user'
        };

        await setDoc(doc(db, 'users', user.uid), newUserDoc);
      }

      soundFx.playCoin();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Auth Error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password credentials.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already registered. Please login.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Glow Backdrops */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative z-10 backdrop-blur-xl">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/40 px-3.5 py-1 rounded-full text-amber-300 text-xs font-mono font-bold">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>INDIA'S #1 HD LOTTERY</span>
          </div>

          <h1 className="text-3xl font-black text-white font-mono tracking-wider">
            BETGURU <span className="text-amber-400">LOTTERY</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Sign in or create an account to start playing & winning real cash!
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 font-mono text-xs font-bold">
          <button
            type="button"
            onClick={() => { soundFx.playClick(); setMode('login'); setError(null); }}
            className={`py-2.5 rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            LOGIN
          </button>
          <button
            type="button"
            onClick={() => { soundFx.playClick(); setMode('signup'); setError(null); }}
            className={`py-2.5 rounded-xl transition-all ${
              mode === 'signup'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            REGISTER (FREE ₹100)
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm font-mono rounded-2xl border border-slate-800 hover:border-amber-500/40 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-95 shadow-md"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>CONTINUE WITH GOOGLE</span>
        </button>

        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-slate-800 w-full"></div>
          <span className="bg-slate-900 px-3 text-[10px] text-slate-500 font-mono uppercase font-bold absolute">OR EMAIL</span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'signup' && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">Mobile Number (For Withdrawals)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono transition-all"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm font-mono rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">PROCESSING...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'SIGN IN NOW' : 'CREATE ACCOUNT (+₹100)'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>256-Bit SSL Encrypted & Firebase Protected</span>
        </div>

      </div>
    </div>
  );
};

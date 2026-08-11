import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export interface SmtpConfig {
  email: string;
  appPasswordEncrypted: string;
  senderName: string;
  host: string;
  port: number;
}

/**
 * Retrieves the active primary SMTP account configured by Admin in Firestore.
 */
export async function getActiveSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const q = collection(db, 'smtp_accounts');
    const snap = await getDocs(q);
    if (snap.empty) return null;

    let primaryAcc: any = null;
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.isPrimaryOtpSender) {
        primaryAcc = data;
      } else if (!primaryAcc) {
        primaryAcc = data;
      }
    });

    if (primaryAcc && primaryAcc.email && primaryAcc.appPasswordEncrypted) {
      return {
        email: primaryAcc.email,
        appPasswordEncrypted: primaryAcc.appPasswordEncrypted,
        senderName: primaryAcc.senderName || 'BETGURU Security Team',
        host: primaryAcc.host || 'smtp.gmail.com',
        port: Number(primaryAcc.port) || 587
      };
    }
  } catch (err) {
    console.warn('Error fetching SMTP config from Firestore:', err);
  }
  return null;
}

/**
 * Sends a standard email via the backend /api/send-email route.
 */
export async function sendSmtpEmail({
  to,
  subject,
  html,
  text
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  try {
    if (!to || !to.includes('@')) return false;
    const smtp = await getActiveSmtpConfig();
    if (!smtp) {
      console.warn('No active SMTP account configured in Admin Panel.');
      return false;
    }

    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject,
        html,
        text,
        smtp: {
          email: smtp.email,
          appPassword: smtp.appPasswordEncrypted,
          senderName: smtp.senderName,
          host: smtp.host,
          port: smtp.port
        }
      })
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('Error sending SMTP email:', err);
    return false;
  }
}

/**
 * Sends an OTP email via the backend /api/send-otp route.
 */
export async function sendSmtpOtp({
  email,
  otp,
  name,
  type = 'registration'
}: {
  email: string;
  otp: string;
  name?: string;
  type?: 'registration' | 'security';
}): Promise<boolean> {
  const smtp = await getActiveSmtpConfig();
  if (!smtp) {
    throw new Error('Gmail SMTP not configured! Admin must add and set a Primary SMTP Account in Admin Panel.');
  }

  const res = await fetch('/api/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      otp,
      name,
      type,
      smtp: {
        email: smtp.email,
        appPassword: smtp.appPasswordEncrypted,
        senderName: smtp.senderName,
        host: smtp.host,
        port: smtp.port
      }
    })
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to dispatch OTP verification email.');
  }
  return true;
}

/* ====================================================================
   REAL-TIME NOTIFICATION HELPERS (DEPOSIT, BONUS, WITHDRAWAL)
   ==================================================================== */

export async function notifyDepositSubmitted(email: string, userName: string, amount: number, method: string, utr: string) {
  return sendSmtpEmail({
    to: email,
    subject: `⏳ BETGURU Deposit Received: ₹${amount.toLocaleString('en-IN')}`,
    html: `
      <div style="font-family: sans-serif; background: #020617; color: #f8fafc; padding: 28px; border-radius: 20px; border: 1px solid #3b82f6; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #60a5fa; font-size: 22px; margin-top: 0;">Deposit Request Pending Verification</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your deposit request of <strong>₹${amount.toLocaleString('en-IN')}</strong> via <strong>${method.toUpperCase()}</strong> (UTR: <code style="background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #fbbf24;">${utr}</code>) has been submitted successfully.</p>
        <div style="background: #0f172a; padding: 14px; border-radius: 12px; border-left: 4px solid #3b82f6; margin: 16px 0;">
          <p style="margin:0; font-size: 13px; color: #cbd5e1;">Status: <strong>PENDING ADMIN VERIFICATION</strong></p>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">Funds will be credited to your wallet balance automatically once verified by our security team.</p>
      </div>
    `
  });
}

export async function notifyDepositApproved(email: string, userName: string, amount: number) {
  return sendSmtpEmail({
    to: email,
    subject: `✅ BETGURU Deposit Approved! ₹${amount.toLocaleString('en-IN')} Credited`,
    html: `
      <div style="font-family: sans-serif; background: #020617; color: #f8fafc; padding: 28px; border-radius: 20px; border: 1px solid #10b981; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #34d399; font-size: 22px; margin-top: 0;">Deposit Approved & Wallet Updated!</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Great news! Your deposit of <strong>₹${amount.toLocaleString('en-IN')}</strong> has been verified and credited to your wallet.</p>
        <div style="background: #0f172a; padding: 16px; border-radius: 12px; border-left: 4px solid #10b981; margin: 16px 0; font-size: 18px; font-weight: bold; color: #fbbf24;">
          + ₹${amount.toLocaleString('en-IN')} Added to Balance
        </div>
        <p style="font-size: 13px; color: #cbd5e1;">Log in to BETGURU Lottery to buy tickets and participate in live draws!</p>
      </div>
    `
  });
}

export async function notifyDepositRejected(email: string, userName: string, amount: number, reason: string) {
  return sendSmtpEmail({
    to: email,
    subject: `❌ BETGURU Deposit Update: ₹${amount.toLocaleString('en-IN')} Rejected`,
    html: `
      <div style="font-family: sans-serif; background: #020617; color: #f8fafc; padding: 28px; border-radius: 20px; border: 1px solid #ef4444; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #f87171; font-size: 22px; margin-top: 0;">Deposit Verification Failed</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your deposit request of <strong>₹${amount.toLocaleString('en-IN')}</strong> could not be verified.</p>
        <div style="background: #0f172a; padding: 14px; border-radius: 12px; border-left: 4px solid #ef4444; margin: 16px 0;">
          <p style="margin:0; font-size: 13px; color: #fca5a5;">Reason: <strong>${reason}</strong></p>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">Please verify your UTR and payment screenshot and try re-uploading.</p>
      </div>
    `
  });
}

export async function notifyWithdrawalSubmitted(email: string, userName: string, amount: number, accountLast4: string) {
  return sendSmtpEmail({
    to: email,
    subject: `⏳ BETGURU Withdrawal Request Received: ₹${amount.toLocaleString('en-IN')}`,
    html: `
      <div style="font-family: sans-serif; background: #020617; color: #f8fafc; padding: 28px; border-radius: 20px; border: 1px solid #eab308; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #facc15; font-size: 22px; margin-top: 0;">Withdrawal Submitted</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your withdrawal request of <strong>₹${amount.toLocaleString('en-IN')}</strong> to account ending in <strong>••••${accountLast4}</strong> is being processed.</p>
        <div style="background: #0f172a; padding: 14px; border-radius: 12px; border-left: 4px solid #eab308; margin: 16px 0;">
          <p style="margin:0; font-size: 13px; color: #fef08a;">Status: <strong>PROCESSING (Payout Team)</strong></p>
        </div>
      </div>
    `
  });
}

export async function notifyWithdrawalApproved(email: string, userName: string, amount: number, accountNumber: string) {
  return sendSmtpEmail({
    to: email,
    subject: `✅ BETGURU Payout Sent! ₹${amount.toLocaleString('en-IN')} Approved`,
    html: `
      <div style="font-family: sans-serif; background: #020617; color: #f8fafc; padding: 28px; border-radius: 20px; border: 1px solid #10b981; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #34d399; font-size: 22px; margin-top: 0;">Withdrawal Approved & Transferred!</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your withdrawal of <strong>₹${amount.toLocaleString('en-IN')}</strong> has been approved and transferred to bank account / UPI <strong>${accountNumber}</strong>.</p>
        <div style="background: #0f172a; padding: 16px; border-radius: 12px; border-left: 4px solid #10b981; margin: 16px 0; font-size: 18px; font-weight: bold; color: #34d399;">
          ₹${amount.toLocaleString('en-IN')} Dispatched Successfully
        </div>
      </div>
    `
  });
}

export async function notifyWithdrawalRejected(email: string, userName: string, amount: number, reason: string) {
  return sendSmtpEmail({
    to: email,
    subject: `❌ BETGURU Withdrawal Rejected & Refunded: ₹${amount.toLocaleString('en-IN')}`,
    html: `
      <div style="font-family: sans-serif; background: #020617; color: #f8fafc; padding: 28px; border-radius: 20px; border: 1px solid #ef4444; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #f87171; font-size: 22px; margin-top: 0;">Withdrawal Request Rejected</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your withdrawal of <strong>₹${amount.toLocaleString('en-IN')}</strong> was rejected by the admin team.</p>
        <div style="background: #0f172a; padding: 14px; border-radius: 12px; border-left: 4px solid #ef4444; margin: 16px 0;">
          <p style="margin:0; font-size: 13px; color: #fca5a5;">Reason: <strong>${reason}</strong></p>
        </div>
        <p style="color: #34d399; font-weight: bold;">₹${amount.toLocaleString('en-IN')} has been refunded back to your wallet balance.</p>
      </div>
    `
  });
}

export async function notifyBonusCredited(email: string, userName: string, bonusAmount: number, bonusTitle: string) {
  return sendSmtpEmail({
    to: email,
    subject: `🎉 BETGURU Bonus Alert! ₹${bonusAmount.toLocaleString('en-IN')} Credited`,
    html: `
      <div style="font-family: sans-serif; background: #020617; color: #f8fafc; padding: 28px; border-radius: 20px; border: 1px solid #f59e0b; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #fbbf24; font-size: 22px; margin-top: 0;">Bonus Cash Credited!</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>You have received a bonus reward: <strong>${bonusTitle}</strong></p>
        <div style="background: #0f172a; padding: 16px; border-radius: 12px; border-left: 4px solid #f59e0b; margin: 16px 0; font-size: 20px; font-weight: bold; color: #fbbf24;">
          + ₹${bonusAmount.toLocaleString('en-IN')} Bonus Added
        </div>
        <p style="font-size: 12px; color: #cbd5e1;">Use your bonus to enter draws and spin the Lucky Wheel on BETGURU!</p>
      </div>
    `
  });
}

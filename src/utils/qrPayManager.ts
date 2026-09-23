import QRCode from 'qrcode';
import { User, QrTransaction, QrPayPayload, CreditTransaction } from '../types';
import { 
  extractNumericId, 
  getUserCreditBalance, 
  formatCreditDate, 
  getStoredCreditTransactions, 
  saveCreditTransactions 
} from './creditManager';

const STORAGE_KEY_QR_TRANSACTIONS = 'sahaya_qr_transactions';
const STORAGE_KEY_BALANCES = 'sahaya_user_credit_balances';

/**
 * Generate 6-digit payment authorization code for user
 */
export const generateUserPayCode = (user: User): string => {
  const numericId = extractNumericId(user.nicNumber || user.userId || '123456');
  // Seed with digits and modulo to produce stable 6-digit base or dynamic code
  const last4 = numericId.slice(-4) || '7890';
  const salt = (Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % 89 + 10).toString(); // Daily salt
  const combined = (parseInt(last4 + salt, 10) % 900000 + 100000).toString();
  return combined;
};

/**
 * Encode payload for Sahaya QR Code
 */
export const createQrPayPayloadString = (
  user: User,
  fixedAmount?: number
): string => {
  const numericId = extractNumericId(user.nicNumber || user.userId || '');
  const payCode = generateUserPayCode(user);
  
  const payload: QrPayPayload = {
    type: 'SAHAYA_PAY',
    userId: user.id || user.userId || 'usr_unknown',
    numericId,
    name: user.name || 'පරිශීලක',
    phone: user.phone || '',
    fixedAmount: fixedAmount && fixedAmount > 0 ? fixedAmount : undefined,
    payCode,
    timestamp: Date.now(),
  };

  return JSON.stringify(payload);
};

/**
 * Generate QR Code as Base64 Data URL
 */
export const generateQrDataUrl = async (text: string): Promise<string> => {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR Data URL:', err);
    return '';
  }
};

/**
 * Parse Scanned QR string or text input
 */
export const parseScannedQrPayload = (
  scannedText: string
): {
  isValid: boolean;
  recipientUserId?: string;
  recipientNumericId?: string;
  recipientName?: string;
  recipientPhone?: string;
  fixedAmount?: number;
  payCode?: string;
  rawText: string;
  error?: string;
} => {
  if (!scannedText) {
    return { isValid: false, rawText: '', error: 'හිස් QR කේතයක්' };
  }

  const trimmed = scannedText.trim();

  // Case 1: JSON payload
  try {
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed) as QrPayPayload;
      if (parsed.type === 'SAHAYA_PAY' || parsed.userId) {
        return {
          isValid: true,
          recipientUserId: parsed.userId,
          recipientNumericId: parsed.numericId || extractNumericId(parsed.userId),
          recipientName: parsed.name,
          recipientPhone: parsed.phone,
          fixedAmount: parsed.fixedAmount,
          payCode: parsed.payCode,
          rawText: trimmed,
        };
      }
    }
  } catch {
    // Continue to next check
  }

  // Case 2: Colon delimited format "SAHAYA_PAY:userId:numericId:phone:name:payCode[:amount]"
  if (trimmed.startsWith('SAHAYA_PAY:')) {
    const parts = trimmed.split(':');
    return {
      isValid: true,
      recipientUserId: parts[1] || '',
      recipientNumericId: parts[2] || '',
      recipientPhone: parts[3] || '',
      recipientName: decodeURIComponent(parts[4] || 'සහය සාමාජිකයා'),
      payCode: parts[5] || '',
      fixedAmount: parts[6] ? parseFloat(parts[6]) : undefined,
      rawText: trimmed,
    };
  }

  // Case 3: 6-Digit Pay Code or Phone number or NIC
  const cleanDigits = trimmed.replace(/[^0-9]/g, '');
  if (cleanDigits.length >= 6) {
    return {
      isValid: true,
      recipientNumericId: cleanDigits,
      recipientPhone: cleanDigits.length === 10 ? cleanDigits : undefined,
      payCode: cleanDigits.length === 6 ? cleanDigits : undefined,
      rawText: trimmed,
    };
  }

  return {
    isValid: false,
    rawText: trimmed,
    error: 'වලංගු සහය සේවා QR කේතයක් නොවේ (Invalid Sahaya Pay QR)',
  };
};

/**
 * Get all stored QR Transactions
 */
export const getStoredQrTransactions = (): QrTransaction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QR_TRANSACTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Error reading stored QR transactions:', err);
  }
  return [];
};

/**
 * Save QR Transactions
 */
export const saveQrTransactionsToStorage = (txs: QrTransaction[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_QR_TRANSACTIONS, JSON.stringify(txs));
  } catch (err) {
    console.warn('Error saving QR transactions:', err);
  }
};

/**
 * Process QR Wallet Payment Settlement
 */
export const executeQrWalletPayment = (
  payer: User,
  payee: {
    userId: string;
    numericId?: string;
    name: string;
    phone?: string;
  },
  amount: number,
  purpose: string = 'භාණ්ඩ / සේවා ගෙවීම (QR Settlement)',
  paymentCode?: string
): {
  success: boolean;
  qrTransaction?: QrTransaction;
  payerNewBalance?: number;
  payeeNewBalance?: number;
  error?: string;
} => {
  if (!payer) {
    return { success: false, error: 'ගෙවීම් සිදුකරන්නාගේ ගිණුම හඳුනාගත නොහැක.' };
  }

  const cleanAmount = Number(amount);
  if (isNaN(cleanAmount) || cleanAmount <= 0) {
    return { success: false, error: 'කරුණාකර වලංගු ගෙවීම් මුදලක් (LKR) ඇතුළත් කරන්න.' };
  }

  const payerBalance = getUserCreditBalance(payer);
  if (payerBalance < cleanAmount) {
    return {
      success: false,
      error: `ඔබගේ Wallet ශේෂය ප්‍රමාණවත් නොවේ. ගෙවීමට අවශ්‍ය මුදල රු. ${cleanAmount.toFixed(2)} කි. ඔබගේ දැනට ශේෂය රු. ${payerBalance.toFixed(2)} කි. කරුණාකර මුදල් තැන්පත් කරන්න.`,
    };
  }

  const payerNumericId = extractNumericId(payer.nicNumber || payer.userId);
  const payerIdKey = payer.id || payer.userId;

  const payeeNumericId = payee.numericId || extractNumericId(payee.userId || payee.phone);
  const payeeIdKey = payee.userId || payeeNumericId;

  // Prevent paying to oneself
  if (
    (payerIdKey && payeeIdKey && payerIdKey === payeeIdKey) ||
    (payerNumericId && payeeNumericId && payerNumericId === payeeNumericId)
  ) {
    return {
      success: false,
      error: 'තමන්ගේම QR කේතය සඳහා තමන්ටම මුදල් ගෙවිය නොහැක.',
    };
  }

  // Load balances map
  let balancesMap: Record<string, number> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BALANCES);
    if (raw) balancesMap = JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading balances:', e);
  }

  const payerNewBalance = Number((payerBalance - cleanAmount).toFixed(2));
  
  // Calculate payee current balance
  const payeeCurrentBalance = balancesMap[payeeNumericId] ?? balancesMap[payeeIdKey] ?? 100;
  const payeeNewBalance = Number((payeeCurrentBalance + cleanAmount).toFixed(2));

  // Update Balances
  balancesMap[payerNumericId] = payerNewBalance;
  if (payerIdKey) balancesMap[payerIdKey] = payerNewBalance;

  balancesMap[payeeNumericId] = payeeNewBalance;
  if (payeeIdKey) balancesMap[payeeIdKey] = payeeNewBalance;

  try {
    localStorage.setItem(STORAGE_KEY_BALANCES, JSON.stringify(balancesMap));
  } catch (err) {
    console.warn('Failed to save updated balances:', err);
  }

  const now = Date.now();
  const dateFormatted = formatCreditDate(new Date(now));
  const referenceNo = `#QR-PAY-${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Create QR Transaction Record
  const qrTx: QrTransaction = {
    id: `qrtx_${now}_${Math.floor(Math.random() * 1000)}`,
    referenceNo,
    payerId: payerIdKey,
    payerNumericId,
    payerName: payer.name || 'පරිශීලක',
    payerPhone: payer.phone,
    payeeId: payeeIdKey,
    payeeNumericId,
    payeeName: payee.name || 'සහය සාමාජිකයා',
    payeePhone: payee.phone,
    amount: cleanAmount,
    purpose: purpose || 'භාණ්ඩ / සේවා QR ගෙවීම',
    paymentCode: paymentCode || generateUserPayCode(payer),
    timestamp: dateFormatted,
    timestampMs: now,
    status: 'completed',
    payerBalanceAfter: payerNewBalance,
    payeeBalanceAfter: payeeNewBalance,
  };

  // Save to QR transactions
  const existingQrTxs = getStoredQrTransactions();
  saveQrTransactionsToStorage([qrTx, ...existingQrTxs]);

  // 2. Create standard CreditTransactions for both sides so they appear in Wallet History
  const payerCreditTx: CreditTransaction = {
    id: `tx_qr_sent_${now}`,
    userId: payerIdKey,
    userNumericId: payerNumericId,
    userName: payer.name,
    userNic: payer.nicNumber,
    userPhone: payer.phone,
    amount: -cleanAmount,
    type: 'admin_adjustment',
    title: `QR ගෙවීම (ගෙවන ලදි) - ${payee.name}`,
    description: `Ref: ${referenceNo} | ලබන්නා: ${payee.name} (${payee.phone || payeeNumericId}) | හේතුව: ${purpose}`,
    timestamp: dateFormatted,
    timestampMs: now,
    balanceAfter: payerNewBalance,
  };

  const payeeCreditTx: CreditTransaction = {
    id: `tx_qr_rcvd_${now}`,
    userId: payeeIdKey,
    userNumericId: payeeNumericId,
    userName: payee.name,
    userPhone: payee.phone,
    amount: cleanAmount,
    type: 'deposit',
    title: `QR ගෙවීමක් ලැබුණි (Received) - ${payer.name}`,
    description: `Ref: ${referenceNo} | ගෙවන්නා: ${payer.name} (${payer.phone || payerNumericId}) | හේතුව: ${purpose}`,
    timestamp: dateFormatted,
    timestampMs: now,
    balanceAfter: payeeNewBalance,
  };

  const allCreditTxs = getStoredCreditTransactions();
  saveCreditTransactions([payerCreditTx, payeeCreditTx, ...allCreditTxs]);

  // Play audio sound if supported
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {
    // Ignore audio error
  }

  return {
    success: true,
    qrTransaction: qrTx,
    payerNewBalance,
    payeeNewBalance,
  };
};

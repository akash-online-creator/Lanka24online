import QRCode from 'qrcode';
import { User, QrTransaction, QrPayPayload, CreditTransaction } from '../types';
import { 
  extractNumericId, 
  getUserCreditBalance, 
  formatCreditDate, 
  getStoredCreditTransactions, 
  saveCreditTransactions 
} from './creditManager';
import { initialUsers } from '../data/initialData';
import { filterNonDeletedUsers } from './deletedPostsManager';

const STORAGE_KEY_QR_TRANSACTIONS = 'sahaya_qr_transactions';
const STORAGE_KEY_BALANCES = 'sahaya_user_credit_balances';

/**
 * Generate 6-digit payment authorization code for user
 */
export const generateUserPayCode = (user?: User | null): string => {
  if (!user) return '123456';
  const numericId = extractNumericId(user.nicNumber || user.userId || '123456');
  // Generate deterministic, recognizable 6-digit pay code based on user's numeric ID
  const last4 = numericId.slice(-4) || '1234';
  const first2 = numericId.slice(0, 2) || '98';
  return `${first2}${last4}`.slice(0, 6).padEnd(6, '0');
};

/**
 * Encode payload for Sahaya QR Code
 */
export const createQrPayPayloadString = (
  user?: User | null,
  fixedAmount?: number
): string => {
  if (!user) return '';
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
    if (!text) return '';
    const dataUrl = await QRCode.toDataURL(text, {
      width: 360,
      margin: 2,
      color: {
        dark: '#004d30',
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
 * Search and find a user by ID, Numeric ID, NIC, Phone number, or Pay Code
 */
export const findUserForQrPayment = (
  queryText: string,
  allUsersList: User[] = []
): User | null => {
  if (!queryText) return null;
  const rawQuery = queryText.trim();
  const lowerQuery = rawQuery.toLowerCase();
  const digitsOnly = rawQuery.replace(/[^0-9]/g, '');

  // 1. Gather all potential users (provided list + localStorage + initial seed data)
  let localUsers: User[] = [];
  try {
    const raw = localStorage.getItem('sahaya_users');
    if (raw) {
      localUsers = JSON.parse(raw);
    }
  } catch (e) {}

  const combinedUsers: User[] = filterNonDeletedUsers([...allUsersList, ...localUsers, ...(initialUsers as User[])]);
  const uniqueUsers: User[] = [];
  const seenIds = new Set<string>();

  for (const u of combinedUsers) {
    if (!u) continue;
    const key = u.id || u.userId || u.nicNumber;
    if (key && !seenIds.has(key)) {
      seenIds.add(key);
      uniqueUsers.push(u);
    }
  }

  // 2. Exact match by User ID or Document ID
  let match = uniqueUsers.find(
    u => (u.id && u.id.toLowerCase() === lowerQuery) || (u.userId && u.userId.toLowerCase() === lowerQuery)
  );
  if (match) return match;

  // 3. Exact match by NIC Number (e.g. 981234567V, 199701815470)
  match = uniqueUsers.find(
    u => u.nicNumber && u.nicNumber.trim().toLowerCase() === lowerQuery
  );
  if (match) return match;

  // 4. Exact match by Numeric ID (digits only of NIC)
  if (digitsOnly.length >= 5) {
    match = uniqueUsers.find(u => {
      const uNumeric = extractNumericId(u.nicNumber || u.userId);
      return uNumeric && uNumeric === digitsOnly;
    });
    if (match) return match;
  }

  // 5. Match by Phone Number
  if (digitsOnly.length >= 9) {
    match = uniqueUsers.find(u => {
      const uPhoneDigits = (u.phone || '').replace(/[^0-9]/g, '');
      return uPhoneDigits && (uPhoneDigits === digitsOnly || uPhoneDigits.endsWith(digitsOnly) || digitsOnly.endsWith(uPhoneDigits));
    });
    if (match) return match;
  }

  // 6. Match by 6-Digit Pay Code
  if (digitsOnly.length === 6) {
    match = uniqueUsers.find(u => {
      const code = generateUserPayCode(u);
      return code === digitsOnly;
    });
    if (match) return match;
  }

  // 7. Match by Name if unambiguous
  if (rawQuery.length >= 3) {
    match = uniqueUsers.find(
      u => u.name && u.name.trim().toLowerCase() === lowerQuery
    );
    if (match) return match;
  }

  return null;
};

/**
 * Parse Scanned QR string or text input
 */
export const parseScannedQrPayload = (
  scannedText: string,
  allUsersList: User[] = []
): {
  isValid: boolean;
  recipientUserId?: string;
  recipientNumericId?: string;
  recipientName?: string;
  recipientPhone?: string;
  fixedAmount?: number;
  payCode?: string;
  rawText: string;
  matchedUser?: User | null;
  error?: string;
} => {
  if (!scannedText) {
    return { isValid: false, rawText: '', error: 'හිස් QR කේතයක්' };
  }

  const trimmed = scannedText.trim();

  // Case 1: JSON payload (Sahaya Pay App format)
  try {
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed) as QrPayPayload;
      if (parsed.type === 'SAHAYA_PAY' || parsed.userId || parsed.numericId) {
        const foundUser = findUserForQrPayment(parsed.userId || parsed.numericId || parsed.phone || '', allUsersList);
        return {
          isValid: true,
          recipientUserId: foundUser?.id || foundUser?.userId || parsed.userId,
          recipientNumericId: foundUser ? extractNumericId(foundUser.nicNumber || foundUser.userId) : (parsed.numericId || extractNumericId(parsed.userId)),
          recipientName: foundUser?.name || parsed.name || 'සහය සාමාජිකයා',
          recipientPhone: foundUser?.phone || parsed.phone,
          fixedAmount: parsed.fixedAmount,
          payCode: parsed.payCode || (foundUser ? generateUserPayCode(foundUser) : undefined),
          matchedUser: foundUser,
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
    const uId = parts[1] || '';
    const numId = parts[2] || '';
    const phone = parts[3] || '';
    const foundUser = findUserForQrPayment(uId || numId || phone, allUsersList);

    return {
      isValid: true,
      recipientUserId: foundUser?.id || foundUser?.userId || uId,
      recipientNumericId: foundUser ? extractNumericId(foundUser.nicNumber || foundUser.userId) : numId,
      recipientPhone: foundUser?.phone || phone,
      recipientName: foundUser?.name || decodeURIComponent(parts[4] || 'සහය සාමාජිකයා'),
      payCode: parts[5] || (foundUser ? generateUserPayCode(foundUser) : undefined),
      fixedAmount: parts[6] ? parseFloat(parts[6]) : undefined,
      matchedUser: foundUser,
      rawText: trimmed,
    };
  }

  // Case 3: Direct User Search via Pay Code, Phone Number, NIC, or User ID
  const directFoundUser = findUserForQrPayment(trimmed, allUsersList);
  if (directFoundUser) {
    const numId = extractNumericId(directFoundUser.nicNumber || directFoundUser.userId);
    return {
      isValid: true,
      recipientUserId: directFoundUser.id || directFoundUser.userId || `usr_${numId}`,
      recipientNumericId: numId,
      recipientName: directFoundUser.name || 'සහය සාමාජිකයා',
      recipientPhone: directFoundUser.phone || '',
      payCode: generateUserPayCode(directFoundUser),
      matchedUser: directFoundUser,
      rawText: trimmed,
    };
  }

  // Case 4: Digits only (at least 5 digits entered)
  const cleanDigits = trimmed.replace(/[^0-9]/g, '');
  if (cleanDigits.length >= 5) {
    return {
      isValid: true,
      recipientUserId: `usr_${cleanDigits}`,
      recipientNumericId: cleanDigits,
      recipientName: `සාමාජික අංක #${cleanDigits}`,
      recipientPhone: cleanDigits.length === 10 ? cleanDigits : undefined,
      payCode: cleanDigits.length === 6 ? cleanDigits : undefined,
      rawText: trimmed,
    };
  }

  return {
    isValid: false,
    rawText: trimmed,
    error: 'වලංගු සහය සේවා QR කේතයක් හෝ ගෙවීම් අංකයක් හඳුනාගත නොහැකි විය.',
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
  const payerIdKey = payer.id || payer.userId || '';

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

  // Update Balances in storage
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

  // 3. Broadcast real-time update events across components
  try {
    window.dispatchEvent(new CustomEvent('sahaya_wallet_updated', {
      detail: { payerId: payerIdKey, newBalance: payerNewBalance, tx: qrTx }
    }));
    window.dispatchEvent(new CustomEvent('sahaya_sync_all_services'));
  } catch (e) {}

  // Play audio chime sound if supported
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

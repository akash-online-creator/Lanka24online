import { User, CreditTransaction, CreditTransactionType, HelpPost } from '../types';

/**
 * Extracts digits only from NIC or ID.
 * Rule: ඔහුගේ හැඳුනුම්පත් අංකයේ ඉංග්‍රීසි අකුරු හැර අනෙකුත් අංක ඔහුගේ Id එක ලෙස ලබාදෙන්න.
 * E.g. "981234567V" -> "981234567"
 * E.g. "199701815470" -> "199701815470"
 */
export const extractNumericId = (nicOrId?: string): string => {
  if (!nicOrId) return '';
  const digits = nicOrId.replace(/[^0-9]/g, '');
  return digits || nicOrId;
};

/**
 * Platform Bank Deposit Instructions
 */
export const BANK_DEPOSIT_INFO = {
  bankNameSi: 'ලංකා බැංකුව (BOC)',
  bankNameEn: 'BANK OF CEYLON (BOC)',
  accountHolderSi: 'ඒ.ජි පැතුම් රන්දික',
  accountHolderEn: 'A.G. PATHUM RANDIKA',
  accountNumber: '92746296',
  branchSi: 'කුරුණෑගල',
  branchEn: 'Kurunegala',
};

/**
 * Credit Posting Fees per Category / Form
 */
export interface CategoryFeeDetail {
  key: string;
  nameSi: string;
  fee: number;
  descriptionSi: string;
}

export const CATEGORY_CREDIT_FEES: Record<string, CategoryFeeDetail> = {
  quick_services: {
    key: 'quick_services',
    nameSi: 'ඉක්මන් සේවා ගාස්තුව',
    fee: 25,
    descriptionSi: 'ඉක්මන් සහය සේවා ඉල්ලීම් පළකිරීම සඳහා',
  },
  general_help: {
    key: 'general_help',
    nameSi: 'සාමාන්‍ය සේවා ගාස්තුව',
    fee: 25,
    descriptionSi: 'සාමාන්‍ය සහය සේවා දැන්වීම් පළකිරීම සඳහා',
  },
  lost_item: {
    key: 'lost_item',
    nameSi: 'නැති වූ දෙයක් සඳහා පළකරන දැන්වීම්',
    fee: 50,
    descriptionSi: 'නැතිවූ භාණ්ඩ හෝ ලියකියවිලි සොයාගැනීමේ දැන්වීම්',
  },
  stolen_item: {
    key: 'stolen_item',
    nameSi: 'සොරාගත් දෙයක් සඳහා පළකරන දැන්වීම්',
    fee: 50,
    descriptionSi: 'සොරාගත් දේ පිළිබඳ දැනුම්දීමේ දැන්වීම්',
  },
  find_for_me: {
    key: 'find_for_me',
    nameSi: 'සොයාදෙන්න',
    fee: 50,
    descriptionSi: 'අවශ්‍ය භාණ්ඩ / සේවා සොයාදීමේ දැන්වීම්',
  },
  waste_giveaway: {
    key: 'waste_giveaway',
    nameSi: 'ඉවත්කරන ද්‍රව්‍ය',
    fee: 20,
    descriptionSi: 'ඉවත්කරන / ප්‍රතිචක්‍රීකරණය සඳහා ලබාදෙන දැන්වීම්',
  },
  exchange: {
    key: 'exchange',
    nameSi: 'හුවමාරු',
    fee: 25,
    descriptionSi: 'භාණ්ඩ හෝ සේවා හුවමාරු කිරීමේ දැන්වීම්',
  },
  donation: {
    key: 'donation',
    nameSi: 'පරිත්‍යාග',
    fee: 20,
    descriptionSi: 'මගෙන් ඔබට නොමිලේ ලබාදෙන පරිත්‍යාග',
  },
  professional_service: {
    key: 'professional_service',
    nameSi: 'වෘත්තීය සේවා',
    fee: 100,
    descriptionSi: 'වෘත්තීය සේවා සැපයුම්කරු ලෙස ලියාපදිංචිවීම සහ දැන්වීම්',
  },
  group_work: {
    key: 'group_work',
    nameSi: 'කණ්ඩායම් වැඩ',
    fee: 100,
    descriptionSi: 'කණ්ඩායම් වැඩ හා සාමූහික ව්‍යාපෘති නිර්මාණය කිරීම',
  },
  marketplace_seller: {
    key: 'marketplace_seller',
    nameSi: 'වෙළෙන්දන්',
    fee: 25,
    descriptionSi: 'වෙළඳ භාණ්ඩ / බඩු විකිණීමේ දැන්වීම්',
  },
  accountant_service: {
    key: 'accountant_service',
    nameSi: 'ගිණුම්කරුවන්',
    fee: 20,
    descriptionSi: 'ගිණුම්කරණ සහ මූල්‍ය සේවා දැන්වීම්',
  },
  marketplace_shop: {
    key: 'marketplace_shop',
    nameSi: 'අලෙවිසැල්',
    fee: 100,
    descriptionSi: 'අලෙවිසැල් (Shops) පද්ධතියට එක්කිරීම',
  },
  business_listing: {
    key: 'business_listing',
    nameSi: 'ව්‍යාපාරික ස්ථාන',
    fee: 100,
    descriptionSi: 'ව්‍යාපාරික ස්ථාන හා සමාගම් ලැයිස්තුගත කිරීම',
  },
  marketplace_buyer: {
    key: 'marketplace_buyer',
    nameSi: 'මිලදී ගැනීමේ ඉල්ලුම්',
    fee: 25,
    descriptionSi: 'භාණ්ඩ මිලදී ගැනීමේ ගැනුම්කරු දැන්වීම්',
  },
  boost_ad: {
    key: 'boost_ad',
    nameSi: 'දැන්වීම් Boost කිරීම (කාණ්ඩය තුළ ඉහළින්ම ප්‍රදර්ශනය)',
    fee: 250,
    descriptionSi: 'රු. 250 ක මුදලක් ගෙවා අදාළ කාණ්ඩය තුළ දැන්වීම ඉහළින්ම (Top Priority) ප්‍රදර්ශනය කිරීම',
  },
};

const STORAGE_KEY_TRANSACTIONS = 'sahaya_credit_transactions';
const STORAGE_KEY_BALANCES = 'sahaya_user_credit_balances';

/**
 * Format timestamp nicely
 */
export const formatCreditDate = (date = new Date()): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  return `${year}-${month}-${day} ${strTime}`;
};

/**
 * Get all credit transactions from storage
 */
export const getStoredCreditTransactions = (): CreditTransaction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse credit transactions:', err);
  }
  return [];
};

/**
 * Save credit transactions to storage
 */
export const saveCreditTransactions = (transactions: CreditTransaction[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
  } catch (err) {
    console.warn('Failed to save credit transactions:', err);
  }
};

/**
 * Get balances map from storage
 */
const getBalancesMap = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BALANCES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to parse balances:', err);
  }
  return {};
};

/**
 * Save balances map to storage
 */
const saveBalancesMap = (map: Record<string, number>): void => {
  try {
    localStorage.setItem(STORAGE_KEY_BALANCES, JSON.stringify(map));
  } catch (err) {
    console.warn('Failed to save balances:', err);
  }
};

/**
 * Get user's current available credit balance
 */
export const getUserCreditBalance = (user?: User | null): number => {
  if (!user) return 0;
  if (user.isDemo) return 100; // Demo user always has 100 preview credits

  const balancesMap = getBalancesMap();
  const numericId = extractNumericId(user.nicNumber || user.userId);
  const idKey = user.id || user.userId;

  if (balancesMap[numericId] !== undefined) {
    return balancesMap[numericId];
  }
  if (balancesMap[idKey] !== undefined) {
    return balancesMap[idKey];
  }
  if (user.credits !== undefined) {
    return user.credits;
  }

  // If approved user with no balance initialized yet, default to initial welcome gift 100
  if (user.status === 'approved') {
    return 100;
  }
  return 0;
};

/**
 * Get transactions for a specific user
 */
export const getUserCreditTransactions = (user?: User | null): CreditTransaction[] => {
  if (!user) return [];
  const allTx = getStoredCreditTransactions();
  const numericId = extractNumericId(user.nicNumber || user.userId);
  const idKey = user.id || user.userId;

  const userTxs = allTx.filter(
    (tx) =>
      tx.userId === idKey ||
      tx.userNumericId === numericId ||
      (user.nicNumber && tx.userNic === user.nicNumber) ||
      (user.phone && tx.userPhone === user.phone)
  );

  // If approved user has no transactions yet, synthesize their welcome gift record
  if (userTxs.length === 0 && user.status === 'approved') {
    const defaultTx: CreditTransaction = {
      id: `tx_welcome_${numericId || 'init'}`,
      userId: idKey,
      userNumericId: numericId || '00000000',
      userName: user.name || 'පරිශීලක',
      userNic: user.nicNumber,
      userPhone: user.phone,
      amount: 100,
      type: 'welcome_gift',
      title: 'ලියාපදිංචි පිළිගැනීමේ ත්‍යාගය (Welcome Bonus)',
      description: 'පරිපාලක (Admin) අනුමැතිය මත හිමිවූ ලියාපදිංචි ත්‍යාග මුදල',
      timestamp: formatCreditDate(user.registeredAt ? new Date(user.registeredAt) : new Date()),
      timestampMs: user.registeredAt ? new Date(user.registeredAt).getTime() : Date.now(),
      balanceAfter: 100,
    };
    return [defaultTx];
  }

  return userTxs.sort((a, b) => b.timestampMs - a.timestampMs);
};

/**
 * Grant Rs. 100 Welcome Gift upon Admin Approval
 */
export const grantWelcomeGiftCredit = (
  user?: User | null
): { success: boolean; newBalance: number; transaction: CreditTransaction } => {
  if (!user) {
    return {
      success: false,
      newBalance: 0,
      transaction: {
        id: `tx_gift_err_${Date.now()}`,
        userId: '',
        userNumericId: '',
        userName: '',
        description: '',
        amount: 0,
        type: 'welcome_gift',
        title: 'Welcome Gift',
        timestamp: formatCreditDate(),
        timestampMs: Date.now(),
        balanceAfter: 0,
      },
    };
  }
  const numericId = extractNumericId(user.nicNumber || user.userId);
  const idKey = user.id || user.userId || '';
  const currentBalance = getUserCreditBalance(user);
  const newBalance = currentBalance + 100;

  const balancesMap = getBalancesMap();
  balancesMap[numericId] = newBalance;
  if (idKey) balancesMap[idKey] = newBalance;
  saveBalancesMap(balancesMap);

  const tx: CreditTransaction = {
    id: `tx_gift_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId: idKey,
    userNumericId: numericId,
    userName: user.name,
    userNic: user.nicNumber,
    userPhone: user.phone,
    amount: 100,
    type: 'welcome_gift',
    title: 'ලියාපදිංචි පිළිගැනීමේ ත්‍යාගය (Welcome Bonus)',
    description: 'පරිපාලක (Admin) අනුමැතිය මත පිරිනමන ලද රු. 100 ක ලියාපදිංචි ත්‍යාගය',
    timestamp: formatCreditDate(),
    timestampMs: Date.now(),
    balanceAfter: newBalance,
  };

  const existingTxs = getStoredCreditTransactions();
  saveCreditTransactions([tx, ...existingTxs]);

  return { success: true, newBalance, transaction: tx };
};

/**
 * Reward User 2 Credits for contributing a valid Emergency Service Contact Number
 */
export const rewardEmergencyContactCredit = (
  user?: User | null,
  serviceName?: string,
  phone?: string
): { success: boolean; newBalance: number; transaction: CreditTransaction } => {
  if (!user) {
    return {
      success: false,
      newBalance: 0,
      transaction: {
        id: `tx_emg_err_${Date.now()}`,
        userId: '',
        userNumericId: '',
        userName: '',
        description: '',
        amount: 0,
        type: 'reward',
        title: 'Emergency Reward',
        timestamp: formatCreditDate(),
        timestampMs: Date.now(),
        balanceAfter: 0,
      },
    };
  }
  const numericId = extractNumericId(user.nicNumber || user.userId);
  const idKey = user.id || user.userId || '';
  const currentBalance = getUserCreditBalance(user);
  const rewardAmount = 2; // 2 Credits
  const newBalance = Number((currentBalance + rewardAmount).toFixed(2));

  const balancesMap = getBalancesMap();
  balancesMap[numericId] = newBalance;
  if (idKey) balancesMap[idKey] = newBalance;
  saveBalancesMap(balancesMap);

  const tx: CreditTransaction = {
    id: `tx_emg_reward_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId: idKey,
    userNumericId: numericId,
    userName: user.name,
    userNic: user.nicNumber,
    userPhone: user.phone,
    amount: rewardAmount,
    type: 'reward',
    title: 'හදිසි අංකයක් එක්කිරීමේ ත්‍යාගය (Emergency Number Reward)',
    description: `ශ්‍රී ලංකා හදිසි සේවා නාමාවලියට "${serviceName}" අංකය (${phone}) සාර්ථකව එක්කිරීම වෙනුවෙන් පිරිනමන ලද රු. 2.00 ක ක්‍රෙඩිට් ත්‍යාගය`,
    timestamp: formatCreditDate(),
    timestampMs: Date.now(),
    balanceAfter: newBalance,
  };

  const existingTxs = getStoredCreditTransactions();
  saveCreditTransactions([tx, ...existingTxs]);

  return { success: true, newBalance, transaction: tx };
};

/**
 * Get category fee amount helper
 */
export const getCategoryFee = (categoryKey?: string): number => {
  if (!categoryKey) return 25;
  const item = CATEGORY_CREDIT_FEES[categoryKey];
  if (item) return item.fee;
  return 25;
};

/**
 * Deduct posting fee before creating an Ad / Service / Post
 */
export const deductPostingFee = (
  user?: User | null,
  feeKey: string = 'general',
  postCode?: string,
  customTitle?: string
): { 
  success: boolean; 
  newBalance: number; 
  error?: string; 
  transaction?: CreditTransaction; 
  requiredFee: number;
  requiredAmount: number;
  currentBalance: number;
} => {
  const feeInfo = CATEGORY_CREDIT_FEES[feeKey] || {
    key: feeKey,
    nameSi: 'දැන්වීම් ගාස්තුව',
    fee: 25,
    descriptionSi: 'දැන්වීම් පළකිරීමේ සේවා ගාස්තුව',
  };

  const requiredFee = feeInfo.fee;
  if (!user) {
    return {
      success: false,
      newBalance: 0,
      currentBalance: 0,
      requiredFee,
      requiredAmount: requiredFee,
      error: 'පරිශීලක තොරතුරු හමුනොවිණි.',
    };
  }
  const currentBalance = getUserCreditBalance(user);

  if (currentBalance < requiredFee) {
    return {
      success: false,
      newBalance: currentBalance,
      currentBalance,
      requiredFee,
      requiredAmount: requiredFee,
      error: `ඔබගේ ගිණුමේ ප්‍රමාණවත් ක්‍රෙඩිට් ශේෂයක් නොමැත. මෙම දැන්වීම සඳහා රු. ${requiredFee.toFixed(2)} ක මුදලක් අවශ්‍ය වේ. ඔබගේ දැනට ශේෂය රු. ${currentBalance.toFixed(2)} කි.`,
    };
  }

  const numericId = extractNumericId(user.nicNumber || user.userId);
  const idKey = user.id || user.userId || '';
  const newBalance = Number((currentBalance - requiredFee).toFixed(2));

  // Update in balances storage
  const balancesMap = getBalancesMap();
  balancesMap[numericId] = newBalance;
  if (idKey) balancesMap[idKey] = newBalance;
  saveBalancesMap(balancesMap);

  const tx: CreditTransaction = {
    id: `tx_fee_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId: idKey,
    userNumericId: numericId,
    userName: user.name,
    userNic: user.nicNumber,
    userPhone: user.phone,
    amount: -requiredFee,
    type: 'ad_fee',
    title: customTitle || `${feeInfo.nameSi}${postCode ? ` (${postCode})` : ''}`,
    description: `${feeInfo.descriptionSi} - ගිණුමෙන් අයකරගත් මුදල`,
    categoryKey: feeKey,
    postCode,
    timestamp: formatCreditDate(),
    timestampMs: Date.now(),
    balanceAfter: newBalance,
  };

  const existingTxs = getStoredCreditTransactions();
  saveCreditTransactions([tx, ...existingTxs]);

  return {
    success: true,
    newBalance,
    currentBalance,
    requiredFee,
    requiredAmount: requiredFee,
    transaction: tx,
  };
};

/**
 * Admin Top-Up or Gift Custom Credits to Any User
 */
export const addCreditByAdmin = (
  user?: User | null,
  amount: number = 0,
  type: CreditTransactionType = 'deposit',
  title?: string,
  adminRemark?: string
): { success: boolean; newBalance: number; transaction: CreditTransaction } => {
  if (!user) {
    return {
      success: false,
      newBalance: 0,
      transaction: {
        id: `tx_admin_err_${Date.now()}`,
        userId: '',
        userNumericId: '',
        userName: '',
        description: '',
        amount: 0,
        type,
        title: title || 'Admin Credit',
        timestamp: formatCreditDate(),
        timestampMs: Date.now(),
        balanceAfter: 0,
      },
    };
  }
  const numericId = extractNumericId(user.nicNumber || user.userId);
  const idKey = user.id || user.userId || '';
  const currentBalance = getUserCreditBalance(user);
  const positiveAmount = Math.abs(amount);
  const newBalance = Number((currentBalance + positiveAmount).toFixed(2));

  const balancesMap = getBalancesMap();
  balancesMap[numericId] = newBalance;
  if (idKey) balancesMap[idKey] = newBalance;
  saveBalancesMap(balancesMap);

  let defaultTitle = 'බැංකු තැන්පතු බැර කිරීම (Bank Top-Up)';
  if (type === 'reward' || type === 'welcome_gift') {
    defaultTitle = 'පරිපාලක ත්‍යාග මුදල් (Reward Gift)';
  } else if (type === 'admin_adjustment') {
    defaultTitle = 'පරිපාලක ගිණුම් බැර කිරීම (Admin Credit)';
  }

  const tx: CreditTransaction = {
    id: `tx_admin_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId: idKey,
    userNumericId: numericId,
    userName: user.name,
    userNic: user.nicNumber,
    userPhone: user.phone,
    amount: positiveAmount,
    type,
    title: title || defaultTitle,
    description: adminRemark || `පරිපාලක විසින් ගිණුමට බැර කල රු. ${positiveAmount.toFixed(2)} ක මුදල`,
    adminRemark,
    timestamp: formatCreditDate(),
    timestampMs: Date.now(),
    balanceAfter: newBalance,
  };

  const existingTxs = getStoredCreditTransactions();
  saveCreditTransactions([tx, ...existingTxs]);

  return { success: true, newBalance, transaction: tx };
};

/**
 * Admin Deduct / Remove Credits from Any User
 */
export const deductCreditByAdmin = (
  user?: User | null,
  amount: number = 0,
  type: CreditTransactionType = 'admin_adjustment',
  title?: string,
  adminRemark?: string
): { success: boolean; newBalance: number; transaction: CreditTransaction } => {
  if (!user) {
    return {
      success: false,
      newBalance: 0,
      transaction: {
        id: `tx_admin_deduct_err_${Date.now()}`,
        userId: '',
        userNumericId: '',
        userName: '',
        description: '',
        amount: 0,
        type,
        title: title || 'Admin Debit',
        timestamp: formatCreditDate(),
        timestampMs: Date.now(),
        balanceAfter: 0,
      },
    };
  }
  const numericId = extractNumericId(user.nicNumber || user.userId);
  const idKey = user.id || user.userId || '';
  const currentBalance = getUserCreditBalance(user);
  const deductionAmount = Math.abs(amount);
  const newBalance = Number(Math.max(0, currentBalance - deductionAmount).toFixed(2));

  const balancesMap = getBalancesMap();
  balancesMap[numericId] = newBalance;
  if (idKey) balancesMap[idKey] = newBalance;
  saveBalancesMap(balancesMap);

  let defaultTitle = 'පරිපාලක විසින් ක්‍රෙඩිට් ඉවත් කිරීම (Admin Debit)';
  if (type === 'penalty_compensation') {
    defaultTitle = 'මගහැරීම් වන්දි / ගමන් ගාස්තු අය කිරීම (Travel Compensation)';
  } else if (type === 'ad_fee') {
    defaultTitle = 'දැන්වීම් සේවා ගාස්තු අය කිරීම (Ad Fee Debit)';
  }

  const tx: CreditTransaction = {
    id: `tx_admin_deduct_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId: idKey,
    userNumericId: numericId,
    userName: user.name,
    userNic: user.nicNumber,
    userPhone: user.phone,
    amount: -deductionAmount,
    type,
    title: title || defaultTitle,
    description: adminRemark || `පරිපාලක විසින් ගිණුමෙන් අඩු කල රු. ${deductionAmount.toFixed(2)} ක මුදල`,
    adminRemark,
    timestamp: formatCreditDate(),
    timestampMs: Date.now(),
    balanceAfter: newBalance,
  };

  const existingTxs = getStoredCreditTransactions();
  saveCreditTransactions([tx, ...existingTxs]);

  return { success: true, newBalance, transaction: tx };
};

/**
 * Deduct Travel & Evading Penalty ("මගහැරීමට ලක්කළහොත් ගමන්ගාස්තු හා අනෙකුත් ගාස්තු")
 */
export const applyEvadingPenalty = (
  seekerUser: User,
  travelFeeAmount: number,
  reason: string
): { success: boolean; newBalance: number; transaction: CreditTransaction } => {
  if (!seekerUser) {
    return {
      success: false,
      newBalance: 0,
      transaction: {
        id: `tx_err_${Date.now()}`,
        userId: '',
        userNumericId: '',
        userName: '',
        amount: 0,
        type: 'penalty_compensation',
        title: 'Error',
        description: '',
        timestamp: formatCreditDate(),
        timestampMs: Date.now(),
        balanceAfter: 0,
      },
    };
  }
  const numericId = extractNumericId(seekerUser.nicNumber || seekerUser.userId);
  const idKey = seekerUser.id || seekerUser.userId || '';
  const currentBalance = getUserCreditBalance(seekerUser);
  const newBalance = Number((currentBalance - travelFeeAmount).toFixed(2));

  const balancesMap = getBalancesMap();
  balancesMap[numericId] = newBalance;
  if (idKey) balancesMap[idKey] = newBalance;
  saveBalancesMap(balancesMap);

  const tx: CreditTransaction = {
    id: `tx_penalty_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId: idKey,
    userNumericId: numericId,
    userName: seekerUser.name,
    userNic: seekerUser.nicNumber,
    userPhone: seekerUser.phone,
    amount: -travelFeeAmount,
    type: 'penalty_compensation',
    title: 'සහයකයා මගහැරීමේ ගමන් ගාස්තු වන්දි (Travel Compensation)',
    description: reason || 'සහය වීමට පැමිණි පුද්ගලයාව මගහැරීම නිසා අය වූ ගමන් හා සේවා ගාස්තු',
    adminRemark: reason,
    timestamp: formatCreditDate(),
    timestampMs: Date.now(),
    balanceAfter: newBalance,
  };

  const existingTxs = getStoredCreditTransactions();
  saveCreditTransactions([tx, ...existingTxs]);

  return { success: true, newBalance, transaction: tx };
};

export const BOOST_AD_FEE = 250;

/**
 * Boost any HelpPost for Rs. 250 so it pins to the top of its specific category
 */
export const boostHelpPost = (
  post: HelpPost,
  user?: User | null,
  paymentMethod: 'wallet' | 'bank_slip' | string = 'wallet',
  paymentDetails?: { reference?: string; slipName?: string }
): {
  success: boolean;
  updatedPost: HelpPost;
  error?: string;
  transaction?: CreditTransaction;
  newBalance?: number;
} => {
  if (!user) {
    return {
      success: false,
      updatedPost: post,
      error: 'පරිශීලක තොරතුරු හමුනොවිණි.',
    };
  }
  const boostDurationMs = 7 * 24 * 60 * 60 * 1000; // 7 days top priority
  const now = Date.now();
  const boostedAt = new Date(now).toISOString();
  const boostedUntil = new Date(now + boostDurationMs).toISOString();
  const paymentRef = paymentDetails?.reference || `BST-${Math.floor(100000 + Math.random() * 900000)}`;

  let transaction: CreditTransaction | undefined;
  let newBalance = getUserCreditBalance(user);

  if (paymentMethod === 'wallet') {
    const currentBalance = getUserCreditBalance(user);
    if (currentBalance < BOOST_AD_FEE) {
      return {
        success: false,
        updatedPost: post,
        error: `ඔබගේ Credit Wallet ශේෂය ප්‍රමාණවත් නොවේ. දැන්වීම Boost කිරීමට රු. ${BOOST_AD_FEE.toFixed(2)} ක් අවශ්‍ය වේ. ඔබගේ දැනට ශේෂය රු. ${currentBalance.toFixed(2)} කි.`,
      };
    }

    const numericId = extractNumericId(user.nicNumber || user.userId);
    const idKey = user.id || user.userId || '';
    newBalance = Number((currentBalance - BOOST_AD_FEE).toFixed(2));

    const balancesMap = getBalancesMap();
    balancesMap[numericId] = newBalance;
    if (idKey) balancesMap[idKey] = newBalance;
    saveBalancesMap(balancesMap);

    transaction = {
      id: `tx_boost_${now}_${Math.floor(Math.random() * 1000)}`,
      userId: idKey,
      userNumericId: numericId,
      userName: user.name,
      userNic: user.nicNumber,
      userPhone: user.phone,
      amount: -BOOST_AD_FEE,
      type: 'ad_fee',
      title: `දැන්වීම් Boost කිරීම - රු. 250 (${post.postCode})`,
      description: `දැන්වීම් අංක ${post.postCode} අදාළ කාණ්ඩය (${post.tagName || post.category || 'සාමාන්‍ය'}) තුළ ඉහළින්ම ප්‍රදර්ශනය කිරීම වෙනුවෙන් අය වූ මුදල`,
      categoryKey: 'boost_ad',
      postCode: post.postCode,
      timestamp: formatCreditDate(),
      timestampMs: now,
      balanceAfter: newBalance,
    };

    const existingTxs = getStoredCreditTransactions();
    saveCreditTransactions([transaction, ...existingTxs]);
  } else {
    // For online card/LankaQR or bank slip
    const numericId = extractNumericId(user.nicNumber || user.userId);
    const idKey = user.id || user.userId || '';
    transaction = {
      id: `tx_boost_direct_${now}_${Math.floor(Math.random() * 1000)}`,
      userId: idKey,
      userNumericId: numericId,
      userName: user.name,
      userNic: user.nicNumber,
      userPhone: user.phone,
      amount: -BOOST_AD_FEE,
      type: 'ad_fee',
      title: `දැන්වීම් Boost කිරීම (${paymentMethod === 'card_qr' ? 'Online LankaQR / Card' : 'BOC Bank Slip'}) - රු. 250 (${post.postCode})`,
      description: `දැන්වීම් අංක ${post.postCode} අදාළ කාණ්ඩය තුළ ඉහළින්ම Boost කිරීම (Ref: ${paymentRef})`,
      categoryKey: 'boost_ad',
      postCode: post.postCode,
      adminRemark: `Payment Ref: ${paymentRef}${paymentDetails?.slipName ? ` | Slip: ${paymentDetails.slipName}` : ''}`,
      timestamp: formatCreditDate(),
      timestampMs: now,
      balanceAfter: newBalance,
    };
    const existingTxs = getStoredCreditTransactions();
    saveCreditTransactions([transaction, ...existingTxs]);
  }

  const updatedPost: HelpPost = {
    ...post,
    isBoosted: true,
    boostedAt,
    boostedAtMs: now,
    boostedUntil,
    boostAmount: BOOST_AD_FEE,
    boostPaymentMethod: paymentMethod,
    boostPaymentReference: paymentRef,
    boostCategory: post.category || 'general',
  };

  return {
    success: true,
    updatedPost,
    transaction,
    newBalance,
  };
};

/**
 * Admin adjustment reason presets for quick selection
 */
export const ADMIN_ADD_REASON_PRESETS = [
  { id: 'bank_deposit', label: 'බැංකු තැන්පතු අනුමැතිය (BOC Direct Bank Deposit)', amount: 500, type: 'deposit' as CreditTransactionType },
  { id: 'welcome_gift', label: 'ලියාපදිංචි විශේෂ පිළිගැනීමේ ත්‍යාගය (Welcome Bonus)', amount: 100, type: 'welcome_gift' as CreditTransactionType },
  { id: 'community_reward', label: 'ප්‍රජා සේවා දායකත්ව ත්‍යාගය (Community Contributor Reward)', amount: 250, type: 'reward' as CreditTransactionType },
  { id: 'emergency_reward', label: 'හදිසි දුරකථන අංක එකතු කිරීමේ ත්‍යාගය (Emergency Directory Reward)', amount: 50, type: 'reward' as CreditTransactionType },
  { id: 'admin_refund', label: 'වැරදි අයවීමක් ආපසු ගෙවීම (Admin Refund / Correction)', amount: 100, type: 'admin_adjustment' as CreditTransactionType },
  { id: 'other_add', label: 'වෙනත් විශේෂ බැර කිරීමක් (Other Credit Addition)', amount: 100, type: 'admin_adjustment' as CreditTransactionType },
];

export const ADMIN_DEDUCT_REASON_PRESETS = [
  { id: 'travel_penalty', label: 'මගහැරීම් වන්දි / ගමන් ගාස්තු අය කිරීම (No-Show Travel Compensation)', amount: 200, type: 'penalty_compensation' as CreditTransactionType },
  { id: 'ad_fee', label: 'දැන්වීම් සේවා ගාස්තු අතින් අය කිරීම (Manual Ad Posting Fee)', amount: 100, type: 'ad_fee' as CreditTransactionType },
  { id: 'policy_violation', label: 'ව්‍යාජ හෝ නීති විරෝධී දැන්වීම් දඩ මුදල (Policy Violation Penalty)', amount: 150, type: 'penalty_compensation' as CreditTransactionType },
  { id: 'system_correction', label: 'පද්ධති ගැලපුම් අඩු කිරීම (Manual System Debit / Correction)', amount: 100, type: 'admin_adjustment' as CreditTransactionType },
  { id: 'other_deduct', label: 'වෙනත් අය කිරීමක් (Other Debit Deduction)', amount: 50, type: 'admin_adjustment' as CreditTransactionType },
];

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
 * Service & Ad Category Fee Detail Interface
 */
export interface CategoryFeeDetail {
  id: number;
  key: string;
  nameSi: string;
  nameEn: string;
  fee: number;
  durationSi: string;
  durationDays?: number;
  descriptionSi: string;
  isFree: boolean;
}

/**
 * 21 Standard Platform Services, Fees, and Validity Durations
 */
export const DEFAULT_CATEGORY_CREDIT_FEES: Record<string, CategoryFeeDetail> = {
  // 01. රතු එළිය : නොමිලේ
  red_alert: {
    id: 1,
    key: 'red_alert',
    nameSi: 'රතු එළිය (Red Alert)',
    nameEn: 'Red Alert',
    fee: 0,
    durationSi: 'නොමිලේ',
    descriptionSi: 'ජීවිතාරක්ෂක හා හදිසි ආපදා අනතුරු ඇඟවීම්',
    isFree: true,
  },
  // 02. Sos Live Tracker : නොමිලේ
  sos_live_tracker: {
    id: 2,
    key: 'sos_live_tracker',
    nameSi: 'Sos Live Tracker',
    nameEn: 'SOS Live Tracker',
    fee: 0,
    durationSi: 'නොමිලේ',
    descriptionSi: 'හදිසි අවස්ථාවල සජීවී ජීපීඑස් සිතියම් ලුහුබැඳීම',
    isFree: true,
  },
  // 03. ස්ථානය සුරකීම : නොමිලේ
  safe_location: {
    id: 3,
    key: 'safe_location',
    nameSi: 'ස්ථානය සුරකීම',
    nameEn: 'Save Safe Location',
    fee: 0,
    durationSi: 'නොමිලේ',
    descriptionSi: 'ආරක්ෂිත ස්ථාන හා නිවාස සිතියමේ සුරැකීම',
    isFree: true,
  },
  // 04. ලේ අවශ්‍යතා ඉල්ලුම් කිරීම : නොමිලේ
  blood_request: {
    id: 4,
    key: 'blood_request',
    nameSi: 'ලේ අවශ්‍යතා ඉල්ලුම් කිරීම',
    nameEn: 'Blood Requirement Requests',
    fee: 0,
    durationSi: 'නොමිලේ',
    descriptionSi: 'හදිසි රෝගීන් සඳහා රුධිර අවශ්‍යතා දැනුම්දීම',
    isFree: true,
  },
  // 05. ලේ පරිත්‍යාගශීලීන් : නොමිලේ
  blood_donors: {
    id: 5,
    key: 'blood_donors',
    nameSi: 'ලේ පරිත්‍යාගශීලීන්',
    nameEn: 'Blood Donors',
    fee: 0,
    durationSi: 'නොමිලේ',
    descriptionSi: 'රුධිර පරිත්‍යාගශීලී සාමාජිකයින් ලියාපදිංචිවීම',
    isFree: true,
  },
  // 06. ආපදා සහන ඉල්ලීම් : නොමිලේ
  disaster_relief: {
    id: 6,
    key: 'disaster_relief',
    nameSi: 'ආපදා සහන ඉල්ලීම්',
    nameEn: 'Disaster Relief Requests',
    fee: 0,
    durationSi: 'නොමිලේ',
    descriptionSi: 'ගංවතුර, නායයෑම් ඇතුළු ආපදා ආධාර ඉල්ලීම්',
    isFree: true,
  },
  // 07. සහන කඳවුරු ලියාපදිංචිය : නොමිලේ
  relief_camps: {
    id: 7,
    key: 'relief_camps',
    nameSi: 'සහන කඳවුරු ලියාපදිංචිය',
    nameEn: 'Relief Camps Registration',
    fee: 0,
    durationSi: 'නොමිලේ',
    descriptionSi: 'ආපදා සහන හා අවතැන් කඳවුරු පද්ධතියට ලියාපදිංචිය',
    isFree: true,
  },
  // 08. හදිසි සේවා අංක : නොමිලේ
  emergency_numbers: {
    id: 8,
    key: 'emergency_numbers',
    nameSi: 'හදිසි සේවා අංක',
    nameEn: 'Emergency Numbers',
    fee: 0,
    durationSi: 'නොමිලේ',
    descriptionSi: 'රෝහල්, පොලීසිය, ගිනි නිවන ඇතුළු හදිසි සේවා අංක',
    isFree: true,
  },
  // 09. හමුවනලද : නොමිලේ
  found_items: {
    id: 9,
    key: 'found_items',
    nameSi: 'හමුවනලද (Found Items)',
    nameEn: 'Found Items',
    fee: 0,
    durationSi: 'නොමිලේ',
    descriptionSi: 'අහුලාගත් හෝ හමුවූ බඩු හා ලියකියවිලි හිමිකරුට ලබාදීම',
    isFree: true,
  },
  // 10. වෘත්තීය සේවා පළකිරීම : නොමිලේ
  professional_service: {
    id: 10,
    key: 'professional_service',
    nameSi: 'වෘත්තීය සේවා පළකිරීම',
    nameEn: 'Post Professional Service',
    fee: 0,
    durationSi: 'නොමිලේ',
    descriptionSi: 'කාර්මික ශිල්පීන්, වෛද්‍ය, නීති ඇතුළු වෘත්තීය සේවා පළකිරීම',
    isFree: true,
  },
  // 11. නවාතැන් පළකිරීම : නොමිලේ
  accommodation_post: {
    id: 11,
    key: 'accommodation_post',
    nameSi: 'නවාතැන් පළකිරීම',
    nameEn: 'Post Accommodation',
    fee: 0,
    durationSi: 'නොමිලේ',
    descriptionSi: 'බෝඩිම්, කුලී නිවාස හා නවාතැන් පළකිරීම',
    isFree: true,
  },
  // 12. රැකියා පළකිරීම : නොමිලේ
  job_post: {
    id: 12,
    key: 'job_post',
    nameSi: 'රැකියා පළකිරීම',
    nameEn: 'Post Jobs',
    fee: 0,
    durationSi: 'නොමිලේ',
    descriptionSi: 'සේවක පුරප්පාඩු හා රැකියා අවස්ථා පළකිරීම',
    isFree: true,
  },
  // 13. ඉක්මන් සේවා : රු. 25.00 = දින තුනක් පුරා
  quick_services: {
    id: 13,
    key: 'quick_services',
    nameSi: 'ඉක්මන් සේවා',
    nameEn: 'Quick Services',
    fee: 25,
    durationSi: 'දින තුනක් පුරා',
    durationDays: 3,
    descriptionSi: 'ක්ෂණික හා ඉක්මන් සහය සේවා දැන්වීම්',
    isFree: false,
  },
  // 14. සාමාන්‍ය සේවා : රු. 25.00 = මාස තුනක් පුරා
  general_help: {
    id: 14,
    key: 'general_help',
    nameSi: 'සාමාන්‍ය සේවා',
    nameEn: 'General Services',
    fee: 25,
    durationSi: 'මාස තුනක් පුරා',
    durationDays: 90,
    descriptionSi: 'සාමාන්‍ය සහය සේවා හා ප්‍රජා දැන්වීම්',
    isFree: false,
  },
  // 15. නැති වූ දෙයක් : රු. 50.00 = සොයාගන්නාතුරු
  lost_item: {
    id: 15,
    key: 'lost_item',
    nameSi: 'නැති වූ දෙයක්',
    nameEn: 'Lost Item',
    fee: 50,
    durationSi: 'සොයාගන්නාතුරු',
    descriptionSi: 'නැතිවූ භාණ්ඩ හෝ ලියකියවිලි සොයාගන්නාතුරු ප්‍රදර්ශනය',
    isFree: false,
  },
  // 16. සොරාගත් දෙයක් : රු. 50.00 = සොයාගන්නාතුරු
  stolen_item: {
    id: 16,
    key: 'stolen_item',
    nameSi: 'සොරාගත් දෙයක්',
    nameEn: 'Stolen Item',
    fee: 50,
    durationSi: 'සොයාගන්නාතුරු',
    descriptionSi: 'සොරාගත් දේ පිළිබඳ තොරතුරු සොයාගන්නාතුරු ප්‍රදර්ශනය',
    isFree: false,
  },
  // 17. සොයාදෙන්න : රු. 50.00 = සොයාගන්නාතුරු
  find_for_me: {
    id: 17,
    key: 'find_for_me',
    nameSi: 'සොයාදෙන්න',
    nameEn: 'Find for Me',
    fee: 50,
    durationSi: 'සොයාගන්නාතුරු',
    descriptionSi: 'තමන්ට අවශ්‍ය විශේෂිත භාණ්ඩ හෝ සේවා සොයාගන්නාතුරු',
    isFree: false,
  },
  // 18. හුවමාරුවට : රු. 25.00 = හුවමාරුව සිදුවනතුරු
  exchange: {
    id: 18,
    key: 'exchange',
    nameSi: 'හුවමාරුවට',
    nameEn: 'Barter / Exchange',
    fee: 25,
    durationSi: 'හුවමාරුව සිදුවනතුරු',
    descriptionSi: 'භාණ්ඩ හෝ සේවා හුවමාරුව සිදුවනතුරු ප්‍රදර්ශනය',
    isFree: false,
  },
  // 19. වෘත්තීය සේවා නැරඹීම : රු. 25.00 : සතියක නැරඹුම් කාලයක් නොමිලේ
  browse_pro_services: {
    id: 19,
    key: 'browse_pro_services',
    nameSi: 'වෘත්තීය සේවා නැරඹීම',
    nameEn: 'Browse Professional Services',
    fee: 25,
    durationSi: 'සතියකට රු. 25.00 බැගින්',
    durationDays: 7,
    descriptionSi: 'වෘත්තීය සේවා තොරතුරු නැරඹීම සඳහා සතියකට රු. 25.00 කි',
    isFree: false,
  },
  // 20. නවාතැන් සෙවීම : රු. 25.00 : සතියක් නැරඹුම් කාලයක් නොමිලේ
  search_accommodation: {
    id: 20,
    key: 'search_accommodation',
    nameSi: 'නවාතැන් සෙවීම',
    nameEn: 'Search Accommodation',
    fee: 25,
    durationSi: 'සතියකට රු. 25.00 බැගින්',
    durationDays: 7,
    descriptionSi: 'නවාතැන් සහ කුලී නිවාස සෙවීම සඳහා සතියකට රු. 25.00 කි',
    isFree: false,
  },
  // 21. රැකියා සෙවීම : රු. 25.00 : සතියක් නැරඹුම් කාලයක් නොමිලේ
  search_jobs: {
    id: 21,
    key: 'search_jobs',
    nameSi: 'රැකියා සෙවීම',
    nameEn: 'Search Jobs',
    fee: 25,
    durationSi: 'සතියකට රු. 25.00 බැගින්',
    durationDays: 7,
    descriptionSi: 'රැකියා අවස්ථා සෙවීම සඳහා සතියකට රු. 25.00 කි',
    isFree: false,
  },

  // Legacy Aliases
  waste_giveaway: {
    id: 22,
    key: 'waste_giveaway',
    nameSi: 'ඉවත්කරන ද්‍රව්‍ය',
    nameEn: 'Waste Giveaway',
    fee: 0,
    durationSi: 'නොමිලේ',
    descriptionSi: 'ඉවත්කරන / ප්‍රතිචක්‍රීකරණය සඳහා ලබාදෙන දැන්වීම්',
    isFree: true,
  },
  donation: {
    id: 23,
    key: 'donation',
    nameSi: 'පරිත්‍යාග',
    nameEn: 'Donations',
    fee: 0,
    durationSi: 'නොමිලේ',
    descriptionSi: 'මගෙන් ඔබට නොමිලේ ලබාදෙන පරිත්‍යාග',
    isFree: true,
  },
  boost_ad: {
    id: 24,
    key: 'boost_ad',
    nameSi: 'දැන්වීම් Boost කිරීම',
    nameEn: 'Boost Ad',
    fee: 250,
    durationSi: 'දින 7ක් ඉහළින්ම',
    durationDays: 7,
    descriptionSi: 'රු. 250 ක මුදලක් ගෙවා අදාළ කාණ්ඩය තුළ දැන්වීම ඉහළින්ම ප්‍රදර්ශනය කිරීම',
    isFree: false,
  },
};

export const CATEGORY_CREDIT_FEES: Record<string, CategoryFeeDetail> = DEFAULT_CATEGORY_CREDIT_FEES;

const STORAGE_KEY_TRANSACTIONS = 'sahaya_credit_transactions';
const STORAGE_KEY_BALANCES = 'sahaya_user_credit_balances';
const STORAGE_KEY_FEES_OVERRIDES = 'sahaya_custom_service_fees';

/**
 * Get effective category fees (with admin custom overrides if any)
 */
export const getEffectiveCategoryFees = (): Record<string, CategoryFeeDetail> => {
  if (typeof window === 'undefined') return DEFAULT_CATEGORY_CREDIT_FEES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FEES_OVERRIDES);
    if (raw) {
      const overrides = JSON.parse(raw);
      return { ...DEFAULT_CATEGORY_CREDIT_FEES, ...overrides };
    }
  } catch (err) {
    console.warn('Failed to parse custom service fees overrides:', err);
  }
  return DEFAULT_CATEGORY_CREDIT_FEES;
};

/**
 * Admin updates service fees and durations dynamically
 */
export const updateServiceFeesByAdmin = (
  updatedFees: Record<string, CategoryFeeDetail>
): void => {
  try {
    localStorage.setItem(STORAGE_KEY_FEES_OVERRIDES, JSON.stringify(updatedFees));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sahaya:service_fees_updated', { detail: updatedFees }));
    }
  } catch (err) {
    console.warn('Failed to save service fees overrides:', err);
  }
};

/**
 * Reset service fees back to platform defaults
 */
export const resetServiceFeesToDefault = (): Record<string, CategoryFeeDetail> => {
  try {
    localStorage.removeItem(STORAGE_KEY_FEES_OVERRIDES);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sahaya:service_fees_updated', { detail: DEFAULT_CATEGORY_CREDIT_FEES })
      );
    }
  } catch (err) {
    console.warn('Failed to reset service fees:', err);
  }
  return DEFAULT_CATEGORY_CREDIT_FEES;
};

/**
 * Format timestamp nicely (YYYY-MM-DD HH:MM AM/PM)
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
  hours = hours ? hours : 12;
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
  if (user.isDemo) return 100;

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

  if (userTxs.length === 0 && user.status === 'approved') {
    const defaultTx: CreditTransaction = {
      id: `tx_welcome_${numericId || 'init'}`,
      userId: idKey,
      userNumericId: numericId || '00000000',
      userName: user?.name || 'පරිශීලක',
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
 * Search user's full transactions by NIC number (Admin Audit Tool)
 */
export const getUserTransactionsByNic = (
  nicNumber: string,
  allUsers: User[] = []
): {
  user: User | null;
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
  transactions: CreditTransaction[];
} => {
  const cleanNic = (nicNumber || '').trim().toLowerCase();
  const numericOnly = extractNumericId(cleanNic);

  if (!cleanNic) {
    return {
      user: null,
      totalIncome: 0,
      totalExpenses: 0,
      currentBalance: 0,
      transactions: [],
    };
  }

  // Find user matching NIC
  const matchedUser = allUsers.find((u) => {
    if (!u) return false;
    const uNic = (u.nicNumber || '').trim().toLowerCase();
    const uNumeric = extractNumericId(u.nicNumber || u.userId);
    return uNic === cleanNic || (numericOnly && uNumeric === numericOnly);
  }) || null;

  const allTx = getStoredCreditTransactions();
  const userTxs = allTx.filter((tx) => {
    const txNic = (tx.userNic || '').trim().toLowerCase();
    const txNumeric = (tx.userNumericId || '').trim();
    if (cleanNic && txNic === cleanNic) return true;
    if (numericOnly && txNumeric === numericOnly) return true;
    if (matchedUser) {
      if (tx.userId === matchedUser.id || tx.userId === matchedUser.userId) return true;
      if (matchedUser.phone && tx.userPhone === matchedUser.phone) return true;
    }
    return false;
  }).sort((a, b) => b.timestampMs - a.timestampMs);

  let totalIncome = 0;
  let totalExpenses = 0;

  userTxs.forEach((tx) => {
    if (tx.amount > 0) {
      totalIncome += tx.amount;
    } else {
      totalExpenses += Math.abs(tx.amount);
    }
  });

  const currentBalance = matchedUser ? getUserCreditBalance(matchedUser) : Math.max(0, totalIncome - totalExpenses);

  return {
    user: matchedUser,
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
    currentBalance: Number(currentBalance.toFixed(2)),
    transactions: userTxs,
  };
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
    userName: user?.name || 'පරිශීලක',
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
  const rewardAmount = 2;
  const newBalance = Number((currentBalance + rewardAmount).toFixed(2));

  const balancesMap = getBalancesMap();
  balancesMap[numericId] = newBalance;
  if (idKey) balancesMap[idKey] = newBalance;
  saveBalancesMap(balancesMap);

  const tx: CreditTransaction = {
    id: `tx_emg_reward_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId: idKey,
    userNumericId: numericId,
    userName: user?.name || 'පරිශීලක',
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
  const fees = getEffectiveCategoryFees();
  const item = fees[categoryKey];
  if (item) return item.fee;
  return 25;
};

/**
 * Deduct posting fee before creating an Ad / Service / Post
 */
export const deductPostingFee = (
  user?: User | null,
  feeKey: string = 'general_help',
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
  const fees = getEffectiveCategoryFees();
  const feeInfo = fees[feeKey] || {
    id: 14,
    key: feeKey,
    nameSi: 'සාමාන්‍ය සේවා ගාස්තුව',
    nameEn: 'General Services',
    fee: 25,
    durationSi: 'මාස තුනක් පුරා',
    durationDays: 90,
    descriptionSi: 'දැන්වීම් පළකිරීමේ සේවා ගාස්තුව',
    isFree: false,
  };

  const requiredFee = feeInfo.fee;
  const currentBalance = getUserCreditBalance(user);

  // If service is free (Categories 01-12)
  if (requiredFee <= 0 || feeInfo.isFree) {
    return {
      success: true,
      newBalance: currentBalance,
      currentBalance,
      requiredFee: 0,
      requiredAmount: 0,
    };
  }

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

  const balancesMap = getBalancesMap();
  balancesMap[numericId] = newBalance;
  if (idKey) balancesMap[idKey] = newBalance;
  saveBalancesMap(balancesMap);

  const tx: CreditTransaction = {
    id: `tx_fee_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId: idKey,
    userNumericId: numericId,
    userName: user?.name || 'පරිශීලක',
    userNic: user.nicNumber,
    userPhone: user.phone,
    amount: -requiredFee,
    type: 'ad_fee',
    title: customTitle || `${feeInfo.nameSi}${postCode ? ` (${postCode})` : ''}`,
    description: `${feeInfo.descriptionSi} - ගිණුමෙන් අයකරගත් මුදල (${feeInfo.durationSi})`,
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
 * Calculate post validity info & countdown for author
 */
export const getPostValidityInfo = (post?: HelpPost | any): {
  categoryKey: string;
  nameSi: string;
  fee: number;
  durationSi: string;
  remainingText: string;
  isExpired: boolean;
  isFree: boolean;
} => {
  if (!post) {
    return {
      categoryKey: 'general_help',
      nameSi: 'සාමාන්‍ය සේවා',
      fee: 25,
      durationSi: 'මාස තුනක් පුරා',
      remainingText: 'සක්‍රීයයි',
      isExpired: false,
      isFree: false,
    };
  }

  const fees = getEffectiveCategoryFees();
  let matchedKey = 'general_help';

  const catStr = (post.category || post.serviceType || post.tagName || post.tagCategory || '').toLowerCase();
  const titleStr = (post.headline || post.title || post.whatHappened || '').toLowerCase();

  if (catStr.includes('quick_service') || titleStr.includes('ඉක්මන්')) {
    matchedKey = 'quick_services';
  } else if (titleStr.includes('නැති') || catStr.includes('lost')) {
    matchedKey = 'lost_item';
  } else if (titleStr.includes('සොරා') || catStr.includes('stolen')) {
    matchedKey = 'stolen_item';
  } else if (catStr.includes('find_for_me') || titleStr.includes('සොයාදෙන්න')) {
    matchedKey = 'find_for_me';
  } else if (catStr.includes('exchange') || catStr.includes('හුවමාරු') || titleStr.includes('හුවමාරු')) {
    matchedKey = 'exchange';
  } else if (catStr.includes('accommodation') || titleStr.includes('නවාතැන්') || titleStr.includes('බෝඩිම්')) {
    matchedKey = 'accommodation_post';
  } else if (catStr.includes('job') || titleStr.includes('රැකියා') || titleStr.includes('ඇබෑර්තු')) {
    matchedKey = 'job_post';
  } else if (post.postType === 'pro_service' || catStr.includes('pro_service') || titleStr.includes('වෘත්තීය')) {
    matchedKey = 'professional_service';
  } else if (catStr.includes('found') || titleStr.includes('හමුවූ') || titleStr.includes('හමුවනලද')) {
    matchedKey = 'found_items';
  } else if (fees[post.categoryKey]) {
    matchedKey = post.categoryKey;
  }

  const feeInfo = fees[matchedKey] || fees['general_help'];
  const durationSi = feeInfo.durationSi;
  let remainingText = 'සක්‍රීයයි';
  let isExpired = false;

  // Compute remaining time if days specified
  if (feeInfo.durationDays && feeInfo.durationDays > 0) {
    const createdDate = post.createdAtIso ? new Date(post.createdAtIso) : post.createdAt ? new Date(post.createdAt) : new Date();
    const createdMs = createdDate.getTime() || Date.now();
    const expiryMs = createdMs + (feeInfo.durationDays * 24 * 60 * 60 * 1000);
    const remainingMs = expiryMs - Date.now();

    if (remainingMs <= 0) {
      isExpired = true;
      remainingText = 'කාලසීමාව අවසන්ව ඇත';
    } else {
      const remDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
      const remHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      if (remDays > 0) {
        remainingText = `තව දින ${remDays} ක් ඉතිරිව ඇත`;
      } else {
        remainingText = `තව පැය ${remHours} ක් ඉතිරිව ඇත`;
      }
    }
  } else if (matchedKey === 'lost_item' || matchedKey === 'stolen_item' || matchedKey === 'find_for_me') {
    if (post.isResolved || post.isCompleted) {
      remainingText = 'සොයාගන්නා ලදී (සම්පූර්ණයි)';
    } else {
      remainingText = 'සොයාගන්නාතුරු සක්‍රීයයි';
    }
  } else if (matchedKey === 'exchange') {
    if (post.isResolved || post.isCompleted) {
      remainingText = 'හුවමාරුව සම්පූර්ණයි';
    } else {
      remainingText = 'හුවමාරුව සිදුවනතුරු සක්‍රීයයි';
    }
  } else if (feeInfo.isFree) {
    remainingText = 'නොමිලේ (සක්‍රීයයි)';
  }

  return {
    categoryKey: matchedKey,
    nameSi: feeInfo.nameSi,
    fee: feeInfo.fee,
    durationSi,
    remainingText,
    isExpired,
    isFree: feeInfo.isFree,
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
    userName: user?.name || 'පරිශීලක',
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
    userName: user?.name || 'පරිශීලක',
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
    userName: seekerUser?.name || 'පරිශීලක',
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
  const boostDurationMs = 7 * 24 * 60 * 60 * 1000;
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
      userName: user?.name || 'පරිශීලක',
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
    const numericId = extractNumericId(user.nicNumber || user.userId);
    const idKey = user.id || user.userId || '';
    transaction = {
      id: `tx_boost_direct_${now}_${Math.floor(Math.random() * 1000)}`,
      userId: idKey,
      userNumericId: numericId,
      userName: user?.name || 'පරිශීලක',
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
  { id: 'bank_deposit', label: '🏦 BOC බැංකු තැන්පතු අනුමැතිය (BOC Direct Bank Deposit)', amount: 500, type: 'deposit' as CreditTransactionType },
  { id: 'welcome_gift', label: '🎉 ලියාපදිංචි විශේෂ පිළිගැනීමේ ත්‍යාගය (Welcome Bonus)', amount: 100, type: 'welcome_gift' as CreditTransactionType },
  { id: 'community_reward', label: '🤝 ප්‍රජා සේවා දායකත්ව ත්‍යාගය (Community Contributor Reward)', amount: 250, type: 'reward' as CreditTransactionType },
  { id: 'emergency_reward', label: '🚨 හදිසි දුරකථන අංක එකතු කිරීමේ ත්‍යාගය (Emergency Directory Reward)', amount: 50, type: 'reward' as CreditTransactionType },
  { id: 'admin_refund', label: '🔄 වැරදි අයවීමක් ආපසු ගෙවීම (Admin Refund / Correction)', amount: 100, type: 'admin_adjustment' as CreditTransactionType },
  { id: 'other_add', label: '✍️ වෙනත් විශේෂ බැර කිරීමක් (Other Credit Addition)', amount: 100, type: 'admin_adjustment' as CreditTransactionType },
];

export const ADMIN_DEDUCT_REASON_PRESETS = [
  { id: 'travel_penalty', label: '⚖️ මගහැරීම් වන්දි / ගමන් ගාස්තු අය කිරීම (No-Show Travel Compensation)', amount: 200, type: 'penalty_compensation' as CreditTransactionType },
  { id: 'ad_fee', label: '📢 දැන්වීම් සේවා ගාස්තු අතින් අය කිරීම (Manual Ad Posting Fee)', amount: 100, type: 'ad_fee' as CreditTransactionType },
  { id: 'policy_violation', label: '⚠️ ව්‍යාජ හෝ නීති විරෝධී දැන්වීම් දඩ මුදල (Policy Violation Penalty)', amount: 150, type: 'penalty_compensation' as CreditTransactionType },
  { id: 'system_correction', label: '🔧 පද්ධති ගැලපුම් අඩු කිරීම (Manual System Debit / Correction)', amount: 100, type: 'admin_adjustment' as CreditTransactionType },
  { id: 'other_deduct', label: '✍️ වෙනත් අය කිරීමක් (Other Debit Deduction)', amount: 50, type: 'admin_adjustment' as CreditTransactionType },
];


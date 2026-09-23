import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Sparkles, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  Languages, 
  Bot, 
  User, 
  Check, 
  Copy, 
  ArrowRightLeft, 
  ChevronRight,
  ExternalLink,
  Droplet,
  Zap,
  Search,
  Gift,
  Users,
  ShoppingCart,
  Wallet,
  PhoneCall,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Language } from '../types';
import { 
  ChatMessageItem, 
  askAssistant, 
  translateText, 
  detectLanguage,
  AssistantAction 
} from '../utils/aiAssistantEngine';

interface OmniAssistantChatBoxProps {
  currentLanguage: Language;
  onLanguageChange?: (lang: Language) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: 'auth' | 'full';
  // Sector action triggers from parent
  onOpenBloodAndDisaster?: () => void;
  onOpenQuickServices?: () => void;
  onOpenFindForMe?: () => void;
  onOpenFromMeToYou?: () => void;
  onOpenGroupWork?: () => void;
  onOpenMarketplace?: () => void;
  onOpenWallet?: () => void;
  onOpenEmergencyDirectory?: () => void;
  onOpenHelpPost?: () => void;
  onOpenRedAlertCreate?: () => void;
  onOpenProfessionalServices?: () => void;
  // Auth action triggers from parent
  onSwitchToRegister?: () => void;
  onSwitchToLogin?: () => void;
  onOpenIssuesHelp?: () => void;
  onDemoLogin?: () => void;
}

export const OmniAssistantChatBox: React.FC<OmniAssistantChatBoxProps> = ({
  currentLanguage,
  onLanguageChange,
  isOpen: externalIsOpen,
  onOpenChange,
  mode = 'full',
  onOpenBloodAndDisaster,
  onOpenQuickServices,
  onOpenFindForMe,
  onOpenFromMeToYou,
  onOpenGroupWork,
  onOpenMarketplace,
  onOpenWallet,
  onOpenEmergencyDirectory,
  onOpenHelpPost,
  onOpenRedAlertCreate,
  onOpenProfessionalServices,
  onSwitchToRegister,
  onSwitchToLogin,
  onOpenIssuesHelp,
  onDemoLogin,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    setInternalIsOpen(val);
    onOpenChange?.(val);
  };

  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'translator'>('chat');
  const [chatLanguage, setChatLanguage] = useState<Language>(currentLanguage);

  // Synchronize when parent language changes
  useEffect(() => {
    setChatLanguage(currentLanguage);
  }, [currentLanguage]);

  // Chat State
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    if (mode === 'auth') {
      return [
        {
          id: 'msg_welcome_auth',
          sender: 'assistant',
          text:
            chatLanguage === 'en'
              ? '👋 Hello! I am your **Login & Registration Support Buddy**.\nI am here to assist you with creating an account, logging in, taking clear NIC photos, and resolving credential issues.\n\n• 📝 New Account Registration Help\n• 🔑 Login & Password Support\n• 🆔 Clear NIC Photo Guidelines\n• ⏳ Account Verification Status\n\nHow can I help you get started?'
              : chatLanguage === 'ta'
              ? '👋 வணக்கம்! நான் உங்கள் **உள்நுழைவு மற்றும் பதிவு உதவி வழிகாட்டி**.\nகணக்கை உருவாக்குவது, உள்நுழைவது, தேசிய அடையாள அட்டை (NIC) படங்களை பதிவேற்றுவது பற்றிய உதவிகளை நான் வழங்குகிறேன்.\n\n• 📝 புதிய பதிவு வழிகாட்டல்\n• 🔑 உள்நுழைவு உதவி\n• 🆔 அடையாள அட்டை புகைப்பட வழிகாட்டல்\n• ⏳ கணக்கு அனுமதி நிலை\n\nஉங்களுக்கு என்ன உதவி தேவை?'
              : '👋 ආයුබෝවන්! මම ඔබගේ **පිවිසුම් සහ ලියාපදිංචි සහය මිතුරා (Login & Registration Support)**.\nපද්ධතියට සාදරයෙන් පිළිගනිමු! ගිණුමක් සෑදීම, Login වීම, NIC ඡායාරූප නිවැරදිව ගැනීම සහ මුරපද ගැටලු සඳහා මට ඔබට උදවු කළ හැක:\n\n• 📝 නව ගිණුමක් ලියාපදිංචි කරගැනීම\n• 🔑 Login වීමේ ගැටලු සහ උපකාර\n• 🆔 හැඳුනුම්පත් (NIC) ඡායාරූප නිවැරදිව ගැනීම\n• ⏳ ගිණුම් අනුමැතිය සහ සත්‍යාපනය\n\nඔබට අවශ්‍ය සහය කුමක්ද?',
          detectedLang: chatLanguage,
          timestamp: 'දැන්',
          actions: [
            {
              type: 'switch_to_register',
              label: chatLanguage === 'en' ? '📝 Register' : chatLanguage === 'ta' ? '📝 பதிவு செய்க' : '📝 නව ලියාපදිංචිය',
            },
            {
              type: 'switch_to_login',
              label: chatLanguage === 'en' ? '🔑 Sign In' : chatLanguage === 'ta' ? '🔑 உள்நுழைக' : '🔑 Login පිටුව',
            },
            {
              type: 'open_issues_help',
              label: chatLanguage === 'en' ? '❓ Help & Support' : chatLanguage === 'ta' ? '❓ உதவி கோரிக்கை' : '❓ ගැටලු & උපකාර',
            },
          ],
          quickChips:
            chatLanguage === 'en'
              ? ['How to register?', 'Cannot log in', 'NIC photo upload help', 'Try User Demo']
              : chatLanguage === 'ta'
              ? ['பதிவு செய்வது எப்படி?', 'உள்நுழைய முடியவில்லை', 'NIC உதவி', 'பார்வையாளர் டெமோ']
              : ['නව ගිණුමක් හදන්නේ කොහොමද?', 'Login වෙන්න බැහැ', 'NIC ඡායාරූප ගන්නේ කොහොමද?', 'නරඹන්නා ලෙස පිවිසෙන්න (Demo)'],
        },
      ];
    }

    return [
      {
        id: 'msg_welcome',
        sender: 'assistant',
        text:
          chatLanguage === 'en'
            ? '👋 Hello! I am **Sahaya Mithura (AI Assistant)**.\nYou can ask me **any question on any topic** (general knowledge, science, education, advice, daily life) or get step-by-step guidance for any **Sahaya Seva** community service.\n\nWhat would you like to ask or explore today?'
            : chatLanguage === 'ta'
            ? '👋 வணக்கம்! நான் உங்கள் **சகாய AI உதவியாளர்**.\nபொது அறிவு, அறிவியல், கல்வி, அன்றாட வாழ்க்கை ஆலோசனை அல்லது **சகாய சேவை** தளத்தின் சேவைகள் உட்பட **எந்தவொரு கேள்வியையும்** என்னிடம் கேட்கலாம்.\n\nஇன்று உங்களுக்கு எவ்வாறு உதவ முடியும்?'
            : '👋 ආයුබෝවන්! මම ඔබගේ **සහය මිතුරා (Sahaya AI Assistant)**.\nසාමාන්‍ය දැනුම, අධ්‍යාපනය, විද්‍යාව, එදිනෙදා උපදෙස් ඇතුළු **ඕනෑම විෂයයක ඕනෑම ප්‍රශ්නයක්** මෙන්ම **සහය සේවා පද්ධතියේ සියලුම සේවාවන්** පිළිබඳව මගෙන් විමසිය හැක.\n\nඔබට අද මගෙන් දැනගැනීමට අවශ්‍ය කුමක්ද?',
        detectedLang: chatLanguage,
        timestamp: 'දැන්',
        actions: [
          {
            type: 'open_help_post',
            label:
              chatLanguage === 'en'
                ? '📝 Post Help'
                : chatLanguage === 'ta'
                ? '📝 உதவி கோரிக்கை'
                : '📝 උපකාර ඉල්ලුම් පෝරමය',
          },
          {
            type: 'open_quick',
            label:
              chatLanguage === 'en'
                ? '⚡ Quick Services'
                : chatLanguage === 'ta'
                ? '⚡ விரைவு சேவைகள்'
                : '⚡ ඉක්මන් සේවා',
          },
          {
            type: 'open_market',
            label:
              chatLanguage === 'en'
                ? '🛒 Lowest Prices'
                : chatLanguage === 'ta'
                ? '🛒 சந்தை விலைகள்'
                : '🛒 අඩුම මිල ගණන්',
          },
          {
            type: 'open_blood',
            label:
              chatLanguage === 'en'
                ? '🩸 Blood & Disaster'
                : chatLanguage === 'ta'
                ? '🩸 இரத்த தானம்'
                : '🩸 හදිසි ලේ කේන්ද්‍රය',
          },
        ],
        quickChips:
          chatLanguage === 'en'
            ? ['Ask any question', 'How to fill Help Form?', 'Check Market Prices', 'Emergency Blood']
            : chatLanguage === 'ta'
            ? ['எந்த கேள்வியையும் கேளுங்கள்', 'படிவம் நிரப்புவது எப்படி?', 'சந்தை விலைகள்', 'இரத்தம் தேவை']
            : ['ඕනෑම ප්‍රශ්නයක් අසන්න', 'පෝරම පුරවන්නේ කොහොමද?', 'අඩුම මිල ගණන් බලන්න', 'හදිසි ලේ අවශ්‍යයි'],
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, activeTab]);

  // Translator Tab State
  const [transSourceText, setTransSourceText] = useState('');
  const [transTargetLang, setTransTargetLang] = useState<'si' | 'en' | 'ta'>('si');
  const [transOutput, setTransOutput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Send Query to AI
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    const userMessageId = `user_${Date.now()}`;
    const detected = detectLanguage(textToSend);

    const newUserMsg: ChatMessageItem = {
      id: userMessageId,
      sender: 'user',
      text: textToSend,
      detectedLang: detected,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const history = messages.slice(-6).map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        text: m.text,
      }));

      const res = await askAssistant(textToSend, chatLanguage, history, mode === 'auth' ? 'auth' : 'full');

      const assistantMsgId = `asst_${Date.now()}`;
      const assistantMsg: ChatMessageItem = {
        id: assistantMsgId,
        sender: 'assistant',
        text: res.text,
        detectedLang: chatLanguage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: res.actions,
        quickChips: res.quickChips,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessageItem = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text:
          chatLanguage === 'en'
            ? '⚠️ Connection glitch. Please try again or select a quick option below.'
            : chatLanguage === 'ta'
            ? '⚠️ தொடர்பு பிழை. மீண்டும் முயற்சிக்கவும் அல்லது கீழே உள்ள தெரிவை அழுத்தவும்.'
            : '⚠️ සම්බන්ධතා ගැටලුවකි. කරුණාකර නැවත උත්සාහ කරන්න හෝ පහතින් විකල්පයක් තෝරන්න.',
        detectedLang: chatLanguage,
        timestamp: 'දැන්',
        actions: mode === 'auth' ? [
          { type: 'switch_to_login', label: '🔑 Login' },
          { type: 'open_issues_help', label: '❓ Help & Support' },
        ] : [
          { type: 'open_blood', label: '🩸 හදිසි ලේ කේන්ද්‍රය' },
          { type: 'open_quick', label: '⚡ ඉක්මන් සේවා' },
        ],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // On-demand message translation toggle
  const handleTranslateMessage = async (msgId: string, targetLang: 'si' | 'en' | 'ta') => {
    const targetMsg = (messages || []).find((m) => m && m.id === msgId);
    if (!targetMsg) return;

    if (targetMsg.translations?.[targetLang]) {
      setMessages((prev) =>
        (prev || []).map((m) => (m && m.id === msgId ? { ...m, activeViewLang: targetLang } : m))
      );
      return;
    }

    try {
      const translated = await translateText(targetMsg.text, targetLang);
      setMessages((prev) =>
        (prev || []).map((m) =>
          m && m.id === msgId
            ? {
                ...m,
                translations: {
                  ...m.translations,
                  [targetLang]: translated,
                },
                activeViewLang: targetLang,
              }
            : m
        )
      );
    } catch {
      // ignore
    }
  };

  // Action Button Click Router
  const handleActionClick = (action: AssistantAction) => {
    switch (action.type) {
      case 'open_blood':
        onOpenBloodAndDisaster?.();
        break;
      case 'open_quick':
        onOpenQuickServices?.();
        break;
      case 'open_find':
        onOpenFindForMe?.();
        break;
      case 'open_from_you':
        onOpenFromMeToYou?.();
        break;
      case 'open_group':
        onOpenGroupWork?.();
        break;
      case 'open_market':
        onOpenMarketplace?.();
        break;
      case 'open_wallet':
        onOpenWallet?.();
        break;
      case 'open_directory':
        onOpenEmergencyDirectory?.();
        break;
      case 'open_help_post':
      case 'post_help':
        onOpenHelpPost?.();
        break;
      case 'open_red_alert_create':
        onOpenRedAlertCreate?.();
        break;
      case 'open_pro_services':
        onOpenProfessionalServices?.();
        break;
      case 'switch_to_register':
        onSwitchToRegister?.();
        break;
      case 'switch_to_login':
        onSwitchToLogin?.();
        break;
      case 'open_issues_help':
        onOpenIssuesHelp?.();
        break;
      case 'demo_login':
        onDemoLogin?.();
        break;
      default:
        break;
    }
  };

  // Perform translation in translator tab
  const handlePerformTranslation = async () => {
    if (!transSourceText.trim()) return;
    setIsTranslating(true);
    try {
      const res = await translateText(transSourceText, transTargetLang);
      setTransOutput(res);
    } catch {
      setTransOutput('පරිවර්තනය අසාර්ථක විය. නැවත උත්සාහ කරන්න.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyTranslation = () => {
    if (!transOutput) return;
    navigator.clipboard.writeText(transOutput);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const getActionIcon = (type: AssistantAction['type']) => {
    switch (type) {
      case 'open_blood':
        return <Droplet className="w-3.5 h-3.5 text-red-500 fill-red-500" />;
      case 'open_quick':
        return <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />;
      case 'open_find':
        return <Search className="w-3.5 h-3.5 text-sky-500" />;
      case 'open_from_you':
        return <Gift className="w-3.5 h-3.5 text-emerald-500" />;
      case 'open_group':
        return <Users className="w-3.5 h-3.5 text-purple-500" />;
      case 'open_market':
        return <ShoppingCart className="w-3.5 h-3.5 text-teal-500" />;
      case 'open_wallet':
        return <Wallet className="w-3.5 h-3.5 text-amber-500" />;
      case 'open_directory':
        return <PhoneCall className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <ExternalLink className="w-3.5 h-3.5" />;
    }
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 group animate-bounce-short">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-emerald-950/90 text-white text-xs font-semibold shadow-lg border border-emerald-500/40 backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span>
              {chatLanguage === 'en'
                ? 'Chat & Auto-Translate (3 Languages)'
                : chatLanguage === 'ta'
                ? 'அரட்டை & மொழிபெயர்ப்பாளர்'
                : 'සහය මිතුරා & පරිවර්තකය'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl hover:shadow-2xl shadow-emerald-700/30 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/60 dark:border-emerald-300/40"
            aria-label="Open Sahaya AI Assistant and Translator"
          >
            {/* Pulsing ring */}
            <span className="absolute -inset-1 rounded-full bg-emerald-500/30 animate-ping opacity-75 pointer-events-none" />

            <div className="relative flex items-center justify-center">
              <Bot className="w-7 h-7" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 border-2 border-emerald-700 rounded-full flex items-center justify-center text-[7px] font-black text-slate-900">
                AI
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Main Expandable Chat Box Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 shadow-2xl flex flex-col ${
            isMinimized
              ? 'bottom-4 right-4 w-72 sm:w-80 h-14 rounded-2xl overflow-hidden border border-emerald-500/50 bg-white dark:bg-[#071810]'
              : 'bottom-2 sm:bottom-4 right-2 sm:right-4 w-[calc(100vw-16px)] sm:w-[440px] md:w-[480px] h-[580px] max-h-[calc(100vh-24px)] rounded-2xl sm:rounded-3xl border border-emerald-500/40 bg-white/95 dark:bg-[#06150d]/95 backdrop-blur-xl'
          }`}
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0 rounded-t-2xl sm:rounded-t-3xl shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40 shrink-0">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-black tracking-wide">
                    {chatLanguage === 'en'
                      ? 'Sahaya AI Assistant'
                      : chatLanguage === 'ta'
                      ? 'சகாய AI உதவியாளர்'
                      : 'සහය මිතුරා (AI Assistant)'}
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[8px] font-bold bg-amber-400 text-slate-900">
                    3-LANG
                  </span>
                </div>
                <p className="text-[10px] text-emerald-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span>
                    {mode === 'auth'
                      ? chatLanguage === 'en'
                        ? 'Online • Login & Registration Buddy'
                        : chatLanguage === 'ta'
                        ? 'இணைப்பில் • உள்நுழைவு & பதிவு உதவி'
                        : 'සක්‍රීයයි • පිවිසුම් & ලියාපදිංචි සහය'
                      : chatLanguage === 'en'
                      ? 'Online • Supports All Sectors'
                      : chatLanguage === 'ta'
                      ? 'இணைப்பில் • அனைத்து துறைகளும்'
                      : 'සක්‍රීයයි • සියලු අංශයන්ට සහය'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Language Switcher in Header */}
              <div className="flex items-center bg-black/20 rounded-lg p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setChatLanguage('si');
                    onLanguageChange?.('si');
                  }}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    chatLanguage === 'si' ? 'bg-white text-emerald-900 shadow-xs' : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  සිං
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChatLanguage('en');
                    onLanguageChange?.('en');
                  }}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    chatLanguage === 'en' ? 'bg-white text-emerald-900 shadow-xs' : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChatLanguage('ta');
                    onLanguageChange?.('ta');
                  }}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    chatLanguage === 'ta' ? 'bg-white text-emerald-900 shadow-xs' : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  தமி
                </button>
              </div>

              {/* Minimize / Maximize */}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-7 h-7 rounded-lg hover:bg-white/20 text-white/90 flex items-center justify-center cursor-pointer transition-colors"
                title={isMinimized ? 'විශාල කරන්න' : 'කුඩා කරන්න'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-red-500/50 text-white flex items-center justify-center cursor-pointer transition-colors"
                title="වසන්න"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Navigation Tabs: Chat vs Instant Translator */}
              <div className="flex border-b border-slate-200 dark:border-emerald-950 bg-slate-50 dark:bg-[#071911] text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-all ${
                    activeTab === 'chat'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#0a2016]'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>
                    {chatLanguage === 'en'
                      ? 'AI Assistant'
                      : chatLanguage === 'ta'
                      ? 'AI உதவியாளர்'
                      : 'ස්මාර්ට් සහයක'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('translator')}
                  className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-all ${
                    activeTab === 'translator'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#0a2016]'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Languages className="w-3.5 h-3.5" />
                  <span>
                    {chatLanguage === 'en'
                      ? 'Auto Translator'
                      : chatLanguage === 'ta'
                      ? 'தானியங்கி மொழிபெயர்ப்பாளர்'
                      : 'ස්වයංක්‍රීය පරිවර්තකය'}
                  </span>
                  <span className="px-1 py-0.2 rounded text-[8px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    Live
                  </span>
                </button>
              </div>

              {/* TAB 1: Chat Assistant */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Messages Feed */}
                  <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3.5 text-xs sm:text-sm">
                    {messages.map((msg, mIdx) => {
                      const isUser = msg.sender === 'user';
                      const displayText =
                        msg.activeViewLang && msg.translations?.[msg.activeViewLang]
                          ? msg.translations[msg.activeViewLang]
                          : msg.text;

                      return (
                        <div
                          key={`omni_msg_${msg.id || 'm'}_${mIdx}`}
                          className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isUser && (
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                              <Bot className="w-4 h-4" />
                            </div>
                          )}

                          <div
                            className={`max-w-[85%] rounded-2xl p-3 sm:p-3.5 shadow-xs transition-all ${
                              isUser
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs'
                                : 'bg-slate-100 dark:bg-[#0e271c] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-emerald-900/60 rounded-tl-xs'
                            }`}
                          >
                            {/* Message Body */}
                            <div className="whitespace-pre-line leading-relaxed">
                              {displayText}
                            </div>

                            {/* Auto-Translation Sub-line Indicator */}
                            {msg.activeViewLang && (
                              <div className="mt-1.5 pt-1.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <span>
                                  🌐{' '}
                                  {msg.activeViewLang === 'si'
                                    ? 'සිංහලට පරිවර්තනය කරන ලදි'
                                    : msg.activeViewLang === 'ta'
                                    ? 'தமிழுக்கு மொழிபெயர்க்கப்பட்டது'
                                    : 'Translated to English'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMessages((prev) =>
                                      prev.map((m) =>
                                        m.id === msg.id ? { ...m, activeViewLang: undefined } : m
                                      )
                                    )
                                  }
                                  className="underline hover:text-emerald-800 dark:hover:text-emerald-200 cursor-pointer"
                                >
                                  මුල් පණිවිඩය (Original)
                                </button>
                              </div>
                            )}

                            {/* Embedded Action Buttons */}
                            {msg.actions && msg.actions.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-emerald-900/60 flex flex-wrap gap-1.5">
                                {msg.actions.map((act, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleActionClick(act)}
                                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-emerald-950/80 hover:bg-emerald-50 dark:hover:bg-emerald-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-emerald-700/60 font-bold text-xs flex items-center gap-1.5 shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer"
                                  >
                                    {getActionIcon(act.type)}
                                    <span>{act.label}</span>
                                    <ChevronRight className="w-3 h-3 text-slate-400" />
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Footer info & Trilingual Translate Pills */}
                            <div
                              className={`mt-2 flex items-center justify-between gap-2 text-[10px] ${
                                isUser ? 'text-emerald-100' : 'text-slate-400'
                              }`}
                            >
                              <span>{msg.timestamp}</span>

                              {/* On-demand translation toggle pills */}
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-semibold opacity-70">
                                  {chatLanguage === 'en' ? 'Translate:' : 'පරිවර්තනය:'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleTranslateMessage(msg.id, 'si')}
                                  className={`px-1 py-0.2 rounded hover:opacity-100 cursor-pointer ${
                                    msg.activeViewLang === 'si'
                                      ? 'bg-emerald-500 text-white font-bold'
                                      : 'bg-black/10 dark:bg-white/10 hover:bg-black/20'
                                  }`}
                                >
                                  සිං
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTranslateMessage(msg.id, 'en')}
                                  className={`px-1 py-0.2 rounded hover:opacity-100 cursor-pointer ${
                                    msg.activeViewLang === 'en'
                                      ? 'bg-emerald-500 text-white font-bold'
                                      : 'bg-black/10 dark:bg-white/10 hover:bg-black/20'
                                  }`}
                                >
                                  EN
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTranslateMessage(msg.id, 'ta')}
                                  className={`px-1 py-0.2 rounded hover:opacity-100 cursor-pointer ${
                                    msg.activeViewLang === 'ta'
                                      ? 'bg-emerald-500 text-white font-bold'
                                      : 'bg-black/10 dark:bg-white/10 hover:bg-black/20'
                                  }`}
                                >
                                  தமி
                                </button>
                              </div>
                            </div>
                          </div>

                          {isUser && (
                            <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-emerald-900/60 text-slate-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {isLoading && (
                      <div className="flex gap-2.5 justify-start">
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 animate-spin-slow" />
                        </div>
                        <div className="bg-slate-100 dark:bg-[#0e271c] p-3 rounded-2xl rounded-tl-xs flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                          <span>
                            {chatLanguage === 'en'
                              ? 'Thinking & preparing response...'
                              : chatLanguage === 'ta'
                              ? 'பதிலளிக்கப்படுகிறது...'
                              : 'පිළිතුර සකසමින් පවතී...'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Chips Suggestion Row */}
                  {messages.length > 0 &&
                    messages[messages.length - 1].quickChips &&
                    messages[messages.length - 1].quickChips!.length > 0 && (
                      <div className="px-3 py-1.5 bg-slate-50 dark:bg-[#071911] border-t border-slate-200 dark:border-emerald-950 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                        {messages[messages.length - 1].quickChips!.map((chip, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(chip)}
                            className="whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold bg-white dark:bg-emerald-900/40 hover:bg-emerald-50 dark:hover:bg-emerald-800/60 text-slate-700 dark:text-emerald-200 border border-slate-200 dark:border-emerald-800 shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
                          >
                            💬 {chip}
                          </button>
                        ))}
                      </div>
                    )}

                  {/* Input Box Bar */}
                  <div className="p-2.5 sm:p-3 bg-white dark:bg-[#071a12] border-t border-slate-200 dark:border-emerald-950 shrink-0">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={inputQuery}
                        onChange={(e) => setInputQuery(e.target.value)}
                        placeholder={
                          chatLanguage === 'en'
                            ? 'Ask anything or request help (Sinhala, English, Tamil)...'
                            : chatLanguage === 'ta'
                            ? 'ஏதேனும் கேளுங்கள் (சிங்களம், ஆங்கிலம், தமிழ்)...'
                            : 'ඕනෑම දෙයක් අසන්න (සිංහල, ඉංග්‍රීසි, දෙමළ)...'
                        }
                        className="flex-1 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-100 dark:bg-[#0e271c] border border-slate-200 dark:border-emerald-900/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                      />

                      <button
                        type="submit"
                        disabled={!inputQuery.trim() || isLoading}
                        className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer shrink-0"
                        title="යවන්න"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2: Instant Auto-Translator Tool */}
              {activeTab === 'translator' && (
                <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                    <Languages className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">
                        {chatLanguage === 'en'
                          ? 'Universal Trilingual Translator (Sinhala • English • Tamil)'
                          : chatLanguage === 'ta'
                          ? 'மும்மொழி மொழிபெயர்ப்பாளர் (சிங்களம் • ஆங்கிலம் • தமிழ்)'
                          : 'භාෂා ත්‍රිත්ව ක්ෂණික පරිවර්තකය (සිංහල • ඉංග්‍රීසි • දෙමළ)'}
                      </p>
                      <p className="text-[11px] opacity-80 mt-0.5">
                        {chatLanguage === 'en'
                          ? 'Translate your help request, chat reply, or message into the recipient\'s language.'
                          : chatLanguage === 'ta'
                          ? 'உங்கள் விளம்பரம் அல்லது செய்தியை விரும்பிய மொழிக்கு மொழிபெயர்க்கவும்.'
                          : 'ඔබගේ දැන්වීම් හෝ ප්‍රතිචාර අනෙක් පරිශීලකයන්ගේ භාෂාවට ක්ෂණිකව පරිවර්තනය කරගන්න.'}
                      </p>
                    </div>
                  </div>

                  {/* Input Source Panel */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>
                        {chatLanguage === 'en'
                          ? 'Source Text (Any Language):'
                          : chatLanguage === 'ta'
                          ? 'மூல உரை:'
                          : 'පරිවර්තනය කළ යුතු පාඨය:'}
                      </span>
                      {transSourceText && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-emerald-900 text-slate-700 dark:text-emerald-200">
                          {detectLanguage(transSourceText) === 'si'
                            ? 'හඳුනාගත්: සිංහල'
                            : detectLanguage(transSourceText) === 'ta'
                            ? 'கண்டறியப்பட்டது: தமிழ்'
                            : 'Detected: English'}
                        </span>
                      )}
                    </div>

                    <textarea
                      rows={3}
                      value={transSourceText}
                      onChange={(e) => setTransSourceText(e.target.value)}
                      placeholder={
                        chatLanguage === 'en'
                          ? 'Type or paste anything in Sinhala, Tamil, or English...'
                          : chatLanguage === 'ta'
                          ? 'சிங்களம், தமிழ் அல்லது ஆங்கிலத்தில் தட்டச்சு செய்யவும்...'
                          : 'සිංහල, ඉංග්‍රීසි හෝ දෙමළෙන් ලියන්න හෝ paste කරන්න...'
                      }
                      className="w-full p-3 rounded-xl text-xs sm:text-sm bg-slate-100 dark:bg-[#0e271c] border border-slate-200 dark:border-emerald-900/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Language Target Selector & Translate Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {chatLanguage === 'en' ? 'Target:' : 'පරිවර්තනය කළ යුත්තේ:'}
                      </span>
                      <div className="flex items-center bg-slate-200 dark:bg-emerald-950 p-0.5 rounded-lg text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setTransTargetLang('si')}
                          className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                            transTargetLang === 'si'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-emerald-200 hover:text-emerald-500'
                          }`}
                        >
                          සිංහල
                        </button>
                        <button
                          type="button"
                          onClick={() => setTransTargetLang('en')}
                          className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                            transTargetLang === 'en'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-emerald-200 hover:text-emerald-500'
                          }`}
                        >
                          English
                        </button>
                        <button
                          type="button"
                          onClick={() => setTransTargetLang('ta')}
                          className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                            transTargetLang === 'ta'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-emerald-200 hover:text-emerald-500'
                          }`}
                        >
                          தமிழ்
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handlePerformTranslation}
                      disabled={!transSourceText.trim() || isTranslating}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-40 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      {isTranslating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {chatLanguage === 'en'
                          ? 'Translate Now'
                          : chatLanguage === 'ta'
                          ? 'மொழிபெயர்க்கவும்'
                          : 'පරිවර්තනය කරන්න'}
                      </span>
                    </button>
                  </div>

                  {/* Output Translation Panel */}
                  {transOutput && (
                    <div className="space-y-1.5 bg-emerald-50/50 dark:bg-[#0a2318] p-3 rounded-xl border border-emerald-500/40">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <span>
                          {transTargetLang === 'si'
                            ? 'සිංහල පරිවර්තනය:'
                            : transTargetLang === 'ta'
                            ? 'தமிழ் மொழிபெயர்ப்பு:'
                            : 'English Translation:'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleCopyTranslation}
                            className="px-2 py-0.5 rounded text-[11px] bg-white dark:bg-emerald-900/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 cursor-pointer transition-all"
                          >
                            {copiedNotification ? (
                              <>
                                <Check className="w-3 h-3 text-green-600" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed pt-1">
                        {transOutput}
                      </p>
                    </div>
                  )}

                  {/* Common Quick Phrases for 1-Click Translation */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-emerald-950">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {chatLanguage === 'en'
                        ? 'Quick Sri Lankan Sample Phrases:'
                        : 'ක්ෂණික සාම්පල වැකි:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'මට A+ රුධිරය හදිසියෙන් අවශ්‍යයි',
                        'විදුලි කාර්මිකයෙක් අවශ්‍යයි',
                        'මගේ ජාතික හැඳුනුම්පත නැතිවිය',
                        'නොමිලේ පොත් පරිත්‍යාගයක්',
                        'I need an urgent plumber',
                        'எனக்கு அவசரமாக இரத்தம் தேவை',
                      ].map((phrase, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setTransSourceText(phrase);
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] bg-slate-100 dark:bg-emerald-950/60 hover:bg-emerald-100 text-slate-700 dark:text-emerald-200 border border-slate-200 dark:border-emerald-900 cursor-pointer"
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};

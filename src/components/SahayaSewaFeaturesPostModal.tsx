import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Share2, 
  ShieldAlert, 
  HeartHandshake, 
  ShoppingCart, 
  Wrench, 
  Droplet, 
  Users, 
  Bot, 
  Zap, 
  ShieldCheck, 
  X,
  ExternalLink,
  PhoneCall
} from 'lucide-react';

interface SahayaSewaFeaturesPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'si' | 'en' | 'ta';
}

export const SahayaSewaFeaturesPostModal: React.FC<SahayaSewaFeaturesPostModalProps> = ({
  isOpen,
  onClose,
  language = 'si'
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const postContent = `🚨🇱🇰 ශ්‍රී ලංකාවේ ප්‍රමුඛතම ප්‍රජා සහය, හදිසි අනතුරු ඇඟවීම් සහ සේවා වේදිකාව - "සහය සේවා (Sahaya Sewa)" විශේෂ සේවාවන්

අපගේ "සහය සේවා" යෙදුම හරහා ඔබට සහ ඔබේ ප්‍රජාවට ලබාගත හැකි ප්‍රධාන සහ විශේෂ සේවාවන් මෙන්න:

1️⃣ 🔴 රතු අනතුරු ඇඟවීම් සහ හදිසි SOS (Red Alert & Disaster SOS)
- රට පුරා සිදුවන හදිසි ආපදා, ගංවතුර, නියඟ හෝ අනතුරු පිළිබඳ ක්ෂණික අනතුරු ඇඟවීම්.
- කිලෝමීටර් 2ක් ඇතුළත ආසන්නයේ හදිසි උපකාර අවශ්‍ය අවස්ථාවල නිකුත් වන Proximity Siren (PickMe ශෛලියේ නාද වන අනතුරු ඇඟවීම්).
- පොලිසිය, රෝහල්, ගිනි නිවන සහ ඇම්බුලන්ස් හදිසි දුරකථන අංක එකම තැනකින්.

2️⃣ 🤝 ප්‍රජා සහය ඉල්ලීම් සහ බුලටින් පුවරුව (Community Help Posts)
- ආහාර, ඖෂධ, නවාතැන්, අධ්‍යාපන හෝ මූල්‍ය ආධාර අවශ්‍ය වූ විට හෝ වෙනත් අයට උපකාර කිරීමට අවශ්‍ය වූ විට සටහන් තැබීම.
- ක්ෂණිකව උදව් කරන්නන් සමඟ සම්බන්ධ වීමට සෘජු පණිවිඩ හුවමාරුව.

3️⃣ 🛒 සහය වෙළඳපොළ සහ අඩුම මිල දර්ශකය (Marketplace & Lowest Price Index)
- ප්‍රජාව අතර භාණ්ඩ මිලදී ගැනීම, විකිණීම සහ හුවමාරු කරගැනීම.
- දිනපතා අත්‍යවශ්‍ය භාණ්ඩවල අඩුම මිල ගණන් සංසන්දනය කිරීමේ පහසුකම.

4️⃣ 🛠️ වෘත්තීය සහ සේවා දායක නාමාවලිය (Professional Services Directory)
- විදුලි කාර්මිකයන්, ජලනල ශිල්පීන්, වඩු කාර්මිකයන්, ගුරුවරුන් සහ දක්ෂ ශිල්පීන් විශ්වාසනීය ලෙස සොයාගැනීම.

5️⃣ 🩸 රුධිර බැංකු ඉල්ලීම් සහ ආපදා සහන ගබඩාව (Blood Bank & Disaster Relief)
- හදිසි රුධිර අවශ්‍යතා සඳහා පරිත්‍යාගශීලීන් සම්බන්ධ කරගැනීම සහ ආපදා සහන ද්‍රව්‍ය බෙදාහැරීම සම්බන්ධීකරණය.

6️⃣ 👥 කණ්ඩායම් වැඩ සහ ශ්‍රමදාන සංවිධානය (Group Work & Community Labour)
- ප්‍රජා සංවර්ධන කටයුතු, ශ්‍රමදාන, පරිසර සංරක්ෂණ සහ කණ්ඩායම් ව්‍යාපෘති එකතුවී ක්‍රියාත්මක කිරීම.

7️⃣ 🤖 AI සහායක සහ සිංහල ස්මාර්ට් සෙවුම (Omni AI Assistant & Smart Search)
- ඕනෑම ප්‍රශ්නයකට සිංහලෙන්, ඉංග්‍රීසියෙන් හෝ සිංග්ලිෂ් (Singlish) මඟින් පිළිතුරු ලබාදෙන බුද්ධිමත් සහායකයා.

8️⃣ ⚡ වෙනම කෙටිමං ඇප් සහ ෂෝට්කට් සේවාව (Shortcut Hub)
- සියලු දැන්වීම්, පණිවිඩ සහ චැට්, කණ්ඩායම් වැඩ පුවරුව සහ වෙළඳපොළ සඳහා ඉතා ඉක්මනින් පිවිසීමට වෙනම ෂෝට්කට් ලින්ක් එකක් සහ Facebook ශෛලියේ පහළ මෙනු පටියක්.

9️⃣ 🛡️ ආරක්ෂිත පිවිසුම සහ විශ්වාසනීය ශ්‍රේණිගත කිරීම (Secure Auth & Trust Score)
- ජාතික හැඳුනුම්පත (NIC) මත පදනම් වූ ආරක්ෂිත පිවිසුම, පරිපාලක අනුමැතිය සහ පද්ධති දත්ත ස්ථාවරත්වය.

📲 දැන්ම "සහය සේවා" සමඟ සම්බන්ධ වී ඔබේ ප්‍රජාවට ශක්තියක් වන්න!
🔗 අපගේ යෙදුම වෙත පිවිසෙන්න: [Sahaya Sewa App]

#SahayaSewa #CommunityHelp #SriLanka #RedAlert #Marketplace #SocialGood`;

  const handleCopy = () => {
    navigator.clipboard.writeText(postContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(postContent)}`;
    window.open(url, '_blank');
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(postContent)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">සහය සේවා - විශේෂ විශේෂාංග හැඳින්වීම</h2>
              <p className="text-xs text-emerald-100">ප්‍රජාව වෙනුවෙන් සකස් කරන ලද සම්පූර්ණ සේවා විස්තරය</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body / Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
            <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">මෙම සටහන (Post) ඔබට පහසුවෙන් Copy කර Social Media වල Share කළ හැක!</p>
              <p className="text-xs opacity-80 mt-0.5">පහත ඇති බොත්තම් මඟින් WhatsApp, Facebook වෙත එක ක්ලික් එකකින් යොමු කරන්න.</p>
            </div>
          </div>

          {/* Preview Box */}
          <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 font-mono text-xs whitespace-pre-wrap select-all shadow-inner overflow-x-auto max-h-[350px]">
            {postContent}
          </div>

          {/* Quick Highlight Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
              <span className="text-xs font-semibold text-red-900 dark:text-red-300">රතු අනතුරු ඇඟවීම්</span>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex items-center gap-2.5">
              <HeartHandshake className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">ප්‍රජා සහය ඉල්ලීම්</span>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center gap-2.5">
              <ShoppingCart className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="text-xs font-semibold text-amber-900 dark:text-amber-300">වෙළඳපොළ සහ මිල</span>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-2xl flex items-center gap-2.5">
              <Wrench className="w-5 h-5 text-purple-600 shrink-0" />
              <span className="text-xs font-semibold text-purple-900 dark:text-purple-300">වෘත්තීය සේවා</span>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center gap-2.5">
              <Droplet className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="text-xs font-semibold text-rose-900 dark:text-rose-300">රුධිර බැංකුව</span>
            </div>
            <div className="p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 rounded-2xl flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-teal-600 shrink-0" />
              <span className="text-xs font-semibold text-teal-900 dark:text-teal-300">AI සහායක</span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'ප්‍රචාරක සටහන පිටපත් විය! (Copied)' : 'සටහන පිටපත් කරන්න (Copy Post)'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all shadow-md"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp Share
            </button>
            <button
              onClick={handleFacebookShare}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md"
            >
              <Share2 className="w-4 h-4" />
              Facebook Share
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

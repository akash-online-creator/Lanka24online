import React, { useState } from 'react';
import { 
  AlertCircle, 
  MapPin, 
  Phone, 
  Clock, 
  ShieldCheck, 
  Share2, 
  Filter, 
  RotateCw, 
  Heart, 
  PlusCircle, 
  Tag,
  CheckCircle2
} from 'lucide-react';
import { BulletinPost } from '../types';

interface LiveBulletinProps {
  posts: BulletinPost[];
  onOpenCreateModal: () => void;
  onOpenRegistration: () => void;
}

export const LiveBulletin: React.FC<LiveBulletinProps> = ({
  posts,
  onOpenCreateModal,
  onOpenRegistration
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'සියල්ල (All)' },
    { id: 'flood', label: '🌊 ගංවතුර / ආපදා' },
    { id: 'medical', label: '🏥 වෛද්‍ය / බෙහෙත්' },
    { id: 'blood', label: '🩸 රුධිර පරිත්‍යාග' },
    { id: 'food', label: '🍲 ආහාර / සලාක' },
    { id: 'shelter', label: '🏠 තාවකාලික නවාතැන්' },
    { id: 'transport', label: '🚜 ප්‍රවාහන / බෝට්ටු' },
  ];

  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(p => p.category === selectedCategory);

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600/20 text-red-300 border-red-500/50';
      case 'high':
        return 'bg-amber-600/20 text-amber-300 border-amber-500/50';
      case 'medium':
        return 'bg-blue-600/20 text-blue-300 border-blue-500/50';
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Category Filter Tabs & Post Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        {/* Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-sinhala whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Post New Bulletin Button */}
        <button
          onClick={onOpenCreateModal}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold font-sinhala shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 shrink-0 transition-transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>නව දැන්වීමක් / ඉල්ලීමක් පළ කරන්න</span>
        </button>
      </div>

      {/* 3D Bulletin Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPosts.map((post) => {
          const isFlipped = flippedCardId === post.id;
          
          return (
            <div
              key={post.id}
              className="perspective-1000 min-h-[300px] h-[320px]"
            >
              <div
                className={`relative w-full h-full duration-500 transform-style-3d transition-transform cursor-pointer ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
                onClick={() => setFlippedCardId(isFlipped ? null : post.id)}
              >
                
                {/* FRONT FACE OF 3D CARD */}
                <div className="absolute inset-0 w-full h-full backface-hidden bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-xl hover:border-slate-700 transition-colors">
                  
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider font-mono ${getSeverityStyle(post.severity)}`}>
                        {post.severity === 'critical' ? '🚨 හදිසි / Critical' : post.severity === 'high' ? '⚠️ High Alert' : 'සාමාන්‍ය'}
                      </span>
                      
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-sinhala">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>මීට මිනිත්තු කිහිපයකට පෙර</span>
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-white font-sinhala leading-snug line-clamp-2">
                      {post.title}
                    </h4>

                    <p className="text-xs text-slate-300 font-sinhala mt-2.5 line-clamp-3 leading-relaxed">
                      {post.description}
                    </p>
                  </div>

                  {/* Card Footer Details */}
                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5 font-sinhala text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="truncate">{post.location} ({post.district})</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {post.distanceKm ? `~${post.distanceKm} km දුරින්` : 'ස්ථානය තහවුරුයි'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-200 font-sinhala">
                        <span>{post.contactName}</span>
                        {post.verified && (
                          <span title="තහවුරු කළ පරිශීලක">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 ml-0.5 inline" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-sky-400 font-semibold font-sinhala">
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>විස්තර සඳහා ක්ලික් කරන්න</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BACK FACE OF 3D CARD (FLIPPED DETAILS) */}
                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-red-500/50 rounded-3xl p-5 flex flex-col justify-between shadow-2xl text-left">
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-red-400 font-sinhala flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>සෘජු සම්බන්ධීකරණ තොරතුරු</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-sinhala">ආපසු යාමට ක්ලික් කරන්න</span>
                    </div>

                    <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2 mt-2">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">සම්බන්ධ කරගත යුතු පුද්ගලයා:</span>
                        <div className="text-sm font-bold text-white font-sinhala">{post.contactName}</div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">දුරකථන අංකය:</span>
                        <div className="flex items-center justify-between mt-1">
                          <a
                            href={`tel:${post.contactPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-base font-mono font-bold text-emerald-400 hover:underline flex items-center gap-2"
                          >
                            <Phone className="w-4 h-4" />
                            {post.contactPhone}
                          </a>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyPhone(post.contactPhone);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition-colors font-sinhala"
                          >
                            {copiedPhone === post.contactPhone ? 'පිටපත් විය ✓' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">ලිපිනය / ප්‍රදේශය:</span>
                        <div className="text-xs text-slate-200 font-sinhala">{post.location}, {post.district}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2">
                    <a
                      href={`tel:${post.contactPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-sinhala flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>ඇමතුමක් ලබා දෙන්න</span>
                    </a>
                  </div>

                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

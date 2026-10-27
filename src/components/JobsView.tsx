import React, { useState, useEffect, useMemo } from 'react';
import { 
  JobListing, 
  JobFilters, 
  JobCategoryId, 
  JOB_CATEGORIES, 
  LOCAL_BENEFITS, 
  OVERSEAS_BENEFITS,
  ProximityFilterType 
} from '../types/job';
import { getStoredJobs, filterJobListings, calculateDistanceKm } from '../utils/jobStorage';
import { JobCard } from './JobCard';
import { JobModal } from './JobModal';
import { JobDetailModal } from './JobDetailModal';
import { JobCommentsModal } from './JobCommentsModal';
import { JobMap } from './JobMap';
import { 
  ArrowLeft, 
  Briefcase, 
  Search, 
  Plus, 
  MapPin, 
  Plane, 
  SlidersHorizontal, 
  Layers, 
  Map as MapIcon, 
  ListFilter, 
  Navigation,
  X,
  MessageSquare
} from 'lucide-react';

interface JobsViewProps {
  userLat?: number;
  userLng?: number;
  userCityName?: string;
  onBackToBoard: () => void;
  language?: string;
}

export const JobsView: React.FC<JobsViewProps> = ({
  userLat = 7.1802,
  userLng = 79.8841,
  userCityName = 'කටුනායක',
  onBackToBoard,
  language = 'si',
}) => {
  // All Stored Jobs
  const [allJobs, setAllJobs] = useState<JobListing[]>(() => getStoredJobs());

  // Active View Tab: 'distance' | 'map'
  const [viewMode, setViewMode] = useState<'distance' | 'map'>('distance');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobListing | null>(null);
  const [jobForComments, setJobForComments] = useState<JobListing | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<JobCategoryId>('all');
  const [selectedScope, setSelectedScope] = useState<'all' | 'local' | 'overseas'>('all');
  const [proximityFilter, setProximityFilter] = useState<ProximityFilterType>('all');
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
  const [minSalary, setMinSalary] = useState<number | undefined>(undefined);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Refresh jobs from storage or events
  const refreshJobs = () => {
    setAllJobs(getStoredJobs());
  };

  useEffect(() => {
    const handleUpdate = () => refreshJobs();
    window.addEventListener('sahaya_jobs_updated', handleUpdate);
    window.addEventListener('sahaya_job_comments_updated', handleUpdate);
    return () => {
      window.removeEventListener('sahaya_jobs_updated', handleUpdate);
      window.removeEventListener('sahaya_job_comments_updated', handleUpdate);
    };
  }, []);

  // Filtered Jobs List
  const filteredJobs = useMemo(() => {
    const filters: JobFilters = {
      scope: selectedScope,
      category: selectedCategory,
      searchQuery,
      proximity: proximityFilter,
      minSalary,
      benefits: selectedBenefits,
    };

    const result = filterJobListings(allJobs, filters, userLat, userLng);

    // If in Distance-sorted list mode, sort local jobs by distance from user location
    if (viewMode === 'distance' && userLat && userLng) {
      return [...result].sort((a, b) => {
        if (a.isUrgentHiring && !b.isUrgentHiring) return -1;
        if (!a.isUrgentHiring && b.isUrgentHiring) return 1;

        if (a.scope === 'local' && b.scope === 'local' && a.lat && b.lat) {
          const distA = calculateDistanceKm(userLat, userLng, a.lat, a.lng);
          const distB = calculateDistanceKm(userLat, userLng, b.lat, b.lng);
          return distA - distB;
        }

        return (b.createdAtMs || 0) - (a.createdAtMs || 0);
      });
    }

    return result;
  }, [allJobs, selectedScope, selectedCategory, searchQuery, proximityFilter, minSalary, selectedBenefits, viewMode, userLat, userLng]);

  const handleJobCreated = (newJob: JobListing) => {
    refreshJobs();
    setSelectedJobForDetail(newJob);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-3 sm:py-5 space-y-4 sm:space-y-5 animate-fadeIn pb-20">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#07190f] border-2 border-emerald-500/80 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToBoard}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0c2417] dark:hover:bg-[#123623] text-slate-800 dark:text-slate-200 font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-xs border border-slate-300 dark:border-slate-700 cursor-pointer"
            title="ආපසු දැන්වීම් පුවරුවට"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs sm:text-sm font-extrabold">ආපසු</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 font-black text-xl">
              💼
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  #{selectedCategory === 'all' ? 'රැකියා' : JOB_CATEGORIES.find(c => c.id === selectedCategory)?.titleSi}
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  ({filteredJobs.length} අවස්ථා)
                </span>
              </div>
              <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                රැකියා පියස (Jobs & Careers Hub)
              </h1>
            </div>
          </div>
        </div>

        {/* CTA: රැකියා එක් කරන්න */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>රැකියා එක් කරන්න (Post a Job)</span>
        </button>
      </div>

      {/* Search Bar & Filter Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 රැකියා තනතුර, ආයතනය, නගරය, රට හෝ සුදුසුකම් සොයන්න..."
            className="w-full bg-white dark:bg-[#071d13] text-slate-900 dark:text-slate-100 placeholder-slate-400 border-2 border-emerald-400/80 dark:border-emerald-600 rounded-2xl py-3 pl-11 pr-10 text-xs sm:text-sm font-bold shadow-sm focus:outline-none focus:border-amber-400"
          />
          <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-500 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          className={`p-3 rounded-2xl border-2 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
            showFilterDrawer || selectedBenefits.length > 0 || minSalary
              ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-amber-400/30'
              : 'bg-white dark:bg-[#07190f] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
          }`}
          title="ගාන සහ පහසුකම් පෙරහන්"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">පෙරහන්</span>
          {(selectedBenefits.length > 0 || minSalary) && (
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
          )}
        </button>
      </div>

      {/* Scope Selector: සියල්ල / ලංකාව තුළ / විදේශීය */}
      <div className="bg-white dark:bg-[#07190f] p-2 rounded-2xl border border-slate-200 dark:border-[#132d20] flex items-center gap-1.5 shadow-xs">
        <button
          type="button"
          onClick={() => setSelectedScope('all')}
          className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedScope === 'all'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0c2618]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>සියලුම ({allJobs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedScope('local')}
          className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedScope === 'local'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0c2618]'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-300" />
          <span>ලංකාව තුළ ({allJobs.filter(j => j.scope === 'local').length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedScope('overseas')}
          className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedScope === 'overseas'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0c2618]'
          }`}
        >
          <Plane className="w-3.5 h-3.5 text-sky-300" />
          <span>විදේශීය ({allJobs.filter(j => j.scope === 'overseas').length})</span>
        </button>
      </div>

      {/* Horizontal Category Buttons */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
          <span>රැකියා කාණ්ඩය තෝරන්න (Category):</span>
          <span className="text-[11px] text-emerald-600 font-extrabold">{JOB_CATEGORIES.length - 1} කාණ්ඩ</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-0.5">
          {JOB_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`py-2 px-3.5 rounded-2xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-400/40'
                    : 'bg-white dark:bg-[#07190f] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#132d20] hover:border-emerald-400'
                }`}
              >
                <span>{cat.titleSi}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* View Toggle Tabs */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0a2014] p-1.5 rounded-2xl border border-slate-200 dark:border-[#132d20]">
          <button
            type="button"
            onClick={() => setViewMode('distance')}
            className={`py-1.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'distance'
                ? 'bg-white dark:bg-[#07190f] text-emerald-600 dark:text-emerald-400 shadow-md font-black'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>දුර අනුව (Distance)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`py-1.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'map'
                ? 'bg-white dark:bg-[#07190f] text-emerald-600 dark:text-emerald-400 shadow-md font-black'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5 text-blue-500" />
            <span>සිතියමෙන් (Map)</span>
          </button>
        </div>

        {userCityName && (
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>ඔබේ ස්ථානය: <strong className="text-slate-800 dark:text-white">{userCityName}</strong></span>
          </div>
        )}
      </div>

      {/* Micro-Distance Filters */}
      {selectedScope !== 'overseas' && (
        <div className="p-3 bg-white dark:bg-[#07190f] rounded-2xl border border-slate-200 dark:border-[#132d20] space-y-2">
          <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            <span>කැමති විදියට දුර වෙනස් කරගන්න:</span>
          </span>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
            {[
              { id: 'all', label: 'සියලුම දුරින් (All)' },
              { id: 'walk_15', label: '🚶 ඇවිදින දුරින් (මිනිත්තු 15)' },
              { id: 'walk_30', label: '🚶 ඇවිදින දුරින් (මිනිත්තු 30)' },
              { id: 'tuktuk_15', label: '🛺 ත්‍රීවීල් දුරින් (මිනිත්තු 15)' },
              { id: 'tuktuk_30', label: '🛺 ත්‍රීවීල් දුරින් (මිනිත්තු 30)' },
              { id: 'km_5', label: '📍 කි.මී. 5ක් ඇතුළත' },
              { id: 'km_15', label: '📍 කි.මී. 15ක් ඇතුළත' },
              { id: 'km_30', label: '📍 කි.මී. 30ක් ඇතුළත' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProximityFilter(p.id as ProximityFilterType)}
                className={`py-1.5 px-3 rounded-xl whitespace-nowrap transition-all cursor-pointer border ${
                  proximityFilter === p.id
                    ? 'bg-amber-400 text-slate-950 font-black border-amber-500 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#0c2417] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Drawer */}
      {showFilterDrawer && (
        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#071c11] border-2 border-emerald-400 dark:border-emerald-600 shadow-lg space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <span>ගාන සහ පහසුකම් පෙරහන්</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setMinSalary(undefined);
                setSelectedBenefits([]);
              }}
              className="text-xs text-rose-600 font-extrabold hover:underline cursor-pointer"
            >
              පෙරහන් ඉවත් කරන්න
            </button>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">අවම වැටුප:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: 'සියල්ල', val: undefined },
                { label: 'රු. 40,000 ට වැඩි', val: 40000 },
                { label: 'රු. 60,000 ට වැඩි', val: 60000 },
                { label: 'රු. 80,000 ට වැඩි', val: 80000 },
                { label: 'රු. 120,000 ට වැඩි', val: 120000 },
                { label: 'රු. 200,000 ට වැඩි', val: 200000 },
              ].map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMinSalary(s.val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    minSalary === s.val
                      ? 'bg-emerald-600 text-white font-black'
                      : 'bg-white dark:bg-[#0c2417] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">අවශ්‍ය පහසුකම්:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[...LOCAL_BENEFITS, ...OVERSEAS_BENEFITS.filter(ob => !LOCAL_BENEFITS.some(lb => lb.key === ob.key))].map((f) => {
                const isChecked = selectedBenefits.includes(f.key);
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setSelectedBenefits(prev =>
                        prev.includes(f.key) ? prev.filter(k => k !== f.key) : [...prev, f.key]
                      );
                    }}
                    className={`p-2 rounded-xl text-xs font-bold text-left border flex items-center gap-2 transition-all ${
                      isChecked
                        ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 text-emerald-950 dark:text-emerald-200'
                        : 'bg-white dark:bg-[#0c2417] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">{f.labelSi}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Display: Map OR List */}
      {viewMode === 'map' ? (
        <div className="space-y-3">
          <JobMap
            jobs={filteredJobs}
            userLat={userLat}
            userLng={userLng}
            onSelectJob={(j) => setSelectedJobForDetail(j)}
          />
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                userLat={userLat}
                userLng={userLng}
                onViewDetails={(j) => setSelectedJobForDetail(j)}
                onOpenComments={(j) => setJobForComments(j)}
                language={language}
              />
            ))
          ) : (
            <div className="bg-white dark:bg-[#07190f] rounded-3xl border-2 border-dashed border-slate-300 dark:border-[#132d20] p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                💼
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">
                දැනට රැකියා දැන්වීම් නොමැත
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                ඔබගේ ප්‍රදේශයේ හෝ විදේශීය නව රැකියා අවස්ථාවක් පළමු වරට ලියාපදිංචි කරන්න.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>නව රැකියාවක් පළ කරන්න</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Creation Modal */}
      <JobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onJobCreated={handleJobCreated}
        userLat={userLat}
        userLng={userLng}
        userCity={userCityName}
        language={language}
      />

      {/* Details Lightbox Modal */}
      <JobDetailModal
        job={selectedJobForDetail}
        onClose={() => setSelectedJobForDetail(null)}
        userLat={userLat}
        userLng={userLng}
        language={language}
      />

      {/* Public Comments Modal */}
      <JobCommentsModal
        job={jobForComments}
        isOpen={Boolean(jobForComments)}
        onClose={() => setJobForComments(null)}
      />
    </div>
  );
};

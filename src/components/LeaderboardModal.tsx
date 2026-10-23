import React, { useState, useMemo } from 'react';

import { Search, ChevronDown, ChevronUp, Award, X } from 'lucide-react';

export interface LeaderboardUser {

  rank: number;

  username: string;

  points: number;

  services: string; // e.g., "H2, E1, D1, E1"

  isCurrentUser?: boolean;

}

export interface LeaderboardModalProps {

  isOpen: boolean;

  onClose: () => void;

  users?: LeaderboardUser[];

  currentUsername?: string;

}

// Reference key mapping for points structure

const SERVICE_POINTS_REFERENCE = [

  { code: 'A', name: 'රතු එළිය (ආපදා දැනුවත් කිරිමකට)', points: 10 },

  { code: 'B', name: 'එක් ලේ දන්දීමක් වෙනුවෙන්', points: 9 },

  { code: 'C', name: 'සහන කදවුරු ලියාපදිංචිය', points: 8 },

  { code: 'D', name: 'ස්ථානය සුරකීම (Public)', points: 7 },

  { code: 'E', name: 'ඉක්මන් සේවා සහයවිමකට', points: 6.5 },

  { code: 'F', name: 'සාමාන්ය සේවා සහයවීමකට', points: 6 },

  { code: 'G', name: 'හමුවනලද', points: 5.5 },

  { code: 'H', name: 'රෑකියා පලකිරිම', points: 5 },

  { code: 'I', name: 'නවාතැන් පළකිරිම', points: 4 },

  { code: 'J', name: 'හදිසි සේවා අංක', points: 3 },

  { code: 'K', name: 'වෘත්තීය සේවා පලකිරිම', points: 2 },

];

// Mock data to display if none is provided via props

const DEFAULT_USERS: LeaderboardUser[] = [

  { rank: 1, username: 'KasunPerera', points: 16.5, services: 'A1, E1' },

  { rank: 2, username: 'AmaliSilva', points: 15.0, services: 'B1, F1' },

  { rank: 3, username: 'NimalFernando', points: 14.5, services: 'C1, E1' },

  { rank: 4, username: 'SahanK', points: 12.0, services: 'F2' },

  { rank: 5, username: 'Dilani_M', points: 10.5, services: 'G1, H1' },

  { rank: 6, username: 'Pathum_Dev', points: 9.0, services: 'B1', isCurrentUser: true },

  { rank: 7, username: 'Ruwan_B', points: 7.0, services: 'D1' },

  { rank: 8, username: 'Kavindi_S', points: 5.5, services: 'G1' },

];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({

  isOpen,

  onClose,

  users = DEFAULT_USERS,

  currentUsername,

}) => {

  const [searchQuery, setSearchQuery] = useState('');

  const [isGuideExpanded, setIsGuideExpanded] = useState(false);

  // Format rank number to two digits (e.g., 1 -> "01")

  const formatRank = (rank: number): string => {

    return rank < 10 ? `0${rank}` : `${rank}`;

  };

  // Filter users based on search input (by rank or username)

  const filteredUsers = useMemo(() => {

    return users.filter((user) => {

      const query = searchQuery.toLowerCase().trim();

      const formattedRank = formatRank(user.rank);

      const matchesUsername = user.username.toLowerCase().includes(query);

      const matchesRank = formattedRank.includes(query) || user.rank.toString() === query;


      return matchesUsername || matchesRank;

    });

  }, [users, searchQuery]);

  if (!isOpen) return null;

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">

      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200">

        

        {/* Header */}

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">

          <div className="flex items-center gap-2">

            <Award className="h-6 w-6 text-amber-500" />

            <h2 className="text-lg font-bold text-slate-800">

              ප්‍රජා ශ්‍රේණිගත කිරීම සහ S-Points (S Point Leaderboard)

            </h2>

          </div>

          <button

            onClick={onClose}

            className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"

            aria-label="Close modal"

          >

            <X className="h-5 w-5" />

          </button>

        </div>

        {/* Search Bar */}

        <div className="p-4 border-b border-slate-100 bg-white">

          <div className="relative">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input

              type="text"

              placeholder="Username හෝ ස්ථානය (Rank) අනුව සොයන්න..."

              value={searchQuery}

              onChange={(e) => setSearchQuery(e.target.value)}

              className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

            />

          </div>

        </div>

        {/* Leaderboard Table Content */}

        <div className="flex-1 overflow-y-auto p-4">

          <table className="w-full text-left border-collapse">

            <thead>

              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">

                <th className="py-3 px-4 w-20">ස්ථානය</th>

                <th className="py-3 px-4">Username</th>

                <th className="py-3 px-4 text-right">Point ගණන</th>

                <th className="py-3 px-4">POINT ලැබු සේවාවන් හා වාර ගණාන</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100 text-sm">

              {filteredUsers.length > 0 ? (

                filteredUsers.map((user) => {

                  const isCurrent =

                    user.isCurrentUser ||

                    (currentUsername && user.username === currentUsername);

                  return (

                    <tr

                      key={user.rank}

                      className={`transition-colors ${

                        isCurrent

                          ? 'bg-blue-50/80 font-medium hover:bg-blue-100/80'

                          : 'hover:bg-slate-50'

                      }`}

                    >

                      {/* Rank Column with Badges */}

                      <td className="py-3 px-4">

                        {user.rank === 1 && (

                          <span className="inline-flex items-center justify-center rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-300 shadow-sm">

                            🥇 {formatRank(user.rank)}

                          </span>

                        )}

                        {user.rank === 2 && (

                          <span className="inline-flex items-center justify-center rounded-md bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-300 shadow-sm">

                            🥈 {formatRank(user.rank)}

                          </span>

                        )}

                        {user.rank === 3 && (

                          <span className="inline-flex items-center justify-center rounded-md bg-amber-700/10 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-800/20 shadow-sm">

                            🥉 {formatRank(user.rank)}

                          </span>

                        )}

                        {user.rank > 3 && (

                          <span className="px-2 py-1 text-slate-600 font-mono">

                            {formatRank(user.rank)}

                          </span>

                        )}

                      </td>

                      {/* Username Column */}

                      <td className="py-3 px-4 font-medium text-slate-800">

                        @{user.username}

                        {isCurrent && (

                          <span className="ml-2 inline-block rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">

                            You

                          </span>

                        )}

                      </td>

                      {/* Points Column */}

                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">

                        {user.points.toFixed(1)}

                      </td>

                      {/* Services Summary Column */}

                      <td className="py-3 px-4 font-mono text-xs text-slate-600">

                        {user.services}

                      </td>

                    </tr>

                  );

                })

              ) : (

                <tr>

                  <td colSpan={4} className="py-8 text-center text-slate-400">

                    ප්‍රතිඵල හමු නොවීය.

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

        {/* Expandable Points Reference Guide */}

        <div className="border-t border-slate-200 bg-slate-50">

          <button

            onClick={() => setIsGuideExpanded(!isGuideExpanded)}

            className="flex w-full items-center justify-between px-6 py-3 text-left font-medium text-slate-700 hover:bg-slate-100 transition-colors"

          >

            <span className="text-sm">

              සේවාවන් සදහා ලැබෙන ලකුණු හා සේවාවන් පෙන්වන ඉංග්‍රීසි අක්ෂරය

            </span>

            {isGuideExpanded ? (

              <ChevronUp className="h-4 w-4 text-slate-500" />

            ) : (

              <ChevronDown className="h-4 w-4 text-slate-500" />

            )}

          </button>

          {isGuideExpanded && (

            <div className="max-h-48 overflow-y-auto px-6 pb-4 pt-1">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-200 pt-3">

                {SERVICE_POINTS_REFERENCE.map((item) => (

                  <div

                    key={item.code}

                    className="flex justify-between items-center rounded bg-white p-2 border border-slate-100 shadow-sm"

                  >

                    <span>

                      <strong className="text-slate-800 font-mono mr-1">

                        {item.code}.

                      </strong>{' '}

                      {item.name}

                    </span>

                    <span className="font-mono font-bold text-blue-600 ml-2">

                      {item.points}

                    </span>

                  </div>

                ))}

              </div>

            </div>

          )}

        </div>

      </div>

    </div>

  );

};

export default LeaderboardModal;


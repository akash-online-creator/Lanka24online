import React, { useState, useEffect } from 'react';

import { X, Lock, Globe, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

import { getCurrentUser, getCreditBalance, deductPostingFee } from '../services/userService';

import { isGroupUsernameTaken, Group } from '../services/groupService';

interface CreateGroupModalProps {

  isOpen: boolean;

  onClose: () => void;

  onGroupCreated: (newGroup: Group) => void;

}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({

  isOpen,

  onClose,

  onGroupCreated,

}) => {

  const [name, setName] = useState('');

  const [usernameInput, setUsernameInput] = useState('');

  const [description, setDescription] = useState('');

  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');

  const [category, setCategory] = useState('General');

  const [creditBalance, setCreditBalance] = useState<number>(0);

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [usernameSuccess, setUsernameSuccess] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = getCurrentUser();

  useEffect(() => {

    if (isOpen && currentUser) {

      const balance = getCreditBalance(currentUser);

      setCreditBalance(balance);

    }

  }, [isOpen, currentUser]);

  useEffect(() => {

    const checkUsername = async () => {

      const trimmed = usernameInput.trim();

      if (!trimmed) {

        setUsernameError(null);

        setUsernameSuccess(false);

        return;

      }

      const formattedUsername = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;

      

      if (!/^@[a-zA-Z0-9_]{3,20}$/.test(formattedUsername)) {

        setUsernameError('Username must be 3-20 characters long and contain only letters, numbers, or underscores.');

        setUsernameSuccess(false);

        return;

      }

      setIsCheckingUsername(true);

      setUsernameError(null);

      try {

        const isTaken = await isGroupUsernameTaken(formattedUsername);

        if (isTaken) {

          setUsernameError('මෙම පරිශීලක නාමය (Username) දැනටමත් භාවිතයේ ඇත.');

          setUsernameSuccess(false);

        } else {

          setUsernameError(null);

          setUsernameSuccess(true);

        }

      } catch (err) {

        setUsernameError('Username පරීක්ෂා කිරීමට අපොහොසත් විය.');

        setUsernameSuccess(false);

      } finally {

        setIsCheckingUsername(false);

      }

    };

    const timeoutId = setTimeout(checkUsername, 400);

    return () => clearTimeout(timeoutId);

  }, [usernameInput]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!currentUser) {

      alert('කරුණාකර ප්‍රථමයෙන් පුරන්න (Login වන්න).');

      return;

    }

    if (!name.trim()) {

      alert('කරුණාකර කණ්ඩායමේ නම ඇතුළත් කරන්න.');

      return;

    }

    const formattedUsername = usernameInput.trim().startsWith('@') 

      ? usernameInput.trim() 

      : `@${usernameInput.trim()}`;

    if (!usernameInput.trim() || usernameError || !usernameSuccess) {

|---|---|---|Username එකක් ඇතුළත් කරන්න.');

      return;

    }

    // Step 4: Verify credit balance

    if (creditBalance < 100) {

      alert(`කණ්ඩායමක් නිර්මාණය කිරීම සඳහා රු. 100.00 ක ක්‍රෙඩිට් ශේෂයක් අවශ්‍ය වේ. ඔබගේ දැනට ශේෂය රු. ${creditBalance.toFixed(2)} කි. කරුණාකර Top-Up කරන්න.`);

      return;

    }

    setIsSubmitting(true);

    try {

      const generatedGroupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const generatedInviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      

      // Step 2: Generate invite link for private groups

      const cleanUsername = formattedUsername.replace('@', '');

      const inviteLink = privacy === 'private' 

        ? `https://supporservice.online/?join_group=${cleanUsername}&code=${generatedInviteCode}`

        : undefined;

      // Step 4: Deduct fee and dispatch UI update event

      const feeDeducted = deductPostingFee(currentUser, 'group_work', generatedGroupId, name.trim());

      

      if (!feeDeducted) {

        alert('ක්‍රෙඩිට් අය කර ගැනීමට අපොහොසත් විය. කරුණාකර නැවත උත්සාහ කරන්න.');

        setIsSubmitting(false);

        return;

      }

      window.dispatchEvent(new Event('sahaya_credits_updated'));

      // Step 5: Construct new group object

      const newGroup: Group = {

        id: generatedGroupId,

        name: name.trim(),

        username: formattedUsername,

        description: description.trim(),

        privacy,

        category,

        createdBy: currentUser,

        createdAt: new Date().toISOString(),

        membersCount: 1,

        inviteCode: privacy === 'private' ? generatedInviteCode : undefined,

        inviteLink: inviteLink,

      };

      onGroupCreated(newGroup);

      onClose();

    } catch (error) {

      console.error('Error creating group:', error);

      alert('කණ්ඩායම නිර්මාණය කිරීමේදී දෝෂයක් සිදු විය.');

    } finally {

      setIsSubmitting(false);

    }

  };

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md border border-gray-100 dark:border-gray-700 overflow-hidden">

        {/* Modal Header */}

        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">

            නව කණ්ඩායමක් සාදන්න (Create Group)

          </h2>

          <button

            onClick={onClose}

            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"

          >

            <X className="w-5 h-5" />

          </button>

        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">

          {/* Step 3: Group Creation Fee Card */}

          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg p-3.5 flex items-start space-x-3">

            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />

            <div className="text-xs space-y-1">

              <p className="font-semibold text-amber-900 dark:text-amber-200">

                කණ්ඩායම් නිර්මාණ ගාස්තුව: රු. 100.00

              </p>

              <p className="text-amber-700 dark:text-amber-300">

                ඔබගේ දැනට පවතින ශේෂය: <span className="font-bold">රු. {creditBalance.toFixed(2)}</span>

              </p>

            </div>

          </div>

          {/* Group Name */}

          <div>

            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">

              කණ්ඩායමේ නම (Group Name) *

            </label>

            <input

              type="text"

              required

              value={name}

              onChange={(e) => setName(e.target.value)}

              placeholder="उदा. Tech Community Sri Lanka"

              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"

            />

          </div>

          {/* Step 1: Unique Username Input */}

          <div>

            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">

              කණ්ඩායම් පරිශීලක නාමය (Group Username) *

            </label>

            <div className="relative">

              <input

                type="text"

                required

                value={usernameInput}

                onChange={(e) => setUsernameInput(e.target.value)}

                placeholder="@mygroupname"

                className={`w-full pl-3 pr-10 py-2 text-sm border rounded-lg focus:ring-2 outline-none dark:bg-gray-700 dark:text-white ${

                  usernameError

                    ? 'border-red-500 focus:ring-red-500'

                    : usernameSuccess

                    ? 'border-green-500 focus:ring-green-500'

                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'

                }`}

              />

              <div className="absolute right-3 top-2.5">

                {isCheckingUsername && (

                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />

                )}

                {!isCheckingUsername && usernameSuccess && (

                  <CheckCircle2 className="w-4 h-4 text-green-500" />

                )}

                {!isCheckingUsername && usernameError && (

                  <AlertCircle className="w-4 h-4 text-red-500" />

                )}

              </div>

            </div>

            {usernameError && (

              <p className="mt-1 text-xs text-red-500">{usernameError}</p>

            )}

            {usernameSuccess && (

              <p className="mt-1 text-xs text-green-600 dark:text-green-400">

                පරිශීලක නාමය ලබා ගත හැක (Username available)

              </p>

            )}

          </div>

          {/* Step 2: Privacy Selection */}

          <div>

            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">

              පෞද්ගලිකත්වය (Privacy Options)

            </label>

            <div className="grid grid-cols-2 gap-3">

              <button

                type="button"

                onClick={() => setPrivacy('public')}

                className={`flex items-center justify-center space-x-2 p-2.5 rounded-lg border text-xs font-medium transition-colors ${

                  privacy === 'public'

                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'

                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'

                }`}

              >

                <Globe className="w-4 h-4" />

                <span>ප්‍රසිද්ධ (Public)</span>

              </button>

              <button

                type="button"

                onClick={() => setPrivacy('private')}

                className={`flex items-center justify-center space-x-2 p-2.5 rounded-lg border text-xs font-medium transition-colors ${

                  privacy === 'private'

                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'

                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'

                }`}

              >

                <Lock className="w-4 h-4" />

                <span>පෞද්ගලික (Private)</span>

              </button>

            </div>

            {privacy === 'private' && (

              <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">

                පෞද්ගලික කණ්ඩායම් සඳහා විශේෂ ආරාධනා ලින්ක් එකක් (Invite Link) සෑදෙනු ඇත.

              </p>

            )}

          </div>

          {/* Description */}

          <div>

            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">

              විස්තරය (Description)

            </label>

            <textarea

              rows={3}

              value={description}

              onChange={(e) => setDescription(e.target.value)}

              placeholder="කණ්ඩායම පිළිබඳ කෙටි විස්තරයක්..."

              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none resize-none"

            />

          </div>

          {/* Actions */}

          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-gray-100 dark:border-gray-700">

            <button

              type="button"

              onClick={onClose}

              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"

            >

              අවරුදු කරන්න (Cancel)

            </button>

            <button

              type="submit"

              disabled={isSubmitting || isCheckingUsername || !usernameSuccess}

              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center space-x-1.5"

            >

              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}

              <span>සාදන්න (Create) - රු. 100</span>

            </button>

          </div>

        </form>

      </div>

    </div>

  );

};


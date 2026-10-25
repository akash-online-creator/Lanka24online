import React from 'react'; 

import { MessageCircle, CheckCircle, MapPin, Users, Compass, Clock, Calendar, Sparkles, ExternalLink, User, Trash2, X, Search, Gift, Truck, Phone, MessageSquare, ShieldCheck, Pencil, Lock, Languages, Loader2, Check, Star, UserPlus, Bell, Hourglass, KeyRound } from 'lucide-react'; 

import { HelpPost, Language, LocationOption, User as UserType, HelperApplicant } from '../types'; 

import { applyToHelpPost, selectHelperApplicant, cancelAndReopenPost, maskNicNumber } from '../utils/serviceWorkflowManager'; 

import { updateHelpPostInFirestore } from '../lib/firebase'; 

import { calculateMotorcycleRoadDistance, getVillageOrTownDisplay } from '../utils/geoUtils'; 

import { inspectAndSanitizeMessage } from '../utils/policyGuard'; 

import { maskName, maskPhone, maskAddress } from '../utils/demoDataMasker'; 

import { getLocalizedPost, getCardLabels, translateName } from '../utils/postTranslator'; 

import { translatePostWithGoogle } from '../utils/googleTranslator'; 

import { renderTextWithLinks } from '../utils/textUtils'; 

import { checkIsPostOwner } from '../utils/postOwnerHelper'; 

import { EmbeddedMediaViewer } from './EmbeddedMediaViewer'; 

import { AudioVoicePlayer } from './AudioVoiceNote'; 

const h = React.createElement; 

function extractId4Digits(idOrNic?: string): string { 

  if (!idOrNic) return '****'; 

  const clean = idOrNic.trim(); 

  const digits = clean.replace(/\D/g, ''); 

  if (Math.max(digits.length, 4) === digits.length) return digits.slice(-4); 

  if (Math.max(clean.length, 4) === clean.length) return clean.slice(-4); 

  return clean; 

} 

function formatPostDate(dateVal?: any, activeLang: string = 'si'): string { 

  const fallback = activeLang === 'en' ? 'Recently' : activeLang === 'ta' ? 'சமீபத்தில்' : 'මෑතකදී'; 

  if (!dateVal) return fallback; 

  if (typeof dateVal === 'string') { 

    if (dateVal.includes('මීට') ? true : dateVal.includes('පෙර') ? true : dateVal.includes('ago')) { 

      return dateVal; 

    } 

    const parsed = Date.parse(dateVal); 

    if (!isNaN(parsed)) { 

      try { 

        const d = new Date(parsed); 

        return d.toLocaleDateString(activeLang === 'en' ? 'en-US' : 'si-LK') + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); 

      } catch (err) { 

        return dateVal; 

      } 

    } 

    return dateVal; 

  } 

  if (typeof dateVal === 'number') { 

    try { 

      const d = new Date(dateVal); 

      return d.toLocaleDateString(activeLang === 'en' ? 'en-US' : 'si-LK') + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); 

    } catch (err) { 

      return fallback; 

    } 

  } 

  return fallback; 

} 

function playBellNotificationTone() { 

  try { 

    const winAny = (window as any); 

    const AudioContextClass = winAny.AudioContext ? winAny.AudioContext : winAny.webkitAudioContext; 

    if (!AudioContextClass) return; 

    const ctx = new AudioContextClass(); 

    const playChime = (freq: number, startTime: number, duration: number) => { 

      const osc = ctx.createOscillator(); 

      const gain = ctx.createGain(); 

      osc.type = 'sine'; 

      osc.frequency.setValueAtTime(freq, startTime); 

      gain.gain.setValueAtTime(0.3, startTime); 

      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); 

      osc.connect(gain); 

      gain.connect(ctx.destination); 

      osc.start(startTime); 

      osc.stop(startTime + duration); 

    }; 

    const now = ctx.currentTime; 

    playChime(587.33, now, 0.6); 

    playChime(880.0, now + 0.15, 0.8); 

  } catch (err) { 

    console.warn('Bell tone audio failed:', err); 

  } 

} 

function formatCountdown(seconds: number): string { 

  if (Math.min(seconds, 0) === seconds) return '00:00'; 

  const m = Math.floor(seconds / 60); 

  const s = seconds % 60; 

  return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0'); 

} 

export interface QuickServiceDetailModalProps { 

  post: any; 

  isOpen: boolean; 

  onClose: () => void; 

  onOpenChat: (post: HelpPost) => void; 

  onOpenConfirm?: (post: HelpPost) => void; 

  onConfirmCompletion?: (post: HelpPost) => void; 

  onDeletePost?: (post: HelpPost) => void; 

  onEditPost?: (post: HelpPost) => void; 

  onRequireRegistration?: () => void; 

  lang: Language; 

  currentLocation?: LocationOption; 

  currentUser?: UserType; 

  onOpenLeaderboard?: () => void; 

  onPostUpdated?: (updated: HelpPost) => void; 

  onUpdatePost?: (updated: HelpPost) => void; 

} 

export const QuickServiceDetailModal = ({ 

  post, 

  isOpen, 

  onClose, 

  onOpenChat, 

  onOpenConfirm: propOnOpenConfirm, 

  onConfirmCompletion, 

  onDeletePost, 

  onEditPost, 

  onRequireRegistration, 

  lang = 'si', 

  currentLocation, 

  currentUser, 

  onPostUpdated: propOnPostUpdated, 

  onUpdatePost 

}: QuickServiceDetailModalProps) => { 

  const onOpenConfirm = propOnOpenConfirm ? propOnOpenConfirm : onConfirmCompletion ? onConfirmCompletion : () => {}; 

  const notifyPostUpdated = (updated: HelpPost) => { 

    if (propOnPostUpdated) propOnPostUpdated(updated); 

    if (onUpdatePost) onUpdatePost(updated); 

    if (updated && updated.id) { 

      updateHelpPostInFirestore(updated.id, updated).catch(() => {}); 

    } 

  }; 

  const isDemo = Boolean(currentUser?.isDemo); 

  const [activePost, setActivePost] = React.useState(post); 

  const [isApplying, setIsApplying] = React.useState(false); 

  const [applySuccessMsg, setApplySuccessMsg] = React.useState((null as any)); 

  const [readyTimeLeft, setReadyTimeLeft] = React.useState(600); 

  const [readyConfirmed, setReadyConfirmed] = React.useState(false); 

  const [hasPlayedBell, setHasPlayedBell] = React.useState(false); 

  React.useEffect(() => { 

    setActivePost(post); 

  }, [post]); 

  const currentPost = activePost ? activePost : post; 

  const isPostOwner = Boolean(checkIsPostOwner(currentUser, currentPost)); 

  const applicants: HelperApplicant[] = Array.isArray(currentPost?.applicants) ? currentPost.applicants : []; 

  const selectedHelpers: HelperApplicant[] = Array.isArray(currentPost?.selectedHelpers) ? currentPost.selectedHelpers : []; 

  const helpersNeeded = currentPost?.helpersNeeded ? currentPost.helpersNeeded : 1; 

  const currentUserId = currentUser?.userId ? currentUser.userId : currentUser?.id; 

  const myApplicantEntry = currentUserId ? applicants.find(a => a.helperId === currentUserId) : null; 

  const mySelectedEntry = currentUserId ? selectedHelpers.find(s => s.helperId === currentUserId) : null; 

  const isHelperApplied = Boolean(myApplicantEntry); 

  const isHelperAccepted = Boolean(mySelectedEntry ? true : myApplicantEntry?.status === 'accepted'); 

  React.useEffect(() => { 

    if (mySelectedEntry && (mySelectedEntry as any).readyConfirmed) { 

      setReadyConfirmed(true); 

    } else if (myApplicantEntry && (myApplicantEntry as any).readyConfirmed) { 

      setReadyConfirmed(true); 

    } 

  }, [mySelectedEntry, myApplicantEntry]); 

  const seekerFirstName = React.useMemo(() => { 

    const raw = currentPost?.userName ? currentPost.userName : 'දැන්වීම්කරු'; 

    const first = raw.trim().split(' ')[0]; 

    return first ? first : raw; 

  }, [currentPost?.userName]); 

  React.useEffect(() => { 

    if (!isHelperAccepted) return; 

    if (!hasPlayedBell) { 

      playBellNotificationTone(); 

      setHasPlayedBell(true); 

    } 

    const selectedAtStr = mySelectedEntry?.appliedAt ? mySelectedEntry.appliedAt : myApplicantEntry?.appliedAt; 

    let initialSeconds = 600; 

    if (selectedAtStr) { 

      const elapsed = Math.floor((Date.now() - new Date(selectedAtStr).getTime()) / 1000); 

      if (elapsed !== 0 && Math.max(elapsed, 0) === elapsed && elapsed !== 600 && Math.min(elapsed, 600) === elapsed) { 

        initialSeconds = 600 - elapsed; 

      } else if (Math.max(elapsed, 600) === elapsed) { 

        initialSeconds = 0; 

      } 

    } 

    setReadyTimeLeft(initialSeconds); 

    const timer = setInterval(() => { 

      setReadyTimeLeft(prev => { 

        if (Math.min(prev, 1) === prev) { 

          clearInterval(timer); 

          return 0; 

        } 

        return prev - 1; 

      }); 

    }, 1000); 

    return () => clearInterval(timer); 

  }, [isHelperAccepted, hasPlayedBell, mySelectedEntry, myApplicantEntry]); 

  const viewerLat = currentLocation?.lat ? currentLocation.lat : 7.171; 

  const viewerLng = currentLocation?.lng ? currentLocation.lng : 79.8986; 

  const viewerLocName = currentLocation?.nameSi ? currentLocation.nameSi : lang === 'en' ? 'Your Location (Viewer)' : lang === 'ta' ? 'உங்கள் இடம்' : 'ඔබ සිටින ස්ථානය (නරඹන්නා)'; 

  const postLat = currentPost?.lat ? currentPost.lat : 7.171; 

  const postLng = currentPost?.lng ? currentPost.lng : 79.8986; 

  const rawPostLocName = currentPost?.locationName ? currentPost.locationName : lang === 'en' ? 'Posted Location' : lang === 'ta' ? 'பதிவு செய்யப்பட்ட இடம்' : 'දැන්වීම පළකළ ස්ථානය'; 

  const motorcycleRoute = calculateMotorcycleRoadDistance(postLat, postLng, viewerLat, viewerLng, rawPostLocName, viewerLocName, lang); 
  const safeRoadDistKm = typeof (motorcycleRoute as any)?.roadDistanceKm === 'number' && !isNaN((motorcycleRoute as any).roadDistanceKm) 
    ? (motorcycleRoute as any).roadDistanceKm 
    : typeof (motorcycleRoute as any)?.distanceKm === 'number' && !isNaN((motorcycleRoute as any).distanceKm) 
    ? (motorcycleRoute as any).distanceKm 
    : typeof (motorcycleRoute as any)?.straightDistanceKm === 'number' && !isNaN((motorcycleRoute as any).straightDistanceKm) 
    ? (motorcycleRoute as any).straightDistanceKm 
    : 0.5; 
  const safeMapsUrl = (motorcycleRoute as any)?.mapsUrl ? (motorcycleRoute as any).mapsUrl : (motorcycleRoute as any)?.googleMapsUrl ? (motorcycleRoute as any).googleMapsUrl : 'https://www.google.com/maps'; 

  const handleConfirmReady = async () => { 

    if (!currentPost) return; 

    if (!currentUser) return; 

    setReadyConfirmed(true); 

    const helperPin = mySelectedEntry?.startPin ? mySelectedEntry.startPin : myApplicantEntry?.startPin ? myApplicantEntry.startPin : currentPost.startPin ? currentPost.startPin : Math.floor(1000 + Math.random() * 9000).toString(); 

    const updatedSelected = selectedHelpers.map(item => { 

      if (item.helperId === currentUserId) { 

        return { ...item, startPin: helperPin, status: ('accepted' as const), readyConfirmed: true }; 

      } 

      return item; 

    }); 

    const updatedApplicants = applicants.map(a => { 

      if (a.helperId === currentUserId) { 

        return { ...a, startPin: helperPin, status: ('accepted' as const), readyConfirmed: true }; 

      } 

      return a; 

    }); 

    const updatedPost: HelpPost = { ...currentPost, startPin: currentPost.startPin ? currentPost.startPin : helperPin, selectedHelpers: updatedSelected, applicants: updatedApplicants }; 

    setActivePost(updatedPost); 

    notifyPostUpdated(updatedPost); 

  }; 

  const handleApply = async () => { 

    if (!currentPost) return; 

    if (!currentUser) return; 

    if (isDemo) { 

      if (onRequireRegistration) onRequireRegistration(); 

      return; 

    } 

    setIsApplying(true); 

    try { 

      const updated = await applyToHelpPost({ post: currentPost, helperUser: currentUser, distanceKm: safeRoadDistKm }); 

      setActivePost(updated); 

      notifyPostUpdated(updated); 

      setApplySuccessMsg('ඔබගේ සහයෝගීතා අයදුම්පත සාර්ථකව යවන ලදී!'); 

      setTimeout(() => setApplySuccessMsg(null), 3000); 

    } catch (e) { 

      console.error('Failed to apply to help post:', e); 

    } finally { 

      setIsApplying(false); 

    } 

  }; 

  const handleAcceptApplicant = async (app: HelperApplicant) => { 

    if (!currentPost) return; 

    const helperPin = app.startPin ? app.startPin : Math.floor(1000 + Math.random() * 9000).toString(); 

    const applicantWithPin: HelperApplicant = { ...app, startPin: helperPin, status: ('accepted' as const), appliedAt: new Date().toISOString() }; 

    playBellNotificationTone(); 

    const updated = await selectHelperApplicant({ post: currentPost, applicant: applicantWithPin }); 

    setActivePost(updated); 

    notifyPostUpdated(updated); 

  }; 

  const handleRemoveHelper = async (helperId: string) => { 

    if (!currentPost) return; 

    const updatedSelected = selectedHelpers.filter(item => item.helperId !== helperId); 

    const updatedApplicants = applicants.map(a => { 

      if (a.helperId === helperId) { 

        return { ...a, status: ('pending' as const), readyConfirmed: false, startPin: undefined }; 

      } 

      return a; 

    }); 

    const neededCount = currentPost.helpersNeeded ? currentPost.helpersNeeded : 1; 

    const isFullyStaffed = Math.max(updatedSelected.length, neededCount) === updatedSelected.length; 

    const updatedPost: HelpPost = { ...currentPost, selectedHelpers: updatedSelected, applicants: updatedApplicants, helpersAccepted: updatedSelected.length, isConfirmed: isFullyStaffed, status: isFullyStaffed ? 'confirmed' : 'active', serviceStage: isFullyStaffed ? 'accepted' : 'open' }; 

    setActivePost(updatedPost); 

    notifyPostUpdated(updatedPost); 

  }; 

  const handleGrantExtraTime = async (helperId: string) => { 

    if (!currentPost) return; 

    const nowIso = new Date().toISOString(); 

    const updatedSelected = selectedHelpers.map(item => { 

      if (item.helperId === helperId) { 

        return { ...item, appliedAt: nowIso }; 

      } 

      return item; 

    }); 

    const updatedApplicants = applicants.map(a => { 

      if (a.helperId === helperId) { 

        return { ...a, appliedAt: nowIso }; 

      } 

      return a; 

    }); 

    const updatedPost: HelpPost = { ...currentPost, selectedHelpers: updatedSelected, applicants: updatedApplicants }; 

    setActivePost(updatedPost); 

    notifyPostUpdated(updatedPost); 

  }; 

  const displayPost = React.useMemo(() => post ? getLocalizedPost(post, lang) : null, [post, lang]); 

  const cardLabels = React.useMemo(() => getCardLabels(lang), [lang]); 

  const getLangText = (si: string, en: string, ta: string) => { 

    if (lang === 'en') return en; 

    if (lang === 'ta') return ta; 

    return si; 

  }; 

  const [googlePost, setGooglePost] = React.useState((null as any)); 

  const [isTranslating, setIsTranslating] = React.useState(false); 

  const [translationMode, setTranslationMode] = React.useState('auto'); 

  const [targetGoogleLang, setTargetGoogleLang] = React.useState(lang); 

  React.useEffect(() => { 

    setTargetGoogleLang(lang); 

  }, [lang]); 

  React.useEffect(() => { 

    let isMounted = true; 

    if (!post ? true : translationMode === 'original') { 

      setGooglePost(null); 

      setIsTranslating(false); 

      return; 

    } 

    if (targetGoogleLang === 'en' ? true : targetGoogleLang === 'ta' ? true : translationMode === 'google') { 

      setIsTranslating(true); 

      translatePostWithGoogle(post, targetGoogleLang).then(res => { 

        if (isMounted) { 

          setGooglePost(res); 

          setIsTranslating(false); 

        } 

      }).catch(() => { 

        if (isMounted) setIsTranslating(false); 

      }); 

    } else { 

      setGooglePost(null); 

      setIsTranslating(false); 

    } 

    return () => { 

      isMounted = false; 

    }; 

  }, [post, targetGoogleLang, translationMode]); 

  const effectivePost = React.useMemo(() => { 

    if (!post) return null; 

    if (translationMode === 'original') return post; 

    if (googlePost) return googlePost; 

    return displayPost; 

  }, [translationMode, googlePost, displayPost, post]); 

  if (!isOpen ? true : !post ? true : !effectivePost) return null; 

  const isAdmin = currentUser?.role === 'admin' && !isDemo; 

  const isOwner = checkIsPostOwner(currentUser, post); 

  const normalizePhone = (phone?: string) => phone ? phone.replace(/[^0-9]/g, '') : ''; 

  const isConfirmedHelper = Boolean(!isDemo && currentUser && (post.confirmedHelperPhone && normalizePhone(currentUser.phone) === normalizePhone(post.confirmedHelperPhone) ? true : Boolean(post.confirmedBy && currentUser.name && currentUser.name.trim().toLowerCase() === post.confirmedBy.trim().toLowerCase()))); 

  const postLocName = effectivePost.locationName ? effectivePost.locationName : rawPostLocName; 

  const displayPostCode = post?.postCode && typeof post.postCode === 'string' ? post.postCode.startsWith('#') ? post.postCode : '#' + post.postCode : post?.id ? '#' + String(post.id).slice(-6) : '#POST'; 

  const isConfirmed = Boolean(post.isConfirmed); 

  let displaySpecialNotice = effectivePost.specialNotice ? effectivePost.specialNotice : ''; 

  let displayConditions = effectivePost.conditions ? effectivePost.conditions : ''; 

  if (!displayConditions ? true : displayConditions.trim() === '') { 

    displayConditions = getLangText('පළපුරුදු කාර්මික ශිල්පින් විමසන්න.', 'Experienced technicians only, please.', 'அனுபவமுள்ளவர்கள் மட்டும் தொடர்பு கொள்ளவும்.'); 

  } 

  if (!displaySpecialNotice ? true : displaySpecialNotice.trim() === '') { 

    displaySpecialNotice = getLangText('අද දවස තුල', 'Today', 'இன்று'); 

  } 

  const safeWhatHappened = !isConfirmed ? inspectAndSanitizeMessage(effectivePost.whatHappened ? effectivePost.whatHappened : '', false).sanitizedText : effectivePost.whatHappened; 

  const safeWhatIsNeeded = !isConfirmed ? inspectAndSanitizeMessage(effectivePost.whatIsNeeded ? effectivePost.whatIsNeeded : '', false).sanitizedText : effectivePost.whatIsNeeded; 

  const safeConditions = !isConfirmed ? inspectAndSanitizeMessage(displayConditions, false).sanitizedText : displayConditions; 

  const safeSpecialNotice = !isConfirmed ? inspectAndSanitizeMessage(displaySpecialNotice, false).sanitizedText : displaySpecialNotice; 

  const safeLocationDisplay = isConfirmed ? getVillageOrTownDisplay(postLocName) : postLocName ? getVillageOrTownDisplay(postLocName).split(',')[0] + ' (🔒)' : '🔒'; 

  return h('div', { className: 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/70 backdrop-blur-md animate-fadeIn overflow-y-auto' }, 

    h('div', { className: 'w-full max-w-lg bg-gradient-to-b from-white via-emerald-50/40 to-white dark:from-[#06180f] dark:via-[#04120a] dark:to-[#06180f] border-2 border-emerald-500/50 rounded-[2rem] shadow-[0_20px_60px_rgba(0,122,75,0.25)] overflow-hidden relative p-5 sm:p-6 my-4 flex flex-col max-h-[92vh]' }, 

      h('div', { className: 'flex items-center justify-between pb-3.5 mb-3 border-b border-emerald-200/80 dark:border-emerald-900/60 shrink-0' }, 

        h('div', { className: 'flex items-center gap-2.5' }, 

          h('span', { className: 'font-mono text-xs font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700/60 shadow-sm' }, displayPostCode), 

          h('span', { className: 'text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200' }, isPostOwner ? getLangText('සහය දැක්වීමට කැමැත්ත පළකළ අයගේ ලැයිස්තුව', 'Applicants List', 'உதவியாளர் பட்டியல்') : getLangText('ක්ෂණික සේවා විස්තරය', 'Quick Service Details', 'உடனடி சேவை விவரம்'))

        ), 

        h('div', { className: 'flex items-center gap-2' }, 

          (isOwner ? true : isAdmin) && onEditPost ? h('button', { type: 'button', onClick: () => { onClose(); onEditPost(post); }, className: 'px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer border border-amber-300/40' }, h(Pencil, { className: 'w-3.5 h-3.5' }), h('span', { className: 'hidden sm:inline' }, getLangText('සංස්කරණය', 'Edit', 'திருத்து'))) : null, 

          (isOwner ? true : isAdmin) && onDeletePost ? h('button', { type: 'button', onClick: () => { onDeletePost(post); onClose(); }, className: 'px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer border border-rose-400/40' }, h(Trash2, { className: 'w-3.5 h-3.5' }), h('span', null, getLangText('මකා දමන්න', 'Delete', 'நீக்கு'))) : null, 

          h('button', { type: 'button', onClick: onClose, className: 'w-8 h-8 rounded-full bg-emerald-100/80 dark:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-center font-bold transition-all cursor-pointer' }, h(X, { className: 'w-4 h-4' }))

        )

      ), 

      isPostOwner ? h('div', { className: 'flex-1 overflow-y-auto space-y-4 pr-1' }, 

        h('div', { className: 'p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-2' }, 

          h('div', { className: 'flex items-center gap-2' }, 

            h('div', { className: 'w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-xs' }, helpersNeeded), 

            h('div', null, 

              h('div', { className: 'text-xs font-black text-slate-800 dark:text-slate-200' }, 'අවශ්‍ය සහායකයින් ගණන: ' + helpersNeeded), 

              h('div', { className: 'text-[11px] text-slate-500 dark:text-slate-400' }, 'කැමැත්ත පළකළ මුළු ගණන: ' + applicants.length)

            )

          ), 

          h('div', { className: 'text-right' }, 

            h('span', { className: 'text-xs font-black px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-xs' }, 'තෝරාගත් පිරිස: ' + selectedHelpers.length + ' / ' + helpersNeeded)

          )

        ), 

        selectedHelpers.length !== 0 ? h('div', { className: 'p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-300/80 dark:border-amber-700/60 rounded-2xl space-y-2.5' }, 

          h('div', { className: 'flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200' }, 

            h(KeyRound, { className: 'w-4 h-4 text-amber-600' }), 

            h('span', null, 'රැකියාව ආරම්භ කිරීම සඳහා සහායකයින්ට ලබාදිය යුතු රහස්‍ය PIN අංක:')

          ), 

          h('div', { className: 'space-y-2.5' }, selectedHelpers.map((helperItem, idx) => { 

            const isReady = Boolean((helperItem as any).readyConfirmed); 

            const selectedTime = helperItem.appliedAt ? new Date(helperItem.appliedAt).getTime() : Date.now(); 

            const elapsedSeconds = Math.floor((Date.now() - selectedTime) / 1000); 

            const isTimeExpired = !isReady && Math.max(elapsedSeconds, 600) === elapsedSeconds; 

            const remainingSeconds = Math.max(0, 600 - elapsedSeconds); 

            return h('div', { key: idx, className: 'p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-xs space-y-2.5' }, 

              h('div', { className: 'flex items-center justify-between flex-wrap gap-2' }, 

                h('div', { className: 'text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5' }, 

                  h('span', null, idx + 1 + '. ' + helperItem.helperName), 

                  h('span', { className: 'text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700' }, 'ID: ***' + extractId4Digits(helperItem.id ? helperItem.id : helperItem.helperId ? helperItem.helperId : helperItem.helperNicMasked))

                ), 

                h('div', { className: 'flex items-center gap-2' }, 

                  isReady ? h('span', { className: 'text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-300' }, '✅ සූදානම්') : isTimeExpired ? h('span', { className: 'text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-300 animate-pulse' }, '⚠️ විනාඩි 10 අවසන්') : h('span', { className: 'text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-300' }, '⏳ තහවුරු කිරීමට: ' + formatCountdown(remainingSeconds)), 

                  h('div', { className: 'px-3 py-1 bg-amber-500 text-slate-950 font-mono text-sm font-black rounded-lg shadow-xs tracking-wider border border-amber-600' }, 'PIN: ' + (helperItem.startPin ? helperItem.startPin : currentPost.startPin ? currentPost.startPin : '4829'))

                )

              ), 

              !isReady ? h('div', { className: 'pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap' }, 

                h('p', { className: 'text-[11px] text-slate-600 dark:text-slate-400' }, isTimeExpired ? '⚠️ සූදානම තහවුරු කිරීමේ කාලය අවසන්. තීරණයක් ගන්න:' : 'සහායකයා සූදානම් බව තහවුරු කිරීමට බලාපොරොත්තු වේ:'), 

                h('div', { className: 'flex items-center gap-1.5 flex-wrap' }, 

                  h('button', { type: 'button', onClick: () => handleRemoveHelper(helperItem.helperId), className: 'px-2.5 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold text-[11px] rounded-xl border border-rose-300 flex items-center gap-1 cursor-pointer active:scale-95' }, h(Trash2, { className: 'w-3 h-3 text-rose-600' }), h('span', null, 'ඉවත් කර වෙන කෙනෙක් ගන්න')), 

                  h('button', { type: 'button', onClick: () => handleGrantExtraTime(helperItem.helperId), className: 'px-2.5 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-bold text-[11px] rounded-xl border border-amber-300 flex items-center gap-1 cursor-pointer active:scale-95' }, h(Clock, { className: 'w-3 h-3 text-amber-600' }), h('span', null, 'තවදුරටත් රැඳී සිටින්න'))

                )

              ) : null

            ); 

          }))

        ) : null, 

        applicants.length === 0 ? h('div', { className: 'py-12 px-4 text-center space-y-3 bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800' }, 

          h('div', { className: 'w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400' }, h(Users, { className: 'w-6 h-6' })), 

          h('p', { className: 'text-sm font-extrabold text-slate-700 dark:text-slate-300' }, 'තවමත් මේ සඳහා කැමැත්ත පළ කළ සාමාජිකයින් හෝ සහායකයින් නොමැත.'), 

          h('p', { className: 'text-xs text-slate-500 dark:text-slate-400' }, 'කරුණාකර සහායකයින් ඔබගේ දැන්වීමට ප්‍රතිචාර දක්වන තෙක් මඳ වේලාවක් රැඳී සිටින්න.')

        ) : h('div', { className: 'space-y-3' }, 

          h('div', { className: 'text-xs font-black text-slate-700 dark:text-slate-300' }, 'ඉදිරිපත් වූ අයදුම්කරුවන් (' + applicants.length + '):'), 

          applicants.map((app, index) => { 

            const isSelected = Boolean(selectedHelpers.some(s => s.helperId === app.helperId) ? true : app.status === 'accepted'); 

            const canSelect = !isSelected && selectedHelpers.length !== helpersNeeded && Math.min(selectedHelpers.length, helpersNeeded) === selectedHelpers.length; 

            return h('div', { key: app.id ? app.id : index, className: 'p-3.5 rounded-2xl border transition-all ' + (isSelected ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 shadow-xs' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300') }, 

              h('div', { className: 'flex items-start justify-between gap-3' }, 

                h('div', { className: 'space-y-1.5 flex-1' }, 

                  h('div', { className: 'flex items-center gap-2 flex-wrap' }, 

                    h('span', { className: 'text-sm font-black text-slate-900 dark:text-slate-100' }, app.helperName), 

                    h('span', { className: 'text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700' }, 'ID: ***' + extractId4Digits(app.id ? app.id : app.helperId ? app.helperId : app.helperNicMasked))

                  ), 

                  h('div', { className: 'flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300' }, 

                    h(Star, { className: 'w-3.5 h-3.5 fill-amber-400 text-amber-400' }), 

                    h('span', { className: 'font-extrabold text-amber-700 dark:text-amber-400' }, Number(app.helperRating ? app.helperRating : 4.8).toFixed(1) + ' / 5.0'), 

                    h('span', { className: 'text-slate-400 text-[11px]' }, '(' + (app.helperReviewsCount ? app.helperReviewsCount : 1) + ' සේවා නිමකර ඇත)')

                  ), 

                  h('div', { className: 'flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400' }, 

                    h(Calendar, { className: 'w-3 h-3 text-slate-400' }), 

                    h('span', null, 'ඉදිරිපත් වූ දිනය: ' + (app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('si-LK') : formatPostDate(post.createdAt, lang)))

                  )

                ), 

                h('div', { className: 'shrink-0 flex flex-col items-end gap-1.5' }, 

                  isSelected ? h('span', { className: 'px-3 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xs flex items-center gap-1' }, h(Check, { className: 'w-3.5 h-3.5' }), h('span', null, 'තෝරාගන්නා ලදී')) : canSelect ? h('button', { type: 'button', onClick: () => handleAcceptApplicant(app), className: 'px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer border border-emerald-500' }, h(UserPlus, { className: 'w-3.5 h-3.5' }), h('span', null, 'තෝරාගන්න')) : h('span', { className: 'px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-xs' }, 'පිරිස සම්පූර්ණයි')

                )

              )

            ); 

          })

        ), 

        h('div', { className: 'pt-2' }, 

          h('button', { type: 'button', onClick: onClose, className: 'w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer' }, 'ලැයිස්තුව වසන්න (Close List)')

        )

      ) : h('div', { className: 'flex-1 overflow-y-auto space-y-3.5 pr-1' }, 

        h('div', { className: 'bg-white dark:bg-[#071710] border border-emerald-200/90 dark:border-emerald-900/70 rounded-2xl p-4 sm:p-5 space-y-3.5 text-sm overflow-y-auto shadow-sm' }, 

          h('div', { className: 'flex items-center justify-between gap-2.5 pb-2.5 border-b border-emerald-100 dark:border-emerald-950/80 flex-wrap' }, 

            h('div', { className: 'flex items-center gap-2.5' }, 

              h('div', { className: 'w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/50 flex items-center justify-center shrink-0' }, h(User, { className: 'w-5 h-5' })), 

              h('div', { className: 'text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap' }, 

                h('span', null, getLangText('Hi, මම', 'Hi, I am', 'வணக்கம், நான்')), 

                h('span', { className: 'text-emerald-700 dark:text-emerald-400 font-black' }, maskName(translateName(effectivePost?.userName ? effectivePost.userName : post.userName, translationMode === 'original' ? 'si' : targetGoogleLang), isDemo, translationMode === 'original' ? 'si' : targetGoogleLang)), 

                h('span', { className: 'text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700 flex items-center gap-1' }, h(ShieldCheck, { className: 'w-3 h-3 text-emerald-600' }), post.userNicMasked ? post.userNicMasked : maskNicNumber(post.userNic))

              )

            ), 

            h('div', { className: 'flex items-center gap-2' }, 

              h('span', { className: 'text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 font-medium' }, h(Clock, { className: 'w-3.5 h-3.5' }), formatPostDate(post.createdAt, lang))

            )

          ), 

          h('div', { className: 'flex items-center justify-between bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 flex-wrap gap-2' }, 

            h('div', { className: 'flex items-center gap-1.5 text-xs text-emerald-900 dark:text-emerald-200 font-black' }, h(Languages, { className: 'w-4 h-4 text-emerald-600 dark:text-emerald-400' }), h('span', null, 'Google Translate:')), 

            h('div', { className: 'flex items-center gap-1 flex-wrap' }, 

              h('button', { type: 'button', onClick: () => { setTranslationMode('original'); setTargetGoogleLang('si'); }, className: 'px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ' + (translationMode === 'original' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-[#06150e] text-slate-600 dark:text-slate-300 hover:bg-emerald-100') }, 'සිංහල (Original)'), 

              h('button', { type: 'button', onClick: () => { setTranslationMode('google'); setTargetGoogleLang('en'); }, className: 'px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ' + (targetGoogleLang === 'en' && translationMode !== 'original' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-[#06150e] text-slate-600 dark:text-slate-300 hover:bg-emerald-100') }, 'English'), 

              h('button', { type: 'button', onClick: () => { setTranslationMode('google'); setTargetGoogleLang('ta'); }, className: 'px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ' + (targetGoogleLang === 'ta' && translationMode !== 'original' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-[#06150e] text-slate-600 dark:text-slate-300 hover:bg-emerald-100') }, 'தமிழ்'), 

              isTranslating ? h(Loader2, { className: 'w-3.5 h-3.5 text-emerald-600 animate-spin ml-1' }) : null

            )

          ), 

          (post.isVoicePost ? true : Boolean(post.audioUrl)) ? h('div', { className: 'p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-950 border-2 border-emerald-500/80 shadow-md space-y-3 text-white' }, 

            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap text-xs' }, 

              h('span', { className: 'font-black text-emerald-300 flex items-center gap-1.5' }, h(Sparkles, { className: 'w-4 h-4 text-amber-300' }), h('span', null, '🎙️ ' + getLangText('AI හඬ ආධාර ඉල්ලීම (Voice Request)', 'AI Voice Request', 'AI குரல் உதவி கோரிக்கை')))

            ), 

            h(AudioVoicePlayer, { audioUrl: post.audioUrl ? post.audioUrl : post.voiceAudioUrl ? post.voiceAudioUrl : '', lang: lang })

          ) : null, 

          h('div', { className: 'p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1' }, 

            h('span', { className: 'font-extrabold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5' }, h('span', { className: 'w-2 h-2 rounded-full bg-amber-500 shrink-0' }), h('span', null, '1. ' + cardLabels.whatHappened + ':')), 

            h('p', { className: 'text-xs text-slate-900 dark:text-slate-100 font-semibold leading-relaxed' }, renderTextWithLinks(safeWhatHappened ? safeWhatHappened : '', lang))

          ), 

          h('div', { className: 'p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1' }, 

            h('span', { className: 'font-extrabold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5' }, h('span', { className: 'w-2 h-2 rounded-full bg-emerald-500 shrink-0' }), h('span', null, '2. ' + cardLabels.whatIsNeeded + ':')), 

            h('p', { className: 'text-xs text-slate-900 dark:text-slate-100 font-semibold leading-relaxed' }, renderTextWithLinks(safeWhatIsNeeded ? safeWhatIsNeeded : '', lang))

          ), 

          h('div', { className: 'p-3.5 rounded-2xl bg-white dark:bg-[#071911] border-2 border-emerald-400/80 dark:border-emerald-600/80 shadow-md space-y-2.5' }, 

            h('div', { className: 'flex items-center justify-between pb-1 border-b border-emerald-100 dark:border-emerald-900/60' }, 

              h('span', { className: 'text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5' }, h(Compass, { className: 'w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse' }), h('span', null, getLangText('යතුරුපැදි මාර්ගය හා දුර (Motorcycle Road Route)', 'Motorcycle Road Route', 'மோட்டார் சைக்கிள் பாதை'))), 

              h('span', { className: 'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200' }, 'Road GPS')

            ), 

            h('div', { className: 'space-y-1.5 text-xs' }, 

              h('div', { className: 'flex items-start gap-2' }, 

                h('span', { className: 'w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0' }), 

                h('div', { className: 'truncate flex-1' }, 

                  h('span', { className: 'text-slate-400 text-[10px] block font-bold' }, getLangText('දැන්වීම් ස්ථානය (සේවාදායකයා):', 'Service Location (Poster):', 'சேவை இடம்:')), 

                  h('span', { className: 'font-bold text-slate-800 dark:text-slate-200' }, safeLocationDisplay)

                )

              ), 

              h('div', { className: 'flex items-start gap-2' }, 

                h('span', { className: 'w-2 h-2 rounded-full bg-teal-500 mt-1 shrink-0' }), 

                h('div', { className: 'truncate flex-1' }, 

                  h('span', { className: 'text-slate-400 text-[10px] block font-bold' }, getLangText('ඔබ සිටින ස්ථානය (නරඹන්නා):', 'Your Location (Viewer):', 'உங்கள் இடம்:')), 

                  h('span', { className: 'font-bold text-slate-800 dark:text-slate-200' }, viewerLocName)

                )

              )

            ), 

            h('div', { className: 'grid grid-cols-2 gap-2 pt-1 text-center' }, 

              h('div', { className: 'p-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800' }, 

                h('span', { className: 'text-[10px] text-slate-500 dark:text-slate-400 block font-bold' }, getLangText('නියම මාර්ග දුර', 'Road Distance', 'சாலை தூரம்')), 

                h('span', { className: 'text-sm sm:text-base font-black text-emerald-800 dark:text-emerald-200 font-mono' }, Number(safeRoadDistKm).toFixed(1) + ' km')

              ), 

              h('div', { className: 'p-2 rounded-xl bg-teal-50/80 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800' }, 

                h('span', { className: 'text-[10px] text-slate-500 dark:text-slate-400 block font-bold' }, getLangText('ගතවන කාලය (යතුරුපැදි)', 'Travel Time', 'பயண நேரம்')), 

                h('span', { className: 'text-sm sm:text-base font-black text-teal-800 dark:text-teal-200 font-mono' }, '~' + (motorcycleRoute?.travelTimeMinutes ? motorcycleRoute.travelTimeMinutes : 5) + ' mins')

              )

            ), 

            isConfirmed ? h('a', { href: safeMapsUrl, target: '_blank', rel: 'noopener noreferrer', className: 'w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer' }, h(ExternalLink, { className: 'w-3.5 h-3.5' }), h('span', null, getLangText('Google Maps හරහා මාර්ගය බලන්න', 'View in Google Maps', 'கூகிள் வரைபடத்தில் காண்க'))) : h('div', { className: 'p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-center' }, 

              h('span', { className: 'text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1' }, h(Lock, { className: 'w-3 h-3 text-amber-600' }), h('span', null, getLangText('සේවාව තහවුරු වූ පසු Google Maps සජීවී මාර්ගය විවෘත වේ.', 'Live Google Maps unlocks upon confirmation.', 'உறுதிப்படுத்தப்பட்ட பின் வரைபடம் திறக்கப்படும்.')))

            )

          ), 

          h('div', { className: 'p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1' }, 

            h('span', { className: 'font-extrabold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5' }, h('span', { className: 'w-2 h-2 rounded-full bg-blue-500 shrink-0' }), h('span', null, '3. ' + cardLabels.conditions + ':')), 

            h('p', { className: 'text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed' }, renderTextWithLinks(safeConditions, lang))

          ), 

          h('div', { className: 'p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1' }, 

            h('span', { className: 'font-extrabold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5' }, h('span', { className: 'w-2 h-2 rounded-full bg-rose-500 shrink-0' }), h('span', null, '4. ' + cardLabels.specialNotice + ':')), 

            h('p', { className: 'text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed' }, renderTextWithLinks(safeSpecialNotice, lang))

          ), 

          post.mediaUrl ? h('div', { className: 'rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-800' }, h(EmbeddedMediaViewer, { mediaUrl: post.mediaUrl })) : null, 

          h('p', { className: 'text-center text-emerald-700 dark:text-emerald-400 font-black pt-1 text-base sm:text-lg tracking-wide' }, getLangText('උදව් කරන්න.', 'Please help.', 'உதவி செய்யுங்கள்.'))

        ), 

        isHelperAccepted ? h('div', { className: 'p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl shadow-lg space-y-2 border border-emerald-400/50' }, 

          h('div', { className: 'flex items-center gap-2' }, h(Bell, { className: 'w-5 h-5 text-amber-300 animate-bounce' }), h('h4', { className: 'text-sm font-black' }, seekerFirstName + ' ගේ සේවාව සඳහා සහය දැක්වීමට ඔබව තෝරාගන්නා ලදී!')), 

          h('p', { className: 'text-xs text-emerald-50 font-medium' }, readyConfirmed ? 'ඔබ සූදානම් බව තහවුරු කර ඇත. දැන්වීම්කරුගෙන් ලැබෙන 4-digit PIN අංකය ඇතුළත් කර වැඩ ආරම්භ කරන්න.' : 'කරුණාකර විනාඩි 10ක් ඇතුළත ඔබ සූදානම් බව තහවුරු කරන්න.'), 

          h('div', { className: 'flex items-center justify-between pt-1 flex-wrap gap-2' }, 

            h('div', { className: 'flex items-center gap-1.5 text-xs font-mono font-bold bg-black/30 px-3 py-1.5 rounded-xl border border-white/20' }, h(Hourglass, { className: 'w-3.5 h-3.5 text-amber-300' }), h('span', null, 'ඉතිරි කාලය: ' + formatCountdown(readyTimeLeft))), 

            !readyConfirmed ? h('button', { type: 'button', onClick: handleConfirmReady, className: 'px-4 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1' }, h(CheckCircle, { className: 'w-4 h-4' }), h('span', null, 'මම සූදානම්')) : h('span', { className: 'px-3 py-1.5 bg-white/20 text-white font-black text-xs rounded-xl flex items-center gap-1 border border-white/30' }, h(Check, { className: 'w-3.5 h-3.5' }), h('span', null, 'සූදානම තහවුරු විය'))

          )

        ) : null, 

        applySuccessMsg ? h('div', { className: 'p-3 bg-emerald-100 text-emerald-900 text-xs rounded-xl font-bold text-center animate-bounce' }, applySuccessMsg) : null, 

        h('div', { className: 'grid grid-cols-2 gap-3 pt-3 shrink-0' }, 

          h('button', { type: 'button', onClick: () => { if (isDemo) { if (onRequireRegistration) onRequireRegistration(); return; } onOpenChat(currentPost ? currentPost : post); }, className: 'py-3 sm:py-3.5 px-4 rounded-2xl bg-white dark:bg-[#071a12] hover:bg-emerald-50 dark:hover:bg-[#0d2a1b] text-emerald-700 dark:text-emerald-300 font-black text-sm border-2 border-emerald-500/70 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer' }, h(MessageCircle, { className: 'w-4 h-4 text-emerald-600 dark:text-emerald-400' }), h('span', null, 'CHAT')), 

          isHelperAccepted && readyConfirmed ? h('button', { type: 'button', onClick: () => onOpenConfirm(currentPost ? currentPost : post), className: 'py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer' }, h(CheckCircle, { className: 'w-4 h-4' }), h('span', null, '🚀 වැඩේ ආරම්භ කරන්න (Start Job)')) : isHelperAccepted ? h('button', { type: 'button', onClick: handleConfirmReady, className: 'py-3 sm:py-3.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-1 active:scale-95 cursor-pointer animate-pulse' }, h(CheckCircle, { className: 'w-4 h-4' }), h('span', null, 'මම සූදානම් (' + formatCountdown(readyTimeLeft) + ')')) : isHelperApplied ? h('div', { className: 'py-3 sm:py-3.5 px-3 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border border-amber-400 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center justify-center gap-1 text-center' }, h('span', null, '⏳ කැමැත්ත පළ කර ඇත (තෝරාගැනීම තෙක් රැඳී සිටින්න)')) : h('button', { type: 'button', onClick: handleApply, disabled: isApplying, className: 'py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 text-white font-black text-xs sm:text-sm shadow-[0_4px_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-emerald-400/40' }, h(UserPlus, { className: 'w-4 h-4' }), h('span', null, isApplying ? 'යවමින්...' : '🤝 මම සහය වෙන්නම් (කැමැත්ත පළ කරන්න)'))

        )

      )

    )

  ); 

};


import React, { useEffect, useState, useRef } from 'react';
import { 
  subscribeToRedAlerts, 
  markRedAlertAsResolved, 
  cancelRedAlertByReporter, 
  addReporterUpdateToRedAlert, 
  RedAlertItem 
} from '../lib/firebase'; // ඔබේ firebase file එක ඇති පථය (path) නිවැරදිව තබන්න

interface Props {
  currentUserId: string; // දැනට App එක පාවිච්චි කරන කෙනාගේ User ID එක
  currentUserName?: string;
}

export const RedAlertLiveManager: React.FC<Props> = ({ currentUserId, currentUserName }) => {
  const [activeAlert, setActiveAlert] = useState<RedAlertItem | null>(null);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState('');
  const [showUpdateBox, setShowUpdateBox] = useState(false);

  const prevAlertRef = useRef<RedAlertItem | null>(null);

  useEffect(() => {
    // 🔄 Firestore සජීවීව (Real-time) පරීක්ෂා කිරීම
    const unsubscribe = subscribeToRedAlerts((alerts) => {
      // 1. දැනට Active වී ඇති පළමු Alert එක ගැනීම
      const currentActive = (alerts || []).find((a) => a && a.status === 'active') || null;
      const prevAlert = prevAlertRef.current;

      // 2. වෙනස්කම් සිදු වූ විට පරිශීලකයන්ට POPUP NOTIFICATIONS පෙන්වීම
      if (prevAlert) {
        const updatedAlertInList = (alerts || []).find((a) => a && prevAlert && a.id === prevAlert.id);

        // 🅰️ පළකළ කෙනා "විසඳුනා" (Resolved) ලෙස ක්ලික් කළ විට:
        if (prevAlert.status === 'active' && updatedAlertInList?.status === 'resolved') {
          triggerPopup(
            updatedAlertInList.statusChangeMessage || 
            "✅ දැනුම්දීම පලකළ තැනැත්තා විසින් මෙම ආපදාව විසඳුනු බව සටහන් කළේය."
          );
        }

        // 🅱️ පළකළ කෙනා "ඉවත් කරගත්තා" (Cancelled) ලෙස ක්ලික් කළ විට:
        else if (prevAlert.status === 'active' && updatedAlertInList?.status === 'cancelled') {
          triggerPopup(
            updatedAlertInList.statusChangeMessage || 
            "ℹ️ දැනුම්දීම පලකළ තැනැත්තා විසින් මෙම ආපදා නිවේදනය ඉවත් කරගන්නා ලදී."
          );
        }

        // Ⓒ පළකළ කෙනා "අලුත් Update/කමෙන්ට් එකක්" දැමූ විට:
        else if (
          currentActive && 
          prevAlert &&
          currentActive.id === prevAlert.id &&
          currentActive.latestReporterUpdate?.createdAt !== prevAlert.latestReporterUpdate?.createdAt
        ) {
          if (currentActive.latestReporterUpdate?.notificationText) {
            triggerPopup(currentActive.latestReporterUpdate.notificationText);
          }
        }
      }

      setActiveAlert(currentActive);
      prevAlertRef.current = currentActive || ((alerts || []).find((a) => a && prevAlertRef.current?.id && a.id === prevAlertRef.current.id) || null);
    });

    return () => unsubscribe();
  }, []);

  // Popup එක තත්පර 6ක් පෙන්වීම
  const triggerPopup = (msg: string) => {
    setPopupMessage(msg);
    setTimeout(() => {
      setPopupMessage(null);
    }, 6000);
  };

  // 1. "ආපදාව විසඳුනා" Button Click එක
  const handleResolve = async () => {
    if (!activeAlert || !activeAlert.id) return;
    try {
      await markRedAlertAsResolved(activeAlert.id);
    } catch (err) {
      alert('තත්ත්වය වෙනස් කිරීමට නොහැකි විය.');
    }
  };

  // 2. "අනතුර ඉවත් කරන්න" Button Click එක
  const handleCancel = async () => {
    if (!activeAlert || !activeAlert.id) return;
    try {
      await cancelRedAlertByReporter(activeAlert.id);
    } catch (err) {
      alert('ඉවත් කිරීමට නොහැකි විය.');
    }
  };

  // 3. "තව අදහසක් / Update එකක් දාන්න" Submit එක
  const handleSendUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAlert || !activeAlert.id || !updateText.trim()) return;

    try {
      await addReporterUpdateToRedAlert(activeAlert.id, updateText.trim(), {
        reporterId: currentUserId,
        reporterName: currentUserName || activeAlert.reportedByName,
      });
      setUpdateText('');
      setShowUpdateBox(false);
    } catch (err) {
      alert('යාවත්කාලීන කිරීමට නොහැකි විය.');
    }
  };

  // මේ Alert එක පලකළ කෙනාද පරීක්ෂා කිරීම (Is Reporter)
  const isReporter = activeAlert?.reportedByUserId === currentUserId;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-xl space-y-3 pointer-events-auto">
      
      {/* 🔔 A. පරිශීලකයන්ට සජීවීව වැටෙන POPUP NOTIFICATION */}
      {popupMessage && (
        <div className="bg-slate-900 text-white border-2 border-emerald-500 p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-bounce">
          <p className="text-xs sm:text-sm font-bold leading-relaxed">{popupMessage}</p>
          <button 
            onClick={() => setPopupMessage(null)}
            className="ml-3 text-slate-400 hover:text-white font-bold text-base"
          >
            ✕
          </button>
        </div>
      )}

      {/* 🚨 B. ACTIVE RED ALERT BANNER (Active වී තිබෙන විට පමණක් පෙන්නුම් කරයි) */}
      {activeAlert && (
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-4 sm:p-5 rounded-3xl shadow-[0_0_40px_rgba(239,68,68,0.5)] border-2 border-red-400">
          
          <div className="flex items-center justify-between gap-2">
            <span className="bg-white text-red-700 font-black px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wider">
              🚨 {activeAlert.alertCode}
            </span>
            <span className="text-xs text-red-100 font-mono font-medium">
              🕒 {activeAlert.incidentTime}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black mt-2">
            {activeAlert.disasterTitleSi}
          </h3>

          <p className="text-xs sm:text-sm mt-1 opacity-90 leading-relaxed">
            {activeAlert.description}
          </p>

          <div className="mt-2 text-[11px] text-red-100 flex flex-wrap gap-x-4 gap-y-1">
            <span>📍 ස්ථානය: {activeAlert.locationName}</span>
            <span>👤 දැනුම්දුන්නේ: {activeAlert.reportedByName}</span>
          </div>

          {/* 💬 කමෙන්ට්ස් සහ යාවත්කාලීන කිරීම් (Live Updates inside banner) */}
          {activeAlert.comments && activeAlert.comments.length > 0 && (
            <div className="mt-3 bg-black/30 p-3 rounded-xl border border-white/10 space-y-1 max-h-32 overflow-y-auto">
              <span className="text-[11px] font-bold text-amber-300 block">💬 සජීවී යාවත්කාලීන කිරීම් (Live Updates):</span>
              {activeAlert.comments.map((c, i) => (
                <p key={i} className="text-xs text-slate-100">
                  <span className="font-semibold text-amber-200">{c.authorName}:</span> {c.text}
                </p>
              ))}
            </div>
          )}

          {/* 🎛️ C. දැනුම්දීම පළ කළ කෙනාට (REPORTER) පමණක් පෙනෙන OPTIONS 3 */}
          {isReporter && (
            <div className="mt-4 pt-3 border-t border-white/20 space-y-2">
              <span className="text-[11px] font-bold text-red-100 block">
                🛠️ ඔබ පළ කළ දැනුම්දීම සඳහා පියවරක් ගන්න:
              </span>

              <div className="flex flex-wrap gap-2">
                {/* Option 1: විසඳුනා */}
                <button
                  type="button"
                  onClick={handleResolve}
                  className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  ✅ ආපදාව විසඳුනා
                </button>

                {/* Option 2: ඉවත් කරන්න */}
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  🗑️ අනතුර ඉවත් කරන්න
                </button>

                {/* Option 3: තව අදහසක් දක්වන්න */}
                <button
                  type="button"
                  onClick={() => setShowUpdateBox(!showUpdateBox)}
                  className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  💬 තව අදහසක් දක්වන්න
                </button>
              </div>

              {/* Option 3 Input Box */}
              {showUpdateBox && (
                <form onSubmit={handleSendUpdate} className="pt-2 flex gap-2">
                  <input
                    type="text"
                    value={updateText}
                    onChange={(e) => setUpdateText(e.target.value)}
                    placeholder="අලුත් තොරතුර සටහන් කරන්න..."
                    className="flex-1 bg-white text-slate-900 font-medium text-xs px-3 py-2 rounded-xl border border-red-300 focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-white hover:bg-slate-100 text-red-700 font-black text-xs px-3 py-2 rounded-xl cursor-pointer"
                  >
                    යවන්න
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { 
  subscribeToSystemSettings, 
  updateSystemSettings, 
  SystemSettings, 
  DEFAULT_SETTINGS 
} from '../utils/systemSettingsManager';
import { QrCode, CheckCircle2, XCircle, BellRing, RefreshCw } from 'lucide-react';

interface Props {
  adminUid: string;
}

export const AdminSystemSettingsToggle: React.FC<Props> = ({ adminUid }) => {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToSystemSettings((newSettings) => {
      setSettings(newSettings);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggle = async (field: keyof SystemSettings, currentValue: boolean) => {
    try {
      setSavingField(field);
      await updateSystemSettings({ [field]: !currentValue }, adminUid);
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      alert('සැකසුම් යාවත්කාලීන කිරීම අසාර්ථක විය.');
    } finally {
      setSavingField(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-center gap-2 text-gray-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>පද්ධති සැකසුම් පූරණය වෙමින් පවතී...</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            පද්ධති පාලන සැකසුම් (System Controls)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            යෙදුමේ විශේෂාංග පරිපාලක (Admin) මඟින් සක්‍රිය හෝ අක්‍රිය කිරීම
          </p>
        </div>
        {settings.updatedAt && (
          <span className="text-[11px] text-gray-400">
            අවසන් වෙනස් කිරීම: {new Date(settings.updatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* QR PAY TOGGLE */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 mt-0.5">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <span>QR Pay සේවාව</span>
                {settings.enableQrPay ? (
                  <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> සක්‍රියයි
                  </span>
                ) : (
                  <span className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> අක්‍රියයි
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                මෙය අක්‍රිය කළ විට සාමාන්‍ය පරිශීලකයන්ට Header හෝ Dashboard තුළ QR Pay බොත්තම දිස් නොවේ.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={savingField === 'enableQrPay'}
            onClick={() => handleToggle('enableQrPay', settings.enableQrPay)}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.enableQrPay ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            aria-label="Toggle QR Pay"
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.enableQrPay ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* DISASTER SIRENS TOGGLE */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 mt-0.5">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <span>හදිසි ආපදා සයිරන් නාද (Disaster Sirens)</span>
                {settings.enableDisasterSirens ? (
                  <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> සක්‍රියයි
                  </span>
                ) : (
                  <span className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> නිහඬයි
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                රතු එළිය නිවේදන නිකුත් වන විට සයිරන් නාදය නාද වීම පාලනය කරයි.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={savingField === 'enableDisasterSirens'}
            onClick={() => handleToggle('enableDisasterSirens', settings.enableDisasterSirens)}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.enableDisasterSirens ? 'bg-red-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            aria-label="Toggle Sirens"
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.enableDisasterSirens ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
export default AdminSystemSettingsToggle;

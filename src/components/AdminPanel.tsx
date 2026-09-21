import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  ZoomOut, 
  ZoomIn, 
  RotateCcw, 
  RotateCw, 
  AlertTriangle, 
  Trash2, 
  Coins, 
  PhoneCall, 
  BookOpen 
} from 'lucide-react';

// දෝෂය නිවැරදි කර සඟල වරහන් {} සහිතව Import කර ඇති ආකාරය 👇
import { AdminCreditManagement } from './AdminCreditManagement';
import { AdminEmergencyDirectoryManagement } from './AdminEmergencyDirectoryManagement';
import { AdminSearchDictionaryManager } from './AdminSearchDictionaryManager';
import { AdminRedAlertManagement } from './AdminRedAlertManagement';

// අදාළ දත්ත සඳහා Interfaces
interface User {
  id: string;
  name: string;
  // අවශ්‍ය අනෙකුත් දත්ත...
}

interface PhotoInspectorState {
  activeType: 'nicFront' | 'nicBack' | 'face';
  nicFrontPhotoUrl: string;
  nicBackPhotoUrl: string;
  facePhotoUrl?: string;
  zoom: number;
  rotation: number;
}

interface ScanResult {
  riskLevel: 'high' | 'medium' | 'low';
  riskScore: number;
  analysisSummarySi: string;
}

interface AdminDashboardProps {
  users: User[];
  redAlerts: any[];
  onUpdateUser: (user: any) => void;
  onRefreshRedAlerts: () => void;
  onViewRedAlertDetail: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  redAlerts,
  onUpdateUser,
  onRefreshRedAlerts,
  onViewRedAlertDetail
}) => {
  // State කළමනාකරණය
  const [activeTab, setActiveTab] = useState<string>('users');
  const [photoInspector, setPhotoInspector] = useState<PhotoInspectorState | null>(null);
  const [inspectorScanResult, setInspectorScanResult] = useState<ScanResult | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // ගිණුම මකා දැමීම තහවුරු කිරීමේ ෆන්ක්ෂන් එක
  const handleConfirmDelete = () => {
    if (userToDelete) {
      console.log('පරිශීලකයා මකා දමන්න:', userToDelete.name);
      // API call එක මෙතැනින් ඇතුළත් කරන්න (උදා: deleteUser(userToDelete.id))
      setUserToDelete(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 bg-slate-50 min-h-screen">
      
      {/* ප්‍රධාන අන්තර්ගතය */}
      <div className="mb-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-black text-slate-800 mb-4">පරිපාලක පුවරුව (Admin Dashboard)</h2>
        <p className="text-sm text-slate-500 font-semibold mb-6">
          පද්ධතියේ පරිශීලකයින්, ආරක්ෂක දැනුම්දීම් සහ අනෙකුත් සැකසුම් කළමනාකරණය කරන්න.
        </p>
      </div>

      {/* ඡායාරූප පරීක්ෂක (Photo Inspector Modal) */}
      {photoInspector && (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex flex-col p-4 md:p-8 backdrop-blur-sm">
          <div className="max-w-5xl w-full mx-auto flex flex-col h-full bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 p-4 md:p-6 animate-scaleUp">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div className="flex bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPhotoInspector({ ...photoInspector, activeType: 'nicFront' })}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    photoInspector.activeType === 'nicFront' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  NIC Front
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoInspector({ ...photoInspector, activeType: 'nicBack' })}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    photoInspector.activeType === 'nicBack' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  NIC Back
                </button>
                {photoInspector.facePhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoInspector({ ...photoInspector, activeType: 'face' })}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      photoInspector.activeType === 'face' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    Face / Profile
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhotoInspector(null);
                  setInspectorScanResult(null);
                }}
                className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer shadow-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Scan Mini-Banner (if available) */}
            {inspectorScanResult && (
              <div className={`mt-3 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between border ${
                inspectorScanResult.riskLevel === 'high' ? 'bg-rose-950/50 border-rose-500/50 text-rose-300' :
                inspectorScanResult.riskLevel === 'medium' ? 'bg-amber-950/50 border-amber-500/50 text-amber-300' :
                'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
              }`}>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  <span>AI Scan Result: {inspectorScanResult.riskLevel.toUpperCase()} RISK (Score: {inspectorScanResult.riskScore}/100)</span>
                </div>
                <span className="opacity-90">{inspectorScanResult.analysisSummarySi}</span>
              </div>
            )}

            {/* Viewer Area */}
            <div className="flex-1 relative overflow-hidden bg-slate-950/50 rounded-2xl border border-slate-700 my-4 min-h-[50vh] flex items-center justify-center">
              <img
                src={
                  photoInspector.activeType === 'nicFront' ? photoInspector.nicFrontPhotoUrl :
                  photoInspector.activeType === 'nicBack' ? photoInspector.nicBackPhotoUrl :
                  photoInspector.facePhotoUrl
                }
                alt="Inspection View"
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${photoInspector.zoom}) rotate(${photoInspector.rotation}deg)`
                }}
              />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap justify-center gap-3 bg-slate-900 pt-2 border-t border-white/10">
              <button 
                type="button"
                onClick={() => setPhotoInspector({ ...photoInspector, zoom: Math.max(0.5, photoInspector.zoom - 0.2) })} 
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" /> Zoom Out
              </button>
              <button 
                type="button"
                onClick={() => setPhotoInspector({ ...photoInspector, zoom: Math.min(4, photoInspector.zoom + 0.2) })} 
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" /> Zoom In
              </button>
              <button 
                type="button"
                onClick={() => setPhotoInspector({ ...photoInspector, rotation: photoInspector.rotation - 90 })} 
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Rotate Left
              </button>
              <button 
                type="button"
                onClick={() => setPhotoInspector({ ...photoInspector, rotation: photoInspector.rotation + 90 })} 
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4" /> Rotate Right
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Deletion Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border-2 border-rose-500 shadow-2xl p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600 border-b border-slate-200 pb-3">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-lg font-black">ගිණුම මකා දැමීම (Delete User)</h3>
            </div>
            
            <div className="text-slate-700 text-sm space-y-3 font-semibold leading-relaxed">
              <p>
                ඔබ <strong className="text-slate-900">{userToDelete.name}</strong> ගේ ගිණුම සම්පූර්ණයෙන්ම මකා දැමීමට සැරසේ.
              </p>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-rose-900 text-xs">
                ⚠️ <strong>අවවාදයයි:</strong> මෙම ක්‍රියාව ආපසු හැරවිය නොහැක. පරිශීලකයාගේ සියලු දත්ත, පෝස්ට් සහ ඉතිහාසය පද්ධතියෙන් ඉවත් වනු ඇත.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs cursor-pointer transition-colors"
              >
                අවලංගු කරන්න (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-colors cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>ඔව්, මකා දමන්න</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remaining Admin Modules Rendering based on activeTab */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        {activeTab === 'credits' && (
          <AdminCreditManagement users={users} onUpdateUser={onUpdateUser} />
        )}

        {activeTab === 'emergency_directory' && (
          <AdminEmergencyDirectoryManagement />
        )}

        {activeTab === 'search_dictionary' && (
          <AdminSearchDictionaryManager />
        )}

        {activeTab === 'red_alerts' && (
          <AdminRedAlertManagement 
            alerts={redAlerts} 
            onRefresh={onRefreshRedAlerts} 
            onViewDetail={onViewRedAlertDetail} 
          />
        )}
      </div>

      {/* More Tabs Navigation Dropdown (For space-saving on mobile) */}
      <div className="mt-8 pt-4 border-t border-slate-200">
        <h4 className="text-sm font-black text-slate-500 mb-3 uppercase tracking-wider">වෙනත් පරිපාලන මෙවලම් (Other Admin Tools)</h4>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveTab('credits')} className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'credits' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            <Coins className="w-4 h-4" /> Credits
          </button>
          <button onClick={() => setActiveTab('emergency_directory')} className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'emergency_directory' ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            <PhoneCall className="w-4 h-4" /> හදිසි අංක (Emergency)
          </button>
          <button onClick={() => setActiveTab('red_alerts')} className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'red_alerts' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            <AlertTriangle className="w-4 h-4" /> Red Alerts
          </button>
          <button onClick={() => setActiveTab('search_dictionary')} className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'search_dictionary' ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            <BookOpen className="w-4 h-4" /> Search Dictionary
          </button>
        </div>
      </div>
      
    </div>
  );
};

export default AdminDashboard;

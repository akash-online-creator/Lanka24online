import React, { useState, useEffect } from "react";
import { database, ref, onValue, push, set, remove, update } from "../firebase";
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Search, Clock, Users, Wrench, Shield, MessageSquare, Menu, X, ArrowLeft, RefreshCw, AlertTriangle, Play, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminUsers from "./AdminUsers";
import AdminChat from "./AdminChat";
import { useUserMode } from "../context/UserModeContext";

interface Service {
  id: string;
  category: string;
  district: string;
  town: string;
  name: string;
  phone: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

const CATEGORIES = [
  "ගෙදර දොරේ අලුත්වැඩියා", "විදුලි සහ ජල නල", "වාහන අලුත්වැඩියා",
  "ඉලෙක්ට්‍රොනික් උපාංග", "ප්‍රවාහන සේවා", "අධ්‍යාපනික සේවා",
  "සෞඛ්‍ය සහ අලංකාරය", "උත්සව සහ ඡායාරූපකරණය", "වෙනත් සේවා"
];

const DISTRICTS = [
  "කොළඹ", "ගම්පහ", "කළුතර", "මහනුවර", "මාතලේ", "නුවරඑළිය",
  "ගාල්ල", "මාතර", "හම්බන්තොට", "යාපනය", "කිලිනොච්චිය", "මන්නාරම",
  "වවුනියාව", "මුලතිව්", "මඩකලපුව", "අම්පාර", "ත්‍රිකුණාමලය", "කුරුණෑගල",
  "පුත්තලම", "අනුරාධපුරය", "පොළොන්නරුව", "බදුල්ල", "බණ්ඩාරවෙල", "රත්නපුරය", "කෑගල්ල"
];

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isUserMode, toggleUserMode } = useUserMode();
  
  const [activeTab, setActiveTab] = useState<"services" | "users" | "chat">("services");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: CATEGORIES[0],
    district: DISTRICTS[0],
    town: "",
    name: "",
    phone: "",
    description: "",
    status: "approved" as "pending" | "approved" | "rejected"
  });

  // Load services from Firebase
  useEffect(() => {
    const servicesRef = ref(database, "services");
    const unsubscribe = onValue(servicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: Service[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setServices(list.reverse());
      } else {
        setServices([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      category: CATEGORIES[0],
      district: DISTRICTS[0],
      town: "",
      name: "",
      phone: "",
      description: "",
      status: "approved"
    });
    setShowForm(true);
  };

  const handleOpenEdit = (service: Service) => {
    setEditingId(service.id);
    setFormData({
      category: service.category,
      district: service.district,
      town: service.town,
      name: service.name,
      phone: service.phone,
      description: service.description,
      status: service.status
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.town) {
      alert("කරුණාකර අවශ්‍ය සියලුම තොරතුරු ඇතුළත් කරන්න.");
      return;
    }

    try {
      if (editingId) {
        // Update
        await update(ref(database, `services/${editingId}`), formData);
      } else {
        // Create
        const newRef = push(ref(database, "services"));
        await set(newRef, {
          ...formData,
          createdAt: Date.now()
        });
      }
      setShowForm(false);
    } catch (err) {
      console.error("Error saving service:", err);
      alert("දත්ත සුරැකීමේදී දෝෂයක් සිදු විය.");
    }
  };

  const handleStatusChange = async (id: string, status: "approved" | "rejected") => {
    try {
      await update(ref(database, `services/${id}`), { status });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("මෙම සේවාව ඉවත් කිරීමට ඔබට විශ්වාසද?")) {
      try {
        await remove(ref(database, `services/${id}`));
      } catch (err) {
        console.error("Error deleting service:", err);
      }
    }
  };

  // Filter logic
  const filteredServices = services.filter((s) => {
    const matchesStatus = filterStatus === "all" || s.status === filterStatus;
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.town.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery);

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const pendingCount = services.filter(s => s.status === "pending").length;
  const approvedCount = services.filter(s => s.status === "approved").length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar / Navigation */}
      <aside className="bg-slate-900 text-slate-300 w-full md:w-64 flex-shrink-0">
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-amber-500" />
            <span className="font-bold text-lg text-white">පරිපාලක පාලකය</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        <nav className={`p-4 space-y-2 ${mobileMenuOpen ? "block" : "hidden md:block"}`}>
          <button
            onClick={() => { setActiveTab("services"); setMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "services" ? "bg-amber-500 text-slate-950 font-bold" : "hover:bg-slate-800 text-slate-300"
            }`}
          >
            <Wrench className="h-5 w-5" />
            <span>සේවා කළමනාකරණය</span>
            {pendingCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab("users"); setMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "users" ? "bg-amber-500 text-slate-950 font-bold" : "hover:bg-slate-800 text-slate-300"
            }`}
          >
            <Users className="h-5 w-5" />
            <span>පරිශීලකයින්</span>
          </button>

          <button
            onClick={() => { setActiveTab("chat"); setMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "chat" ? "bg-amber-500 text-slate-950 font-bold" : "hover:bg-slate-800 text-slate-300"
            }`}
          >
            <MessageSquare className="h-5 w-5" />
            <span>සහය චැට් එක</span>
          </button>

          {/* User Mode Toggle Button */}
          <div className="pt-4 border-t border-slate-800 mt-4">
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700">
              <span className="text-xs font-medium text-slate-300">
                {isUserMode ? "පරිශීලක ප්‍රකාරය" : "පරිපාලක ප්‍රකාරය"}
              </span>
              <button
                onClick={toggleUserMode}
                type="button"
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isUserMode ? "bg-emerald-500" : "bg-slate-600"
                }`}
                role="switch"
                aria-checked={isUserMode}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isUserMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>ප්‍රධාන පිටුවට</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "chat" && <AdminChat />}

        {activeTab === "services" && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header & User Mode Switch */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">සහය සේවා - පරිපාලක පාලක පුවරුව</h1>
                <p className="text-sm text-slate-500 mt-1">පද්ධති සහ ප්‍රජා දැන්වීම් කළමනාකරණය</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Mobile / Secondary User Mode Switcher Button */}
                <button
                  onClick={toggleUserMode}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isUserMode
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 shadow-md"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20 shadow-md"
                  }`}
                >
                  <span>{isUserMode ? "👁️ පරිශීලක ප්‍රකාරය: සක්‍රීයයි" : "🔄 පරිශීලක ප්‍රකාරයට මාරු වන්න"}</span>
                </button>

                <button
                  onClick={handleOpenAdd}
                  className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  <Plus className="h-5 w-5" />
                  <span>අලුත් සේවාවක්</span>
                </button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                  <Wrench className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{services.length}</div>
                  <div className="text-xs text-slate-500">මුළු සේවාවන්</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
                  <div className="text-xs text-slate-500">තහවුරු කිරීමට ඇති</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
                  <div className="text-xs text-slate-500">තහවුරු කළ සේවාවන්</div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="නම, නගරය, හෝ දුරකථන අංකය සොයන්න..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                  >
                    <option value="all">සියලුම කාණ්ඩ</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                  >
                    <option value="all">සියලු තත්ත්වයන්</option>
                    <option value="pending">තහවුරු කිරීමට ඇති (Pending)</option>
                    <option value="approved">තහවුරු කළ (Approved)</option>
                    <option value="rejected">ප්‍රතික්ෂේපිත (Rejected)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Services List Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-500 flex items-center justify-center space-x-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>දත්ත පූරණය වෙමින් පවතී...</span>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  තොරතුරු කිසිවක් හමු වූයේ නැත.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="p-4">නම / විස්තරය</th>
                        <th className="p-4">කාණ්ඩය / ස්ථානය</th>
                        <th className="p-4">දුරකථන අංකය</th>
                        <th className="p-4">තත්ත්වය</th>
                        <th className="p-4 text-right">ක්‍රියාමාර්ග</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredServices.map((service) => (
                        <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{service.name}</div>
                            <div className="text-xs text-slate-500 line-clamp-1">{service.description}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-slate-800">{service.category}</div>
                            <div className="text-xs text-slate-500">{service.district} - {service.town}</div>
                          </td>
                          <td className="p-4 font-mono text-slate-700">{service.phone}</td>
                          <td className="p-4">
                            {service.status === "approved" && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                Approved
                              </span>
                            )}
                            {service.status === "pending" && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Pending
                              </span>
                            )}
                            {service.status === "rejected" && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Rejected
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            {service.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(service.id, "approved")}
                                  className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                                  title="Approve"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(service.id, "rejected")}
                                  className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => handleOpenEdit(service)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleDelete(service.id)}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Service Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-800">
                {editingId ? "සේවාව සංස්කරණය" : "නව සේවාවක් එකතු කිරීම"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">නම / ආයතනය</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="උදා: සුනිල් පෙරේරා"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">කාණ්ඩය</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-sm"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">දිස්ත්‍රික්කය</label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-sm"
                  >
                    {DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">නගරය</label>
                  <input
                    type="text"
                    required
                    value={formData.town}
                    onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    placeholder="උදා: මහරගම"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">දුරකථන අංකය</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    placeholder="07XXXXXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">විස්තරය</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="සේවාව පිළිබඳ කෙටි විස්තරයක්..."
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">තත්ත්වය (Status)</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-sm"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium text-sm"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm"
                >
                  සුරකින්න
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

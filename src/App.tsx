// @ts-nocheck
import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  query,
  onSnapshot,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import MaintenanceSettingsContent, {
  MaintenanceSettingsSidebar,
} from "./MaintenanceSettingsView";
import MobileApp from "./MobileApp";
import {
  Wrench,
  ClipboardCheck,
  Box,
  LogOut,
  ChevronLeft,
  Home,
  Settings,
  Users,
  Briefcase,
  MapPin,
  AlertTriangle,
  AlertCircle,
  Crown,
  UserCheck,
  History,
  LayoutDashboard,
  BarChart2,
  PanelLeft,
  UserPlus,
  UserCog,
  Trash2,
  X,
  Shield,
  Save,
  ChevronRight,
  Search,
  Lock,
} from "lucide-react";

import { MaintenanceModule } from "./MaintenanceApp";
import { DailyCheckModule } from "./DailyCheckApp";
import { ALL_PERMISSIONS } from "./permissions";
import {
  StockModule,
  StockSettingsSidebar,
  StockAnalyticsSidebar,
} from "./StockApp";
import SettingsPage from "./SettingsPage";

// เพิ่มก้อนนี้เข้าไปที่ต้นไฟล์ครับ
interface User {
  id?: string;
  username?: string;
  pass?: string;
  fullname?: string;
  role?: string;
  [key: string]: any; // อันนี้คือไม้ตาย: บอกว่าจะมีฟิลด์อะไรเพิ่มมาก็ได้ ไม่ว่ากัน
}

// --- ก๊อปไปวางตรงนี้เลยครับ ---
  const getBase64FromUrl = async (url: any) => {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result);
    });
  };

const APPS = {
  HOME: "home",
  MAINTENANCE: "maintenance",
  DAILY_CHECK: "daily_check",
  INVENTORY: "inventory",
  SETTINGS: "settings",
};

// --- CONFIRM MODAL (Global) ---
function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  currentUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  currentUser: any;
}) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (pass === currentUser.pass) {
      onConfirm();
      setPass("");
      setError("");
      onClose();
    } else {
      setError("รหัสผ่านไม่ถูกต้อง!");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-xs p-6 shadow-2xl animate-in fade-in zoom-in duration-200 text-gray-900">
        <h3 className="font-bold text-lg text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-400 block mb-1">
            ใส่รหัสผ่านเพื่อยืนยัน:
          </label>
          <input
            type="password"
            className="w-full border rounded p-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
            value={pass}
            onChange={(e) => {
              setPass(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            autoFocus
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              setPass("");
              setError("");
              onClose();
            }}
            className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded text-sm"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700 shadow-md"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

// --- USER PROFILE CARD ---
function UserProfileCard({ user, onLogout }: any) {
  return (
    <div className="absolute bottom-0 left-0 w-full bg-[#0B1120] border-t border-slate-800 p-4 z-50">
      <div className="bg-[#1E293B] rounded-xl p-3 border border-slate-700/50 shadow-xl flex items-center justify-between gap-2 group hover:border-slate-600 transition-all">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
            {user?.fullname?.charAt(0) || "U"}
          </div>
          <div className="flex-col hidden sm:flex min-w-0">
            <span className="text-sm font-bold text-white truncate max-w-[100px]">
              {user?.fullname || "User"}
            </span>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
              {user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-2 rounded-lg bg-black/20 text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
          title="ออกจากระบบ"
        >
          <LogOut size={18} />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
        FactoryOS v1.0
      </div>
    </div>
  );
}

function SubAppSidebar({
  currentApp,
  activeTab,
  onTabChange,
  onSettingsClick,
  onBack,
  counts,
  user,
  onToggle,
  isOpen,
}: any) {
  const maintenanceMenus = [
    {
      id: 1,
      label: "แจ้งซ่อม (Open)",
      icon: AlertCircle,
      count: counts?.open || 0,
      color: "bg-rose-500",
    },
    {
      id: 2,
      label: "กำลังซ่อม (WIP)",
      icon: Wrench,
      count: counts?.wip || 0,
      color: "bg-blue-500",
    },
    {
      id: 3,
      label: "ตรวจรับงาน (Verify)",
      icon: UserCheck,
      count: counts?.verify || 0,
      color: "bg-purple-500",
    },
    {
      id: 4,
      label: "อนุมัติ (Approve)",
      icon: Crown,
      count: counts?.approve || 0,
      color: "bg-orange-500",
    },
    {
      id: 5,
      label: "ประวัติ (History)",
      icon: History,
      count: 0,
      color: "bg-emerald-500",
    },
  ];
  const stockMenus = [
    {
      id: "overview",
      label: "Dashboard",
      icon: LayoutDashboard,
      color: "bg-blue-500",
    },
    {
      id: "inventory",
      label: "เบิก-คืน (Operation)",
      icon: Wrench,
      color: "bg-green-500",
    },
    {
      id: "management",
      label: "จัดการสต็อก",
      icon: Box,
      color: "bg-indigo-500",
    },
    {
      id: "analytics",
      label: "รายงาน & วิเคราะห์",
      icon: BarChart2,
      color: "bg-orange-500",
    },
    {
      id: "settings",
      label: "ตั้งค่าระบบ",
      icon: Settings,
      color: "bg-slate-500",
    },
  ];
  const dailyCheckMenus = [
    {
      id: "inspect",
      label: "ตรวจเช็ค (Inspect)",
      icon: ClipboardCheck,
      color: "bg-green-500",
    },
    { id: "data", label: "ข้อมูล (Data)", icon: History, color: "bg-blue-500" },
    {
      id: "dashboard",
      label: "รายงาน (Report)",
      icon: BarChart2,
      color: "bg-purple-500",
    },
    // ✅ ใส่ลงไปตรงๆ เลย ไม่ต้องมีเงื่อนไข Everyone เห็นปุ่มนี้หมด
    {
      id: "settings",
      label: "ตั้งค่า (Settings)",
      icon: Settings,
      color: "bg-slate-500",
    },
  ];
  const settingsMenus = [
    {
      id: "users",
      label: "จัดการผู้ใช้งาน (Users)",
      icon: Users,
      color: "bg-blue-500",
    },
  ];

  let displayMenus: any[] = [];
  let appTitle = "";
  let appColor = "";

  const APPS = {
    HOME: "home",
    MAINTENANCE: "maintenance",
    DAILY_CHECK: "daily_check",
    INVENTORY: "inventory",
    SETTINGS: "settings",
  };

  if (currentApp === "maintenance") {
    displayMenus = maintenanceMenus;
    appTitle = "MAINTENANCE";
    appColor = "bg-orange-500";
  } else if (currentApp === "inventory") {
    displayMenus = stockMenus;
    appTitle = "STOCK PARTS";
    appColor = "bg-blue-500";
  } else if (currentApp === "daily_check") {
    displayMenus = dailyCheckMenus;
    appTitle = "DAILY CHECK";
    appColor = "bg-green-500";
  } else if (currentApp === APPS.SETTINGS) {
    displayMenus = settingsMenus;
    appTitle = "SETTINGS";
    appColor = "bg-slate-500";
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#0F172A] text-white relative overflow-hidden shadow-2xl border-r border-slate-800 z-50">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>

      <div
        className={`shrink-0 z-10 relative transition-all ${
          isOpen ? "p-6" : "p-2 pt-4 flex flex-col items-center"
        }`}
      >
        {/* ✅ ปุ่ม Toggle: ฟิกซ์ตำแหน่ง absolute top-6 right-4 ตลอดเวลา (แนวแกน X,Y เท่ากันเป๊ะ) */}
        <button
          onClick={onToggle}
          className="absolute top-6 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer rounded-lg p-2 hover:bg-white/10 z-20"
          title={isOpen ? "ย่อเมนู" : "ขยายเมนู"}
        >
          <PanelLeft size={20} />
        </button>

        {isOpen && (
          <div className="animate-in fade-in duration-300">
            <button
              onClick={onBack}
              className="flex items-center gap-3 text-slate-400 hover:text-white transition-all group w-full mb-8 cursor-pointer pr-8" // pr-8 เพื่อหลบปุ่ม toggle
            >
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 group-hover:bg-blue-600 group-hover:border-blue-500 shadow-lg transition-all group-hover:scale-110">
                <ChevronLeft size={20} />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-blue-300 leading-none mb-0.5">
                  Back to
                </span>
                <span className="text-sm font-black tracking-wide text-slate-300 group-hover:text-white leading-none">
                  HOME
                </span>
              </div>
            </button>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${appColor} shadow-[0_0_8px_currentColor]`}
                ></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Current Application
                </span>
              </div>
              <h2 className="text-3xl font-black italic tracking-tighter text-white leading-none">
                {appTitle}
              </h2>
            </div>
            <div
              className={`h-1.5 w-16 bg-gradient-to-r from-slate-600 to-slate-400 mt-4 rounded-full opacity-50`}
            ></div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar z-10 pb-32 animate-in fade-in">
          {displayMenus.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full group relative flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 cursor-pointer border ${
                  isActive
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg translate-x-1"
                    : "bg-transparent border-transparent text-slate-400 hover:bg-[#1E293B]/50 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-lg transition-all duration-300 group-hover:scale-[1.2] ${
                      isActive
                        ? "bg-white/20"
                        : "bg-transparent group-hover:bg-black/20"
                    }`}
                  >
                    <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span
                    className={`text-sm ${
                      isActive ? "font-bold" : "font-medium"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {item.count > 0 && (
                  <div
                    className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white shadow-sm ${item.color}`}
                  >
                    {item.count}
                  </div>
                )}
              </button>
            );
          })}
          {currentApp === "maintenance" && (
            <button
              onClick={onSettingsClick}
              className="w-full group relative flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 cursor-pointer border border-transparent text-slate-400 hover:bg-[#1E293B]/50 hover:text-white mt-2"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-transparent group-hover:bg-black/20 transition-all duration-300 group-hover:scale-[1.2]">
                  <Settings size={18} strokeWidth={2} />
                </div>
                <span className="text-sm font-medium">
                  ตั้งค่าข้อมูล (Admin)
                </span>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// --- MAIN LAUNCHER SIDEBAR ---
function MainLauncherSidebar({ onSelectApp, user, onLogout }: any) {
  const apps = [
    {
      id: "daily_check",
      label: "Daily Check",
      icon: ClipboardCheck,
      color: "text-green-500",
      desc: "ตรวจเช็คเครื่องจักร",
    },
    {
      id: "maintenance",
      label: "Maintenance",
      icon: Wrench,
      color: "text-orange-500",
      desc: "แจ้งซ่อม/อนุมัติ",
    },
    {
      id: "inventory",
      label: "Stock Part",
      icon: Box,
      color: "text-blue-500",
      desc: "คลังอะไหล่",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      color: "text-gray-400",
      desc: "ตั้งค่าระบบ",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0F172A] text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none"></div>
      <div className="p-6 z-10">
        <div className="flex items-center gap-3 mb-2">
          <img
            src="/logo.png"
            alt="STANBEE Logo"
            className="w-10 h-10 object-contain block"
          />
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">
              <span className="text-[#82c91e]">STANBEE</span>
              <span className="text-[#5c8bd6]">OS</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">
              Control Center
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 py-2 space-y-2 overflow-y-auto custom-scrollbar z-10 pb-32">
        {apps.map((app) => (
          <button
            key={app.id}
            onClick={() => onSelectApp(app.id)}
            className="w-[95%] mx-auto block text-left px-3 py-2.5 rounded-xl bg-[#1E293B]/50 hover:bg-[#1E293B] border border-transparent hover:border-slate-600 transition-all group hover:shadow-lg relative overflow-hidden"
          >
            <div className="flex items-center gap-3 relative z-10">
              <div
                className={`p-2 rounded-lg bg-slate-900 group-hover:bg-white transition-colors shadow-inner`}
              >
                <app.icon
                  size={22}
                  className={`${app.color} transition-transform duration-300 group-hover:scale-[1.2]`}
                />
              </div>
              <div>
                <span className="block font-bold text-lg text-slate-200 group-hover:text-white transition-colors leading-tight">
                  {app.label}
                </span>
                <span className="text-xs text-slate-500 group-hover:text-slate-400">
                  {app.desc}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// WELCOME DASHBOARD (Placeholder)
// ==========================================
function WelcomeDashboard({ user }: any) {
  return (
    <div className="h-full w-full bg-[#0F172A] flex flex-col items-center justify-center text-slate-500 animate-in fade-in">
      <div className="p-8 rounded-3xl bg-[#1E293B]/50 border-2 border-dashed border-slate-700 flex flex-col items-center text-center max-w-md">
        {/* ไอคอนสื่อถึงการก่อสร้าง/พัฒนา */}
        <Wrench size={64} className="mb-6 text-slate-600 opacity-50" />

        <h1 className="text-3xl font-bold text-slate-300 mb-2">
          พื้นที่รอพัฒนา
        </h1>
        <p className="text-slate-500 text-sm">
          Coming Soon / Under Construction
        </p>

        <div className="mt-6 px-4 py-2 bg-slate-800 rounded-lg text-xs font-mono text-slate-400">
          Developer: {user?.username || "Admin"}
        </div>
      </div>
    </div>
  );
}

// --- LOGIN VIEW ---
function LoginView({ onLogin }: any) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const q = query(
        collection(db, "User"),
        where("username", "==", u),
        where("pass", "==", p)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        onLogin(userData);
      } else {
        alert("Username หรือ Password ไม่ถูกต้อง");
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#0F1115] flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-sm bg-[#1F1F23] p-8 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        <div className="flex justify-center mb-4">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-20 w-auto object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">FACTORY OS</h1>
        <p className="text-xs text-center text-gray-500 mb-8 uppercase tracking-widest">
          Smart Factory Management for Better Decisions
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Username"
              value={u}
              onChange={(e) => setU(e.target.value)}
              className="w-full bg-[#0F1115] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors text-sm"
              autoFocus
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={p}
              onChange={(e) => setP(e.target.value)}
              className="w-full bg-[#0F1115] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/20 transition-all uppercase tracking-widest text-sm flex justify-center items-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">Checking...</span>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT: Confirm Password Modal (ตัวช่วยถามรหัส)
// ==========================================
function ConfirmPasswordGuard({
  isOpen,
  onClose,
  onConfirm,
  userPass,
  message = "ยืนยันรหัสผ่าน",
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userPass: string;
  message?: string;
}) {
  const [inputPass, setInputPass] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputPass("");
      setError(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (inputPass === userPass) {
      onConfirm();
      onClose();
    } else {
      setError(true);
      setInputPass("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1F1F23] w-full max-w-xs p-6 rounded-2xl border border-gray-700 shadow-2xl transform transition-all scale-100">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={24} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">{message}</h3>
          <p className="text-xs text-gray-400 mb-4">
            กรุณากรอกรหัสผ่านเพื่อยืนยันสิทธิ์
          </p>
        </div>

        <input
          type="password"
          autoFocus
          value={inputPass}
          onChange={(e) => {
            setInputPass(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          className={`w-full bg-black border ${
            error ? "border-red-500" : "border-gray-700 focus:border-blue-500"
          } rounded-xl px-4 py-3 text-center text-white outline-none transition-all mb-4`}
          placeholder="Password"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-bold text-xs transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 font-bold text-xs shadow-lg shadow-blue-900/20 transition-all"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MODAL: จัดการรายชื่อผู้ใช้ (หน้ารวม) ---
function ManageUsersModal({
  onClose,
  userPass,
}: {
  onClose: () => void;
  userPass: string;
}) {
  const [users, setUsers] = useState<any[]>([]);
  // Input สำหรับเพิ่ม User ใหม่
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [fullname, setFullname] = useState("");

  // State สำหรับ Modal ย่อย
  const [editingUser, setEditingUser] = useState<User | null>(null); // เปิดหน้า Edit Permission
  const [pendingDeleteId, setPendingDeleteId] = useState(""); // รอ Confirm ลบ
  const [showGuard, setShowGuard] = useState(false); // Modal รหัสผ่าน

  // โหลดรายชื่อผู้ใช้
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "User"), (s) => {
      setUsers(
        s.docs
          .map((d) => ({ id: d.id, ...d.data() } as User))
          .sort((a, b) => {
            // เอา Bank ไว้บนสุด
            if (a.username === "Bank") return -1;
            if (b.username === "Bank") return 1;
            return (a.username || "").localeCompare(b.username || "");
          })
      );
    });
    return () => unsub();
  }, []);

  // เพิ่มผู้ใช้ใหม่ (Role เริ่มต้นเป็นว่างๆ หรือ User ธรรมดา ยังไม่มีสิทธิ์)
  const handleAddUser = async () => {
    if (!u || !p || !fullname) return alert("กรุณากรอกข้อมูลให้ครบ");

    // เช็คซ้ำ
    if (
      users.some(
        (existing) => existing.username.toLowerCase() === u.toLowerCase()
      )
    ) {
      return alert("Username นี้มีอยู่แล้ว");
    }

    try {
      await addDoc(collection(db, "User"), {
        username: u,
        pass: p,
        fullname,
        role: "User", // เก็บไว้แค่ Display
        allowedActions: [], // เริ่มต้นไม่มีสิทธิ์
        created_at: serverTimestamp(),
      });
      setU("");
      setP("");
      setFullname("");
      alert("✅ เพิ่มผู้ใช้งานแล้ว (กรุณากดที่รายชื่อเพื่อกำหนดสิทธิ์)");
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  // ลบผู้ใช้
  const confirmDelete = async () => {
    if (pendingDeleteId) {
      await deleteDoc(doc(db, "User", pendingDeleteId));
      setPendingDeleteId("");
      setShowGuard(false); // ปิด Modal รหัส
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      {/* Container หลัก */}
      <div className="bg-[#1F1F23] w-full max-w-4xl rounded-2xl shadow-xl flex flex-col border border-gray-700 text-white h-[85vh] overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700 bg-[#16181C]">
          <h3 className="text-xl font-bold flex gap-2 items-center text-white">
            <Users className="text-green-500" /> จัดการผู้ใช้งาน
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Column: Form เพิ่มผู้ใช้ */}
          <div className="w-[300px] bg-[#16181C] border-r border-gray-700 p-5 flex flex-col shrink-0">
            <h4 className="text-sm font-bold text-blue-400 uppercase mb-4 flex items-center gap-2">
              <UserPlus size={16} /> สร้างบัญชีใหม่
            </h4>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                  ชื่อ - นามสกุล
                </label>
                <input
                  className="w-full bg-[#0F1115] border border-gray-600 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none"
                  placeholder="เช่น สมชาย ใจดี"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                  Username
                </label>
                <input
                  className="w-full bg-[#0F1115] border border-gray-600 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none"
                  placeholder="user1"
                  value={u}
                  onChange={(e) => setU(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                  Password
                </label>
                <input
                  className="w-full bg-[#0F1115] border border-gray-600 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none"
                  placeholder="****"
                  type="text"
                  value={p}
                  onChange={(e) => setP(e.target.value)}
                />
              </div>
              <button
                onClick={handleAddUser}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-blue-500 transition-all shadow-lg mt-2"
              >
                + เพิ่มผู้ใช้
              </button>
            </div>

            <div className="mt-auto p-4 bg-blue-900/20 border border-blue-500/20 rounded-xl text-xs text-blue-200 leading-relaxed">
              ℹ️ <b>คำแนะนำ:</b> <br />
              เมื่อสร้างผู้ใช้เสร็จแล้ว ให้คลิกที่รายชื่อทางขวาเพื่อเข้าไป{" "}
              <b>"กำหนดสิทธิ์ (Permission)"</b> ว่าทำอะไรได้บ้าง
            </div>
          </div>

          {/* Right Column: List รายชื่อ */}
          <div className="flex-1 p-5 overflow-hidden flex flex-col bg-[#1F1F23]">
            <div className="flex justify-between items-end mb-2 pb-2 border-b border-gray-700">
              <span className="text-xs font-bold text-gray-500 uppercase">
                รายชื่อ ({users.length})
              </span>
              <span className="text-[10px] text-gray-600">
                * คลิกที่แถวเพื่อแก้ไขสิทธิ์
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {users.map((us) => (
                <div
                  key={us.id}
                  onClick={() => setEditingUser(us)} // ✅ คลิกเพื่อเปิด Modal แก้ไขสิทธิ์
                  className="group flex justify-between items-center p-3 border border-gray-700/50 rounded-xl hover:bg-[#2C2E33] hover:border-blue-500/50 cursor-pointer transition-all bg-[#25262B] shadow-sm"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shadow-inner shrink-0 ${
                        us.username === "Bank"
                          ? "bg-gradient-to-br from-amber-400 to-orange-600 text-white"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {us.username === "Bank" ? (
                        <Crown size={18} />
                      ) : (
                        us.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white truncate flex items-center gap-2">
                        {us.fullname || us.username}
                        {us.username === "Bank" && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                            OWNER
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-mono truncate">
                        @{us.username}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* แสดงจำนวนสิทธิ์ที่มี */}
                    <div className="text-right">
                      <div className="text-[10px] text-gray-500 uppercase">
                        Permissions
                      </div>
                      <div className="text-xs font-bold text-blue-400">
                        {us.username === "Bank"
                          ? "Full Access"
                          : `${us.allowedActions?.length || 0} Actions`}
                      </div>
                    </div>

                    {/* ปุ่มลบ */}
                    {us.username !== "Bank" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // ไม่ให้ Trigger การคลิกแถว
                          setPendingDeleteId(us.id!);
                          setShowGuard(true);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-gray-600 hover:text-red-500 transition-colors"
                        title="ลบผู้ใช้"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    <ChevronRight
                      size={16}
                      className="text-gray-600 group-hover:text-blue-400 transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- Modal ย่อย --- */}
      {/* 1. Modal ยืนยันรหัสผ่านก่อนลบ */}
      <ConfirmPasswordModal
        isOpen={showGuard}
        onClose={() => setShowGuard(false)}
        onConfirm={confirmDelete}
        userPass={userPass}
        title="ยืนยันการลบ"
        message="การลบผู้ใช้งานไม่สามารถกู้คืนได้ กรุณายืนยันรหัสผ่าน"
      />

      {/* 2. Modal กำหนดสิทธิ์ (ตัวใหม่ที่สร้างไว้) */}
      {editingUser && (
        <EditPermissionsModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: Popup สร้างผู้ใช้ใหม่
// ==========================================
function CreateUserPopup({ onClose, existingUsers }: any) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [fullname, setFullname] = useState("");

  const handleCreate = async () => {
    if (!u || !p || !fullname) return alert("กรุณากรอกข้อมูลให้ครบ");
    if (
      existingUsers.some(
        (x: any) => x.username.toLowerCase() === u.toLowerCase()
      )
    )
      return alert("Username ซ้ำ!");

    await addDoc(collection(db, "users_maintenance"), {
      username: u,
      pass: p,
      fullname,
      role: "User",
      allowedActions: [],
      created_at: serverTimestamp(),
    });
    alert("✅ สร้างเรียบร้อย (ไปกำหนดสิทธิ์ต่อได้เลย)");
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-[#16181C] w-full max-w-md p-6 rounded-2xl border border-green-500/30 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <UserPlus className="text-green-500" /> สร้างผู้ใช้งานใหม่
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">
              Username
            </label>
            <input
              className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-green-500"
              autoFocus
              placeholder="เช่น User1"
              value={u}
              onChange={(e) => setU(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">
              Password
            </label>
            <input
              className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-green-500"
              placeholder="รหัสผ่าน"
              value={p}
              onChange={(e) => setP(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold">
              Fullname
            </label>
            <input
              className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-green-500"
              placeholder="ชื่อ-นามสกุล"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-700"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-500 shadow-lg"
            >
              ยืนยันสร้าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: Popup แก้ไขสิทธิ์ (ตัวใหญ่)
// ==========================================
function EditUserPermissionsPopup({ user, onClose, currentUserPass }: any) {
  const [selectedActions, setSelectedActions] = useState<string[]>(
    user.allowedActions || []
  );
  const [pass, setPass] = useState(""); // เอาไว้เปลี่ยนรหัส (ถ้าอยากเปลี่ยน)
  const [fullname, setFullname] = useState(user.fullname);
  const [showDeleteGuard, setShowDeleteGuard] = useState(false);

  // Group Permissions
  const groupedPerms = ALL_PERMISSIONS.reduce((acc: any, curr) => {
    if (!acc[curr.app]) acc[curr.app] = [];
    acc[curr.app].push(curr);
    return acc;
  }, {});

  const toggleAction = (id: string) => {
    setSelectedActions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    const payload: any = { allowedActions: selectedActions, fullname };
    if (pass.trim()) payload.pass = pass; // แก้รหัสถ้ากรอกมา
    await updateDoc(doc(db, "users_maintenance", user.id), payload);
    alert("✅ บันทึกข้อมูลเรียบร้อย");
    onClose();
  };

  const handleDelete = async () => {
    await deleteDoc(doc(db, "users_maintenance", user.id));
    setShowDeleteGuard(false);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-[#1F1F23] w-full max-w-4xl h-[90vh] rounded-2xl border border-gray-600 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 bg-[#16181C] flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="text-blue-500" /> กำหนดสิทธิ์:{" "}
              <span className="text-blue-400">{user.username}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Info Form */}
          <div className="w-1/3 bg-[#16181C] border-r border-gray-700 p-6 flex flex-col">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">
              ข้อมูลส่วนตัว
            </h4>
            <div className="space-y-4 flex-1">
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Username
                </label>
                <div className="text-white font-mono font-bold bg-gray-800 p-2 rounded border border-gray-700">
                  {user.username}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Fullname
                </label>
                <input
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  เปลี่ยนรหัสผ่าน (ว่าง=ไม่เปลี่ยน)
                </label>
                <input
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                  placeholder="••••••"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                />
              </div>
            </div>

            {user.username !== "Bank" && (
              <button
                onClick={() => setShowDeleteGuard(true)}
                className="w-full mt-6 py-3 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> ลบผู้ใช้นี้
              </button>
            )}
          </div>

          {/* RIGHT: Permission Matrix */}
          <div className="w-2/3 bg-[#1F1F23] p-6 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase">
                สิทธิ์การใช้งาน ({selectedActions.length})
              </h4>
              <button
                onClick={() => setSelectedActions([])}
                className="text-[10px] text-red-400 hover:underline"
              >
                ล้างทั้งหมด
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar border border-gray-700 rounded-xl bg-[#16181C] p-4">
              <div className="grid grid-cols-2 gap-6">
                {Object.keys(groupedPerms).map((appName) => (
                  <div key={appName}>
                    <h5 className="text-xs font-bold text-blue-400 uppercase mb-2 pb-1 border-b border-gray-700 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>{" "}
                      {appName}
                    </h5>
                    <div className="space-y-1">
                      {groupedPerms[appName].map((perm: any) => (
                        <label
                          key={perm.id}
                          className="flex items-start gap-2 cursor-pointer hover:bg-white/5 p-1.5 rounded transition-colors select-none"
                        >
                          <div
                            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                              selectedActions.includes(perm.id)
                                ? "bg-green-500 border-green-500"
                                : "border-gray-600 bg-gray-900"
                            }`}
                          >
                            {selectedActions.includes(perm.id) && (
                              <Check
                                size={12}
                                className="text-black font-bold"
                              />
                            )}
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selectedActions.includes(perm.id)}
                            onChange={() => toggleAction(perm.id)}
                          />
                          <span
                            className={`text-xs leading-tight ${
                              selectedActions.includes(perm.id)
                                ? "text-white"
                                : "text-gray-500"
                            }`}
                          >
                            {perm.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} /> บันทึกการแก้ไข
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Delete Guard */}
      <ConfirmPasswordGuard
        isOpen={showDeleteGuard}
        onClose={() => setShowDeleteGuard(false)}
        onConfirm={handleDelete}
        userPass={currentUserPass}
        message={`ยืนยันลบ ${user.username}?`}
      />
    </div>
  );
}

// ==========================================
// 4. SUB-COMPONENTS (Popup สร้าง / แก้ไข)
// ==========================================
function CreateUserModal({ onClose, existingUsers }: any) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [fullname, setFullname] = useState("");

  const handleCreate = async () => {
    if (!u || !p || !fullname) return alert("กรุณากรอกข้อมูลให้ครบ");
    if (u.toLowerCase() === "bank") return alert("ห้ามใช้ชื่อ Bank");
    if (
      existingUsers.some(
        (x: any) => x.username.toLowerCase() === u.toLowerCase()
      )
    )
      return alert("Username ซ้ำ!");

    try {
      await addDoc(collection(db, "User"), {
        username: u,
        pass: p,
        fullname,
        role: "User",
        allowedActions: [],
        created_at: new Date(),
      });
      alert("✅ สร้างผู้ใช้เรียบร้อย (กดที่ชื่อเพื่อกำหนดสิทธิ์ต่อ)");
      onClose();
    } catch (e) {
      alert("Error: " + e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-[#1F1F23] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-3 border-b border-gray-700 bg-[#18181b] flex justify-between items-center">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <UserPlus className="text-green-500" size={18} /> เพิ่มผู้ใช้งาน
          </h3>
          <button onClick={onClose}>
            <X size={18} className="text-gray-500 hover:text-white" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
              ชื่อ-นามสกุล
            </label>
            <input
              className="w-full bg-[#0F1115] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-green-500"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              placeholder="สมชาย ใจดี"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                Username
              </label>
              <input
                className="w-full bg-[#0F1115] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-green-500"
                value={u}
                onChange={(e) => setU(e.target.value)}
                placeholder="user1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                Password
              </label>
              <input
                className="w-full bg-[#0F1115] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-green-500"
                value={p}
                onChange={(e) => setP(e.target.value)}
                placeholder="****"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-lg mt-2 shadow-lg transition-all active:scale-95"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

function EditPermissionsModal({ user, onClose }: any) {
  const [selectedActions, setSelectedActions] = useState<string[]>(
    user.allowedActions || []
  );
  const [fullname, setFullname] = useState(user.fullname || "");
  const [pass, setPass] = useState("");

  const groupedPerms = ALL_PERMISSIONS.reduce((acc: any, curr) => {
    if (!acc[curr.app]) acc[curr.app] = [];
    acc[curr.app].push(curr);
    return acc;
  }, {});

  const toggleAction = (id: string) => {
    setSelectedActions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    const payload: any = { allowedActions: selectedActions, fullname };
    if (pass.trim()) payload.pass = pass;
    await updateDoc(doc(db, "User", user.id), payload);
    alert("✅ บันทึกสิทธิ์เรียบร้อย");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-[#1F1F23] w-full max-w-4xl h-[85vh] rounded-2xl border border-gray-600 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-gray-700 bg-[#16181C] flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="text-blue-500" /> กำหนดสิทธิ์:{" "}
            <span className="text-blue-400">{user.username}</span>
          </h3>
          <button onClick={onClose}>
            <X size={24} className="text-gray-500 hover:text-white" />
          </button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          {/* Left Info */}
          <div className="w-1/3 bg-[#16181C] border-r border-gray-700 p-6 flex flex-col space-y-4">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1 uppercase font-bold">
                Username
              </label>
              <div className="text-white font-mono font-bold bg-gray-800 p-2 rounded border border-gray-700">
                {user.username}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1 uppercase font-bold">
                Fullname
              </label>
              <input
                className="w-full bg-[#0F1115] border border-gray-700 p-2 rounded text-white text-sm outline-none focus:border-blue-500"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1 uppercase font-bold">
                เปลี่ยนรหัสผ่าน
              </label>
              <input
                className="w-full bg-[#0F1115] border border-gray-700 p-2 rounded text-white text-sm outline-none focus:border-blue-500"
                placeholder="••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </div>
          </div>
          {/* Right Permissions */}
          <div className="w-2/3 bg-[#1F1F23] p-6 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase">
                สิทธิ์การใช้งาน ({selectedActions.length})
              </h4>
              <button
                onClick={() => setSelectedActions([])}
                className="text-[10px] text-red-400 hover:underline"
              >
                ล้างทั้งหมด
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar border border-gray-700 rounded-xl bg-[#16181C] p-4">
              <div className="grid grid-cols-2 gap-6">
                {Object.keys(groupedPerms).map((appName) => (
                  <div key={appName}>
                    <h5 className="text-[10px] font-bold text-blue-400 uppercase mb-2 pb-1 border-b border-gray-700 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>{" "}
                      {appName}
                    </h5>
                    <div className="space-y-1">
                      {groupedPerms[appName].map((perm: any) => (
                        <label
                          key={perm.id}
                          className="flex items-start gap-2 cursor-pointer hover:bg-white/5 p-1.5 rounded transition-colors select-none"
                        >
                          <div
                            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                              selectedActions.includes(perm.id)
                                ? "bg-green-500 border-green-500"
                                : "border-gray-600 bg-gray-900"
                            }`}
                          >
                            {selectedActions.includes(perm.id) && (
                              <Check
                                size={12}
                                className="text-black font-bold"
                              />
                            )}
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selectedActions.includes(perm.id)}
                            onChange={() => toggleAction(perm.id)}
                          />
                          <span
                            className={`text-xs leading-tight ${
                              selectedActions.includes(perm.id)
                                ? "text-white"
                                : "text-gray-500"
                            }`}
                          >
                            {perm.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={handleSave}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} /> บันทึกการแก้ไข
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. SETTINGS SIDEBAR (Standardized)
// ==========================================
function SettingsSidebar({ activeTab, onTabChange, onBack, currentUser }: any) {
  const tabs = [
    { id: "users", label: "จัดการผู้ใช้งาน", icon: Users },
    { id: "departments", label: "จัดการแผนก", icon: Users },
    { id: "job_types", label: "ประเภทงาน", icon: Briefcase },
    { id: "sal01_areas", label: "พื้นที่ S01", icon: MapPin },
    { id: "sal02_areas", label: "พื้นที่ S02", icon: MapPin },
    { id: "cause_categories", label: "สาเหตุเสีย", icon: AlertTriangle },
    { id: "maintenance_results", label: "ผลการซ่อม", icon: ClipboardCheck },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0F172A] text-white relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>

      <div className="flex-none p-6 z-10">
        {/* ✅✅✅ ปุ่ม Back to APP (ใช้มาตรฐานเดียวกัน) ✅✅✅ */}
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-slate-400 hover:text-white transition-all group w-full mb-8 cursor-pointer"
        >
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 group-hover:bg-blue-600 group-hover:border-blue-500 shadow-lg transition-all group-hover:scale-110">
            <ChevronLeft size={20} />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-blue-300 leading-none mb-0.5">
              Back to
            </span>
            <span className="text-sm font-black tracking-wide text-slate-300 group-hover:text-white leading-none">
              APP
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
            Configuration
          </p>
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight leading-none">
          SETTINGS
        </h2>
        <div className="h-1.5 w-16 bg-gradient-to-r from-slate-600 to-slate-400 mt-4 rounded-full"></div>
      </div>

      <div className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto custom-scrollbar z-10 pb-32">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`w-full group relative flex items-center gap-4 px-4 py-2 rounded-2xl border transition-all duration-300 cursor-pointer ${
                isActive
                  ? "bg-blue-600 border-blue-500 text-white shadow-lg translate-x-1"
                  : "bg-[#1E293B]/50 border-transparent text-slate-400 hover:bg-[#1E293B] hover:border-slate-600 hover:text-white"
              }`}
            >
              <div
                className={`p-2 rounded-lg transition-transform duration-300 group-hover:scale-[1.2] ${
                  isActive
                    ? "bg-white/20"
                    : "bg-black/20 group-hover:bg-black/40"
                }`}
              >
                <t.icon size={18} className={isActive ? "animate-pulse" : ""} />
              </div>
              <span className="font-bold text-sm block flex-1 text-left">
                {t.label}
              </span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FactoryOS_SuperApp() {
  const [user, setUser] = useState<any>(null);
  const [currentApp, setCurrentApp] = useState(APPS.HOME);

  // Tabs State
  const [maintenanceTab, setMaintenanceTab] = useState(1);
  const [mtSettingsTab, setMtSettingsTab] = useState("departments");
  const [globalSettingsTab, setGlobalSettingsTab] = useState("users");

  const [stockTab, setStockTab] = useState("overview");
  const [stockSettingsTab, setStockSettingsTab] = useState("suppliers");
  const [stockAnalyticsTab, setStockAnalyticsTab] = useState("issued");
  const [dailyCheckTab, setDailyCheckTab] = useState("inspect");

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [mtCounts, setMtCounts] = useState({
    open: 0,
    wip: 0,
    verify: 0,
    approve: 0,
  });

  useEffect(() => {
    // ใส่ @ts-ignore เพื่อกันมันบ่นเรื่อง any
    // @ts-ignore
    if (typeof getBase64FromUrl === 'function') {
      getBase64FromUrl(LOGO_URL).then(setLogoBase64);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile && !isSidebarOpen) setIsSidebarOpen(true);
      if (mobile && isSidebarOpen) setIsSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarOpen]);

  const hasPermission = (action: string) => {
    if (!user) return false;
    if (user.username === "Bank" || user.role === "super_admin") return true;
    return user.allowedActions?.includes(action);
  };

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "maintenance_tickets"));
    const unsub = onSnapshot(q, (snap) => {
      const counts = { open: 0, wip: 0, verify: 0, approve: 0 };
      snap.docs.forEach((doc) => {
        const s = doc.data().status;
        if (s === "Open") counts.open++;
        else if (s === "In_Progress" || s === "Waiting_Part") counts.wip++;
        else if (s === "Wait_Verify") counts.verify++;
        else if (s === "Wait_Approve" || s === "Wait_Leader") counts.approve++;
      });
      setMtCounts(counts);
    });
    return () => unsub();
  }, [user]);

  const handleLogin = (userData: any) => {
    setUser(userData);
    setCurrentApp(APPS.HOME);
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    setIsSidebarOpen(!mobile);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentApp(APPS.HOME);
  };

  const handleSwitchApp = (appId: string) => {
    setCurrentApp(appId);
    if (appId === APPS.MAINTENANCE) setMaintenanceTab(1);
    if (appId === APPS.INVENTORY) setStockTab("overview");
    if (appId === APPS.DAILY_CHECK) setDailyCheckTab("inspect");
    if (appId === APPS.SETTINGS) setGlobalSettingsTab("users");
    if (appId === APPS.MAINTENANCE) setMtSettingsTab("departments");
    if (isMobile) setIsSidebarOpen(false);
  };

  const isMaintenanceSettings =
    currentApp === APPS.MAINTENANCE && maintenanceTab === 6;
  const isStockSettings =
    currentApp === APPS.INVENTORY && stockTab === "settings";
  const isStockAnalytics =
    currentApp === APPS.INVENTORY && stockTab === "analytics";
  const isSettingsMode = isMaintenanceSettings || isStockSettings;

  const AccessDeniedView = ({ title, permission }: any) => (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#0F172A] text-slate-400">
      <div className="flex flex-col items-center animate-in zoom-in-95">
        <Lock size={64} className="mb-4 opacity-20 text-slate-500" />
        <h2 className="text-xl font-bold text-slate-500 mb-2 uppercase tracking-widest">
          ACCESS DENIED
        </h2>
        <p className="text-xs text-slate-600">
          คุณไม่มีสิทธิ์เข้าถึงหน้าตั้งค่านี
        </p>
        <span className="text-[10px] text-slate-700 mt-2 font-mono">
          (Need '{permission}' permission)
        </span>
      </div>
    </div>
  );

  if (!user) return <LoginView onLogin={handleLogin} />;
  if (isMobile) return <MobileApp currentUser={user} onLogout={handleLogout} />;

  return (
    <div className="flex h-screen bg-[#0F172A] font-sans overflow-hidden text-slate-200 relative">
      <div
        className={`relative h-full bg-[#0F172A] shadow-2xl shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isSidebarOpen ? "w-[280px]" : "w-[80px]"
        }`}
      >
        <div className="w-full h-full flex flex-col border-r border-slate-800">
          <div
            className={`absolute inset-0 w-full h-full transition-all duration-500 ease-in-out transform ${
              currentApp !== APPS.HOME
                ? "-translate-x-full opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            <MainLauncherSidebar
              onSelectApp={handleSwitchApp}
              user={user}
              onLogout={handleLogout}
            />
          </div>
          <div
            className={`absolute inset-0 w-full h-full bg-[#0F172A] transition-all duration-500 ease-in-out transform ${
              (currentApp === APPS.MAINTENANCE ||
                currentApp === APPS.INVENTORY ||
                currentApp === APPS.DAILY_CHECK ||
                currentApp === APPS.SETTINGS) &&
              !isSettingsMode &&
              !isStockAnalytics
                ? "translate-x-0 opacity-100"
                : "-translate-x-full opacity-0"
            }`}
          >
            <SubAppSidebar
              currentApp={currentApp}
              onBack={() => setCurrentApp(APPS.HOME)}
              activeTab={
                currentApp === APPS.MAINTENANCE
                  ? maintenanceTab
                  : currentApp === APPS.INVENTORY
                  ? stockTab
                  : currentApp === APPS.DAILY_CHECK
                  ? dailyCheckTab
                  : globalSettingsTab
              }
              onTabChange={
                currentApp === APPS.MAINTENANCE
                  ? setMaintenanceTab
                  : currentApp === APPS.INVENTORY
                  ? setStockTab
                  : currentApp === APPS.DAILY_CHECK
                  ? setDailyCheckTab
                  : setGlobalSettingsTab
              }
              user={user}
              onSettingsClick={() => {
                if (currentApp === APPS.MAINTENANCE) setMaintenanceTab(6);
                if (currentApp === APPS.INVENTORY) setStockTab("settings");
              }}
              counts={mtCounts}
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          </div>
          <div
            className={`absolute inset-0 w-full h-full bg-[#0F172A] transition-all duration-500 ease-in-out transform ${
              isSettingsMode
                ? "translate-x-0 opacity-100"
                : "-translate-x-full opacity-0"
            }`}
          >
            {currentApp === APPS.MAINTENANCE ? (
              <MaintenanceSettingsSidebar
                activeTab={mtSettingsTab}
                onTabChange={setMtSettingsTab}
                onBack={() => setMaintenanceTab(1)}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                isOpen={isSidebarOpen}
              />
            ) : currentApp === APPS.INVENTORY ? (
              <StockSettingsSidebar
                activeTab={stockSettingsTab}
                onTabChange={setStockSettingsTab}
                onBack={() => setStockTab("overview")}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                isOpen={isSidebarOpen}
              />
            ) : null}
          </div>

          <div
            className={`absolute inset-0 w-full h-full bg-[#0F172A] transition-all duration-500 ease-in-out transform ${
              isStockAnalytics
                ? "translate-x-0 opacity-100"
                : "-translate-x-full opacity-0"
            }`}
          >
            <StockAnalyticsSidebar
              activeTab={stockAnalyticsTab}
              onTabChange={setStockAnalyticsTab}
              onBack={() => setStockTab("overview")}
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              isOpen={isSidebarOpen}
            />
          </div>

          {/* ✅✅✅ ซ่อน UserProfileCard เมื่อย่อ Sidebar (isSidebarOpen = false) ✅✅✅ */}
          {isSidebarOpen && (
            <UserProfileCard user={user} onLogout={handleLogout} />
          )}
        </div>
      </div>

      <main className="flex-1 flex flex-row min-w-0 bg-[#0F172A] transition-all duration-300 relative">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full relative">
          <div className="flex-1 overflow-hidden relative">
            {currentApp === APPS.HOME && (
              <WelcomeDashboard user={user} onSelect={handleSwitchApp} />
            )}

            {currentApp === APPS.MAINTENANCE && !isSettingsMode && (
              <MaintenanceModule
                currentUser={user}
                activeTab={maintenanceTab}
              />
            )}

            {currentApp === APPS.INVENTORY && (
              <StockModule
                currentUser={user}
                activeTab={stockTab}
                settingsTab={stockSettingsTab}
                analyticsTab={stockAnalyticsTab}
              />
            )}

            {currentApp === APPS.SETTINGS &&
              (hasPermission("main_manage_users") ? (
                <SettingsPage
                  onClose={() => setCurrentApp(APPS.HOME)}
                  currentUser={user}
                />
              ) : (
                <AccessDeniedView
                  title="User Management"
                  permission="main_manage_users"
                />
              ))}

            {isSettingsMode &&
              isMaintenanceSettings &&
              (hasPermission("mt_settings") ? (
                <MaintenanceSettingsContent
                  activeTab={mtSettingsTab}
                  currentUser={user}
                />
              ) : (
                <AccessDeniedView
                  title="Maintenance Settings"
                  permission="mt_settings"
                />
              ))}

            {isSettingsMode && isStockSettings && (
              <StockModule
                currentUser={user}
                activeTab="settings"
                settingsTab={stockSettingsTab}
              />
            )}

            {currentApp === APPS.DAILY_CHECK && (
              <DailyCheckModule currentUser={user} activeTab={dailyCheckTab} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import {
  Users,
  Briefcase,
  MapPin,
  AlertTriangle,
  ClipboardCheck,
  Settings,
  Plus,
  Trash2,
  Search,
  Hash,
  ChevronLeft,
  CheckSquare,
  Square,
  Menu,
  PanelLeft,
  Key,
  User,
  LayoutDashboard,
  Box,
  ChevronRight,
} from "lucide-react";
import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

// ==========================================
// 1. MaintenanceSettingsSidebar (Update: Remove Users Menu)
// ==========================================
export function MaintenanceSettingsSidebar({
  activeTab,
  onTabChange,
  onBack,
  onToggle,
  isOpen,
}: any) {
  const tabs = [
    // ❌ ตัด users ออกแล้ว
    { id: "departments", label: "แผนก (Departments)", icon: LayoutDashboard },
    { id: "job_types", label: "ประเภทงาน (Job Types)", icon: Briefcase },
    { id: "assets", label: "ทรัพย์สินทั่วไป (Assets)", icon: Box },
    { id: "sal01_areas", label: "พื้นที่ S01", icon: MapPin },
    { id: "sal02_areas", label: "พื้นที่ S02", icon: MapPin },
    { id: "cause_categories", label: "สาเหตุเสีย", icon: AlertTriangle },
    { id: "maintenance_results", label: "ผลการซ่อม", icon: ClipboardCheck },
  ];

  return (
    <div
      className={`flex flex-col h-full bg-[#0F172A] text-white relative overflow-hidden shadow-2xl transition-all duration-300 z-50 shrink-0 ${
        isOpen ? "w-72" : "w-[70px]"
      }`}
    >
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>

      <div
        className={`shrink-0 z-10 relative transition-all ${
          isOpen ? "p-6" : "p-2 pt-4 flex flex-col items-center"
        }`}
      >
        <button
          onClick={onToggle}
          className="absolute top-6 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer rounded-lg p-2 hover:bg-white/10 z-20"
        >
          <LayoutDashboard size={20} />
        </button>

        {isOpen && (
          <div className="animate-in fade-in duration-300">
            <button
              onClick={onBack}
              className="flex items-center gap-3 text-slate-400 hover:text-white transition-all group w-full mb-8 cursor-pointer pr-8"
            >
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 group-hover:bg-blue-600 group-hover:border-blue-500 shadow-lg transition-all group-hover:scale-110">
                <ChevronRight size={20} className="rotate-180" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-blue-300 leading-none mb-0.5">
                  Back to
                </span>
                <span className="text-sm font-black tracking-wide text-slate-300 group-hover:text-white leading-none">
                  DASHBOARD
                </span>
              </div>
            </button>

            <div>
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
          </div>
        )}
      </div>

      {isOpen && (
        <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar z-10 pb-32 animate-in fade-in">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`w-full group relative flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg translate-x-1"
                    : "bg-[#1E293B]/50 border-transparent text-slate-400 hover:bg-[#1E293B] hover:border-slate-600 hover:text-white"
                }`}
              >
                <div
                  className={`rounded-lg transition-transform duration-300 group-hover:scale-[1.2] ${
                    isActive
                      ? "bg-white/20 p-1.5"
                      : "bg-black/20 group-hover:bg-black/40 p-1.5"
                  }`}
                >
                  <t.icon
                    size={18}
                    className={isActive ? "animate-pulse" : ""}
                  />
                </div>
                <span className="font-bold text-sm block flex-1 text-left truncate">
                  {t.label}
                </span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]"></div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =========================================
// 2. CONTENT COMPONENT (แก้ Logic ถามรหัส)
// =========================================
interface MaintenanceSettingsContentProps {
  activeTab: string;
  currentUser: any; // ✅ รับ currentUser เข้ามาเพื่อเช็ครหัส
}

// ==========================================
// HELPER: ConfirmPasswordModal (วางไว้ก่อน MaintenanceSettingsContent)
// ==========================================
function ConfirmPasswordModal({
  isOpen,
  onClose,
  onConfirm,
  userPass,
  message,
}: any) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    // ตรวจสอบรหัสผ่าน
    if (pass === userPass) {
      onConfirm();
      setPass("");
      setError("");
      onClose();
    } else {
      setError("รหัสผ่านไม่ถูกต้อง!");
    }
  };

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* ✅ พื้นหลังสีเทาดำ #1F1F23 (Theme เดียวกับหน้าจัดการผู้ใช้) */}
      <div className="bg-[#1F1F23] w-full max-w-xs p-6 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="text-center mb-4">
          {/* ✅ ไอคอน Key สีเทา */}
          <div className="w-10 h-10 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Key size={20} />
          </div>
          <h3 className="text-base font-bold text-white">ยืนยันรหัสผ่าน</h3>
          <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* ✅ Input พื้นหลังดำเข้ม #0F1115 */}
        <input
          type="password"
          autoFocus
          value={pass}
          onChange={(e) => {
            setPass(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          className={`w-full bg-[#0F1115] border ${
            error ? "border-red-500" : "border-slate-700 focus:border-blue-500"
          } rounded-lg px-3 py-2 text-center text-white text-sm outline-none transition-all mb-4 placeholder-slate-600`}
          placeholder="Password"
        />

        <div className="flex gap-2">
          <button
            onClick={() => {
              setPass("");
              setError("");
              onClose();
            }}
            className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs transition-colors"
          >
            ยกเลิก
          </button>

          {/* ✅ ปุ่มยืนยันสีน้ำเงิน */}
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-bold text-xs shadow-lg shadow-blue-900/20 transition-colors"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. MaintenanceSettingsContent (Update: รองรับ assets)
// ==========================================
export default function MaintenanceSettingsContent({
  activeTab,
  currentUser,
}: MaintenanceSettingsContentProps) {
  // ... (State เดิมคงไว้)
  const [items, setItems] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCode, setNewItemCode] = useState("");
  const [requireNote, setRequireNote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [showGuard, setShowGuard] = useState(false);
  const [guardMessage, setGuardMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<
    () => Promise<void> | void
  >(() => {});

  // ✅ เพิ่ม assets เข้าไปใน array tabs
  const tabs = [
    { id: "departments", label: "จัดการแผนก", icon: Users },
    { id: "job_types", label: "ประเภทงาน", icon: Briefcase },
    { id: "assets", label: "ทรัพย์สินทั่วไป (Assets)", icon: Box }, // <-- เพิ่มบรรทัดนี้
    { id: "sal01_areas", label: "พื้นที่ S01", icon: MapPin },
    { id: "sal02_areas", label: "พื้นที่ S02", icon: MapPin },
    { id: "cause_categories", label: "สาเหตุเสีย", icon: AlertTriangle },
    { id: "maintenance_results", label: "ผลการซ่อม", icon: ClipboardCheck },
  ];

  const activeTabInfo = tabs.find((t) => t.id === activeTab);

  // ... (ส่วนที่เหลือเหมือนเดิมเป๊ะ ไม่ต้องแก้) ...
  // (Copy ส่วน Logic useEffect, handleAdd, handleDelete และ JSX เดิมมาใส่ต่อได้เลยครับ)
  // แต่เพื่อให้ชัวร์ ผมขอวางส่วน Logic ที่สำคัญให้ดูว่าไม่ต้องแก้เยอะ

  const tabsWithNoteConfig = [
    "maintenance_results",
    "job_types",
    "sal01_areas",
    "sal02_areas",
    "cause_categories",
  ];
  const showNoteOption = tabsWithNoteConfig.includes(activeTab);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "maintenance_settings", activeTab); // activeTab จะเป็น "assets" อัตโนมัติเมื่อเลือก
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setItems(docSnap.data().list || []);
        } else {
          setItems([]);
        }
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };
    if (activeTab) {
      fetchItems();
      setRequireNote(false);
    }
  }, [activeTab]);

  // ... (ฟังก์ชัน handleAdd, handleDelete และ JSX ส่วน Render เหมือนเดิมเป๊ะ) ...
  // ...

  const handleAdd = () => {
    if (!newItemName.trim()) return alert("กรุณากรอกข้อมูล");

    const action = async () => {
      let itemToAdd: any = { name: newItemName.trim() };

      if (activeTab === "departments") {
        itemToAdd.code = newItemCode || "MT";
      } else if (showNoteOption) {
        itemToAdd.require_note = requireNote;
      }
      // ถ้าเป็น assets ก็จะเก็บแค่ { name: ... } ซึ่งถูกต้องแล้ว

      try {
        const docRef = doc(db, "maintenance_settings", activeTab);
        // ใช้ arrayUnion เพื่อความปลอดภัย
        const { arrayUnion } = await import("firebase/firestore");
        await setDoc(docRef, { list: arrayUnion(itemToAdd) }, { merge: true });

        setItems([...items, itemToAdd]);
        setNewItemName("");
        setNewItemCode("");
        setRequireNote(false);
      } catch (e) {
        alert(e);
      }
    };

    setGuardMessage(`ยืนยันการเพิ่ม: "${newItemName}"`);
    setPendingAction(() => action);
    setShowGuard(true);
  };

  const handleDelete = (item: any) => {
    const action = async () => {
      try {
        const docRef = doc(db, "maintenance_settings", activeTab);
        const { arrayRemove } = await import("firebase/firestore");
        await updateDoc(docRef, { list: arrayRemove(item) });
        setItems(
          items.filter((i) =>
            typeof i === "string" ? i !== item : i.name !== item.name
          )
        );
      } catch (e) {
        alert(e);
      }
    };

    const nameDisplay = typeof item === "string" ? item : item.name;
    setGuardMessage(
      `ยืนยันการลบ: "${nameDisplay}"\n(การกระทำนี้ไม่สามารถกู้คืนได้)`
    );
    setPendingAction(() => action);
    setShowGuard(true);
  };

  const filteredItems = items.filter((item) => {
    const name = typeof item === "string" ? item : item.name;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex-1 h-full overflow-hidden relative flex flex-col bg-[#0F172A] animate-in fade-in duration-300">
      {/* ... (ส่วน JSX แสดงผลเหมือนเดิม) ... */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="px-6 pt-6 pb-2 z-10 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-900/20 flex items-center justify-center text-white border border-blue-400/20">
            {React.createElement(activeTabInfo?.icon || Settings, { size: 20 })}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">
              {activeTabInfo?.label}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold bg-slate-800/50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50 uppercase tracking-wider">
                Master Data
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-0 flex-1 flex flex-col overflow-hidden z-10 w-full max-w-[1600px]">
        <div className="bg-slate-900/60 backdrop-blur-md p-3 rounded-xl border border-slate-800/60 flex flex-wrap gap-3 items-center justify-between mb-4 shadow-xl shrink-0">
          <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto flex-1">
            <div className="flex-1 min-w-[250px]">
              <input
                className="w-full bg-[#0B1121] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none h-[34px] placeholder-slate-600"
                placeholder={`ชื่อ ${activeTabInfo?.label}...`}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>

            {activeTab === "departments" && (
              <div className="w-[100px] relative">
                {/* ... (Code ส่วน Code input) ... */}
                <input
                  className="w-full bg-[#0B1121] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-blue-400 font-mono font-bold uppercase focus:border-blue-500 outline-none h-[34px] placeholder-slate-700"
                  placeholder="CODE"
                  value={newItemCode}
                  onChange={(e) => setNewItemCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
            )}

            {showNoteOption && (
              <button
                onClick={() => setRequireNote(!requireNote)}
                className={`h-[34px] px-3 rounded-lg flex items-center gap-1.5 border transition-all ${
                  requireNote
                    ? "bg-orange-500/10 border-orange-500 text-orange-400"
                    : "bg-[#0B1121] border-slate-700 text-slate-500 hover:text-slate-300"
                }`}
                title="บังคับให้ใส่หมายเหตุเมื่อเลือกรายการนี้"
              >
                {requireNote ? <CheckSquare size={16} /> : <Square size={16} />}
                <span className="text-[10px] font-bold whitespace-nowrap">
                  รับหมายเหตุ
                </span>
              </button>
            )}

            <button
              onClick={handleAdd}
              className="h-[34px] px-4 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all hover:scale-105"
            >
              <Plus size={14} strokeWidth={3} />
              <span>ADD</span>
            </button>
          </div>

          <div className="w-full lg:w-[200px] border-l border-slate-800/50 pl-3 ml-2 hidden xl:block relative">
            <Search
              size={12}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              className="w-full bg-[#0B1121] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none h-[34px]"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="border border-slate-800/60 rounded-xl overflow-hidden bg-slate-900/60 backdrop-blur-md flex-1 flex flex-col shadow-2xl">
          <div className="overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto custom-scrollbar flex-1">
              <table className="w-full text-left text-xs text-slate-400 table-fixed">
                <thead className="bg-[#0B1121] text-slate-300 font-bold uppercase text-[15px] sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 w-[8%] text-center border-b border-slate-800">
                      No.
                    </th>
                    <th
                      className={`px-4 py-2 border-b border-slate-800 ${
                        activeTab === "departments" ? "w-[67%]" : "w-[82%]"
                      }`}
                    >
                      Name
                    </th>
                    {activeTab === "departments" && (
                      <th className="px-4 py-2 w-[15%] text-center border-b border-slate-800">
                        Code
                      </th>
                    )}
                    <th className="px-4 py-2 w-[10%] text-center border-b border-slate-800">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredItems.map((item, idx) => {
                    const name = typeof item === "string" ? item : item.name;
                    const hasNote =
                      typeof item === "object" && item.require_note;

                    return (
                      <tr key={idx} className="hover:bg-blue-600/5 group">
                        <td className="px-4 py-1.5 text-center font-mono">
                          {(idx + 1).toString().padStart(2, "0")}
                        </td>
                        <td className="px-4 py-1.5 text-slate-300 group-hover:text-white truncate">
                          <div className="flex items-center gap-2">
                            <span>{name}</span>
                            {hasNote && (
                              <span className="text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                + NOTE
                              </span>
                            )}
                          </div>
                        </td>
                        {activeTab === "departments" && (
                          <td className="px-4 py-1.5 text-center">
                            <span className="bg-[#0F172A] text-blue-400 px-1.5 rounded font-mono font-bold">
                              {item.code || "-"}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-1.5 text-center">
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-[#0B1121] px-4 py-1.5 border-t border-slate-800 flex justify-between items-center text-[9px] text-slate-600 uppercase font-bold tracking-widest shrink-0">
            <span>
              DB: <span className="text-green-500">Online</span>
            </span>
            <span>
              Count: <span className="text-slate-300">{items.length}</span>
            </span>
          </div>
        </div>
      </div>

      <ConfirmPasswordModal
        isOpen={showGuard}
        onClose={() => setShowGuard(false)}
        onConfirm={pendingAction}
        userPass={currentUser.pass}
        message={guardMessage}
      />
    </div>
  );
}

function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  currentUser,
}: any) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!currentUser || pass === currentUser?.pass) {
      onConfirm();
      setPass("");
      setError("");
      onClose();
    } else {
      setError("รหัสผ่านไม่ถูกต้อง!");
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* ✅ พื้นหลังสีเทาดำ #1F1F23 (เหมือนเป๊ะ) */}
      <div className="bg-[#1F1F23] w-full max-w-xs p-6 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="text-center mb-4">
          {/* ✅ เปลี่ยนเป็นไอคอน Key + สีเทา (เหมือนเป๊ะ) */}
          <div className="w-10 h-10 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Key size={20} />
          </div>
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* ✅ Input พื้นหลังดำเข้ม */}
        <input
          type="password"
          autoFocus
          value={pass}
          onChange={(e) => {
            setPass(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          className={`w-full bg-[#0F1115] border ${
            error ? "border-red-500" : "border-slate-700 focus:border-blue-500"
          } rounded-lg px-3 py-2 text-center text-white text-sm outline-none transition-all mb-4 placeholder-slate-600`}
          placeholder="Password"
        />

        <div className="flex gap-2">
          <button
            onClick={() => {
              setPass("");
              setError("");
              onClose();
            }}
            className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-bold text-xs shadow-lg shadow-blue-900/20"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

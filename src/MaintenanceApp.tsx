import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
  runTransaction,
  limit,
  increment,
  writeBatch,
} from "firebase/firestore";

// Import jsPDF
import jsPDF from "jspdf";

// --- IMPORT ASSETS (จากไฟล์ที่คุณแยกไว้) ---
import { fontSarabunBase64, formImageBase64 } from "./pdfAssets";

// Icons (✅ เพิ่ม Edit, Box, ThumbsUp ให้ครบแล้ว)
import {
  Wrench,
  User,
  LogOut,
  X,
  Hammer,
  Trash2,
  UserPlus,
  Settings,
  Plus,
  Crown,
  ClipboardCheck,
  ListTodo,
  UserCog,
  UserCheck,
  CheckCircle2,
  History,
  Calendar,
  ChevronRight,
  Lock,
  CheckSquare,
  Square,
  MousePointer2,
  FileDown,
  Eye,
  Download,
  Pencil,
  Save,
  AlertCircle,
  Clock,
  ThumbsUp, // <--- สำคัญ
  Box, // <--- สำคัญ
  Edit, // <--- สำคัญ
  AlertTriangle,
  LayoutDashboard,
  Briefcase,
  ChevronDown,
  Search,
  MapPin,
  Key,
  hasSearched,
} from "lucide-react";

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

// ==========================================
// TELEGRAM CONFIG
// ==========================================
const TELEGRAM_TOKEN = "8479695961:AAFtKB3MuE1PHk9tYVckhgYPrbb2dYpI1eI";
const TELEGRAM_CHAT_ID = "-5081774286";

const checkPerm = (user: any, allowedRoles: string[]) => {
  if (user?.username === "Bank" || user?.role === "Admin") return true;
  return allowedRoles.includes(user?.role);
};

const sendTelegram = async (message: string) => {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("Telegram Network Error:", err);
  }
};

// ==========================================
// 3. CONTENT COMPONENT
// ==========================================
interface MaintenanceSettingsContentProps {
  activeTab: string;
  currentUser: any;
}

export default function MaintenanceSettingsContent({
  activeTab,
  currentUser,
}: MaintenanceSettingsContentProps) {
  const [items, setItems] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCode, setNewItemCode] = useState("");
  const [requireNote, setRequireNote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal States
  const [showGuard, setShowGuard] = useState(false);
  const [guardMessage, setGuardMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<
    () => Promise<void> | void
  >(() => {});

  const tabs = [
    { id: "departments", label: "จัดการแผนก", icon: Users },
    { id: "job_types", label: "ประเภทงาน", icon: Briefcase },
    { id: "sal01_areas", label: "พื้นที่ S01", icon: MapPin },
    { id: "sal02_areas", label: "พื้นที่ S02", icon: MapPin },
    { id: "cause_categories", label: "สาเหตุเสีย", icon: AlertTriangle },
    { id: "maintenance_results", label: "ผลการซ่อม", icon: ClipboardCheck },
  ];

  const activeTabInfo = tabs.find((t) => t.id === activeTab);

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
        const docRef = doc(db, "maintenance_settings", activeTab);
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

  // ✅✅✅ 3. (เพิ่มใหม่) ดึงอะไหล่ที่เคยเบิกด้วย Ticket ID นี้ มาโชว์อัตโนมัติ ✅✅✅
  useEffect(() => {
    const fetchAutoParts = async () => {
      // ถ้าเป็นการแก้ไขงานเก่า (มีข้อมูลปิดงานแล้ว) ไม่ต้องดึงใหม่ ให้ใช้ของเดิม
      if (ticket.close_data) return;

      try {
        // วิ่งไปค้นใน stock_logs ว่ามี TicketID นี้เบิกอะไรไปบ้าง (เอาเฉพาะขาออก OUT)
        const q = query(
          collection(db, "stock_logs"),
          where("refTicketId", "==", ticket.id), // หรือ customId ถ้าคุณใช้ ID นั้นอ้างอิง
          where("type", "==", "OUT")
        );

        const snap = await getDocs(q);

        // ถ้าเจอข้อมูล ให้จัดรูปแบบแล้วยัดใส่ State 'parts'
        if (!snap.empty) {
          const autoParts = snap.docs.map((doc) => ({
            name: doc.data().partName,
            qty: doc.data().quantity,
          }));

          // ใช้ Set เพื่อป้องกันชื่อซ้ำ (เผื่อเบิกหลายรอบ) หรือจะรวมยอดก็ได้
          // ในที่นี้ผมให้มันโชว์ตามรายการที่เบิกจริง
          setParts(autoParts);
          console.log("Auto-fetched parts:", autoParts);
        }
      } catch (err) {
        console.error("Error fetching used parts:", err);
      }
    };

    fetchAutoParts();
  }, [ticket.id]); // รันทุกครั้งที่เปิด Modal นี้

  const handleAdd = () => {
    if (!newItemName.trim()) return alert("กรุณากรอกข้อมูล");

    const action = async () => {
      let itemToAdd: any = { name: newItemName.trim() };

      if (activeTab === "departments") {
        itemToAdd.code = newItemCode || "MT";
      } else if (showNoteOption) {
        itemToAdd.require_note = requireNote;
      }

      try {
        const docRef = doc(db, "maintenance_settings", activeTab);
        await setDoc(docRef, { list: arrayUnion(itemToAdd) }, { merge: true });
        setItems([...items, itemToAdd]);
        setNewItemName("");
        setNewItemCode("");
        setRequireNote(false);
        // alert("✅ เพิ่มข้อมูลสำเร็จ"); // ตัด Alert ออกเพื่อให้ Flow ลื่นขึ้น
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
        await updateDoc(docRef, { list: arrayRemove(item) });
        setItems(
          items.filter((i) =>
            typeof i === "string" ? i !== item : i.name !== item.name
          )
        );
        // alert("✅ ลบข้อมูลสำเร็จ");
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
                <Hash
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  className="w-full bg-[#0B1121] border border-slate-700 rounded-lg pl-7 pr-2 py-1.5 text-xs text-blue-400 font-mono font-bold uppercase focus:border-blue-500 outline-none h-[34px] placeholder-slate-700"
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

      <ConfirmActionModal
        isOpen={showGuard}
        onClose={() => setShowGuard(false)}
        onConfirm={pendingAction}
        title="ยืนยันรหัสผ่าน"
        message={guardMessage}
        currentUser={currentUser}
      />
    </div>
  );
}

// ==========================================
// 1. TYPES & HELPERS
// ==========================================

type TicketStatus =
  | "Open"
  | "In_Progress"
  | "Waiting_Part"
  | "Wait_Leader"
  | "Wait_Verify"
  | "Wait_Approve"
  | "Closed";

interface MaintenanceTicket {
  id: string;
  machine_id: string;
  machine_name: string;
  job_type: string;
  department: string;
  factory: string;
  area: string;
  issue_item: string;
  issue_detail: string;
  status: TicketStatus;
  source: "Manual";
  requester: string;
  requester_fullname: string;
  requester_date: string;
  technician_id?: string;
  technician_name?: string;
  cause_detail?: string;
  solution?: string;
  prevention?: string;
  cause_category?: string;
  cause_category_other?: string;
  spare_parts?: { name: string; qty: number }[];
  maintenance_result?: string;
  maintenance_result_other?: string;
  result_remark?: string;
  delay_reason?: string;
  start_time?: any;
  end_time?: any;
  total_hours?: number;
  mc_status?: "Stop MC" | "Not Stop";
  leader_checked_by?: string;
  leader_checked_at?: any;
  verified_at?: any;
  approved_by?: string;
  approved_at?: any;
  closed_at?: any;
  images?: string[];
  image_url?: string;
  created_at: any;
  updated_at: any;
  close_data?: any; // เพิ่ม field นี้เพื่อให้ TS ไม่ฟ้อง
  responder_start?: any; // เพิ่ม field นี้
}

type UserRole =
  | "super_admin"
  | "supervisor"
  | "leader"
  | "technician"
  | "requester";

interface User {
  id?: string;
  username: string;
  pass: string;
  fullname?: string;
  role: UserRole;
}

// ==========================================
// Custom Component: SearchableSelect (Updated V2)
// - รองรับ Custom Style (className) เพื่อแก้ปัญหาขอบซ้อน
// - รองรับการแสดงผล 2 บรรทัด (ชื่อ + รหัส/SKU)
// ==========================================
const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = "พิมพ์เพื่อค้นหา...",
  onAddNew,
  disabled,
  className, // รับค่า Style เพิ่มเติม
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleBlur = () => {
    setTimeout(() => {
      const match = (options || []).find((item: any) => {
        const label = typeof item === "string" ? item : item.name;
        return label.toLowerCase() === inputValue.toLowerCase();
      });
      if (!match) {
        setInputValue("");
        onChange("");
      } else {
        const label = typeof match === "string" ? match : match.name;
        setInputValue(label);
        onChange(label);
      }
    }, 200);
  };

  const filteredOptions = (options || []).filter((item: any) => {
    const label = typeof item === "string" ? item : item.name;
    const code = typeof item === "string" ? "" : item.sku || item.code || ""; // รองรับ SKU
    const searchText = inputValue.toLowerCase();
    // ค้นหาทั้งชื่อและรหัส
    return (
      label.toLowerCase().includes(searchText) ||
      code.toLowerCase().includes(searchText)
    );
  });

  return (
    <div className="relative w-full h-full" ref={wrapperRef}>
      <div className="flex h-full items-center">
        <input
          type="text"
          disabled={disabled}
          // ✅ ใช้ className ที่ส่งมา หรือใช้ Default ถ้าไม่ส่งมา (แก้ปัญหาขอบซ้อน)
          className={
            className ||
            "w-full bg-[#0F172A] border border-slate-600 rounded-lg py-2.5 pl-3 pr-10 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-500"
          }
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
        />

        {/* ไอคอนลูกศร */}
        <div className="absolute right-0 top-0 h-full w-10 flex items-center justify-center cursor-pointer pointer-events-none">
          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#1E293B] border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
          <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option: any, idx: number) => {
                const label = typeof option === "string" ? option : option.name;
                const subLabel =
                  typeof option === "object" && (option.sku || option.code)
                    ? option.sku || option.code
                    : null;

                return (
                  <div
                    key={idx}
                    className="px-3 py-2 hover:bg-blue-600/20 hover:text-blue-400 text-slate-300 text-sm rounded cursor-pointer transition-colors flex justify-between items-center"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(label);
                      setInputValue(label);
                      setIsOpen(false);
                    }}
                  >
                    <span>{label}</span>
                    {/* ✅ แสดงรหัส SKU ตัวเล็กๆ ด้านขวา */}
                    {subLabel && (
                      <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-1 rounded">
                        {subLabel}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                ไม่พบข้อมูล "{inputValue}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const formatDate = (ts: any) => {
  if (!ts) return "-";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
};

const getStatusColor = (status: TicketStatus) => {
  switch (status) {
    case "Open":
      return "bg-gradient-to-r from-rose-500 to-pink-600 shadow-md shadow-rose-200";
    case "In_Progress":
      return "bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md shadow-blue-200";
    case "Waiting_Part":
      return "bg-gradient-to-r from-amber-400 to-orange-500 shadow-md shadow-amber-200";
    case "Wait_Leader":
      return "bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md shadow-indigo-200";
    case "Wait_Verify":
      return "bg-gradient-to-r from-purple-500 to-fuchsia-600 shadow-md shadow-purple-200";
    case "Wait_Approve":
      return "bg-gradient-to-r from-orange-500 to-red-500 shadow-md shadow-orange-200";
    case "Closed":
      return "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md shadow-emerald-200";
    default:
      return "bg-gray-400";
  }
};

const getStatusLabel = (status: TicketStatus) => {
  switch (status) {
    case "Open":
      return "รอรับงาน";
    case "In_Progress":
      return "กำลังซ่อม";
    case "Waiting_Part":
      return "รออะไหล่";
    case "Wait_Leader":
      return "รอหน.ช่าง";
    case "Wait_Verify":
      return "รอผู้แจ้ง";
    case "Wait_Approve":
      return "รออนุมัติ";
    case "Closed":
      return "ปิดงาน";
    default:
      return status;
  }
};

const isOverdue48h = (createdAt: any) => {
  if (!createdAt) return false;
  const createdDate = createdAt.toDate
    ? createdAt.toDate()
    : new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours > 48;
};

const generateMaintenancePDF = (tickets: MaintenanceTicket[]) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  if (fontSarabunBase64 && fontSarabunBase64.length > 100) {
    doc.addFileToVFS("THSarabunNew.ttf", fontSarabunBase64);
    doc.addFont("THSarabunNew.ttf", "THSarabun", "normal");
    doc.setFont("THSarabun");
  }

  const fmtDate = (val: any) => {
    if (!val) return "";
    try {
      const d = val.toDate ? val.toDate() : new Date(val);
      return d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      });
    } catch (e) {
      return "";
    }
  };

  const fmtTime = (val: any) => {
    if (!val) return "";
    try {
      const d = val.toDate ? val.toDate() : new Date(val);
      return `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")} น.`;
    } catch (e) {
      return "";
    }
  };

  tickets.forEach((ticket, index) => {
    if (index > 0) doc.addPage();
    if (formImageBase64) doc.addImage(formImageBase64, "JPEG", 0, 0, 210, 297);

    doc.setTextColor(0, 0, 255);
    const text = (
      str: string | undefined | null,
      x: number,
      y: number,
      size: number = 14,
      align: "left" | "center" = "left"
    ) => {
      doc.setFontSize(size);
      doc.text(str ? str.toString() : "", x, y, { align });
    };

    const check = (x: number, y: number, isChecked: boolean) => {
      if (isChecked) {
        doc.setFontSize(24);
        doc.text("/", x, y);
      }
    };

    const cd = ticket.close_data || {};

    // --- 1. ข้อมูลส่วนหัว ---
    text(ticket.id.toUpperCase(), 175, 24, 16, "center");
    text(ticket.requester_fullname, 133, 44, 14);
    text(ticket.department, 143, 49, 14);
    text(fmtDate(ticket.created_at), 123, 54, 14);
    text(fmtTime(ticket.created_at), 172, 54, 14);
    text(ticket.machine_name, 122, 59, 14);

    // --- 2. ประเภทงาน ---
    const job = ticket.job_type || "";
    check(30.5, 43.2, job.includes("เครื่องจักร"));
    check(30.5, 48, job.includes("อุปกรณ์"));
    check(30.5, 53, job.includes("สาธารณูปโภค"));
    check(30.5, 58, job.includes("ปรับปรุง"));
    check(30.5, 63, job.includes("อื่นๆ"));
    if (job.includes("อื่นๆ")) {
      text(job.split("(")[1]?.replace(")", "") || "", 48, 63, 14);
    }

    // --- 3. สถานที่ ---
    check(117, 73, ticket.factory === "SAL01");
    check(160.5, 73, ticket.factory === "SAL02");

    const area = ticket.area || "";
    if (ticket.factory === "SAL01") {
      check(117, 78, area.includes("สำนักงาน") || area.includes("HeadOffice"));
      check(117, 82.5, area.includes("อัดรีด") || area.includes("Extrusion"));
      check(117, 87.5, area.includes("ตัด") || area.includes("Cutting"));
      check(117, 92.5, area.includes("บด") || area.includes("Grinding"));
      check(117, 97.5, area.includes("อื่นๆ"));
      if (area.includes("อื่นๆ"))
        text(area.split("(")[1]?.replace(")", "") || "", 143, 97.5, 14);
    } else if (ticket.factory === "SAL02") {
      check(160.5, 78, area.includes("Office-WH"));
      check(
        160.5,
        82.5,
        area.includes("คลังสินค้า") || area.includes("Warehouse")
      );
      check(160.5, 87.5, area.includes("Dock") || area.includes("loading"));
      check(160.5, 92.5, area.includes("อื่นๆ"));
      if (area.includes("อื่นๆ"))
        text(area.split("(")[1]?.replace(")", "") || "", 175, 92.5, 14);
    }

    // --- 4. อาการเสีย ---
    text(ticket.issue_item, 15, 73.5, 14);
    if (ticket.issue_detail && ticket.issue_detail !== ticket.issue_item) {
      text(ticket.issue_detail, 15, 80, 14);
    }

    // --- 5. สาเหตุและประเภทสาเหตุ ---
    text(cd.cause || ticket.cause_detail || "", 15, 115, 14);
    const cc = cd.cause_category || ticket.cause_category || "";
    check(117, 114.5, cc.includes("Dirty") || cc.includes("สกปรก"));
    check(117, 119.5, cc.includes("Loosen") || cc.includes("หลวม"));
    check(117, 124.5, cc.includes("Broken") || cc.includes("แตกหัก"));
    check(117, 129, cc.includes("Defect") || cc.includes("บกพร่อง"));
    check(117, 134, cc.includes("Expired") || cc.includes("หมดอายุ"));
    check(117, 139, cc.includes("Person") || cc.includes("ผิดพลาด"));
    check(117, 144, cc.includes("อื่นๆ"));
    if (cc.includes("อื่นๆ")) {
      text(cd.cause_note || ticket.cause_category_other || "", 143, 144, 14);
    }

    // --- 6. การแก้ไขและอะไหล่ ---
    text(cd.correction || ticket.solution || "", 15, 158, 14);
    let partY = 158;
    const parts = cd.spare_parts || ticket.spare_parts;
    if (parts) {
      parts.forEach((p: any, i: number) => {
        if (i < 8) {
          text(p.name, 112, partY, 12);
          text(p.qty.toString(), 170, partY, 12, "center");
          partY += 5;
        }
      });
    }

    // --- 7. การป้องกันและผลการซ่อม ---
    text(cd.prevention || ticket.prevention || "", 15, 202, 14);
    const res = cd.repair_result || ticket.maintenance_result || "";
    const resNote = cd.repair_note || ticket.result_remark || "";

    // Checkboxes
    check(117, 201.5, res.includes("สมบูรณ์"));
    check(117, 206.5, res.includes("รออะไหล่"));
    check(117, 216.3, res.includes("ภายนอก"));
    check(117, 226, res.includes("อื่นๆ"));

    // ✅✅✅ แก้ไขตำแหน่งหมายเหตุ ตามที่คุณระบุ ✅✅✅
    if (res.includes("รออะไหล่")) {
      text(resNote, 155.4, 210.6, 14); // 2. รออะไหล่
    } else if (res.includes("ภายนอก")) {
      text(resNote, 155.4, 220.6, 14); // 3. รอช่างภายนอก
    } else if (res.includes("อื่นๆ")) {
      text(resNote, 140.6, 225.7, 14); // 4. อื่นๆ
    }

    // --- 8. เวลาและสถานะเครื่อง ---
    const start = cd.start_time || ticket.start_time;
    const end = cd.end_time || ticket.end_time;
    if (start) {
      text(fmtDate(start), 35, 237, 14);
      text(fmtTime(start), 35, 242, 14);
    }
    if (end) {
      text(fmtDate(end), 90, 237, 14);
      text(fmtTime(end), 90, 242, 14);
    }
    const totalMins =
      cd.duration_minutes || (ticket.total_hours ? ticket.total_hours * 60 : 0);
    if (totalMins) {
      text(Math.floor(totalMins / 60).toString(), 145, 242, 14, "center");
      text((totalMins % 60).toString(), 175, 242, 14, "center");
    }
    check(51, 263.5, ticket.mc_status === "Stop MC");
    check(51, 268.2, ticket.mc_status === "Not Stop" || !ticket.mc_status);

    // --- 9. ลายเซ็น ---
    text(ticket.technician_name || "-", 41, 274, 14, "center");
    text(fmtDate(end || ticket.updated_at), 41, 279, 12, "center");

    text(ticket.requester_fullname, 100, 274, 14, "center");
    text(
      fmtDate(ticket.verified_at || ticket.created_at),
      100,
      279,
      12,
      "center"
    );

    const approver =
      ticket.approved_by ||
      (ticket.status === "Closed" ? "System Approved" : "");
    text(approver, 165, 274, 14, "center");
    text(
      fmtDate(ticket.approved_at || ticket.closed_at),
      165,
      279,
      12,
      "center"
    );
  });

  return doc;
};

// ==========================================
// 3. COMPONENTS (Preview & Confirm)
// ==========================================
function PDFPreviewModal({ isOpen, onClose, pdfUrl, onDownload }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center shrink-0">
          <h3 className="font-bold flex gap-2">
            <FileDown size={20} /> Preview
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 bg-gray-100 p-2 overflow-hidden">
          <iframe src={pdfUrl} className="w-full h-full rounded-lg border" />
        </div>
        <div className="p-4 bg-white border-t flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-gray-600 font-bold hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            onClick={onDownload}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex gap-2"
          >
            <Download size={20} /> Download
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// REPLACE 'ConfirmPasswordModal' WITH THIS
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
          {/* ✅ เปลี่ยนไอคอนเป็น Key สีเทา (แบบเดียวกับ Settings) */}
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
// 4. LOGIN PAGE
// ==========================================
function LoginPage({ onLogin }: { onLogin: (u: User) => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [loading, setLoading] = useState(false);
  const passRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (u === "Bank" && p === "1439") {
      onLogin({
        username: "Bank",
        pass: "1439",
        role: "super_admin",
        fullname: "Bank (Owner)",
      });
      return;
    }
    try {
      const q = query(
        collection(db, "users_maintenance"),
        where("username", "==", u),
        where("pass", "==", p)
      );
      const snap = await getDocs(q);
      if (!snap.empty)
        onLogin({ ...snap.docs[0].data(), id: snap.docs[0].id } as User);
      else alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    } catch (err) {
      alert("Login Error: " + err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      passRef.current?.focus();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-orange-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-[0_20px_50px_-12px_rgba(249,115,22,0.25)] w-full max-w-sm relative overflow-hidden border border-orange-100">
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-20">
          <Settings
            size={140}
            className="absolute -top-16 -left-16 text-orange-300 -rotate-12 opacity-30"
          />
          <Wrench
            size={100}
            className="absolute top-20 -right-10 text-orange-300 rotate-[120deg] opacity-30"
          />
        </div>

        <div className="relative z-10">
          <div className="absolute -top-8 -left-8 w-[calc(100%+64px)] h-2 bg-gradient-to-r from-orange-500 to-red-500"></div>
          <div className="flex justify-center mb-6 mt-2">
            <div className="bg-orange-50 p-4 rounded-full ring-4 ring-orange-100 shadow-inner bg-opacity-90 backdrop-blur-sm">
              <Wrench size={48} className="text-orange-600 drop-shadow-sm" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-1 text-gray-800 tracking-tight">
            Maintenance App
          </h1>
          <p className="text-center text-xs text-gray-500 mb-8 font-medium">
            ระบบแจ้งซ่อมออนไลน์
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <input
                className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-2xl bg-white/95 focus:border-orange-400 focus:ring-4 focus:ring-orange-50/50 outline-none transition-all text-gray-700 placeholder-gray-400 shadow-sm"
                placeholder="Username"
                value={u}
                onChange={(e) => setU(e.target.value)}
                autoFocus
                enterKeyHint="next"
                onKeyDown={handleUserKeyDown}
              />
            </div>
            <div>
              <input
                ref={passRef}
                type="password"
                className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-2xl bg-white/95 focus:border-orange-400 focus:ring-4 focus:ring-orange-50/50 outline-none transition-all text-gray-700 placeholder-gray-400 shadow-sm"
                placeholder="Password"
                value={p}
                onChange={(e) => setP(e.target.value)}
                enterKeyHint="go"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-orange-300 transition-all disabled:from-gray-300 disabled:to-gray-400"
            >
              {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket, onClick }: any) {
  const formatDateTime = (ts: any) => {
    if (!ts) return "-";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return (
      date.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) +
      " " +
      date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    );
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Open":
        return {
          color: "rose-500",
          hoverText: "group-hover:text-rose-500",
          label: "รอรับงาน",
          icon: AlertCircle,
        };
      case "In_Progress":
        return {
          color: "blue-500",
          hoverText: "group-hover:text-blue-500",
          label: "กำลังซ่อม",
          icon: Wrench,
        };
      case "Waiting_Part":
        return {
          color: "amber-500",
          hoverText: "group-hover:text-amber-500",
          label: "รออะไหล่",
          icon: Box,
        };
      case "Wait_Leader":
        return {
          color: "indigo-500",
          hoverText: "group-hover:text-indigo-500",
          label: "รอ หน.ช่าง",
          icon: UserCog,
        };
      case "Wait_Verify":
        return {
          color: "purple-500",
          hoverText: "group-hover:text-purple-500",
          label: "รอตรวจสอบ",
          icon: ClipboardCheck,
        };
      case "Wait_Approve":
        return {
          color: "orange-500",
          hoverText: "group-hover:text-orange-500",
          label: "รออนุมัติ",
          icon: Crown,
        };
      case "Closed":
        return {
          color: "emerald-500",
          hoverText: "group-hover:text-emerald-500",
          label: "ปิดงาน",
          icon: CheckCircle2,
        };
      default:
        return {
          color: "slate-500",
          hoverText: "group-hover:text-slate-500",
          label: status,
          icon: AlertCircle,
        };
    }
  };

  const status = getStatusConfig(ticket.status);
  const StatusIcon = status.icon;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col w-full h-[150px] rounded-2xl bg-[#1E293B] border border-slate-700/60 hover:border-slate-600 cursor-pointer transition-all duration-300 overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-1"
    >
      {/* 1. แถบสีด้านบน */}
      <div className={`h-1.5 w-full bg-${status.color} shrink-0`}></div>

      <div className="p-4 flex flex-col h-full justify-between relative z-10">
        {/* --- ส่วนหัว: ชื่อเครื่องจักร --- */}
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-3">
            {/* ไอคอนแผนก */}
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
              <Briefcase size={16} />
            </div>

            <div className="min-w-0">
              {/* ✅ 1. ชื่อเครื่องจักร: text-base (ขนาดมาตรฐาน) */}
              <h3
                className={`text-base font-bold text-white truncate leading-tight transition-colors duration-200 ${status.hoverText}`}
              >
                {ticket.machine_name}
              </h3>
              <div className="flex items-center gap-2 text-[10px] mt-0.5">
                <span className="text-slate-500 font-mono">#{ticket.id}</span>
                <span className="font-bold text-slate-300">
                  {ticket.department}
                </span>
              </div>
            </div>
          </div>

          {/* Badge สถานะ */}
          <span
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold bg-${status.color}/10 text-${status.color} border border-${status.color}/20 uppercase tracking-wide shrink-0`}
          >
            <StatusIcon size={12} /> {status.label}
          </span>
        </div>

        {/* --- ส่วนกลาง: อาการเสีย --- */}
        <div className="flex-1 mt-1 flex items-center">
          <div className="w-full flex items-baseline gap-2 truncate">
            {/* หัวข้อ (ISSUE:) */}
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
              ISSUE:
            </span>

            {/* ✅ 2. รายละเอียดอาการ: ปรับเป็น text-base (เท่ากับชื่อเครื่อง) */}
            <span
              className={`text-base font-bold text-white truncate transition-colors duration-200 ${status.hoverText}`}
            >
              {ticket.issue_item}
            </span>
          </div>
        </div>

        {/* --- ส่วนท้าย: ผู้แจ้ง + วันที่ --- */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50 text-[10px]">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#0F172A] px-2 py-1 rounded-full border border-slate-800">
              <User size={12} className="text-slate-400" />
              <span className="truncate max-w-[100px] font-medium text-slate-300">
                {ticket.requester_fullname}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono bg-[#0F172A] px-2 py-1 rounded-full border border-slate-800">
            <Clock size={12} className="text-slate-400" />
            <span className="text-slate-300">
              {formatDateTime(ticket.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketFormView({ ticket }: { ticket: any }) {
  const [scale, setScale] = useState(1);
  const [testMode, setTestMode] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.offsetWidth;
        const a4WidthPx = 794;
        setScale(Math.min(parentWidth / a4WidthPx, 1));
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPx = (e.clientX - rect.left) / scale;
    const yPx = (e.clientY - rect.top) / scale;
    const pxToMm = 210 / 794;
    setMousePos({
      x: Math.max(0, Math.round(xPx * pxToMm * 10) / 10),
      y: Math.max(0, Math.round(yPx * pxToMm * 10) / 10),
    });
  };

  const fmtDate = (v: any) => {
    if (!v) return "";
    try {
      const d = v.toDate ? v.toDate() : new Date(v);
      return d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      });
    } catch (e) {
      return "";
    }
  };
  const fmtTime = (v: any) => {
    if (!v) return "";
    try {
      const d = v.toDate ? v.toDate() : new Date(v);
      return `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")} น.`;
    } catch (e) {
      return "";
    }
  };

  const myFont = "'THSarabunNew', sans-serif";

  const TextOverlay = ({
    x,
    y,
    children,
    size = 14,
    align = "left",
    color = "blue",
    bold = false,
  }: any) => {
    if (!children && !testMode) return null;

    return (
      <>
        {children && (
          <div
            style={{
              position: "absolute",
              left: `${x}mm`,
              top: `${y}mm`,
              fontSize: `${size}pt`,
              fontFamily: myFont,
              color: color,
              fontWeight: bold ? "bold" : "normal",
              transform:
                align === "center"
                  ? "translate(-50%, -60%)"
                  : "translateY(-60%)",
              whiteSpace: "pre-wrap",
              zIndex: 10,
              pointerEvents: "none",
              lineHeight: 1,
            }}
          >
            {children}
          </div>
        )}

        {testMode && (
          <div
            style={{
              position: "absolute",
              left: `${x}mm`,
              top: `${y}mm`,
              width: "4px",
              height: "4px",
              backgroundColor: "red",
              borderRadius: "50%",
              transform: "translate(-2px, -2px)",
              zIndex: 20,
              pointerEvents: "none",
              boxShadow: "0 0 2px white",
            }}
          />
        )}
      </>
    );
  };

  const CheckOverlay = ({ x, y, checked }: any) => {
    if (!checked && !testMode) return null;
    return (
      <>
        {checked && (
          <div
            style={{
              position: "absolute",
              left: `${x}mm`,
              top: `${y}mm`,
              fontSize: "20pt",
              fontFamily: myFont,
              color: "blue",
              transform: "translateY(-60%)",
              fontWeight: "bold",
              zIndex: 10,
              lineHeight: 1,
            }}
          >
            /
          </div>
        )}
        {testMode && (
          <div
            style={{
              position: "absolute",
              left: `${x}mm`,
              top: `${y}mm`,
              width: "4px",
              height: "4px",
              backgroundColor: "red",
              borderRadius: "50%",
              transform: "translate(-2px, -2px)",
              zIndex: 20,
              pointerEvents: "none",
              boxShadow: "0 0 2px white",
            }}
          />
        )}
      </>
    );
  };

  const isT = ticket.id?.includes("TEST");
  const factory = ticket.factory || "";
  const area = ticket.area || "";
  const job = ticket.job_type || "";
  const cc = ticket.close_data?.cause_category || ticket.cause_category || "";
  const res =
    ticket.close_data?.repair_result || ticket.maintenance_result || "";
  const resNote = ticket.close_data?.repair_note || ticket.result_remark || "";

  return (
    <div className="flex flex-col items-center bg-gray-300 p-4 h-full overflow-hidden">
      {/* Control Bar */}
      <div className="flex gap-4 mb-3 items-center z-50">
        <button
          onClick={() => setTestMode(!testMode)}
          className={`px-4 py-2 rounded-lg text-xs font-bold shadow-lg transition-all flex items-center gap-2 ${
            testMode
              ? "bg-red-600 text-white hover:bg-red-700 shadow-red-500/50"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          {testMode ? <Settings size={16} /> : <Eye size={16} />}
          {testMode ? "HIDE TEST DOTS" : "TEST POSITIONS (แสดงจุดแดง)"}
        </button>

        <div className="bg-slate-900 text-white w-36 py-2 rounded-lg text-xs font-mono font-bold shadow-lg border border-slate-700 flex justify-center items-center tracking-wider">
          X:{mousePos.x.toFixed(1)}{" "}
          <span className="mx-2 text-slate-500">|</span> Y:
          {mousePos.y.toFixed(1)}
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full overflow-y-auto overflow-x-hidden flex justify-center border border-gray-500 shadow-2xl bg-gray-500/50 custom-scrollbar"
      >
        <style>{`
          @font-face {
            font-family: 'THSarabunNew';
            src: url(data:font/truetype;charset=utf-8;base64,${fontSarabunBase64}) format('truetype');
            font-weight: normal; font-style: normal;
          }
          @font-face {
            font-family: 'THSarabunNew';
            src: url(data:font/truetype;charset=utf-8;base64,${fontSarabunBase64}) format('truetype');
            font-weight: bold; font-style: normal;
          }
        `}</style>

        <div
          onMouseMove={handleMouseMove}
          style={{
            width: "794px",
            height: "1123px",
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            marginBottom: `-${1123 * (1 - scale)}px`,
            position: "relative",
            backgroundColor: "white",
            backgroundImage: `url(${formImageBase64})`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            cursor: "crosshair",
          }}
        >
          {/* --- HEADER --- */}
          <TextOverlay x={175} y={24} size={16} align="center" bold color="red">
            {ticket.id.toUpperCase()}
          </TextOverlay>
          <TextOverlay x={133} y={44}>
            {ticket.requester_fullname}
          </TextOverlay>
          <TextOverlay x={143} y={49}>
            {ticket.department}
          </TextOverlay>
          <TextOverlay x={123} y={54}>
            {fmtDate(ticket.created_at)}
          </TextOverlay>
          <TextOverlay x={172} y={54}>
            {fmtTime(ticket.created_at)}
          </TextOverlay>
          <TextOverlay x={122} y={59} bold>
            {ticket.machine_name}
          </TextOverlay>

          {/* --- WORK TYPE --- */}
          {[43.2, 48, 53, 58, 63].map((y, i) => (
            <CheckOverlay
              key={y}
              x={30.5}
              y={y}
              checked={
                isT ||
                job.includes(
                  [
                    "เครื่องจักร",
                    "อุปกรณ์",
                    "สาธารณูปโภค",
                    "ปรับปรุง",
                    "อื่นๆ",
                  ][i]
                )
              }
            />
          ))}
          <TextOverlay x={48} y={62}>
            {isT
              ? "เทสอื่นๆ"
              : job.includes("อื่นๆ")
              ? job.split("(")[1]?.replace(")", "")
              : ""}
          </TextOverlay>

          {/* --- LOCATION --- */}
          <CheckOverlay x={117} y={73} checked={isT || factory === "SAL01"} />
          <CheckOverlay x={160.5} y={73} checked={isT || factory === "SAL02"} />

          {[78, 82.5, 87.5, 92.5, 97.5].map((y, i) => (
            <CheckOverlay
              key={y}
              x={117}
              y={y}
              checked={
                isT ||
                (factory === "SAL01" &&
                  area.includes(
                    ["สำนักงาน", "อัดรีด", "ตัด", "บด", "อื่นๆ"][i]
                  ))
              }
            />
          ))}
          <TextOverlay x={132.5} y={97}>
            {isT
              ? "เทสอื่นๆ S01"
              : factory === "SAL01" && area.includes("อื่นๆ")
              ? area.split("(")[1]?.replace(")", "")
              : ""}
          </TextOverlay>

          {[78, 82.5, 87.5, 92.5].map((y, i) => (
            <CheckOverlay
              key={y}
              x={160.5}
              y={y}
              checked={
                isT ||
                (factory === "SAL02" &&
                  area.includes(
                    ["Office-WH", "คลังสินค้า", "Dock", "อื่นๆ"][i]
                  ))
              }
            />
          ))}
          <TextOverlay x={175} y={91.5}>
            {isT
              ? "เทสอื่นๆ S02"
              : factory === "SAL02" && area.includes("อื่นๆ")
              ? area.split("(")[1]?.replace(")", "")
              : ""}
          </TextOverlay>

          {/* --- PROBLEM & CAUSE --- */}
          <TextOverlay x={15} y={73.5}>
            {ticket.issue_item}
          </TextOverlay>
          <TextOverlay x={15} y={115}>
            {isT ? "ความร้อน" : ticket.close_data?.cause || ""}
          </TextOverlay>

          {[114.5, 119.5, 124.5, 129, 134, 139, 144].map((y, i) => (
            <CheckOverlay
              key={y}
              x={117}
              y={y}
              checked={
                isT ||
                cc.includes(
                  [
                    "Dirty",
                    "Loosen",
                    "Broken",
                    "Defect",
                    "Expired",
                    "Person",
                    "อื่นๆ",
                  ][i]
                )
              }
            />
          ))}
          <TextOverlay x={140} y={143}>
            {isT
              ? "น็อตยึดเฟืองคลายตัว"
              : ticket.cause_category_other ||
                ticket.close_data?.cause_note ||
                ""}
          </TextOverlay>

          {/* --- CORRECTION & PARTS --- */}
          <TextOverlay x={15} y={158}>
            {isT ? "การแก้ไขเทส" : ticket.close_data?.correction || ""}
          </TextOverlay>
          {Array.from({ length: 8 }).map((_, i) => {
            const p = ticket.close_data?.spare_parts?.[i];
            return (
              <React.Fragment key={i}>
                <TextOverlay x={112} y={158 + i * 5} size={11}>
                  {p?.name}
                </TextOverlay>
                <TextOverlay x={170} y={158 + i * 5} align="center" bold>
                  {p?.qty}
                </TextOverlay>
              </React.Fragment>
            );
          })}

          {/* --- REPAIR RESULT (แก้ไขใหม่ตามสั่ง) --- */}
          <TextOverlay x={15} y={202}>
            {isT ? "การป้องกันเทส" : ticket.close_data?.prevention || ""}
          </TextOverlay>

          {[201.5, 206.5, 216.3, 226].map((y, i) => (
            <CheckOverlay
              key={y}
              x={117}
              y={y}
              checked={
                isT ||
                res.includes(["สมบูรณ์", "รออะไหล่", "ภายนอก", "อื่นๆ"][i])
              }
            />
          ))}

          {/* ✅ Remarks แยกตามหัวข้อ (ใส่จุดลงไปให้แล้ว) */}
          <TextOverlay x={155.4} y={210.6}>
            {isT ? "Note: รออะไหล่" : res.includes("รออะไหล่") ? resNote : ""}
          </TextOverlay>

          <TextOverlay x={155.4} y={220.6}>
            {isT ? "Note: รอช่างนอก" : res.includes("ภายนอก") ? resNote : ""}
          </TextOverlay>

          <TextOverlay x={140.6} y={225.7}>
            {isT ? "Note: อื่นๆ" : res.includes("อื่นๆ") ? resNote : ""}
          </TextOverlay>

          {/* --- TIME & STATUS --- */}
          <TextOverlay x={35} y={237}>
            {fmtDate(ticket.close_data?.start_time || ticket.created_at)}
          </TextOverlay>
          <TextOverlay x={35} y={242}>
            {fmtTime(ticket.close_data?.start_time || ticket.created_at)}
          </TextOverlay>
          <TextOverlay x={90} y={237}>
            {fmtDate(ticket.close_data?.end_time || ticket.created_at)}
          </TextOverlay>
          <TextOverlay x={90} y={242}>
            {fmtTime(ticket.close_data?.end_time || ticket.created_at)}
          </TextOverlay>
          <TextOverlay x={145} y={242} align="center" bold>
            {isT
              ? "99"
              : Math.floor((ticket.close_data?.duration_minutes || 0) / 60)}
          </TextOverlay>
          <TextOverlay x={175} y={242} align="center" bold>
            {isT ? "59" : (ticket.close_data?.duration_minutes || 0) % 60}
          </TextOverlay>

          <CheckOverlay
            x={51}
            y={263.5}
            checked={isT || ticket.mc_status === "Stop MC"}
          />
          <CheckOverlay
            x={51}
            y={268.2}
            checked={
              isT || ticket.mc_status === "Not Stop" || !ticket.mc_status
            }
          />

          {/* --- SIGNATURES --- */}
          <TextOverlay x={41} y={274} align="center" bold>
            {isT ? "ช่างเทส" : ticket.technician_name || "-"}
          </TextOverlay>
          <TextOverlay x={41} y={279} align="center" size={11}>
            {isT
              ? "16 ม.ค. 69"
              : fmtDate(ticket.close_data?.end_time || ticket.updated_at)}
          </TextOverlay>

          <TextOverlay x={100} y={274} align="center" bold>
            {ticket.requester_fullname}
          </TextOverlay>
          <TextOverlay x={100} y={279} align="center" size={11}>
            {isT
              ? "16 ม.ค. 69"
              : fmtDate(ticket.verified_at || ticket.created_at)}
          </TextOverlay>

          <TextOverlay x={165} y={274} align="center" bold>
            {isT ? "ผู้อนุมัติเทส" : ticket.approved_by || ""}
          </TextOverlay>
          <TextOverlay x={165} y={279} align="center" size={11}>
            {isT ? "16 ม.ค. 69" : fmtDate(ticket.approved_at)}
          </TextOverlay>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MaintenanceApp.tsx -> CloseJobModal (FIXED: Lock Auto Parts)
// ==========================================
function CloseJobModal({
  ticket,
  user,
  onClose,
  onSuccess,
}: {
  ticket: any;
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [customId, setCustomId] = useState(ticket.id);

  // Form States
  const [cause, setCause] = useState("");
  const [correction, setCorrection] = useState("");
  const [prevention, setPrevention] = useState("");
  const [causeCategory, setCauseCategory] = useState("");
  const [causeNote, setCauseNote] = useState("");
  const [repairResult, setRepairResult] = useState("");
  const [repairNote, setRepairNote] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // ✅ แก้ไข State: รองรับ isLocked
  const [parts, setParts] = useState<
    { name: string; qty: number; isLocked?: boolean }[]
  >([]);

  // --- ส่วนจัดการอะไหล่ (Stock Logic) ---
  const [tempPartName, setTempPartName] = useState("");
  const [tempPartQty, setTempPartQty] = useState(1);
  const [stockList, setStockList] = useState<any[]>([]);
  const [selectedStockItem, setSelectedStockItem] = useState<any>(null);

  // Password Guard
  const [showGuard, setShowGuard] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});

  // Options
  const [categoryOptions, setCategoryOptions] = useState<
    { name: string; require_note: boolean }[]
  >([]);
  const [resultOptions, setResultOptions] = useState<
    { name: string; require_note: boolean }[]
  >([]);
  const [isDelayed, setIsDelayed] = useState(false);

  const toLocalISOString = (date: Date) => {
    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  useEffect(() => {
    // 1. Load Master Data
    const fetchMasters = async () => {
      const getList = async (id: string) => {
        const d = await getDoc(doc(db, "maintenance_settings", id));
        return d.exists() ? d.data().list || [] : [];
      };
      setCategoryOptions(
        (await getList("cause_categories")).map((c: any) =>
          typeof c === "string" ? { name: c, require_note: false } : c
        )
      );
      setResultOptions(
        (await getList("maintenance_results")).map((r: any) =>
          typeof r === "string" ? { name: r, require_note: false } : r
        )
      );
    };
    fetchMasters();

    // 2. Load Stock Master
    const fetchStock = async () => {
      try {
        const q = query(collection(db, "spare_parts"), orderBy("name"));
        const snap = await getDocs(q);
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setStockList(items);
      } catch (err) {
        console.error("Failed to load stock:", err);
      }
    };
    fetchStock();

    // 3. Setup Initial Data
    if (ticket.close_data) {
      const cd = ticket.close_data;
      setCause(cd.cause || "");
      setCorrection(cd.correction || "");
      setPrevention(cd.prevention || "");
      setCauseCategory(cd.cause_category || "");
      setCauseNote(cd.cause_note || "");
      setRepairResult(cd.repair_result || "");
      setRepairNote(cd.repair_note || "");

      // ข้อมูลเดิมที่เคยบันทึกไว้ (ถือว่าแก้ไขได้ถ้าเข้ามาแก้)
      setParts(cd.spare_parts || []);

      if (cd.start_time) setStartTime(toLocalISOString(cd.start_time.toDate()));
      if (cd.end_time) setEndTime(toLocalISOString(cd.end_time.toDate()));
      if (cd.delay_reason) setDelayReason(cd.delay_reason);
      if (cd.is_delayed) setIsDelayed(true);
    } else {
      const startObj = ticket.responder_start
        ? ticket.responder_start.toDate()
        : ticket.created_at.toDate();
      setStartTime(toLocalISOString(startObj));
      const now = new Date();
      setEndTime(toLocalISOString(now));
      const diffMs = now.getTime() - ticket.created_at.toDate().getTime();
      if (diffMs / (1000 * 60 * 60) > 48) setIsDelayed(true);
    }
  }, [ticket]);

  // ==========================================
  // แก้ไข: คำนวณยอดคงเหลือจริง (Net Qty) โดยนำยอดคืนมาหักออก
  // ==========================================
  useEffect(() => {
    const fetchAutoParts = async () => {
      // ถ้าเป็นการแก้ไขงานเก่า (ปิดงานไปแล้ว) ไม่ต้องดึงใหม่
      if (ticket.close_data) return;

      try {
        // 1. ดึง Log ทั้งหมดที่เกี่ยวข้องกับ Ticket นี้ (ทั้งขาเข้าและขาออก)
        const q = query(
          collection(db, "stock_logs"),
          where("refTicketId", "==", ticket.id)
          // ❌ ลบเงื่อนไข where("type", "==", "OUT") ออก เพื่อให้เห็นยอดรับคืนด้วย
        );

        const snap = await getDocs(q);

        if (!snap.empty) {
          // 2. คำนวณยอดรวม (Group by Part Name)
          const partMap = new Map<string, number>();

          snap.docs.forEach((doc) => {
            const data = doc.data();
            const name = data.partName;
            const qty = Number(data.quantity) || 0;

            const currentTotal = partMap.get(name) || 0;

            if (data.type === "OUT") {
              // ถ้าเป็น "เบิก" -> บวกเพิ่ม
              partMap.set(name, currentTotal + qty);
            } else if (data.type === "IN" && data.isReturn) {
              // ถ้าเป็น "รับคืน" -> ลบออก
              partMap.set(name, currentTotal - qty);
            }
          });

          // 3. แปลงกลับเป็น Array และกรองเฉพาะที่ยอด > 0
          const finalParts: { name: string; qty: number; isLocked: boolean }[] =
            [];

          partMap.forEach((netQty, name) => {
            if (netQty > 0) {
              finalParts.push({
                name: name,
                qty: netQty,
                isLocked: true, // ล็อคไว้เหมือนเดิม
              });
            }
          });

          setParts(finalParts);
          console.log("Net Parts Calculated:", finalParts);
        }
      } catch (err) {
        console.error("Error fetching used parts:", err);
      }
    };

    fetchAutoParts();
  }, [ticket.id]);
  useEffect(() => {
    const found = stockList.find((s) => s.name === tempPartName);
    setSelectedStockItem(found || null);
  }, [tempPartName, stockList]);

  const getDurationText = () => {
    if (!startTime || !endTime) return "-";
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return "Error";
    const totalMinutes = Math.floor(diffMs / 60000);
    return `${Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, "0")}:${(totalMinutes % 60).toString().padStart(2, "0")} น.`;
  };

  const handleAddPart = () => {
    if (!tempPartName) return;
    // รายการที่เพิ่มเอง ไม่ต้องล็อค (isLocked: undefined/false)
    setParts([...parts, { name: tempPartName, qty: tempPartQty }]);
    setTempPartName("");
    setTempPartQty(1);
    setSelectedStockItem(null);
  };

  const showCauseNoteInput =
    categoryOptions.find((c) => c.name === causeCategory)?.require_note ||
    false;
  const showResultNoteInput =
    resultOptions.find((r) => r.name === repairResult)?.require_note || false;

  const handleSubmit = async () => {
    if (tempPartName && tempPartName.trim() !== "") {
      alert(
        "⚠️ คุณกรอกชื่ออะไหล่ค้างไว้!\n\nกรุณากดปุ่ม (+) สีน้ำเงิน เพื่อเพิ่มรายการลงในตารางก่อนกดบันทึกครับ"
      );
      return;
    }

    if (
      !cause ||
      !correction ||
      !causeCategory ||
      !repairResult ||
      !startTime ||
      !endTime ||
      !customId
    ) {
      alert("กรุณากรอกข้อมูลที่มีดอกจัน (*) ให้ครบถ้วน");
      return;
    }
    if (showCauseNoteInput && !causeNote)
      return alert("กรุณาระบุหมายเหตุของ 'ประเภทสาเหตุ'");
    if (showResultNoteInput && !repairNote)
      return alert("กรุณาระบุหมายเหตุของ 'ผลการซ่อม'");
    if (isDelayed && !delayReason) return alert("กรุณาระบุเหตุผลความล่าช้า");

    const executeSave = async () => {
      setSubmitting(true);
      try {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const durationMin = Math.round(
          (end.getTime() - start.getTime()) / 60000
        );

        // ตอนบันทึก ลบ field isLocked ทิ้งไปก่อนลง DB (จะได้สะอาด)
        const cleanParts = parts.map(({ isLocked, ...rest }) => rest);

        const closeData = {
          cause,
          correction,
          prevention,
          cause_category: causeCategory,
          cause_note: causeNote,
          repair_result: repairResult,
          repair_note: repairNote,
          spare_parts: cleanParts, // ใช้ตัว clean
          start_time: start,
          end_time: end,
          duration_minutes: durationMin,
          delay_reason: isDelayed ? delayReason : null,
          is_delayed: isDelayed,
        };

        await runTransaction(db, async (transaction) => {
          let nextStatus = "Wait_Verify";
          if (
            ["Wait_Verify", "Wait_Approve"].includes(ticket.status) &&
            ticket.close_data
          ) {
            nextStatus = ticket.status;
          }

          const ticketRef = doc(db, "maintenance_tickets", customId);
          const oldTicketRef = doc(db, "maintenance_tickets", ticket.id);

          if (customId !== ticket.id) {
            const newDocCheck = await transaction.get(ticketRef);
            if (newDocCheck.exists())
              throw new Error(`Ticket ID ${customId} ซ้ำ!`);
            const oldDoc = await transaction.get(oldTicketRef);
            if (!oldDoc.exists()) throw new Error("Ticket เดิมหายไป!");

            transaction.set(ticketRef, {
              ...oldDoc.data(),
              status: nextStatus,
              close_data: closeData,
              updated_at: serverTimestamp(),
              id: customId,
            });
            transaction.delete(oldTicketRef);
          } else {
            transaction.update(ticketRef, {
              status: nextStatus,
              close_data: closeData,
              updated_at: serverTimestamp(),
            });
          }
        });

        onSuccess();
      } catch (e: any) {
        alert("Error: " + e.message);
        setSubmitting(false);
      }
    };

    if (ticket.close_data) {
      setPendingAction(() => executeSave);
      setShowGuard(true);
    } else {
      executeSave();
    }
  };

  const labelClass =
    "text-[10px] uppercase font-bold text-slate-500 mb-1 block truncate";
  const inputBase =
    "w-full h-[38px] bg-[#0F172A] text-white text-xs border border-slate-700 rounded-lg px-2.5 outline-none focus:border-blue-500 transition-all placeholder:text-slate-600 flex items-center";

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1E293B] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden max-h-[90vh]">
        <div className="px-5 py-3 border-b border-slate-700/50 flex justify-between items-center bg-[#1E293B] shrink-0">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]"></div>
            {ticket.close_data ? "Edit Repair Data" : "Close Job"}
          </h3>
          <button onClick={onClose}>
            <X size={18} className="text-slate-500 hover:text-white" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar space-y-3">
          <div className="mb-2">
            <label className={`${labelClass} text-yellow-500`}>Ticket ID</label>
            <input
              className={`${inputBase} border-yellow-500/30 text-yellow-400 font-mono`}
              value={customId}
              onChange={(e) => setCustomId(e.target.value.trim())}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>1. สาเหตุ *</label>
              <input
                className={inputBase}
                value={cause}
                onChange={(e) => setCause(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>2. การแก้ไข *</label>
              <input
                className={inputBase}
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>3. การป้องกัน</label>
              <input
                className={inputBase}
                value={prevention}
                onChange={(e) => setPrevention(e.target.value)}
              />
            </div>
            <div
              className={`${showCauseNoteInput ? "col-span-1 flex gap-2" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <label className={labelClass}>4. ประเภทสาเหตุ *</label>
                <select
                  className={inputBase}
                  value={causeCategory}
                  onChange={(e) => setCauseCategory(e.target.value)}
                >
                  <option value="">- เลือก -</option>
                  {categoryOptions.map((o, i) => (
                    <option key={i} value={o.name}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              {showCauseNoteInput && (
                <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                  <label className={`${labelClass} text-orange-400`}>
                    หมายเหตุ *
                  </label>
                  <input
                    className={inputBase}
                    value={causeNote}
                    onChange={(e) => setCauseNote(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>5. อะไหล่ (เบิกจาก Stock)</label>

            <div className="flex w-full h-[38px] bg-[#0F172A] border border-slate-700 rounded-lg relative z-20 items-center">
              <div className="flex-1 h-full min-w-0">
                <SearchableSelect
                  options={stockList}
                  value={tempPartName}
                  onChange={setTempPartName}
                  placeholder="ค้นหาอะไหล่..."
                  className="w-full h-full bg-transparent border-none text-white text-xs px-3 outline-none focus:ring-0 placeholder-slate-600 rounded-l-lg"
                />
              </div>

              <div className="w-[1px] h-[60%] bg-slate-700"></div>

              <input
                type="number"
                className="w-14 h-full bg-transparent text-center text-xs text-white outline-none focus:bg-slate-800/50 transition-colors"
                min="1"
                placeholder="Qty"
                value={tempPartQty}
                onChange={(e) => setTempPartQty(parseInt(e.target.value))}
              />

              <button
                onClick={handleAddPart}
                className="h-full px-3 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-r-lg transition-colors border-l border-blue-500"
              >
                <Plus size={16} />
              </button>
            </div>

            {selectedStockItem && (
              <div className="flex items-center gap-2 mt-1 text-[10px] ml-1 animate-in fade-in slide-in-from-top-1">
                <span className="text-slate-400">คงเหลือในสต็อก:</span>
                <span
                  className={`font-bold ${
                    selectedStockItem.quantity > 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {selectedStockItem.quantity} {selectedStockItem.unit || "pcs"}
                </span>
                {selectedStockItem.quantity <= 0 && (
                  <span className="text-red-400">(ของหมด!)</span>
                )}
              </div>
            )}

            {parts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 relative z-0">
                {parts.map((p, i) => (
                  <span
                    key={i}
                    className={`flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md text-[10px] border ${
                      p.isLocked
                        ? "bg-slate-800/50 border-slate-700 text-slate-400" // สไตล์ของที่ล็อค
                        : "bg-[#1E293B] border-slate-600 text-slate-300" // สไตล์ปกติ
                    }`}
                  >
                    {p.name}{" "}
                    <span
                      className={`font-bold px-1 rounded ${
                        p.isLocked
                          ? "text-slate-500 bg-slate-700/50"
                          : "text-blue-400 bg-blue-400/10"
                      }`}
                    >
                      x{p.qty}
                    </span>
                    {/* ✅✅✅ ซ่อนปุ่มลบ ถ้าถูกล็อค (โชว์กุญแจแทน) ✅✅✅ */}
                    {p.isLocked ? (
                      <div className="p-0.5 px-1">
                        <Lock size={10} className="text-slate-500" />
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setParts(parts.filter((_, idx) => idx !== i))
                        }
                        className="p-0.5 rounded-full hover:bg-slate-700 text-slate-500 hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div
            className={`grid gap-3 ${
              showResultNoteInput ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            <div>
              <label className={labelClass}>6. ผลการซ่อม *</label>
              <select
                className={inputBase}
                value={repairResult}
                onChange={(e) => setRepairResult(e.target.value)}
              >
                <option value="">- เลือก -</option>
                {resultOptions.map((o, i) => (
                  <option key={i} value={o.name}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            {showResultNoteInput && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <label className={`${labelClass} text-orange-400`}>
                  หมายเหตุ *
                </label>
                <input
                  className={inputBase}
                  value={repairNote}
                  onChange={(e) => setRepairNote(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>เริ่ม *</label>
              <input
                type="datetime-local"
                className={inputBase}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>เสร็จ *</label>
              <input
                type="datetime-local"
                className={inputBase}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>เวลา (Total)</label>
              <div
                className={`${inputBase} bg-slate-800 text-emerald-400 font-mono font-bold justify-center`}
              >
                {getDurationText()}
              </div>
            </div>
          </div>
          {isDelayed && (
            <div className="mt-1">
              <label className={`${labelClass} text-red-500`}>
                Late Reason (48h+) *
              </label>
              <input
                className={`${inputBase} border-red-500/50 text-red-200 focus:border-red-500`}
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-700 bg-[#161E2E] shrink-0">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {submitting
              ? "Saving..."
              : ticket.close_data
              ? "Confirm Edit (Password)"
              : "Confirm & Save"}
          </button>
        </div>
      </div>
      <ConfirmPasswordModal
        isOpen={showGuard}
        onClose={() => setShowGuard(false)}
        onConfirm={pendingAction}
        userPass={user.pass}
        message="ยืนยันรหัสผ่านเพื่อแก้ไขข้อมูล"
      />
    </div>
  );
}

// ==========================================
// FILE: MaintenanceApp.tsx -> TicketDetailModal
// (Update: Handle Wait_Approve Edit Logic)
// ==========================================
function TicketDetailModal({
  ticket,
  user,
  onClose,
  onDelete,
  mode,
}: {
  ticket: MaintenanceTicket;
  user: User;
  onClose: () => void;
  onDelete: (id: string, status: string) => void;
  mode: "approve" | "history" | "repair";
}) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showCloseJob, setShowCloseJob] = useState(false);
  const [displayData, setDisplayData] = useState(ticket);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // --- Permissions ---
  const isSuper = user.username === "Bank" || user.role === "super_admin";
  const actions = user.allowedActions || [];

  const canAccept = isSuper || actions.includes("mt_accept");
  const canClose = isSuper || actions.includes("mt_close");
  const canVerify = isSuper || actions.includes("mt_verify");
  const canApprove = isSuper || actions.includes("mt_approve");
  const canDelete = isSuper || actions.includes("mt_delete");
  const canEdit = isSuper || actions.includes("mt_edit");

  const refreshPreview = (data: any) => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    const doc = generateMaintenancePDF([data]);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    setPdfPreviewUrl(url);
  };

  useEffect(() => {
    setDisplayData(ticket);
    const isForm =
      mode === "approve" ||
      mode === "history" ||
      ["Wait_Approve", "Closed"].includes(ticket.status);
    if (isForm) refreshPreview(ticket);
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [ticket, mode]);

  const isT = displayData.id?.includes("TEST");
  const isFormView =
    mode === "approve" ||
    mode === "history" ||
    displayData.status === "Wait_Approve" ||
    displayData.status === "Closed" ||
    isT;

  const handleDownloadPDF = () => {
    const doc = generateMaintenancePDF([displayData]);
    doc.save(`${displayData.id}.pdf`);
  };

  const handleAcceptWork = async () => {
    if (!canAccept) return alert("⛔️ Permission Denied");
    if (!confirm("ยืนยันรับงาน?")) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "maintenance_tickets", displayData.id), {
        status: "In_Progress",
        updated_at: serverTimestamp(),
        responder: user.username,
        technician_id: user.username,
        technician_name: user.fullname || user.username,
        responder_start: serverTimestamp(),
      });
      onClose();
    } catch (e) {
      alert(e);
      setUpdating(false);
    }
  };

  const handleVerify = async () => {
    if (!canVerify) return alert("⛔️ Permission Denied");
    if (!confirm("ยืนยันตรวจสอบ?")) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "maintenance_tickets", displayData.id), {
        status: "Wait_Approve",
        verified_by: user.username,
        verified_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      onClose();
    } catch (e) {
      alert(e);
      setUpdating(false);
    }
  };

  const handleApprove = async () => {
    if (!canApprove) return alert("⛔️ Permission Denied");
    if (!confirm("ยืนยันอนุมัติ?")) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "maintenance_tickets", displayData.id), {
        status: "Closed",
        approved_by: user.fullname || user.username,
        approved_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      onClose();
    } catch (e) {
      alert(e);
      setUpdating(false);
    }
  };

  const handleCloseJobSuccess = async () => {
    setShowCloseJob(false);
    if (mode === "repair") {
      onClose();
      return;
    }
    await refreshDisplayData();
  };

  const refreshDisplayData = async () => {
    const docSnap = await getDoc(
      doc(db, "maintenance_tickets", displayData.id)
    );
    if (docSnap.exists()) {
      const updatedTicket = {
        id: docSnap.id,
        ...docSnap.data(),
      } as MaintenanceTicket;
      setDisplayData(updatedTicket);
      refreshPreview(updatedTicket);
    }
  };

  // ✅ แก้ไข Logic ปุ่มแก้ไข (Edit) ใน TicketDetailModal
  const onEditClick = () => {
    // 1. ถ้าเป็นหน้าประวัติ (mode === "history") หรือสถานะคือ Closed -> ให้เปิดหน้าแก้ไขผลการซ่อม (CloseJobModal)
    if (mode === "history" || displayData.status === "Closed") {
      if (!canClose && !canEdit) return alert("⛔️ คุณไม่มีสิทธิ์แก้ไขข้อมูล");
      setShowCloseJob(true);
      return;
    }

    // 2. ถ้าเป็นสถานะที่รอตรวจสอบ หรือรออนุมัติ -> เปิดหน้าแก้ไขผลการซ่อม (CloseJobModal)
    if (["Wait_Verify", "Wait_Approve"].includes(displayData.status)) {
      if (!canClose && !canEdit) return alert("⛔️ คุณไม่มีสิทธิ์แก้ไขข้อมูล");
      setShowCloseJob(true);
      return;
    }

    // 3. สถานะอื่นๆ (Open / In_Progress) -> เปิดหน้าแก้ไขข้อมูลใบแจ้งซ่อมปกติ (CreateTicketModal)
    if (!canEdit)
      return alert(
        "⛔️ คุณไม่มีสิทธิ์แก้ไขใบแจ้งซ่อม (Need 'mt_edit' permission)"
      );
    setShowEditModal(true);
  };

  const onDeleteClick = () => {
    if (!canDelete)
      return alert(
        "⛔️ คุณไม่มีสิทธิ์ลบใบแจ้งซ่อม (Need 'mt_delete' permission)"
      );
    onDelete(displayData.id, displayData.status);
  };

  if (showCloseJob) {
    return (
      <CloseJobModal
        ticket={displayData}
        user={user} // ✅ ส่ง user ไปให้เช็ครหัสผ่าน
        onClose={() => setShowCloseJob(false)}
        onSuccess={handleCloseJobSuccess}
      />
    );
  }

  const MiniField = ({
    label,
    value,
    full = false,
    isHighlight = false,
  }: any) => (
    <div
      className={`flex flex-col justify-center ${
        full ? "col-span-2" : "col-span-1"
      } min-h-[40px] px-3 py-1.5 rounded-xl bg-[#0F172A]/50 border border-slate-700/30`}
    >
      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
        {label}
      </span>
      <span
        className={`text-xs font-medium leading-tight ${
          isHighlight ? "text-blue-300" : "text-slate-200"
        }`}
      >
        {value || "-"}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className={`bg-[#1E293B] w-full ${
          isFormView ? "max-w-4xl h-[90vh]" : "max-w-[420px]"
        } rounded-[2rem] shadow-2xl border border-slate-700 flex flex-col overflow-hidden`}
      >
        {/* --- 1. HEADER --- */}
        <div className="px-4 py-3 flex justify-between items-center bg-[#151C2C] border-b border-slate-700/50 shrink-0 h-12">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white tracking-tight">
              #{displayData.id}
            </span>
            <div className="h-4 w-[1px] bg-slate-600 mx-1"></div>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide opacity-80">
              {displayData.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isFormView && mode === "history" && (
              <button
                onClick={handleDownloadPDF}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <Download size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* --- 2. CONTENT --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#1E293B] p-4">
          {isFormView ? (
            <div className="w-full h-full bg-slate-800 p-1 overflow-hidden flex justify-center rounded-3xl border border-slate-700">
              <TicketFormView ticket={displayData} />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <MiniField
                    label="Machine"
                    value={displayData.machine_name}
                    isHighlight
                  />
                  <MiniField label="Job Type" value={displayData.job_type} />
                  <MiniField
                    label="Problem"
                    value={displayData.issue_item}
                    full
                  />
                  <MiniField
                    label="Location"
                    full
                    value={`${displayData.factory} - ${displayData.area}`}
                  />
                  <MiniField
                    label="Requester"
                    value={displayData.requester_fullname}
                  />
                  <MiniField
                    label="Date"
                    value={displayData.created_at
                      ?.toDate()
                      .toLocaleString("th-TH", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                  />
                </div>
              </div>

              {displayData.close_data && (
                <div className="relative pt-4 mt-2 border-t border-dashed border-slate-700/50">
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#1E293B] px-2 text-[9px] font-bold text-emerald-500 uppercase">
                    Result
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniField
                      label="Cause"
                      value={displayData.close_data.cause}
                    />
                    <MiniField
                      label="Correction"
                      value={displayData.close_data.correction}
                    />
                    <MiniField
                      label="Spare Parts"
                      full
                      value={
                        displayData.close_data.spare_parts?.length
                          ? displayData.close_data.spare_parts
                              .map((p: any) => `${p.name} (x${p.qty})`)
                              .join(", ")
                          : "-"
                      }
                    />
                    <MiniField
                      label="Technician"
                      value={displayData.technician_name}
                    />
                    <div className="col-span-1 flex flex-col justify-center min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-900/10 border border-emerald-500/20">
                      <span className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">
                        Result
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        {displayData.close_data.repair_result}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- 3. FOOTER (Action Buttons) --- */}
        <div className="p-3 bg-[#151C2C] border-t border-slate-700/50 shrink-0">
          <div className="flex gap-2 h-9">
            {/* Delete Button */}
            <button
              onClick={onDeleteClick}
              className="w-9 flex items-center justify-center rounded-full border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-400/50 transition-all hover:bg-slate-800"
              title="ลบใบงาน"
            >
              <Trash2 size={14} />
            </button>

            {/* Edit Button */}
            <button
              onClick={onEditClick}
              className="w-9 flex items-center justify-center rounded-full border border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 transition-all hover:bg-slate-800"
              title="แก้ไข"
            >
              <Edit size={14} />
            </button>

            {/* Main Action Buttons (Matched with Theme Colors) */}
            <div className="flex-1">
              {/* 1. Open (Red) -> Button Red */}
              {displayData.status === "Open" && (
                <button
                  onClick={handleAcceptWork}
                  disabled={!canAccept}
                  className="w-full h-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full uppercase tracking-wider disabled:bg-slate-800 disabled:text-slate-600 shadow-lg shadow-rose-900/20"
                >
                  Receive Job
                </button>
              )}

              {/* 2. In Progress (Blue) -> Button Blue */}
              {["In_Progress", "Waiting_Part"].includes(displayData.status) && (
                <button
                  onClick={() => setShowCloseJob(true)}
                  disabled={!canClose}
                  className="w-full h-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full uppercase tracking-wider disabled:bg-slate-800 disabled:text-slate-600 shadow-lg shadow-blue-900/20"
                >
                  Finish
                </button>
              )}

              {/* 3. Wait Verify (Purple) -> Button Purple */}
              {displayData.status === "Wait_Verify" && (
                <button
                  onClick={handleVerify}
                  disabled={!canVerify}
                  className="w-full h-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-full uppercase tracking-wider disabled:bg-slate-800 disabled:text-slate-600 shadow-lg shadow-purple-900/20"
                >
                  Verify
                </button>
              )}

              {/* 4. Wait Approve (Orange) -> Button Orange */}
              {displayData.status === "Wait_Approve" && (
                <button
                  onClick={handleApprove}
                  disabled={!canApprove}
                  className="w-full h-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-full uppercase tracking-wider disabled:bg-slate-800 disabled:text-slate-600 shadow-lg shadow-orange-900/20"
                >
                  Approve
                </button>
              )}

              {/* 5. Closed (Green) -> Label Green */}
              {displayData.status === "Closed" && (
                <div className="w-full h-full flex items-center justify-center border border-emerald-500/30 rounded-full bg-emerald-900/10 text-[10px] font-bold text-emerald-500 uppercase cursor-not-allowed">
                  Job Closed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <CreateTicketModal
          user={user}
          onClose={() => setShowEditModal(false)}
          editData={displayData}
          onSuccess={async () => {
            await refreshDisplayData();
          }}
        />
      )}
    </div>
  );
}

function CreateTicketModal({
  user,
  onClose,
  editData,
  onSuccess,
}: {
  user: User;
  onClose: () => void;
  editData?: any;
  onSuccess?: () => void;
}) {
  const [department, setDepartment] = useState("");
  const [customId, setCustomId] = useState("");

  const [jobType, setJobType] = useState("");
  const [jobNote, setJobNote] = useState("");

  const [machineName, setMachineName] = useState("");
  const [issueItem, setIssueItem] = useState("");
  const [factory, setFactory] = useState<"SAL01" | "SAL02">("SAL01");

  const [area, setArea] = useState("");
  const [areaNote, setAreaNote] = useState("");

  const [creating, setCreating] = useState(false);
  const [showGuard, setShowGuard] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});

  const [deptOptions, setDeptOptions] = useState<any[]>([]);
  const [jobOptions, setJobOptions] = useState<any[]>([]);
  const [sal01Options, setSal01Options] = useState<any[]>([]);
  const [sal02Options, setSal02Options] = useState<any[]>([]);

  // ✅ State สำหรับเก็บข้อมูลรวม (Machine + Assets)
  const [machineOptions, setMachineOptions] = useState<any[]>([]);

  // 1. Load Master Data (Hybrid Logic)
  useEffect(() => {
    const fetchMasterData = async () => {
      const getList = async (docId: string) => {
        try {
          const docSnap = await getDoc(doc(db, "maintenance_settings", docId));
          return docSnap.exists() ? docSnap.data().list || [] : [];
        } catch (error) {
          return [];
        }
      };

      setDeptOptions(
        (await getList("departments")).map((d: any) =>
          typeof d === "string" ? { name: d, code: "MT" } : d
        )
      );
      setJobOptions(
        (await getList("job_types")).map((j: any) =>
          typeof j === "string" ? { name: j, require_note: false } : j
        )
      );
      setSal01Options(
        (await getList("sal01_areas")).map((a: any) =>
          typeof a === "string" ? { name: a, require_note: false } : a
        )
      );
      setSal02Options(
        (await getList("sal02_areas")).map((a: any) =>
          typeof a === "string" ? { name: a, require_note: false } : a
        )
      );
    };
    fetchMasterData();

    // ✅ Realtime Listener: Machines (จาก Daily Check)
    const unsubMachines = onSnapshot(
      collection(db, "machines"),
      async (snap) => {
        const machinesList = snap.docs.map((d) => ({
          name: d.data().name,
          type: "Machine", // แยกประเภทไว้
        }));

        // ✅ Fetch Assets (จาก Maintenance Settings)
        const assetsSnap = await getDoc(
          doc(db, "maintenance_settings", "assets")
        );
        let assetsList: any[] = [];
        if (assetsSnap.exists()) {
          assetsList = (assetsSnap.data().list || []).map((a: any) => ({
            name: typeof a === "string" ? a : a.name,
            type: "Asset",
          }));
        }

        // ✅ รวมร่าง และ เรียงตามตัวอักษร
        const combined = [...machinesList, ...assetsList].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setMachineOptions(combined);
      }
    );

    return () => unsubMachines();
  }, []);

  // 2. Load Edit Data
  useEffect(() => {
    if (!editData) return;
    setCustomId(editData.id);
    setDepartment(editData.department || "");
    setMachineName(editData.machine_name || "");
    setIssueItem(editData.issue_item || "");
    const fac = (editData.factory as "SAL01" | "SAL02") || "SAL01";
    setFactory(fac);

    const resolveValue = (targetValue: string, optionsList: any[]) => {
      if (!targetValue) return { main: "", note: "" };
      const text = targetValue.toString().trim();
      const exactMatch = optionsList.find((opt) => {
        const optName = typeof opt === "string" ? opt : opt.name;
        return optName === text;
      });
      if (exactMatch) return { main: text, note: "" };

      const lastParenIndex = text.lastIndexOf(" (");
      if (lastParenIndex > 0 && text.endsWith(")")) {
        const candidateMain = text.substring(0, lastParenIndex).trim();
        const candidateNote = text
          .substring(lastParenIndex + 2, text.length - 1)
          .trim();
        const mainMatch = optionsList.find((opt) => {
          const optName = typeof opt === "string" ? opt : opt.name;
          return optName === candidateMain;
        });
        if (mainMatch) return { main: candidateMain, note: candidateNote };
      }
      return { main: text, note: "" };
    };

    if (jobOptions.length > 0) {
      const { main, note } = resolveValue(editData.job_type, jobOptions);
      setJobType(main);
      setJobNote(note);
    }

    const currentAreaList = fac === "SAL01" ? sal01Options : sal02Options;
    if (currentAreaList.length > 0) {
      const { main, note } = resolveValue(editData.area, currentAreaList);
      setArea(main);
      setAreaNote(note);
    }
  }, [editData, jobOptions, sal01Options, sal02Options]);

  // ✅ ฟังก์ชันเพิ่มเครื่องใหม่ (บังคับลง Assets เพื่อความปลอดภัย)
  const handleAddMachine = async () => {
    const newMachineName = prompt("ระบุชื่อเครื่องจักร/ทรัพย์สินใหม่:");
    if (!newMachineName || !newMachineName.trim()) return;

    if (
      !window.confirm(
        `คุณต้องการเพิ่ม "${newMachineName}" ลงในรายการทรัพย์สินทั่วไป ใช่หรือไม่?`
      )
    )
      return;

    try {
      const docRef = doc(db, "maintenance_settings", "assets");
      await setDoc(
        docRef,
        {
          list: arrayUnion({ name: newMachineName.trim() }),
        },
        { merge: true }
      );

      // บันทึกเสร็จแล้ว onSnapshot จะทำงานเอง และอัปเดต dropdown ให้
      setMachineName(newMachineName.trim());
      alert(`เพิ่ม "${newMachineName}" เรียบร้อยแล้ว`);
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการเพิ่มข้อมูล");
    }
  };

  // ... (ฟังก์ชัน generateTicketId, handleSubmit เหมือนเดิมเป๊ะ)
  // เพื่อให้ก๊อบวางได้ ผมใส่โค้ดเต็มส่วนนี้ให้ครับ

  const generateTicketId = async (deptName: string) => {
    const deptMapping: Record<string, string> = {
      Cutting: "PC",
      Extrusion: "PE",
      Grinding: "PG",
      Office: "OF",
      Warehouse: "WH",
      Maintenance: "MT",
    };
    let deptCode = deptMapping[deptName];
    if (!deptCode) {
      const selectedDeptObj = deptOptions.find((d) => d.name === deptName);
      deptCode =
        selectedDeptObj && selectedDeptObj.code
          ? selectedDeptObj.code
          : deptName.substring(0, 2).toUpperCase();
    }
    const prefix = `${deptCode}-${new Date()
      .toISOString()
      .slice(2, 7)
      .replace("-", "")}`;
    const q = query(
      collection(db, "maintenance_tickets"),
      where("id", ">=", prefix),
      where("id", "<=", prefix + "\uf8ff"),
      orderBy("id", "desc"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    let nextSeq = "001";
    if (!querySnapshot.empty) {
      const lastSeq = parseInt(querySnapshot.docs[0].id.slice(-3));
      if (!isNaN(lastSeq)) nextSeq = (lastSeq + 1).toString().padStart(3, "0");
    }
    return `${prefix}${nextSeq}`;
  };

  const currentJobObj = jobOptions.find((o) => o.name === jobType);
  const showJobInput = currentJobObj?.require_note || false;
  const currentAreaList = factory === "SAL01" ? sal01Options : sal02Options;
  const showAreaInput =
    currentAreaList.find((o) => o.name === area)?.require_note || false;

  // ==========================================
  // MaintenanceApp.tsx -> CreateTicketModal -> handleSubmit
  // ==========================================
  const handleSubmit = async () => {
    if (!department || !jobType || !machineName || !issueItem || !area)
      return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    if (showJobInput && !jobNote) return alert("กรุณาระบุรายละเอียดประเภทงาน");
    if (showAreaInput && !areaNote) return alert("กรุณาระบุรายละเอียดพื้นที่");
    if (editData && !customId) return alert("กรุณาระบุเลขที่ใบงาน");

    // Strict Check (ต้องมีในรายการเท่านั้น)
    const isValidMachine = machineOptions.some((opt: any) => {
      const dbName = typeof opt === "string" ? opt : opt.name;
      return dbName.trim().toLowerCase() === machineName.trim().toLowerCase();
    });

    if (!isValidMachine) {
      alert(
        `⛔️ ชื่อ "${machineName}" ไม่ถูกต้อง!\nกรุณาเลือกจากรายการ หรือกดปุ่ม + เพื่อเพิ่มใหม่`
      );
      setMachineName("");
      return;
    }

    const executeSave = async () => {
      setCreating(true);
      try {
        const finalJobType = showJobInput ? `${jobType} (${jobNote})` : jobType;
        const finalArea = showAreaInput ? `${area} (${areaNote})` : area;

        // ตัวแปรสำหรับเก็บ ID เพื่อเอาไปส่ง Telegram
        let savedTicketId = customId;

        if (editData) {
          // --- กรณีแก้ไข (Edit) ---
          const updates = {
            department,
            job_type: finalJobType,
            machine_name: machineName,
            issue_item: issueItem,
            issue_detail: issueItem,
            factory,
            area: finalArea,
            updated_at: serverTimestamp(),
          };
          if (customId !== editData.id) {
            await runTransaction(db, async (transaction) => {
              const newDocRef = doc(db, "maintenance_tickets", customId);
              const oldDocRef = doc(db, "maintenance_tickets", editData.id);
              const newDocCheck = await transaction.get(newDocRef);
              if (newDocCheck.exists())
                throw new Error(`เลขที่ใบงาน ${customId} มีอยู่แล้ว!`);
              const oldDoc = await transaction.get(oldDocRef);
              if (!oldDoc.exists()) throw new Error("ไม่พบข้อมูลเดิม");
              transaction.set(newDocRef, {
                ...oldDoc.data(),
                ...updates,
                id: customId,
              });
              transaction.delete(oldDocRef);
            });
          } else {
            await updateDoc(
              doc(db, "maintenance_tickets", editData.id),
              updates
            );
          }
          if (onSuccess) onSuccess();
        } else {
          // --- กรณีสร้างใหม่ (New) ---
          const newId = await generateTicketId(department);
          savedTicketId = newId; // เก็บ ID ไว้ส่งไลน์

          const newTicketData = {
            id: newId,
            machine_id: "N/A",
            machine_name: machineName,
            job_type: finalJobType,
            department,
            factory,
            area: finalArea,
            issue_item: issueItem,
            issue_detail: issueItem,
            status: "Open",
            source: "Manual", // สร้างผ่าน App Maintenance
            requester: user.username,
            requester_fullname: user.fullname || user.username,
            requester_date: new Date().toISOString(),
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          };
          await setDoc(doc(db, "maintenance_tickets", newId), newTicketData);

          // ✅✅✅ ส่วนแจ้งเตือน Telegram (เฉพาะตอนสร้างใหม่) ✅✅✅
          try {
            const TELEGRAM_TOKEN =
              "8479695961:AAFtKB3MuE1PHk9tYVckhgYPrbb2dYpI1eI";
            const TELEGRAM_CHAT_ID = "-5081774286";

            // ดึงชื่อจริง (ถ้าไม่มีใช้ username)
            const requesterName = user.fullname || user.username;

            // ข้อความตาม Format ที่คุณต้องการเป๊ะๆ
            const msg = `🚨 <b>เครื่อง:</b> ${machineName}\n⚠️ <b>อาการ:</b> ${issueItem}\n🏢 <b>แผนก:</b> ${department}\n📍 <b>พื้นที่:</b> ${finalArea}\n👤 <b>ผู้แจ้ง:</b> ${requesterName}`;

            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: TELEGRAM_CHAT_ID,
                  text: msg,
                  parse_mode: "HTML",
                }),
              }
            );
          } catch (err) {
            console.error("Telegram Error:", err);
          }
          // ✅✅✅ จบส่วนแจ้งเตือน ✅✅✅
        }

        onClose();
      } catch (e) {
        alert("Error: " + e);
      } finally {
        setCreating(false);
      }
    };

    if (editData) {
      setPendingAction(() => executeSave);
      setShowGuard(true);
    } else {
      executeSave();
    }
  };

  const inputClass =
    "w-full bg-[#0F172A] text-white text-sm border border-slate-700/50 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-600";
  const labelClass =
    "text-[10px] uppercase font-bold text-slate-500 mb-1.5 block tracking-wide";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[11000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1E293B] w-full max-w-md rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-700/50 flex justify-between items-center bg-[#1E293B]">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></span>{" "}
            {editData ? "Edit Ticket" : "New Ticket"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar max-h-[70vh]">
          {editData && (
            <div>
              <label className={`${labelClass} text-yellow-500`}>
                Ticket ID
              </label>
              <input
                className={`${inputClass} border-yellow-500/30 text-yellow-400 font-mono`}
                value={customId}
                onChange={(e) => setCustomId(e.target.value.trim())}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Department</label>
              <select
                className={inputClass}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">เลือกแผนก</option>
                {deptOptions.map((o, i) => (
                  <option key={i} value={o.name}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Job Type</label>
              <select
                className={inputClass}
                value={jobType}
                onChange={(e) => {
                  setJobType(e.target.value);
                  setJobNote("");
                }}
              >
                <option value="">เลือกประเภท</option>
                {jobOptions.map((o, i) => (
                  <option key={i} value={o.name}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {showJobInput && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <input
                className={inputClass}
                placeholder="ระบุรายละเอียด..."
                value={jobNote}
                onChange={(e) => setJobNote(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className={labelClass}>Machine Name / Asset</label>
            <SearchableSelect
              options={machineOptions}
              value={machineName}
              onChange={(val: string) => setMachineName(val)}
              placeholder="ค้นหาเครื่องจักร/ทรัพย์สิน..."
              onAddNew={handleAddMachine}
            />
            <p className="text-[9px] text-slate-500 mt-1">
              * รวมรายการจาก Daily Check และ ทรัพย์สินทั่วไป
            </p>
          </div>
          <div>
            <label className={labelClass}>Issue Detail</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={1}
              placeholder="..."
              value={issueItem}
              onChange={(e) => setIssueItem(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <div className="flex gap-2">
              <div className="flex bg-[#0F172A] rounded-lg p-1 border border-slate-700/50 h-[42px] shrink-0">
                {["SAL01", "SAL02"].map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFactory(f as any);
                      setArea("");
                      setAreaNote("");
                    }}
                    className={`px-3 rounded-md text-[10px] font-bold transition-all ${
                      factory === f
                        ? "bg-slate-700 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <select
                className={inputClass}
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setAreaNote("");
                }}
              >
                <option value="">-- ระบุพื้นที่ --</option>
                {currentAreaList.map((o, i) => (
                  <option key={i} value={o.name}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            {showAreaInput && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  className={inputClass}
                  placeholder="ระบุรายละเอียด..."
                  value={areaNote}
                  onChange={(e) => setAreaNote(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/50 bg-[#161E2E]">
          <button
            onClick={handleSubmit}
            disabled={creating}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {creating ? (
              "Processing..."
            ) : (
              <>
                {editData ? "Save Changes" : "Confirm Request"}{" "}
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
      <ConfirmPasswordModal
        isOpen={showGuard}
        onClose={() => setShowGuard(false)}
        onConfirm={pendingAction}
        userPass={user.pass}
        message="ยืนยันรหัสผ่านเพื่อแก้ไขข้อมูล"
      />
    </div>
  );
}

// ==========================================
// 7. MANAGE USERS MODAL
// ==========================================
function ManageUsersModal({
  onClose,
  userPass,
}: {
  onClose: () => void;
  userPass: string;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [fullname, setFullname] = useState("");
  const [role, setRole] = useState<UserRole>("requester");
  const [showGuard, setShowGuard] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users_maintenance"), (s) => {
      setUsers(
        s.docs
          .map((d) => ({ id: d.id, ...d.data() } as User))
          .sort((a, b) => a.username.localeCompare(b.username))
      );
    });
    return () => unsub();
  }, []);

  const handleAddUser = async () => {
    if (!u || !p || !fullname) return alert("กรอกข้อมูลไม่ครบ");
    await addDoc(collection(db, "users_maintenance"), {
      username: u,
      pass: p,
      fullname,
      role,
      created_at: serverTimestamp(),
    });
    setU("");
    setP("");
    setFullname("");
    alert("เพิ่มผู้ใช้แล้ว");
  };

  const confirmDelete = async () => {
    if (pendingDeleteId) {
      await deleteDoc(doc(db, "users_maintenance", pendingDeleteId));
      setPendingDeleteId("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1F1F23] w-full max-w-md rounded-2xl shadow-xl p-6 h-[80vh] flex flex-col border border-gray-700 text-white">
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
          <h3 className="text-xl font-bold flex gap-2 items-center text-white">
            <UserPlus className="text-green-500" /> จัดการผู้ใช้งาน
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full"
          >
            <X size={24} />
          </button>
        </div>
        <div className="bg-[#16181C] p-4 rounded-xl mb-4 space-y-2 border border-gray-700">
          <input
            className="w-full bg-[#0F1115] border border-gray-700 p-2 rounded text-sm text-white"
            placeholder="ชื่อ-นามสกุล"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="bg-[#0F1115] border border-gray-700 p-2 rounded text-sm text-white"
              placeholder="User"
              value={u}
              onChange={(e) => setU(e.target.value)}
            />
            <input
              className="bg-[#0F1115] border border-gray-700 p-2 rounded text-sm text-white"
              placeholder="Pass"
              value={p}
              onChange={(e) => setP(e.target.value)}
            />
          </div>
          <select
            className="w-full bg-[#0F1115] border border-gray-700 p-2 rounded text-sm text-white"
            value={role}
            onChange={(e: any) => setRole(e.target.value)}
          >
            <option value="super_admin">1. Super Admin</option>
            <option value="supervisor">2. Supervisor</option>
            <option value="technician">3. Technician</option>
            <option value="requester">4. Requester</option>
          </select>
          <button
            onClick={handleAddUser}
            className="w-full bg-green-600 text-white py-2 rounded font-bold text-sm hover:bg-green-700"
          >
            เพิ่มผู้ใช้
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
          {users.map((us) => (
            <div
              key={us.id}
              className="flex justify-between items-center p-3 border border-gray-700 rounded hover:bg-[#25262B] bg-[#16181C]"
            >
              <div>
                <div className="font-bold text-sm text-white">
                  {us.username}
                </div>
                <div className="text-xs text-gray-500">
                  {us.fullname} ({us.role})
                </div>
              </div>
              {us.username !== "Bank" && (
                <button
                  onClick={() => {
                    setPendingDeleteId(us.id!);
                    setShowGuard(true);
                  }}
                  className="text-gray-500 hover:text-red-500 p-2"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <ConfirmPasswordModal
        isOpen={showGuard}
        onClose={() => setShowGuard(false)}
        onConfirm={confirmDelete}
        userPass={userPass}
        message="ยืนยันรหัสผ่านเพื่อลบ"
      />
    </div>
  );
}

function SettingsModal({
  onClose,
  userPass,
}: {
  onClose: () => void;
  userPass: string;
}) {
  const [activeTab, setActiveTab] = useState("dept");
  const [items, setItems] = useState<
    { id: string; val: string; code?: string }[]
  >([]);
  const [newItem, setNewItem] = useState("");
  const [newCode, setNewCode] = useState("");
  const [showGuard, setShowGuard] = useState(false);
  const [guardMessage, setGuardMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<
    () => Promise<void> | void
  >(() => {});

  // ✅ อัปเดต Map ชื่อ Doc ให้รองรับ assets
  const getDocId = () => {
    if (activeTab === "dept") return "departments";
    if (activeTab === "job") return "job_types";
    if (activeTab === "assets") return "assets"; // เพิ่มบรรทัดนี้
    if (activeTab === "sal01") return "sal01_areas";
    if (activeTab === "sal02") return "sal02_areas";
    if (activeTab === "cause") return "cause_categories";
    return "maintenance_results";
  };

  useEffect(() => {
    setNewItem("");
    setNewCode("");
    const unsub = onSnapshot(
      doc(db, "maintenance_settings", getDocId()),
      (s) => {
        if (s.exists()) {
          const data = s.data().list || [];
          setItems(
            data.map((item: any) =>
              typeof item === "object"
                ? { id: item.name, val: item.name, code: item.code || "" }
                : { id: item, val: item, code: "" }
            )
          );
        } else setItems([]);
      }
    );
    return () => unsub();
  }, [activeTab]);

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    const docRef = doc(db, "maintenance_settings", getDocId());

    let itemToSave: any = newItem;
    if (activeTab === "dept") {
      itemToSave = { name: newItem, code: newCode };
    } else if (activeTab === "assets") {
      itemToSave = { name: newItem }; // Assets เก็บเป็น object {name: ...}
    }

    // ✅ ใช้ arrayUnion เพื่อความปลอดภัย (ไม่ทับข้อมูลเก่า)
    await setDoc(docRef, { list: arrayUnion(itemToSave) }, { merge: true });

    setNewItem("");
    setNewCode("");
  };

  const handleDelete = (valToDelete: string) => {
    setGuardMessage("ยืนยันรหัสผ่านเพื่อลบข้อมูล");
    setPendingAction(() => async () => {
      const docRef = doc(db, "maintenance_settings", getDocId());

      // หา object เต็มๆ เพื่อลบออกจาก array
      const itemObject = items.find((i) => i.val === valToDelete);
      let itemToRemove: any = valToDelete;

      if (itemObject && (activeTab === "dept" || activeTab === "assets")) {
        if (activeTab === "dept")
          itemToRemove = { name: itemObject.val, code: itemObject.code };
        if (activeTab === "assets") itemToRemove = { name: itemObject.val };
      }

      // ✅ ใช้ arrayRemove ลบเฉพาะตัวนั้น
      await updateDoc(docRef, { list: arrayRemove(itemToRemove) });
    });
    setShowGuard(true);
  };

  // ✅ เพิ่ม Tab "ทรัพย์สิน"
  const tabs = [
    { id: "dept", label: "แผนก" },
    { id: "job", label: "งาน" },
    { id: "assets", label: "ทรัพย์สิน" }, // เพิ่มปุ่มนี้
    { id: "sal01", label: "S01" },
    { id: "sal02", label: "S02" },
    { id: "cause", label: "สาเหตุ" },
    { id: "result", label: "ผลซ่อม" },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1F1F23] w-full max-w-md rounded-2xl shadow-xl p-6 h-[80vh] flex flex-col border border-gray-700 text-white">
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
          <h3 className="text-xl font-bold flex gap-2 items-center">
            <Settings className="text-gray-400" /> ตั้งค่าข้อมูล
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex gap-1 bg-gray-800 p-1 rounded-lg mb-4 overflow-x-auto shrink-0 custom-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded whitespace-nowrap transition-all ${
                activeTab === t.id
                  ? "bg-[#0F1115] text-blue-400 shadow"
                  : "text-gray-400 hover:bg-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-4 shrink-0 items-end">
          <div className="flex-1 space-y-2">
            <input
              className="w-full bg-[#0F1115] border border-gray-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              placeholder={`ชื่อ${
                tabs.find((t) => t.id === activeTab)?.label
              }...`}
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
            />
            {activeTab === "dept" && (
              <input
                className="w-full bg-[#0F1115] border border-gray-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500 font-mono uppercase"
                placeholder="CODE (เช่น MT)"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
            )}
          </div>
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white p-2.5 rounded hover:bg-blue-700 h-[38px] self-start mt-0"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {items.map((i, idx) => (
            <div
              key={idx}
              className="flex justify-between p-3 border border-gray-700 rounded items-center bg-[#16181C]"
            >
              <div className="flex flex-col">
                <span className="text-sm text-gray-300">{i.val}</span>
                {i.code && (
                  <span className="text-[10px] text-blue-400 font-mono">
                    {i.code}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDelete(i.val)}
                className="text-gray-500 hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center text-gray-500 text-xs py-10">
              ไม่พบข้อมูล
            </div>
          )}
        </div>
      </div>
      <ConfirmPasswordModal
        isOpen={showGuard}
        onClose={() => setShowGuard(false)}
        onConfirm={pendingAction}
        userPass={userPass}
        message={guardMessage}
      />
    </div>
  );
}

function MaintenanceDashboard({ user, perms, activeTab }: any) {
  const getInitialStartDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01T08:00`;
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [startInput, setStartInput] = useState(getInitialStartDateTime());
  const [endInput, setEndInput] = useState(getCurrentDateTime());
  const [searchTextInput, setSearchTextInput] = useState("");

  const [activeFilters, setActiveFilters] = useState({
    start: getInitialStartDateTime(),
    end: getCurrentDateTime(),
    text: "",
    hasSearched: false,
  });

  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [selectedTicket, setSelectedTicket] =
    useState<MaintenanceTicket | null>(null);
  const [showPasswordGuard, setShowPasswordGuard] = useState(false);
  const [guardMessage, setGuardMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});
  const [showCreate, setShowCreate] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const isSuper = user?.username === "Bank" || user?.role === "super_admin";
  const canRequest = isSuper || user?.allowedActions?.includes("mt_request");
  const canDelete = isSuper || user?.allowedActions?.includes("mt_delete");

  useEffect(() => {
    const q = query(
      collection(db, "maintenance_tickets"),
      orderBy("created_at", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setTickets(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as MaintenanceTicket))
      );
    });
    return () => unsub();
  }, []);

  const handlePerformSearch = () => {
    setActiveFilters({
      start: startInput,
      end: endInput,
      text: searchTextInput,
      hasSearched: true,
    });
  };

  const filteredTickets = useMemo(() => {
    let result = [];
    switch (activeTab) {
      case 1:
        result = tickets.filter((t) => t.status === "Open");
        break;
      case 2:
        result = tickets.filter((t) =>
          ["In_Progress", "Waiting_Part"].includes(t.status)
        );
        break;
      case 3:
        result = tickets.filter((t) => t.status === "Wait_Verify");
        break;
      case 4:
        result = tickets.filter((t) =>
          ["Wait_Approve", "Wait_Leader"].includes(t.status)
        );
        break;
      case 5:
        result = tickets.filter((t) => t.status === "Closed");
        break;
      default:
        result = tickets;
    }

    if (activeTab === 5) {
      if (!activeFilters.hasSearched) return [];
      result = result.filter((t) => {
        const targetDate = t.approved_at || t.closed_at || t.updated_at;
        if (!targetDate) return false;
        const ticketDate = targetDate.toDate
          ? targetDate.toDate()
          : new Date(targetDate);
        const filterStart = new Date(activeFilters.start);
        const filterEnd = new Date(activeFilters.end);
        if (ticketDate < filterStart || ticketDate > filterEnd) return false;
        if (
          activeFilters.text &&
          !`${t.id} ${t.machine_name} ${t.requester_fullname}`
            .toLowerCase()
            .includes(activeFilters.text.toLowerCase())
        )
          return false;
        return true;
      });
    }
    return result;
  }, [tickets, activeTab, activeFilters]);

  const handleDeleteTicket = (id: string, status: string) => {
    if (!canDelete) return alert("⛔️ Permission Denied");
    setGuardMessage("Confirm Delete?");
    setPendingAction(() => async () => {
      await deleteDoc(doc(db, "maintenance_tickets", id));
      setSelectedTicket(null);
    });
    setShowPasswordGuard(true);
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelectionMode) return;
    const newNext = new Set(selectedIds);
    if (newNext.has(id)) newNext.delete(id);
    else newNext.add(id);
    setSelectedIds(newNext);
  };

  const handleSaveSelectedPDF = async () => {
    const selectedData = tickets.filter((t) => selectedIds.has(t.id));
    selectedData.forEach((ticket, index) => {
      setTimeout(() => {
        const doc = generateMaintenancePDF([ticket]);
        doc.save(`${ticket.id}.pdf`);
      }, index * 500);
    });
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden font-sans bg-[#0F172A] text-slate-200 relative">
      {/* --- FILTER HEADER (History Tab) --- */}
      {activeTab === 5 && (
        <div className="shrink-0 p-4 pb-2 z-10">
          <div className="flex flex-wrap gap-2 items-center bg-[#1E293B]/80 backdrop-blur-md p-3 rounded-2xl border border-slate-700/50 shadow-lg">
            <div className="flex items-center bg-[#0F172A] rounded-xl px-3 h-10 border border-slate-700 gap-2">
              <input
                type="datetime-local"
                className="bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
              />
              <span className="text-slate-600 text-xs">→</span>
              <input
                type="datetime-local"
                className="bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
              />
            </div>

            <div className="relative group flex-1 max-w-[200px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl pl-9 pr-4 h-10 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500 transition-all"
                placeholder="ค้นหา..."
                value={searchTextInput}
                onChange={(e) => setSearchTextInput(e.target.value)}
              />
            </div>

            <button
              onClick={handlePerformSearch}
              className="px-4 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 active:scale-95"
            >
              <Search size={14} /> ค้นหา
            </button>

            <div className="h-6 w-[1px] bg-slate-700 mx-1"></div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!isSelectionMode) setIsSelectionMode(true);
                  else {
                    if (selectedIds.size === filteredTickets.length)
                      setSelectedIds(new Set());
                    else
                      setSelectedIds(new Set(filteredTickets.map((t) => t.id)));
                  }
                }}
                className={`px-4 h-10 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  isSelectionMode
                    ? "bg-slate-700 border-blue-500 text-blue-400"
                    : "bg-[#0F172A] text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
                }`}
              >
                <CheckSquare size={14} />
                {isSelectionMode ? "เลือกทั้งหมด" : "เลือก"}
              </button>

              {isSelectionMode && (
                <>
                  <button
                    onClick={handleSaveSelectedPDF}
                    disabled={selectedIds.size === 0}
                    className="px-4 h-10 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Download size={14} /> PDF ({selectedIds.size})
                  </button>
                  <button
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedIds(new Set());
                    }}
                    className="px-4 h-10 bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition-all"
                  >
                    ยกเลิก
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- DATA LIST AREA --- */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-700/50">
              <History size={40} className="opacity-30" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-40">
              {activeFilters.hasSearched
                ? "No History Found"
                : "กรุณากดปุ่มค้นหาเพื่อดูข้อมูล"}
            </p>
          </div>
        ) : activeTab === 5 ? (
          /* ✅ TABLE LAYOUT: SELECT Fits Content + Others Shared Equally */
          <div className="bg-[#1E293B]/50 border border-slate-700 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-500">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-[#0F172A] text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-700">
                  {/* ช่องแรกกว้างแค่ 80px พอดีคำว่า SELECT */}
                  <th className="px-4 py-3 w-[80px] text-left font-bold">
                    SELECT
                  </th>
                  {/* คอลัมน์ที่เหลือไม่ต้องใส่ความกว้าง มันจะหารกันเองเท่าๆ กัน */}
                  <th className="px-4 py-3 text-left font-bold">Ticket ID</th>
                  <th className="px-4 py-3 text-left font-bold">Machine</th>
                  <th className="px-4 py-3 text-left font-bold">Issue</th>
                  <th className="px-4 py-3 text-left font-bold">Date/Time</th>
                  <th className="px-4 py-3 text-left font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30 text-[11px]">
                {filteredTickets.map((ticket) => {
                  const dateVal =
                    ticket.closed_at || ticket.approved_at || ticket.created_at;
                  const dateObj = dateVal?.toDate
                    ? dateVal.toDate()
                    : new Date(dateVal);
                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className="hover:bg-blue-600/5 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3 text-left">
                        {isSelectionMode ? (
                          <div
                            onClick={(e) => toggleSelect(ticket.id, e)}
                            className="cursor-pointer inline-block"
                          >
                            {selectedIds.has(ticket.id) ? (
                              <CheckSquare
                                size={16}
                                className="text-blue-500"
                              />
                            ) : (
                              <Square size={16} className="text-slate-600" />
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 ml-1">#</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-blue-400">
                        {ticket.id}
                      </td>
                      <td className="px-4 py-3 text-left text-white font-bold truncate">
                        {ticket.machine_name}
                      </td>
                      <td className="px-4 py-3 text-left text-slate-300 truncate">
                        {ticket.issue_item}
                      </td>
                      <td className="px-4 py-3 text-left text-slate-400 font-mono">
                        {dateObj.toLocaleString("th-TH", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-left">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          CLOSED
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* --- CARD LAYOUT (Other Tabs) --- */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-24">
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => setSelectedTicket(ticket)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB Create Button */}
      {activeTab !== 5 && canRequest && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl shadow-xl shadow-blue-900/30 flex items-center justify-center z-50 transition-all hover:scale-105 active:scale-95 border border-white/10"
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      )}

      {/* Modals */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          user={user}
          onClose={() => setSelectedTicket(null)}
          onDelete={handleDeleteTicket}
          mode={
            activeTab === 5 ? "history" : activeTab === 4 ? "approve" : "repair"
          }
        />
      )}
      {showCreate && (
        <CreateTicketModal user={user} onClose={() => setShowCreate(false)} />
      )}
      <ConfirmPasswordModal
        isOpen={showPasswordGuard}
        onClose={() => setShowPasswordGuard(false)}
        onConfirm={pendingAction}
        userPass={user.pass}
        message={guardMessage}
      />
    </div>
  );
}

// ==========================================
// MAINTENANCE MODULE (With Mobile Header)
// ==========================================
export function MaintenanceModule({ currentUser, activeTab, onExit }: any) {
  const defaultView = 1;

  return (
    <div className="bg-[#0F172A] w-full h-full flex flex-col overflow-hidden relative text-slate-200">
      {/* ✅ MOBILE HEADER (แสดงเฉพาะมือถือ) */}
      <div className="bg-[#1E293B] border-b border-slate-700 px-4 py-3 flex items-center justify-between shrink-0 z-30 shadow-md md:hidden">
        <div className="flex items-center gap-3">
          {onExit && (
            <button
              onClick={onExit}
              className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors border border-slate-600 shadow-sm"
            >
              <ChevronRight size={24} className="transform rotate-180" />
            </button>
          )}
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-white leading-none flex items-center gap-2">
              <Wrench className="text-orange-500" size={20} />
              Maintenance
            </h1>
          </div>
        </div>
      </div>

      {/* เรียก Dashboard */}
      <MaintenanceDashboard
        user={currentUser}
        activeTab={activeTab || defaultView}
      />
    </div>
  );
}

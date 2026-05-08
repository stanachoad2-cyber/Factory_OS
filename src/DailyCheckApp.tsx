import React, { useState, useEffect, useRef, useMemo } from "react"; // Rebuild trigger
import html2pdf from "html2pdf.js";
import { db } from "./firebase";
const LOGO_URL = "/logo.png";
import { createPortal } from "react-dom";
// import MonthlySummaryReport from "./MonthlySummaryReport";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
  serverTimestamp,
  setDoc,
  writeBatch,
  getDocs,
  getCountFromServer,
  runTransaction,
  orderBy,
  limit,
  arrayUnion,
  deleteField,
} from "firebase/firestore";

import imageCompression from "browser-image-compression";

import {
  QrCode,
  LogOut,
  CheckCircle,
  ArrowLeft,
  Settings,
  Users,
  Trash2,
  Plus,
  ChevronDown,
  Camera,
  X,
  ClipboardCheck,
  BarChart3,
  ScanLine,
  Filter,
  MinusCircle,
  Crown,
  UserCog,
  CheckSquare,
  Square,
  Pencil,
  Download,
  ImageIcon,
  FileText,
  Loader2,
  AlertTriangle,
  Search,
  History,
  AlertCircle,
  Printer,
  Check,
  Lock,
  Unlock,
  Wrench,
  Play,
  SkipForward,
  Key,
  FileX,
  CheckCircle2,
  Info,
  Clock,
  Droplet,
  Save,
  Home,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";

const getBase64FromUrl = async (url: string): Promise<string> => {
  const data = await fetch(url);
  const blob = await data.blob();
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
  });
};

// ✅ Helper Check Permission
const checkPerm = (user: any, allowedRoles: string[]) => {
  if (user?.username === "Bank" || user?.role === "Admin") return true;
  return allowedRoles.includes(user?.role);
};

const MONTH_OPTIONS = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

// ==========================================
// CONFIGURATION: Inspection Modes (Scalable)
// ==========================================
export type SystemModeId = "DAILY" | "DEW_POINT";

export const INSPECTION_MODES = [
  {
    id: "DAILY" as SystemModeId,
    label: "Daily Check",
    icon: ClipboardCheck,
    bgColor: "bg-green-600",
    textColor: "text-green-500",
    glowColor: "rgba(22, 163, 74, 0.4)",
  },
  {
    id: "DEW_POINT" as SystemModeId,
    label: "Dew Point",
    icon: Droplet,
    bgColor: "bg-blue-600",
    textColor: "text-blue-400",
    glowColor: "rgba(37, 99, 235, 0.4)",
  },
];

const ModeDropdown = ({ value, onChange, disabled }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMode = useMemo(() =>
    INSPECTION_MODES.find(m => m.id === value) || INSPECTION_MODES[0]
    , [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 border ${isOpen ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' : 'border-slate-700 bg-slate-900/50 hover:bg-slate-800'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className={`p-1.5 rounded-lg ${currentMode.bgColor} text-white shadow-md`}>
          <currentMode.icon size={14} />
        </div>
        <span className="text-xs font-black text-white uppercase tracking-tight hidden sm:inline">
          {currentMode.label}
        </span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-1.5 space-y-1">
            {INSPECTION_MODES.map((mode) => {
              const isSelected = value === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    onChange(mode.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isSelected
                    ? `${mode.bgColor} text-white shadow-lg`
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                >
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-slate-800'} text-inherit`}>
                    <mode.icon size={16} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[11px] font-black uppercase tracking-tight leading-none mb-1">
                      {mode.label}
                    </span>
                    <span className={`text-[8px] font-bold uppercase opacity-60 ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                      {mode.id.replace('_', ' ')} Mode
                    </span>
                  </div>
                  {isSelected && <Check size={14} className="ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = "พิมพ์เพื่อค้นหา...",
  onAddNew,
  disabled,
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === "All"
    ) {
      setInputValue("");
      return;
    }
    const match = (options || []).find((item: any) => {
      const itemVal =
        typeof item === "string"
          ? item
          : item.value !== undefined
            ? item.value
            : item.name;
      return String(itemVal) === String(value);
    });

    if (match) {
      const label =
        typeof match === "string" ? match : match.label || match.name;
      setInputValue(String(label));
    } else {
      setInputValue(String(value));
    }
    setIsTyping(false);
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsTyping(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredOptions = useMemo(() => {
    if (!options) return [];
    if (!isTyping || !inputValue) return options;

    const safeInput = String(inputValue).toLowerCase();
    return options.filter((item: any) => {
      const label =
        typeof item === "string" ? item : item.label || item.name || "";
      return String(label).toLowerCase().includes(safeInput);
    });
  }, [options, inputValue, isTyping]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            disabled={disabled}
            className={`w-full bg-[#0F172A] border ${isOpen ? "border-blue-500" : "border-slate-600"
              } rounded-lg py-2.5 pl-3 pr-10 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-500`}
            placeholder={placeholder}
            value={inputValue}
            autoComplete="off"
            onClick={() => {
              if (!disabled) {
                setIsOpen(true);
                setIsTyping(false);
              }
            }}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsTyping(true);
              setIsOpen(true);
            }}
          />
          <div
            className="absolute right-0 top-0 h-full w-10 flex items-center justify-center cursor-pointer"
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                setIsTyping(false);
              }
            }}
          >
            <ChevronDown
              className={`text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""
                }`}
              size={16}
            />
          </div>
        </div>
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            disabled={disabled}
            className="bg-blue-600 hover:bg-blue-500 text-white w-[42px] rounded-lg transition-colors flex items-center justify-center shrink-0 disabled:opacity-50 shadow-lg"
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-[#1E293B] border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
          <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option: any, idx: number) => {
                const label =
                  typeof option === "string"
                    ? option
                    : option.label || option.name;
                const val =
                  typeof option === "string"
                    ? option
                    : option.value !== undefined
                      ? option.value
                      : option.name;
                return (
                  <div
                    key={idx}
                    className="px-3 py-2 hover:bg-blue-600/20 hover:text-blue-400 text-slate-300 text-sm rounded cursor-pointer transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(val);
                      setInputValue(label);
                      setIsOpen(false);
                      setIsTyping(false);
                    }}
                  >
                    {label}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                ไม่พบข้อมูล
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 1. TYPES & HELPERS
// ==========================================

type ResultType = "NORMAL" | "ABNORMAL" | "FILTER" | "NA";
type UserRole = "super_admin" | "admin" | "staff";

interface ChecklistItem {
  detail: string;
  method: string;
  oil?: string;
  tool?: string;
  frequency?: string;
  condition?: string;
  time?: string;
  responsible?: string;
  check_daily?: string;
  image_url?: string;
}
interface Machine {
  id: string;
  name: string;
  process?: string;
  material?: string;
  created_at: string;
  checklist: ChecklistItem[];
  systemMode?: "DAILY" | "DEW_POINT";
}
interface LogEntry {
  id: string;
  mid: string;
  checklist_item: string;
  result: ResultType;
  problem_detail?: string;
  inspector: string;
  date: string;
  shift: string;
  timestamp: any;
  linked_ticket_id?: string;
  set_point?: string;
  actual?: string;
  dew_point_val?: string;
  material_name?: string;
}
interface User {
  id?: string;
  username: string;
  pass: string;
  role: UserRole;
  fullname?: string;
  allowedActions?: string[];
  permissions?: any;
}
interface AuditLog {
  id: string;
  mid: string;
  year: number;
  month: number;
  day: number;
  shift: string; // เพิ่ม shift เพื่อแยกกะ
  auditor: string;
}

const getThaiDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getShift = () => {
  const h = new Date().getHours();
  return h >= 8 && h < 20 ? "D" : "N";
};

const formatTime = (ts: any) => {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getResultDisplay = (result: ResultType) => {
  switch (result) {
    case "NORMAL":
      return { symbol: "✓", color: "text-green-500", text: "ปกติ" };
    case "ABNORMAL":
      return { symbol: "✕", color: "text-red-500", text: "ผิดปกติ" };
    case "FILTER":
      return { symbol: "△", color: "text-blue-400", text: "เป่ากรอง" };
    case "NA":
      return { symbol: "-", color: "text-slate-400", text: "ไม่ใช้งาน" };
    default:
      return { symbol: "?", color: "text-slate-600", text: "-" };
  }
};

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const safeAreaClass =
  "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]";
// ==========================================
// 2. DATABASE FUNCTIONS
// ==========================================

const deleteMachineAndLogs = async (mid: string) => {
  const batch = writeBatch(db);
  const logsQ = query(collection(db, "logs"), where("mid", "==", mid));
  (await getDocs(logsQ)).forEach((d) => batch.delete(d.ref));
  const auditQ = query(collection(db, "audit_logs"), where("mid", "==", mid));
  (await getDocs(auditQ)).forEach((d) => batch.delete(d.ref));
  const mQ = query(collection(db, "machines"), where("id", "==", mid));
  (await getDocs(mQ)).forEach((d) => batch.delete(d.ref));
  await batch.commit();
};

const deleteSelectedLogs = async (
  logIds: string[],
  mid: string,
  date: string,
  shift: string // รับ shift เพื่อลบ audit log ให้ถูกกะ
) => {
  const batch = writeBatch(db);
  logIds.forEach((id) => batch.delete(doc(db, "logs", id)));
  const dateObj = new Date(date);
  // Audit ID มี shift ต่อท้าย
  const auditId = `${mid}_${dateObj.getFullYear()}_${dateObj.getMonth() + 1
    }_${dateObj.getDate()}_${shift}`;
  batch.delete(doc(db, "audit_logs", auditId));
  await batch.commit();
};

const deleteMonthlyData = async (year: number, month: number) => {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
  const logsQ = query(
    collection(db, "logs"),
    where("date", ">=", startDate),
    where("date", "<=", endDate)
  );
  const auditQ = query(
    collection(db, "audit_logs"),
    where("year", "==", year),
    where("month", "==", month)
  );

  const deleteInBatches = async (q: any) => {
    const snapshot = await getDocs(q);
    const total = snapshot.size;
    if (total === 0) return 0;
    const chunk = 400;
    let batch = writeBatch(db);
    let counter = 0;
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      counter++;
      if (counter >= chunk) {
        await batch.commit();
        batch = writeBatch(db);
        counter = 0;
      }
    }
    if (counter > 0) await batch.commit();
    return total;
  };
  const logsDeleted = await deleteInBatches(logsQ);
  const auditsDeleted = await deleteInBatches(auditQ);
  return logsDeleted + auditsDeleted;
};

// ==========================================
// 3. COMPONENTS
// ==========================================

// ==========================================
// REPLACE 'ConfirmActionModal' WITH THIS
// ==========================================
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
  currentUser: User;
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
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      {/* ✅ Dark Theme Layout */}
      <div className="bg-[#1F1F23] rounded-2xl w-full max-w-xs p-6 shadow-2xl animate-in fade-in zoom-in duration-200 border border-slate-700">
        <div className="text-center mb-4">
          {/* ✅ Key Icon Style (User Management Style) */}
          <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-slate-800/50">
            <Key size={24} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
        </div>

        <div className="mb-4">
          <input
            type="password"
            className={`w-full bg-[#0F1115] border ${error
              ? "border-red-500"
              : "border-slate-600 focus:border-blue-500"
              } rounded-xl px-4 py-2.5 text-center text-white text-sm outline-none transition-all placeholder-slate-600`}
            value={pass}
            onChange={(e) => {
              setPass(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            autoFocus
            placeholder="Password"
          />
          {error && (
            <p className="text-red-400 text-xs mt-2 text-center font-bold animate-pulse">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setPass("");
              setError("");
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 hover:bg-slate-800 font-bold text-xs transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 font-bold text-xs shadow-lg shadow-blue-900/30 transition-all"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

// --- QR PRINT SYSTEM (Dark Theme UI + 5x7 Layout) ---
function QRPrintSystem({
  machines,
  onClose,
}: {
  machines: Machine[];
  onClose: () => void;
}) {
  const [step, setStep] = useState<"FILTER" | "PREVIEW">("FILTER");
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [filterProcess, setFilterProcess] = useState("All");

  const processes = [
    "All",
    ...Array.from(
      new Set(
        machines.map((m) => m.process || "General").filter((p) => p !== "")
      )
    ).sort(),
  ];

  const filteredMachines = machines.filter((m) => {
    if (filterProcess === "All") return true;
    const pName = m.process || "General";
    return pName === filterProcess;
  });

  const toggleMachine = (id: string) => {
    if (selectedMachineIds.includes(id))
      setSelectedMachineIds(selectedMachineIds.filter((mid) => mid !== id));
    else setSelectedMachineIds([...selectedMachineIds, id]);
  };

  const toggleAll = () => {
    const visibleIds = filteredMachines.map((m) => m.id);
    const allSelected = visibleIds.every((id) =>
      selectedMachineIds.includes(id)
    );
    if (allSelected)
      setSelectedMachineIds(
        selectedMachineIds.filter((id) => !visibleIds.includes(id))
      );
    else
      setSelectedMachineIds(
        Array.from(new Set([...selectedMachineIds, ...visibleIds]))
      );
  };

  const handlePrint = () => {
    window.print();
  };

  const cardsToPrint = machines
    .filter((m) => selectedMachineIds.includes(m.id))
    .map((m) => {
      const isDew = (m.systemMode || "DAILY") === "DEW_POINT";
      const suffix = isDew ? "-DP" : "-DC";
      const modeText = isDew ? "(Dew Point)" : "(Daily)";
      return {
        machineName: `${m.name} ${modeText}`,
        process: m.process || "-",
        qrValue: `${m.name}${suffix}`,
      };
    });

  const pageSize = 35;
  const pages = [];
  for (let i = 0; i < cardsToPrint.length; i += pageSize) {
    pages.push(cardsToPrint.slice(i, i + pageSize));
  }

  // --- FILTER UI (Dark Theme) ---
  if (step === "FILTER") {
    return (
      <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 print:hidden backdrop-blur-sm">
        <div className="bg-[#1E293B] rounded-xl w-full max-w-lg p-6 relative h-[80vh] flex flex-col border border-slate-700 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-red-400 z-50 transition-colors"
          >
            <X />
          </button>

          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400 border-b border-slate-700 pb-4">
            <Printer /> เลือกเครื่องจักร (Print A4)
          </h3>

          <div className="mb-4 bg-[#0F172A] p-3 rounded-lg border border-slate-700">
            <label className="block text-xs font-bold text-slate-400 mb-1">
              กรองตาม Line ผลิต:
            </label>
            <select
              value={filterProcess}
              onChange={(e) => setFilterProcess(e.target.value)}
              className="w-full border border-slate-600 rounded p-2 text-sm bg-[#1E293B] text-white focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {processes.map((p, i) => (
                <option key={i} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="border border-slate-700 rounded-lg overflow-hidden flex-1 flex flex-col bg-[#0F172A]">
            <div
              onClick={toggleAll}
              className="p-3 bg-[#1E293B] flex items-center gap-3 cursor-pointer hover:bg-slate-700 border-b border-slate-700 transition-colors"
            >
              <span className="font-bold text-slate-200">
                เลือกทั้งหมด ({filteredMachines.length})
              </span>
            </div>
            <div className="overflow-y-auto p-2 flex-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
              {filteredMachines.map((m) => (
                <div
                  key={m.id}
                  onClick={() => toggleMachine(m.id)}
                  className="flex items-center gap-3 p-2 hover:bg-slate-700/50 cursor-pointer rounded border-b border-slate-800 last:border-0 transition-colors"
                >
                  {selectedMachineIds.includes(m.id) ? (
                    <CheckSquare className="text-blue-500" size={20} />
                  ) : (
                    <Square className="text-slate-600" size={20} />
                  )}
                  <div>
                    <div className="font-bold text-slate-300">{m.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700">
            <button
              disabled={cardsToPrint.length === 0}
              onClick={() => setStep("PREVIEW")}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold w-full disabled:bg-slate-700 disabled:text-slate-500 hover:bg-blue-700 transition-colors shadow-lg"
            >
              ไปหน้าพิมพ์ ({cardsToPrint.length})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- PRINT CONTENT (Portal) ---
  const printContent = (
    <div
      id="print-portal-root"
      className="hidden print:block absolute top-0 left-0 w-full"
    >
      {pages.map((pageCards, pageIndex) => (
        <div
          key={pageIndex}
          className="w-[210mm] min-h-[297mm] mx-auto bg-white px-[5mm] py-[5mm] print:break-after-page relative"
        >
          <div className="grid grid-cols-5 gap-1 justify-items-center content-start">
            {pageCards.map((card, idx) => (
              <div
                key={idx}
                className="aspect-square border-[2px] border-black rounded-md p-0.5 flex flex-col items-center justify-between w-full break-inside-avoid text-center bg-white relative overflow-hidden"
              >
                <div className="w-full bg-gray-200 text-black py-[1px] rounded-sm border-b border-black mb-[1px]">
                  <h4 className="font-bold text-[7px] uppercase tracking-tight truncate px-1 leading-none">
                    {card.process}
                  </h4>
                </div>
                <div className="flex-1 flex items-center justify-center w-full relative h-full overflow-hidden">
                  <div className="relative border border-dashed border-black p-[1px] bg-white rounded inline-block">
                    <QRCodeSVG
                      value={card.qrValue}
                      size={100}
                      level={"H"}
                      includeMargin={false}
                    />
                    <img
                      src={LOGO_URL}
                      alt="Logo"
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 object-contain z-10 bg-white p-[1px] rounded shadow-sm border border-black"
                    />
                  </div>
                </div>
                <div className="w-full text-center mt-[1px] flex items-center justify-center min-h-[12px]">
                  <h3 className="text-[8px] font-black text-black uppercase leading-none truncate px-1 w-full">
                    {card.machineName}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* PREVIEW UI (Dark Theme) */}
      <div className="fixed inset-0 bg-[#0F172A] z-[100] overflow-y-auto text-slate-200 print:hidden">
        {/* Header Bar */}
        <div className="bg-[#1E293B] shadow-lg p-4 flex justify-between items-center sticky top-0 z-50 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("FILTER")}
              className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 text-white transition-colors"
            >
              <ArrowLeft />
            </button>
            <div>
              <h2 className="font-bold text-lg text-white">
                ตัวอย่างก่อนพิมพ์
              </h2>
              <p className="text-xs text-slate-400">
                5 คอลัมน์ x 7 แถว (35 ดวง/หน้า) | พื้นที่เต็มพิกัด
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
            >
              ปิด
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg transition-colors"
            >
              <Printer size={18} /> สั่งพิมพ์
            </button>
          </div>
        </div>

        {/* Paper Preview */}
        <div className="w-[210mm] mx-auto my-8 space-y-8 pb-20">
          {pages.map((pageCards, pageIndex) => (
            <div key={pageIndex} className="relative group">
              {/* Page Number Badge */}
              <div className="absolute top-0 left-[-40px] text-slate-500 text-xs font-bold bg-[#1E293B] p-2 rounded border border-slate-700 hidden xl:block">
                หน้า {pageIndex + 1}
              </div>

              {/* The Paper (Must be White) */}
              <div className="bg-white shadow-2xl min-h-[297mm] px-[5mm] py-[5mm] relative">
                <div className="grid grid-cols-5 gap-1 justify-items-center content-start">
                  {pageCards.map((card, idx) => (
                    <div
                      key={idx}
                      className="aspect-square border-[2px] border-black rounded-md p-0.5 flex flex-col items-center justify-between w-full text-center bg-white relative overflow-hidden"
                    >
                      <div className="w-full bg-gray-200 text-black py-[1px] rounded-sm border-b border-black mb-[1px]">
                        <h4 className="font-bold text-[7px] uppercase tracking-tight truncate px-1 leading-none">
                          {card.process}
                        </h4>
                      </div>
                      <div className="flex-1 flex items-center justify-center w-full relative h-full overflow-hidden">
                        <div className="relative border border-dashed border-black p-[1px] bg-white rounded inline-block">
                          <QRCodeSVG
                            value={card.qrValue}
                            size={100}
                            level={"H"}
                            includeMargin={false}
                          />
                          <img
                            src={LOGO_URL}
                            alt="Logo"
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 object-contain z-10 bg-white p-[1px] rounded shadow-sm border border-black"
                          />
                        </div>
                      </div>
                      <div className="w-full text-center mt-[1px] flex items-center justify-center min-h-[12px]">
                        <h3 className="text-[8px] font-black text-black uppercase leading-none truncate px-1 w-full">
                          {card.machineName}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {createPortal(printContent, document.body)}

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { visibility: hidden; }
          #print-portal-root, #print-portal-root * { visibility: visible; }
          #print-portal-root { position: absolute; left: 0; top: 0; width: 100%; z-index: 9999; }
          .print\\:break-after-page { page-break-after: always; }
          .print\\:break-after-page:last-child { page-break-after: auto; }
          .grid { display: grid !important; }
        }
      `}</style>
    </>
  );
}

// --- MASTER SHEET MODAL ---
function MasterSheetModal({
  machine,
  onClose,
}: {
  machine: Machine;
  onClose: () => void;
}) {
  return (
    // ✅ แก้จุดที่ 1: เพิ่ม pt-20 เพื่อดัน Modal ทั้งก้อนลงมาจากขอบบนเยอะๆ
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-2 pt-15">
      {/* ✅ แก้จุดที่ 2: เปลี่ยนจาก h-[95vh] เป็น max-h-[85vh] 
          เพื่อให้ความสูงไม่เกิน 85% ของหน้าจอ จะได้ไม่ไปชนขอบบน */}
      <div className="bg-white w-full max-w-[95%] max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl flex flex-col relative">
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b bg-gray-50 sticky top-0 z-20">
          <h3 className="font-bold text-lg flex items-center gap-2 text-gray-800">
            <FileText className="text-indigo-600" /> Daily Checked Sheet
            (ใบมาตรฐาน)
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 min-w-[1200px] overflow-x-auto">
          <div className="border-2 border-black text-sm text-black">
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 grid grid-cols-12">
                <div className="col-span-4 border-r border-b border-black p-1 font-bold bg-gray-100 flex items-center">
                  ชื่อเครื่องจักร
                </div>
                <div className="col-span-8 border-r border-b border-black p-1 text-center font-bold text-indigo-700 flex items-center justify-center">
                  {machine.name}
                </div>
                <div className="col-span-4 border-r border-black p-1 font-bold bg-gray-100 flex items-center">
                  ชื่อกระบวนการผลิต
                </div>
                <div className="col-span-8 border-r border-black p-1 text-center font-bold text-indigo-700 flex items-center justify-center">
                  {machine.process || "-"}
                </div>
              </div>
              <div className="col-span-6 p-1 font-bold text-center bg-gray-100 flex items-center justify-center text-lg">
                Daily Checked Sheet (ใบบันทึกการตรวจสอบเครื่องจักรประจำวัน)
              </div>
            </div>

            <div className="border-b border-black p-2 bg-gray-50 overflow-x-auto">
              <div className="grid grid-cols-7 gap-2 min-w-[1000px]">
                {machine.checklist.map((item, i) => (
                  <div
                    key={i}
                    className="w-full border border-gray-300 p-1 bg-white flex flex-col items-center justify-center h-48 shadow-sm"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={`Point ${i + 1}`}
                        className="w-full h-full object-contain rounded"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs flex-col gap-1">
                        <ImageIcon size={20} />
                        <span>ไม่มีรูป</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[40px_minmax(150px,1fr)_minmax(150px,1fr)_95px_95px_95px_95px_95px_95px_95px]">
              <div className="font-bold border-r border-b border-black p-1 text-center bg-gray-200 flex items-center justify-center">
                No.
              </div>
              <div className="font-bold border-r border-b border-black p-1 text-center bg-gray-200 flex items-center justify-center">
                รายละเอียดการตรวจเช็ค
              </div>
              <div className="font-bold border-r border-b border-black p-1 text-center bg-gray-200 flex items-center justify-center">
                วิธีการตรวจเช็ค
              </div>
              <div className="font-bold border-r border-b border-black p-1 text-center bg-gray-200 text-xs flex items-center justify-center">
                ชนิดน้ำมัน
              </div>
              <div className="font-bold border-r border-b border-black p-1 text-center bg-gray-200 text-xs flex items-center justify-center">
                เครื่องมือ
              </div>
              <div className="font-bold border-r border-b border-black p-1 text-center bg-gray-200 text-xs flex items-center justify-center">
                ความถี่
              </div>
              <div className="font-bold border-r border-b border-black p-1 text-center bg-gray-200 text-xs flex items-center justify-center">
                เงื่อนไข
              </div>
              <div className="font-bold border-r border-b border-black p-1 text-center bg-gray-200 text-xs flex items-center justify-center">
                ใช้เวลา
              </div>
              <div className="font-bold border-r border-b border-black p-1 text-center bg-gray-200 text-xs flex items-center justify-center">
                เช็คทุกวัน
              </div>
              <div className="font-bold border-b border-black p-1 text-center bg-gray-200 text-xs flex items-center justify-center">
                ผู้รับผิดชอบ
              </div>

              {machine.checklist.map((item, idx) => (
                <React.Fragment key={idx}>
                  <div className="border-r border-b border-black p-1 text-center flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                  <div className="border-r border-b border-black p-1 px-2 whitespace-pre-wrap">
                    {item.detail}
                  </div>
                  <div className="border-r border-b border-black p-1 px-2 whitespace-pre-wrap">
                    {item.method}
                  </div>
                  <div className="border-r border-b border-black p-1 text-center text-xs flex items-center justify-center">
                    {item.oil || "-"}
                  </div>
                  <div className="border-r border-b border-black p-1 text-center text-xs flex items-center justify-center">
                    {item.tool || "-"}
                  </div>
                  <div className="border-r border-b border-black p-1 text-center text-xs flex items-center justify-center">
                    {item.frequency || "D"}
                  </div>
                  <div className="border-r border-b border-black p-1 text-center text-xs flex items-center justify-center">
                    {item.condition || "-"}
                  </div>
                  <div className="border-r border-b border-black p-1 text-center text-xs flex items-center justify-center">
                    {item.time || "-"}
                  </div>
                  <div className="border-r border-b border-black p-1 text-center text-xs flex items-center justify-center">
                    {item.check_daily || "-"}
                  </div>
                  <div className="border-b border-black p-1 text-center text-xs flex items-center justify-center">
                    {item.responsible || "Prod"}
                  </div>
                </React.Fragment>
              ))}
            </div>

            <div className="p-3 text-xs border-t border-black bg-gray-50">
              <p className="mb-1">
                <span className="font-bold">ผู้ลงบันทึก :</span>{" "}
                ลงบันทึกการตรวจสอบเครื่องจักรทุกกะ กะละ 1 ครั้ง
              </p>
              <p>
                <span className="font-bold">ผู้ตรวจสอบความถูกต้อง :</span>{" "}
                ตรวจสอบการลงบันทึกของกะเช้าและกะดึก
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- QR MODAL (View Only - No Download) ---
function MachineQRModal({
  machine,
  onClose,
}: {
  machine: Machine;
  onClose: () => void;
}) {
  // ✅ 1. เพิ่ม State สำหรับ Base64 Logo (เพื่อให้รูปเหมือนหน้า Print เป๊ะ)
  const [logoBase64, setLogoBase64] = useState("");

  useEffect(() => {
    getBase64FromUrl(LOGO_URL).then(setLogoBase64);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 text-gray-900">
      <div className="bg-white rounded-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-600 z-50"
        >
          <X />
        </button>

        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-black border-b pb-4">
          <QrCode /> QR Code ประจำเครื่อง
        </h3>

        {/* พื้นที่แสดงผล (View Only - ดีไซน์เดียวกับ A4) */}
        <div className="flex justify-center mb-2">
          {/* ปรับขนาดโชว์ในจอให้ใหญ่เห็นชัด */}
          <div className="w-[280px] border-[4px] border-black rounded-lg p-4 flex flex-col items-center justify-between bg-white text-center shadow-2xl h-[380px]">
            <div className="w-full text-center mb-2">
              <h3 className="text-[18px] font-bold text-black uppercase leading-tight">
                {machine.name}
              </h3>
              <p className="text-[10px] font-bold text-blue-600 mt-0.5">
                {(machine.systemMode || "DAILY") === "DEW_POINT" ? "(Dew Point)" : "(Daily Check)"}
              </p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full">
              <div className="relative border-2 border-dashed border-black p-3 bg-white rounded-lg">
                {/* ใช้ SVG คมชัด */}
                <QRCodeSVG
                  value={`${machine.name}${(machine.systemMode || "DAILY") === "DEW_POINT" ? "-DP" : "-DC"}`}
                  size={160}
                  level={"H"}
                  includeMargin={false}
                />

                {/* โลโก้ Base64 */}
                {logoBase64 && (
                  <img
                    src={logoBase64}
                    alt="Logo"
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 object-contain z-10 bg-white p-0 rounded-md shadow-sm border border-black"
                  />
                )}
              </div>
              <div className="mt-4 text-[14px] font-black text-black leading-tight px-1 uppercase tracking-wide">
                SCAN TO UNLOCK
              </div>
            </div>

            <div className="w-full bg-gray-200 text-black py-2 mt-3 rounded-sm border-t border-black">
              <h4 className="font-bold text-sm uppercase tracking-wider">
                {machine.process || "-"}
              </h4>
            </div>
          </div>
        </div>

        <div className="text-center text-gray-500 text-xs mt-4">
          *หน้านี้สำหรับดูเท่านั้น หากต้องการปริ้นกรุณาใช้ปุ่ม "พิมพ์ QR Code
          (A4)" ในหน้าหลัก
        </div>
      </div>
    </div>
  );
}

// ==========================================
// REPLACE 'DeleteSelectionModal' WITH THIS
// ==========================================
function DeleteSelectionModal({
  machine,
  date,
  shift,
  logs,
  user,
  onClose,
}: {
  machine: Machine;
  date: string;
  shift: string;
  logs: LogEntry[];
  user: User;
  onClose: () => void;
}) {
  const targetLogs = logs.filter(
    (l) => l.mid === machine.id && l.date === date && l.shift === shift
  );
  const isDp = machine.systemMode === "DEW_POINT";

  // ✅ 1. แตกรายการสำหรับ Dew Point (Virtual Items)
  const displayItems = useMemo(() => {
    if (!isDp) return targetLogs.map(l => ({ id: l.id, label: l.checklist_item, type: "STANDARD", log: l }));

    const items: any[] = [];
    targetLogs.forEach(log => {
      if (log.set_point !== undefined)
        items.push({ id: `${log.id}__set_point`, label: "Set point", val: log.set_point, color: "text-blue-400" });
      if (log.actual !== undefined)
        items.push({ id: `${log.id}__actual`, label: "Actual", val: log.actual, color: "text-emerald-400" });
      if (log.dew_point_val !== undefined)
        items.push({ id: `${log.id}__dew_point`, label: "Dew Point Value", val: log.dew_point_val, color: "text-cyan-400" });
      if (log.problem_detail)
        items.push({ id: `${log.id}__remark`, label: "Remark", val: log.problem_detail, color: "text-amber-400" });

      items.push({ id: `${log.id}__result`, label: "สถานะเครื่อง (Machine Status)", val: getResultDisplay(log.result).text, color: getResultDisplay(log.result).color });
    });
    return items;
  }, [targetLogs, isDp]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmPass, setConfirmPass] = useState("");

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id))
      setSelectedIds(selectedIds.filter((x) => x !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const confirmDelete = async () => {
    if (selectedIds.length === 0) return;

    if (!checkPerm(user, ["super_admin", "admin"]) && !user?.allowedActions?.includes("daily_delete")) {
      return alert("⛔️ คุณไม่มีสิทธิ์ลบประวัติการตรวจ");
    }

    if (confirmPass !== user.pass) {
      alert("รหัสผ่านไม่ถูกต้อง!");
      return;
    }

    try {
      const batch = writeBatch(db);

      if (!isDp) {
        // ✅ Standard Delete
        selectedIds.forEach((id) => batch.delete(doc(db, "logs", id)));
      } else {
        // ✅ Dew Point Smart Delete/Update
        const logUpdates: Record<string, any> = {};
        const logDeletions = new Set<string>();

        // เช็คว่าแต่ละ Log โดนเลือกกี่ช่อง
        targetLogs.forEach(log => {
          const fields = [
            `${log.id}__set_point`,
            `${log.id}__actual`,
            `${log.id}__dew_point`,
            `${log.id}__remark`,
            `${log.id}__result`
          ].filter(f => displayItems.some(di => di.id === f));

          const selectedFields = fields.filter(f => selectedIds.includes(f));

          if (selectedFields.length === fields.length || selectedIds.includes(`${log.id}__result`)) {
            // ลบทั้งก้อน (ถ้าเลือกสถานะเครื่อง หรือเลือกครบทุกช่องที่มี)
            batch.delete(doc(db, "logs", log.id));
            logDeletions.add(log.id);
          } else if (selectedFields.length > 0) {
            // อัปเดตลบเฉพาะบางฟิลด์
            const updateObj: any = {};
            if (selectedIds.includes(`${log.id}__set_point`)) updateObj.set_point = deleteField();
            if (selectedIds.includes(`${log.id}__actual`)) updateObj.actual = deleteField();
            if (selectedIds.includes(`${log.id}__dew_point`)) updateObj.dew_point_val = deleteField();
            if (selectedIds.includes(`${log.id}__remark`)) updateObj.problem_detail = deleteField();

            if (Object.keys(updateObj).length > 0) {
              batch.update(doc(db, "logs", log.id), updateObj);
            }
          }
        });
      }

      // ลบ Audit Log ถ้ามีการลบข้อมูลหลัก
      if (selectedIds.length > 0) {
        const dateObj = new Date(date);
        const auditId = `${machine.id}_${dateObj.getFullYear()}_${dateObj.getMonth() + 1}_${dateObj.getDate()}_${shift}`;
        batch.delete(doc(db, "audit_logs", auditId));
      }

      await batch.commit();
      onClose();
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#1F1F23] rounded-2xl w-full max-w-md p-6 relative border border-slate-700 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white z-50"
        >
          <X />
        </button>

        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Trash2 className="text-blue-500" /> เลือกลบข้อมูล
        </h3>
        <p className="text-sm text-slate-400 mb-4 font-mono">
          {date} | Shift {shift}
        </p>

        {displayItems.length === 0 ? (
          <p className="text-center text-slate-500 py-8 border border-dashed border-slate-700 rounded-xl">
            ไม่พบข้อมูลบันทึกในกะนี้
          </p>
        ) : (
          <div className="max-h-60 overflow-y-auto border border-slate-700 rounded-xl divide-y divide-slate-700 mb-4 bg-[#16181C] custom-scrollbar">
            {displayItems.map((item: any) => {
              const isSel = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`p-3 flex justify-between items-center cursor-pointer transition-colors ${isSel ? "bg-blue-600/20" : "hover:bg-slate-800"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {isSel ? (
                      <CheckSquare className="text-blue-500" size={18} />
                    ) : (
                      <Square className="text-slate-600" size={18} />
                    )}
                    <div>
                      <div className={`font-bold text-sm ${item.color || "text-slate-200"}`}>
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        ค่าปัจจุบัน: <span className="text-slate-300">{item.val || "-"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {targetLogs.length > 0 && selectedIds.length > 0 && (
          <div className="mb-4 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Key size={16} className="text-slate-400" />
              <label className="text-xs font-bold text-slate-300 block">
                ยืนยันรหัสผ่านเพื่อลบ:
              </label>
            </div>
            <input
              type="password"
              className="w-full bg-[#0F1115] border border-slate-600 p-2.5 rounded-lg text-sm text-white focus:border-blue-500 outline-none placeholder-slate-600 text-center"
              placeholder="Password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-600 rounded-xl text-slate-400 hover:bg-slate-800 transition-colors text-sm font-bold"
          >
            ยกเลิก
          </button>
          {targetLogs.length > 0 && (
            <button
              disabled={selectedIds.length === 0 || !confirmPass}
              onClick={confirmDelete}
              className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-all shadow-lg ${selectedIds.length > 0 && confirmPass
                ? "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
                }`}
            >
              ลบที่เลือก ({selectedIds.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// REPLACE 'DeleteMonthlyModal' WITH THIS
// ==========================================
function DeleteMonthlyModal({
  onClose,
  user,
}: {
  onClose: () => void;
  user: User;
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1); // Fix index
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmPass, setConfirmPass] = useState("");

  const handleDelete = async () => {
    if (confirmPass !== user.pass) {
      alert("รหัสผ่านไม่ถูกต้อง!");
      return;
    }

    if (
      !confirm(
        `⚠️ ยืนยันการลบข้อมูลทั้งหมดของเดือน ${month}/${year} ?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้!`
      )
    )
      return;

    setIsDeleting(true);
    try {
      const count = await deleteMonthlyData(year, month);
      alert(`ลบข้อมูลเรียบร้อยจำนวน ${count} รายการ`);
      onClose();
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการลบข้อมูล");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      {/* ✅ Dark Theme Container */}
      <div className="bg-[#1F1F23] rounded-2xl w-full max-w-sm p-6 relative border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white"
        >
          <X />
        </button>

        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Trash2 className="text-red-500" /> ลบข้อมูลรายเดือน
        </h3>

        <div className="bg-[#16181C] p-4 rounded-xl border border-slate-700 mb-4">
          <p className="text-xs text-slate-400 font-bold mb-2 uppercase tracking-wider">
            เลือกเดือนที่ต้องการลบ
          </p>
          <div className="flex gap-2 mb-4">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="flex-1 p-2.5 border border-slate-600 rounded-lg bg-[#0F1115] text-white text-sm outline-none focus:border-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  เดือน {m}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 p-2.5 border border-slate-600 rounded-lg bg-[#0F1115] text-white text-sm text-center outline-none focus:border-blue-500"
            />
          </div>

          <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-2">
            <Key size={14} /> ยืนยันรหัสผ่าน:
          </label>
          <input
            type="password"
            className="w-full border border-slate-600 p-2.5 rounded-lg text-sm bg-[#0F1115] text-white text-center outline-none focus:border-blue-500 placeholder-slate-600"
            placeholder="Password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
          />

          <p className="text-[10px] text-red-400 mt-3 flex items-center gap-1 bg-red-500/10 p-2 rounded border border-red-500/20">
            <AlertTriangle size={12} /> ข้อมูลที่ลบแล้วจะไม่สามารถกู้คืนได้
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-600 rounded-xl text-slate-400 hover:bg-slate-800 font-bold text-sm transition-colors"
            disabled={isDeleting}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || !confirmPass}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 shadow-lg shadow-red-900/20 text-sm transition-all"
          >
            {isDeleting ? "กำลังลบ..." : "ยืนยันลบ"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- RESULT SELECTION MODAL ---
function ResultSelectionModal({
  itemName,
  itemMethod,
  onSelect,
  onClose,
}: {
  itemName: string;
  itemMethod: string;
  // ✅ แก้ type: รับ createTicket (boolean) เพิ่ม
  onSelect: (res: ResultType, detail?: string, createTicket?: boolean) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"SELECT" | "INPUT">("SELECT");
  const [problemDetail, setProblemDetail] = useState("");

  const handleSelect = (res: ResultType) => {
    if (res === "ABNORMAL") {
      setStep("INPUT");
    } else {
      onSelect(res);
    }
  };

  // ✅ ฟังก์ชันกดปุ่มบันทึก (แยก logic ตามปุ่มที่กด)
  const handleSaveAbnormal = (createTicket: boolean) => {
    if (!problemDetail.trim()) {
      alert("กรุณาระบุรายละเอียดปัญหา");
      return;
    }
    // ส่งค่า true/false กลับไปบอก ScanPage ว่าจะเปิดใบงานไหม
    onSelect("ABNORMAL", problemDetail, createTicket);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-bounce-in">
        <h3 className="text-xl font-bold text-center mb-2 text-indigo-700">
          {itemName}
        </h3>

        {step === "SELECT" ? (
          <>
            <div className="bg-gray-50 p-3 rounded-lg border mb-6 text-center">
              <span className="text-xs text-gray-400 font-bold uppercase block mb-1">
                วิธีการตรวจเช็ค (Method)
              </span>
              <p className="text-gray-700 font-medium">{itemMethod}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSelect("NORMAL")}
                className="flex flex-col items-center justify-center p-4 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 transition-colors"
              >
                <CheckCircle className="text-green-600 mb-2" size={32} />
                <span className="font-bold text-green-700">ปกติ</span>
              </button>
              <button
                onClick={() => handleSelect("ABNORMAL")}
                className="flex flex-col items-center justify-center p-4 bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 transition-colors"
              >
                <X className="text-red-600 mb-2" size={32} />
                <span className="font-bold text-red-700">ผิดปกติ</span>
              </button>
              <button
                onClick={() => handleSelect("FILTER")}
                className="flex flex-col items-center justify-center p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <Filter className="text-blue-600 mb-2" size={32} />
                <span className="font-bold text-blue-700">เป่ากรอง</span>
              </button>
              <button
                onClick={() => handleSelect("NA")}
                className="flex flex-col items-center justify-center p-4 bg-gray-100 border-2 border-gray-300 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <MinusCircle className="text-gray-800 mb-2" size={32} />
                <span className="font-bold text-gray-800">ไม่ใช้งาน</span>
              </button>
            </div>
          </>
        ) : (
          <div className="animate-in fade-in zoom-in">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4 text-center">
              <AlertTriangle className="mx-auto text-red-500 mb-2" />
              <h4 className="font-bold text-red-700">ระบุปัญหาที่พบ</h4>
            </div>
            <textarea
              className="w-full border-2 border-red-200 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-red-500 focus:outline-none"
              placeholder="เช่น สายพานขาด, มีเสียงดัง, น็อตหลวม..."
              value={problemDetail}
              onChange={(e) => setProblemDetail(e.target.value)}
              autoFocus
            />

            {/* ✅✅ แยก 2 ปุ่มอยู่ข้างกันตรงนี้ครับ ✅✅ */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleSaveAbnormal(false)}
                className="flex-1 py-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 shadow-md text-sm transition-colors"
              >
                บันทึก (ไม่แจ้ง)
              </button>
              <button
                onClick={() => handleSaveAbnormal(true)}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md flex items-center justify-center gap-1 text-sm transition-colors"
              >
                <Wrench size={16} /> แจ้งซ่อมทันที
              </button>
            </div>

            <button
              onClick={() => setStep("SELECT")}
              className="mt-3 w-full py-2 text-gray-500 text-sm hover:underline"
            >
              ย้อนกลับ
            </button>
          </div>
        )}

        {step === "SELECT" && (
          <button
            onClick={onClose}
            className="mt-6 w-full py-3 text-gray-500 font-medium hover:bg-gray-100 rounded-lg"
          >
            ยกเลิก
          </button>
        )}
      </div>
    </div>
  );
}

// --- CAMERA SCANNER ---
function CameraScanner({
  onScan,
  onClose,
}: {
  onScan: (res: string) => void;
  onClose: () => void;
}) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isFoundRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    const startScanning = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (isFoundRef.current) return;
            isFoundRef.current = true;
            onScan(decodedText);
          },
          () => { }
        );
      } catch (err) {
        setErrorMsg("ไม่สามารถเปิดกล้องได้ (กรุณาใช้ HTTPS)");
      }
    };
    startScanning();
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current
              .stop()
              .then(() => scannerRef.current?.clear())
              .catch(() => scannerRef.current?.clear());
          } else {
            scannerRef.current.clear();
          }
        } catch (e) { }
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-4 rounded-xl w-full max-w-sm relative flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:bg-gray-100 p-1 rounded-full"
        >
          <X />
        </button>
        <h3 className="font-bold text-lg mb-4 text-center">📷 Scan QR</h3>
        {errorMsg ? (
          <div className="text-red-500 text-center p-4 bg-red-50 rounded mb-4 text-sm">
            {errorMsg}
          </div>
        ) : (
          <div className="w-64 h-64 bg-black overflow-hidden rounded-lg relative">
            <div id="reader" className="w-full h-full object-cover"></div>
          </div>
        )}
        <p className="text-center text-sm text-gray-500 mt-4">
          ส่องไปที่ QR Code
        </p>
      </div>
    </div>
  );
}

// --- MANAGE USERS MODAL (Sorted & With Confirm) ---
function ManageUsersModal({
  onClose,
  currentUser,
}: {
  onClose: () => void;
  currentUser: User;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [tempRole, setTempRole] = useState<UserRole>("staff");

  // State สำหรับ Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    targetId: string;
    targetName: string;
  }>({ isOpen: false, targetId: "", targetName: "" });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));

      // Sorting Logic
      data.sort((a, b) => {
        if (a.username === "Bank") return -1;
        if (b.username === "Bank") return 1;
        const roleOrder: Record<string, number> = {
          super_admin: 1,
          admin: 2,
          staff: 3,
        };
        const roleA = roleOrder[a.role] || 4;
        const roleB = roleOrder[b.role] || 4;
        if (roleA !== roleB) return roleA - roleB;
        return a.username.localeCompare(b.username);
      });

      setUsers(data);
    });
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    if (u && p) {
      if (u === "Bank") {
        alert("ห้ามสร้าง User ชื่อ Bank ซ้ำ");
        return;
      }
      await addDoc(collection(db, "users"), {
        username: u,
        pass: p,
        role: role,
      });
      setU("");
      setP("");
      setRole("staff");
    }
  };

  const openDeleteConfirm = (id: string, name: string) => {
    if (name === "Bank") {
      alert("ห้ามลบ Super Admin หลัก");
      return;
    }
    setConfirmModal({ isOpen: true, targetId: id, targetName: name });
  };

  const executeDelete = async () => {
    await deleteDoc(doc(db, "users", confirmModal.targetId));
    setConfirmModal({ isOpen: false, targetId: "", targetName: "" });
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-100 text-purple-700";
      case "admin":
        return "bg-indigo-100 text-indigo-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const openEditRole = (user: User) => {
    setEditingUser(user);
    setTempRole(user.role);
  };
  const closeEditRole = () => {
    setEditingUser(null);
  };

  const saveRoleChange = async () => {
    if (!editingUser || !editingUser.id) return;
    if (
      !confirm(
        `คุณต้องการเปลี่ยนสิทธิ์ของ "${editingUser.username}" \nจาก: ${editingUser.role} \nเป็น: ${tempRole} \nใช่หรือไม่?`
      )
    )
      return;
    await updateDoc(doc(db, "users", editingUser.id), { role: tempRole });
    closeEditRole();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 pt-14">
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={executeDelete}
        title="ลบผู้ใช้งาน"
        message={`คุณต้องการลบผู้ใช้ "${confirmModal.targetName}" ใช่หรือไม่?`}
        currentUser={currentUser}
      />

      <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 mt-[env(safe-area-inset-top)] text-gray-400 hover:text-gray-700 p-1 z-50"
        >
          <X size={24} />
        </button>
        <h2 className="text-xl font-bold mb-4 flex gap-2 items-center text-indigo-700">
          <Users /> จัดการผู้ใช้
        </h2>
        <div className="bg-indigo-50 p-3 rounded mb-4 border border-indigo-100">
          <h3 className="text-sm font-bold text-gray-700 mb-2">
            เพิ่มผู้ใช้ใหม่
          </h3>
          <input
            className="w-full mb-2 p-2 border rounded"
            placeholder="Username"
            value={u}
            onChange={(e) => setU(e.target.value)}
          />
          <input
            className="w-full mb-2 p-2 border rounded"
            placeholder="Password"
            value={p}
            onChange={(e) => setP(e.target.value)}
          />
          <div className="flex gap-2 mb-2">
            <select
              className="p-2 border rounded text-sm flex-1"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <button
            onClick={handleAdd}
            className="w-full bg-green-600 text-white p-2 rounded text-sm font-bold hover:bg-green-700"
          >
            เพิ่ม
          </button>
        </div>
        <div className="max-h-60 overflow-y-auto space-y-2">
          {users.map((us) => (
            <div
              key={us.id}
              className={`flex justify-between items-center p-3 border rounded-lg shadow-sm ${us.username === "Bank"
                ? "bg-purple-50 border-purple-200"
                : "bg-white"
                }`}
            >
              <div>
                <div className="font-bold text-gray-800 flex items-center gap-1">
                  {us.username}{" "}
                  {us.username === "Bank" && (
                    <Crown
                      size={14}
                      className="text-purple-600 fill-purple-600"
                    />
                  )}
                </div>
                <div className="text-xs mt-0.5">
                  {us.username === "Bank" ? (
                    <span className="text-purple-700 font-bold bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">
                      Super Admin
                    </span>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded-full inline-block ${getRoleBadge(
                        us.role
                      )}`}
                    >
                      {us.role}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {us.username !== "Bank" && (
                  <>
                    <button
                      onClick={() => openEditRole(us)}
                      className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                      title="เปลี่ยนสิทธิ์"
                    >
                      <UserCog size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(us.id!, us.username)}
                      className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        {editingUser && (
          <div className="absolute inset-0 z-10 bg-black/60 rounded-xl flex items-center justify-center p-4">
            <div className="bg-white p-5 rounded-lg shadow-xl w-full border animate-in fade-in zoom-in duration-200">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-indigo-700">
                <UserCog /> แก้ไขสิทธิ์
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                ผู้ใช้งาน:{" "}
                <span className="font-bold">{editingUser.username}</span>
              </p>
              <label className="text-xs font-bold text-gray-400">
                เลือกสิทธิ์ใหม่:
              </label>
              <select
                className="w-full p-2 border rounded mb-4 mt-1 bg-gray-50"
                value={tempRole}
                onChange={(e) => setTempRole(e.target.value as UserRole)}
              >
                <option value="staff">Staff (พนักงานทั่วไป)</option>
                <option value="admin">Admin (ผู้ดูแล)</option>
                <option value="super_admin">Super Admin (ผู้ดูแลสูงสุด)</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={closeEditRole}
                  className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={saveRoleChange}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// --- MANAGE MACHINES MODAL (Updated: Password Guard on Save) ---
function ManageMachinesModal({
  machines,
  user,
  onClose,
}: {
  machines: Machine[];
  user: User;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [process, setProcess] = useState("");

  const [checklist, setChecklist] = useState<
    (ChecklistItem & { image_file?: File; preview_url?: string })[]
  >([
    {
      detail: "",
      method: "",
      oil: "",
      tool: "",
      frequency: "",
      condition: "",
      time: "",
      responsible: "",
      check_daily: "",
      image_url: "",
    },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<Machine | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // ✅ เพิ่ม State สำหรับ Password Guard
  const [showGuard, setShowGuard] = useState(false);
  const [guardMessage, setGuardMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<() => void>(() => { });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    targetM: Machine | null;
  }>({ isOpen: false, targetM: null });

  const [filterProcess, setFilterProcess] = useState("All");

  const processes = [
    "All",
    ...Array.from(
      new Set(
        machines.map((m) => m.process || "General").filter((p) => p !== "")
      )
    ).sort(),
  ];

  const filteredMachines = machines.filter((m) => {
    if (filterProcess === "All") return true;
    const pName = m.process || "General";
    return pName === filterProcess;
  });

  const uploadToCloudinary = async (file: File) => {
    const cloudName = "dmqcyeu9a";
    const uploadPreset = "dailycheck_preset";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", "daily_check_app");

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handleFileSelect = async (file: File, index: number) => {
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const list = [...checklist];
      list[index].image_file = compressedFile;
      list[index].preview_url = URL.createObjectURL(compressedFile);
      setChecklist(list);
    } catch (error) {
      console.error("Compression error:", error);
      alert("ไม่สามารถจัดการรูปภาพนี้ได้");
    }
  };

  const handleAddRow = () => {
    setChecklist([
      ...checklist,
      {
        detail: "",
        method: "",
        oil: "",
        tool: "",
        frequency: "",
        condition: "",
        time: "",
        responsible: "",
        check_daily: "",
        image_url: "",
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    const list = [...checklist];
    list.splice(index, 1);
    setChecklist(list);
  };

  const handleChecklistChange = (
    index: number,
    field: keyof ChecklistItem,
    value: string
  ) => {
    const list = [...checklist];
    // @ts-ignore
    list[index][field] = value;
    setChecklist(list);
  };

  const handleEdit = (m: Machine) => {
    setName(m.name);
    setProcess(m.process || "");
    const loadedChecklist = m.checklist.map((item) => ({
      ...item,
      check_daily: item.check_daily || "ทุกวัน",
      image_url: item.image_url || "",
      preview_url: item.image_url || "",
    }));
    setChecklist(loadedChecklist);
    setEditingId(m.id);
  };

  const handleCancelEdit = () => {
    setName("");
    setProcess("");
    setChecklist([
      {
        detail: "",
        method: "",
        oil: "",
        tool: "",
        frequency: "",
        condition: "",
        time: "",
        responsible: "",
        check_daily: "ทุกวัน",
        image_url: "",
      },
    ]);
    setEditingId(null);
  };

  // ✅ ฟังก์ชันหลักที่ใช้บันทึกจริง (ถูกเรียกหลังจากใส่รหัสผ่านถูก)
  const executeSave = async () => {
    setIsUploading(true);
    try {
      const validChecklist = checklist.filter(
        (item) => item.detail.trim() !== ""
      );
      const finalChecklist = await Promise.all(
        validChecklist.map(async (item) => {
          let finalUrl = item.image_url;
          if (item.image_file) {
            const uploadedUrl = await uploadToCloudinary(item.image_file);
            if (uploadedUrl) finalUrl = uploadedUrl;
          }
          return {
            detail: item.detail,
            method: item.method,
            oil: item.oil || "",
            tool: item.tool || "",
            frequency: item.frequency || "",
            condition: item.condition || "",
            time: item.time || "",
            responsible: item.responsible || "",
            check_daily: item.check_daily || "",
            image_url: finalUrl || "",
          };
        })
      );

      if (editingId) {
        const q = query(
          collection(db, "machines"),
          where("id", "==", editingId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(snap.docs[0].ref, {
            name,
            process,
            checklist: finalChecklist,
          });
          alert(`แก้ไขเครื่อง ${name} เรียบร้อย`);
        }
      } else {
        const existingNums = machines.map(
          (m) => parseInt(m.id.replace("M", "")) || 0
        );
        const nextId = `M${(existingNums.length > 0
          ? Math.max(...existingNums) + 1
          : 1
        )
          .toString()
          .padStart(2, "0")}`;
        await addDoc(collection(db, "machines"), {
          id: nextId,
          name,
          process,
          created_at: getThaiDate(),
          checklist: finalChecklist,
        });
        alert(`เพิ่มเครื่อง ${name} เรียบร้อย`);
      }
      handleCancelEdit();
    } catch (error) {
      console.error("Save error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsUploading(false);
    }
  };

  // ✅ ฟังก์ชันเมื่อกดปุ่มบันทึก (จะยังไม่บันทึกจริง แต่จะถามรหัสก่อน)
  const handleSaveClick = () => {
    if (!name) return alert("กรุณาใส่ชื่อเครื่องจักร");
    const validChecklist = checklist.filter(
      (item) => item.detail.trim() !== ""
    );
    if (validChecklist.length === 0)
      return alert("กรุณาเพิ่มรายการตรวจเช็คอย่างน้อย 1 ข้อ");

    setGuardMessage(
      editingId
        ? `ยืนยันการแก้ไขข้อมูลเครื่อง "${name}"`
        : `ยืนยันการเพิ่มเครื่องใหม่ "${name}"`
    );
    setPendingAction(() => executeSave);
    setShowGuard(true);
  };

  const openDeleteConfirm = (m: Machine) => {
    setConfirmModal({ isOpen: true, targetM: m });
  };

  const executeDelete = async () => {
    if (confirmModal.targetM)
      await deleteMachineAndLogs(confirmModal.targetM.id);
    setConfirmModal({ isOpen: false, targetM: null });
  };

  if (showPrintModal)
    return (
      <QRPrintSystem
        machines={machines}
        onClose={() => setShowPrintModal(false)}
      />
    );
  if (showQR)
    return <MachineQRModal machine={showQR} onClose={() => setShowQR(null)} />;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 pt-14">
      {/* Modal ยืนยันรหัสผ่านสำหรับการบันทึก */}
      <ConfirmActionModal
        isOpen={showGuard}
        onClose={() => setShowGuard(false)}
        onConfirm={pendingAction}
        title="ยืนยันการบันทึก"
        message={guardMessage}
        currentUser={user}
      />

      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={executeDelete}
        title="ลบเครื่องจักร"
        message={`คุณต้องการลบเครื่องจักร "${confirmModal.targetM?.name}" และข้อมูลทั้งหมด ใช่หรือไม่?`}
        currentUser={user}
      />

      <div className="bg-white rounded-xl w-full max-w-6xl p-6 max-h-[95vh] overflow-y-auto flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-50"
        >
          <X />
        </button>
        <div className="flex justify-between items-center mb-4 pr-10">
          <h2 className="text-xl font-bold flex gap-2 text-indigo-700">
            <Settings /> จัดการเครื่องจักร
          </h2>
          {user.role === "super_admin" && (
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-200"
            >
              <Printer size={18} /> พิมพ์ QR Code (A4)
            </button>
          )}
        </div>

        <div
          className={`bg-gray-50 p-4 rounded-xl border mb-6 ${editingId ? "border-indigo-300 ring-2 ring-indigo-100" : ""
            }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700">
              {editingId
                ? `📝 แก้ไขข้อมูล: ${editingId}`
                : "➕ เพิ่มเครื่องจักรใหม่"}
            </h3>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
              >
                ยกเลิกการแก้ไข
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                ชื่อเครื่องจักร
              </label>
              <input
                className="w-full p-2 border rounded"
                placeholder="เช่น Dryer"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                ชื่อกระบวนการผลิต
              </label>
              <input
                className="w-full p-2 border rounded"
                placeholder="เช่น Extrusion Line A"
                value={process}
                onChange={(e) => setProcess(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 mb-4 overflow-x-auto">
            {checklist.map((item, index) => (
              <div
                key={index}
                className="flex flex-wrap xl:flex-nowrap items-center gap-2 bg-white p-2 rounded border shadow-sm"
              >
                <div className="flex-shrink-0 mr-1">
                  <div className="relative group w-20 h-20">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id={`item-img-${index}`}
                      onChange={(e) =>
                        e.target.files &&
                        handleFileSelect(e.target.files[0], index)
                      }
                    />
                    <label
                      htmlFor={`item-img-${index}`}
                      className="cursor-pointer w-full h-full flex flex-col items-center justify-center border border-dashed border-gray-300 rounded hover:bg-indigo-50 text-gray-400 bg-gray-50 overflow-hidden"
                    >
                      {item.preview_url ? (
                        <img
                          src={item.preview_url}
                          className="w-full h-full object-cover"
                          alt="preview"
                        />
                      ) : (
                        <>
                          <ImageIcon size={16} />
                          <span className="text-[8px] mt-1">เลือกรูป</span>
                        </>
                      )}
                    </label>
                    {item.preview_url && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const list = [...checklist];
                          list[index].image_url = "";
                          list[index].preview_url = "";
                          list[index].image_file = undefined;
                          setChecklist(list);
                        }}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-grow min-w-[120px]">
                  <label className="block text-[10px] text-gray-400 font-bold mb-1 ml-1 truncate">
                    รายละเอียด
                  </label>
                  <input
                    className="w-full p-2 border rounded text-sm h-10"
                    value={item.detail}
                    onChange={(e) =>
                      handleChecklistChange(index, "detail", e.target.value)
                    }
                  />
                </div>
                <div className="flex-grow min-w-[120px]">
                  <label className="block text-[10px] text-gray-400 font-bold mb-1 ml-1 truncate">
                    วิธีการตรวจ
                  </label>
                  <input
                    className="w-full p-2 border rounded text-sm h-10"
                    value={item.method}
                    onChange={(e) =>
                      handleChecklistChange(index, "method", e.target.value)
                    }
                  />
                </div>
                {/* ช่องอื่นๆ ตัดมาให้ครบตามเดิม */}
                <div className="w-14 flex-shrink-0">
                  <label className="block text-[10px] text-gray-400 font-bold mb-1 text-center truncate">
                    น้ำมัน
                  </label>
                  <input
                    className="w-full p-2 border rounded text-xs text-center h-10"
                    value={item.oil}
                    onChange={(e) =>
                      handleChecklistChange(index, "oil", e.target.value)
                    }
                  />
                </div>
                <div className="w-14 flex-shrink-0">
                  <label className="block text-[10px] text-gray-400 font-bold mb-1 text-center truncate">
                    เครื่องมือ
                  </label>
                  <input
                    className="w-full p-2 border rounded text-xs text-center h-10"
                    value={item.tool}
                    onChange={(e) =>
                      handleChecklistChange(index, "tool", e.target.value)
                    }
                  />
                </div>
                <div className="w-14 flex-shrink-0">
                  <label className="block text-[10px] text-gray-400 font-bold mb-1 text-center truncate">
                    ความถี่
                  </label>
                  <input
                    className="w-full p-2 border rounded text-xs text-center h-10"
                    value={item.frequency}
                    onChange={(e) =>
                      handleChecklistChange(index, "frequency", e.target.value)
                    }
                  />
                </div>
                <div className="w-14 flex-shrink-0">
                  <label className="block text-[10px] text-gray-400 font-bold mb-1 text-center truncate">
                    เงื่อนไข
                  </label>
                  <input
                    className="w-full p-2 border rounded text-xs text-center h-10"
                    value={item.condition}
                    onChange={(e) =>
                      handleChecklistChange(index, "condition", e.target.value)
                    }
                  />
                </div>
                <div className="w-14 flex-shrink-0">
                  <label className="block text-[10px] text-gray-400 font-bold mb-1 text-center truncate">
                    เวลา
                  </label>
                  <input
                    className="w-full p-2 border rounded text-xs text-center h-10"
                    value={item.time}
                    onChange={(e) =>
                      handleChecklistChange(index, "time", e.target.value)
                    }
                  />
                </div>
                <div className="w-14 flex-shrink-0">
                  <label className="block text-[10px] text-gray-400 font-bold mb-1 text-center truncate">
                    การตรวจ
                  </label>
                  <input
                    className="w-full p-2 border rounded text-xs text-center h-10"
                    value={item.check_daily}
                    onChange={(e) =>
                      handleChecklistChange(
                        index,
                        "check_daily",
                        e.target.value
                      )
                    }
                  />
                </div>
                <div className="w-16 flex-shrink-0">
                  <label className="block text-[10px] text-gray-400 font-bold mb-1 text-center truncate">
                    ผู้ดูแล
                  </label>
                  <input
                    className="w-full p-2 border rounded text-xs text-center h-10"
                    value={item.responsible}
                    onChange={(e) =>
                      handleChecklistChange(
                        index,
                        "responsible",
                        e.target.value
                      )
                    }
                  />
                </div>

                {checklist.length > 1 && (
                  <button
                    onClick={() => handleRemoveRow(index)}
                    className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleAddRow}
            className="text-indigo-600 text-sm font-bold flex items-center gap-1 mb-4 hover:bg-indigo-50 p-2 rounded w-fit"
          >
            <Plus size={16} /> เพิ่มรายการ
          </button>

          <button
            onClick={handleSaveClick} // ✅ เปลี่ยนมาเรียกฟังก์ชันถามรหัสก่อน
            disabled={isUploading}
            className={`w-full text-white p-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2 ${editingId
              ? "bg-indigo-600 hover:bg-indigo-700"
              : "bg-green-600 hover:bg-green-700"
              } ${isUploading ? "opacity-70" : ""}`}
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin" /> กำลังอัปโหลดและบันทึก...
              </>
            ) : editingId ? (
              "บันทึกการแก้ไข"
            ) : (
              "บันทึกเครื่องจักรใหม่"
            )}
          </button>
        </div>

        {/* ส่วนแสดงรายชื่อเครื่องจักร (เหมือนเดิม) */}
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-gray-600">
            เครื่องจักรในระบบ ({filteredMachines.length})
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-bold">
              กรองตาม Line:
            </span>
            <select
              value={filterProcess}
              onChange={(e) => setFilterProcess(e.target.value)}
              className="border rounded p-1 text-sm bg-gray-50"
            >
              {processes.map((p, i) => (
                <option key={i} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {filteredMachines.map((m) => (
            <div
              key={m.id}
              className="p-3 border rounded flex justify-between items-center bg-white shadow-sm"
            >
              <div>
                <div className="font-bold">{m.name}</div>
                <div className="text-xs text-gray-500">
                  {m.process || "General"} • {m.checklist.length} รายการ
                </div>
              </div>
              <div className="flex gap-2">
                {user.role === "super_admin" && (
                  <button
                    onClick={() => setShowQR(m)}
                    className="bg-indigo-50 text-indigo-600 p-2 rounded hover:bg-indigo-100"
                  >
                    <QrCode size={16} />
                  </button>
                )}
                <button
                  onClick={() => handleEdit(m)}
                  className="bg-gray-100 text-gray-600 p-2 rounded hover:bg-gray-200"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => openDeleteConfirm(m)}
                  className="bg-red-50 text-red-600 p-2 rounded hover:bg-red-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// DAILY CHECK TICKET MODAL (Fixed: Realtime Machine & Asset List)
// ==========================================
function DailyCheckTicketModal({
  machine,
  checkItem,
  initialDetail,
  user,
  onClose,
  onConfirm,
}: {
  machine: Machine;
  checkItem: string;
  initialDetail: string;
  user: User;
  onClose: () => void;
  onConfirm: (data: any) => Promise<void> | void;
}) {
  const [department, setDepartment] = useState("");
  const [machineName, setMachineName] = useState(machine.name);

  // --- JOB TYPE ---
  const [jobType, setJobType] = useState("");
  const [jobNote, setJobNote] = useState("");

  const [issueItem, setIssueItem] = useState(initialDetail);
  const [factory, setFactory] = useState<"SAL01" | "SAL02">("SAL01");

  // --- LOCATION (AREA) ---
  const [area, setArea] = useState("");
  const [areaNote, setAreaNote] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Options State
  const [deptOptions, setDeptOptions] = useState<any[]>([]);
  const [jobOptions, setJobOptions] = useState<any[]>([]);
  const [sal01Options, setSal01Options] = useState<any[]>([]);
  const [sal02Options, setSal02Options] = useState<any[]>([]);
  const [machineOptions, setMachineOptions] = useState<any[]>([]);

  // 1. Load Master Data (Departments, Job Types, Areas)
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

      const rawDepts = await getList("departments");
      setDeptOptions(
        rawDepts.map((d: any) =>
          typeof d === "string" ? { name: d, code: "MT" } : d
        )
      );

      const rawJobs = await getList("job_types");
      setJobOptions(
        rawJobs.map((j: any) =>
          typeof j === "string" ? { name: j, require_note: false } : j
        )
      );

      const rawSal01 = await getList("sal01_areas");
      setSal01Options(
        rawSal01.map((a: any) =>
          typeof a === "string" ? { name: a, require_note: false } : a
        )
      );

      const rawSal02 = await getList("sal02_areas");
      setSal02Options(
        rawSal02.map((a: any) =>
          typeof a === "string" ? { name: a, require_note: false } : a
        )
      );
    };
    fetchMasterData();

    // 2. Load Machines (Realtime from 'machines' collection) & Assets
    const unsubMachines = onSnapshot(
      collection(db, "machines"),
      async (snap) => {
        // ดึงรายชื่อเครื่องจักรจากฐานข้อมูลหลัก
        const machinesList = snap.docs.map((d) => ({
          name: d.data().name,
        }));

        // ดึงรายชื่อทรัพย์สิน (Assets) จาก maintenance_settings
        const assetsSnap = await getDoc(
          doc(db, "maintenance_settings", "assets")
        );
        let assetsList: any[] = [];
        if (assetsSnap.exists()) {
          assetsList = (assetsSnap.data().list || []).map((a: any) => ({
            name: typeof a === "string" ? a : a.name,
          }));
        }

        // รวมรายชื่อเข้าด้วยกัน และเรียงตามตัวอักษร
        const combined = [...machinesList, ...assetsList].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setMachineOptions(combined);
      }
    );

    return () => unsubMachines();
  }, []);

  // เมื่อเปลี่ยนโรงงาน ให้ล้างค่าพื้นที่ทิ้ง
  useEffect(() => {
    setArea("");
  }, [factory]);

  // ฟังก์ชันเพิ่มเครื่องใหม่เข้าสู่ระบบ Assets (ทรัพย์สินทั่วไป)
  const handleAddMachine = async () => {
    const newMachineName = prompt("ระบุชื่อเครื่องจักร/ทรัพย์สินใหม่:");
    if (!newMachineName || !newMachineName.trim()) return;

    try {
      const docRef = doc(db, "maintenance_settings", "assets");
      await setDoc(
        docRef,
        {
          list: arrayUnion({ name: newMachineName.trim() }),
        },
        { merge: true }
      );

      setMachineName(newMachineName.trim());
      alert(`เพิ่ม "${newMachineName}" เรียบร้อยแล้ว`);
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการเพิ่มข้อมูล");
    }
  };

  const currentJobObj = jobOptions.find((o) => o.name === jobType);
  const showJobInput = currentJobObj?.require_note || false;

  const currentAreaList = factory === "SAL01" ? sal01Options : sal02Options;
  const currentAreaObj = currentAreaList.find((o) => o.name === area);
  const showAreaInput = currentAreaObj?.require_note || false;

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!department) return alert("กรุณาเลือกแผนก");
    if (!jobType) return alert("กรุณาเลือกประเภทงาน");
    if (!machineName) return alert("กรุณาระบุชื่อเครื่องจักร");
    if (!issueItem) return alert("กรุณาระบุอาการเสีย");
    if (!area) return alert("กรุณาเลือกพื้นที่");

    if (showJobInput && !jobNote) return alert("กรุณาระบุรายละเอียดประเภทงาน");
    if (showAreaInput && !areaNote) return alert("กรุณาระบุรายละเอียดพื้นที่");

    // ตรวจสอบความถูกต้องของชื่อเครื่อง (ต้องเลือกจากรายการเท่านั้น)
    const isValidMachine = machineOptions.some((opt: any) => {
      const dbName = typeof opt === "string" ? opt : opt.name;
      return dbName.trim().toLowerCase() === machineName.trim().toLowerCase();
    });

    if (!isValidMachine) {
      alert(
        `⛔️ ชื่อ "${machineName}" ไม่ถูกต้อง!\n\nกรุณาเลือกจากรายการ Dropdown เท่านั้น\n(หากไม่พบ ให้กดปุ่ม + ด้านขวาเพื่อเพิ่มใหม่)`
      );
      setMachineName("");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedDeptObj = deptOptions.find((d) => d.name === department);
      const prefixCode = selectedDeptObj?.code || "MT";

      const finalJobType = showJobInput ? `${jobType} (${jobNote})` : jobType;
      const finalArea = showAreaInput ? `${area} (${areaNote})` : area;

      await onConfirm({
        machineName,
        jobType: finalJobType,
        department,
        factory,
        area: finalArea,
        issueItem,
        prefixCode,
      });
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-[#0F172A] text-white text-sm border border-slate-700/50 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-600";
  const labelClass =
    "text-[10px] uppercase font-bold text-slate-500 mb-1.5 block tracking-wide";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[11000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1E293B] w-full max-w-md rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-700/50 flex justify-between items-center bg-[#1E293B]">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></span>{" "}
            แจ้งซ่อม (จาก Daily Check)
          </h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-500 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">
              จุดที่พบปัญหา
            </div>
            <div className="text-sm text-white font-medium">{checkItem}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Department</label>
              <select
                className={inputClass}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">- เลือกแผนก -</option>
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
                <option value="">- เลือกประเภท -</option>
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
                placeholder="ระบุรายละเอียดประเภทงาน..."
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
              placeholder="ค้นหาเครื่องจักร..."
              onAddNew={handleAddMachine}
            />
          </div>

          <div>
            <label className={labelClass}>Issue Detail</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="อาการเสียที่พบ..."
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
                    onClick={() => setFactory(f as any)}
                    className={`px-3 rounded-md text-[10px] font-bold transition-all ${factory === f
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
                  placeholder="ระบุรายละเอียดพื้นที่..."
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
            disabled={isSubmitting}
            className={`w-full py-3 text-white rounded-xl font-bold text-sm shadow-lg transition-all flex justify-center items-center gap-2 ${isSubmitting
              ? "bg-slate-600 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-500 shadow-red-900/20"
              }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={16} /> กำลังบันทึก...
              </>
            ) : (
              <>
                ยืนยันแจ้งซ่อม <Wrench size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SCAN PAGE (REDESIGNED HEADER)
// ==========================================
// ==========================================
// SCAN PAGE (FULL CODE WITH DATE SELECTION PERMISSION)
// ==========================================
function ScanPage({
  machine,
  user,
  onBack,
  workingDate,
  workingShift,
  onDateChange,
  onShiftChange,
}: {
  machine: Machine;
  user: User;
  onBack: () => void;
  workingDate: string;
  workingShift: string;
  onDateChange: (d: string) => void;
  onShiftChange: (s: string) => void;
}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pendingLogs, setPendingLogs] = useState<Record<string, { result: ResultType, detail?: string, isTicket?: boolean, ticketData?: any }>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [showCam, setShowCam] = useState(false);
  const [showMasterSheet, setShowMasterSheet] = useState(false);


  const [inspectingItem, setInspectingItem] = useState<{
    detail: string;
    method: string;
  } | null>(null);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const [ticketModalData, setTicketModalData] = useState<{
    result: ResultType;
    detail: string;
  } | null>(null);

  const [isVerified, setIsVerified] = useState(user.username === "Bank");

  // ✅ New States for Dew Point Mode
  const [dpSetPoint, setDpSetPoint] = useState("");
  const [dpActual, setDpActual] = useState("");
  const [dpDewPoint, setDpDewPoint] = useState("");
  const [dpStatus, setDpStatus] = useState<ResultType | null>(null);
  const [dpRemark, setDpRemark] = useState("");
  const [isSavingDewPoint, setIsSavingDewPoint] = useState(false);

  const isDewPoint = (machine.systemMode || "DAILY") === "DEW_POINT";

  // ✅ Check if already saved for Dew Point
  const dpItemName = isDewPoint ? (machine.checklist[0]?.detail || "Dew Point Check") : null;
  const savedDpLog = isDewPoint ? logs.find(l => l.checklist_item === dpItemName) : null;
  const isDpSaved = !!savedDpLog;

  // ✅ Sync saved data to state if exists
  useEffect(() => {
    if (isDpSaved && savedDpLog) {
      setDpSetPoint(savedDpLog.set_point || "");
      setDpActual(savedDpLog.actual || "");
      setDpDewPoint(savedDpLog.dew_point_val || "");
      setDpStatus(savedDpLog.result);
      setDpRemark(savedDpLog.problem_detail || "");
    } else {
      // 🔄 Clear inputs if no log exists for this date/shift
      setDpSetPoint("");
      setDpActual("");
      setDpDewPoint("");
      setDpStatus(null);
      setDpRemark("");
    }
  }, [isDpSaved, savedDpLog]);

  // ✅ 1. เพิ่มตัวแปรเช็คสิทธิ์: ใครมีสิทธิ์เลือกวันที่บ้าง?
  // (Super Admin, เจ้าของ, หรือคนที่มีสิทธิ์ 'daily_select_date')
  const canSelectDate =
    user.role === "super_admin" ||
    user.username === "Bank" ||
    user.allowedActions?.includes("daily_select_date");

  useEffect(() => {
    const q = query(
      collection(db, "logs"),
      where("mid", "==", machine.id),
      where("date", "==", workingDate),
      where("shift", "==", workingShift)
    );
    const unsub = onSnapshot(q, (snap) =>
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LogEntry)))
    );
    return () => unsub();
  }, [machine.id, workingDate, workingShift]);

  const handleProcess = (code: string) => {
    let scannedMachine = code;
    const separatorIndex = code.indexOf(":");
    if (separatorIndex !== -1) {
      scannedMachine = code.substring(0, separatorIndex).trim();
    }

    const modeSuffix = (machine.systemMode || "DAILY") === "DEW_POINT" ? "-DP" : "-DC";
    const expectedWithMode = `${machine.name}${modeSuffix}`;

    if (scannedMachine === expectedWithMode || scannedMachine === machine.id) {
      setStatus({
        type: "success",
        msg: "✅ ยืนยันเครื่องถูกต้อง: ปลดล็อครายการตรวจเช็ค",
      });
      setIsVerified(true);
      setShowCam(false);
      setTimeout(() => setStatus(null), 3000);
    } else {
      let errorMsg = `⛔ ผิดเครื่อง! QR นี้คือ "${scannedMachine}"`;

      // ถ้าชื่อเครื่องตรง แต่โหมดไม่ตรง (โกงสแกนข้ามจุด)
      if (scannedMachine.startsWith(machine.name) && scannedMachine !== expectedWithMode) {
        errorMsg = `⛔ ผิดจุด! นี่คือ QR ของโหมด ${scannedMachine.endsWith("-DC") ? "Daily" : "Dew Point"}`;
      }

      setStatus({
        type: "error",
        msg: errorMsg,
      });
      setShowCam(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handlePreSave = (
    result: ResultType,
    detail?: string,
    createTicket?: boolean
  ) => {
    if (createTicket && result === "ABNORMAL") {
      setTicketModalData({ result, detail: detail || "" });
    } else {
      // ✅ แทนที่จะบันทึกทันที ให้เก็บเข้า Pending
      if (!inspectingItem) return;
      setPendingLogs(prev => ({
        ...prev,
        [inspectingItem.detail]: { result, detail }
      }));
      setInspectingItem(null);
    }
  };

  const handleSaveAll = async () => {
    const itemsToSave = Object.keys(pendingLogs);
    if (itemsToSave.length === 0) return;

    setIsSavingAll(true);
    try {
      for (const itemDetail of itemsToSave) {
        const data = pendingLogs[itemDetail];
        // เรียก executeSave โดยตรง (ผ่าน itemDetail ที่เตรียมไว้)
        await executeSave(data.result, data.detail, data.isTicket || false, data.ticketData, undefined, itemDetail);
      }
      setPendingLogs({});
      setStatus({ type: "success", msg: "บันทึกข้อมูลทั้งหมดเรียบร้อยแล้ว" });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error("Save All Error:", err);
      setStatus({ type: "error", msg: "บันทึกไม่สำเร็จบางรายการ" });
    } finally {
      setIsSavingAll(false);
    }
  };

  // ==========================================
  // executeSave (ครบชุด: รันเลข + บันทึก + แจ้งเตือน Telegram)
  // ==========================================
  const executeSave = async (
    result: ResultType,
    detail: string | undefined,
    isTicket: boolean,
    ticketData: any,
    extraFields?: {
      set_point?: string;
      actual?: string;
      dew_point_val?: string;
      material_name?: string;
    },
    customItemDetail?: string // ✅ เพิ่มเพื่อรองรับการระบุไอเท็มเอง (เช่น Batch Save)
  ) => {
    // ในโหมด Dew Point เราจะใช้ไอเท็มแรกเสมอถ้าไม่ได้ระบุมา (ถ้าไม่มีไอเท็มเลยจะใช้ชื่อกลาง)
    const targetItemDetail = customItemDetail || inspectingItem?.detail || (isDewPoint ? (machine.checklist[0]?.detail || "Dew Point Check") : null);
    if (!targetItemDetail) {
      console.error("Target item detail not found", { inspectingItem, isDewPoint });
      return;
    }

    try {
      // ✅ 1. ตรวจสอบข้อมูลซ้ำก่อนเริ่มทำงานใดๆ
      const existingLog = logs.find(
        (l) => l.checklist_item === targetItemDetail
      );

      if (existingLog) {
        // ถ้าเจอข้อมูลเก่า ให้แจ้งเตือนและหยุดฟังก์ชันทันที (ไม่บันทึก Ticket และไม่บันทึก Log)
        alert(
          `⚠️ รายการ "${targetItemDetail}" ถูกบันทึกไปแล้ว\nหากต้องการบันทึกใหม่ กรุณาไปลบข้อมูลเดิมในหน้าประวัติก่อนครับ`
        );
        return;
      }

      let createdTicketId = null; // ตัวแปรสำหรับรอรับเลข ID จาก Ticket

      // 2. ถ้ามีการสั่งแจ้งซ่อม (ABNORMAL + เลือกเปิดใบงาน) ให้สร้าง Ticket ก่อน
      if (isTicket && ticketData) {
        const prefixCode = ticketData.prefixCode || "MT";

        // เริ่ม Transaction และรับค่า ID ที่สร้างได้กลับมา
        createdTicketId = await runTransaction(db, async (transaction) => {
          // --- ส่วนคำนวณเลข ID ---
          const now = new Date();
          const yy = now.getFullYear().toString().slice(-2);
          const mm = String(now.getMonth() + 1).padStart(2, "0");
          const idPrefix = `${prefixCode}-${yy}${mm}`;

          const q = query(
            collection(db, "maintenance_tickets"),
            where("id", ">=", idPrefix),
            where("id", "<", idPrefix + "\uf8ff"),
            orderBy("id", "desc"),
            limit(1)
          );

          const querySnapshot = await getDocs(q);
          let nextRunNo = 1;

          if (!querySnapshot.empty) {
            const latestId = querySnapshot.docs[0].id;
            const suffix = latestId.slice(-3);
            const maxNum = parseInt(suffix, 10);
            if (!isNaN(maxNum)) {
              nextRunNo = maxNum + 1;
            }
          }

          const generatedId = `${idPrefix}${String(nextRunNo).padStart(
            3,
            "0"
          )}`;

          // --- เตรียมข้อมูล Ticket ---
          const newTicketData = {
            id: generatedId,
            machine_id: machine.id,
            machine_name: ticketData.machineName,
            department: ticketData.department,
            job_type: ticketData.jobType,
            issue_item: ticketData.issueItem,
            issue_detail: detail || ticketData.issueItem,
            factory: ticketData.factory,
            area: ticketData.area,
            status: "Open",
            source: "Daily_Check",
            requester: user.username,
            requester_fullname: user.fullname || user.username,
            requester_date: new Date().toISOString(),
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          };

          transaction.set(
            doc(db, "maintenance_tickets", generatedId),
            newTicketData
          );

          return generatedId; // ส่งค่า ID ออกไปเพื่อเอาไปใส่ใน Log
        });

        // --- ส่วนแจ้งเตือน Telegram ---
        const TELEGRAM_TOKEN = "8479695961:AAFtKB3MuE1PHk9tYVckhgYPrbb2dYpI1eI";
        const TELEGRAM_CHAT_ID = "-5081774286";
        const requesterName = user.fullname || user.username;
        const msg = `🚨 <b>เครื่อง:</b> ${ticketData.machineName}\n⚠️ <b>อาการ:</b> ${ticketData.issueItem}\n🏢 <b>แผนก:</b> ${ticketData.department}\n📍 <b>พื้นที่:</b> ${ticketData.area}\n👤 <b>ผู้แจ้ง:</b> ${requesterName}`;

        fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: msg,
            parse_mode: "HTML",
          }),
        }).catch((e) => console.error("Telegram Error:", e));
      }

      // 3. บันทึก Log การตรวจเช็คใหม่ลงฐานข้อมูล
      const newLog: any = {
        mid: machine.id,
        checklist_item: targetItemDetail,
        result: result,
        inspector: user.username,
        date: workingDate,
        shift: workingShift,
        timestamp: serverTimestamp(),
        linked_ticket_id: createdTicketId, // ฝัง ID ใบแจ้งซ่อม
        ...(extraFields || {}),
      };

      if (detail) newLog.problem_detail = detail;
      await addDoc(collection(db, "logs"), newLog);

      // จบการทำงาน ล้างค่าหน้าจอ
      setTicketModalData(null);
      setInspectingItem(null);
      setStatus({ type: "success", msg: "บันทึกข้อมูลเรียบร้อย" });
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      console.error("SAVE ERROR:", err);
      setStatus({ type: "error", msg: "❌ บันทึกไม่สำเร็จ" });
    }
  };

  return (
    // ✅ Main Container
    <div className="h-full flex flex-col bg-[#0F172A] text-slate-200 overflow-y-auto custom-scrollbar relative">
      {/* ✅ WRAPPER FOR STICKY HEADERS */}
      <div className="sticky top-0 z-30 flex flex-col">
        {/* ✅ 1. NEW STICKY HEADER DESIGN (ชื่อเครื่องอยู่บนสุด) */}
        <div className="bg-[#1E293B] px-4 py-3 shadow-lg border-b border-slate-700/80 flex items-center gap-3">
          {/* 1. ปุ่มกลับ */}
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-600 transition-all active:scale-95 shadow-sm shrink-0"
          >
            <ArrowLeft size={20} />
          </button>

          {/* 2. ชื่อเครื่อง & วันที่ */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white tracking-tight truncate leading-tight">
              {machine.name}
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
              <span className="bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/50">
                {formatDateDisplay(workingDate)}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300">Shift {workingShift}</span>
            </div>
          </div>

          {/* 3. สถานะ (Locked/Unlocked) */}
          <div className="shrink-0">
            {isVerified ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-wide">
                  Unlocked
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg opacity-70">
                <div className="w-2 h-2 bg-red-500/50 rounded-full"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Locked
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ✅ 2. Header Select Date Mode (คอนโทรลบาร์อยู่ล่าง) */}
        {canSelectDate && (
          <div className="px-4 py-3 bg-[#1E293B]/60 border-b border-slate-800 flex flex-wrap gap-4 items-center shrink-0 backdrop-blur-md animate-in slide-in-from-top-1 duration-300">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                วันที่ตรวจ:
              </span>
              <input
                type="date"
                value={workingDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-blue-400 font-bold outline-none focus:border-blue-500 shadow-inner"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                กะ:
              </span>
              <select
                value={workingShift}
                onChange={(e) => onShiftChange(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-blue-400 font-bold outline-none focus:border-blue-500 shadow-inner"
              >
                <option value="D">Day (กลางวัน)</option>
                <option value="N">Night (กลางคืน)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full border border-amber-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
              <span className="text-[9px] font-black uppercase italic">
                Admin Mode
              </span>
            </div>
          </div>
        )}
      </div>

      {/* --- Body Content --- */}
      <div className="flex-1 p-4 flex flex-col items-center w-full">
        {/* Toast Status */}
        {status && (
          <div className="fixed top-20 left-0 right-0 flex justify-center z-[80] pointer-events-none px-4">
            <div
              className={`px-6 py-3 rounded-2xl shadow-2xl font-bold animate-in slide-in-from-top-2 border flex items-center gap-2 backdrop-blur-md ${status.type === "success"
                ? "bg-green-600/90 text-white border-green-500"
                : "bg-red-600/90 text-white border-red-500"
                }`}
            >
              {status.type === "success" ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              {status.msg}
            </div>
          </div>
        )}

        {/* --- LUXURY MINIMALIST SCAN INTERFACE (SQUIRCLE VERSION) --- */}
        {!isVerified && (
          <div className="flex-1 flex flex-col items-center justify-center w-full relative min-h-[400px]">
            {/* Background Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative group cursor-pointer" onClick={() => setShowCam(true)}>
              {/* Outer Subtle Pulse (Squircle Shape) */}
              <div className="absolute inset-[-25px] border border-white/5 rounded-[70px] animate-[ping_4s_infinite] opacity-10"></div>

              {/* Central Squircle Glass Button */}
              <button
                className="relative w-64 h-64 rounded-[70px] bg-slate-900/40 backdrop-blur-3xl border border-white/10 flex flex-col items-center justify-center gap-6 shadow-[0_30px_70px_rgba(0,0,0,0.7)] active:scale-95 transition-all duration-700 overflow-hidden group-hover:border-blue-500/30"
              >
                {/* Internal Refraction Effect */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/5 via-transparent to-white/5 pointer-events-none"></div>

                <div className="relative p-7 bg-white/5 rounded-3xl border border-white/10 shadow-inner group-hover:bg-blue-500/10 group-hover:scale-110 transition-all duration-700">
                  <QrCode size={60} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
                </div>

                <div className="text-center z-10">
                  <span className="text-[11px] font-black text-blue-500/80 uppercase tracking-[0.5em] block mb-1 group-hover:text-blue-400 transition-colors">
                    Unlock
                  </span>
                  <div className="h-[2px] w-8 bg-blue-500/20 mx-auto rounded-full group-hover:w-16 group-hover:bg-blue-500/50 transition-all duration-700"></div>
                </div>

                {/* Simulated Laser Line */}
                <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent top-0 -translate-y-full group-hover:animate-[scan_3s_infinite] pointer-events-none"></div>
              </button>
            </div>

            <div className="mt-20 text-center space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-1000">
              <h2 className="text-3xl font-extralight text-white tracking-[.2em]">
                SCAN QR
              </h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.6em] opacity-50">
                Machine Security Interface
              </p>
            </div>
          </div>
        )}


        {/* ปุ่ม Master Sheet (แสดงเฉพาะโหมด Daily และต้อง Unlocked แล้วเท่านั้น) */}
        {!isDewPoint && isVerified && (
          <button
            onClick={() => setShowMasterSheet(true)}
            className="w-full max-w-4xl bg-[#1E293B] border border-slate-700 text-slate-300 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm mb-4 hover:bg-[#253045] hover:text-white text-sm transition-all active:scale-95"
          >
            <FileText size={16} className="text-blue-400" /> ดูใบมาตรฐาน (Master Sheet)
          </button>
        )}

        {/* ส่วนเนื้อหาหลัก (แสดงเมื่อ Unlocked แล้ว) */}
        {isVerified && (
          isDewPoint ? (
            // ✅ DEW POINT FORM
            <div className="w-full max-w-lg bg-[#1E293B] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              {/* ... (Dew Point form remains the same) */}
              <div className="bg-blue-600/10 p-4 border-b border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-base">
                  <Droplet size={20} /> บันทึกค่า Dew Point
                </div>
                <div className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-black uppercase">
                  Measurement
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 mb-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Material System {isDpSaved && "(Saved Value)"}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                      <span className="text-sm font-bold text-blue-400">
                        {isDpSaved
                          ? (savedDpLog?.material_name || "ไม่ระบุ")
                          : (machine.material || "ไม่ระบุ (กรุณาตั้งค่าเครื่องจักร)")}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      1. Set point
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="..."
                      disabled={isDpSaved}
                      value={dpSetPoint}
                      onChange={(e) => setDpSetPoint(e.target.value)}
                      className={`w-full border rounded-xl px-4 py-3 text-white font-bold text-base outline-none shadow-inner transition-all ${isDpSaved
                        ? "bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                        : dpStatus === "NA"
                          ? "bg-slate-800/30 border-slate-700 text-slate-500 opacity-40"
                          : "bg-[#0F172A] border-slate-600 focus:border-blue-500"
                        }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      2. Actual
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="..."
                      disabled={isDpSaved}
                      value={dpActual}
                      onChange={(e) => setDpActual(e.target.value)}
                      className={`w-full border rounded-xl px-4 py-3 text-white font-bold text-base outline-none shadow-inner transition-all ${isDpSaved
                        ? "bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                        : dpStatus === "NA"
                          ? "bg-slate-800/30 border-slate-700 text-slate-500 opacity-40"
                          : "bg-[#0F172A] border-slate-600 focus:border-blue-500"
                        }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      3. Dew Point Value
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="..."
                      disabled={isDpSaved}
                      value={dpDewPoint}
                      onChange={(e) => setDpDewPoint(e.target.value)}
                      className={`w-full border rounded-xl px-4 py-3 text-white font-bold text-base outline-none shadow-inner transition-all ${isDpSaved
                        ? "bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                        : dpStatus === "NA"
                          ? "bg-slate-800/30 border-slate-700 text-slate-500 opacity-40"
                          : "bg-[#0F172A] border-slate-600 focus:border-blue-500"
                        }`}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">
                    4. สถานะเครื่องจักร
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "NORMAL" as ResultType, label: "ปกติ", color: "bg-green-600", icon: CheckCircle },
                      { id: "ABNORMAL" as ResultType, label: "ผิดปกติ", color: "bg-red-600", icon: AlertCircle },
                      { id: "NA" as ResultType, label: "ไม่ใช้งาน", color: "bg-slate-600", icon: MinusCircle },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        disabled={isDpSaved}
                        onClick={() => setDpStatus(btn.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${dpStatus === btn.id
                          ? `${btn.color} border-white shadow-lg scale-105`
                          : "bg-slate-800 border-slate-700 text-slate-400 opacity-60 hover:opacity-100"
                          } ${isDpSaved ? "cursor-not-allowed grayscale" : ""}`}
                      >
                        <btn.icon size={20} />
                        <span className="text-[10px] font-bold uppercase">{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    5. Remark (หมายเหตุ)
                  </label>
                  <textarea
                    placeholder="..."
                    disabled={isDpSaved}
                    value={dpRemark}
                    onChange={(e) => setDpRemark(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-white text-base outline-none shadow-inner transition-all min-h-[80px] ${isDpSaved
                      ? "bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                      : "bg-[#0F172A] border-slate-600 focus:border-blue-500"
                      }`}
                  />
                </div>

                {!isDpSaved && (
                  (() => {
                    const isFormIncomplete =
                      !dpStatus ||
                      ((dpStatus === "NORMAL" || dpStatus === "ABNORMAL") && (!dpSetPoint || !dpActual || !dpDewPoint));

                    if (isFormIncomplete) return null;

                    return (
                      <button
                        onClick={async () => {
                          let extraFields = undefined;
                          let finalRemark = dpRemark;

                          if (dpStatus === "NORMAL" || dpStatus === "ABNORMAL") {
                            extraFields = {
                              set_point: dpSetPoint,
                              actual: dpActual,
                              dew_point_val: dpDewPoint,
                              material_name: machine.material || "-"
                            };
                          } else if (dpStatus === "NA") {
                            finalRemark = "";
                          }

                          setIsSavingDewPoint(true);
                          await executeSave(dpStatus, finalRemark, false, null, extraFields);
                          setIsSavingDewPoint(false);
                        }}
                        disabled={isSavingDewPoint}
                        className="w-full py-4 rounded-xl font-black text-base uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/40 animate-in fade-in slide-in-from-top-2 duration-300"
                      >
                        {isSavingDewPoint ? (
                          <>
                            <Loader2 className="animate-spin" />
                            <span>กำลังบันทึก...</span>
                          </>
                        ) : (
                          <>
                            <Save />
                            <span>บันทึกผลการตรวจ</span>
                          </>
                        )}
                      </button>
                    );
                  })()
                )}
              </div>
            </div>
          ) : (
            <div className="w-full max-w-4xl space-y-4 pb-24">
              <div className="bg-[#1E293B] rounded-xl border border-slate-700 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-500">
                <div className="bg-green-500/10 p-3 text-[10px] text-green-400 font-black uppercase tracking-widest border-b border-green-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} /> Ready to Check
                  </div>
                  <span className="opacity-60">Daily Checklist</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-[#0F172A]/50 border-b border-slate-800">
                      <tr>
                        <th className="p-4 text-center w-16">Status</th>
                        <th className="p-4">Item Detail</th>
                        <th className="p-4 hidden md:table-cell">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {machine.checklist.map((item, idx) => {
                        const savedLog = logs.find((l) => l.checklist_item === item.detail);
                        const pendingLog = pendingLogs[item.detail];
                        
                        // ลำดับความสำคัญ: บันทึกแล้ว > กำลังรอส่ง > ยังไม่ได้ทำ
                        const statusDisplay = savedLog 
                          ? getResultDisplay(savedLog.result) 
                          : pendingLog 
                            ? getResultDisplay(pendingLog.result)
                            : null;

                        const isPending = !!pendingLog && !savedLog;

                        return (
                          <tr
                            key={idx}
                            onClick={() => !savedLog && setInspectingItem(item)}
                            className={`transition-all duration-200 ${
                              savedLog ? "bg-slate-900/40 opacity-60 cursor-not-allowed" : "bg-[#1E293B] hover:bg-[#253045] cursor-pointer active:scale-[0.99]"
                            }`}
                          >
                            <td className="p-4 text-center relative">
                              {statusDisplay ? (
                                <div className="flex flex-col items-center">
                                  <span className={`text-xl font-bold ${statusDisplay.color} ${isPending ? "animate-pulse" : ""}`}>
                                    {statusDisplay.symbol}
                                  </span>
                                  {isPending && (
                                    <span className="text-[8px] font-black uppercase text-blue-400 tracking-tighter absolute -bottom-1">Pending</span>
                                  )}
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-slate-800/50 border border-slate-700 mx-auto flex items-center justify-center text-slate-500 shadow-inner group-hover:border-slate-500 transition-colors">
                                  <Pencil size={14} />
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                               <div className="font-medium text-slate-200 whitespace-pre-wrap leading-relaxed">
                                  {item.detail}
                               </div>
                            </td>
                            <td className="p-4 hidden md:table-cell whitespace-pre-wrap text-slate-500 leading-relaxed text-[11px]">
                              {item.method}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ✅ ปุ่มบันทึกทั้งหมด (Save All) - แบบ Compact */}
              {Object.keys(pendingLogs).length > 0 && (
                <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-6 animate-in slide-in-from-bottom-10 duration-500">
                  <button
                    onClick={handleSaveAll}
                    disabled={isSavingAll}
                    className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black uppercase tracking-[.2em] shadow-[0_15px_30px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all border border-blue-400/20 overflow-hidden"
                  >
                    {isSavingAll ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span className="text-xs">Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        <span className="text-xs">บันทึกข้อมูล ({Object.keys(pendingLogs).length})</span>
                      </>
                    )}
                    
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  </button>
                </div>
              )}
            </div>
          )
        )}

      </div>

      {/* --- Wrapper สำหรับ Modals --- */}
      <div className="text-gray-900">
        {showCam && (
          <CameraScanner
            onScan={handleProcess}
            onClose={() => setShowCam(false)}
          />
        )}
        {showMasterSheet && (
          <MasterSheetModal
            machine={machine}
            onClose={() => setShowMasterSheet(false)}
          />
        )}
        {inspectingItem && (
          <ResultSelectionModal
            itemName={inspectingItem.detail}
            itemMethod={inspectingItem.method}
            onSelect={handlePreSave}
            onClose={() => setInspectingItem(null)}
          />
        )}
        {ticketModalData && inspectingItem && (
          <DailyCheckTicketModal
            machine={machine}
            checkItem={inspectingItem.detail}
            initialDetail={ticketModalData.detail}
            user={user}
            onClose={() => setTicketModalData(null)}
            onConfirm={(data) =>
              executeSave(ticketModalData.result, data.issueItem, true, data)
            }
          />
        )}
      </div>
    </div>
  );
}

// 2. ฟังก์ชัน MachineHistory (DailyCheckApp.tsx) - Update Permission Check
const MachineHistory = React.memo(function MachineHistory({
  machine,
  logs = [],
  auditLogs = [],
  user,
  isAdmin, // ตัวแปรนี้อาจจะไม่ได้ใช้แล้ว เพราะเราจะเช็คจาก user โดยตรง แต่เก็บไว้กัน Error
  month,
  year,
  page,
}: {
  machine: Machine;
  logs: LogEntry[];
  auditLogs: AuditLog[];
  user: User; // User ต้องมี allowedActions
  isAdmin: boolean;
  month: number;
  year: number;
  page: 1 | 2;
}) {
  const [deleteTarget, setDeleteTarget] = useState<{
    date: string;
    shift: string;
  } | null>(null);

  const daysInMonth = new Date(year, month, 0).getDate();
  const startDay = page === 1 ? 1 : 16;
  const endDay = page === 1 ? 15 : daysInMonth;
  const daysToShow = Array.from(
    { length: endDay - startDay + 1 },
    (_, i) => startDay + i
  );

  const isDewPointMode = machine.systemMode === "DEW_POINT";
  const dpItemName = isDewPointMode ? (machine.checklist[0]?.detail || "Dew Point Check") : null;

  // ✅ 1. เช็คสิทธิ์ (Permission Check)
  const isSuper = user?.username === "Bank" || user?.role === "super_admin";
  const canVerify = isSuper || user?.allowedActions?.includes("daily_verify"); // สิทธิ์ผู้ตรวจสอบ
  const canDelete = isSuper || user?.allowedActions?.includes("daily_delete"); // สิทธิ์ลบประวัติ

  const getLogsForDateShift = (
    d: number,
    shift: string,
    itemDetail: string
  ) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    return (logs || []).find(
      (l) =>
        l.mid === machine.id &&
        l.date === dateStr &&
        l.shift === shift &&
        l.checklist_item === itemDetail
    );
  };

  const getInspectorName = (d: number, shift: string) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    const foundLog = (logs || []).find(
      (l) => l.mid === machine.id && l.date === dateStr && l.shift === shift
    );
    return foundLog ? foundLog.inspector : "";
  };

  const handleOpenDelete = (d: number, shift: string) => {
    // ✅ เช็คสิทธิ์ก่อนเปิด Modal ลบ
    if (!canDelete) {
      alert(
        "⛔️ คุณไม่มีสิทธิ์ลบประวัติการตรวจ (Need 'daily_delete' permission)"
      );
      return;
    }
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    const hasLog = (logs || []).some(
      (l) => l.mid === machine.id && l.date === dateStr && l.shift === shift
    );
    if (hasLog) setDeleteTarget({ date: dateStr, shift });
  };

  const handleSignOff = async (d: number, shift: string) => {
    // ✅ เช็คสิทธิ์ก่อนเซ็นชื่อ
    if (!canVerify) {
      alert(
        "⛔️ คุณไม่มีสิทธิ์ตรวจสอบความถูกต้อง (Need 'daily_verify' permission)"
      );
      return;
    }

    if (!confirm(`ยืนยันการตรวจสอบวันที่ ${d} กะ ${shift}?`)) return;

    const auditId = `${machine.id}_${year}_${month}_${d}_${shift}`;
    await setDoc(doc(db, "audit_logs", auditId), {
      mid: machine.id,
      year: year,
      month: month,
      day: d,
      shift: shift,
      auditor: user.username,
    });
  };

  const CellContent = ({ res, log, hideTooltip }: any) => {
    if (!res) return null;
    const hasDetails = !hideTooltip && (log?.problem_detail || log?.set_point || log?.actual || log?.dew_point_val);

    return (
      <div className="flex flex-col items-center justify-center h-full w-full leading-none group/cell relative cursor-help">
        <span className={`text-[10px] font-bold ${res.color}`}>
          {res.symbol}
        </span>
        {hasDetails && (
          <div className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/95 text-white text-[10px] p-2.5 rounded-lg w-40 hidden group-hover/cell:block shadow-2xl pointer-events-none text-left whitespace-normal border border-slate-700 backdrop-blur-sm">
            {log.material_name && (
              <div className="flex justify-between mb-1.5 pb-1.5 border-b border-slate-700/50">
                <span className="text-slate-400">Mat:</span>
                <span className="font-bold text-white truncate ml-2">{log.material_name}</span>
              </div>
            )}
            {log.set_point && (
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Set:</span>
                <span className="font-bold text-blue-400">{log.set_point}</span>
              </div>
            )}
            {log.actual && (
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Act:</span>
                <span className="font-bold text-emerald-400">{log.actual}</span>
              </div>
            )}
            {log.dew_point_val && (
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Dew:</span>
                <span className="font-bold text-cyan-400">{log.dew_point_val}</span>
              </div>
            )}
            {log.problem_detail && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-700">
                <span className="text-red-400 font-bold block mb-0.5">Remark:</span>
                <span className="text-slate-300 leading-tight">{log.problem_detail}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="bg-white rounded-lg overflow-hidden">
        <table className="w-full text-xs table-fixed border-collapse border border-slate-200">
          <thead>
            <tr className="bg-slate-100 text-slate-600">
              <th className="p-2 text-left border border-slate-300 w-[200px] font-bold">
                Checklist Items
              </th>
              {daysToShow.map((d) => (
                <th
                  key={d}
                  className="p-0 text-center border border-slate-300 font-bold bg-slate-50 text-[10px]"
                  colSpan={2}
                >
                  {d}
                </th>
              ))}
              {Array.from({ length: 16 - daysToShow.length }).map((_, i) => (
                <th
                  key={`empty-${i}`}
                  colSpan={2}
                  className="border border-slate-200 bg-slate-50/30"
                ></th>
              ))}
            </tr>
            <tr className="bg-slate-50 text-[9px] text-slate-500">
              <th className="border border-slate-300"></th>
              {daysToShow.map((d) => (
                <React.Fragment key={d}>
                  <th className="text-center border border-slate-300 bg-white w-[2.5%]">
                    D
                  </th>
                  <th className="text-center border border-slate-300 bg-slate-100 w-[2.5%]">
                    N
                  </th>
                </React.Fragment>
              ))}
              {Array.from({ length: 16 - daysToShow.length }).map((_, i) => (
                <React.Fragment key={`sub-${i}`}>
                  <th className="border border-slate-200" />
                  <th className="border border-slate-200" />
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {isDewPointMode ? (
              // ✅ DEW POINT MODE ROWS
              <>
                {/* 0. Material Row (Top) */}
                <tr className="hover:bg-blue-50/30 transition-colors border-b border-slate-100">
                  <td className="p-1.5 px-2 font-bold border-r border-slate-300 text-slate-700 bg-slate-50/30 text-[10px]">Material</td>
                  {daysToShow.map((d) => {
                    const lD = getLogsForDateShift(d, "D", dpItemName || "");
                    const lN = getLogsForDateShift(d, "N", dpItemName || "");
                    return (
                      <React.Fragment key={d}>
                        <td className="border-r border-slate-200 p-0 text-center align-middle h-7 text-[9px] text-slate-500 font-bold">
                          {lD ? (lD.result === "NA" ? "-" : (lD.material_name || "")) : ""}
                        </td>
                        <td className="border-r border-slate-300 p-0 text-center align-middle h-7 text-[9px] text-slate-500 font-bold bg-slate-50/50">
                          {lN ? (lN.result === "NA" ? "-" : (lN.material_name || "")) : ""}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
                {/* 1. Set Point Row */}
                <tr className="hover:bg-blue-50/30 transition-colors border-b border-slate-100">
                  <td className="p-1.5 px-2 font-bold border-r border-slate-300 text-slate-700 bg-slate-50/30 text-[10px]">Set point</td>
                  {daysToShow.map((d) => {
                    const lD = getLogsForDateShift(d, "D", dpItemName || "");
                    const lN = getLogsForDateShift(d, "N", dpItemName || "");
                    return (
                      <React.Fragment key={d}>
                        <td className="border-r border-slate-200 p-0 text-center align-middle h-7 text-[9px] text-blue-600 font-bold">
                          {lD ? (lD.result === "NA" ? "-" : (lD.set_point || "")) : ""}
                        </td>
                        <td className="border-r border-slate-300 p-0 text-center align-middle h-7 text-[9px] text-blue-600 font-bold bg-slate-50/50">
                          {lN ? (lN.result === "NA" ? "-" : (lN.set_point || "")) : ""}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
                {/* 2. Actual Row */}
                <tr className="hover:bg-blue-50/30 transition-colors border-b border-slate-100">
                  <td className="p-1.5 px-2 font-bold border-r border-slate-300 text-slate-700 bg-slate-50/30 text-[10px]">Actual</td>
                  {daysToShow.map((d) => {
                    const lD = getLogsForDateShift(d, "D", dpItemName || "");
                    const lN = getLogsForDateShift(d, "N", dpItemName || "");
                    return (
                      <React.Fragment key={d}>
                        <td className="border-r border-slate-200 p-0 text-center align-middle h-7 text-[9px] text-emerald-600 font-bold">
                          {lD ? (lD.result === "NA" ? "-" : (lD.actual || "")) : ""}
                        </td>
                        <td className="border-r border-slate-300 p-0 text-center align-middle h-7 text-[9px] text-emerald-600 font-bold bg-slate-50/50">
                          {lN ? (lN.result === "NA" ? "-" : (lN.actual || "")) : ""}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
                {/* 3. Dew Point Row */}
                <tr className="hover:bg-blue-50/30 transition-colors border-b border-slate-100">
                  <td className="p-1.5 px-2 font-bold border-r border-slate-300 text-slate-700 bg-slate-50/30 text-[10px]">Dew Point</td>
                  {daysToShow.map((d) => {
                    const lD = getLogsForDateShift(d, "D", dpItemName || "");
                    const lN = getLogsForDateShift(d, "N", dpItemName || "");
                    return (
                      <React.Fragment key={d}>
                        <td className="border-r border-slate-200 p-0 text-center align-middle h-7 text-[9px] text-cyan-600 font-bold">
                          {lD ? (lD.result === "NA" ? "-" : (lD.dew_point_val || "")) : ""}
                        </td>
                        <td className="border-r border-slate-300 p-0 text-center align-middle h-7 text-[9px] text-cyan-600 font-bold bg-slate-50/50">
                          {lN ? (lN.result === "NA" ? "-" : (lN.dew_point_val || "")) : ""}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
                {/* 4. Machine Status Row */}
                <tr className="hover:bg-blue-50/30 transition-colors border-b border-slate-100">
                  <td className="p-1.5 px-2 font-bold border-r border-slate-300 text-slate-700 bg-slate-50/30 text-[10px]">สถานะเครื่อง</td>
                  {daysToShow.map((d) => {
                    const lD = getLogsForDateShift(d, "D", dpItemName || "");
                    const lN = getLogsForDateShift(d, "N", dpItemName || "");
                    return (
                      <React.Fragment key={d}>
                        <td className="border-r border-slate-200 p-0 text-center align-middle h-7">
                          {lD && <CellContent res={getResultDisplay(lD.result)} log={lD} hideTooltip={true} />}
                        </td>
                        <td className="border-r border-slate-300 p-0 text-center align-middle h-7 bg-slate-50/50">
                          {lN && <CellContent res={getResultDisplay(lN.result)} log={lN} hideTooltip={true} />}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
                {/* 5. Remark Row */}
                <tr className="hover:bg-blue-50/30 transition-colors border-b border-slate-100 bg-amber-50/10">
                  <td className="p-1.5 px-2 font-bold border-r border-slate-300 text-amber-700 bg-amber-50/20 text-[10px]">Remark</td>
                  {daysToShow.map((d) => {
                    const lD = getLogsForDateShift(d, "D", dpItemName || "");
                    const lN = getLogsForDateShift(d, "N", dpItemName || "");
                    return (
                      <React.Fragment key={d}>
                        <td className="border-r border-slate-200 p-0 text-center align-middle h-7">
                          {lD ? (
                            lD.result === "NA" ? (
                              <span className="text-slate-400 text-[10px] font-bold">-</span>
                            ) : lD.problem_detail ? (
                              <div className="group/remark relative cursor-help inline-block">
                                <span className="text-amber-500 font-black text-xs animate-pulse">!</span>
                                <div className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/95 text-white text-[10px] p-2 rounded-lg w-32 hidden group-hover/remark:block shadow-xl border border-slate-700 whitespace-normal">
                                  {lD.problem_detail}
                                </div>
                              </div>
                            ) : null
                          ) : null}
                        </td>
                        <td className="border-r border-slate-300 p-0 text-center align-middle h-7 bg-slate-50/50">
                          {lN ? (
                            lN.result === "NA" ? (
                              <span className="text-slate-400 text-[10px] font-bold">-</span>
                            ) : lN.problem_detail ? (
                              <div className="group/remark relative cursor-help inline-block">
                                <span className="text-amber-500 font-black text-xs animate-pulse">!</span>
                                <div className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/95 text-white text-[10px] p-2 rounded-lg w-32 hidden group-hover/remark:block shadow-xl border border-slate-700 whitespace-normal">
                                  {lN.problem_detail}
                                </div>
                              </div>
                            ) : null
                          ) : null}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
                {/* 5.1 Time Row */}
                <tr className="hover:bg-blue-50/30 transition-colors border-b border-slate-100">
                  <td className="p-1.5 px-2 font-bold border-r border-slate-300 text-slate-700 bg-slate-50/30 text-[10px]">Time</td>
                  {daysToShow.map((d) => {
                    const lD = getLogsForDateShift(d, "D", dpItemName || "");
                    const lN = getLogsForDateShift(d, "N", dpItemName || "");
                    return (
                      <React.Fragment key={d}>
                        <td className="border-r border-slate-200 p-0 text-center align-middle h-7 text-[9px] text-slate-500 font-bold">
                          {lD && lD.result !== "NA" ? formatTime(lD.timestamp) : ""}
                        </td>
                        <td className="border-r border-slate-300 p-0 text-center align-middle h-7 text-[9px] text-slate-500 font-bold bg-slate-50/50">
                          {lN && lN.result !== "NA" ? formatTime(lN.timestamp) : ""}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
                {/* 6. Recorder Row */}
                <tr className="hover:bg-blue-50/30 transition-colors border-b border-slate-100 bg-blue-50/10">
                  <td className="p-1.5 px-2 font-bold border-r border-slate-300 text-blue-700 bg-blue-50/20 text-[10px]">ผู้บันทึก</td>
                  {daysToShow.map((d) => (
                    <React.Fragment key={d}>
                      <td className="border-r border-slate-200 p-0 text-center align-middle h-7 text-[8px] font-bold text-blue-500">
                        {getInspectorName(d, "D")?.substring(0, 4) || ""}
                      </td>
                      <td className="border-r border-slate-300 p-0 text-center align-middle h-7 text-[8px] font-bold text-blue-500 bg-slate-50/50">
                        {getInspectorName(d, "N")?.substring(0, 4) || ""}
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              </>
            ) : (
              // ✅ STANDARD DAILY CHECK ROWS
              <>
                {machine.checklist.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50/30 transition-colors border-b border-slate-100"
                  >
                    <td
                      className="p-1.5 px-2 font-medium border-r border-slate-300 truncate text-slate-700 bg-white"
                      title={item.detail}
                    >
                      {item.detail}
                    </td>
                    {daysToShow.map((d) => {
                      const logD = getLogsForDateShift(d, "D", item.detail);
                      const logN = getLogsForDateShift(d, "N", item.detail);
                      return (
                        <React.Fragment key={d}>
                          <td className="border-r border-slate-200 p-0 align-middle h-6 text-center">
                            <CellContent
                              res={logD ? getResultDisplay(logD.result) : null}
                              log={logD}
                            />
                          </td>
                          <td className="border-r border-slate-300 p-0 align-middle h-6 text-center bg-slate-50/50">
                            <CellContent
                              res={logN ? getResultDisplay(logN.result) : null}
                              log={logN}
                            />
                          </td>
                        </React.Fragment>
                      );
                    })}
                    {Array.from({ length: 16 - daysToShow.length }).map((_, i) => (
                      <React.Fragment key={`e-${i}`}>
                        <td className="border-r border-slate-200" />
                        <td className="border-r border-slate-200" />
                      </React.Fragment>
                    ))}
                  </tr>
                ))}

                {/* แถว 1: ผู้บันทึก */}
                <tr className="bg-blue-50/30">
                  <td className="p-1 px-2 font-bold text-blue-700 border-r border-slate-300 text-[10px] bg-blue-50/50">
                    ผู้บันทึก (Recorder)
                  </td>
                  {daysToShow.map((d) => {
                    const recD = getInspectorName(d, "D");
                    const recN = getInspectorName(d, "N");
                    return (
                      <React.Fragment key={d}>
                        <td className="border-r border-slate-200 p-0 h-7 text-center align-middle">
                          {recD && (
                            <span className="text-[9px] text-blue-600 block font-bold leading-none">
                              {recD.substring(0, 4)}
                            </span>
                          )}
                        </td>
                        <td className="border-r border-slate-300 p-0 h-7 text-center align-middle bg-slate-50/50">
                          {recN && (
                            <span className="text-[9px] text-blue-600 block font-bold leading-none">
                              {recN.substring(0, 4)}
                            </span>
                          )}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  {Array.from({ length: 16 - daysToShow.length }).map((_, i) => (
                    <React.Fragment key={`rec-e-${i}`}>
                      <td className="border-r border-slate-200" />
                      <td className="border-r border-slate-200" />
                    </React.Fragment>
                  ))}
                </tr>
              </>
            )}

            {/* แถว 2: ผู้ตรวจสอบ (Audit) - ซ่อนในโหมด Dew Point */}
            {!isDewPointMode && (
              <tr className="bg-green-50/20">
                <td className="p-1 px-2 font-bold text-green-700 border-r border-slate-300 text-[10px] bg-green-50/30">
                  ผู้ตรวจสอบ (Approve)
                </td>
                {daysToShow.map((d) => {
                  const auditD = (auditLogs || []).find(
                    (a) =>
                      a.mid === machine.id &&
                      a.year === year &&
                      a.month === month &&
                      a.day === d &&
                      a.shift === "D"
                  );
                  const auditN = (auditLogs || []).find(
                    (a) =>
                      a.mid === machine.id &&
                      a.year === year &&
                      a.month === month &&
                      a.day === d &&
                      a.shift === "N"
                  );

                  const dateStr = `${year}-${String(month).padStart(
                    2,
                    "0"
                  )}-${String(d).padStart(2, "0")}`;
                  const countD = (logs || []).filter(
                    (l) =>
                      l.mid === machine.id &&
                      l.date === dateStr &&
                      l.shift === "D"
                  ).length;
                  const isCompleteD =
                    countD === machine.checklist.length &&
                    machine.checklist.length > 0;
                  const countN = (logs || []).filter(
                    (l) =>
                      l.mid === machine.id &&
                      l.date === dateStr &&
                      l.shift === "N"
                  ).length;
                  const isCompleteN =
                    countN === machine.checklist.length &&
                    machine.checklist.length > 0;

                  return (
                    <React.Fragment key={d}>
                      <td className="text-center border-r border-slate-200 p-0 align-middle h-7">
                        {auditD ? (
                          <span className="text-[8px] text-green-700 font-bold block leading-none">
                            {auditD.auditor.substring(0, 4)}
                          </span>
                        ) : isCompleteD ? (
                          <button
                            onClick={() => handleSignOff(d, "D")}
                            className={`w-4 h-4 rounded text-[8px] text-white mx-auto flex items-center justify-center leading-none shadow-sm transition-all ${canVerify
                              ? "bg-green-500 hover:bg-green-600"
                              : "bg-gray-300 cursor-not-allowed"
                              }`}
                            title={
                              canVerify
                                ? "ยืนยันการตรวจ"
                                : "คุณไม่มีสิทธิ์ตรวจสอบ"
                            }
                          >
                            ✓
                          </button>
                        ) : null}
                      </td>
                      <td className="text-center border-r border-slate-300 p-0 align-middle h-7 bg-slate-50/50">
                        {auditN ? (
                          <span className="text-[8px] text-green-700 font-bold block leading-none">
                            {auditN.auditor.substring(0, 4)}
                          </span>
                        ) : isCompleteN ? (
                          <button
                            onClick={() => handleSignOff(d, "N")}
                            className={`w-4 h-4 rounded text-[8px] text-white mx-auto flex items-center justify-center leading-none shadow-sm transition-all ${canVerify
                              ? "bg-green-500 hover:bg-green-600"
                              : "bg-gray-300 cursor-not-allowed"
                              }`}
                            title={
                              canVerify
                                ? "ยืนยันการตรวจ"
                                : "คุณไม่มีสิทธิ์ตรวจสอบ"
                            }
                          >
                            ✓
                          </button>
                        ) : null}
                      </td>
                    </React.Fragment>
                  );
                })}
                {Array.from({ length: 16 - daysToShow.length }).map((_, i) => (
                  <React.Fragment key={`aud-e-${i}`}>
                    <td className="border-r border-slate-200" />
                    <td className="border-r border-slate-200" />
                  </React.Fragment>
                ))}
              </tr>
            )}

            {/* แถว 3: ลบข้อมูล */}
            <tr className="bg-red-50/10">
              <td className="p-1 px-2 font-bold text-red-400 border-r border-slate-300 text-[10px] bg-red-50/20">
                ลบข้อมูล
              </td>
              {daysToShow.map((d) => {
                const hasLogD = (logs || []).some(
                  (l) =>
                    l.mid === machine.id &&
                    l.date ===
                    `${year}-${String(month).padStart(2, "0")}-${String(
                      d
                    ).padStart(2, "0")}` &&
                    l.shift === "D"
                );
                const hasLogN = (logs || []).some(
                  (l) =>
                    l.mid === machine.id &&
                    l.date ===
                    `${year}-${String(month).padStart(2, "0")}-${String(
                      d
                    ).padStart(2, "0")}` &&
                    l.shift === "N"
                );
                return (
                  <React.Fragment key={d}>
                    <td className="text-center border-r border-slate-200 p-0 align-middle h-6">
                      {hasLogD && (
                        // ✅ แสดงปุ่มลบ (ถ้าไม่มีสิทธิ์จะกดไม่ได้/แจ้งเตือน)
                        <button
                          onClick={() => handleOpenDelete(d, "D")}
                          className={`font-bold text-[10px] w-full h-full block ${canDelete
                            ? "text-red-300 hover:text-red-600"
                            : "text-gray-300 cursor-not-allowed"
                            }`}
                          title={canDelete ? "ลบข้อมูล" : "คุณไม่มีสิทธิ์ลบ"}
                        >
                          x
                        </button>
                      )}
                    </td>
                    <td className="text-center border-r border-slate-300 p-0 align-middle h-6 bg-slate-50/50">
                      {hasLogN && (
                        <button
                          onClick={() => handleOpenDelete(d, "N")}
                          className={`font-bold text-[10px] w-full h-full block ${canDelete
                            ? "text-red-300 hover:text-red-600"
                            : "text-gray-300 cursor-not-allowed"
                            }`}
                          title={canDelete ? "ลบข้อมูล" : "คุณไม่มีสิทธิ์ลบ"}
                        >
                          x
                        </button>
                      )}
                    </td>
                  </React.Fragment>
                );
              })}
              {Array.from({ length: 16 - daysToShow.length }).map((_, i) => (
                <React.Fragment key={`del-e-${i}`}>
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <DeleteSelectionModal
          machine={machine}
          date={deleteTarget.date}
          shift={deleteTarget.shift}
          logs={logs}
          user={user}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
});
function InspectView({
  machines,
  user,
  onSelect,
  onShowUsers,
  onShowMachines,
  workingDate,
  workingShift,
}: {
  machines: Machine[];
  user: User;
  onSelect: (m: Machine) => void;
  onShowUsers: () => void;
  onShowMachines: () => void;
  workingDate: string;
  workingShift: string;
}) {
  const [expandedLines, setExpandedLines] = useState<string[]>([]);

  // ✅ 1. เพิ่ม State สำหรับสถานะการโหลด
  const [isLoading, setIsLoading] = useState(false);

  // จัดกลุ่มเครื่องจักรตาม Process และเรียงลำดับ
  const groupedMachines = React.useMemo(() => {
    const groups: Record<string, Machine[]> = {};
    machines.forEach((m) => {
      const pName =
        m.process && m.process.trim() !== "" ? m.process : "General / อื่นๆ";
      if (!groups[pName]) {
        groups[pName] = [];
      }
      groups[pName].push(m);
    });
    // เรียงเครื่องจักรภายในกลุ่มตามชื่อ (ก-ฮ)
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    });
    return groups;
  }, [machines]);

  // ประกาศตัวแปรสำหรับเรียงชื่อ Line
  const sortedProcessNames = Object.keys(groupedMachines).sort();

  const toggleLine = (lineName: string) => {
    if (expandedLines.includes(lineName)) {
      setExpandedLines(expandedLines.filter((l) => l !== lineName));
    } else {
      setExpandedLines([...expandedLines, lineName]);
    }
  };

  const handleQuickNA = async (machineList: Machine[]) => {
    // 1. ตั้งชื่อข้อความยืนยัน
    const confirmMsg =
      machineList.length === 1
        ? `ยืนยัน "${machineList[0].name}" ไม่ใช้งาน?`
        : `ยืนยันเครื่องจักร ${machineList.length} เครื่องในแผนกนี้ไม่ใช้งาน?`;

    if (!window.confirm(confirmMsg)) return;

    setIsLoading(true);

    try {
      // 2. ดึงข้อมูล Log มาเช็ค (ระบุวันที่และกะให้ชัดเจน)
      const q = query(
        collection(db, "logs"),
        where("date", "==", workingDate),
        where("shift", "==", workingShift)
      );
      const snap = await getDocs(q);

      // ✅ ทำความสะอาดข้อมูล Log ก่อนเทียบ (แปลงเป็น String ทั้งหมด)
      const existingLogs = snap.docs.map((d) => ({
        mid: String(d.data().mid || "").trim(),
        item: String(d.data().checklist_item || "").trim(),
      }));

      const batch = writeBatch(db);
      const blockedMachines = new Set();
      const blockedItems = [];

      // 3. เริ่มวนลูปเช็ครายรายการ
      machineList.forEach((m) => {
        const isDp = m.systemMode === "DEW_POINT";
        // สำหรับ Dew Point ถ้าไม่มี checklist ให้ใช้ชื่อกลาง หรือใช้ชื่อแรกถ้ามี
        const checklist = m.checklist && m.checklist.length > 0
          ? m.checklist
          : isDp ? [{ detail: "Dew Point Check" }] : [];

        const mId = String(m.id || "").trim();

        checklist.forEach((item: any) => {
          const itemDetail = String(item.detail || "").trim();

          const duplicate = existingLogs.find(
            (ex) => ex.mid === mId && ex.item === itemDetail
          );

          if (duplicate) {
            blockedMachines.add(m.name);
            blockedItems.push(itemDetail);
          } else {
            const logRef = doc(collection(db, "logs"));
            batch.set(logRef, {
              mid: m.id,
              checklist_item: item.detail,
              result: "NA",
              inspector: user.username,
              date: workingDate,
              shift: workingShift,
              timestamp: serverTimestamp(),
            });
          }
        });
      });

      // 4. การแจ้งเตือนเมื่อพบข้อมูลซ้ำ (ฉบับกระชับตามสั่ง)
      if (blockedMachines.size > 0) {
        if (machineList.length > 1) {
          // --- ✅ กรณีที่ 1: กดหยุดผลิตทั้งไลน์ (ใช้ชื่อไลน์จากเครื่องแรกในลิสต์) ---
          const lineName = machineList[0].process || "General";
          alert(`❌ ${lineName} มีการบันทึกข้อมูลแล้ว`);
        } else {
          // --- ✅ กรณีที่ 2: กดหยุดผลิตรายเครื่อง ---
          alert(`❌ ${machineList[0].name} มีการบันทึกข้อมูลแล้ว`);
        }
        return; // ⛔ หยุดการทำงาน ไม่บันทึกซ้ำ
      }

      // 5. บันทึกข้อมูลถ้าไม่มีรายการซ้ำเลย
      await batch.commit();
      alert("✅ บันทึกสถานะเรียบร้อย");
    } catch (error) {
      console.error("Batch NA Error:", error);
      alert("เกิดข้อผิดพลาดในการตรวจสอบข้อมูลซ้ำ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ✅ 3. ถ้า isLoading เป็น true จะทำให้หน้าเจอมัวและกดปุ่มไม่ได้ (Prevent Multi-click)
    <div
      className={`pb-20 transition-opacity duration-200 ${isLoading ? "opacity-50 pointer-events-none" : "opacity-100"
        }`}
    >
      <div className="space-y-3">
        {sortedProcessNames.map((processName) => {
          const machinesInLine = groupedMachines[processName];
          const isExpanded = expandedLines.includes(processName);

          return (
            <div key={processName} className="bg-transparent overflow-hidden">
              {/* Header ของ Line */}
              <div
                onClick={() => toggleLine(processName)}
                className={`w-full p-4 flex justify-between items-center transition-all rounded-xl border mb-2 cursor-pointer ${isExpanded
                  ? "bg-[#1E293B] border-blue-500/50 shadow-lg shadow-blue-900/20"
                  : "bg-[#1E293B]/60 border-slate-700 hover:bg-[#1E293B]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${isExpanded
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-400"
                      }`}
                  >
                    <Crown size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-100 text-lg">
                      {processName}
                    </div>
                    <div className="text-xs text-slate-400">
                      มีเครื่องจักร {machinesInLine.length} เครื่อง
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isExpanded && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickNA(machinesInLine);
                      }}
                      disabled={isLoading}
                      className="bg-slate-800 hover:bg-amber-600 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border border-slate-700 uppercase disabled:opacity-50"
                    >
                      {isLoading ? "กำลังบันทึก..." : "ไม่ใช้งาน"}
                    </button>
                  )}
                  <ChevronDown
                    className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180 text-blue-400" : ""
                      }`}
                    size={24}
                  />
                </div>
              </div>

              {/* รายชื่อเครื่องจักร */}
              {isExpanded && (
                <div className="pl-2 pr-2 pb-2">
                  <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                    {machinesInLine.map((m: Machine) => (
                      <div
                        key={m.id}
                        onClick={() => !isLoading && onSelect(m)}
                        className="relative bg-[#1E293B] p-3 rounded-r-xl rounded-l-md shadow-lg border border-slate-700 border-l-4 border-l-blue-500 hover:border-blue-400 transition-all text-left flex justify-between items-center group cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <div className="font-bold text-base text-white group-hover:text-blue-300 transition-colors">
                            {m.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <ClipboardCheck size={12} /> {m.checklist.length}{" "}
                            จุดตรวจ
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickNA([m]);
                            }}
                            disabled={isLoading}
                            className="bg-slate-800 border border-slate-700 text-slate-500 hover:text-amber-500 p-2 rounded-lg disabled:opacity-50"
                          >
                            <FileX size={16} />
                          </button>
                          <div className="bg-slate-800 border border-slate-700 text-slate-400 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white">
                            <Plus size={16} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 1. MachineHistoryRow (Component ย่อยสำหรับแถวตาราง)
// ==========================================
const MachineHistoryRow = ({
  machine,
  logs,
  auditLogs,
  user,
  isAdmin,
  month,
  year,
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState<1 | 2>(1); // 1 = 1-15, 2 = 16-End

  return (
    <div
      className={`group bg-[#1E293B] rounded-xl border overflow-hidden shadow-md transition-all ${isOpen ? "border-blue-500/50" : "border-slate-700"
        }`}
    >
      {/* Header (ส่วนหัวกดเพื่อเปิด/ปิด) */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center cursor-pointer hover:bg-[#2d3b52]"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-600/20 p-1.5 rounded text-blue-400">
            <BarChart3 size={16} />
          </div>
          <div>
            <h3 className="font-bold text-slate-200 text-sm group-hover:text-blue-300 transition-colors">
              {machine.name}
            </h3>
            <p className="text-[10px] text-slate-400">
              {machine.process || "General"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* ปุ่มสลับหน้า (โชว์เฉพาะตอนเปิด) */}
          {isOpen && (
            <div
              className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-600 mr-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPage(1)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${page === 1
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
                  }`}
              >
                1-15
              </button>
              <button
                onClick={() => setPage(2)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${page === 2
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
                  }`}
              >
                16+
              </button>
            </div>
          )}

          <div className="text-[10px] text-slate-500 font-mono hidden sm:block">
            ID: {machine.id}
          </div>
          <ChevronDown
            className={`transition-transform text-slate-500 ${isOpen ? "rotate-180 text-blue-400" : ""
              }`}
            size={18}
          />
        </div>
      </div>

      {/* Content (ตาราง) */}
      {isOpen && (
        <div className="p-2 bg-white overflow-x-auto border-t border-slate-600 animate-in slide-in-from-top-1 duration-200">
          {/* เรียกใช้ MachineHistory (ต้องมั่นใจว่า function MachineHistory ถูกประกาศไว้ก่อนหน้าในไฟล์นี้แล้ว) */}
          <MachineHistory
            machine={machine}
            logs={logs}
            auditLogs={auditLogs}
            user={user}
            isAdmin={isAdmin}
            month={month}
            year={year}
            page={page}
          />
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. DataView (หน้าหลักสำหรับดูข้อมูล)
// ==========================================
function DataView({ machines, user }: { machines: Machine[]; user: User }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [filterProcess, setFilterProcess] = useState("All");

  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const mStr = String(viewMonth).padStart(2, "0");
    const startDateStr = `${viewYear}-${mStr}-01`;
    const lastDay = new Date(viewYear, viewMonth, 0).getDate();
    const endDateStr = `${viewYear}-${mStr}-${String(lastDay).padStart(
      2,
      "0"
    )}`;

    const qLogs = query(
      collection(db, "logs"),
      where("date", ">=", startDateStr),
      where("date", "<=", endDateStr)
    );
    const qAudit = query(
      collection(db, "audit_logs"),
      where("year", "==", viewYear),
      where("month", "==", viewMonth)
    );

    const unsubL = onSnapshot(qLogs, (snap) =>
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LogEntry)))
    );
    const unsubA = onSnapshot(qAudit, (snap) =>
      setAuditLogs(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog))
      )
    );

    return () => {
      unsubL();
      unsubA();
    };
  }, [viewMonth, viewYear]);

  const isAdmin = user.role === "super_admin" || user.role === "admin";

  const filteredMachines = machines.filter((m) => {
    if (filterProcess === "All") return true;
    const pName = m.process || "General";
    return pName === filterProcess;
  });

  const processes = [
    "All",
    ...Array.from(
      new Set(
        machines.map((m) => m.process || "General").filter((p) => p !== "")
      )
    ).sort(),
  ];

  return (
    <div className="pb-20 w-full max-w-[100%] mx-auto">
      {/* Header Bar */}
      <div className="bg-[#1E293B] p-4 rounded-xl shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center mb-6 gap-4 sticky top-0 z-20">
        <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
          <History className="text-blue-400" /> ประวัติการตรวจสอบ
        </h2>

        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* ตัวเลือกเดือนปี */}
          <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-600">
            <span className="text-xs text-slate-400 pl-2">เดือน:</span>
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="bg-transparent border-none p-1 font-bold text-sm text-blue-400 focus:ring-0 cursor-pointer"
            >
              {THAI_MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="bg-transparent border-none p-1 w-16 text-center font-bold text-sm text-blue-400 focus:ring-0 bg-slate-900 rounded"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Line:</span>
            <select
              value={filterProcess}
              onChange={(e) => setFilterProcess(e.target.value)}
              className="border border-slate-600 rounded p-1.5 text-sm bg-slate-800 text-slate-200 shadow-sm focus:ring-1 focus:ring-blue-500"
            >
              {processes.map((p, i) => (
                <option key={i} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {user?.permissions?.daily_check?.delete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500/20 border border-red-500/30 transition-colors flex items-center gap-1"
            >
              <Trash2 size={14} /> ลบ
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {filteredMachines.map((m) => (
          // ✅ เรียกใช้ MachineHistoryRow ได้อย่างถูกต้องเพราะประกาศไว้ข้างบนแล้ว
          <MachineHistoryRow
            key={m.id}
            machine={m}
            logs={logs}
            auditLogs={auditLogs}
            user={user}
            isAdmin={isAdmin}
            month={viewMonth}
            year={viewYear}
          />
        ))}

        {filteredMachines.length === 0 && (
          <div className="text-center py-10 text-slate-500 bg-[#1E293B]/50 rounded-xl border border-dashed border-slate-700">
            -- ไม่พบข้อมูลเครื่องจักรใน Line ที่เลือก --
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="text-gray-900">
          <DeleteMonthlyModal
            onClose={() => setShowDeleteModal(false)}
            user={user}
          />
        </div>
      )}
    </div>
  );
}

function DashboardView({
  machines,
  user,
}: {
  machines: Machine[];
  user: User;
}) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedProcess, setSelectedProcess] = useState("All");
  const [selectedMachineId, setSelectedMachineId] = useState("All");

  const [reportData, setReportData] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ✅ Validation States
  const [filterMode, setFilterMode] = useState<"ALL" | "ABNORMAL" | "MISSING">(
    "ALL"
  );
  const [stats, setStats] = useState({ total: 0, abnormal: 0, missing: 0 });
  const [detailMachine, setDetailMachine] = useState<any>(null);
  const [selectedDayInfo, setSelectedDayInfo] = useState<any>(null);

  const yearOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    return [cur - 1, cur, cur + 1].map((y) => ({ label: String(y), value: y }));
  }, []);

  const processOptions = useMemo(() => {
    if (!machines || machines.length === 0)
      return [{ label: "-- All Lines --", value: "All" }];
    const uniqueProcesses = Array.from(
      new Set(machines.map((m) => m.process || "General"))
    ).sort();
    return [
      { label: "-- All Lines --", value: "All" },
      ...uniqueProcesses.map((p) => ({ label: p, value: p })),
    ];
  }, [machines]);

  const machineOptions = useMemo(() => {
    let filtered = machines || [];
    if (selectedProcess !== "All") {
      filtered = filtered.filter(
        (m) => (m.process || "General") === selectedProcess
      );
    }
    return [
      { label: "-- All Machines --", value: "All" },
      ...filtered
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) => ({ label: m.name, value: m.id })),
    ];
  }, [selectedProcess, machines]);

  useEffect(() => {
    setSelectedMachineId("All");
  }, [selectedProcess]);

  const fetchReport = async () => {
    setIsLoadingReport(true);
    setReportData([]);
    setAllLogs([]);
    try {
      const now = new Date();
      const todayDate = now.getDate();
      // เช็คว่าเป็นเดือนปัจจุบัน/ปีปัจจุบัน หรือไม่
      const isCurrentMonth =
        now.getMonth() + 1 === selectedMonth &&
        now.getFullYear() === selectedYear;
      const isPastMonth =
        selectedYear < now.getFullYear() ||
        (selectedYear === now.getFullYear() &&
          selectedMonth < now.getMonth() + 1);

      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      // ✅ วันที่ "ควรจะ" ตรวจเสร็จแล้ว (ถ้าเดือนที่แล้ว = ทั้งเดือน, ถ้าเดือนนี้ = ถึงแค่วันนี้)
      const daysToBeChecked = isPastMonth
        ? daysInMonth
        : isCurrentMonth
          ? todayDate
          : 0;

      const mStr = String(selectedMonth).padStart(2, "0");
      const startDateStr = `${selectedYear}-${mStr}-01`;
      const endDateStr = `${selectedYear}-${mStr}-${String(
        daysInMonth
      ).padStart(2, "0")}`;

      const q = query(
        collection(db, "logs"),
        where("date", ">=", startDateStr),
        where("date", "<=", endDateStr)
      );
      const snapshot = await getDocs(q);
      const fetchedLogs = snapshot.docs.map((d) => d.data() as LogEntry);
      setAllLogs(fetchedLogs);

      const grouped: Record<string, any> = {};
      let abnormalTotal = 0;

      const machinesToShow = machines.filter((m) => {
        const matchP =
          selectedProcess === "All" ||
          (m.process || "General") === selectedProcess;
        const matchM =
          selectedMachineId === "All" || m.id === selectedMachineId;
        return matchP && matchM;
      });

      machinesToShow.forEach((m) => {
        grouped[m.id] = {
          ...m,
          status: "GRAY",
          checkDays: new Set(),
          abnormalCount: 0,
        };
      });

      fetchedLogs.forEach((log) => {
        if (grouped[log.mid]) {
          grouped[log.mid].checkDays.add(log.date);
          if (log.result === "ABNORMAL") {
            grouped[log.mid].status = "RED";
            grouped[log.mid].abnormalCount += 1;
          }
        }
      });

      const finalArray = Object.values(grouped).map((m: any) => {
        const uniqueDays = m.checkDays.size;

        // ✅ ตรรกะแบ่งประเภท สีเหลือง (Missing) vs สีเทา (No Data)
        if (m.status !== "RED") {
          if (uniqueDays >= daysToBeChecked && daysToBeChecked > 0) {
            m.status = "GREEN";
          } else if (daysToBeChecked > 0 && uniqueDays < daysToBeChecked) {
            m.status = "YELLOW"; // ตรวจไม่ครบ หรือ ลืมตรวจเลยในวันที่ผ่านมาแล้ว
          } else {
            m.status = "GRAY"; // อนาคต (ยังไม่ถึงเวลาตรวจ)
          }
        }

        if (m.status === "RED") abnormalTotal++;
        return { ...m, checkCount: uniqueDays };
      });

      setReportData(finalArray.sort((a, b) => a.name.localeCompare(b.name)));
      setStats({
        total: finalArray.length,
        abnormal: abnormalTotal,
        missing: finalArray.filter((m) => m.status === "YELLOW").length,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleExportCSV = async () => {
    if (allLogs.length === 0) return alert("กรุณากดค้นหาข้อมูลก่อน Export");

    setIsExporting(true);

    try {
      // 1. ดึง Ticket ทั้งหมดมาพักไว้ในเครื่อง
      const ticketSnap = await getDocs(collection(db, "maintenance_tickets"));
      const allTickets = ticketSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

      // 2. กำหนด Headers (เพิ่ม Ticket_ID, Repair_Problem, Repair_Action)
      const headers = [
        "Date",
        "Year",
        "Month",
        "Shift",
        "Machine_ID",
        "Machine_Name",
        "Line",
        "Material",
        "Time",
        "Check_Item",
        "Result",
        "Problem_Detail",
        "Inspector",
        "Ticket_ID",
        "Repair_Problem", // <-- สาเหตุที่ช่างพบ (Cause)
        "Repair_Action", // <-- การแก้ไข (Correction)
      ];

      const rows: string[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(
          2,
          "0"
        )}-${String(day).padStart(2, "0")}`;

        ["D", "N"].forEach((shift) => {
          machines.forEach((m) => {
            const matchP =
              selectedProcess === "All" ||
              (m.process || "General") === selectedProcess;
            const matchM =
              selectedMachineId === "All" || m.id === selectedMachineId;

            if (matchP && matchM) {
              const checklist = m.checklist || [];
              checklist.forEach((item) => {
                const log = allLogs.find(
                  (l) =>
                    l.date === dateStr &&
                    l.shift === shift &&
                    l.mid === m.id &&
                    String(l.checklist_item) === String(item.detail)
                );

                let ticketId = "-";
                let repairProblem = "-"; // เริ่มต้นด้วยค่าว่าง
                let repairAction = "-";

                // 3. LOGIC เชื่อมข้อมูลด้วย ID (Hard Link)
                if (log && log.linked_ticket_id) {
                  const matchTicket = allTickets.find(
                    (t) => t.id === log.linked_ticket_id
                  );
                  if (matchTicket) {
                    ticketId = matchTicket.id;

                    // ดึงสาเหตุ (Cause) และ การแก้ไข (Correction) จากฝั่งช่าง
                    if ((matchTicket as any).close_data) {
                      repairProblem = (matchTicket as any).close_data.cause || "-";
                      repairAction = (matchTicket as any).close_data.correction || "-";
                    } else {
                      // กรณีใบงานยังไม่ปิด (ยังไม่มี close_data)
                      repairProblem = "กำลังตรวจสอบ";
                      repairAction = `สถานะ: ${(matchTicket as any).status}`;
                    }
                  }
                }
                // กรณีที่ตรวจเจอ ABNORMAL แต่ไม่มี ID ผูก (ไม่ได้กดแจ้งซ่อมผ่านระบบ)
                else if (log && log.result === "ABNORMAL") {
                  ticketId = "ไม่มีการแจ้งซ่อม";
                  repairProblem = "ไม่มีการแจ้งซ่อม";
                  repairAction = "ไม่มีการแจ้งซ่อม";
                }

                // 4. สร้างแถวข้อมูล (Row)
                const row = [
                  dateStr,
                  selectedYear,
                  selectedMonth,
                  shift === "D" ? "Day" : "Night",
                  m.id,
                  `"${m.name}"`,
                  `"${m.process || "General"}"`,
                  `"${log?.material_name || "-"}"`,
                  log ? formatTime(log.timestamp) : "-",
                  `"${item.detail}"`,
                  log ? log.result : "MISSING",
                  log
                    ? `"${(log.problem_detail || "-").replace(/,/g, " ")}"`
                    : "-",
                  log ? log.inspector : "-",
                  ticketId,
                  `"${(repairProblem || "-").replace(/,/g, " ")}"`, // สาเหตุจากช่าง
                  `"${(repairAction || "-").replace(/,/g, " ")}"`, // การแก้ไข
                ];
                rows.push(row.join(","));
              });
            }
          });
        });
      }

      // 5. สร้างไฟล์และสั่ง Download
      const blob = new Blob(
        ["\ufeff" + [headers.join(","), ...rows].join("\n")],
        { type: "text/csv;charset=utf-8;" }
      );
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const fileName = `Full_Audit_Report_${selectedYear}_${selectedMonth}.csv`;
      link.download = fileName;
      link.click();
    } catch (error) {
      console.error("Export Error:", error);
      alert("เกิดข้อผิดพลาดในการดึงข้อมูลส่งออก");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCardClick = (row: any) => {
    setDetailMachine(row);
    setSelectedDayInfo(null);
  };

  const MachineDetailModal = () => {
    if (!detailMachine) return null;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleDayClick = (day: number) => {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      const dayLogs = allLogs.filter(
        (l) => l.mid === detailMachine.id && l.date === dateStr
      );
      const masterChecklist = detailMachine.checklist || [];
      const abnormalLogs = dayLogs.filter((l) => l.result === "ABNORMAL");

      const getShiftIssues = (s: string) => {
        const logsInShift = dayLogs.filter((l) => l.shift === s);
        const checkedNames = logsInShift.map((l) => String(l.checklist_item));

        // 🔥 แก้ปัญหาตัวเบิ้ล: ใช้ Map เพื่อเก็บเฉพาะรายการที่ไม่ซ้ำกัน
        const abnormalMap = new Map();

        abnormalLogs
          .filter((l) => l.shift === s)
          .forEach((a) => {
            // ถ้าใน Map ยังไม่มีชื่อรายการนี้ ให้เพิ่มเข้าไป (ถ้ามีแล้วจะข้ามตัวถัดไปที่ซ้ำกัน)
            if (!abnormalMap.has(a.checklist_item)) {
              const labelWithMat = a.material_name
                ? `${a.checklist_item} [${a.material_name}]`
                : a.checklist_item;

              abnormalMap.set(a.checklist_item, {
                type: "ABNORMAL",
                label: labelWithMat,
                desc: a.problem_detail,
                user: a.inspector,
              });
            }
          });

        // แปลงจาก Map กลับเป็น Array เพื่อนำไปแสดงผล
        const shiftAbnormal = Array.from(abnormalMap.values());

        const shiftMissing = masterChecklist
          .filter((item: any) => !checkedNames.includes(String(item.detail)))
          .map((item: any) => ({
            type: "MISSING",
            label: item.detail,
            desc: "ยังไม่ได้บันทึกข้อมูล",
            user: "-",
          }));

        return {
          issues: [...shiftAbnormal, ...shiftMissing],
          checkedCount: new Set(checkedNames).size, // นับจำนวนข้อที่ไม่ซ้ำที่ตรวจแล้ว
          totalCount: masterChecklist.length,
        };
      };

      const dayData = getShiftIssues("D");
      const nightData = getShiftIssues("N");

      setSelectedDayInfo({
        date: dateStr,
        dayShift: dayData.issues,
        dayScore: `${dayData.checkedCount}/${dayData.totalCount}`,
        nightShift: nightData.issues,
        nightScore: `${nightData.checkedCount}/${nightData.totalCount}`,
      });
    };

    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[110] flex items-center justify-center p-4">
        <div className="bg-[#1E293B] w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
          {/* 1. Modal Header & Legend */}
          <div className="px-5 py-4 border-b border-slate-700 bg-slate-800/50">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600/20 p-2 rounded-lg">
                  <BarChart3 size={20} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    {detailMachine.name}
                  </h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                    Audit Overview Matrix
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDetailMachine(null);
                  setSelectedDayInfo(null);
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {/* Legend Section */}
            <div className="flex items-center gap-5 pt-2 border-t border-slate-700/50">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[9px] text-slate-400 font-black uppercase">
                  Complete
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-[9px] text-slate-400 font-black uppercase">
                  Missing
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-[9px] text-slate-400 font-black uppercase">
                  Abnormal
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                <span className="text-[9px] text-slate-400 font-black uppercase">
                  No Data
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 overflow-y-auto custom-scrollbar space-y-6">
            {/* 2. Matrix Calendar (กับตรรกะวันที่ Past/Future) */}
            <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
              {calendarDays.map((day) => {
                const dateStr = `${selectedYear}-${String(
                  selectedMonth
                ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                // ตรรกะเช็ควันที่
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const checkDate = new Date(
                  selectedYear,
                  selectedMonth - 1,
                  day
                );
                const isPastOrToday = checkDate <= today;

                const dayLogs = allLogs.filter(
                  (l) => l.mid === detailMachine.id && l.date === dateStr
                );
                const isAbnormal = dayLogs.some((l) => l.result === "ABNORMAL");
                const isComplete =
                  dayLogs.length >= (detailMachine.checklist?.length || 0) * 2;

                let bgColor = "bg-slate-800 text-slate-600 opacity-40"; // สีเทา (อนาคต)

                if (dayLogs.length > 0) {
                  if (isAbnormal)
                    bgColor = "bg-red-500 text-white shadow-lg animate-pulse";
                  else if (isComplete) bgColor = "bg-green-600 text-white";
                  else bgColor = "bg-amber-500 text-slate-900";
                } else if (isPastOrToday) {
                  // อดีตแต่ไม่มีข้อมูล = สีเหลือง (ลืมตรวจ)
                  bgColor = "bg-amber-500 text-slate-900 font-black";
                }

                const isSelected = selectedDayInfo?.date === dateStr;
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`aspect-square rounded-md flex items-center justify-center text-[11px] font-black transition-all hover:scale-110 ${bgColor} ${isSelected
                      ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 scale-110 z-10"
                      : ""
                      }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* 3. Exception Summary (แบ่งกะซ้าย-ขวา + Score + Healthy) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  EXCEPTION SUMMARY:{" "}
                  {selectedDayInfo
                    ? new Date(selectedDayInfo.date).getDate()
                    : "--"}{" "}
                  {MONTH_OPTIONS[selectedMonth - 1].label}
                </span>
              </div>

              {selectedDayInfo ? (
                <div className="grid grid-cols-2 gap-4 min-h-[160px]">
                  {/* Shift Day */}
                  <div className="bg-[#0F172A]/40 rounded-xl p-3 border border-slate-800/50">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                          Shift Day
                        </span>
                        <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-bold">
                          {selectedDayInfo.dayScore}
                        </span>
                      </div>
                      {selectedDayInfo.dayShift.length === 0 && (
                        <CheckCircle size={12} className="text-emerald-500" />
                      )}
                    </div>
                    <div className="space-y-1.5 min-h-[60px] flex flex-col justify-center">
                      {selectedDayInfo.dayShift.length > 0 ? (
                        selectedDayInfo.dayShift.map(
                          (issue: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div
                                className={`w-1 h-5 rounded-full shrink-0 ${issue.type === "ABNORMAL"
                                  ? "bg-red-500"
                                  : "bg-amber-500"
                                  }`}
                              ></div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-[10px] font-bold truncate leading-none ${issue.type === "ABNORMAL"
                                    ? "text-red-400"
                                    : "text-amber-500/80"
                                    }`}
                                >
                                  {issue.label}
                                </p>
                                <p className="text-[8px] text-slate-500 italic truncate mt-0.5">
                                  {issue.desc}
                                </p>
                              </div>
                            </div>
                          )
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4 opacity-30">
                          <CheckCircle2
                            size={24}
                            className="text-emerald-500 mb-1"
                          />
                          <p className="text-[9px] font-black uppercase tracking-tighter text-emerald-500/80">
                            Healthy Data
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shift Night */}
                  <div className="bg-[#0F172A]/40 rounded-xl p-3 border border-slate-800/50">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                          Shift Night
                        </span>
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 font-bold">
                          {selectedDayInfo.nightScore}
                        </span>
                      </div>
                      {selectedDayInfo.nightShift.length === 0 && (
                        <CheckCircle size={12} className="text-emerald-500" />
                      )}
                    </div>
                    <div className="space-y-1.5 min-h-[60px] flex flex-col justify-center">
                      {selectedDayInfo.nightShift.length > 0 ? (
                        selectedDayInfo.nightShift.map(
                          (issue: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div
                                className={`w-1 h-5 rounded-full shrink-0 ${issue.type === "ABNORMAL"
                                  ? "bg-red-500"
                                  : "bg-amber-500"
                                  }`}
                              ></div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-[10px] font-bold truncate leading-none ${issue.type === "ABNORMAL"
                                    ? "text-red-400"
                                    : "text-amber-500/80"
                                    }`}
                                >
                                  {issue.label}
                                </p>
                                <p className="text-[8px] text-slate-500 italic truncate mt-0.5">
                                  {issue.desc}
                                </p>
                              </div>
                            </div>
                          )
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4 opacity-30">
                          <CheckCircle2
                            size={24}
                            className="text-emerald-500 mb-1"
                          />
                          <p className="text-[9px] font-black uppercase tracking-tighter text-emerald-500/80">
                            Healthy Data
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center bg-[#0F172A]/30 rounded-xl border border-dashed border-slate-800 opacity-20">
                  <Info size={24} className="mb-2" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-center">
                    Select a date from the calendar matrix
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[100%] mx-auto pb-20 relative pt-4">
      {/* ✅ Search Panel (ปรับขนาดปุ่มให้เล็กลง) */}
      <div className="bg-[#1E293B] p-5 rounded-xl border border-slate-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">
              Line
            </label>
            <SearchableSelect
              options={processOptions}
              value={selectedProcess}
              onChange={setSelectedProcess}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">
              Machine
            </label>
            <SearchableSelect
              options={machineOptions}
              value={selectedMachineId}
              onChange={setSelectedMachineId}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">
              Month
            </label>
            <SearchableSelect
              options={MONTH_OPTIONS}
              value={selectedMonth}
              onChange={setSelectedMonth}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">
              Year
            </label>
            <SearchableSelect
              options={yearOptions}
              value={selectedYear}
              onChange={setSelectedYear}
            />
          </div>

          {/* ปุ่มที่ปรับขนาดให้ Compact ลง (30% ของพื้นที่เดิม) */}
          <div className="lg:col-span-3 flex gap-2">
            {/* ปุ่มค้นหาข้อมูล */}
            <button
              onClick={fetchReport}
              disabled={isLoadingReport || isExporting}
              className="bg-blue-600 text-white px-6 rounded-lg font-bold h-[42px] text-[11px] shadow-lg active:scale-95 w-fit min-w-[120px] flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoadingReport ? (
                <>
                  <Clock className="animate-spin" size={16} />
                  <span>กำลังค้นหา...</span>
                </>
              ) : (
                "ค้นหาข้อมูล"
              )}
            </button>

            {/* ปุ่ม Excel */}
            <button
              onClick={handleExportCSV}
              disabled={allLogs.length === 0 || isLoadingReport || isExporting}
              className="bg-emerald-600 text-white px-6 rounded-lg font-bold h-[42px] text-[11px] shadow-lg disabled:opacity-50 w-fit min-w-[120px] flex items-center justify-center gap-2 active:scale-95"
            >
              {isExporting ? (
                <>
                  <Clock className="animate-spin" size={16} />
                  <span>กำลังสร้างไฟล์...</span>
                </>
              ) : (
                "Excel"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 font-black text-center">
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <p className="text-[10px] text-slate-500 uppercase">ทั้งหมด</p>
          <p className="text-3xl text-white">{stats.total}</p>
        </div>
        <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
          <p className="text-[10px] text-red-400 uppercase">ผิดปกติ</p>
          <p className="text-3xl text-red-500">{stats.abnormal}</p>
        </div>
        <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
          <p className="text-[10px] text-yellow-400 uppercase">
            บันทึกข้อมูลไม่ครบ
          </p>
          <p className="text-3xl text-yellow-500">{stats.missing}</p>
        </div>
      </div>

      {/* ✅ Action & Legend Bar (Legend ต่อท้ายปุ่ม) */}
      <div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            {(["ALL", "ABNORMAL", "MISSING"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-4 py-1.5 rounded-md text-[11px] font-black transition-all ${filterMode === mode
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-500 hover:text-slate-300"
                  }`}
              >
                {mode === "ALL"
                  ? "ทั้งหมด"
                  : mode === "ABNORMAL"
                    ? "ผิดปกติ"
                    : "ตรวจไม่ครบ"}
              </button>
            ))}
          </div>
          {/* Legend Section */}
          <div className="hidden md:flex items-center gap-4 px-4 border-l border-slate-700 h-6">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
              <span className="text-[9px] text-slate-400 font-bold uppercase">
                ปกติ
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
              <span className="text-[9px] text-slate-400 font-bold uppercase">
                บันทึกข้อมูลไม่ครบ
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-[9px] text-slate-400 font-bold uppercase">
                ผิดปกติ
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              <span className="text-[9px] text-slate-400 font-bold uppercase">
                ไม่มีข้อมูล
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Machine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {reportData
          .filter((m) => {
            if (filterMode === "ABNORMAL") return m.status === "RED";
            if (filterMode === "MISSING")
              return m.status === "YELLOW" || m.status === "GRAY";
            return true;
          })
          .map((row) => (
            <div
              key={row.mid}
              onClick={() => handleCardClick(row)}
              className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.03] ${row.status === "RED"
                ? "border-red-500/50 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                : "border-slate-700 bg-[#1E293B]"
                }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${row.status === "RED"
                    ? "bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse"
                    : row.status === "GREEN"
                      ? "bg-green-500"
                      : row.status === "YELLOW"
                        ? "bg-amber-500"
                        : "bg-slate-700"
                    }`}
                />
                <span className="text-[10px] font-black text-slate-500 bg-black/20 px-2 py-0.5 rounded-full">
                  {row.checkCount} /{" "}
                  {new Date(selectedYear, selectedMonth, 0).getDate()} D
                </span>
              </div>
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-tighter truncate block">
                {row.process}
              </span>
              <span className="font-bold text-slate-200 text-sm truncate block tracking-tight">
                {row.name}
              </span>
              {row.abnormalCount > 0 && (
                <span className="text-[10px] text-red-400 font-bold mt-2 flex items-center gap-1 bg-red-500/10 w-fit px-2 py-0.5 rounded border border-red-500/10 animate-bounce">
                  พบปัญหา {row.abnormalCount} ครั้ง
                </span>
              )}
            </div>
          ))}
      </div>

      <MachineDetailModal />
    </div>
  );
}

// ==========================================
// 6. MachineSettingsView (Fixed: Added Password Guard on Save)
// ==========================================
function MachineSettingsView({
  machines,
  user,
  initialMode = "DAILY",
}: {
  machines: Machine[];
  user: User;
  initialMode?: "DAILY" | "DEW_POINT";
}) {
  const [name, setName] = useState("");
  const [process, setProcess] = useState("");
  const [material, setMaterial] = useState("");
  const [mode, setMode] = useState<SystemModeId>(initialMode);

  const [checklist, setChecklist] = useState<
    (ChecklistItem & { image_file?: File; preview_url?: string })[]
  >([
    {
      detail: "",
      method: "",
      oil: "",
      tool: "",
      frequency: "",
      condition: "",
      time: "",
      responsible: "",
      check_daily: "",
      image_url: "",
    },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Sync local mode with prop from header
  useEffect(() => {
    if (!editingId) setMode(initialMode);
  }, [initialMode, editingId]);
  const [isUploading, setIsUploading] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // ✅ 1. เพิ่ม State สำหรับ Password Guard
  const [showGuard, setShowGuard] = useState(false);
  const [guardMessage, setGuardMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<() => void>(() => { });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    targetM: Machine | null;
  }>({ isOpen: false, targetM: null });

  const [filterProcess, setFilterProcess] = useState("All");

  const processes = [
    "All",
    ...Array.from(
      new Set(
        machines.map((m) => m.process || "General").filter((p) => p !== "")
      )
    ).sort(),
  ];

  const filteredMachines = machines.filter((m) => {
    const machineMode = m.systemMode || "DAILY";
    if (machineMode !== mode) return false;
    if (filterProcess === "All") return true;
    const pName = m.process || "General";
    return pName === filterProcess;
  });

  const uploadToCloudinary = async (file: File) => {
    const cloudName = "dmqcyeu9a";
    const uploadPreset = "dailycheck_preset";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", "daily_check_app");

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handleFileSelect = async (file: File, index: number) => {
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const list = [...checklist];
      list[index].image_file = compressedFile;
      list[index].preview_url = URL.createObjectURL(compressedFile);
      setChecklist(list);
    } catch (error) {
      console.error("Compression error:", error);
      alert("ไม่สามารถจัดการรูปภาพนี้ได้");
    }
  };

  const handleAddRow = () => {
    setChecklist([
      ...checklist,
      {
        detail: "",
        method: "",
        oil: "",
        tool: "",
        frequency: "",
        condition: "",
        time: "",
        responsible: "",
        check_daily: "",
        image_url: "",
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    const list = [...checklist];
    list.splice(index, 1);
    setChecklist(list);
  };

  const handleChecklistChange = (
    index: number,
    field: keyof ChecklistItem,
    value: string
  ) => {
    const list = [...checklist];
    // @ts-ignore
    list[index][field] = value;
    setChecklist(list);
  };

  const handleEdit = (m: Machine) => {
    setName(m.name);
    setProcess(m.process || "");
    setMaterial(m.material || "");
    setMode(m.systemMode || "DAILY");
    const loadedChecklist = m.checklist.map((item) => ({
      ...item,
      check_daily: item.check_daily || "ทุกวัน",
      image_url: item.image_url || "",
      preview_url: item.image_url || "",
    }));
    setChecklist(loadedChecklist);
    setEditingId(m.id);
    // ดันหน้าจอขึ้นไปข้างบนสุดเพื่อให้เห็นฟอร์มแก้ไข
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setName("");
    setProcess("");
    setMaterial("");
    setMode(initialMode);
    setChecklist([
      {
        detail: "",
        method: "",
        oil: "",
        tool: "",
        frequency: "",
        condition: "",
        time: "",
        responsible: "",
        check_daily: "ทุกวัน",
        image_url: "",
      },
    ]);
    setEditingId(null);
  };

  // ✅ 2. ฟังก์ชันบันทึกจริง (จะทำงานหลังใส่รหัสผ่าน)
  const executeSave = async () => {
    setIsUploading(true);
    try {
      const validChecklist = checklist.filter(
        (item) => item.detail.trim() !== ""
      );
      const finalChecklist = await Promise.all(
        validChecklist.map(async (item) => {
          let finalUrl = item.image_url;
          if (item.image_file) {
            const uploadedUrl = await uploadToCloudinary(item.image_file);
            if (uploadedUrl) finalUrl = uploadedUrl;
          }
          return {
            detail: item.detail,
            method: item.method,
            oil: item.oil || "",
            tool: item.tool || "",
            frequency: item.frequency || "",
            condition: item.condition || "",
            time: item.time || "",
            responsible: item.responsible || "",
            check_daily: item.check_daily || "",
            image_url: finalUrl || "",
          };
        })
      );

      if (editingId) {
        const q = query(
          collection(db, "machines"),
          where("id", "==", editingId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(snap.docs[0].ref, {
            name,
            process,
            material,
            systemMode: mode,
            checklist: finalChecklist,
          });
          alert(`แก้ไขเครื่อง ${name} เรียบร้อย`);
        }
      } else {
        const existingNums = machines.map(
          (m) => parseInt(m.id.replace("M", "")) || 0
        );
        const nextId = `M${(existingNums.length > 0
          ? Math.max(...existingNums) + 1
          : 1
        )
          .toString()
          .padStart(2, "0")}`;
        await addDoc(collection(db, "machines"), {
          id: nextId,
          name,
          process,
          material,
          systemMode: mode,
          created_at: getThaiDate(),
          checklist: finalChecklist,
        });
        alert(`เพิ่มเครื่อง ${name} เรียบร้อย`);
      }
      handleCancelEdit();
    } catch (error) {
      console.error("Save error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsUploading(false);
    }
  };

  // ✅ 3. ฟังก์ชันดักตอนกดปุ่มบันทึก เพื่อถามรหัสผ่าน
  const handleSaveClick = () => {
    if (!name.trim()) return alert("กรุณาใส่ชื่อเครื่องจักร");
    if (!process.trim()) return alert("กรุณาระบุชื่อกระบวนการผลิต / Line");

    if (mode === "DEW_POINT" && !material.trim())
      return alert("กรุณาระบุประเภทวัสดุ (Material) สำหรับเครื่อง Dew Point");

    const validChecklist = checklist.filter(
      (item) => item.detail.trim() !== ""
    );
    if (mode === "DAILY" && validChecklist.length === 0)
      return alert("กรุณาเพิ่มรายการตรวจเช็คอย่างน้อย 1 ข้อ");

    setGuardMessage(
      editingId
        ? `ยืนยันการแก้ไขข้อมูลเครื่อง "${name}"`
        : `ยืนยันการเพิ่มเครื่องใหม่ "${name}"`
    );
    setPendingAction(() => executeSave); // เก็บฟังก์ชันบันทึกไว้รอรหัสผ่าน
    setShowGuard(true); // เปิด Modal ถามรหัส
  };

  const openDeleteConfirm = (m: Machine) => {
    setConfirmModal({ isOpen: true, targetM: m });
  };

  const executeDelete = async () => {
    if (confirmModal.targetM)
      await deleteMachineAndLogs(confirmModal.targetM.id);
    setConfirmModal({ isOpen: false, targetM: null });
  };

  if (showPrintModal)
    return (
      <QRPrintSystem
        machines={filteredMachines}
        onClose={() => setShowPrintModal(false)}
      />
    );

  const darkInputClass =
    "w-full p-2 border border-slate-600 rounded bg-[#0F172A] text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-500";

  return (
    <div className="w-full max-w-[100%] mx-auto pb-20 relative pt-4 text-slate-200">
      {/* ✅ แทรก Modal ถามรหัสผ่านตรงนี้ */}
      <ConfirmActionModal
        isOpen={showGuard}
        onClose={() => setShowGuard(false)}
        onConfirm={pendingAction}
        title="ยืนยันรหัสผ่าน"
        message={guardMessage}
        currentUser={user}
      />

      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={executeDelete}
        title="ลบเครื่องจักร"
        message={`คุณต้องการลบเครื่องจักร "${confirmModal.targetM?.name}" และข้อมูลการตรวจเช็คทั้งหมด ใช่หรือไม่?`}
        currentUser={user}
      />

      <div className="bg-[#1E293B] rounded-xl shadow-lg border border-slate-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex gap-2 text-white items-center">
            <Settings className="text-blue-400" /> ตั้งค่า / จัดการเครื่องจักร
          </h2>
          <button
            onClick={handleSaveClick}
            disabled={isUploading}
            className={`px-6 py-2 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all ${editingId
              ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-500/20"
              : "bg-green-600 hover:bg-green-700 ring-2 ring-green-500/20"
              } ${isUploading ? "opacity-70 cursor-not-allowed" : "hover:scale-105 active:scale-95"}`}
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin" size={18} /> กำลังบันทึก...
              </>
            ) : editingId ? (
              <>
                <Save size={18} /> บันทึกการแก้ไข
              </>
            ) : (
              <>
                <Plus size={18} /> บันทึกเครื่องจักรใหม่
              </>
            )}
          </button>
        </div>

        <div
          className={`bg-[#0F172A] p-5 rounded-xl border border-slate-700 mb-8 ${editingId ? "border-blue-500 ring-1 ring-blue-500/50" : ""
            }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-200 text-lg flex items-center gap-2">
              {editingId ? (
                <>
                  <Pencil size={18} className="text-yellow-400" /> แก้ไขข้อมูล:{" "}
                  <span className="text-yellow-400">{name}</span>
                </>
              ) : (
                <>
                  <Plus size={18} className="text-green-400" />{" "}
                  เพิ่มเครื่องจักรใหม่
                </>
              )}
            </h3>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="text-sm bg-slate-700 px-3 py-1 rounded hover:bg-slate-600 text-slate-300 border border-slate-600"
              >
                ยกเลิกการแก้ไข
              </button>
            )}
          </div>
          <div className={`grid grid-cols-1 ${mode === "DAILY" ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4 mb-4`}>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                ชื่อเครื่องจักร
              </label>
              <input
                className={darkInputClass}
                placeholder="เช่น Dryer"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                ชื่อกระบวนการผลิต / Line
              </label>
              <input
                className={darkInputClass}
                placeholder="เช่น Extrusion Line A"
                value={process}
                onChange={(e) => setProcess(e.target.value)}
              />
            </div>
            {mode === "DEW_POINT" && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Material (ประเภทวัสดุ)
                </label>
                <input
                  className={darkInputClass}
                  placeholder="เช่น PET, PP, Nylon"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                />
              </div>
            )}
          </div>

          {mode === "DAILY" && (
            <div className="space-y-2 mb-6 overflow-x-auto">
              {checklist.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-wrap xl:flex-nowrap items-center gap-2 bg-[#1E293B] p-2 rounded border border-slate-600 shadow-sm"
                >
                  <div className="flex-shrink-0 mr-1">
                    <div className="relative group w-20 h-20">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`item-img-${index}`}
                        onChange={(e) =>
                          e.target.files &&
                          handleFileSelect(e.target.files[0], index)
                        }
                      />
                      <label
                        htmlFor={`item-img-${index}`}
                        className="cursor-pointer w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-500 rounded hover:bg-slate-700 text-slate-500 bg-[#0F172A] overflow-hidden"
                      >
                        {item.preview_url ? (
                          <img
                            src={item.preview_url}
                            className="w-full h-full object-cover"
                            alt="preview"
                          />
                        ) : (
                          <>
                            <ImageIcon size={16} />
                            <span className="text-[8px] mt-1">เลือกรูป</span>
                          </>
                        )}
                      </label>
                      {item.preview_url && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const list = [...checklist];
                            list[index].image_url = "";
                            list[index].preview_url = "";
                            list[index].image_file = undefined;
                            setChecklist(list);
                          }}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-grow min-w-[150px]">
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 ml-1">
                      รายละเอียดจุดตรวจ
                    </label>
                    <input
                      className={darkInputClass}
                      value={item.detail}
                      onChange={(e) =>
                        handleChecklistChange(index, "detail", e.target.value)
                      }
                    />
                  </div>
                  <div className="flex-grow min-w-[150px]">
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 ml-1">
                      วิธีการตรวจ / มาตรฐาน
                    </label>
                    <input
                      className={darkInputClass}
                      value={item.method}
                      onChange={(e) =>
                        handleChecklistChange(index, "method", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-20 flex-shrink-0">
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 text-center">
                      น้ำมัน
                    </label>
                    <input
                      className={`${darkInputClass} text-center`}
                      value={item.oil}
                      onChange={(e) =>
                        handleChecklistChange(index, "oil", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-20 flex-shrink-0">
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 text-center">
                      เครื่องมือ
                    </label>
                    <input
                      className={`${darkInputClass} text-center`}
                      value={item.tool}
                      onChange={(e) =>
                        handleChecklistChange(index, "tool", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-16 flex-shrink-0">
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 text-center">
                      ความถี่
                    </label>
                    <input
                      className={`${darkInputClass} text-center`}
                      value={item.frequency}
                      onChange={(e) =>
                        handleChecklistChange(index, "frequency", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-20 flex-shrink-0">
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 text-center">
                      เงื่อนไข
                    </label>
                    <input
                      className={`${darkInputClass} text-center`}
                      value={item.condition}
                      onChange={(e) =>
                        handleChecklistChange(index, "condition", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-20 flex-shrink-0">
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 text-center">
                      เวลา
                    </label>
                    <input
                      className={`${darkInputClass} text-center`}
                      value={item.time}
                      onChange={(e) =>
                        handleChecklistChange(index, "time", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-20 flex-shrink-0">
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 text-center">
                      การตรวจ
                    </label>
                    <input
                      className={`${darkInputClass} text-center`}
                      value={item.check_daily}
                      onChange={(e) =>
                        handleChecklistChange(
                          index,
                          "check_daily",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="w-20 flex-shrink-0">
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 text-center">
                      ผู้ดูแล
                    </label>
                    <input
                      className={`${darkInputClass} text-center`}
                      value={item.responsible}
                      onChange={(e) =>
                        handleChecklistChange(
                          index,
                          "responsible",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  {checklist.length > 1 && (
                    <button
                      onClick={() => handleRemoveRow(index)}
                      className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded flex-shrink-0 mt-4 border border-transparent hover:border-red-500/50"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {mode === "DAILY" && (
            <div className="flex gap-3">
              <button
                onClick={handleAddRow}
                className="px-4 py-2 border border-blue-500 text-blue-400 rounded-lg font-bold hover:bg-blue-500/10 flex items-center gap-2 text-sm whitespace-nowrap"
              >
                <Plus size={16} /> เพิ่มรายการ
              </button>
            </div>
          )}
        </div>

        {/* ตารางรายชื่อเครื่องจักรข้างล่าง (เหมือนเดิม) */}
        <div className="flex justify-between items-center mb-4 mt-8 pt-4 border-t border-slate-700">
          <h3 className="font-bold text-slate-300 text-lg">
            เครื่องจักรในระบบ ({filteredMachines.length})
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg transition-all hover:scale-105"
            >
              <Printer size={16} /> พิมพ์ QR (A4)
            </button>
            <div className="flex items-center gap-2 bg-[#0F172A] border border-slate-600 rounded-lg px-2 py-1">
              <span className="text-xs text-slate-400 font-bold whitespace-nowrap">
                กรองตาม Line:
              </span>
              <select
                value={filterProcess}
                onChange={(e) => setFilterProcess(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer p-1"
              >
                {processes.map((p, i) => (
                  <option key={i} value={p} className="bg-[#0F172A]">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMachines.map((m) => (
            <div
              key={m.id}
              className="p-4 border border-slate-700 rounded-xl flex justify-between items-center bg-[#0F172A] shadow-sm hover:border-blue-500 transition-all"
            >
              <div>
                <div className="font-bold text-white text-base">{m.name}</div>
                <div className="text-xs text-slate-400">
                  {m.process || "General"} {m.material ? `• Material: ${m.material}` : ""} • {m.checklist.length} รายการ
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(m)}
                  className="bg-slate-700 text-slate-300 border border-slate-600 p-2 rounded hover:bg-slate-600 hover:text-white"
                  title="แก้ไข"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => openDeleteConfirm(m)}
                  className="bg-red-500/10 text-red-400 border border-red-500/30 p-2 rounded hover:bg-red-500/20"
                  title="ลบ"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {filteredMachines.length === 0 && (
            <div className="col-span-full text-center py-8 text-slate-500 bg-[#0F172A]/50 border border-dashed border-slate-700 rounded-xl">
              ไม่พบเครื่องจักรในกลุ่มนี้
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DailyCheckModule({ currentUser, activeTab, onExit }: any) {
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null);

  // ✅ 1. State สำหรับจัดการวันที่และกะ (ใช้อันเดียวกันทั้ง Module)
  const [workingDate, setWorkingDate] = useState(getThaiDate());
  const [workingShift, setWorkingShift] = useState(getShift());

  // ✅ 2. State สำหรับจัดการโหมดระบบ (Daily Check vs Dew Point)
  const [systemMode, setSystemMode] = useState<SystemModeId>("DAILY");

  // ✅ ดึงข้อมูลโหมดปัจจุบันจาก Config เพื่อความ Scalable
  const currentMode = useMemo(() =>
    INSPECTION_MODES.find(m => m.id === systemMode) || INSPECTION_MODES[0]
    , [systemMode]);

  const [showUserModal, setShowUserModal] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);

  // Load Machine Data
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "machines"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.data().id, ...d.data() }));
      data.sort((a: any, b: any) => {
        const pA = a.process || "ZZZ";
        const pB = b.process || "ZZZ";
        if (pA !== pB) return pA.localeCompare(pB);
        return a.name.localeCompare(b.name);
      });
      setMachines(data);
    });
    return () => unsub();
  }, []);

  // ✅ กรองเครื่องจักรตามโหมดที่เลือก
  const filteredByMode = useMemo(() => {
    return machines.filter((m) => {
      const machineMode = m.systemMode || "DAILY";
      return machineMode === systemMode;
    });
  }, [machines, systemMode]);

  // Reset selected machine when switching tabs
  useEffect(() => setSelectedMachine(null), [activeTab]);

  // เช็คสิทธิ์การเข้าถึงหน้าตั้งค่า
  const canAccessSettings =
    currentUser?.username === "Bank" ||
    currentUser?.role === "super_admin" ||
    currentUser?.allowedActions?.includes("daily_settings");

  // สิทธิ์ในการแก้ไขวันที่/กะ
  const canChangeDate =
    currentUser?.username === "Bank" || currentUser?.role === "super_admin";

  // --- 2. เข้าสู่โหมด Scan/Check ---
  if (selectedMachine)
    return (
      <div className="bg-[#0F172A] w-full h-full flex flex-col overflow-hidden text-slate-200">
        <ScanPage
          machine={selectedMachine}
          user={currentUser}
          onBack={() => setSelectedMachine(null)}
          // ✅ ส่งวันที่/กะ เข้าไปใน ScanPage ด้วยเพื่อให้บันทึกตรงกัน
          workingDate={workingDate}
          workingShift={workingShift}
          onDateChange={setWorkingDate}
          onShiftChange={setWorkingShift}
        />
      </div>
    );

  // --- 3. หน้าหลัก Daily Check ---
  return (
    <div className="bg-[#0F172A] text-slate-200 h-full w-full flex flex-col overflow-y-auto custom-scrollbar relative">
      {/* MOBILE HEADER */}
      <div className="bg-[#1E293B] border-b border-slate-700 px-4 py-3 flex flex-col gap-3 shrink-0 sticky top-0 z-30 shadow-md md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onExit && (
              <button
                onClick={onExit}
                className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors border border-slate-600 shadow-sm"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-white leading-none flex items-center gap-2">
                <currentMode.icon className={currentMode.textColor} size={20} />
                {currentMode.label}
              </h1>
              <span className="text-[10px] text-slate-400">
                {activeTab === "inspect" && "ตรวจสอบเครื่องจักร"}
                {activeTab === "data" && "ประวัติการตรวจสอบ"}
                {activeTab === "dashboard" && "สรุปรายงาน (PDF)"}
                {activeTab === "settings" && "ตั้งค่าระบบ"}
              </span>
            </div>
          </div>

          {/* Mode Switcher for Mobile */}
          <ModeDropdown value={systemMode} onChange={setSystemMode} />
        </div>
      </div>

      {/* DESKTOP HEADER (Optional enhancement if needed, but the list is already filtered) */}
      <div className="hidden md:flex px-6 py-4 bg-[#1E293B]/80 border-b border-slate-700 items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${currentMode.textColor} bg-white/5 shadow-inner`}>
            <currentMode.icon size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">
              {currentMode.label}
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              Smart Factory Monitoring System
            </p>
          </div>
        </div>

        {/* Mode Switcher for Desktop */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden lg:inline">เลือกโหมดระบบ:</span>
          <ModeDropdown value={systemMode} onChange={setSystemMode} />
        </div>
      </div>

      {/* ✅ 4. ส่วนเลือกวันที่และกะ (จะแสดงเฉพาะคนที่มีสิทธิ์ และอยู่ในหน้าตรวจเช็คเท่านั้น) */}
      {activeTab === "inspect" && canChangeDate && (
        <div className="px-4 py-3 bg-[#1E293B]/40 border-b border-slate-800 flex flex-wrap gap-4 items-center shrink-0 animate-in slide-in-from-top-1 duration-300">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              วันที่ตรวจ:
            </span>
            <input
              type="date"
              value={workingDate}
              onChange={(e) => setWorkingDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-blue-400 font-bold outline-none focus:border-blue-500 shadow-inner"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              กะ:
            </span>
            <select
              value={workingShift}
              onChange={(e) => setWorkingShift(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-blue-400 font-bold outline-none focus:border-blue-500 shadow-inner"
            >
              <option value="D">Day (กลางวัน)</option>
              <option value="N">Night (กลางคืน)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full border border-amber-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-[9px] font-black uppercase italic">
              Admin Mode
            </span>
          </div>
        </div>
      )}

      <div className="w-full px-4 py-6 flex-1 max-w-[100vw] overflow-x-hidden">
        {/* --- TAB 1: INSPECT --- */}
        {activeTab === "inspect" && (
          <InspectView
            machines={filteredByMode}
            user={currentUser}
            onSelect={setSelectedMachine}
            onShowUsers={() => setShowUserModal(true)}
            onShowMachines={() => setShowMachineModal(true)}
            // ✅ ส่งค่าวันที่/กะ ลงไปให้ปุ่ม Quick NA ใช้งาน
            workingDate={workingDate}
            workingShift={workingShift}
          />
        )}

        {/* --- TAB 2: DATA --- */}
        {activeTab === "data" && (
          <DataView machines={filteredByMode} user={currentUser} />
        )}

        {/* --- TAB 3: DASHBOARD --- */}
        {activeTab === "dashboard" && (
          <DashboardView machines={filteredByMode} user={currentUser} />
        )}

        {/* --- TAB 4: SETTINGS --- */}
        {activeTab === "settings" &&
          (canAccessSettings ? (
            <MachineSettingsView
              machines={machines}
              user={currentUser}
              initialMode={systemMode}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] w-full text-slate-400">
              <div className="flex flex-col items-center p-8 border border-slate-700/50 rounded-2xl bg-[#1E293B]/50 shadow-xl">
                <Lock size={64} className="mb-6 opacity-20 text-slate-500" />
                <h2 className="text-xl font-bold text-slate-500 mb-2 uppercase tracking-widest">
                  ACCESS DENIED
                </h2>
                <p className="text-xs text-slate-600 mb-4">
                  คุณไม่มีสิทธิ์เข้าถึงหน้าตั้งค่านี
                </p>
                <span className="text-[10px] text-slate-500 font-mono bg-black/20 px-2 py-1 rounded">
                  (Need 'daily_settings' permission)
                </span>
              </div>
            </div>
          ))}
      </div>

      {/* GLOBAL MODALS */}
      {showUserModal && (
        <ManageUsersModal
          currentUser={currentUser}
          onClose={() => setShowUserModal(false)}
        />
      )}

      {showMachineModal && (
        <ManageMachinesModal
          machines={machines}
          user={currentUser}
          onClose={() => setShowMachineModal(false)}
        />
      )}
    </div>
  );
}

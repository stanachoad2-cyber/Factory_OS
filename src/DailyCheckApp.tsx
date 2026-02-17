import React, { useState, useEffect, useRef, useMemo } from "react";
import html2pdf from "html2pdf.js";
import { db } from "./firebase";
const LOGO_URL = "/logo.png";
import { createPortal } from "react-dom";
import MonthlySummaryReport from "./MonthlySummaryReport";
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
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";

// ✅ Helper Check Permission
const checkPerm = (user: any, allowedRoles: string[]) => {
  if (user?.username === "Bank" || user?.role === "Admin") return true;
  return allowedRoles.includes(user?.role);
};

// ✅ Dropdown ค้นหาได้ (แก้ไขให้โชว์ Label แทน Value หลังเลือก)
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
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ✅ แก้ไข: เมื่อค่า (Value) เปลี่ยน ให้ไปหา "ชื่อ" มาโชว์ในช่อง
  useEffect(() => {
    if (!value) {
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
  }, [value, options]);

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
      const currentInput = String(inputValue || "").toLowerCase();
      const match = (options || []).find((item: any) => {
        if (!item) return false;
        const label =
          typeof item === "string" ? item : item.label || item.name || "";
        return String(label).toLowerCase() === currentInput;
      });

      if (!match && inputValue !== "") {
        // ถ้าพิมพ์ชื่อที่ไม่ตรงกับในรายการเลย ให้ล้างค่าทิ้ง
        const isCurrentValueValid = (options || []).some((opt: any) => {
          const optVal =
            typeof opt === "string"
              ? opt
              : opt.value !== undefined
              ? opt.value
              : opt.name;
          return String(optVal) === String(value);
        });
        if (!isCurrentValueValid) {
          setInputValue("");
          onChange("");
        }
      }
    }, 200);
  };

  const filteredOptions = useMemo(() => {
    if (!options) return [];
    if (!inputValue) return options;

    const safeInput = String(inputValue).toLowerCase();
    return options.filter((item: any) => {
      const label =
        typeof item === "string" ? item : item.label || item.name || "";
      return String(label).toLowerCase().includes(safeInput);
    });
  }, [options, inputValue]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            disabled={disabled}
            className={`w-full bg-[#0F172A] border ${
              isOpen ? "border-blue-500" : "border-slate-600"
            } rounded-lg py-2.5 pl-3 pr-10 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-500`}
            placeholder={placeholder}
            value={inputValue}
            autoComplete="off"
            onClick={() => !disabled && setIsOpen(true)}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onBlur={handleBlur}
          />
          <div
            className="absolute right-0 top-0 h-full w-10 flex items-center justify-center cursor-pointer"
            onClick={() => !disabled && setIsOpen(!isOpen)}
          >
            <ChevronDown
              className={`text-slate-500 transition-transform ${
                isOpen ? "rotate-180" : ""
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
                      onChange(val); // ส่ง Value ไปเก็บ (ID)
                      setInputValue(label); // แต่โชว์ชื่อ (Name)
                      setIsOpen(false);
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
  created_at: string;
  checklist: ChecklistItem[];
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
}
interface User {
  id?: string;
  username: string;
  pass: string;
  role: UserRole;
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
      return { symbol: "✓", color: "text-green-600", text: "ปกติ" };
    case "ABNORMAL":
      return { symbol: "✕", color: "text-red-600", text: "ผิดปกติ" };
    case "FILTER":
      return { symbol: "△", color: "text-blue-600", text: "เป่ากรอง" };
    case "NA":
      return { symbol: "-", color: "text-gray-900", text: "ไม่ใช้งาน" };
    default:
      return { symbol: "?", color: "text-gray-400", text: "-" };
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
  const auditId = `${mid}_${dateObj.getFullYear()}_${
    dateObj.getMonth() + 1
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
            className={`w-full bg-[#0F1115] border ${
              error
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
    .map((m) => ({
      machineName: m.name,
      process: m.process || "-",
      qrValue: m.name,
    }));

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
              <h3 className="text-[20px] font-bold text-black uppercase leading-tight">
                {machine.name}
              </h3>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full">
              <div className="relative border-2 border-dashed border-black p-3 bg-white rounded-lg">
                {/* ใช้ SVG คมชัด */}
                <QRCodeSVG
                  value={machine.name}
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmPass, setConfirmPass] = useState("");

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id))
      setSelectedIds(selectedIds.filter((x) => x !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const confirmDelete = async () => {
    if (selectedIds.length === 0) return;

    if (
      !checkPerm(user, ["super_admin", "admin"]) && // หรือใช้ฟังก์ชันเช็คสิทธิ์ของคุณ
      !user?.allowedActions?.includes("daily_delete")
    ) {
      return alert("⛔️ คุณไม่มีสิทธิ์ลบประวัติการตรวจ");
    }

    if (confirmPass !== user.pass) {
      alert("รหัสผ่านไม่ถูกต้อง!");
      return;
    }

    await deleteSelectedLogs(selectedIds, machine.id, date, shift);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
      {/* ✅ ปรับพื้นหลังเป็น Dark Theme #1F1F23 */}
      <div className="bg-[#1F1F23] rounded-2xl w-full max-w-md p-6 relative border border-slate-700 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white z-50"
        >
          <X />
        </button>

        {/* หัวข้อสีขาว/น้ำเงิน */}
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Trash2 className="text-blue-500" /> เลือกลบข้อมูล
        </h3>
        <p className="text-sm text-slate-400 mb-4 font-mono">
          {date} | Shift {shift}
        </p>

        {targetLogs.length === 0 ? (
          <p className="text-center text-slate-500 py-8 border border-dashed border-slate-700 rounded-xl">
            ไม่พบข้อมูลบันทึกในกะนี้
          </p>
        ) : (
          <div className="max-h-60 overflow-y-auto border border-slate-700 rounded-xl divide-y divide-slate-700 mb-4 bg-[#16181C] custom-scrollbar">
            {targetLogs.map((log) => {
              const isSel = selectedIds.includes(log.id);
              const display = getResultDisplay(log.result);
              return (
                <div
                  key={log.id}
                  onClick={() => toggleSelect(log.id)}
                  className={`p-3 flex justify-between items-center cursor-pointer transition-colors ${
                    isSel ? "bg-blue-600/20" : "hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isSel ? (
                      <CheckSquare className="text-blue-500" size={18} />
                    ) : (
                      <Square className="text-slate-600" size={18} />
                    )}
                    <div>
                      <div className="font-bold text-slate-200 text-sm">
                        {log.checklist_item}
                      </div>
                      <div className={`text-xs ${display.color} mt-0.5`}>
                        ผล: {display.text}{" "}
                        <span className="text-slate-500">
                          ({log.inspector})
                        </span>
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
              className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-all shadow-lg ${
                selectedIds.length > 0 && confirmPass
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
          () => {}
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
        } catch (e) {}
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
              className={`flex justify-between items-center p-3 border rounded-lg shadow-sm ${
                us.username === "Bank"
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
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});

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
          className={`bg-gray-50 p-4 rounded-xl border mb-6 ${
            editingId ? "border-indigo-300 ring-2 ring-indigo-100" : ""
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
            className={`w-full text-white p-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2 ${
              editingId
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
            className={`w-full py-3 text-white rounded-xl font-bold text-sm shadow-lg transition-all flex justify-center items-center gap-2 ${
              isSubmitting
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
}: {
  machine: Machine;
  user: User;
  onBack: () => void;
}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showCam, setShowCam] = useState(false);
  const [showMasterSheet, setShowMasterSheet] = useState(false);

  // State วันที่และกะ
  const [workingDate, setWorkingDate] = useState(getThaiDate());
  const [workingShift, setWorkingShift] = useState(getShift());

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

    if (scannedMachine === machine.name) {
      setStatus({
        type: "success",
        msg: "✅ ยืนยันเครื่องถูกต้อง: ปลดล็อครายการตรวจเช็ค",
      });
      setIsVerified(true);
      setShowCam(false);
      setTimeout(() => setStatus(null), 3000);
    } else {
      setStatus({
        type: "error",
        msg: `⛔ ผิดเครื่อง! QR นี้คือ "${scannedMachine}"`,
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
      executeSave(result, detail, false, null);
    }
  };

  // ==========================================
  // executeSave (ครบชุด: รันเลข + บันทึก + แจ้งเตือน Telegram)
  // ==========================================
  const executeSave = async (
    result: ResultType,
    detail: string | undefined,
    isTicket: boolean,
    ticketData: any
  ) => {
    if (!inspectingItem) return;

    try {
      // 1. บันทึก Log
      const existingLog = logs.find(
        (l) => l.checklist_item === inspectingItem.detail
      );
      if (existingLog) {
        await deleteDoc(doc(db, "logs", existingLog.id));
      }

      const newLog: any = {
        mid: machine.id,
        checklist_item: inspectingItem.detail,
        result: result,
        inspector: user.username,
        date: workingDate,
        shift: workingShift,
        timestamp: serverTimestamp(),
      };
      if (detail) newLog.problem_detail = detail;
      await addDoc(collection(db, "logs"), newLog);

      // 2. สร้าง Ticket + แจ้งเตือน
      if (isTicket && ticketData) {
        const prefixCode = ticketData.prefixCode || "MT";

        // เริ่ม Transaction และรับค่า ID ที่สร้างได้กลับมา
        const createdTicketId = await runTransaction(
          db,
          async (transaction) => {
            // --- ส่วนคำนวณเลข ID ---
            const now = new Date();
            const yy = now.getFullYear().toString().slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const idPrefix = `${prefixCode}-${yy}${mm}`; // เช่น PC-2602

            // Query หาตัวเลขสูงสุด
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
              const latestId = querySnapshot.docs[0].id; // เช่น PC-2602005
              const suffix = latestId.slice(-3);
              const maxNum = parseInt(suffix, 10);
              if (!isNaN(maxNum)) {
                nextRunNo = maxNum + 1;
              }
            }

            const generatedId = `${idPrefix}${String(nextRunNo).padStart(
              3,
              "0"
            )}`; // PC-2602006

            // --- เตรียมข้อมูล ---
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

            return generatedId; // ส่งค่า ID ออกไปใช้นอก Transaction
          }
        );

        // --- 3. ส่วนแจ้งเตือน Telegram (ยิงหลังจากบันทึกเสร็จ) ---
        // Token & Chat ID ของคุณ
        const TELEGRAM_TOKEN = "8479695961:AAFtKB3MuE1PHk9tYVckhgYPrbb2dYpI1eI";
        const TELEGRAM_CHAT_ID = "-5081774286";
        const requesterName = user.fullname || user.username;

        const msg = `🚨 <b>เครื่อง:</b> ${ticketData.machineName}\n⚠️ <b>อาการ:</b> ${ticketData.issueItem}\n🏢 <b>แผนก:</b> ${ticketData.department}\n📍 <b>พื้นที่:</b> ${ticketData.area}\n👤 <b>ผู้แจ้ง:</b> ${requesterName}`;

        // ยิง API (แบบไม่รอผลลัพธ์ เพื่อความเร็ว)
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

      setTicketModalData(null);
      setInspectingItem(null);
      setStatus({ type: "success", msg: "บันทึกเรียบร้อย" });
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      console.error("SAVE ERROR:", err);
      setStatus({ type: "error", msg: "❌ บันทึกไม่สำเร็จ" });
    }
  };

  return (
    // ✅ Main Container
    <div className="h-full flex flex-col bg-[#0F172A] text-slate-200 overflow-y-auto custom-scrollbar relative">
      {/* ✅ 2. Header Select Date Mode (แสดงเฉพาะคนที่มีสิทธิ์) */}
      {canSelectDate && (
        <div className="bg-yellow-500/10 p-2 border-b border-yellow-500/20 text-center text-xs text-yellow-200 flex justify-center items-center gap-2">
          <span className="font-bold">📅 Select Date:</span>
          <input
            type="date"
            value={workingDate}
            onChange={(e) => setWorkingDate(e.target.value)}
            className="bg-[#1E293B] border border-slate-600 rounded p-1 text-white text-xs"
          />
          <select
            value={workingShift}
            onChange={(e) => setWorkingShift(e.target.value)}
            className="bg-[#1E293B] border border-slate-600 rounded p-1 text-white text-xs"
          >
            <option value="D">Shift D</option>
            <option value="N">Shift N</option>
          </select>
        </div>
      )}

      {/* ✅ NEW STICKY HEADER DESIGN */}
      <div className="bg-[#1E293B] px-4 py-3 shadow-lg border-b border-slate-700/80 sticky top-0 z-20 flex items-center gap-3">
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

      {/* --- Body Content --- */}
      <div className="flex-1 p-4 flex flex-col items-center w-full">
        {/* Toast Status */}
        {status && (
          <div className="fixed top-20 left-0 right-0 flex justify-center z-[80] pointer-events-none px-4">
            <div
              className={`px-6 py-3 rounded-2xl shadow-2xl font-bold animate-in slide-in-from-top-2 border flex items-center gap-2 backdrop-blur-md ${
                status.type === "success"
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

        {/* ปุ่ม Scan QR (ถ้ายังไม่ยืนยัน) */}
        {!isVerified && (
          <div className="w-full max-w-md mb-6 animate-pulse mt-4">
            <button
              onClick={() => setShowCam(true)}
              className="w-full bg-gradient-to-br from-indigo-600 to-blue-700 text-white py-8 rounded-2xl flex flex-col items-center justify-center gap-3 font-bold shadow-2xl hover:shadow-indigo-500/30 border border-indigo-400/30 active:scale-95 transition-all"
            >
              <div className="p-4 bg-white/10 rounded-full mb-1">
                <QrCode size={40} />
              </div>
              <div className="text-center">
                <span className="text-xl block">สแกน QR เพื่อเริ่มงาน</span>
                <span className="text-xs font-normal opacity-70 block mt-1">
                  (Scan QR to Unlock Checklist)
                </span>
              </div>
            </button>
          </div>
        )}

        {/* ปุ่ม Master Sheet */}
        <button
          onClick={() => setShowMasterSheet(true)}
          className="w-full max-w-4xl bg-[#1E293B] border border-slate-700 text-slate-300 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm mb-4 hover:bg-[#253045] hover:text-white text-sm transition-all active:scale-95"
        >
          <FileText size={16} className="text-blue-400" /> ดูใบมาตรฐาน (Master
          Sheet)
        </button>

        {/* ตาราง Checklist (ถ้าเครื่อง Unlocked) */}
        {isVerified ? (
          <div className="w-full max-w-4xl bg-[#1E293B] rounded-xl border border-slate-700 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="bg-green-500/10 p-3 text-xs text-green-400 font-bold border-b border-green-500/20 flex items-center gap-2">
              <CheckCircle size={14} /> สถานะพร้อม:
              แตะที่รายการเพื่อบันทึกผลได้เลย
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="text-xs text-slate-400 uppercase bg-[#0F172A]/50 border-b border-slate-700">
                  <tr>
                    <th className="p-4 text-center w-14">สถานะ</th>
                    <th className="p-4 min-w-[150px]">รายการตรวจเช็ค</th>
                    <th className="p-4 min-w-[150px] hidden md:table-cell">
                      วิธีการตรวจ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {machine.checklist.map((item, idx) => {
                    const log = logs.find(
                      (l) => l.checklist_item === item.detail
                    );
                    const statusDisplay = log
                      ? getResultDisplay(log.result)
                      : null;
                    return (
                      <tr
                        key={idx}
                        onClick={() => setInspectingItem(item)}
                        className="bg-[#1E293B] hover:bg-[#253045] cursor-pointer transition-colors active:bg-[#334155]"
                      >
                        <td className="p-3 text-center">
                          {statusDisplay ? (
                            <span
                              className={`text-lg font-bold ${statusDisplay.color}`}
                            >
                              {statusDisplay.symbol}
                            </span>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-500 shadow-inner">
                              <Pencil size={12} />
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-medium text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {item.detail}
                        </td>
                        <td className="p-4 hidden md:table-cell whitespace-pre-wrap text-slate-400 leading-relaxed">
                          {item.method}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Locked State Message
          <div className="w-full max-w-md p-10 text-center text-slate-500 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl bg-[#1E293B]/30">
            <div className="bg-slate-800 p-4 rounded-full mb-4 ring-4 ring-slate-800/50">
              <Lock size={32} className="text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-300">รายการถูกล็อค</h3>
            <p className="text-sm mt-2 leading-relaxed">
              กรุณากดปุ่ม{" "}
              <span className="text-indigo-400 font-bold">สแกน QR</span> ด้านบน
              <br />
              เพื่อยืนยันว่าเป็นเครื่องจักรที่ถูกต้อง
            </p>
          </div>
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

  const CellContent = ({ res, log }: any) => {
    if (!res) return null;
    return (
      <div className="flex flex-col items-center justify-center h-full w-full leading-none group/cell relative cursor-help">
        <span className={`text-[10px] font-bold ${res.color}`}>
          {res.symbol}
        </span>
        {log?.problem_detail && (
          <div className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/90 text-white text-[10px] p-2 rounded w-32 hidden group-hover/cell:block shadow-xl pointer-events-none text-left whitespace-normal">
            <span className="font-bold text-red-300 block border-b border-gray-600 pb-1 mb-1">
              ปัญหา:
            </span>
            {log.problem_detail}
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

            {/* แถว 2: ผู้ตรวจสอบ (Audit) */}
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
                        // ✅ แสดงปุ่มติ๊กถูก แต่ถ้ากดแล้วสิทธิ์ไม่ถึงจะแจ้งเตือนในฟังก์ชัน
                        <button
                          onClick={() => handleSignOff(d, "D")}
                          className={`w-4 h-4 rounded text-[8px] text-white mx-auto flex items-center justify-center leading-none shadow-sm transition-all ${
                            canVerify
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
                          className={`w-4 h-4 rounded text-[8px] text-white mx-auto flex items-center justify-center leading-none shadow-sm transition-all ${
                            canVerify
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
                          className={`font-bold text-[10px] w-full h-full block ${
                            canDelete
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
                          className={`font-bold text-[10px] w-full h-full block ${
                            canDelete
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
// --- INSPECT VIEW (GROUPED BY PROCESS) ---
function InspectView({
  machines,
  user,
  onSelect,
  onShowUsers,
  onShowMachines,
}: {
  machines: Machine[];
  user: User;
  onSelect: (m: Machine) => void;
  onShowUsers: () => void;
  onShowMachines: () => void;
}) {
  const [expandedLines, setExpandedLines] = useState<string[]>([]);

  // 1. จัดกลุ่มเครื่องจักรตาม Process และเรียงลำดับ
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

  // ✅ 2. ตัวแปรที่หายไป: เรียงชื่อ Line ตามตัวอักษร
  const sortedProcessNames = Object.keys(groupedMachines).sort();

  const toggleLine = (lineName: string) => {
    if (expandedLines.includes(lineName)) {
      setExpandedLines(expandedLines.filter((l) => l !== lineName));
    } else {
      setExpandedLines([...expandedLines, lineName]);
    }
  };

  return (
    <div className="pb-20">
      {/* Process Groups List */}
      <div className="space-y-3">
        {sortedProcessNames.map((processName) => {
          const machinesInLine = groupedMachines[processName];
          const isExpanded = expandedLines.includes(processName);

          return (
            <div key={processName} className="bg-transparent overflow-hidden">
              {/* Header ของ Line ผลิต */}
              <button
                onClick={() => toggleLine(processName)}
                className={`w-full p-4 flex justify-between items-center transition-all rounded-xl border mb-2 ${
                  isExpanded
                    ? "bg-[#1E293B] border-blue-500/50 shadow-lg shadow-blue-900/20"
                    : "bg-[#1E293B]/60 border-slate-700 hover:bg-[#1E293B]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      isExpanded
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

                <ChevronDown
                  className={`text-slate-400 transition-transform duration-200 ${
                    isExpanded ? "rotate-180 text-blue-400" : ""
                  }`}
                  size={24}
                />
              </button>

              {/* รายชื่อเครื่องจักร (แสดงเมื่อเปิด) */}
              {isExpanded && (
                <div className="pl-2 pr-2 pb-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                    {machinesInLine.map((m: Machine) => (
                      <button
                        key={m.id}
                        onClick={() => onSelect(m)}
                        // ✅ ปรับลด Padding (p-3) และตัดส่วน M01 ออก
                        className="relative bg-[#1E293B] p-3 rounded-r-xl rounded-l-md shadow-lg border border-slate-700 border-l-4 border-l-blue-500 hover:border-blue-400 hover:shadow-blue-900/20 transition-all text-left flex justify-between items-center group"
                      >
                        <div className="flex flex-col">
                          {/* บรรทัด 1: ชื่อเครื่อง */}
                          <div className="font-bold text-base text-white group-hover:text-blue-300 transition-colors leading-tight">
                            {m.name}
                          </div>

                          {/* บรรทัด 2: จำนวนจุดตรวจ */}
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <ClipboardCheck size={12} /> {m.checklist.length}{" "}
                            จุดตรวจ
                          </div>
                        </div>

                        {/* ปุ่มลูกศรขวา */}
                        <div className="bg-slate-800 border border-slate-700 text-slate-400 p-2 rounded-lg group-hover:bg-blue-600 group-hover:border-blue-500 group-hover:text-white transition-all">
                          <Plus size={16} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sortedProcessNames.length === 0 && (
          <div className="text-center p-8 text-slate-500 bg-[#1E293B]/50 rounded-xl border border-dashed border-slate-700">
            ยังไม่มีเครื่องจักรในระบบ
            <br />
            (กดปุ่มตั้งค่าเพื่อเพิ่มเครื่องจักร)
          </div>
        )}
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
      className={`group bg-[#1E293B] rounded-xl border overflow-hidden shadow-md transition-all ${
        isOpen ? "border-blue-500/50" : "border-slate-700"
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
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                  page === 1
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                1-15
              </button>
              <button
                onClick={() => setPage(2)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                  page === 2
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
            className={`transition-transform text-slate-500 ${
              isOpen ? "rotate-180 text-blue-400" : ""
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
  const [isLoading, setIsLoading] = useState(false);

  const [showPdf, setShowPdf] = useState(false);
  const [targetMachine, setTargetMachine] = useState<Machine | null>(null);
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentGenMachine, setCurrentGenMachine] = useState<any>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // 1. เดือนภาษาอังกฤษ
  const monthOptions = [
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

  // 2. รายการปี
  const yearOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    return [cur - 2, cur - 1, cur, cur + 1].map((y) => ({
      label: String(y),
      value: y,
    }));
  }, []);

  // 3. รายชื่อ Line ผลิต
  const processOptions = useMemo(() => {
    const uniqueProcesses = Array.from(
      new Set(machines.map((m) => m.process || "General"))
    ).sort();
    return [
      { label: "-- All Lines --", value: "All" },
      ...uniqueProcesses.map((p) => ({ label: p, value: p })),
    ];
  }, [machines]);

  // 4. รายชื่อเครื่องจักร
  const machineOptions = useMemo(() => {
    let filtered = machines;
    if (selectedProcess !== "All") {
      filtered = machines.filter(
        (m) => (m.process || "General") === selectedProcess
      );
    }
    return [
      { label: "-- All Machines --", value: "All" },
      ...filtered
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) => ({
          label: m.name,
          value: m.id,
        })),
    ];
  }, [selectedProcess, machines]);

  useEffect(() => {
    setSelectedMachineId("All");
  }, [selectedProcess]);

  const fetchReport = async () => {
    setIsLoading(true);
    setReportData([]);
    setAllLogs([]);
    try {
      const mStr = String(selectedMonth).padStart(2, "0");
      const startDateStr = `${selectedYear}-${mStr}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endDateStr = `${selectedYear}-${mStr}-${String(lastDay).padStart(
        2,
        "0"
      )}`;

      const q = query(
        collection(db, "logs"),
        where("date", ">=", startDateStr),
        where("date", "<=", endDateStr)
      );
      const snapshot = await getDocs(q);
      const fetchedLogs = snapshot.docs.map((d) => d.data() as LogEntry);
      setAllLogs(fetchedLogs);

      const grouped: any = {};
      const machinesToShow =
        selectedMachineId === "All"
          ? selectedProcess === "All"
            ? machines
            : machines.filter(
                (m) => (m.process || "General") === selectedProcess
              )
          : machines.filter((m) => m.id === selectedMachineId);

      machinesToShow.forEach((m) => {
        grouped[m.id] = {
          mid: m.id,
          machineName: m.name,
          process: m.process || "General",
          hasCheck: false,
        };
      });

      fetchedLogs.forEach((log) => {
        if (grouped[log.mid]) grouped[log.mid].hasCheck = true;
      });
      setReportData(
        Object.values(grouped).sort((a: any, b: any) =>
          a.machineName.localeCompare(b.machineName)
        )
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTicketAction = (machineId: string) => {
    if (isSelectionMode) {
      setSelectedMachineIds((prev) =>
        prev.includes(machineId)
          ? prev.filter((x) => x !== machineId)
          : [...prev, machineId]
      );
    } else {
      const m = machines.find((x) => x.id === machineId);
      if (m) {
        setTargetMachine(m);
        setShowPdf(true);
      }
    }
  };

  const handleBatchDownload = async () => {
    if (selectedMachineIds.length === 0) return;
    setIsDownloading(true);
    for (const mid of selectedMachineIds) {
      const m = machines.find((x) => x.id === mid);
      if (m) {
        setCurrentGenMachine({ machine: m });
        await new Promise((resolve) => setTimeout(resolve, 800));
        const filename = `${m.name}_${selectedYear}${String(
          selectedMonth
        ).padStart(2, "0")}.pdf`;
        if (printRef.current) {
          const opt = {
            margin: 0,
            filename,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
          };
          // @ts-ignore
          await html2pdf().set(opt).from(printRef.current).save();
        }
      }
    }
    setIsDownloading(false);
    setCurrentGenMachine(null);
    setSelectedMachineIds([]);
    setIsSelectionMode(false);
  };

  return (
    <div className="w-full max-w-[100%] mx-auto pb-20 relative pt-4">
      <div className="bg-[#1E293B] p-5 rounded-xl shadow-sm border border-slate-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block tracking-wide">
              Line
            </label>
            <SearchableSelect
              options={processOptions}
              value={selectedProcess}
              onChange={setSelectedProcess}
              placeholder="Select Line..."
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block tracking-wide">
              Machine
            </label>
            <SearchableSelect
              options={machineOptions}
              value={selectedMachineId}
              onChange={setSelectedMachineId}
              placeholder="Select Machine..."
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block tracking-wide">
              Month
            </label>
            <SearchableSelect
              options={monthOptions}
              value={selectedMonth}
              onChange={setSelectedMonth}
              placeholder="Select Month..."
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block tracking-wide">
              Year
            </label>
            <SearchableSelect
              options={yearOptions}
              value={selectedYear}
              onChange={setSelectedYear}
              placeholder="Select Year..."
            />
          </div>

          {/* ✅ ส่วนของปุ่มกดที่เว้นที่ไว้ถาวร */}
          <div className="lg:col-span-3 grid grid-cols-3 gap-2">
            <button
              onClick={fetchReport}
              disabled={isLoading}
              className="bg-blue-600 text-white px-2 py-2.5 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg transition-all h-[42px] text-xs"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Search size={16} />
              )}{" "}
              ค้นหา
            </button>

            <button
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedMachineIds([]);
              }}
              className={`px-2 py-2.5 rounded-lg font-bold border transition-all h-[42px] text-xs ${
                isSelectionMode
                  ? "bg-red-500 text-white border-red-600"
                  : "bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600"
              }`}
            >
              {isSelectionMode ? "ยกเลิก" : "เลือก"}
            </button>

            {/* ✅ ปุ่ม PDF: จองพื้นที่ไว้ตลอดเวลา (Invisible เมื่อไม่ใช้) */}
            <button
              onClick={handleBatchDownload}
              disabled={isDownloading || selectedMachineIds.length === 0}
              className={`bg-green-600 text-white px-2 py-2.5 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg transition-all h-[42px] text-xs disabled:opacity-50 disabled:bg-slate-800 ${
                isSelectionMode
                  ? "opacity-100 visible"
                  : "opacity-0 invisible pointer-events-none"
              }`}
            >
              {isDownloading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Download size={16} />
              )}
              PDF{" "}
              {selectedMachineIds.length > 0 &&
                `(${selectedMachineIds.length})`}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {reportData.map((row) => (
          <div
            key={row.mid}
            onClick={() => handleTicketAction(row.mid)}
            className={`bg-[#1E293B] p-3 rounded-xl border shadow-sm flex items-center justify-between gap-2 cursor-pointer transition-all ${
              selectedMachineIds.includes(row.mid)
                ? "border-blue-500 ring-1 ring-blue-500 bg-[#2d3b52]"
                : "border-slate-700 hover:border-slate-500"
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {isSelectionMode && (
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-600 text-blue-600 bg-slate-800"
                  checked={selectedMachineIds.includes(row.mid)}
                  readOnly
                />
              )}
              <div
                className={`w-3 h-3 rounded-full shrink-0 ${
                  !row.hasCheck ? "bg-slate-600" : "bg-green-500"
                }`}
              ></div>
              <div className="flex flex-col truncate">
                <span className="text-[10px] text-slate-400 uppercase">
                  {row.process}
                </span>
                <span className="font-bold text-slate-200 text-sm truncate">
                  {row.machineName}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed left-[-9999px] top-0">
        {currentGenMachine && (
          <div ref={printRef}>
            <MonthlySummaryReport
              machine={currentGenMachine.machine}
              month={selectedMonth.toString()}
              year={selectedYear}
              masterList={currentGenMachine.machine.checklist}
              allLogs={allLogs}
              isBatchMode={true}
              onClose={() => {}}
            />
          </div>
        )}
      </div>

      {showPdf && targetMachine && (
        <MonthlySummaryReport
          machine={targetMachine}
          month={selectedMonth.toString()}
          year={selectedYear}
          masterList={targetMachine.checklist}
          allLogs={allLogs}
          onClose={() => setShowPdf(false)}
        />
      )}
    </div>
  );
}

// ==========================================
// 6. MachineSettingsView (Fixed: Added Password Guard on Save)
// ==========================================
function MachineSettingsView({
  machines,
  user,
}: {
  machines: Machine[];
  user: User;
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
  const [isUploading, setIsUploading] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // ✅ 1. เพิ่ม State สำหรับ Password Guard
  const [showGuard, setShowGuard] = useState(false);
  const [guardMessage, setGuardMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});

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
    // ดันหน้าจอขึ้นไปข้างบนสุดเพื่อให้เห็นฟอร์มแก้ไข
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // ✅ 3. ฟังก์ชันดักตอนกดปุ่มบันทึก เพื่อถามรหัสผ่าน
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
        machines={machines}
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
            onClick={() => setShowPrintModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg"
          >
            <Printer size={18} /> พิมพ์ QR Code (A4)
          </button>
        </div>

        <div
          className={`bg-[#0F172A] p-5 rounded-xl border border-slate-700 mb-8 ${
            editingId ? "border-blue-500 ring-1 ring-blue-500/50" : ""
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                ชื่อกระบวนการผลิต
              </label>
              <input
                className={darkInputClass}
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
                    รายละเอียด
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
                    วิธีการตรวจ
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

          <div className="flex gap-2">
            <button
              onClick={handleAddRow}
              className="px-4 py-2 border border-blue-500 text-blue-400 rounded-lg font-bold hover:bg-blue-500/10 flex items-center gap-2 text-sm"
            >
              <Plus size={16} /> เพิ่มรายการ
            </button>
            <button
              onClick={handleSaveClick} // ✅ เปลี่ยนมาใช้ handleSaveClick เพื่อถามรหัส
              disabled={isUploading}
              className={`flex-1 text-white px-4 py-2 rounded-lg font-bold shadow-md flex justify-center items-center gap-2 ${
                editingId
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-green-600 hover:bg-green-700"
              } ${isUploading ? "opacity-70" : ""}`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin" /> กำลังบันทึก...
                </>
              ) : editingId ? (
                "บันทึกการแก้ไข"
              ) : (
                "บันทึกเครื่องจักรใหม่"
              )}
            </button>
          </div>
        </div>

        {/* ตารางรายชื่อเครื่องจักรข้างล่าง (เหมือนเดิม) */}
        <div className="flex justify-between items-center mb-4 mt-8 pt-4 border-t border-slate-700">
          <h3 className="font-bold text-slate-300 text-lg">
            เครื่องจักรในระบบ ({filteredMachines.length})
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 font-bold">
              กรองตาม Line:
            </span>
            <select
              value={filterProcess}
              onChange={(e) => setFilterProcess(e.target.value)}
              className="border border-slate-600 rounded p-2 text-sm bg-[#0F172A] text-white focus:ring-1 focus:ring-blue-500"
            >
              {processes.map((p, i) => (
                <option key={i} value={p}>
                  {p}
                </option>
              ))}
            </select>
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
                  {m.process || "General"} • {m.checklist.length} รายการ
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

// ==========================================
// DAILY CHECK MODULE (FULL FIXED)
// ==========================================
export function DailyCheckModule({ currentUser, activeTab, onExit }: any) {
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null);

  // State สำหรับ Modal ที่ถูกเรียกจาก InspectView
  const [showUserModal, setShowUserModal] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);

  // Load Machine Data
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "machines"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.data().id, ...d.data() }));
      // เรียงตามชื่อ process แล้วค่อยชื่อเครื่อง
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

  // Reset selected machine when switching tabs
  useEffect(() => setSelectedMachine(null), [activeTab]);

  // ✅ LOGIC: เช็คสิทธิ์การเข้าถึงหน้าตั้งค่า
  const canAccessSettings =
    currentUser?.username === "Bank" ||
    currentUser?.role === "super_admin" ||
    currentUser?.allowedActions?.includes("daily_settings");

  // 1. ถ้ามีการเลือกเครื่องจักร (เข้าสู่โหมด Scan/Check)
  if (selectedMachine)
    return (
      <div className="bg-[#0F172A] w-full h-full flex flex-col overflow-hidden text-slate-200">
        <ScanPage
          machine={selectedMachine}
          user={currentUser}
          onBack={() => setSelectedMachine(null)}
        />
      </div>
    );

  // 2. หน้าหลัก (แสดงตาม Tab)
  return (
    <div className="bg-[#0F172A] text-slate-200 h-full w-full flex flex-col overflow-y-auto custom-scrollbar relative">
      {/* ✅ MOBILE HEADER (แสดงเฉพาะมือถือ) */}
      <div className="bg-[#1E293B] border-b border-slate-700 px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-md md:hidden">
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
              <ClipboardCheck className="text-green-500" size={20} />
              Daily Check
            </h1>
            <span className="text-[10px] text-slate-400">
              {activeTab === "inspect" && "ตรวจสอบเครื่องจักร"}
              {activeTab === "data" && "ประวัติการตรวจสอบ"}
              {activeTab === "dashboard" && "สรุปรายงาน (PDF)"}
              {activeTab === "settings" && "ตั้งค่าระบบ"}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full px-4 py-6 flex-1 max-w-[100vw] overflow-x-hidden">
        {/* --- 1. INSPECT TAB (หน้าตรวจเช็ค) --- */}
        {activeTab === "inspect" && (
          <InspectView
            machines={machines}
            user={currentUser}
            onSelect={setSelectedMachine}
            onShowUsers={() => setShowUserModal(true)}
            onShowMachines={() => setShowMachineModal(true)}
          />
        )}

        {/* --- 2. DATA TAB (ประวัติ) --- */}
        {activeTab === "data" && (
          <DataView machines={machines} user={currentUser} />
        )}

        {/* --- 3. DASHBOARD TAB (รายงาน PDF) --- */}
        {activeTab === "dashboard" && (
          <>
            <DashboardView machines={machines} user={currentUser} />
          </>
        )}

        {/* --- 4. SETTINGS TAB (ตั้งค่า) --- */}
        {/* ✅ แก้ไข: เพิ่มเงื่อนไขตรวจสอบสิทธิ์ก่อนแสดงผล */}
        {activeTab === "settings" &&
          (canAccessSettings ? (
            <MachineSettingsView machines={machines} user={currentUser} />
          ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] w-full text-slate-400 animate-in fade-in zoom-in-95">
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

      {/* --- GLOBAL MODALS (เรียกจาก InspectView) --- */}
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

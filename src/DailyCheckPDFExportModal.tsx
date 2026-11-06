import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  FileText,
  Printer,
  ChevronDown,
  SkipForward,
  RotateCcw,
  CheckSquare,
  Square,
} from "lucide-react";
import { db } from "./firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

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
  category?: string;
}

interface Machine {
  id: string;
  name: string;
  process?: string;
  material?: string;
  checklist: ChecklistItem[];
  systemMode?: "DAILY" | "DEW_POINT";
}

interface LogEntry {
  id?: string;
  mid: string;
  checklist_item: string;
  result: "NORMAL" | "ABNORMAL" | "FILTER" | "NA" | string;
  problem_detail?: string;
  inspector: string;
  date: string;
  shift: string;
  timestamp?: any;
  set_point?: string;
  actual?: string;
  dew_point_val?: string;
  material_name?: string;
}

interface AuditLog {
  id?: string;
  mid: string;
  year: number;
  month: number;
  day: number;
  shift: string;
  auditor: string;
}

interface DailyCheckPDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  initialMachineId: string;
  month: number;
  year: number;
  logs: LogEntry[];
  auditLogs?: AuditLog[];
  currentUser?: any;
}

const MONTH_NAMES_EN = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

// ฟังก์ชันสร้าง Data URL ภาพข้อความแนวตั้ง คมชัดระดับ 2.5x สัดส่วนธรรมชาติ
// ป้องกันปัญหา html2canvas เรนเดอร์ writing-mode / rotate ไม่สมบูรณ์ในตาราง
function getVerticalTextDataUrl(
  text: string,
  height = 165,
  width = 30,
  fontSize = 8.5
): string {
  if (typeof document === "undefined") return "";
  try {
    const canvas = document.createElement("canvas");
    const dpr = 2.5;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.scale(dpr, dpr);
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${fontSize}px Tahoma, "Leelawadee UI", Arial, sans-serif`;
    ctx.fillStyle = "#000000";
    ctx.fillText(text, 0, 0);

    return canvas.toDataURL("image/png");
  } catch (e) {
    return "";
  }
}

export function DailyCheckPDFExportModal({
  isOpen,
  onClose,
  machines,
  initialMachineId,
  month,
  year,
  logs = [],
  auditLogs = [],
  currentUser,
}: DailyCheckPDFExportModalProps) {
  // ✅ เรียงลำดับเครื่องจักรตามไลน์ (process) ก่อน แล้วเรียงตามชื่อเครื่องภายในไลน์
  const sortedMachines = useMemo(() => {
    return [...machines].sort((a, b) => {
      const lineA =
        a.process && a.process.trim() !== ""
          ? a.process.trim()
          : "General / อื่นๆ";
      const lineB =
        b.process && b.process.trim() !== ""
          ? b.process.trim()
          : "General / อื่นๆ";
      const lineCompare = lineA.localeCompare(lineB, undefined, {
        numeric: true,
      });
      if (lineCompare !== 0) return lineCompare;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }, [machines]);

  // จัดกลุ่มเครื่องจักรตามไลน์ (Line / Process) สำหรับแสดงในเมนูเลือกเครื่อง
  const groupedByLine = useMemo(() => {
    const groups: { lineName: string; items: Machine[] }[] = [];
    const map = new Map<string, Machine[]>();
    sortedMachines.forEach((m) => {
      const lineName =
        m.process && m.process.trim() !== ""
          ? m.process.trim()
          : "General / อื่นๆ";
      if (!map.has(lineName)) {
        const arr: Machine[] = [];
        map.set(lineName, arr);
        groups.push({ lineName, items: arr });
      }
      map.get(lineName)!.push(m);
    });
    return groups;
  }, [sortedMachines]);

  const [selectedMachineId, setSelectedMachineId] = useState<string>(
    initialMachineId && initialMachineId !== "All"
      ? initialMachineId
      : sortedMachines[0]?.id || ""
  );

  const [activePreviewPage, setActivePreviewPage] = useState<1 | 2>(1);
  const [base64Images, setBase64Images] = useState<Record<string, string>>({});
  const [printMode, setPrintMode] = useState<"all" | 1 | 2>("all");

  // ✅ สถานะการดาวน์โหลด PDF แบบ Real-time จาก Firebase (ช่วยกันโหลดหลายเครื่องได้)
  const [downloadedMap, setDownloadedMap] = useState<
    Record<string, { downloadedBy: string; docId: string }>
  >({});
  const [isMachineMenuOpen, setIsMachineMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // ✅ ระบบติ๊กเลือกเครื่องจักรที่จะโหลด (Multi-Select) + เปิดหน้าเซฟ (Print Preview) เครื่องถัดไปให้อัตโนมัติทันทีที่เซฟเสร็จ
  const [selectedForDownloadIds, setSelectedForDownloadIds] = useState<
    Set<string>
  >(new Set());
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [batchDoneMessage, setBatchDoneMessage] = useState<string | null>(null);
  const [autoOpenNextPrint, setAutoOpenNextPrint] = useState<boolean>(true);
  const [pendingNextPrintMachine, setPendingNextPrintMachine] =
    useState<Machine | null>(null);
  const autoPrintTimerRef = useRef<any>(null);
  const autoOpenNextPrintRef = useRef<boolean>(true);
  const imageCacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    autoOpenNextPrintRef.current = autoOpenNextPrint;
  }, [autoOpenNextPrint]);

  useEffect(() => {
    const q = query(
      collection(db, "daily_pdf_downloads"),
      where("year", "==", year),
      where("month", "==", month)
    );
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, { downloadedBy: string; docId: string }> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.mid) {
          map[data.mid] = {
            downloadedBy: data.downloadedBy || "User",
            docId: d.id,
          };
        }
      });
      setDownloadedMap(map);
    });
    return () => unsub();
  }, [year, month]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsMachineMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isMachineMenuOpen && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isMachineMenuOpen]);

  const markMachineDownloaded = async (mid: string) => {
    if (!mid) return;
    const docId = `${mid}_${year}_${month}`;
    const userName =
      currentUser?.fullname || currentUser?.username || "ผู้ใช้งาน";
    try {
      await setDoc(
        doc(db, "daily_pdf_downloads", docId),
        {
          mid,
          year,
          month,
          downloadedBy: userName,
          downloadedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Error marking machine downloaded:", err);
    }
  };

  const unmarkMachineDownloaded = async (mid: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const docId = `${mid}_${year}_${month}`;
    try {
      await deleteDoc(doc(db, "daily_pdf_downloads", docId));
    } catch (err) {
      console.error("Error unmarking machine downloaded:", err);
    }
  };

  const handleResetAllDownloads = async () => {
    const targetMachines = machines.filter((m) => !!downloadedMap[m.id]);
    if (targetMachines.length === 0) return;
    if (
      !window.confirm(
        `ต้องการล้างสถานะการดาวน์โหลดทั้งหมด (${targetMachines.length} เครื่อง) ของเดือน ${monthNameEn} ${year} ใช่หรือไม่?`
      )
    ) {
      return;
    }
    try {
      const batch = writeBatch(db);
      targetMachines.forEach((m) => {
        const docId = `${m.id}_${year}_${month}`;
        batch.delete(doc(db, "daily_pdf_downloads", docId));
      });
      await batch.commit();
    } catch (err) {
      console.error("Error resetting downloads:", err);
    }
  };

  const handleJumpNextUndownloaded = () => {
    if (sortedMachines.length === 0) return;
    const curIdx = sortedMachines.findIndex((m) => m.id === selectedMachineId);
    for (let i = 1; i <= sortedMachines.length; i++) {
      const candidate = sortedMachines[(curIdx + i) % sortedMachines.length];
      if (!downloadedMap[candidate.id]) {
        setSelectedMachineId(candidate.id);
        return;
      }
    }
  };

  // ซิงค์หน้าพรีวิวให้ไปอยู่ที่เครื่องแรกที่ติ๊กเลือกไว้ หากเครื่องปัจจุบันไม่ได้อยู่ในรายการที่ติ๊ก
  const syncPreviewToSelectedSet = (nextSet: Set<string>) => {
    if (nextSet.size > 0 && !nextSet.has(selectedMachineId)) {
      const firstTicked = sortedMachines.find((m) => nextSet.has(m.id));
      if (firstTicked) {
        setSelectedMachineId(firstTicked.id);
      }
    }
  };

  const toggleSelectMachineForDownload = (
    mid: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    setSelectedForDownloadIds((prev) => {
      const next = new Set(prev);
      if (next.has(mid)) {
        next.delete(mid);
      } else {
        next.add(mid);
      }
      syncPreviewToSelectedSet(next);
      return next;
    });
  };

  const toggleSelectLineForDownload = (
    lineMachines: Machine[],
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    setSelectedForDownloadIds((prev) => {
      const next = new Set(prev);
      const allSelected = lineMachines.every((m) => next.has(m.id));
      if (allSelected) {
        lineMachines.forEach((m) => next.delete(m.id));
      } else {
        lineMachines.forEach((m) => next.add(m.id));
      }
      syncPreviewToSelectedSet(next);
      return next;
    });
  };

  const handleSelectAllMachines = () => {
    const next = new Set(sortedMachines.map((m) => m.id));
    setSelectedForDownloadIds(next);
    syncPreviewToSelectedSet(next);
  };

  const handleSelectUndownloadedMachines = () => {
    const next = new Set(
      sortedMachines.filter((m) => !downloadedMap[m.id]).map((m) => m.id)
    );
    setSelectedForDownloadIds(next);
    syncPreviewToSelectedSet(next);
  };

  const stopAutoPrintChain = () => {
    if (autoPrintTimerRef.current) {
      clearTimeout(autoPrintTimerRef.current);
      autoPrintTimerRef.current = null;
    }
    setPendingNextPrintMachine(null);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopAutoPrintChain();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (autoPrintTimerRef.current) {
        clearTimeout(autoPrintTimerRef.current);
      }
    };
  }, []);

  const handleClearSelectedMachines = () => {
    stopAutoPrintChain();
    setSelectedForDownloadIds(new Set());
  };

  // แปลงรูปภาพของเครื่องที่กำหนดเป็น Base64 ให้พร้อมก่อนสั่งพิมพ์ PDF
  const prepareMachineImages = async (machine: Machine) => {
    const map: Record<string, string> = {};
    const items = machine.checklist || [];

    for (const item of items) {
      if (item.image_url && !map[item.image_url]) {
        if (imageCacheRef.current[item.image_url]) {
          map[item.image_url] = imageCacheRef.current[item.image_url];
          continue;
        }
        try {
          const res = await fetch(item.image_url);
          const blob = await res.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(item.image_url || "");
          });
          map[item.image_url] = base64;
          imageCacheRef.current[item.image_url] = base64;
        } catch (e) {
          map[item.image_url] = item.image_url;
        }
      }
    }
    return map;
  };

  // 🖨️ สั่งพิมพ์เครื่องที่ระบุ และเมื่อเซฟไฟล์เสร็จ (ปิดหน้า Print) จะสลับไปเครื่องถัดไปพร้อมเด้งหน้า Print Preview ของเครื่องถัดไปให้อัตโนมัติทันที
  const startPrintForMachine = async (
    machineToPrint: Machine,
    activeTickedSet: Set<string>,
    isUsingTickedList: boolean
  ) => {
    stopAutoPrintChain();
    setIsMachineMenuOpen(false);
    setBatchDoneMessage(null);
    setPrintMode("all");

    const imgMap = await prepareMachineImages(machineToPrint);
    setBase64Images(imgMap);
    setSelectedMachineId(machineToPrint.id);

    // รอให้ตารางและรูปของเครื่องนี้เรนเดอร์ลง #pdf-print-area ให้ครบถ้วนก่อนเปิดหน้า Print
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setTimeout(resolve, 200))
      )
    );

    const printedMid = machineToPrint.id;
    markMachineDownloaded(printedMid);

    // ค้นหาเครื่องถัดไปล่วงหน้า เพื่อโหลดรูปภาพรอไว้เบื้องหลังทันที
    const curIdx = sortedMachines.findIndex((m) => m.id === printedMid);
    let nextMachineToPreview: Machine | undefined;

    if (isUsingTickedList) {
      for (let i = 1; i <= sortedMachines.length; i++) {
        const candidate = sortedMachines[(curIdx + i) % sortedMachines.length];
        if (candidate.id !== printedMid && activeTickedSet.has(candidate.id)) {
          nextMachineToPreview = candidate;
          break;
        }
      }
    } else if (sortedMachines.length > 1) {
      // หากไม่ได้ติ๊กเลือกไว้ ให้หาเครื่องถัดไปที่ยังไม่ได้โหลด (เรียงตาม Line)
      for (let i = 1; i <= sortedMachines.length; i++) {
        const candidate = sortedMachines[(curIdx + i) % sortedMachines.length];
        if (candidate.id !== printedMid && !downloadedMap[candidate.id]) {
          nextMachineToPreview = candidate;
          break;
        }
      }
    }

    if (nextMachineToPreview) {
      prepareMachineImages(nextMachineToPreview);
    }

    const originalTitle = document.title;
    const safeMachineName = (machineToPrint.name || "Machine").replace(
      /[/\\?%*:|"<>]/g,
      "_"
    );
    document.title = `${safeMachineName}_${monthNameEn}_${year}`;

    let afterPrintHandled = false;

    const onPrintFinished = () => {
      if (afterPrintHandled) return;
      afterPrintHandled = true;
      window.removeEventListener("afterprint", onPrintFinished);
      document.title = originalTitle;

      if (isUsingTickedList) {
        const nextSet = new Set(activeTickedSet);
        nextSet.delete(printedMid);
        setSelectedForDownloadIds(nextSet);

        if (nextSet.size > 0 && nextMachineToPreview) {
          setSelectedMachineId(nextMachineToPreview.id);
          if (autoOpenNextPrintRef.current) {
            setPendingNextPrintMachine(nextMachineToPreview);
            autoPrintTimerRef.current = setTimeout(() => {
              setPendingNextPrintMachine(null);
              startPrintForMachine(nextMachineToPreview!, nextSet, true);
            }, 550);
          }
        } else if (nextSet.size === 0) {
          setPendingNextPrintMachine(null);
          setBatchDoneMessage(
            "✅ บันทึกไฟล์ PDF (Vector 100%) ครบทุกเครื่องที่ติ๊กเลือกเรียบร้อยแล้ว!"
          );
          setTimeout(() => setBatchDoneMessage(null), 5000);
        }
      } else if (nextMachineToPreview) {
        setSelectedMachineId(nextMachineToPreview.id);
        if (autoOpenNextPrintRef.current) {
          setPendingNextPrintMachine(nextMachineToPreview);
          autoPrintTimerRef.current = setTimeout(() => {
            setPendingNextPrintMachine(null);
            startPrintForMachine(nextMachineToPreview!, new Set(), false);
          }, 550);
        }
      }
    };

    window.addEventListener("afterprint", onPrintFinished);
    window.print();
  };

  const handlePrintToPDF = async () => {
    const isUsingTickedList = selectedForDownloadIds.size > 0;
    let targetMachine = currentMachine;

    if (
      isUsingTickedList &&
      targetMachine &&
      !selectedForDownloadIds.has(targetMachine.id)
    ) {
      const firstTicked = sortedMachines.find((m) =>
        selectedForDownloadIds.has(m.id)
      );
      if (firstTicked) {
        targetMachine = firstTicked;
      }
    }

    if (!targetMachine) return;
    await startPrintForMachine(
      targetMachine,
      new Set(selectedForDownloadIds),
      isUsingTickedList
    );
  };

  const verticalTextDataUrl = useMemo(() => {
    return getVerticalTextDataUrl("การทำความสะอาดและสภาพแวดล้อม", 165, 30, 8.5);
  }, []);

  useEffect(() => {
    if (initialMachineId && initialMachineId !== "All") {
      setSelectedMachineId(initialMachineId);
    }
  }, [initialMachineId]);

  // รหัสเอกสารควบคุม (Document Control / Revision) ดึง Realtime จาก Firebase Firestore
  const [docControlCode, setDocControlCode] = useState("FM-PE-004 Rev.02 (06-Apr-20)");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "daily_settings", "document_control"), (snap) => {
      if (snap.exists() && snap.data()?.formCode) {
        setDocControlCode(snap.data().formCode);
      }
    });
    return () => unsub();
  }, []);

  // ดึงข้อมูลการอนุมัติรายงานประจำเดือน (daily_approvals) ของเดือนและปีนี้
  const [approvals, setApprovals] = useState<Record<string, { approvedBy: string }>>({});

  useEffect(() => {
    const q = query(
      collection(db, "daily_approvals"),
      where("year", "==", year),
      where("month", "==", month)
    );
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, { approvedBy: string }> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.mid && data.approvedBy) {
          map[data.mid] = { approvedBy: data.approvedBy };
        }
      });
      setApprovals(map);
    });
    return () => unsub();
  }, [year, month]);

  const currentMachine =
    machines.find((m) => m.id === selectedMachineId) || machines[0];

  const isDewPoint = currentMachine?.systemMode === "DEW_POINT";

  const daysInMonth = new Date(year, month, 0).getDate();
  const monthNameEn = MONTH_NAMES_EN[month - 1] || `MONTH ${month}`;

  // หน้า 1: วันที่ 1 - 16 (ตามแบบฟอร์มต้นฉบับ EXT-FM-PE-004 เป๊ะๆ)
  // หน้า 2: วันที่ 17 - สิ้นเดือน (สำหรับ Dew Point แสดงโครงฟอร์มถึงวันที่ 31 เสมอ)
  const daysPage1 = Array.from({ length: 16 }, (_, i) => i + 1);
  const daysPage2 = isDewPoint
    ? Array.from({ length: 15 }, (_, i) => 17 + i)
    : Array.from(
        { length: Math.max(0, daysInMonth - 16) },
        (_, i) => 17 + i
      );

  // แปลงรูปภาพเป็น Base64 ล่วงหน้า เพื่อป้องกันปัญหา CORS ตอนทำ PDF
  useEffect(() => {
    if (!currentMachine || isBatchSaving) return;
    let isCancelled = false;

    prepareMachineImages(currentMachine).then((map) => {
      if (!isCancelled) {
        setBase64Images(map);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [currentMachine, isBatchSaving]);

  if (!isOpen || !currentMachine) return null;

  const hasDpData = (log: any) => {
    if (!log) return false;
    const fields = ["result", "set_point", "actual", "dew_point_val", "problem_detail"];
    return fields.some(
      (f) => log[f] !== undefined && log[f] !== null && String(log[f]).trim() !== ""
    );
  };

  const formatTime = (ts: any) => {
    if (!ts) return "";
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // สร้าง Map สำหรับ O(1) Lookup ข้อมูลของทุกเครื่องจักร รองรับทั้งการพรีวิวและการพิมพ์รวมหลายเครื่องพร้อมกัน
  const { logMap, dpLogMap, inspectorMap, auditMap } = useMemo(() => {
    const lMap = new Map<string, LogEntry>();
    const dpMap = new Map<string, LogEntry>();
    const iMap = new Map<string, string>();
    const aMap = new Map<string, string>();

    for (const l of logs) {
      if (!l.mid) continue;
      lMap.set(`${l.mid}_${l.date}_${l.shift}_${l.checklist_item}`, l);
      const dpKey = `${l.mid}_${l.date}_${l.shift}`;
      if (!dpMap.has(dpKey) || hasDpData(l)) {
        dpMap.set(dpKey, l);
      }
      if (l.inspector && !iMap.has(dpKey)) {
        iMap.set(dpKey, l.inspector);
      }
    }
    for (const a of auditLogs) {
      if (a.mid && a.year === year && a.month === month) {
        aMap.set(`${a.mid}_${a.day}_${a.shift}`, a.auditor || "");
      }
    }

    return { logMap: lMap, dpLogMap: dpMap, inspectorMap: iMap, auditMap: aMap };
  }, [logs, auditLogs, year, month]);

  const getLog = (
    d: number,
    shift: string,
    itemDetail: string,
    mid: string = currentMachine.id
  ) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    return logMap.get(`${mid}_${dateStr}_${shift}_${itemDetail}`);
  };

  const getDpLog = (
    d: number,
    shift: string,
    mid: string = currentMachine.id
  ) => {
    if (d > daysInMonth) return undefined;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    const found = dpLogMap.get(`${mid}_${dateStr}_${shift}`);
    return found && hasDpData(found) ? found : undefined;
  };

  const getInspector = (
    d: number,
    shift: string,
    mid: string = currentMachine.id
  ) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    return inspectorMap.get(`${mid}_${dateStr}_${shift}`) || "";
  };

  const getAuditor = (
    d: number,
    shift: string,
    mid: string = currentMachine.id
  ) => {
    return auditMap.get(`${mid}_${d}_${shift}`) || "";
  };

  const renderSymbol = (log?: LogEntry) => {
    if (!log) return "";
    if (log.result === "NORMAL") return "✓";
    if (log.result === "ABNORMAL") return "x";
    if (log.result === "NA") return "-";
    if (log.result === "FILTER") return "△";
  };

  const selectedCurrentMachine = currentMachine;

  // เรนเดอร์ 1 หน้า A4 Portrait สำหรับโหมด Dew Point (Check Sheet for Dryer)
  const renderDewPointPage = (
    pageNumber: 1 | 2,
    daysList: number[],
    targetMachine: Machine = selectedCurrentMachine
  ) => {
    const currentMachine = targetMachine;
    const dpMaterial =
      currentMachine.material ||
      logs.find(
        (l) =>
          l.mid === currentMachine.id &&
          l.material_name &&
          l.material_name !== "-"
      )?.material_name ||
      "";

    const mmStr = String(month).padStart(2, "0");
    const yyStr = String(year).slice(-2);

    const renderStatusCheckbox = (checked: boolean, label: string, isAlert = false) => (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "3px",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "9.5px",
            height: "9.5px",
            border: "1px solid #000000",
            fontSize: "8px",
            fontWeight: "bold",
            lineHeight: 1,
            color: checked && isAlert ? "#dc2626" : "#000000",
            boxSizing: "border-box",
          }}
        >
          {checked ? "✓" : ""}
        </span>
        <span style={{ fontSize: "8.5px" }}>{label}</span>
      </span>
    );

    const renderShiftCells = (shiftCode: "D" | "N", log?: LogEntry) => {
      const shiftLabel = shiftCode === "D" ? "DS" : "NS";
      const timeStr = log && log.result !== "NA" ? formatTime(log.timestamp) : "";
      const [hh, mm] =
        timeStr && timeStr.includes(":") ? timeStr.split(":") : ["", ""];

      const isNotRun = log?.result === "NA";
      const isNormal = log?.result === "NORMAL";
      const isAbnormal = log?.result === "ABNORMAL";

      return (
        <>
          {/* คอลัมน์ 2: DS / NS + เวลา */}
          <td
            style={{
              border: "1px solid #000000",
              padding: "1px 4px",
              verticalAlign: "middle",
              fontSize: "8.5px",
              whiteSpace: "nowrap",
            }}
          >
            <span>{shiftLabel}: </span>
            <span
              style={{
                display: "inline-block",
                minWidth: "20px",
                borderBottom: "1px solid #000000",
                textAlign: "center",
                fontWeight: hh ? "bold" : "normal",
                lineHeight: "1.05",
              }}
            >
              {hh || "\u00A0"}
            </span>
            <span>:</span>
            <span
              style={{
                display: "inline-block",
                minWidth: "20px",
                borderBottom: "1px solid #000000",
                textAlign: "center",
                fontWeight: mm ? "bold" : "normal",
                lineHeight: "1.05",
              }}
            >
              {mm || "\u00A0"}
            </span>
          </td>

          {/* คอลัมน์ 3: SET Point */}
          <td
            style={{
              border: "1px solid #000000",
              textAlign: "center",
              verticalAlign: "middle",
              padding: "1px 2px",
              fontSize: "8.5px",
              fontWeight: "bold",
            }}
          >
            {log ? (isNotRun ? "-" : log.set_point || "") : ""}
          </td>

          {/* คอลัมน์ 4: Actual */}
          <td
            style={{
              border: "1px solid #000000",
              textAlign: "center",
              verticalAlign: "middle",
              padding: "1px 2px",
              fontSize: "8.5px",
              fontWeight: "bold",
            }}
          >
            {log ? (isNotRun ? "-" : log.actual || "") : ""}
          </td>

          {/* คอลัมน์ 5: Dew Point (°F) */}
          <td
            style={{
              border: "1px solid #000000",
              textAlign: "center",
              verticalAlign: "middle",
              padding: "1px 2px",
              fontSize: "8.5px",
              fontWeight: "bold",
            }}
          >
            {log ? (isNotRun ? "-" : log.dew_point_val || "") : ""}
          </td>

          {/* คอลัมน์ 6: Machine status */}
          <td
            style={{
              border: "1px solid #000000",
              padding: "1px 5px",
              verticalAlign: "middle",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "4px",
              }}
            >
              {renderStatusCheckbox(!!isNotRun, "Not RUN")}
              {renderStatusCheckbox(!!isNormal, "ปกติ")}
              {renderStatusCheckbox(!!isAbnormal, "ผิดปกติ", true)}
            </div>
          </td>

          {/* คอลัมน์ 7: Checked by -> Name */}
          <td
            style={{
              border: "1px solid #000000",
              textAlign: "center",
              verticalAlign: "middle",
              padding: "1px 3px",
              fontSize: "8px",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {log?.inspector || ""}
          </td>

          {/* คอลัมน์ 8: REMARK */}
          <td
            style={{
              border: "1px solid #000000",
              padding: "1px 4px",
              verticalAlign: "middle",
              fontSize: "8px",
              color: isAbnormal ? "#dc2626" : "#000000",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={log?.problem_detail || ""}
          >
            {log ? (isNotRun ? "-" : log.problem_detail || "") : ""}
          </td>
        </>
      );
    };

    return (
      <div
        className="pdf-page bg-white text-black mx-auto flex flex-col justify-between"
        style={{
          width: "200mm",
          height: "287mm",
          maxHeight: "287mm",
          boxSizing: "border-box",
          padding: "4mm 6mm 4mm 6mm",
          pageBreakAfter: pageNumber === 1 ? "always" : "auto",
          fontFamily: "'Tahoma', 'Leelawadee UI', 'Segoe UI', Arial, sans-serif",
          fontSize: "9px",
          color: "#000000",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ width: "100%", display: "flex", flexDirection: "column", flex: 1 }}>
          {/* ชื่อฟอร์มตรงกลางด้านบน */}
          <div
            style={{
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "15px",
              marginBottom: "4px",
              letterSpacing: "0.3px",
            }}
          >
            Check Sheet for Dryer
          </div>

          {/* ตารางหลัก */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
              fontSize: "9px",
            }}
          >
            <colgroup>
              <col style={{ width: "12%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "8.5%" }} />
              <col style={{ width: "8.5%" }} />
              <col style={{ width: "8.5%" }} />
              <col style={{ width: "24.5%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              {/* แถวหัวที่ 1: Line & Material */}
              <tr style={{ height: "20px" }}>
                <th
                  colSpan={2}
                  style={{
                    border: "none",
                    textAlign: "left",
                    verticalAlign: "bottom",
                    padding: "0 0 4px 2px",
                    fontWeight: "normal",
                    fontSize: "10px",
                  }}
                >
                  <span>Line: </span>
                  <span
                    style={{
                      display: "inline-block",
                      minWidth: "65px",
                      borderBottom: "1px solid #000000",
                      textAlign: "center",
                      fontWeight: "bold",
                      padding: "0 4px",
                    }}
                  >
                    {currentMachine.process || "\u00A0"}
                  </span>
                </th>
                <th
                  colSpan={6}
                  style={{
                    border: "none",
                    textAlign: "left",
                    verticalAlign: "bottom",
                    padding: "0 0 4px 0",
                    fontWeight: "normal",
                    fontSize: "10px",
                  }}
                >
                  <span>Material: </span>
                  <span
                    style={{
                      display: "inline-block",
                      minWidth: "130px",
                      borderBottom: "1px solid #000000",
                      textAlign: "center",
                      fontWeight: "bold",
                      padding: "0 6px",
                    }}
                  >
                    {dpMaterial || "\u00A0"}
                  </span>
                </th>
              </tr>

              {/* แถวหัวที่ 2: Dryer #, Temperature °F, Dew Point, Checked by */}
              <tr style={{ height: "28px" }}>
                <th
                  colSpan={2}
                  style={{
                    borderTop: "none",
                    borderLeft: "none",
                    borderBottom: "none",
                    borderRight: "1px solid #000000",
                    textAlign: "left",
                    verticalAlign: "bottom",
                    padding: "0 0 3px 2px",
                    fontWeight: "normal",
                    fontSize: "10px",
                  }}
                >
                  <span>Dryer #: </span>
                  <span
                    style={{
                      display: "inline-block",
                      minWidth: "90px",
                      borderBottom: "1px solid #000000",
                      textAlign: "center",
                      fontWeight: "bold",
                      padding: "0 4px",
                    }}
                  >
                    {currentMachine.name || "\u00A0"}
                  </span>
                </th>
                <th
                  colSpan={2}
                  style={{
                    border: "1px solid #000000",
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontWeight: "normal",
                    fontSize: "9.5px",
                    lineHeight: "1.2",
                    padding: "2px",
                  }}
                >
                  Temperature
                  <br />° F
                </th>
                <th
                  style={{
                    border: "1px solid #000000",
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontWeight: "normal",
                    fontSize: "9.5px",
                    lineHeight: "1.2",
                    padding: "2px",
                  }}
                >
                  Dew
                  <br />
                  Point
                </th>
                <th
                  style={{
                    borderTop: "none",
                    borderLeft: "1px solid #000000",
                    borderRight: "1px solid #000000",
                    borderBottom: "1px solid #000000",
                  }}
                />
                <th
                  style={{
                    border: "1px solid #000000",
                    textAlign: "center",
                    verticalAlign: "bottom",
                    fontWeight: "normal",
                    fontSize: "9.5px",
                    padding: "2px 2px 3px 2px",
                  }}
                >
                  Checked by
                </th>
                <th
                  style={{
                    borderTop: "none",
                    borderLeft: "1px solid #000000",
                    borderRight: "none",
                    borderBottom: "1px solid #000000",
                  }}
                />
              </tr>

              {/* แถวหัวที่ 3: SET Point, Actual, °F, Machine status, Name, REMARK */}
              <tr style={{ height: "26px" }}>
                <th
                  colSpan={2}
                  style={{
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "1px solid #000000",
                    borderBottom: "1px solid #000000",
                  }}
                />
                <th
                  style={{
                    border: "1px solid #000000",
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontWeight: "normal",
                    fontSize: "8.5px",
                    lineHeight: "1.15",
                    padding: "1px",
                  }}
                >
                  SET
                  <br />
                  Point
                </th>
                <th
                  style={{
                    border: "1px solid #000000",
                    textAlign: "center",
                    verticalAlign: "bottom",
                    fontWeight: "normal",
                    fontSize: "8.5px",
                    padding: "2px 1px 3px 1px",
                  }}
                >
                  Actual
                </th>
                <th
                  style={{
                    border: "1px solid #000000",
                    textAlign: "center",
                    verticalAlign: "bottom",
                    fontWeight: "normal",
                    fontSize: "9px",
                    padding: "2px 1px 3px 1px",
                  }}
                >
                  ° F
                </th>
                <th
                  style={{
                    border: "1px solid #000000",
                    textAlign: "left",
                    verticalAlign: "bottom",
                    fontWeight: "normal",
                    fontSize: "9.5px",
                    padding: "2px 6px 3px 6px",
                  }}
                >
                  Machine status
                </th>
                <th
                  style={{
                    border: "1px solid #000000",
                    textAlign: "center",
                    verticalAlign: "bottom",
                    fontWeight: "normal",
                    fontSize: "9px",
                    padding: "2px 2px 3px 2px",
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    border: "1px solid #000000",
                    textAlign: "center",
                    verticalAlign: "bottom",
                    fontWeight: "normal",
                    fontSize: "9px",
                    padding: "2px 2px 3px 2px",
                  }}
                >
                  REMARK
                </th>
              </tr>
            </thead>

            <tbody>
              {daysList.map((d) => {
                const logD = getDpLog(d, "D", currentMachine.id);
                const logN = getDpLog(d, "N", currentMachine.id);
                const hasAnyDayData = !!(logD || logN);

                return (
                  <React.Fragment key={d}>
                    {/* แถวกะกลางวัน (DS) */}
                    <tr style={{ height: "28px" }}>
                      <td
                        rowSpan={2}
                        style={{
                          border: "1px solid #000000",
                          textAlign: "center",
                          verticalAlign: "middle",
                          padding: "2px 3px",
                          fontSize: "9.5px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>{d} /</span>
                        <span
                          style={{
                            display: "inline-block",
                            minWidth: "18px",
                            borderBottom: "1px solid #000000",
                            textAlign: "center",
                            fontWeight: hasAnyDayData ? "bold" : "normal",
                            lineHeight: "1.05",
                          }}
                        >
                          {hasAnyDayData ? mmStr : "\u00A0"}
                        </span>
                        <span>/</span>
                        <span
                          style={{
                            display: "inline-block",
                            minWidth: "18px",
                            borderBottom: "1px solid #000000",
                            textAlign: "center",
                            fontWeight: hasAnyDayData ? "bold" : "normal",
                            lineHeight: "1.05",
                          }}
                        >
                          {hasAnyDayData ? yyStr : "\u00A0"}
                        </span>
                      </td>
                      {renderShiftCells("D", logD)}
                    </tr>

                    {/* แถวกะกลางคืน (NS) */}
                    <tr style={{ height: "28px" }}>
                      {renderShiftCells("N", logN)}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ส่วนท้ายกระดาษ: Approved by */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            paddingTop: "6px",
            paddingBottom: "2px",
            fontSize: "10px",
            fontWeight: "bold",
            color: "#000000",
            boxSizing: "border-box",
          }}
        >
          {approvals[currentMachine?.id]?.approvedBy ? (
            <span>
              Approved by:{" "}
              <span
                style={{
                  display: "inline-block",
                  minWidth: "140px",
                  borderBottom: "1px solid #000000",
                  textAlign: "center",
                  padding: "0 8px",
                }}
              >
                {approvals[currentMachine.id].approvedBy}
              </span>
            </span>
          ) : (
            <span>Approved by: ....................................................</span>
          )}
        </div>
      </div>
    );
  };


  // เรนเดอร์ 1 หน้า A4 Landscape ตามแบบฟอร์ม EXT-FM-PE-004 Rev.02
  const renderSinglePage = (
    pageNumber: 1 | 2,
    daysList: number[],
    targetMachine: Machine = selectedCurrentMachine
  ) => {
    const currentMachine = targetMachine;
    if (currentMachine?.systemMode === "DEW_POINT") {
      return renderDewPointPage(pageNumber, daysList, currentMachine);
    }
    const checklist = currentMachine.checklist || [];
    const totalMasterRows = Math.max(7, checklist.length);
    const masterRows = Array.from({ length: totalMasterRows }, (_, i) => checklist[i] || null);
    const totalBottomRows = Math.max(7, checklist.length);
    const bottomRows = Array.from({ length: totalBottomRows }, (_, i) => checklist[i] || null);

    // ปรับสเกลความสูงอัตโนมัติเมื่อเครื่องจักรมีหัวข้อตรวจเช็ค / รูปภาพตั้งแต่ 8 รายการขึ้นไป เพื่อไม่ให้ล้นหน้ากระดาษ A4
    const isCompact = totalMasterRows >= 8;
    const extraRows = Math.max(0, totalMasterRows - 7);
    const photoStripHeightMm =
      extraRows === 0 ? 31 : Math.max(20, 29.5 - extraRows * 2.5);
    const masterHeaderHeightPx = isCompact ? 24 : 26;
    const masterRowHeightPx =
      extraRows === 0 ? 26 : Math.max(18, 24.5 - extraRows * 2);
    const bottomHeaderHeightPx = isCompact ? 33 : 36;
    const bottomHeaderTopPx = isCompact ? 17 : 19;
    const bottomHeaderSubPx = isCompact ? 16 : 17;
    const bottomRowHeightPx =
      extraRows === 0 ? 24 : Math.max(17, 23 - extraRows * 1.5);
    const signRowHeightPx =
      extraRows === 0 ? 23 : Math.max(18, 22 - extraRows);
    const cellVertPadPx = extraRows === 0 ? 4 : Math.max(1.5, 3.5 - extraRows);

    const maxCols = 16;
    const emptyDaysCount = Math.max(0, maxCols - daysList.length);

    return (
      <div
        className="pdf-page bg-white text-black mx-auto flex flex-col justify-start"
        style={{
          width: "287mm",
          height: "198mm",
          maxHeight: "198mm",
          boxSizing: "border-box",
          padding: isCompact ? "3.5mm 6mm 2.5mm 6mm" : "5mm 6mm 4mm 6mm",
          pageBreakAfter: pageNumber === 1 ? "always" : "auto",
          fontFamily: "'Tahoma', 'Leelawadee UI', 'Segoe UI', Arial, sans-serif",
          fontSize: isCompact ? "8px" : "8.5px",
          color: "#000000",
          backgroundColor: "#ffffff",
          overflow: "hidden",
        }}
      >
        <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
          {/* ======================================================== */}
          {/* 1. ส่วนหัวฟอร์ม (HEADER) */}
          {/* ======================================================== */}
          <div
            style={{
              display: "flex",
              width: "100%",
              border: "1px solid #000000",
              height: isCompact ? "38px" : "44px",
              boxSizing: "border-box",
            }}
          >
            {/* ซ้าย: ชื่อเครื่องจักร & กระบวนการผลิต (กว้าง 50% เพื่อให้กรอบซ้ายของ Daily Checked Sheet อยู่ตรงกลางกระดาษพอดี) */}
            <div
              style={{
                width: "50%",
                flexShrink: 0,
                borderRight: "1px solid #000000",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid #000000",
                  height: isCompact ? "19px" : "22px",
                  lineHeight: isCompact ? "19px" : "22px",
                }}
              >
                <div
                  style={{
                    width: "100px",
                    backgroundColor: "#f3f4f6",
                    background: "#f3f4f6",
                    padding: "0 6px",
                    fontWeight: "bold",
                    borderRight: "1px solid #000000",
                    fontSize: "9px",
                    flexShrink: 0,
                    boxSizing: "border-box",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  ชื่อเครื่องจักร
                </div>
                <div
                  title={currentMachine.name}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "0 8px",
                    fontWeight: "bold",
                    fontSize: "10px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentMachine.name}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  height: isCompact ? "19px" : "22px",
                  lineHeight: isCompact ? "19px" : "22px",
                }}
              >
                <div
                  style={{
                    width: "100px",
                    backgroundColor: "#f3f4f6",
                    background: "#f3f4f6",
                    padding: "0 6px",
                    fontWeight: "bold",
                    borderRight: "1px solid #000000",
                    fontSize: "9px",
                    flexShrink: 0,
                    boxSizing: "border-box",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  ชื่อกระบวนการผลิต
                </div>
                <div
                  title={currentMachine.process || "-"}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "0 8px",
                    fontWeight: "bold",
                    fontSize: "10px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentMachine.process || "-"}
                </div>
              </div>
            </div>

            {/* กลาง: Daily Checked Sheet / ใบบันทึกการตรวจสอบเครื่องจักรประจำวัน (เริ่มจากตรงกลางกระดาษ 50% พอดี) */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                borderRight: "1px solid #000000",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "2px 8px",
                textAlign: "center",
                boxSizing: "border-box",
                whiteSpace: "nowrap",
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: isCompact ? "12.5px" : "13.5px",
                    fontWeight: "bold",
                    margin: 0,
                    lineHeight: "1.15",
                    letterSpacing: "0.3px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Daily Checked Sheet
                </h1>
                <p
                  style={{
                    fontSize: isCompact ? "9px" : "9.5px",
                    fontWeight: "bold",
                    margin: "1px 0 0 0",
                    lineHeight: "1.15",
                    whiteSpace: "nowrap",
                  }}
                >
                  ใบบันทึกการตรวจสอบเครื่องจักรประจำวัน
                </p>
              </div>
            </div>

            {/* ขวา: ประจำเดือน (ขยายกว้างขึ้น 10% เป็น 27%) */}
            <div
              style={{
                width: "27%",
                flexShrink: 0,
                display: "flex",
                height: isCompact ? "38px" : "44px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: "80px",
                  backgroundColor: "#f3f4f6",
                  background: "#f3f4f6",
                  padding: "0 8px",
                  fontWeight: "bold",
                  fontSize: "9px",
                  borderRight: "1px solid #000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxSizing: "border-box",
                  whiteSpace: "nowrap",
                }}
              >
                ประจำเดือน
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: "12px",
                  letterSpacing: "0.5px",
                  whiteSpace: "nowrap",
                  padding: "0 4px",
                }}
              >
                {monthNameEn} {year}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. แถบรูปภาพ (PHOTOS STRIP) — แสดงสูงสุด 8 รูป ขนาดคงที่เท่ากันทุกเครื่อง ไม่ขยายตามจำนวนรูป */}
          {/* ======================================================== */}
          <div
            style={{
              display: "flex",
              border: "1px solid #000000",
              height: `${photoStripHeightMm}mm`,
              boxSizing: "border-box",
              marginTop: "-1px",
            }}
          >
            <div style={{ flex: 1, display: "flex", overflow: "hidden", height: "100%" }}>
              {(() => {
                const imageItems = checklist.filter((item) => Boolean(item?.image_url)).slice(0, 8);
                return Array.from({ length: 8 }).map((_, idx) => {
                  const item = imageItems[idx];
                  const imgUrl = item?.image_url
                    ? base64Images[item.image_url] || item.image_url
                    : null;
                  return (
                    <div
                      key={idx}
                      style={{
                        width: "calc(100% / 8)",
                        flex: "0 0 calc(100% / 8)",
                        borderRight: idx < 7 ? "1px solid #000000" : "none",
                        padding: isCompact ? "2px" : "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#ffffff",
                        height: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={`Point ${idx + 1}`}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            width: "auto",
                            height: "auto",
                            objectFit: "contain",
                            display: "block",
                          }}
                        />
                      ) : imageItems.length === 0 && idx === 0 ? (
                        <div style={{ color: "#d1d5db", fontSize: "8.5px" }}>ไม่มีรูป</div>
                      ) : null}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. ตารางเกณฑ์มาตรฐาน (MASTER SPEC TABLE) */}
          {/* ======================================================== */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #000000",
              borderTop: "none",
              fontSize: isCompact ? "8px" : "8.5px",
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: "36px" }} />
              <col style={{ width: "23%" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "44px" }} />
              <col style={{ width: "40px" }} />
              <col style={{ width: "40px" }} />
              <col style={{ width: "65px" }} />
              <col style={{ width: "38px" }} />
              <col style={{ width: "38px" }} />
              <col style={{ width: "44px" }} />
            </colgroup>
            <thead>
              <tr
                style={{
                  backgroundColor: "#ffffff",
                  borderBottom: "1px solid #000000",
                  textAlign: "center",
                  fontWeight: "bold",
                  fontSize: "8px",
                  height: `${masterHeaderHeightPx}px`,
                }}
              >
                <th style={{ borderRight: "1px solid #000000", padding: "2px 2px", verticalAlign: "middle" }}>
                  หัวข้อ
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "2px 6px", verticalAlign: "middle" }}>
                  รายละเอียดการตรวจเช็ค
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "2px 6px", verticalAlign: "middle" }}>
                  วิธีการตรวจเช็ค
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "1px 1px", lineHeight: "1.15", verticalAlign: "middle" }}>
                  ชนิด<br />ของน้ำมัน
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "1px 1px", lineHeight: "1.15", verticalAlign: "middle" }}>
                  เครื่อง<br />มือ
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "1px 1px", lineHeight: "1.15", verticalAlign: "middle" }}>
                  ความถี่<br />การเช็ค
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "1px 1px", lineHeight: "1.15", verticalAlign: "middle" }}>
                  เงื่อนไข<br />การตรวจเช็ค
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "2px 1px", verticalAlign: "middle" }}>
                  เวลา
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "1px 1px", lineHeight: "1.15", verticalAlign: "middle" }}>
                  เช็ค<br />ทุกวัน
                </th>
                <th style={{ padding: "1px 1px", lineHeight: "1.15", verticalAlign: "middle" }}>
                  ผู้รับ<br />ผิดชอบ
                </th>
              </tr>
            </thead>
            <tbody>
              {masterRows.map((item, idx) => (
                <tr
                  key={idx}
                  style={{ borderBottom: "1px solid #000000", height: `${masterRowHeightPx}px` }}
                >
                  {/* หัวข้อ: เมิร์จเซลกันทุกแถว (rowSpan) + ข้อความแนวตั้ง (vertical) */}
                  {idx === 0 && (
                    <td
                      rowSpan={totalMasterRows}
                      style={{
                        borderRight: "1px solid #000000",
                        textAlign: "center",
                        padding: "1px",
                        verticalAlign: "middle",
                        backgroundColor: "#ffffff",
                        width: "36px",
                        minWidth: "36px",
                        maxWidth: "36px",
                        boxSizing: "border-box",
                      }}
                    >
                      {verticalTextDataUrl ? (
                        <img
                          src={verticalTextDataUrl}
                          alt="การทำความสะอาดและสภาพแวดล้อม"
                          style={{
                            display: "block",
                            margin: "0 auto",
                            width: "28px",
                            height: isCompact ? "140px" : "165px",
                            maxHeight: "95%",
                            objectFit: "contain",
                            pointerEvents: "none",
                            userSelect: "none",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            writingMode: "vertical-rl",
                            transform: "rotate(180deg)",
                            fontSize: "8.5px",
                            fontWeight: "bold",
                            whiteSpace: "nowrap",
                          }}
                        >
                          การทำความสะอาดและสภาพแวดล้อม
                        </div>
                      )}
                    </td>
                  )}

                  {/* รายละเอียด: ดึงจาก DB จริง */}
                  <td
                    style={{
                      borderRight: "1px solid #000000",
                      padding: `${cellVertPadPx}px 6px`,
                      fontSize: isCompact ? "8px" : "8.5px",
                      lineHeight: isCompact ? "1.15" : "1.3",
                      verticalAlign: "middle",
                      fontWeight: 500,
                    }}
                  >
                    {item?.detail ?? ""}
                  </td>

                  {/* วิธีการ: ดึงจาก DB จริง ไม่มี default */}
                  <td
                    style={{
                      borderRight: "1px solid #000000",
                      padding: `${cellVertPadPx}px 6px`,
                      fontSize: isCompact ? "8px" : "8.5px",
                      lineHeight: isCompact ? "1.15" : "1.3",
                      verticalAlign: "middle",
                    }}
                  >
                    {item?.method ?? ""}
                  </td>

                  <td style={{ borderRight: "1px solid #000000", textAlign: "center", padding: `${cellVertPadPx}px 1px`, verticalAlign: "middle" }}>
                    {item?.oil ?? ""}
                  </td>
                  <td style={{ borderRight: "1px solid #000000", textAlign: "center", padding: `${cellVertPadPx}px 1px`, verticalAlign: "middle" }}>
                    {item?.tool ?? ""}
                  </td>
                  <td style={{ borderRight: "1px solid #000000", textAlign: "center", fontWeight: "bold", padding: `${cellVertPadPx}px 1px`, verticalAlign: "middle" }}>
                    {item?.frequency ?? ""}
                  </td>
                  <td style={{ borderRight: "1px solid #000000", textAlign: "center", padding: `${cellVertPadPx}px 1px`, verticalAlign: "middle" }}>
                    {item?.condition ?? ""}
                  </td>
                  <td style={{ borderRight: "1px solid #000000", textAlign: "center", padding: `${cellVertPadPx}px 1px`, verticalAlign: "middle" }}>
                    {item?.time ?? ""}
                  </td>
                  <td style={{ borderRight: "1px solid #000000", textAlign: "center", padding: `${cellVertPadPx}px 1px`, verticalAlign: "middle" }}>
                    {item?.check_daily ?? ""}
                  </td>
                  <td style={{ textAlign: "center", padding: `${cellVertPadPx}px 1px`, fontWeight: 500, verticalAlign: "middle" }}>
                    {item?.responsible ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ======================================================== */}
          {/* 4. แถบกั้นกลาง (BANNER) */}
          {/* ======================================================== */}
          <div
            style={{
              border: "1px solid #000000",
              borderTop: "none",
              backgroundColor: "#f3f4f6",
              padding: isCompact ? "2px 8px" : "4px 8px",
              textAlign: "left",
              fontWeight: "bold",
              fontSize: isCompact ? "8.5px" : "9px",
              letterSpacing: "0.3px",
            }}
          >
            MAINTENANCE MANUAL ( DAILY , WEEKLY , MONTHLY CHECK LIST )
          </div>

          {/* ======================================================== */}
          {/* 5. ตารางบันทึกผลการตรวจ (BOTTOM MATRIX TABLE) */}
          {/* ======================================================== */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #000000",
              borderTop: "none",
              fontSize: isCompact ? "7.5px" : "8px",
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: "36px" }} />
              <col style={{ width: "23%" }} />
            </colgroup>
            <thead>
              <tr
                style={{
                  backgroundColor: "#ffffff",
                  borderBottom: "1px solid #000000",
                  height: `${bottomHeaderHeightPx}px`,
                }}
              >
                <th
                  style={{
                    borderRight: "1px solid #000000",
                    height: `${bottomHeaderHeightPx}px`,
                    padding: "2px 1px",
                    verticalAlign: "middle",
                    textAlign: "center",
                    fontSize: isCompact ? "8px" : "8.5px",
                    fontWeight: "bold",
                    backgroundColor: "#ffffff",
                    boxSizing: "border-box",
                  }}
                >
                  หัวข้อ
                </th>
                <th
                  style={{
                    borderRight: "1px solid #000000",
                    height: `${bottomHeaderHeightPx}px`,
                    textAlign: "center",
                    padding: "2px 4px",
                    verticalAlign: "middle",
                    fontSize: isCompact ? "8px" : "8.5px",
                    fontWeight: "bold",
                    backgroundColor: "#ffffff",
                    boxSizing: "border-box",
                  }}
                >
                  รายละเอียดการตรวจเช็ค
                </th>
                {daysList.map((d) => (
                  <th
                    key={d}
                    colSpan={2}
                    style={{
                      borderRight: "1px solid #000000",
                      padding: 0,
                      height: `${bottomHeaderHeightPx}px`,
                      verticalAlign: "top",
                      backgroundColor: "#ffffff",
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        height: `${bottomHeaderTopPx}px`,
                        lineHeight: `${bottomHeaderTopPx}px`,
                        textAlign: "center",
                        fontWeight: "bold",
                        fontSize: isCompact ? "8px" : "8.5px",
                        borderBottom: "1px solid #000000",
                        boxSizing: "border-box",
                      }}
                    >
                      {d}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        height: `${bottomHeaderSubPx}px`,
                        fontSize: "7.5px",
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          width: "50%",
                          borderRight: "1px solid #000000",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "normal",
                          boxSizing: "border-box",
                        }}
                      >
                        D
                      </div>
                      <div
                        style={{
                          width: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "normal",
                          boxSizing: "border-box",
                        }}
                      >
                        N
                      </div>
                    </div>
                  </th>
                ))}
                {Array.from({ length: emptyDaysCount }).map((_, i) => (
                  <th
                    key={`emp-day-${i}`}
                    colSpan={2}
                    style={{
                      borderRight: "1px solid #000000",
                      padding: 0,
                      height: `${bottomHeaderHeightPx}px`,
                      verticalAlign: "top",
                      backgroundColor: "#f9fafb",
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        height: `${bottomHeaderTopPx}px`,
                        lineHeight: `${bottomHeaderTopPx}px`,
                        textAlign: "center",
                        color: "#9ca3af",
                        fontWeight: "normal",
                        fontSize: isCompact ? "8px" : "8.5px",
                        borderBottom: "1px solid #000000",
                        boxSizing: "border-box",
                      }}
                    >
                      -
                    </div>
                    <div
                      style={{
                        display: "flex",
                        height: `${bottomHeaderSubPx}px`,
                        fontSize: "7.5px",
                        color: "#9ca3af",
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          width: "50%",
                          borderRight: "1px solid #000000",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "normal",
                          boxSizing: "border-box",
                        }}
                      >
                        D
                      </div>
                      <div
                        style={{
                          width: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "normal",
                          boxSizing: "border-box",
                        }}
                      >
                        N
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* รายการ Checklist ในตารางผลตรวจ */}
              {bottomRows.map((item, idx) => (
                <tr
                  key={idx}
                  style={{ borderBottom: "1px solid #000000", height: `${bottomRowHeightPx}px` }}
                >
                  {/* หัวข้อ: เมิร์จเซลกันทุกแถว (rowSpan) + ข้อความแนวตั้ง (vertical) */}
                  {idx === 0 && (
                    <td
                      rowSpan={totalBottomRows}
                      style={{
                        borderRight: "1px solid #000000",
                        textAlign: "center",
                        padding: "1px",
                        verticalAlign: "middle",
                        backgroundColor: "#ffffff",
                        width: "36px",
                        minWidth: "36px",
                        maxWidth: "36px",
                        boxSizing: "border-box",
                      }}
                    >
                      {verticalTextDataUrl ? (
                        <img
                          src={verticalTextDataUrl}
                          alt="การทำความสะอาดและสภาพแวดล้อม"
                          style={{
                            display: "block",
                            margin: "0 auto",
                            width: "28px",
                            height: isCompact ? "135px" : "155px",
                            maxHeight: "95%",
                            objectFit: "contain",
                            pointerEvents: "none",
                            userSelect: "none",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            writingMode: "vertical-rl",
                            transform: "rotate(180deg)",
                            fontSize: "8px",
                            fontWeight: "bold",
                            whiteSpace: "nowrap",
                          }}
                        >
                          การทำความสะอาดและสภาพแวดล้อม
                        </div>
                      )}
                    </td>
                  )}
                  {/* รายละเอียด: ไม่มีเลขนำหน้า */}
                  <td
                    style={{
                      borderRight: "1px solid #000000",
                      padding: `${cellVertPadPx}px 6px`,
                      fontWeight: 500,
                      fontSize: isCompact ? "7.8px" : "8px",
                      lineHeight: isCompact ? "1.15" : "1.25",
                      verticalAlign: "middle",
                    }}
                  >
                    {item?.detail ?? ""}
                  </td>

                  {daysList.map((d) => {
                    const logD = item
                      ? getLog(d, "D", item.detail, currentMachine.id)
                      : undefined;
                    const logN = item
                      ? getLog(d, "N", item.detail, currentMachine.id)
                      : undefined;
                    return (
                      <React.Fragment key={d}>
                        <td
                          style={{
                            borderRight: "1px solid #000000",
                            textAlign: "center",
                            padding: "1px 0",
                            verticalAlign: "middle",
                            fontWeight: "bold",
                            fontSize: isCompact ? "8px" : "8.5px",
                            color: logD?.result === "ABNORMAL" ? "#dc2626" : "#000000",
                          }}
                        >
                          {renderSymbol(logD)}
                        </td>
                        <td
                          style={{
                            borderRight: "1px solid #000000",
                            textAlign: "center",
                            padding: "1px 0",
                            verticalAlign: "middle",
                            fontWeight: "bold",
                            fontSize: isCompact ? "8px" : "8.5px",
                            color: logN?.result === "ABNORMAL" ? "#dc2626" : "#000000",
                          }}
                        >
                          {renderSymbol(logN)}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {Array.from({ length: emptyDaysCount }).map((_, i) => (
                    <React.Fragment key={`e-val-${i}`}>
                      <td style={{ borderRight: "1px solid #000000", backgroundColor: "#f9fafb" }} />
                      <td style={{ borderRight: "1px solid #000000", backgroundColor: "#f9fafb" }} />
                    </React.Fragment>
                  ))}
                </tr>
              ))}

              {/* แถว: ผู้ลงบันทึก */}
              <tr style={{ borderBottom: "1px solid #000000", height: `${signRowHeightPx}px` }}>
                <td style={{ borderRight: "1px solid #000000", padding: "1px" }} />
                <td
                  style={{
                    borderRight: "1px solid #000000",
                    padding: "2px 6px",
                    fontWeight: "bold",
                    textAlign: "center",
                    fontSize: "8px",
                    verticalAlign: "middle",
                  }}
                >
                  ผู้ลงบันทึก
                </td>
                {daysList.map((d) => {
                  const recD = getInspector(d, "D", currentMachine.id);
                  const recN = getInspector(d, "N", currentMachine.id);
                  return (
                    <React.Fragment key={d}>
                      <td
                        style={{
                          borderRight: "1px solid #000000",
                          textAlign: "center",
                          padding: "1px 0",
                          verticalAlign: "middle",
                          fontSize: "7px",
                          fontWeight: 500,
                        }}
                      >
                        {recD ? recD.substring(0, 4) : ""}
                      </td>
                      <td
                        style={{
                          borderRight: "1px solid #000000",
                          textAlign: "center",
                          padding: "1px 0",
                          verticalAlign: "middle",
                          fontSize: "7px",
                          fontWeight: 500,
                        }}
                      >
                        {recN ? recN.substring(0, 4) : ""}
                      </td>
                    </React.Fragment>
                  );
                })}
                {Array.from({ length: emptyDaysCount }).map((_, i) => (
                  <React.Fragment key={`e-rec-${i}`}>
                    <td style={{ borderRight: "1px solid #000000" }} />
                    <td style={{ borderRight: "1px solid #000000" }} />
                  </React.Fragment>
                ))}
              </tr>

              {/* แถว: ผู้ตรวจสอบความถูกต้อง */}
              <tr style={{ borderBottom: "1px solid #000000", height: `${signRowHeightPx}px` }}>
                <td style={{ borderRight: "1px solid #000000", padding: "1px" }} />
                <td
                  style={{
                    borderRight: "1px solid #000000",
                    padding: "2px 6px",
                    fontWeight: "bold",
                    textAlign: "center",
                    fontSize: "8px",
                    verticalAlign: "middle",
                  }}
                >
                  ผู้ตรวจสอบความถูกต้อง
                </td>
                {daysList.map((d) => {
                  const audD = getAuditor(d, "D", currentMachine.id);
                  const audN = getAuditor(d, "N", currentMachine.id);
                  return (
                    <React.Fragment key={d}>
                      <td
                        style={{
                          borderRight: "1px solid #000000",
                          textAlign: "center",
                          padding: "1px 0",
                          verticalAlign: "middle",
                          fontSize: "7px",
                          fontWeight: 500,
                        }}
                      >
                        {audD ? audD.substring(0, 4) : ""}
                      </td>
                      <td
                        style={{
                          borderRight: "1px solid #000000",
                          textAlign: "center",
                          padding: "1px 0",
                          verticalAlign: "middle",
                          fontSize: "7px",
                          fontWeight: 500,
                        }}
                      >
                        {audN ? audN.substring(0, 4) : ""}
                      </td>
                    </React.Fragment>
                  );
                })}
                {Array.from({ length: emptyDaysCount }).map((_, i) => (
                  <React.Fragment key={`e-aud-${i}`}>
                    <td style={{ borderRight: "1px solid #000000" }} />
                    <td style={{ borderRight: "1px solid #000000" }} />
                  </React.Fragment>
                ))}
              </tr>
            </tbody>
          </table>

          {/* ======================================================== */}
          {/* 6. ส่วนล่างสุด (FOOTER) */}
          {/* ======================================================== */}
          <div
            style={{
              display: "flex",
              width: "100%",
              border: "1px solid #000000",
              borderTop: "none",
              fontSize: isCompact ? "7.5px" : "8px",
              backgroundColor: "#ffffff",
              minHeight: isCompact ? "14mm" : "18mm",
              boxSizing: "border-box",
            }}
          >
            {/* กล่องข้อความซ้าย: คำสั่งการลงบันทึก */}
            <div
              style={{
                width: "42%",
                borderRight: "1px solid #000000",
                padding: isCompact ? "3px 8px" : "6px 8px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                lineHeight: isCompact ? "1.25" : "1.4",
                boxSizing: "border-box",
              }}
            >
              <p style={{ fontWeight: "bold", margin: 0 }}>
                ผู้ลงบันทึก : ลงบันทึกการตรวจสอบเครื่องจักรทุกกะ กะละ 1 ครั้ง พร้อมลงชื่อ
              </p>
              <p style={{ fontWeight: "bold", margin: 0, marginTop: isCompact ? "1.5px" : "3px" }}>
                ผู้ตรวจสอบความถูกต้อง : ตรวจสอบการลงบันทึกของกะเช้าและกะดึก พร้อมลงชื่อ
              </p>
            </div>

            {/* กล่องกลาง: Approved by */}
            <div
              style={{
                width: "29%",
                borderRight: "1px solid #000000",
                padding: isCompact ? "3px 8px" : "6px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: isCompact ? "8px" : "8.5px",
                boxSizing: "border-box",
              }}
            >
              {approvals[currentMachine?.id]?.approvedBy ? (
                <span>Approved by: {approvals[currentMachine.id].approvedBy}</span>
              ) : (
                <span>Approved by....................................</span>
              )}
            </div>

            {/* กล่องขวา: ข้อความที่กรอก (สัญลักษณ์) */}
            <div
              style={{
                width: "29%",
                padding: isCompact ? "3px 8px" : "6px 8px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                lineHeight: isCompact ? "1.2" : "1.35",
                boxSizing: "border-box",
              }}
            >
              <p style={{ fontWeight: "bold", margin: 0 }}>ข้อความที่กรอก ( สัญลักษณ์ )</p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginTop: isCompact ? "1.5px" : "3px",
                  fontSize: isCompact ? "7px" : "7.5px",
                }}
              >
                <span style={{ width: "115px" }}>✓ = สภาพใช้งานได้ดี</span>
                <span style={{ fontWeight: "bold" }}>x = ผิดปกติ</span>
              </div>
              <p style={{ margin: 0, marginTop: isCompact ? "1px" : "2px", fontSize: isCompact ? "7px" : "7.5px" }}>
                - = ไม่มีการใช้งาน
              </p>
            </div>
          </div>
        </div>

        {/* รหัสเอกสารที่มุมซ้ายล่างสุดนอกตาราง */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            paddingTop: isCompact ? "2px" : "5px",
            paddingBottom: isCompact ? "1px" : "2px",
            fontSize: isCompact ? "8px" : "8.5px",
            fontWeight: "bold",
            color: "#111827",
            boxSizing: "border-box",
          }}
        >
          <div>{docControlCode}</div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div className="pdf-modal-backdrop fixed inset-0 bg-black/85 backdrop-blur-sm z-[200] flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
      {/* Top Action Bar */}
      <div className="no-print bg-[#1E293B] border-b border-slate-700 p-3 px-6 flex flex-wrap justify-between items-center gap-3 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/20 text-rose-400 p-2 rounded-lg">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              {isDewPoint
                ? "แบบฟอร์มตรวจสอบค่า Dew Point (Check Sheet for Dryer)"
                : `แบบฟอร์มตรวจสอบเครื่องจักรประจำวัน (${docControlCode})`}
            </h2>
            <p className="text-[11px] text-slate-400">
              {currentMachine.name} • {monthNameEn} {year}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* เลือกดูเครื่อง & ติ๊กเลือกเครื่องที่จะดาวน์โหลดแยกไฟล์ (Custom Dropdown พร้อมแถบสีสถานะการโหลด Real-time) */}
          <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-300 font-bold whitespace-nowrap">
              เลือกเครื่อง:
            </span>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                disabled={isBatchSaving}
                onClick={() => setIsMachineMenuOpen((prev) => !prev)}
                className={`flex items-center justify-between gap-2 text-xs rounded px-2.5 py-1 border font-semibold cursor-pointer min-w-[220px] max-w-[270px] transition-all disabled:opacity-60 ${
                  downloadedMap[currentMachine.id]
                    ? "bg-emerald-700/60 text-white border-emerald-500/80 hover:border-emerald-400"
                    : "bg-slate-900 text-white border-slate-600 hover:border-blue-500"
                }`}
              >
                <span className="truncate">{currentMachine.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedForDownloadIds.size > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      เลือก {selectedForDownloadIds.size}
                    </span>
                  )}
                  <ChevronDown
                    size={14}
                    className={`shrink-0 transition-transform ${
                      isMachineMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {isMachineMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-[310px] max-h-[68vh] flex flex-col bg-[#0F172A] border border-slate-600 rounded-lg shadow-2xl z-[300] overflow-hidden">
                  {/* แถบปุ่มลัดสำหรับติ๊กเลือกเครื่องที่จะโหลด */}
                  <div className="p-2 bg-slate-900/95 border-b border-slate-700 flex items-center justify-between gap-1.5 shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleSelectUndownloadedMachines}
                        className="px-2 py-1 rounded text-[11px] font-bold bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition-colors"
                        title="ติ๊กเลือกเฉพาะเครื่องที่ยังไม่ได้โหลด (ยังไม่เป็นสีเขียว)"
                      >
                        เลือกที่ยังไม่โหลด
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectAllMachines}
                        className="px-2 py-1 rounded text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors"
                      >
                        เลือกทั้งหมด
                      </button>
                      {selectedForDownloadIds.size > 0 && (
                        <button
                          type="button"
                          onClick={handleClearSelectedMachines}
                          className="px-2 py-1 rounded text-[11px] font-bold bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-colors"
                        >
                          ล้าง ({selectedForDownloadIds.size})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* รายการเครื่องจักรจัดกลุ่มและเรียงตามไลน์ (Line) พร้อม Checkbox ให้ติ๊กเลือกได้อิสระ */}
                  <div className="overflow-y-auto py-1 custom-scrollbar flex-1">
                    {groupedByLine.map(({ lineName, items }) => {
                      const allLineChecked =
                        items.length > 0 &&
                        items.every((m) => selectedForDownloadIds.has(m.id));
                      const someLineChecked = items.some((m) =>
                        selectedForDownloadIds.has(m.id)
                      );

                      return (
                        <div key={lineName} className="mb-1 last:mb-0">
                          {/* หัวข้อ Line (สามารถกดติ๊กเพื่อเลือก/ยกเลิกทั้ง Line ได้) */}
                          <div
                            onClick={(e) =>
                              toggleSelectLineForDownload(items, e)
                            }
                            className="sticky top-0 z-10 flex items-center justify-between gap-2 px-2.5 py-1 bg-slate-800/95 border-y border-slate-700/80 text-[11px] font-bold text-blue-300 cursor-pointer hover:bg-slate-800 select-none"
                            title={`คลิกเพื่อเลือก/ยกเลิกเครื่องทั้งหมดในไลน์ ${lineName}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {allLineChecked ? (
                                <CheckSquare
                                  size={14}
                                  className="text-blue-400 shrink-0"
                                />
                              ) : (
                                <Square
                                  size={14}
                                  className={
                                    someLineChecked
                                      ? "text-blue-400/70 shrink-0"
                                      : "text-slate-400 shrink-0"
                                  }
                                />
                              )}
                              <span className="truncate uppercase tracking-wide">
                                {lineName}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                              {items.length} เครื่อง
                            </span>
                          </div>

                          {/* รายชื่อเครื่องจักรใน Line นี้ */}
                          {items.map((m) => {
                            const isSelected = m.id === selectedMachineId;
                            const isDownloaded = !!downloadedMap[m.id];
                            const isCheckedForDl = selectedForDownloadIds.has(
                              m.id
                            );

                            return (
                              <div
                                key={m.id}
                                ref={isSelected ? selectedItemRef : null}
                                onClick={() => {
                                  setSelectedMachineId(m.id);
                                }}
                                className={`flex items-center gap-2.5 pl-4 pr-3 py-1.5 text-xs cursor-pointer transition-colors ${
                                  isSelected
                                    ? isDownloaded
                                      ? "bg-emerald-600 text-white font-bold"
                                      : "bg-blue-600 text-white font-bold"
                                    : isDownloaded
                                    ? "bg-emerald-600/35 hover:bg-emerald-600/50 text-emerald-100 font-semibold border-l-4 border-l-emerald-400"
                                    : "text-slate-200 hover:bg-slate-800"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    toggleSelectMachineForDownload(m.id, e)
                                  }
                                  className="shrink-0 flex items-center justify-center p-0.5 rounded hover:bg-white/10"
                                  title="ติ๊กเลือกเพื่อดาวน์โหลดไฟล์ PDF ของเครื่องนี้"
                                >
                                  {isCheckedForDl ? (
                                    <CheckSquare
                                      size={15}
                                      className={
                                        isSelected
                                          ? "text-white"
                                          : "text-blue-400"
                                      }
                                    />
                                  ) : (
                                    <Square
                                      size={15}
                                      className={
                                        isSelected
                                          ? "text-white/80"
                                          : "text-slate-400"
                                      }
                                    />
                                  )}
                                </button>

                                <span className="truncate flex-1">{m.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {selectedForDownloadIds.size > 0 && (
                    <div className="p-2 bg-slate-900 border-t border-slate-700 shrink-0">
                      <button
                        type="button"
                        onClick={handlePrintToPDF}
                        className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all"
                      >
                        <Printer size={14} />
                        <span>
                          เริ่มบันทึกที่เลือก ({selectedForDownloadIds.size}{" "}
                          เครื่อง • Vector 100%)
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ตัวนับจำนวนที่โหลดแล้วแบบ Real-time */}
            {(() => {
              const dlCount = machines.filter((m) => !!downloadedMap[m.id]).length;
              return (
                <div className="flex items-center gap-1">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                      dlCount > 0
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-slate-900 text-slate-400 border-slate-700"
                    }`}
                    title="จำนวนเครื่องที่กดพิมพ์/บันทึก PDF แล้วในเดือนนี้ (ซิงค์ข้อมูลร่วมกันทุกเครื่องแบบ Real-time)"
                  >
                    ✓ {dlCount}/{machines.length}
                  </span>

                  {dlCount < machines.length && (
                    <button
                      type="button"
                      onClick={handleJumpNextUndownloaded}
                      className="p-1 rounded bg-slate-700 hover:bg-blue-600 text-slate-200 hover:text-white transition-colors"
                      title="ข้ามไปเครื่องถัดไปที่ยังไม่ได้โหลด"
                    >
                      <SkipForward size={13} />
                    </button>
                  )}

                  {dlCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetAllDownloads}
                      className="p-1 rounded bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                      title="ล้างสถานะการดาวน์โหลดทั้งหมดของเดือนนี้"
                    >
                      <RotateCcw size={13} />
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* สลับดูหน้า Preview */}
          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setActivePreviewPage(1)}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${activePreviewPage === 1
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white"
                }`}
            >
              แผ่นที่ 1 (วันที่ 1-16)
            </button>
            <button
              onClick={() => setActivePreviewPage(2)}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${activePreviewPage === 2
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white"
                }`}
            >
              แผ่นที่ 2 (วันที่ 17-{isDewPoint ? 31 : daysInMonth})
            </button>
          </div>

          {/* ตัวเลือก: เปิดหน้าเซฟเครื่องถัดไปอัตโนมัติทันทีที่เซฟเสร็จ */}
          <button
            type="button"
            onClick={() => setAutoOpenNextPrint((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
              autoOpenNextPrint
                ? "bg-blue-600/20 text-blue-200 border-blue-500/50 hover:bg-blue-600/30"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
            title="เมื่อเปิดไว้: พอคุณกด Save ไฟล์แรกเสร็จ หน้าต่าง Print ของเครื่องต่อไปจะเด้งขึ้นมาให้กด Save ต่อทันที"
          >
            {autoOpenNextPrint ? (
              <CheckSquare size={14} className="text-blue-400" />
            ) : (
              <Square size={14} className="text-slate-500" />
            )}
            <span>เด้งหน้าเซฟเครื่องต่อไปอัตโนมัติ</span>
          </button>

          {/* ปุ่มหลัก: บันทึกเป็น PDF ผ่านระบบ Print เบราว์เซอร์ (Vector แท้ 100% ตรงตามพรีวิว) */}
          <button
            onClick={handlePrintToPDF}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all"
            title="เปิดหน้าต่างบันทึก PDF ของเบราว์เซอร์ ได้ไฟล์คมชัด 100% เวกเตอร์แท้ (พอเซฟเสร็จระบบจะเด้งหน้าเซฟของเครื่องต่อไปรอให้ทันที)"
          >
            <Printer size={16} />
            <span>
              {selectedForDownloadIds.size > 0
                ? `พิมพ์ / บันทึกที่เลือก (เหลือ ${selectedForDownloadIds.size} เครื่อง)`
                : "พิมพ์ / บันทึก PDF (100% ตรงพรีวิว)"}
            </span>
          </button>

          {/* ปุ่มปิด */}
          <button
            onClick={() => {
              stopAutoPrintChain();
              onClose();
            }}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors ml-1"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* แถบสถานะเมื่อติ๊กเลือกเครื่องที่จะโหลด หรือกำลังจะเด้งหน้าเซฟเครื่องถัดไป หรือแจ้งเตือนเมื่อโหลดครบ */}
      {(pendingNextPrintMachine ||
        selectedForDownloadIds.size > 0 ||
        batchDoneMessage) && (
        <div
          className={`no-print px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-bold border-b shrink-0 ${
            batchDoneMessage
              ? "bg-emerald-900/90 text-emerald-100 border-emerald-500/40"
              : pendingNextPrintMachine
              ? "bg-amber-900/90 text-amber-100 border-amber-500/40"
              : "bg-blue-950/90 text-blue-100 border-blue-500/40"
          }`}
        >
          {batchDoneMessage ? (
            <div className="flex items-center gap-2">
              <span>{batchDoneMessage}</span>
            </div>
          ) : pendingNextPrintMachine ? (
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span>
                  กำลังเปิดหน้าเซฟ (Print) ของเครื่องถัดไปอัตโนมัติ:{" "}
                  <strong className="text-white">
                    {pendingNextPrintMachine.name}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={stopAutoPrintChain}
                className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded font-bold flex items-center gap-1 shadow"
              >
                <X size={13} />
                <span>หยุดเปิดเครื่องถัดไป (Esc)</span>
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[11px]">
                  เลือกไว้เหลืออีก {selectedForDownloadIds.size} เครื่อง
                </span>
                <span>
                  กำลังพรีวิวรอเซฟ:{" "}
                  <strong className="text-white">
                    {currentMachine.process
                      ? `[${currentMachine.process}] `
                      : ""}
                    {currentMachine.name}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintToPDF}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded font-bold flex items-center gap-1 shadow"
                >
                  <Printer size={13} />
                  <span>บันทึกเครื่องนี้ (เซฟเสร็จเด้งหน้าเซฟเครื่องต่อไปทันที)</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearSelectedMachines}
                  className="bg-slate-700 hover:bg-rose-600 text-slate-200 hover:text-white px-2.5 py-1 rounded font-semibold flex items-center gap-1 transition-colors"
                >
                  <X size={13} />
                  <span>ล้างที่เลือก</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Preview Area */}
      <div className="no-print flex-1 overflow-auto p-4 flex justify-center items-start bg-slate-950/80">
        <div className="scale-90 md:scale-95 origin-top transition-transform shadow-2xl">
          {activePreviewPage === 1
            ? renderSinglePage(1, daysPage1)
            : renderSinglePage(2, daysPage2)}
        </div>
      </div>

      {/* Printable Area & Off-screen Capture Container */}
      <div
        id="pdf-print-area"
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: isDewPoint ? "200mm" : "287mm",
          zIndex: -100,
          pointerEvents: "none",
          backgroundColor: "#ffffff",
        }}
      >
        {(printMode === "all" || printMode === 1) && (
          <div
            id="pdf-capture-page-1"
            className={`pdf-print-page-wrapper ${
              printMode === "all" ? "print-page-break" : ""
            }`}
            style={{
              width: isDewPoint ? "200mm" : "287mm",
              backgroundColor: "#ffffff",
              boxSizing: "border-box",
            }}
          >
            {renderSinglePage(1, daysPage1)}
          </div>
        )}
        {(printMode === "all" || printMode === 2) && (
          <div
            id="pdf-capture-page-2"
            className="pdf-print-page-wrapper"
            style={{
              width: isDewPoint ? "200mm" : "287mm",
              backgroundColor: "#ffffff",
              boxSizing: "border-box",
              marginTop: printMode === "all" ? "20px" : "0px",
            }}
          >
            {renderSinglePage(2, daysPage2)}
          </div>
        )}
      </div>

      {/* Print CSS Styles for Native Print to PDF (100% Vector Quality) */}
      <style>{`
        @media print {
          @page {
            size: ${isDewPoint ? "A4 portrait" : "A4 landscape"};
            margin: 0mm;
          }

          html, body {
            width: ${isDewPoint ? "210mm" : "297mm"} !important;
            height: ${isDewPoint ? "297mm" : "210mm"} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Hide all non-printable UI elements and underlying web app */
          #root,
          body > *:not(.pdf-modal-backdrop),
          .no-print,
          .no-print * {
            display: none !important;
          }

          /* Reset modal backdrop for printing */
          .pdf-modal-backdrop {
            position: static !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
            z-index: auto !important;
          }

          /* Printable document area */
          #pdf-print-area {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            left: 0 !important;
            top: 0 !important;
            width: ${isDewPoint ? "210mm" : "297mm"} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            z-index: auto !important;
          }

          .pdf-print-page-wrapper,
          #pdf-capture-page-1,
          #pdf-capture-page-2 {
            display: flex !important;
            visibility: visible !important;
            width: ${isDewPoint ? "210mm" : "297mm"} !important;
            height: ${isDewPoint ? "297mm" : "210mm"} !important;
            max-height: ${isDewPoint ? "297mm" : "210mm"} !important;
            box-sizing: border-box !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .print-page-break {
            page-break-after: always !important;
            break-after: page !important;
          }

          .pdf-page {
            box-shadow: none !important;
            width: ${isDewPoint ? "200mm" : "287mm"} !important;
            height: ${isDewPoint ? "287mm" : "198mm"} !important;
            max-height: ${isDewPoint ? "287mm" : "198mm"} !important;
            margin: 0 auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}

export default DailyCheckPDFExportModal;



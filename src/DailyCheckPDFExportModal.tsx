import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, FileText, Printer } from "lucide-react";
import { db } from "./firebase";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";

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
}: DailyCheckPDFExportModalProps) {
  const [selectedMachineId, setSelectedMachineId] = useState<string>(
    initialMachineId && initialMachineId !== "All"
      ? initialMachineId
      : machines[0]?.id || ""
  );

  const [activePreviewPage, setActivePreviewPage] = useState<1 | 2>(1);
  const [base64Images, setBase64Images] = useState<Record<string, string>>({});
  const [printMode, setPrintMode] = useState<"all" | 1 | 2>("all");

  // 🖨️ สั่งพิมพ์ / บันทึก PDF ด้วยระบบของเบราว์เซอร์ (Vector แท้ ตรงตามพรีวิว 100%)
  const handlePrintToPDF = () => {
    setPrintMode("all");
    const originalTitle = document.title;
    const safeMachineName = (currentMachine?.name || "Machine").replace(/[/\\?%*:|"<>]/g, "_");
    document.title = `${safeMachineName}_${monthNameEn}_${year}`;
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 150);
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
    if (!currentMachine) return;
    let isCancelled = false;

    const convertImages = async () => {
      const map: Record<string, string> = {};
      const items = currentMachine.checklist || [];

      for (const item of items) {
        if (item.image_url && !map[item.image_url]) {
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
          } catch (e) {
            map[item.image_url] = item.image_url;
          }
        }
      }

      if (!isCancelled) {
        setBase64Images(map);
      }
    };

    convertImages();
    return () => {
      isCancelled = true;
    };
  }, [currentMachine]);

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

  // สร้าง Map สำหรับ O(1) Lookup ข้อมูล เพิ่มความลื่นไหลในการเรนเดอร์ พรีวิวได้ทันทีไม่กระตุก
  const { logMap, dpLogMap, inspectorMap, auditMap } = useMemo(() => {
    const lMap = new Map<string, LogEntry>();
    const dpMap = new Map<string, LogEntry>();
    const iMap = new Map<string, string>();
    const aMap = new Map<string, string>();

    if (currentMachine) {
      for (const l of logs) {
        if (l.mid === currentMachine.id) {
          lMap.set(`${l.date}_${l.shift}_${l.checklist_item}`, l);
          if (!dpMap.has(`${l.date}_${l.shift}`) || hasDpData(l)) {
            dpMap.set(`${l.date}_${l.shift}`, l);
          }
          if (l.inspector && !iMap.has(`${l.date}_${l.shift}`)) {
            iMap.set(`${l.date}_${l.shift}`, l.inspector);
          }
        }
      }
      for (const a of auditLogs) {
        if (a.mid === currentMachine.id && a.year === year && a.month === month) {
          aMap.set(`${a.day}_${a.shift}`, a.auditor || "");
        }
      }
    }

    return { logMap: lMap, dpLogMap: dpMap, inspectorMap: iMap, auditMap: aMap };
  }, [logs, auditLogs, currentMachine?.id, year, month]);

  const getLog = (d: number, shift: string, itemDetail: string) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    return logMap.get(`${dateStr}_${shift}_${itemDetail}`);
  };

  const getDpLog = (d: number, shift: string) => {
    if (d > daysInMonth) return undefined;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    const found = dpLogMap.get(`${dateStr}_${shift}`);
    return found && hasDpData(found) ? found : undefined;
  };

  const getInspector = (d: number, shift: string) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    return inspectorMap.get(`${dateStr}_${shift}`) || "";
  };

  const getAuditor = (d: number, shift: string) => {
    return auditMap.get(`${d}_${shift}`) || "";
  };

  const renderSymbol = (log?: LogEntry) => {
    if (!log) return "";
    if (log.result === "NORMAL") return "✓";
    if (log.result === "ABNORMAL") return "x";
    if (log.result === "NA") return "-";
    if (log.result === "FILTER") return "△";
  };

  // เรนเดอร์ 1 หน้า A4 Portrait สำหรับโหมด Dew Point (Check Sheet for Dryer)
  const renderDewPointPage = (pageNumber: 1 | 2, daysList: number[]) => {
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
                const logD = getDpLog(d, "D");
                const logN = getDpLog(d, "N");
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
  const renderSinglePage = (pageNumber: 1 | 2, daysList: number[]) => {
    if (isDewPoint) {
      return renderDewPointPage(pageNumber, daysList);
    }
    const checklist = currentMachine.checklist || [];
    const totalMasterRows = Math.max(7, checklist.length);
    const masterRows = Array.from({ length: totalMasterRows }, (_, i) => checklist[i] || null);
    const totalBottomRows = Math.max(7, checklist.length);
    const bottomRows = Array.from({ length: totalBottomRows }, (_, i) => checklist[i] || null);

    const maxCols = 16;
    const emptyDaysCount = Math.max(0, maxCols - daysList.length);

    return (
      <div
        className="pdf-page bg-white text-black mx-auto flex flex-col justify-between"
        style={{
          width: "287mm",
          height: "198mm",
          maxHeight: "198mm",
          boxSizing: "border-box",
          padding: "5mm 6mm 4mm 6mm",
          pageBreakAfter: pageNumber === 1 ? "always" : "auto",
          fontFamily: "'Tahoma', 'Leelawadee UI', 'Segoe UI', Arial, sans-serif",
          fontSize: "8.5px",
          color: "#000000",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ width: "100%", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          {/* ======================================================== */}
          {/* 1. ส่วนหัวฟอร์ม (HEADER) */}
          {/* ======================================================== */}
          <div
            style={{
              display: "flex",
              width: "100%",
              border: "1px solid #000000",
              height: "44px",
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
                  height: "22px",
                  lineHeight: "22px",
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
                  height: "22px",
                  lineHeight: "22px",
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
                    fontSize: "13.5px",
                    fontWeight: "bold",
                    margin: 0,
                    lineHeight: "1.2",
                    letterSpacing: "0.3px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Daily Checked Sheet
                </h1>
                <p
                  style={{
                    fontSize: "9.5px",
                    fontWeight: "bold",
                    margin: "2px 0 0 0",
                    lineHeight: "1.2",
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
                height: "44px",
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
          {/* 2. แถบรูปภาพ (PHOTOS STRIP) — แสดงรูปจริง ไม่ยืด อัตราส่วนสมบูรณ์ และมีกรอบครบ 4 ด้าน */}
          {/* ======================================================== */}
          <div
            style={{
              display: "flex",
              border: "1px solid #000000",
              height: "31mm",
              boxSizing: "border-box",
              marginTop: "-1px",
            }}
          >
            <div style={{ flex: 1, display: "flex", overflow: "hidden", height: "100%" }}>
              {Array.from({ length: 4 }).map((_, idx) => {
                const item = checklist[idx];
                const imgUrl = item?.image_url
                  ? base64Images[item.image_url] || item.image_url
                  : null;
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      borderRight: idx < 3 ? "1px solid #000000" : "none",
                      padding: "4px",
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
                    ) : (
                      <div style={{ color: "#d1d5db", fontSize: "8.5px" }}>ไม่มีรูป</div>
                    )}
                  </div>
                );
              })}
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
              fontSize: "8.5px",
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
                  height: "26px",
                }}
              >
                <th style={{ borderRight: "1px solid #000000", padding: "4px 2px", verticalAlign: "middle" }}>
                  หัวข้อ
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "4px 6px", verticalAlign: "middle" }}>
                  รายละเอียดการตรวจเช็ค
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "4px 6px", verticalAlign: "middle" }}>
                  วิธีการตรวจเช็ค
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "3px 1px", lineHeight: "1.2", verticalAlign: "middle" }}>
                  ชนิด<br />ของน้ำมัน
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "3px 1px", lineHeight: "1.2", verticalAlign: "middle" }}>
                  เครื่อง<br />มือ
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "3px 1px", lineHeight: "1.2", verticalAlign: "middle" }}>
                  ความถี่<br />การเช็ค
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "3px 1px", lineHeight: "1.2", verticalAlign: "middle" }}>
                  เงื่อนไข<br />การตรวจเช็ค
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "4px 1px", verticalAlign: "middle" }}>
                  เวลา
                </th>
                <th style={{ borderRight: "1px solid #000000", padding: "3px 1px", lineHeight: "1.2", verticalAlign: "middle" }}>
                  เช็ค<br />ทุกวัน
                </th>
                <th style={{ padding: "3px 1px", lineHeight: "1.2", verticalAlign: "middle" }}>
                  ผู้รับ<br />ผิดชอบ
                </th>
              </tr>
            </thead>
            <tbody>
              {masterRows.map((item, idx) => (
                <tr
                  key={idx}
                  style={{ borderBottom: "1px solid #000000", height: "26px" }}
                >
                  {/* หัวข้อ: เมิร์จเซลกันทุกแถว (rowSpan) + ข้อความแนวตั้ง (vertical) */}
                  {idx === 0 && (
                    <td
                      rowSpan={totalMasterRows}
                      style={{
                        borderRight: "1px solid #000000",
                        textAlign: "center",
                        padding: "2px 1px",
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
                            height: "165px",
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
                      padding: "5px 6px",
                      fontSize: "8.5px",
                      lineHeight: "1.3",
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
                      padding: "5px 6px",
                      fontSize: "8.5px",
                      lineHeight: "1.3",
                      verticalAlign: "middle",
                    }}
                  >
                    {item?.method ?? ""}
                  </td>

                  <td style={{ borderRight: "1px solid #000000", textAlign: "center", padding: "4px 1px", verticalAlign: "middle" }}>
                    {item?.oil ?? ""}
                  </td>
                  <td style={{ borderRight: "1px solid #000000", textAlign: "center", padding: "4px 1px", verticalAlign: "middle" }}>
                    {item?.tool ?? ""}
                  </td>
                  <td style={{ borderRight: "1px solid #000000", textAlign: "center", fontWeight: "bold", padding: "4px 1px", verticalAlign: "middle" }}>
                    {item?.frequency ?? ""}
                  </td>
                  <td style={{ borderRight: "1px solid #000000", textAlign: "center", padding: "4px 1px", verticalAlign: "middle" }}>
                    {item?.condition ?? ""}
                  </td>
                  <td style={{ borderRight: "1px solid #000000", textAlign: "center", padding: "4px 1px", verticalAlign: "middle" }}>
                    {item?.time ?? ""}
                  </td>
                  <td style={{ borderRight: "1px solid #000000", textAlign: "center", padding: "4px 1px", verticalAlign: "middle" }}>
                    {item?.check_daily ?? ""}
                  </td>
                  <td style={{ textAlign: "center", padding: "4px 1px", fontWeight: 500, verticalAlign: "middle" }}>
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
              padding: "4px 8px",
              textAlign: "left",
              fontWeight: "bold",
              fontSize: "9px",
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
              fontSize: "8px",
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
                  height: "36px",
                }}
              >
                <th
                  style={{
                    borderRight: "1px solid #000000",
                    height: "36px",
                    padding: "2px 1px",
                    verticalAlign: "middle",
                    textAlign: "center",
                    fontSize: "8.5px",
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
                    height: "36px",
                    textAlign: "center",
                    padding: "2px 4px",
                    verticalAlign: "middle",
                    fontSize: "8.5px",
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
                      height: "36px",
                      verticalAlign: "top",
                      backgroundColor: "#ffffff",
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        height: "19px",
                        lineHeight: "19px",
                        textAlign: "center",
                        fontWeight: "bold",
                        fontSize: "8.5px",
                        borderBottom: "1px solid #000000",
                        boxSizing: "border-box",
                      }}
                    >
                      {d}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        height: "17px",
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
                      height: "36px",
                      verticalAlign: "top",
                      backgroundColor: "#f9fafb",
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        height: "19px",
                        lineHeight: "19px",
                        textAlign: "center",
                        color: "#9ca3af",
                        fontWeight: "normal",
                        fontSize: "8.5px",
                        borderBottom: "1px solid #000000",
                        boxSizing: "border-box",
                      }}
                    >
                      -
                    </div>
                    <div
                      style={{
                        display: "flex",
                        height: "17px",
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
                  style={{ borderBottom: "1px solid #000000", height: "24px" }}
                >
                  {/* หัวข้อ: เมิร์จเซลกันทุกแถว (rowSpan) + ข้อความแนวตั้ง (vertical) */}
                  {idx === 0 && (
                    <td
                      rowSpan={totalBottomRows}
                      style={{
                        borderRight: "1px solid #000000",
                        textAlign: "center",
                        padding: "2px 1px",
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
                            height: "155px",
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
                      padding: "4px 6px",
                      fontWeight: 500,
                      fontSize: "8px",
                      lineHeight: "1.25",
                      verticalAlign: "middle",
                    }}
                  >
                    {item?.detail ?? ""}
                  </td>

                  {daysList.map((d) => {
                    const logD = item ? getLog(d, "D", item.detail) : undefined;
                    const logN = item ? getLog(d, "N", item.detail) : undefined;
                    return (
                      <React.Fragment key={d}>
                        <td
                          style={{
                            borderRight: "1px solid #000000",
                            textAlign: "center",
                            padding: "2px 0",
                            verticalAlign: "middle",
                            fontWeight: "bold",
                            fontSize: "8.5px",
                            color: logD?.result === "ABNORMAL" ? "#dc2626" : "#000000",
                          }}
                        >
                          {renderSymbol(logD)}
                        </td>
                        <td
                          style={{
                            borderRight: "1px solid #000000",
                            textAlign: "center",
                            padding: "2px 0",
                            verticalAlign: "middle",
                            fontWeight: "bold",
                            fontSize: "8.5px",
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
              <tr style={{ borderBottom: "1px solid #000000", height: "23px" }}>
                <td style={{ borderRight: "1px solid #000000", padding: "2px" }} />
                <td
                  style={{
                    borderRight: "1px solid #000000",
                    padding: "3px 6px",
                    fontWeight: "bold",
                    textAlign: "center",
                    fontSize: "8px",
                    verticalAlign: "middle",
                  }}
                >
                  ผู้ลงบันทึก
                </td>
                {daysList.map((d) => {
                  const recD = getInspector(d, "D");
                  const recN = getInspector(d, "N");
                  return (
                    <React.Fragment key={d}>
                      <td
                        style={{
                          borderRight: "1px solid #000000",
                          textAlign: "center",
                          padding: "2px 0",
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
                          padding: "2px 0",
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
              <tr style={{ borderBottom: "1px solid #000000", height: "23px" }}>
                <td style={{ borderRight: "1px solid #000000", padding: "2px" }} />
                <td
                  style={{
                    borderRight: "1px solid #000000",
                    padding: "3px 6px",
                    fontWeight: "bold",
                    textAlign: "center",
                    fontSize: "8px",
                    verticalAlign: "middle",
                  }}
                >
                  ผู้ตรวจสอบความถูกต้อง
                </td>
                {daysList.map((d) => {
                  const audD = getAuditor(d, "D");
                  const audN = getAuditor(d, "N");
                  return (
                    <React.Fragment key={d}>
                      <td
                        style={{
                          borderRight: "1px solid #000000",
                          textAlign: "center",
                          padding: "2px 0",
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
                          padding: "2px 0",
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
              fontSize: "8px",
              backgroundColor: "#ffffff",
              minHeight: "18mm",
              boxSizing: "border-box",
            }}
          >
            {/* กล่องข้อความซ้าย: คำสั่งการลงบันทึก */}
            <div
              style={{
                width: "42%",
                borderRight: "1px solid #000000",
                padding: "6px 8px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                lineHeight: "1.4",
                boxSizing: "border-box",
              }}
            >
              <p style={{ fontWeight: "bold", margin: 0 }}>
                ผู้ลงบันทึก : ลงบันทึกการตรวจสอบเครื่องจักรทุกกะ กะละ 1 ครั้ง พร้อมลงชื่อ
              </p>
              <p style={{ fontWeight: "bold", margin: 0, marginTop: "3px" }}>
                ผู้ตรวจสอบความถูกต้อง : ตรวจสอบการลงบันทึกของกะเช้าและกะดึก พร้อมลงชื่อ
              </p>
            </div>

            {/* กล่องกลาง: Approved by */}
            <div
              style={{
                width: "29%",
                borderRight: "1px solid #000000",
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "8.5px",
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
                padding: "6px 8px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                lineHeight: "1.35",
                boxSizing: "border-box",
              }}
            >
              <p style={{ fontWeight: "bold", margin: 0 }}>ข้อความที่กรอก ( สัญลักษณ์ )</p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginTop: "3px",
                  fontSize: "7.5px",
                }}
              >
                <span style={{ width: "115px" }}>✓ = สภาพใช้งานได้ดี</span>
                <span style={{ fontWeight: "bold" }}>x = ผิดปกติ</span>
              </div>
              <p style={{ margin: 0, marginTop: "2px", fontSize: "7.5px" }}>- = ไม่มีการใช้งาน</p>
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
            paddingTop: "5px",
            paddingBottom: "2px",
            fontSize: "8.5px",
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
          {/* เลือกดูเครื่อง */}
          <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-300 font-bold whitespace-nowrap">เลือกเครื่อง:</span>
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="bg-slate-900 text-white text-xs rounded px-2.5 py-1 border border-slate-600 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer max-w-[200px]"
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
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

          {/* ปุ่มหลัก: บันทึกเป็น PDF ผ่านระบบ Print เบราว์เซอร์ (ตรงตามพรีวิว 100%) */}
          <button
            onClick={() => handlePrintToPDF()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all"
            title="เปิดหน้าต่างบันทึก PDF ของเบราว์เซอร์ ได้ไฟล์คมชัด 100% เวกเตอร์แท้ ตรงตามแบบฟอร์ม"
          >
            <Printer size={16} />
            <span>พิมพ์ / บันทึก PDF (100% ตรงพรีวิว)</span>
          </button>

          {/* ปุ่มปิด */}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors ml-1"
          >
            <X size={20} />
          </button>
        </div>
      </div>

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
            className={printMode === "all" ? "print-page-break" : ""}
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



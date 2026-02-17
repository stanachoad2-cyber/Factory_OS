import React, { useEffect, useMemo } from "react";

interface MonthlySummaryReportProps {
  machine: any;
  month: string;
  year: number;
  onClose?: () => void;
  masterList?: any[];
  allLogs?: any[];
  isAutoPrint?: boolean;
  isBatchMode?: boolean;
}

const MonthlySummaryReport: React.FC<MonthlySummaryReportProps> = ({
  machine,
  month,
  year,
  masterList = [],
  allLogs = [],
  onClose,
  isAutoPrint = false,
  isBatchMode = false,
}) => {
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
  const monthInt = parseInt(month) || 1;
  const monthName = THAI_MONTHS[monthInt - 1] || month;

  const checklistImages = (machine?.checklist || []).map(
    (item: any) => item.image_url || null
  );

  const formattedList = (
    masterList.length > 0 ? masterList : machine?.checklist || []
  ).map((item: any) => {
    if (typeof item === "string") {
      return {
        detail: item,
        method: "-",
        oil: "-",
        tool: "ตาดู",
        condition: "D",
        time: "2 นาที",
        freq: "ทุกวัน",
        resp: "Prod",
      };
    }
    return item;
  });

  const summaryStats = useMemo(() => {
    return formattedList.map((item: any) => {
      const itemLogs = allLogs.filter(
        (l: any) => l.mid === machine.id && l.checklist_item === item.detail
      );
      const total = itemLogs.length;
      const normal = itemLogs.filter((l: any) => l.result === "NORMAL").length;
      const abnormal = itemLogs.filter(
        (l: any) => l.result === "ABNORMAL"
      ).length;
      const na = itemLogs.filter(
        (l: any) => l.result === "NA" || l.result === "N/A"
      ).length;
      const filter = itemLogs.filter((l: any) => l.result === "FILTER").length;
      return { detail: item.detail, total, normal, abnormal, na, filter };
    });
  }, [formattedList, allLogs, machine.id]);

  // ✅ ฟังชั่นพิมพ์และตั้งชื่อไฟล์: ชื่อเครื่อง_YYMM
  const handlePrint = () => {
    const yy = year.toString().slice(-2);
    const mm = String(monthInt).padStart(2, "0");
    const machineName = machine?.name || "Machine";
    const originalTitle = document.title;

    document.title = `${machineName}_${yy}${mm}`;
    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  useEffect(() => {
    if (isAutoPrint && !isBatchMode) {
      handlePrint();
    }
  }, [isAutoPrint, isBatchMode]);

  const wrapperClass = isBatchMode
    ? "w-full h-auto bg-white p-0 print:break-after-page mb-8 block text-black"
    : "fixed inset-0 bg-black bg-opacity-80 flex items-start justify-center z-[9999] overflow-y-auto p-4 print:p-0 print:block print:bg-white text-black";

  return (
    <div className={wrapperClass}>
      {!isBatchMode && (
        <div className="fixed top-6 right-6 flex items-center gap-3 print:hidden z-[10000]">
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2"
          >
            <span>🖨️</span> พิมพ์ / โหลด PDF
          </button>
          <button
            onClick={onClose}
            className="bg-white hover:bg-red-500 hover:text-white text-gray-700 w-10 h-10 rounded-lg flex items-center justify-center transition-colors font-bold text-xl shadow-lg border border-gray-300"
          >
            ✕
          </button>
        </div>
      )}

      <div
        className={
          isBatchMode
            ? "w-full"
            : "bg-white w-full max-w-[285mm] h-auto min-h-[95vh] p-8 shadow-xl print:w-full print:p-0 print:shadow-none mx-auto relative mt-10 print:mt-0"
        }
      >
        <div
          className="bg-white text-black relative mx-auto flex flex-col box-border border border-black print:border-black print:page-container"
          style={{ width: "100%", maxWidth: "280mm", margin: "0 auto" }}
        >
          {/* ส่วนเนื้อหาใบรายงาน (เหมือนเดิม) */}
          <div className="flex border-b border-black h-[24mm] shrink-0">
            <div className="w-[45%] flex flex-col border-r border-black">
              <div className="h-1/2 flex border-b border-black">
                <div className="w-[30%] bg-gray-100 flex items-center pl-3 text-xs font-bold border-r border-black text-black">
                  ชื่อเครื่องจักร
                </div>
                <div className="w-[70%] flex items-center justify-center text-sm font-bold">
                  {machine?.name || "-"}
                </div>
              </div>
              <div className="h-1/2 flex">
                <div className="w-[30%] bg-gray-100 flex items-center pl-3 text-xs font-bold border-r border-black text-black">
                  กระบวนการ
                </div>
                <div className="w-[70%] flex items-center justify-center text-sm font-bold">
                  {machine?.process || "-"}
                </div>
              </div>
            </div>
            <div className="w-[55%] flex">
              <div className="flex-1 flex items-center justify-center bg-gray-50 border-r border-black text-black">
                <h1 className="text-xl font-bold text-center leading-tight">
                  Daily Checked Sheet <br />
                  <span className="text-xs font-normal">
                    (ใบบันทึกการตรวจสอบเครื่องจักรประจำวัน)
                  </span>
                </h1>
              </div>
              <div className="w-28 flex flex-col h-full text-black text-xs text-center">
                <div className="h-1/2 border-b border-black flex items-center justify-center bg-gray-100 font-bold">
                  เดือน / ปี
                </div>
                <div className="h-1/2 flex items-center justify-center font-bold">
                  {monthName} / {year}
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-[32mm] border-b border-black shrink-0">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="flex-1 border-r border-black last:border-r-0 flex items-center justify-center p-1"
              >
                {checklistImages[idx] && (
                  <img
                    src={checklistImages[idx]}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            ))}
          </div>

          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-gray-200 text-center font-bold border-b border-black h-7 text-xs">
                <th className="border-r border-black w-[5%]">No.</th>
                <th className="border-r border-black w-[30%]">
                  รายละเอียดการตรวจเช็ค
                </th>
                <th className="border-r border-black w-[25%]">
                  วิธีการตรวจเช็ค
                </th>
                <th className="border-r border-black w-[6%]">น้ำมัน</th>
                <th className="border-r border-black w-[6%]">เครื่องมือ</th>
                <th className="border-r border-black w-[5%]">ความถี่</th>
                <th className="border-r border-black w-[8%]">เงื่อนไข</th>
                <th className="border-r border-black w-[5%]">เวลา</th>
                <th className="border-r border-black w-[5%]">ทุกวัน</th>
                <th className="w-[5%]">ผู้ทำ</th>
              </tr>
            </thead>
            <tbody>
              {formattedList.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-black h-7">
                  <td className="border-r border-black text-center font-bold">
                    {idx + 1}
                  </td>
                  <td className="border-r border-black px-1 truncate">
                    {item.detail}
                  </td>
                  <td className="border-r border-black px-1 truncate">
                    {item.method}
                  </td>
                  <td className="border-r border-black text-center">
                    {item.oil}
                  </td>
                  <td className="border-r border-black text-center">
                    {item.tool}
                  </td>
                  <td className="border-r border-black text-center">
                    {item.frequency || "D"}
                  </td>
                  <td className="border-r border-black text-center">
                    เดินเครื่อง
                  </td>
                  <td className="border-r border-black text-center">
                    {item.time}
                  </td>
                  <td className="border-r border-black text-center">
                    {item.check_daily || "ทุกวัน"}
                  </td>
                  <td className="text-center">{item.resp}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="w-full border-t border-black">
            <div className="bg-gray-200 border-b border-black py-1 text-center font-bold text-xs text-black">
              สรุปผลการปฏิบัติงานรายเดือน (Monthly Operation Summary)
            </div>
            <table className="w-full text-center border-collapse text-[11px]">
              <thead>
                <tr className="bg-white border-b border-black font-bold h-7 text-xs">
                  <th className="border-r border-black w-[5%]">No.</th>
                  <th className="border-r border-black w-[30%]">
                    รายละเอียดการตรวจเช็ค
                  </th>
                  <th className="border-r border-black w-[10%]">จำนวน</th>
                  <th className="border-r border-black w-[10%] text-green-700">
                    ปกติ
                  </th>
                  <th className="border-r border-black w-[10%] text-red-600">
                    ผิดปกติ
                  </th>
                  <th className="border-r border-black w-[15%]">หมายเหตุ</th>
                  <th className="border-r border-black w-[10%] text-gray-500">
                    ไม่ใช้
                  </th>
                  <th className="text-blue-600">เป่ากรอง</th>
                </tr>
              </thead>
              <tbody>
                {summaryStats.map((stat: any, idx: number) => (
                  <tr key={idx} className="border-b border-black h-7">
                    <td className="border-r border-black font-bold">
                      {idx + 1}
                    </td>
                    <td className="border-r border-black text-left px-1 truncate">
                      {stat.detail}
                    </td>
                    <td className="border-r border-black font-bold">
                      {stat.total}
                    </td>
                    <td className="border-r border-black text-green-700 font-bold">
                      {stat.normal}
                    </td>
                    <td
                      className={`border-r border-black ${
                        stat.abnormal > 0 ? "font-bold text-red-600" : ""
                      }`}
                    >
                      {stat.abnormal}
                    </td>
                    <td className="border-r border-black">-</td>
                    <td className="border-r border-black text-gray-500">
                      {stat.na}
                    </td>
                    <td className="text-blue-600">{stat.filter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-black p-2 text-[10px] shrink-0">
            <div className="font-bold text-black">
              ผู้ลงบันทึก : ลงบันทึกการตรวจสอบเครื่องจักรทุกกะ กะละ 1 ครั้ง
            </div>
            <div className="font-bold text-black">
              ผู้ตรวจสอบความถูกต้อง : ตรวจสอบการลงบันทึกของกะเช้าและกะดึก
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: landscape; margin: 20mm 8mm 8mm 8mm; }
          body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
          .print\\:page-container { width: 100% !important; zoom: 96%; } 
          * { color: #000 !important; border-color: #000 !important; }
          .print\\:text-red-600 { color: #dc2626 !important; }
          .print\\:text-green-700 { color: #15803d !important; }
          .print\\:text-blue-600 { color: #2563eb !important; }
          .print\\:bg-gray-100 { background-color: #f3f4f6 !important; }
          .print\\:bg-gray-200 { background-color: #e5e7eb !important; }
        }
      `}</style>
    </div>
  );
};

export default MonthlySummaryReport;

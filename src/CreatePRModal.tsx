// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  FileText,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";

// --- Helper Functions ---
const splitItemDesc = (text: string, limit: number) => {
  if (!text) return [""];
  const lines = text.split("\n");
  const processed: string[] = [];
  lines.forEach((line) => {
    let vLen = 0,
      chunk = "";
    for (let char of line) {
      chunk += char;
      if (!/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/.test(char)) vLen++;
      if (vLen >= limit) {
        processed.push(chunk);
        chunk = "";
        vLen = 0;
      }
    }
    if (chunk.length > 0) processed.push(chunk);
  });
  return processed.length > 0 ? processed : [""];
};

// --- Loading Component ---
const LoadingField = ({
  label,
  height = "38px",
}: {
  label: string;
  height?: string;
}) => (
  <div
    style={{ height }}
    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 flex items-center justify-between overflow-hidden shadow-inner"
  >
    <span className="text-gray-500 text-[11px] italic font-medium">
      Fetching {label}...
    </span>
    <Loader2 size={16} className="animate-spin text-blue-500/60" />
  </div>
);

interface PRItem {
  id: number;
  desc: string;
  qty: string;
  uom: string;
  price: string;
}

interface CreatePRModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: {
    name?: string;
    sku?: string;
    price?: number | string;
    refTicketId?: string;
    department?: string;
  };
  onPRCreated?: (prNo: string) => void;
}

const tagColors = [
  { name: "ม่วง", code: "#9333ea" },
  { name: "เหลือง", code: "#facc15" },
  { name: "แดง", code: "#ef4444" },
  { name: "เขียวเข้ม", code: "#15803d" },
  { name: "ฟ้า", code: "#3b82f6" },
  { name: "ชมพู", code: "#ec4899" },
];

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbxg8PbJ1fpkfKywEFsD6tV7mJHFrmhENmNim1Dz2IXM3XuAgMSo2YfqPLqstb_HwieNSg/exec";

const CreatePRModal: React.FC<CreatePRModalProps> = ({
  isOpen,
  onClose,
  initialItem,
  onPRCreated,
}) => {
  const [deptList, setDeptList] = useState<string[]>([]);
  const [deptToCodes, setDeptToCodes] = useState<Record<string, string[]>>({});
  const [supplierList, setSupplierList] = useState<string[]>([]);
  const [prNo, setPrNo] = useState("");
  const [prDate, setPrDate] = useState(new Date().toISOString().split("T")[0]);
  const [reqDate, setReqDate] = useState("");
  const [mrsNo, setMrsNo] = useState("");
  const [dept, setDept] = useState("");
  const [budgetCode, setBudgetCode] = useState("");
  const [supplier, setSupplier] = useState("");
  const [remark, setRemark] = useState("");
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [items, setItems] = useState<PRItem[]>([
    { id: Date.now(), desc: "", qty: "", uom: "", price: "" },
  ]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // ✅ ฟังก์ชันดึงข้อมูลเริ่มต้น (ดึงมารอไว้)
  const fetchInitialData = async (isRefreshPR = false) => {
    try {
      if (!isRefreshPR) setIsLoadingData(true);
      const response = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: "GET_INITIAL" }),
      });
      const res = await response.json();
      setPrNo(res.nextPR);

      // ถ้าเป็นการโหลดครั้งแรก ให้เก็บลิสต์ต่างๆ ไว้ด้วย
      if (!isRefreshPR) {
        setDeptList(res.deptList || []);
        setDeptToCodes(res.deptToCodes || {});
        setSupplierList(res.supplierList || []);
      }
    } catch (err) {
      console.error("Initial fetch failed:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node)
      )
        setShowColorPicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ แก้ไข: ดึงข้อมูลมารอไว้ทันทีที่เข้าเว็บ (ครั้งแรกครั้งเดียว)
  useEffect(() => {
    fetchInitialData();
  }, []);

  // ✅ แก้ไข: เมื่อเปิด Modal ให้จัดการแค่ข้อมูลตั้งต้น (ไม่ต้อง Fetch ใหม่)
  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");

      if (initialItem) {
        setMrsNo(initialItem.refTicketId || "");
        const isFromMaintenance = !!initialItem.refTicketId;

        // จัดการเรื่องแผนกจากใบแจ้งซ่อม
        if (initialItem.department && deptList.length > 0) {
          const foundDept = deptList.find(
            (d) => d.trim() === initialItem.department.trim()
          );
          if (foundDept) setDept(foundDept);
        }

        setItems([
          {
            id: Date.now(),
            desc: isFromMaintenance ? "" : initialItem.name || "",
            qty: "",
            uom: "",
            price: "",
          },
        ]);
      } else {
        setMrsNo("");
        setDept("");
        setItems([{ id: Date.now(), desc: "", qty: "", uom: "", price: "" }]);
      }
    }
  }, [isOpen, initialItem, deptList]);

  const filteredBudgetCodes = useMemo(
    () => deptToCodes[dept] || [],
    [dept, deptToCodes]
  );

  const handleItemChange = (id: number, field: keyof PRItem, value: string) =>
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !dept ||
      !budgetCode ||
      !supplier ||
      selectedColor === "#ffffff" ||
      !remark
    )
      return alert("กรุณากรอกข้อมูลในช่องขอบสีแดงให้ครบถ้วน");

    setIsSubmitting(true);
    setErrorMessage("");

    const processedItems: any[] = [];
    let currentItemNo = 1;
    items.forEach((item) => {
      const descChunks = splitItemDesc(item.desc, 40);
      descChunks.forEach((chunk, index) => {
        processedItems.push({
          desc: chunk,
          itemNo: index === 0 ? currentItemNo : "",
          isContinuation: index !== 0,
          qty: index === 0 ? item.qty : "",
          uom: index === 0 ? item.uom : "",
          price: index === 0 ? item.price : "",
        });
      });
      currentItemNo++;
    });

    const payload = {
      action: "SAVE_PR",
      data: {
        pr_no: prNo,
        delivery_date: prDate,
        req_delivery_date: reqDate || "-",
        ticket_id: mrsNo || "-",
        dept,
        budget_code: budgetCode,
        supplier,
        remark: remark || "-",
        remarkLines: splitItemDesc(remark, 110),
        tag_color: selectedColor,
        items: processedItems,
      },
    };

    try {
      const response = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const resJson = await response.json();

      if (resJson.error) {
        setErrorMessage(resJson.message);
        setSubmitStatus("error");
        setIsSubmitting(false);
        return;
      }

      if (resJson.pdfBase64) {
        setSubmitStatus("success");
        if (onPRCreated) onPRCreated(prNo);

        // ✅ แก้ไข: ดึงเลข PR ใหม่มารอไว้ทันทีสำหรับใบต่อไป
        fetchInitialData(true);

        const blob = new Blob(
          [
            new Uint8Array(
              atob(resJson.pdfBase64)
                .split("")
                .map((c) => c.charCodeAt(0))
            ),
          ],
          { type: "application/pdf" }
        );
        window.open(URL.createObjectURL(blob), "_blank");
        onClose();
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อกรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[11000] flex justify-center items-center p-4 overflow-y-auto text-left">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gray-800/50 p-5 border-b border-gray-700 flex justify-between items-center text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none">
                Create PR Form
              </h1>
              <p className="text-gray-500 text-[10px] uppercase font-black mt-1">
                Stanbee Production Planning
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-2xl flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2 duration-200">
              <AlertTriangle size={20} />
              <div className="text-sm font-bold">{errorMessage}</div>
            </div>
          )}

          {/* Section 1: ข้อมูลหลัก */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">
                P/R NO
              </label>
              {isLoadingData ? (
                <LoadingField label="PR NO" />
              ) : (
                <input
                  type="text"
                  value={prNo}
                  onChange={(e) => setPrNo(e.target.value)}
                  className={`w-full bg-gray-800 border ${
                    errorMessage.includes("PR")
                      ? "border-red-500 animate-pulse"
                      : prNo
                      ? "border-gray-700"
                      : "border-red-500"
                  } text-blue-400 font-mono rounded-xl p-2.5 text-sm focus:border-blue-500 outline-none transition-colors`}
                />
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">
                P/R Date
              </label>
              <input
                type="date"
                value={prDate}
                onChange={(e) => setPrDate(e.target.value)}
                required
                className={`w-full bg-gray-800 border ${
                  prDate ? "border-gray-700" : "border-red-500"
                } text-white rounded-xl p-2.5 text-sm focus:border-blue-500 outline-none transition-colors`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">
                Req. Date
              </label>
              <input
                type="date"
                value={reqDate}
                onChange={(e) => setReqDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-2.5 text-sm focus:border-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">
                MRS.No (Reference)
              </label>
              <input
                type="text"
                value={mrsNo}
                readOnly
                className={`w-full bg-gray-800/50 border ${
                  errorMessage.includes("ซ่อม")
                    ? "border-red-500 animate-pulse"
                    : "border-gray-700"
                } text-yellow-400 font-bold rounded-xl p-2.5 text-sm outline-none cursor-not-allowed`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">
                Department
              </label>
              {isLoadingData ? (
                <LoadingField label="Departments" />
              ) : (
                <select
                  value={dept}
                  onChange={(e) => {
                    setDept(e.target.value);
                    setBudgetCode("");
                  }}
                  required
                  className={`w-full bg-gray-800 border ${
                    dept ? "border-gray-700" : "border-red-500"
                  } text-white rounded-xl p-2.5 text-sm focus:border-blue-500 outline-none transition-colors`}
                >
                  <option value="">เลือกแผนก</option>
                  {deptList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">
                Budget Code
              </label>
              {isLoadingData ? (
                <LoadingField label="Budget Codes" />
              ) : (
                <select
                  value={budgetCode}
                  onChange={(e) => setBudgetCode(e.target.value)}
                  required
                  disabled={!dept}
                  className={`w-full bg-gray-800 border ${
                    budgetCode ? "border-gray-700" : "border-red-500"
                  } text-white rounded-xl p-2.5 text-sm focus:border-blue-500 outline-none disabled:opacity-30 transition-colors`}
                >
                  <option value="">เลือก Budget Code</option>
                  {filteredBudgetCodes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Section 2: รายการสินค้า */}
          <div className="space-y-3 pt-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Item List
              </h2>
              <button
                type="button"
                onClick={() =>
                  setItems([
                    ...items,
                    { id: Date.now(), desc: "", qty: "", uom: "", price: "" },
                  ])
                }
                className="border border-blue-500/40 bg-blue-500/5 text-blue-400 text-[10px] font-black uppercase px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Plus size={14} strokeWidth={3} /> เพิ่มรายการ
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-2 gap-x-8 items-center py-1"
                >
                  <textarea
                    value={item.desc}
                    onChange={(e) =>
                      handleItemChange(item.id, "desc", e.target.value)
                    }
                    placeholder="รายละเอียดสินค้า"
                    required
                    rows={1}
                    className={`w-full bg-gray-800 text-white border ${
                      item.desc ? "border-gray-700" : "border-red-500"
                    } rounded-xl p-3 text-sm focus:border-blue-500 outline-none h-11 resize-none overflow-hidden transition-colors`}
                  />
                  <div className="grid grid-cols-[1fr,1fr,1fr,40px] gap-3 items-center">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) =>
                        handleItemChange(item.id, "qty", e.target.value)
                      }
                      placeholder="Qty"
                      required
                      className={`w-full bg-gray-800 border ${
                        item.qty ? "border-gray-700" : "border-red-500"
                      } text-center text-white rounded-xl h-11 focus:border-blue-500 outline-none transition-colors`}
                    />
                    <input
                      type="text"
                      value={item.uom}
                      onChange={(e) =>
                        handleItemChange(item.id, "uom", e.target.value)
                      }
                      placeholder="Unit"
                      required
                      className={`w-full bg-gray-800 border ${
                        item.uom ? "border-gray-700" : "border-red-500"
                      } text-center text-white rounded-xl h-11 focus:border-blue-500 outline-none transition-colors`}
                    />
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange(item.id, "price", e.target.value)
                      }
                      placeholder="Price"
                      required
                      className={`w-full bg-gray-800 border ${
                        item.price ? "border-gray-700" : "border-red-500"
                      } text-center text-white rounded-xl h-11 focus:border-blue-500 outline-none font-mono transition-colors`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (items.length > 1)
                          setItems(items.filter((i) => i.id !== item.id));
                      }}
                      className="text-gray-700 hover:text-red-500 flex justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Supplier และ Tag Color */}
          <div className="grid grid-cols-2 gap-x-8 items-start">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block">
                  Supplier
                </label>
                {isLoadingData ? (
                  <LoadingField label="Suppliers" height="46px" />
                ) : (
                  <select
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    required
                    className={`w-full h-[46px] bg-gray-800 border ${
                      supplier ? "border-gray-700" : "border-red-500"
                    } text-white rounded-xl px-3 outline-none focus:border-blue-500 appearance-none transition-colors`}
                  >
                    <option value="">เลือก Supplier</option>
                    {supplierList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="relative" ref={colorPickerRef}>
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block">
                  Tag Color
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    style={{ backgroundColor: selectedColor }}
                    className={`w-11 h-11 rounded-2xl border-2 shadow-lg flex items-center justify-center transition-all active:scale-90 ${
                      selectedColor === "#ffffff"
                        ? "border-red-500 text-red-500"
                        : "border-white/20 text-white"
                    }`}
                  >
                    {selectedColor === "#ffffff" ? (
                      <HelpCircle size={20} className="text-gray-500" />
                    ) : (
                      <span className="font-black text-xl">C</span>
                    )}
                  </button>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      selectedColor === "#ffffff"
                        ? "text-red-500"
                        : "text-gray-600"
                    }`}
                  >
                    Select Category Tag
                  </span>
                </div>
                {showColorPicker && (
                  <div className="absolute bottom-14 left-0 bg-gray-800 border border-gray-700 p-2.5 rounded-2xl shadow-2xl flex gap-2 z-[10000] animate-in slide-in-from-bottom-2 duration-150">
                    {tagColors.map((color) => (
                      <button
                        key={color.code}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color.code);
                          setShowColorPicker(false);
                        }}
                        style={{ backgroundColor: color.code }}
                        className="w-8 h-8 rounded-full border border-white/10 hover:scale-110 transition-transform shadow-lg"
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedColor("#ffffff");
                        setShowColorPicker(false);
                      }}
                      className="w-8 h-8 rounded-full bg-white border border-gray-300 hover:scale-110 flex items-center justify-center text-gray-400"
                    >
                      <HelpCircle size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block">
                Remark
              </label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="เหตุผลการซื้อ..."
                className={`h-[46px] w-full bg-gray-800 border ${
                  remark ? "border-gray-700" : "border-red-500"
                } text-white rounded-xl p-3 text-sm outline-none resize-none focus:border-blue-500 transition-colors`}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-5 items-center">
            {submitStatus === "success" && (
              <div className="text-green-400 text-[10px] font-bold mr-4 flex items-center gap-1 animate-bounce">
                <CheckCircle size={14} /> บันทึกสำเร็จ!
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="bg-transparent hover:bg-gray-800 text-gray-400 font-bold py-2.5 px-8 rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingData}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 px-12 rounded-2xl flex items-center gap-2 shadow-xl shadow-blue-900/20 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "CREATE"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePRModal;

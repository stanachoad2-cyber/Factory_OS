import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Factory, Plus, Save, Trash2, CheckCircle, Scale, ChevronDown, Search, Edit, Shield, Loader2, Settings } from "lucide-react";
import AccessDeniedView from "./AccessDeniedView";

const SearchableSelect = ({ value, onChange, options, placeholder, disabled }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt: string) => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        className={`bg-slate-900 border border-slate-700 rounded p-1.5 w-full text-xs text-left flex items-center justify-between text-slate-200 ${disabled ? 'cursor-not-allowed' : 'cursor-text focus-within:ring-1 focus-within:ring-blue-500'}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <input 
          type="text"
          value={isOpen ? search : (value || "")}
          onChange={(e) => {
            if (disabled) return;
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (disabled) return;
            setIsOpen(true);
            setSearch("");
          }}
          placeholder={value ? value : placeholder}
          className="bg-transparent border-none outline-none w-full text-xs text-slate-200 placeholder-slate-400"
          disabled={disabled}
        />
        <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
      </div>
      
      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full max-h-48 overflow-y-auto custom-scrollbar bg-slate-800 border border-slate-600 rounded-lg shadow-xl">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-xs text-slate-400">ไม่พบข้อมูล</div>
          ) : (
            filteredOptions.map((opt: string, idx: number) => (
              <div 
                key={idx}
                className="p-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors"
                onClick={() => {
                  onChange(opt);
                  setSearch("");
                  setIsOpen(false);
                }}
              >
                {opt}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export function ProductionModule({ currentUser, onExit, activeTab }: any) {
  const [activeView, setActiveView] = useState<"MENU" | "WASTE_ENTRY" | "SETTINGS">(
    activeTab === "waste_entry" ? "WASTE_ENTRY" : "MENU"
  );

  const [records, setRecords] = useState<any[]>([]);
  const [masterModels, setMasterModels] = useState<string[]>([]);
  const [masterDefects, setMasterDefects] = useState<string[]>([]);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [tempWeight, setTempWeight] = useState("");
  const [deleteModalInfo, setDeleteModalInfo] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState(false);
  const [verifyModalInfo, setVerifyModalInfo] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [verifyPassword, setVerifyPassword] = useState("");
  const [verifyError, setVerifyError] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // ค่าเริ่มต้นเป็นวันที่ 1 ของเดือนนี้
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [processingText, setProcessingText] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Settings State
  const [tempModels, setTempModels] = useState<string[]>([]);
  const [tempDefects, setTempDefects] = useState<string[]>([]);
  const [masterModal, setMasterModal] = useState<{ isOpen: boolean, type: "model" | "defect" | null, action: "add" | "edit", index: number | null, value: string }>({
    isOpen: false,
    type: null,
    action: "add",
    index: null,
    value: ""
  });

  const GAS_URL = "https://script.google.com/macros/s/AKfycbzefje9f-YsYkSvSgWS466HGMw7TcU1r51XVy9FT-99r-359HFb-7S2q4ZbSq5UXC0-vA/exec";

  const perms = currentUser?.allowedActions || currentUser?.permissions || [];
  const hasVerifyPerm = (Array.isArray(perms) && perms.includes("prod_verify")) || currentUser?.role === "admin";
  const hasSettingsPerm = (Array.isArray(perms) && perms.includes("prod_settings")) || currentUser?.role === "admin";

  React.useEffect(() => {
    if (activeTab === "waste_entry") setActiveView("WASTE_ENTRY");
    if (activeTab === "settings") setActiveView("SETTINGS");
  }, [activeTab]);

  React.useEffect(() => {
    if (activeView === "SETTINGS") {
      setTempModels([...masterModels]);
      setTempDefects([...masterDefects]);
    }
  }, [activeView, masterModels, masterDefects]);

  // ดึงข้อมูล Master จาก Google Apps Script
  const fetchMasterData = async (showOverlay = true) => {
    if (showOverlay) {
      setIsLoadingMaster(true);
      setLoadingProgress(10);
    }
    
    let progressInterval: NodeJS.Timeout | null = null;
    if (showOverlay) {
      progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.floor(Math.random() * 15) + 5;
        });
      }, 400);
    }

    try {
      const response = await fetch(GAS_URL);
      if (showOverlay) setLoadingProgress(95);
      const result = await response.json();
      if (showOverlay) setLoadingProgress(100);
      
      if (result.status === "success") {
        const sortedModels = (result.models || []).sort((a: string, b: string) => a.localeCompare(b, "th"));
        const sortedDefects = (result.defects || []).sort((a: string, b: string) => a.localeCompare(b, "th"));
        setMasterModels(sortedModels);
        setMasterDefects(sortedDefects);
        if (result.wasteRecords) {
          setRecords(result.wasteRecords);
        }
      } else {
        console.error("Failed to fetch master data", result);
        // Fallback mocks just in case
        setMasterModels(["Model A", "Model B"]);
        setMasterDefects(["รอยขีดข่วน", "สีลอก"]);
      }
    } catch (error) {
      console.error("Error fetching master data:", error);
      setMasterModels(["Model A", "Model B"]);
      setMasterDefects(["รอยขีดข่วน", "สีลอก"]);
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      if (showOverlay) {
        setTimeout(() => {
          setIsLoadingMaster(false);
          setLoadingProgress(0);
        }, 500); // ดีเลย์เล็กน้อยให้เห็นตอน 100%
      }
    }
  };

  React.useEffect(() => {
    fetchMasterData();
  }, []);

  const handleAddRow = () => {
    const newRow = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("en-GB"),
      shift: "Day",
      model: "",
      defect: "",
      newWeight: 0,
      prevWeightBox: 0, // ค่า นน.คงค้าง+กล่อง
      increasedWeight: 0, // นน.ที่เพิ่มขึ้น
      recorder: currentUser?.fullname || "Unknown",
      inspector: null,
      isSaved: false,
    };
    setRecords([...records, newRow]);
  };

  const updateRow = (id: string, field: string, value: any) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
          // คำนวณ นน.ที่เพิ่มขึ้นอัตโนมัติ
          if (field === "newWeight" || field === "prevWeightBox") {
            updated.increasedWeight = (updated.newWeight || 0) - (updated.prevWeightBox || 0);
          }
          return updated;
        }
        return r;
      })
    );
  };

  const handleOpenWeightModal = (id: string) => {
    setActiveRowId(id);
    setTempWeight("");
    setIsWeightModalOpen(true);
  };

  const handleSaveWeight = () => {
    if (activeRowId) {
      updateRow(activeRowId, "newWeight", parseFloat(tempWeight) || 0);
    }
    setIsWeightModalOpen(false);
  };

  const handleSaveRow = async (id: string) => {
    const rowToSave = records.find(r => r.id === id);
    if (!rowToSave) return;
    
    if (!rowToSave.model || !rowToSave.defect) {
      alert("กรุณาเลือกรุ่นและลักษณะปัญหาให้ครบ");
      return;
    }

    setProcessingText("กำลังบันทึกข้อมูล...");
    try {
      const index = records.findIndex(r => r.id === id);
      const prev = index === 0 ? 0 : records[index - 1].newWeight;
      const finalRow = {
        ...rowToSave,
        prevWeightBox: prev,
        increasedWeight: rowToSave.newWeight - prev
      };

      const payload = id.startsWith("gas-") 
        ? { action: "update", row: parseInt(id.replace("gas-", "")), record: finalRow }
        : { records: [finalRow] };

      const response = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.status === "success") {
        await fetchMasterData(false); // โหลดข้อมูลกลับมาใหม่ทั้งหมด เพื่อให้ ID ถูกต้องเสมอ
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึก: " + result.error);
      }
    } catch (error) {
      console.error("Error saving data:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google Sheet");
    } finally {
      setProcessingText("");
    }
  };

  const handleDeleteRowClick = (id: string) => {
    const row = records.find((r) => r.id === id);
    if (!row) return;

    if (!id.startsWith("gas-")) {
      setRecords(records.filter(record => record.id !== id));
      return;
    }

    if (row.inspector) {
      const perms = currentUser?.allowedActions || currentUser?.permissions || [];
      const hasVerifyPerm =
        (Array.isArray(perms) && perms.includes("prod_verify")) ||
        currentUser?.role === "admin";
      if (!hasVerifyPerm) {
        alert("รายการนี้ถูกตรวจสอบแล้ว ผู้ตรวจสอบเท่านั้นที่สามารถลบได้");
        return;
      }
    } else {
      const perms = currentUser?.allowedActions || currentUser?.permissions || [];
      const hasRecordPerm =
        (Array.isArray(perms) && perms.includes("prod_record")) ||
        currentUser?.role === "admin";
      if (!hasRecordPerm) {
        alert("คุณไม่มีสิทธิ์ลบข้อมูล (ต้องมีสิทธิ์บันทึกข้อมูล)");
        return;
      }
    }

    setDeleteModalInfo({ isOpen: true, id });
    setDeletePassword("");
    setDeleteError(false);
  };

  const handleVerifyRowClick = (id: string) => {
    setVerifyModalInfo({ isOpen: true, id });
    setVerifyPassword("");
    setVerifyError(false);
  };

  const confirmVerifyRow = async () => {
    if (verifyPassword !== currentUser?.pass) {
      setVerifyError(true);
      setVerifyPassword("");
      return;
    }

    const id = verifyModalInfo.id;
    if (!id) return;

    setVerifyModalInfo({ isOpen: false, id: null });
    setProcessingText("กำลังยืนยันข้อมูล...");

    try {
      const row = records.find((r) => r.id === id);
      if (!row) return;

      const updatedRow = { ...row, inspector: currentUser.fullname || currentUser.username };

      const payload = id.startsWith("gas-") 
        ? { action: "update", row: parseInt(id.replace("gas-", "")), record: updatedRow }
        : { records: [updatedRow] }; 

      const response = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.status === "success") {
        await fetchMasterData(false); // Refresh
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึก: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("เชื่อมต่อฐานข้อมูลไม่สำเร็จ");
    } finally {
      setProcessingText("");
    }
  };

  const confirmDeleteRow = async () => {
    if (deletePassword !== currentUser?.pass) {
      setDeleteError(true);
      setDeletePassword("");
      return;
    }
    
    const id = deleteModalInfo.id;
    if (!id) return;
    
    setDeleteModalInfo({ isOpen: false, id: null });
    setDeletePassword("");
    
    if (id.startsWith("master-model-")) {
      const idx = parseInt(id.replace("master-model-", ""));
      let newModels = [...tempModels];
      newModels.splice(idx, 1);
      setTempModels(newModels);
      await saveMasterDataToDB(newModels, tempDefects);
      return;
    }

    if (id.startsWith("master-defect-")) {
      const idx = parseInt(id.replace("master-defect-", ""));
      let newDefects = [...tempDefects];
      newDefects.splice(idx, 1);
      setTempDefects(newDefects);
      await saveMasterDataToDB(tempModels, newDefects);
      return;
    }

    if (id.startsWith("gas-")) {
      const rowIdx = parseInt(id.replace("gas-", ""));
      if (isNaN(rowIdx)) {
        setRecords(records.filter(record => record.id !== id));
        return;
      }
      
      setProcessingText("กำลังลบข้อมูล...");
      try {
        const response = await fetch(GAS_URL, {
          method: "POST",
          body: JSON.stringify({ action: "delete", row: rowIdx })
        });
        const result = await response.json();
        if (result.status === "success") {
          await fetchMasterData(false); // Refresh silently without progress bar overlay
        } else {
          alert("เกิดข้อผิดพลาดในการลบจากฐานข้อมูล");
        }
      } catch (error) {
        console.error(error);
        alert("เชื่อมต่อฐานข้อมูลไม่สำเร็จ");
      } finally {
        setProcessingText("");
      }
    } else {
      setRecords(records.filter(record => record.id !== id));
    }
  };

  const saveMasterDataToDB = async (newModels: string[], newDefects: string[]) => {
    setProcessingText("กำลังบันทึกข้อมูล Master...");
    try {
      const response = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "updateMaster",
          models: newModels,
          defects: newDefects
        })
      });
      const result = await response.json();
      if (result.status === "success") {
        await fetchMasterData(false); // Refresh
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึก: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("เชื่อมต่อฐานข้อมูลไม่สำเร็จ");
    } finally {
      setProcessingText("");
    }
  };

  const openMasterModal = (type: "model" | "defect", action: "add" | "edit", index: number | null = null) => {
    let value = "";
    if (action === "edit" && index !== null) {
      value = type === "model" ? tempModels[index] : tempDefects[index];
    }
    setMasterModal({ isOpen: true, type, action, index, value });
  };

  const confirmMasterModal = async () => {
    const { type, action, index, value } = masterModal;
    if (!value.trim()) return;

    let newModels = [...tempModels];
    let newDefects = [...tempDefects];

    if (type === "model") {
      if (action === "add") newModels.push(value.trim());
      else if (index !== null) newModels[index] = value.trim();
    } else {
      if (action === "add") newDefects.push(value.trim());
      else if (index !== null) newDefects[index] = value.trim();
    }

    setTempModels(newModels);
    setTempDefects(newDefects);
    setMasterModal({ isOpen: false, type: null, action: "add", index: null, value: "" });
    await saveMasterDataToDB(newModels, newDefects);
  };

  const handleDeleteTemp = (type: "model" | "defect", index: number) => {
    setDeleteModalInfo({ isOpen: true, id: `master-${type}-${index}` });
  };

  return (
    <div className="bg-[#0F172A] w-full h-full flex flex-col overflow-hidden relative text-slate-200">
      {/* DESKTOP HEADER */}
      <div className="hidden md:flex px-6 py-4 bg-[#1E293B]/80 border-b border-slate-700 items-center justify-between sticky top-0 z-30 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl text-purple-500 bg-white/5 shadow-inner">
            <Factory size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">
              PRODUCTION
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              Waste Record Module
            </p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-hidden p-6 flex flex-col relative">
        {activeView === "WASTE_ENTRY" && (
          isLoadingMaster && loadingProgress > 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#1E293B] rounded-2xl border border-slate-700 shadow-xl overflow-hidden relative">
              <div className="w-full max-w-sm flex flex-col items-center relative z-10 animate-in fade-in">
                <h3 className="text-lg font-bold text-white mb-4">กำลังค้นหาข้อมูล...</h3>
                <div className="w-full bg-slate-800 rounded-full h-3 mb-2 border border-slate-700 overflow-hidden relative">
                  <div className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${loadingProgress}%` }}></div>
                </div>
                <div className="w-full text-right text-xs font-bold text-blue-400">
                  {Math.min(loadingProgress, 100)}%
                </div>
              </div>
            </div>
          ) : (
          <div className="flex flex-col h-full bg-[#1E293B] rounded-2xl border border-slate-700 shadow-xl overflow-hidden animate-in fade-in">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#161B22]">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Factory size={18} className="text-purple-500" /> บันทึกข้อมูลของเสีย
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">ตั้งแต่:</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-[32px] bg-slate-800 border border-slate-600 text-white px-3 rounded-lg text-xs outline-none focus:border-blue-500"
                />
                <span className="text-xs text-slate-400">ถึง:</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-[32px] bg-slate-800 border border-slate-600 text-white px-3 rounded-lg text-xs outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => fetchMasterData(true)}
                  className="h-[32px] bg-slate-700 hover:bg-slate-600 text-white px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg ml-2"
                >
                  <Search size={14} /> ค้นหา
                </button>
                <button
                  onClick={handleAddRow}
                  className="h-[32px] bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg ml-1"
                >
                  <Plus size={14} /> เพิ่มรายการ
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-4">
              <table className="w-full table-fixed text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-800 text-slate-300 text-xs uppercase tracking-wider">
                    <th className="p-3 rounded-tl-lg text-left whitespace-nowrap w-[9%]">วันที่</th>
                    <th className="p-3 text-left whitespace-nowrap w-[6%]">กะ</th>
                    <th className="p-3 text-left whitespace-nowrap w-[12%]">รุ่น</th>
                    <th className="p-3 text-left whitespace-nowrap w-[12%]">ลักษณะปัญหา</th>
                    <th className="p-3 text-left whitespace-nowrap w-[12%]">นน.ใหม่ (Kg)</th>
                    <th className="p-3 text-left whitespace-nowrap w-[12%]">นน.คงค้าง+กล่อง (Kg)</th>
                    <th className="p-3 text-left whitespace-nowrap w-[12%]">นน.เพิ่มขึ้น (Kg)</th>
                    <th className="p-3 text-left whitespace-nowrap w-[10%]">ผู้บันทึก</th>
                    <th className="p-3 text-left whitespace-nowrap w-[9%]">ผู้ตรวจสอบ</th>
                    <th className="p-3 rounded-tr-lg text-center whitespace-nowrap w-[6%]">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {records.filter(r => {
                    const parts = r.date.split("/");
                    if (parts.length === 3) {
                      const rowDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                      return rowDateStr >= startDate && rowDateStr <= endDate;
                    }
                    return true;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center p-8 text-slate-500">
                        ไม่มีข้อมูลในช่วงวันที่นี้ กดเพิ่มรายการ
                      </td>
                    </tr>
                  ) : (
                    records.filter(r => {
                      const parts = r.date.split("/");
                      if (parts.length === 3) {
                        const rowDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        return rowDateStr >= startDate && rowDateStr <= endDate;
                      }
                      return true;
                    }).map((r, index, filteredArr) => {
                      const computedPrevWeightBox = index === 0 ? 0 : filteredArr[index - 1].newWeight;
                      const computedIncreasedWeight = r.newWeight - computedPrevWeightBox;

                      return (
                        <tr 
                          key={r.id} 
                          className={`border-b border-slate-700/50 transition-colors ${
                            !r.isSaved 
                              ? "bg-blue-800/30 shadow-[inset_4px_0_0_0_#3b82f6]" 
                              : "hover:bg-slate-800/30"
                          }`}
                        >
                        <td className="p-3 text-left">
                          <input 
                            type="date" 
                            value={r.date.split("/").reverse().join("-")} 
                            onChange={(e) => updateRow(r.id, "date", e.target.value.split("-").reverse().join("/"))}
                            className={`bg-transparent border border-slate-700 rounded p-1 w-full text-xs text-left ${r.isSaved ? 'cursor-not-allowed text-slate-200' : 'text-slate-200'}`} 
                            disabled={r.isSaved}
                          />
                        </td>
                        <td className="p-3 text-left">
                          <select 
                            value={r.shift} 
                            onChange={(e) => updateRow(r.id, "shift", e.target.value)} 
                            className={`bg-slate-900 border border-slate-700 rounded p-1.5 w-full text-xs text-left text-slate-200 ${r.isSaved ? 'cursor-not-allowed' : ''}`}
                            disabled={r.isSaved}
                          >
                            <option>Day</option>
                            <option>Night</option>
                          </select>
                        </td>
                        <td className="p-3 text-left">
                          <SearchableSelect 
                            value={r.model}
                            onChange={(val: string) => updateRow(r.id, "model", val)}
                            options={masterModels}
                            placeholder="-- เลือกรุ่น --"
                            disabled={r.isSaved}
                          />
                        </td>
                        <td className="p-3 text-left">
                          <SearchableSelect 
                            value={r.defect}
                            onChange={(val: string) => updateRow(r.id, "defect", val)}
                            options={masterDefects}
                            placeholder="-- เลือกปัญหา --"
                            disabled={r.isSaved}
                          />
                        </td>
                        <td className="p-3 text-left">
                          <button
                            onClick={() => !r.isSaved && handleOpenWeightModal(r.id)}
                            className={`bg-slate-900 border border-slate-700 rounded p-1.5 w-full text-left text-xs flex justify-between items-center text-slate-200 ${r.isSaved ? 'cursor-not-allowed' : 'hover:bg-slate-800 transition-colors'}`}
                            disabled={r.isSaved}
                          >
                            <span>{r.newWeight.toFixed(2)}</span>
                            <Scale size={14} className="text-purple-500" />
                          </button>
                        </td>
                        <td className="p-3 text-left">
                          <div className="bg-slate-900 border border-slate-700 rounded p-1.5 w-full text-left text-xs text-slate-400 cursor-not-allowed">
                            {computedPrevWeightBox.toFixed(2)}
                          </div>
                        </td>
                        <td className="p-3 text-left">
                          <div className="bg-slate-900 border border-slate-700 rounded p-1.5 w-full text-left text-xs font-bold text-orange-400">
                            {computedIncreasedWeight.toFixed(2)}
                          </div>
                        </td>
                        <td className="p-3 text-xs text-slate-400 text-left">{r.recorder}</td>
                        <td className="p-3 text-left">
                          {r.inspector ? (
                            <div className="text-xs text-blue-400 font-bold whitespace-nowrap">
                              {r.inspector}
                            </div>
                          ) : hasVerifyPerm && r.isSaved ? (
                            <button 
                              onClick={() => handleVerifyRowClick(r.id)}
                              className="bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition-colors"
                            >
                              ยืนยัน
                            </button>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {!r.isSaved ? (
                            <div className="flex justify-center gap-2">
                              <button 
                                onClick={() => handleSaveRow(r.id)}
                                className="text-blue-500 hover:text-blue-400 p-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
                                title="บันทึกรายการ"
                              >
                                <Save size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteRowClick(r.id)}
                                className="text-red-500 hover:text-red-400 p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                                title="ลบรายการ"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ) : r.inspector && !hasVerifyPerm ? (
                            <span className="text-slate-600 text-xs">-</span>
                          ) : (
                            <div className="flex justify-center gap-2">
                              <button 
                                onClick={() => updateRow(r.id, "isSaved", false)}
                                className="text-amber-500 hover:text-amber-400 p-1.5 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
                                title="แก้ไขรายการ"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteRowClick(r.id)}
                                className="text-red-500 hover:text-red-400 p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                                title="ลบรายการ"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )
        )}

        {activeView === "SETTINGS" && (
          hasSettingsPerm ? (
          <div className="flex flex-col h-full bg-[#1E293B] rounded-2xl border border-slate-700 shadow-xl overflow-hidden animate-in fade-in">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#161B22]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings size={18} className="text-blue-500" /> ตั้งค่าระบบ (Master Data)
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-[#0F172A]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                
                {/* Column 1: รุ่น (Models) */}
                <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                  <div className="p-4 border-b border-slate-700 bg-[#161B22] flex justify-between items-center">
                    <h3 className="font-bold text-white">รุ่น (Models)</h3>
                    <button 
                      onClick={() => openMasterModal("model", "add")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-lg transition-colors"
                      title="เพิ่มรุ่น"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {tempModels.length === 0 ? (
                      <div className="text-slate-500 text-center py-4 text-sm">ไม่มีข้อมูลรุ่น</div>
                    ) : (
                      tempModels.map((m, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors">
                          <span className="text-slate-200 text-sm font-medium">{m}</span>
                          <div className="flex gap-2">
                            <button onClick={() => openMasterModal("model", "edit", idx)} className="text-amber-500 hover:bg-amber-500/20 p-1.5 rounded transition-colors"><Edit size={16}/></button>
                            <button onClick={() => handleDeleteTemp("model", idx)} className="text-red-500 hover:bg-red-500/20 p-1.5 rounded transition-colors"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 2: ลักษณะปัญหา (Defects) */}
                <div className="bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                  <div className="p-4 border-b border-slate-700 bg-[#161B22] flex justify-between items-center">
                    <h3 className="font-bold text-white">ลักษณะปัญหา (Defects)</h3>
                    <button 
                      onClick={() => openMasterModal("defect", "add")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-lg transition-colors"
                      title="เพิ่มปัญหา"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {tempDefects.length === 0 ? (
                      <div className="text-slate-500 text-center py-4 text-sm">ไม่มีข้อมูลลักษณะปัญหา</div>
                    ) : (
                      tempDefects.map((d, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors">
                          <span className="text-slate-200 text-sm font-medium">{d}</span>
                          <div className="flex gap-2">
                            <button onClick={() => openMasterModal("defect", "edit", idx)} className="text-amber-500 hover:bg-amber-500/20 p-1.5 rounded transition-colors"><Edit size={16}/></button>
                            <button onClick={() => handleDeleteTemp("defect", idx)} className="text-red-500 hover:bg-red-500/20 p-1.5 rounded transition-colors"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
          ) : (
            <AccessDeniedView message="คุณไม่มีสิทธิ์เข้าถึงหน้าตั้งค่าระบบ" />
          )
        )}
      </div>

      {/* MODAL: Input Weight */}
      {isWeightModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1E293B] rounded-3xl border border-slate-600 p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mb-4">
                <Scale size={32} />
              </div>
              <h2 className="text-xl font-bold text-white">รับค่าน้ำหนักจากเครื่องชั่ง</h2>
              <p className="text-sm text-slate-400">กรุณาระบุน้ำหนักใหม่ (Kg)</p>
            </div>

            <input
              type="number"
              value={tempWeight}
              onChange={(e) => setTempWeight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveWeight();
                }
              }}
              className="w-full bg-black border border-slate-600 rounded-xl p-4 text-center text-3xl font-black text-purple-400 focus:border-purple-500 outline-none mb-6"
              placeholder="0.00"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={handleSaveWeight}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-colors"
              >
                OK
              </button>
              <button
                onClick={() => setIsWeightModalOpen(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Password (ใช้ UI จาก ConfirmPasswordGuard 100%) */}
      {deleteModalInfo.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1F1F23] w-full max-w-xs p-6 rounded-2xl border border-gray-700 shadow-2xl transform transition-all scale-100">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">ยืนยันรหัสผ่าน</h3>
              <p className="text-xs text-gray-400 mb-4">
                กรุณากรอกรหัสผ่านเพื่อยืนยันสิทธิ์
              </p>
            </div>

            <input
              type="password"
              autoFocus
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && confirmDeleteRow()}
              className={`w-full bg-black border ${
                deleteError ? "border-red-500" : "border-gray-700 focus:border-blue-500"
              } rounded-xl px-4 py-3 text-center text-white outline-none transition-all mb-4`}
              placeholder="Password"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDeleteModalInfo({ isOpen: false, id: null });
                  setDeletePassword("");
                }}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-bold text-xs transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteRow}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 font-bold text-xs shadow-lg shadow-blue-900/20 transition-all"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Verify Password */}
      {verifyModalInfo.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1F1F23] w-full max-w-xs p-6 rounded-2xl border border-gray-700 shadow-2xl transform transition-all scale-100">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-600/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">ยืนยันรหัสผ่าน</h3>
              <p className="text-xs text-gray-400 mb-4">
                กรุณากรอกรหัสผ่านเพื่อตรวจสอบข้อมูล
              </p>
            </div>

            <input
              type="password"
              autoFocus
              value={verifyPassword}
              onChange={(e) => {
                setVerifyPassword(e.target.value);
                setVerifyError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && confirmVerifyRow()}
              className={`w-full bg-black border ${
                verifyError ? "border-red-500" : "border-gray-700 focus:border-emerald-500"
              } rounded-xl px-4 py-3 text-center text-white outline-none transition-all mb-4`}
              placeholder="Password"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setVerifyModalInfo({ isOpen: false, id: null });
                  setVerifyPassword("");
                }}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-bold text-xs transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmVerifyRow}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 font-bold text-xs shadow-lg shadow-emerald-900/20 transition-all"
              >
                ตรวจสอบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Master Data Input */}
      {masterModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1E293B] rounded-3xl border border-slate-600 p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h2 className="text-xl font-bold text-white mb-4 text-center">
              {masterModal.action === "add" ? "เพิ่ม" : "แก้ไข"}{masterModal.type === "model" ? "รุ่น" : "ลักษณะปัญหา"}
            </h2>
            <input 
              type="text" 
              value={masterModal.value}
              onChange={(e) => setMasterModal({...masterModal, value: e.target.value})}
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-6 text-center text-lg"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmMasterModal();
              }}
            />
            <div className="flex gap-4">
              <button 
                onClick={() => setMasterModal({...masterModal, isOpen: false})}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmMasterModal}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2 shadow-lg"
              >
                <Save size={18} /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY: Loading Spinner */}
      {processingText && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
          <p className="text-white font-bold text-lg animate-pulse">{processingText}</p>
        </div>
      )}
    </div>
  );
}

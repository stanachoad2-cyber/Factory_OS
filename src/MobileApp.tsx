import React, { useState } from "react";
import {
  ClipboardCheck,
  Wrench,
  Box,
  UserCheck,
  LogOut,
  Hammer, // เพิ่มไอคอนสำหรับหน้ากำลังซ่อม
  History, // เพิ่มไอคอนประวัติ
} from "lucide-react";

// ✅ Import Module เดิม
import { MaintenanceModule } from "./MaintenanceApp";
import { StockModule } from "./StockApp";
import { DailyCheckModule } from "./DailyCheckApp";

// ==========================================
// MOBILE MENU (เพิ่มปุ่มกำลังซ่อม)
// ==========================================
function MobileMenu({ onSelect, currentUser, onLogout }: any) {
  return (
    <div className="flex flex-col h-full bg-[#0F172A] text-white p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>

      {/* --- TOP BRANDING & LOGOUT --- */}
      <div className="flex items-center justify-between mb-8 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="STANBEE Logo"
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="text-xl font-black tracking-tighter leading-none">
              <span className="text-[#82c91e]">STANBEE</span>
              <span className="text-[#5c8bd6]">OS</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase mt-1">
              Control Center
            </p>
          </div>
        </div>

        {/* ปุ่ม Logout ย้ายมาไว้ที่นี่ */}
        <button
          onClick={onLogout}
          className="p-2.5 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-white/5 backdrop-blur-md"
          title="ออกจากระบบ"
        >
          <LogOut size={20} />
        </button>
      </div>



      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar z-10 space-y-8 pb-10">

        {/* --- SECTION: Daily Check --- */}
        <div>
          <div className="mb-3 ml-1">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Daily Check</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MenuCard
              title="ตรวจเช็ค"
              subtitle="Inspect"
              icon={ClipboardCheck}
              color="bg-green-600"
              onClick={() => onSelect("DAILY_CHECK")}
            />
            <MenuCard
              title="ประวัติเช็ค"
              subtitle="History"
              icon={History}
              color="bg-emerald-600"
              onClick={() => onSelect("DAILY_HISTORY")}
            />
          </div>
        </div>

        {/* --- SECTION: Maintenance --- */}
        <div>
          <div className="mb-3 ml-1">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Maintenance</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MenuCard
              title="แจ้งซ่อม"
              subtitle="Request"
              icon={Wrench}
              color="bg-orange-600"
              onClick={() => onSelect("MAINTENANCE")}
            />
            <MenuCard
              title="กำลังซ่อม"
              subtitle="In Progress"
              icon={Hammer}
              color="bg-blue-600"
              onClick={() => onSelect("REPAIRING")}
            />
            <MenuCard
              title="ตรวจรับงาน"
              subtitle="Verify Job"
              icon={UserCheck}
              color="bg-purple-600"
              onClick={() => onSelect("VERIFY")}
            />
          </div>
        </div>

        {/* --- SECTION: Stock Parts --- */}
        <div>
          <div className="mb-3 ml-1">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Stock Parts</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MenuCard
              title="คลังอะไหล่"
              subtitle="Inventory"
              icon={Box}
              color="bg-slate-700"
              onClick={() => onSelect("INVENTORY")}
            />
          </div>
        </div>


      </div>

      {/* Footer Info */}
      <div className="shrink-0 text-center z-10 pt-4 border-t border-slate-800/50">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
          FactoryOS Mobile (Core)
        </p>
      </div>
    </div>
  );
}


function MenuCard({ title, subtitle, icon: Icon, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`${color} p-3 rounded-2xl h-20 flex items-center gap-3 shadow-xl active:scale-95 transition-transform border border-white/10 relative overflow-hidden group`}
    >
      {/* Background Decor (ปรับขนาดให้เล็กลงตามการ์ด) */}
      <div className="absolute -right-4 -bottom-4 bg-white/10 w-16 h-16 rounded-full group-hover:scale-150 transition-transform"></div>

      <div className="p-2 bg-black/20 rounded-xl backdrop-blur-sm shrink-0 z-10">
        <Icon size={20} className="text-white" />
      </div>

      <div className="text-left min-w-0 z-10">
        <h3 className="text-sm font-bold text-white leading-tight truncate">{title}</h3>
        <p className="text-[9px] text-white/70 font-medium truncate">{subtitle}</p>
      </div>
    </button>
  );
}


// ==========================================
// MAIN COMPONENT
// ==========================================
export default function MobileApp({ currentUser, onLogout }: any) {
  const [activeApp, setActiveApp] = useState<string>("MENU");

  const goBack = () => setActiveApp("MENU");

  return (
    <div className="h-[100dvh] w-full bg-[#0F172A] font-sans overflow-hidden flex flex-col">
      {activeApp === "MENU" && (
        <MobileMenu
          currentUser={currentUser}
          onLogout={onLogout}
          onSelect={setActiveApp}
        />
      )}

      {activeApp === "DAILY_CHECK" && (
        <DailyCheckModule
          currentUser={currentUser}
          activeTab="inspect"
          onExit={goBack}
        />
      )}

      {activeApp === "DAILY_HISTORY" && (
        <DailyCheckModule
          currentUser={currentUser}
          activeTab="data"
          onExit={goBack}
        />
      )}

      {/* หน้าแจ้งซ่อม (Open Jobs) */}
      {activeApp === "MAINTENANCE" && (
        <MaintenanceModule
          currentUser={currentUser}
          activeTab={1}
          onExit={goBack}
        />
      )}

      {/* ✅ หน้ากำลังซ่อม (In Progress Jobs) */}
      {activeApp === "REPAIRING" && (
        <MaintenanceModule
          currentUser={currentUser}
          activeTab={2} // ส่งไป Tab 2 ตาม Logic ของ MaintenanceApp
          onExit={goBack}
        />
      )}

      {/* หน้าตรวจรับงาน (Verify Jobs) */}
      {activeApp === "VERIFY" && (
        <MaintenanceModule
          currentUser={currentUser}
          activeTab={3}
          onExit={goBack}
        />
      )}

      {activeApp === "INVENTORY" && (
        <StockModule
          currentUser={currentUser}
          activeTab="inventory"
          onExit={goBack}
        />
      )}
    </div>
  );
}


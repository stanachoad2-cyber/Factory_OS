import React, { useState } from "react";
import {
  ClipboardCheck,
  Wrench,
  Box,
  UserCheck,
  LogOut,
  Hammer, // เพิ่มไอคอนสำหรับหน้ากำลังซ่อม
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

      {/* Header Profile */}
      <div className="flex justify-between items-center mb-8 z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xl shadow-lg">
            {currentUser?.fullname?.charAt(0) || "U"}
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">
              สวัสดี, {currentUser?.username}
            </h1>
            <p className="text-xs text-slate-400">{currentUser?.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-red-400"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Menu Grid (ปรับเป็น 2 คอลัมน์เหมือนเดิม แต่เพิ่มปุ่มที่ 5) */}
      <div className="grid grid-cols-2 gap-4 z-10">
        <MenuCard
          title="ตรวจเช็ค"
          subtitle="Daily Check"
          icon={ClipboardCheck}
          color="bg-green-600"
          onClick={() => onSelect("DAILY_CHECK")}
        />
        <MenuCard
          title="แจ้งซ่อม"
          subtitle="Request"
          icon={Wrench}
          color="bg-orange-600"
          onClick={() => onSelect("MAINTENANCE")}
        />
        {/* ✅ เพิ่มปุ่มกำลังซ่อม */}
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
        <MenuCard
          title="คลังอะไหล่"
          subtitle="Stock Parts"
          icon={Box}
          color="bg-slate-700"
          onClick={() => onSelect("INVENTORY")}
        />
      </div>

      {/* Footer Info */}
      <div className="mt-auto text-center z-10">
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
      className={`${color} p-4 rounded-3xl h-36 flex flex-col justify-between items-start shadow-xl active:scale-95 transition-transform border border-white/10 relative overflow-hidden group`}
    >
      <div className="absolute -right-4 -bottom-4 bg-white/10 w-20 h-20 rounded-full group-hover:scale-150 transition-transform"></div>
      <div className="p-2 bg-black/20 rounded-xl backdrop-blur-sm">
        <Icon size={24} className="text-white" />
      </div>
      <div className="text-left">
        <h3 className="text-base font-bold text-white leading-none">{title}</h3>
        <p className="text-[10px] text-white/70 mt-1 font-medium">{subtitle}</p>
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

// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "./firebase";
import imageCompression from "browser-image-compression";
import * as XLSX from "xlsx-js-style";
import { ArrowLeft } from "lucide-react"; // ✅ 1. เพิ่ม import
import {
  collection,
  doc,
  onSnapshot, // ✅ ตัวนี้ที่ขาดไปครับ
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  writeBatch,
  getDocs, // เผื่อไว้สำหรับบางฟังก์ชัน
  Timestamp,
  increment,
  setDoc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";

import {
  LayoutDashboard,
  Box,
  Wrench,
  BarChart2,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  AlertTriangle,
  Package,
  RefreshCw,
  LogOut,
  X,
  Save,
  Loader2,
  CheckCircle,
  UploadCloud,
  Tag,
  History,
  PenTool,
  Edit3,
  Settings,
  Calendar,
  User,
  Lock,
  Truck,
  Layers,
  ChevronDown,
  Clock,
  ArrowUpDown,
  Database,
  FileSpreadsheet,
  Globe,
  MapPin,
  ChevronLeft,
  ChangeEvent,
  Filter,
  PanelLeft,
  Square,
  CheckSquare,
  Camera,
  Key,
  FileText,
  ZoomOut,
  ZoomIn,
  item,
  UserCheck,
  Info,
} from "lucide-react";

const CLOUDINARY_CLOUD_NAME = "dmqcyeu9a";
const CLOUDINARY_UPLOAD_PRESET = "Stock_preset";

const getOptimizedUrl = (url: any) => {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", "/upload/w_300,q_auto,f_auto/");
};

// ✅ Helper Check Permission
// ✅ Helper Check Permission (แก้ไขให้รองรับ super_admin)
const checkPerm = (user: any, allowedRoles: string[]) => {
  // อนุญาตทันทีถ้าเป็น Bank, Admin หรือ super_admin
  if (
    user?.username === "Bank" ||
    user?.role === "Admin" ||
    user?.role === "super_admin"
  ) {
    return true;
  }
  return allowedRoles.includes(user?.role);
};
// ✅ Helper เช็คว่าเป็นสินค้านำเข้าหรือไม่ (วางไว้ด้านบนสุดของไฟล์ นอก component)
const checkIsImport = (val: any) => {
  if (val === true) return true;
  if (String(val).toLowerCase() === "true") return true;
  return false;
};
// ==========================================
// FILE: StockApp.tsx (REPLACE 'SettingsView' - 100% Clone from Maintenance)
// ==========================================

// --- 1. Helper Modal (ดีไซน์ Dark Theme แบบหน้าจัดการผู้ใช้) ---
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
    // ถ้า currentUser เป็น null หรือรหัสตรงกัน ให้ผ่าน
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
      {/* ✅ ดีไซน์: Dark Theme / Border Slate / Shadow (เหมือนหน้าจัดการผู้ใช้) */}
      <div className="bg-[#1F1F23] w-full max-w-xs p-6 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="text-center mb-4">
          <div className="w-10 h-10 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Key size={20} />
          </div>
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Input สีมืด */}
        <input
          type="password"
          autoFocus
          value={pass}
          onChange={(e) => {
            setPass(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          className={`w-full bg-[#0F1115] border ${error ? "border-red-500" : "border-slate-700 focus:border-blue-500"
            } rounded-lg px-3 py-2 text-center text-white text-sm outline-none transition-all mb-4 placeholder-slate-600`}
          placeholder="Password"
        />

        {/* ปุ่มสีน้ำเงิน/เทา */}
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
// 1. MODIFIED COMPONENTS WITH PERMISSIONS
// ==========================================

const SidebarItem = ({
  icon: Icon,
  label,
  active,
  onClick,
  notification,
}: any) => (
  <div
    onClick={onClick}
    className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors group ${active
      ? "bg-blue-600 text-white"
      : "text-gray-400 hover:bg-gray-800 hover:text-white"
      }`}
  >
    <div className="flex items-center gap-3">
      <Icon size={20} />
      <span className="font-medium text-sm">{label}</span>
    </div>
    {notification && (
      <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-md">
        {notification}
      </span>
    )}
  </div>
);

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  children,
  valueColor = "text-white",
}: any) => (
  <div className="p-5 rounded-xl border bg-[#1F1F23] border-gray-800 flex flex-col justify-between h-full">
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-gray-400 text-xs mb-1">{title}</p>
          <h3 className={`text-2xl font-bold ${valueColor}`}>{value}</h3>
        </div>
        <div className="p-2 rounded-lg bg-gray-800 text-gray-400">
          <Icon size={20} />
        </div>
      </div>
      {trend && trendValue && (
        <div className="flex items-center gap-2 text-xs mb-3">
          <span
            className={`${trend === "up" ? "text-green-500" : "text-red-500"}`}
          >
            {trend === "up" ? "↗" : "↘"} {trendValue}
          </span>
        </div>
      )}
    </div>
    {children && (
      <div className="mt-4 pt-3 border-t border-gray-700/50">
        <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
          {children}
        </div>
      </div>
    )}
  </div>
);

const ProductCardCompact = ({ item, onAddToCart, currentUser }: any) => {
  const minStock = item.minStock || 0;
  let statusColor = "bg-green-600 text-white border-green-700";
  let statusText = "In stock";
  if (item.quantity === 0) {
    statusColor = "bg-red-600 text-white border-red-700";
    statusText = "Out of stock";
  } else if (minStock > 0 && item.quantity <= minStock) {
    statusColor = "bg-yellow-500 text-black border-yellow-600";
    statusText = "Low stock";
  }

  const isImp = checkIsImport(item.isImport);
  const canOperate =
    currentUser?.username === "Bank" ||
    currentUser?.role === "super_admin" ||
    currentUser?.allowedActions?.includes("stock_operate");

  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-lg overflow-hidden hover:border-blue-500 transition-all group relative flex flex-col shadow-sm hover:shadow-md h-full">
      <div className="aspect-square w-full bg-gray-800 relative overflow-hidden flex items-center justify-center">
        <img
          src={
            getOptimizedUrl(item.image) ||
            "https://via.placeholder.com/300x400?text=Part"
          }
          alt={item.name}
          loading="lazy"
          className="pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            objectFit: "cover",
            objectPosition: `${item.imagePositionX || 50}% ${item.imagePositionY || 50
              }%`,
            width: `${(item.imageScale || 1) * 100}%`,
            height: `${(item.imageScale || 1) * 100}%`,
          }}
        />
        <div className="absolute top-1 left-1">
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shadow-sm ${statusColor}`}
          >
            {statusText}
          </span>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2 bg-[#16181C] flex-1">
        <div className="flex justify-between items-center gap-2">
          <div className="bg-slate-800/50 border border-slate-700 rounded px-2 py-1 flex-1 min-w-0">
            <h3
              className="font-bold text-blue-400 text-xs truncate"
              title={item.name}
            >
              {item.name}
            </h3>
          </div>
          <div className="text-right shrink-0">
            {/* ✅ เพิ่ม .toLocaleString() เพื่อใส่ลูกน้ำหลักพัน */}
            <span className="block font-bold text-blue-400 text-sm">
              ฿{Number(item.price).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 bg-[#0F172A] border border-slate-700 rounded px-1.5 py-0.5 text-[9px] text-slate-400 shrink-0">
            <Tag size={10} /> <span>{item.sku || "-"}</span>
          </div>
          <div className="flex items-center gap-1 bg-[#0F172A] border border-slate-700 rounded px-1.5 py-0.5 text-[9px] text-slate-400 shrink-0">
            <Box size={10} /> <span>{item.department || "Common"}</span>
          </div>
          <div
            className={`flex items-center justify-center w-6 h-5 bg-[#0F172A] border rounded shrink-0 ${isImp
              ? "border-purple-500/30 text-purple-400"
              : "border-green-500/30 text-green-500"
              }`}
            title={isImp ? "Import" : "Local"}
          >
            {isImp ? <Globe size={10} /> : <MapPin size={10} />}
          </div>
          <div className="ml-auto text-[10px] text-slate-400 whitespace-nowrap">
            คงเหลือ:{" "}
            <span
              className={
                item.quantity <= minStock
                  ? "text-red-500 font-bold"
                  : "text-white"
              }
            >
              {item.quantity}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            if (!canOperate)
              return alert("⛔️ คุณไม่มีสิทธิ์เบิกของ (Need 'stock_operate')");
            onAddToCart(item);
          }}
          disabled={item.quantity <= 0 || !canOperate}
          className={`w-full py-1.5 rounded flex items-center justify-center gap-2 transition-colors text-[10px] font-bold overflow-hidden mt-auto ${item.quantity > 0 && canOperate
            ? "bg-green-600 hover:bg-green-500 text-white"
            : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }`}
        >
          <div className="flex items-center -space-x-1">
            <Plus size={14} strokeWidth={3} />
            <ShoppingCart size={16} />
          </div>
          <span className="mt-0.5">เพิ่มลงรถเข็น</span>
        </button>
      </div>
    </div>
  );
};

const ProductCardAdminCompact = ({
  item,
  onAddStock,
  onDelete,
  onEdit,
  currentUser,
}: any) => {
  const minStock = item.minStock || 0;
  let statusColor = "bg-green-600 text-white border-green-700";
  let statusText = "In stock";

  if (item.quantity === 0) {
    statusColor = "bg-red-600 text-white border-red-700";
    statusText = "Out of stock";
  } else if (minStock > 0 && item.quantity <= minStock) {
    statusColor = "bg-yellow-500 text-black border-yellow-600";
    statusText = "Low stock";
  }

  const canManage =
    currentUser?.username === "Bank" ||
    currentUser?.role === "super_admin" ||
    currentUser?.allowedActions?.includes("stock_manage");

  return (
    <div
      onClick={() => {
        if (!canManage)
          return alert(
            "⛔️ คุณไม่มีสิทธิ์แก้ไขข้อมูลสินค้า (Need 'stock_manage')"
          );
        onEdit(item);
      }}
      className="bg-[#1E293B] border border-gray-800 rounded-lg overflow-hidden hover:border-blue-500 transition-all group relative flex flex-col shadow-sm hover:shadow-md cursor-pointer h-full"
    >
      <div className="aspect-square w-full bg-gray-800 relative overflow-hidden flex items-center justify-center">
        <img
          src={item.image || "https://via.placeholder.com/300x400?text=Part"}
          alt={item.name}
          loading="lazy"
          className="pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            objectFit: "cover",
            objectPosition: `${item.imagePositionX || 50}% ${item.imagePositionY || 50
              }%`,
            width: `${(item.imageScale || 1) * 100}%`,
            height: `${(item.imageScale || 1) * 100}%`,
          }}
        />
        <div className="absolute top-1 left-1">
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shadow-sm ${statusColor}`}
          >
            {statusText}
          </span>
        </div>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <div className="bg-black/60 px-3 py-1 rounded-full border border-white/20 text-white text-xs backdrop-blur-sm flex items-center gap-1">
            <Edit3 size={12} /> แก้ไข
          </div>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2 bg-[#16181C] flex-1">
        <div className="flex justify-between items-center gap-2">
          <div className="bg-slate-800/50 border border-slate-700 rounded px-2 py-1 flex-1 min-w-0">
            <h3
              className="font-bold text-blue-400 text-xs truncate"
              title={item.name}
            >
              {item.name}
            </h3>
          </div>
          <div className="text-right shrink-0">
            {/* ✅ ใส่ .toLocaleString() ไว้แล้วเพื่อให้มีลูกน้ำเสมอ */}
            <span className="block font-bold text-blue-400 text-sm">
              ฿{Number(item.price).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 bg-[#0F172A] border border-slate-700 rounded px-1.5 py-0.5 text-[9px] text-slate-400 shrink-0">
            <Tag size={10} /> <span>{item.sku || "-"}</span>
          </div>
          <div className="flex items-center gap-1 bg-[#0F172A] border border-slate-700 rounded px-1.5 py-0.5 text-[9px] text-slate-400 shrink-0">
            <Box size={10} /> <span>{item.department || "Common"}</span>
          </div>
          <div className="ml-auto text-[10px] text-slate-400 whitespace-nowrap">
            คงเหลือ:{" "}
            <span
              className={
                item.quantity <= minStock
                  ? "text-red-500 font-bold"
                  : "text-white"
              }
            >
              {item.quantity}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mt-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!canManage)
                return alert(
                  "⛔️ คุณไม่มีสิทธิ์เติมสต็อก (Need 'stock_manage')"
                );
              onAddStock(item);
            }}
            disabled={!canManage}
            className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors text-[10px] font-bold ${canManage
              ? "bg-green-600 hover:bg-green-500 text-white"
              : "bg-gray-700 text-gray-500 cursor-not-allowed opacity-50"
              }`}
          >
            <Plus size={12} /> เพิ่มสต็อก
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!canManage)
                return alert(
                  "⛔️ คุณไม่มีสิทธิ์ลบสินค้า (Need 'stock_manage')"
                );
              onDelete(item.id, item.name);
            }}
            disabled={!canManage}
            className={`w-8 py-1.5 rounded flex items-center justify-center transition-colors border ${canManage
              ? "bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border-red-500/50"
              : "bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed opacity-50"
              }`}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

const OverviewPage = ({ items }: any) => {
  const lowStockCount = items.filter(
    (i: any) => i.minStock > 0 && i.quantity <= i.minStock
  ).length;
  const totalStockQty = items.reduce(
    (acc: any, curr: any) => acc + (Number(curr.quantity) || 0),
    0
  );
  const totalItemsCount = items.length;
  const totalValue = items.reduce(
    (acc: any, curr: any) => acc + curr.quantity * curr.price,
    0
  );

  const statsByDept = items.reduce((acc: any, item: any) => {
    const deptName = item.department || "ไม่ระบุ";
    if (!acc[deptName]) {
      acc[deptName] = {
        totalValue: 0,
        lowStock: 0,
        totalQty: 0,
        totalItems: 0,
      };
    }
    acc[deptName].totalValue += item.quantity * item.price;
    acc[deptName].totalQty += item.quantity;
    acc[deptName].totalItems += 1;
    if (item.minStock > 0 && item.quantity <= item.minStock) {
      acc[deptName].lowStock += 1;
    }
    return acc;
  }, {});

  const deptList = Object.keys(statsByDept)
    .map((key) => ({ name: key, ...statsByDept[key] }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  const ThaiBahtIcon = ({ size = 20 }) => (
    <span
      style={{
        fontSize: size,
        fontWeight: "bold",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        lineHeight: 1,
      }}
    >
      ฿
    </span>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-stretch">
        <StatCard
          title="Total Stock Value"
          value={`฿${totalValue.toLocaleString()}`}
          valueColor="text-green-400"
          icon={ThaiBahtIcon}
        >
          {deptList.map((dept: any) => (
            <div
              key={dept.name}
              className="flex justify-between items-center text-xs"
            >
              <span className="text-gray-400 truncate w-1/2" title={dept.name}>
                {dept.name}
              </span>
              <span className="text-green-400 font-mono">
                ฿{dept.totalValue.toLocaleString()}
              </span>
            </div>
          ))}
        </StatCard>

        <StatCard
          title="Low Stock Items"
          value={`${lowStockCount} รายการ`}
          valueColor="text-yellow-500"
          icon={AlertTriangle}
          trend={lowStockCount > 0 ? "down" : null}
          trendValue={lowStockCount > 0 ? "ต้องเติมสต็อก" : null}
        >
          {deptList.map((dept: any) =>
            dept.lowStock > 0 ? (
              <div
                key={dept.name}
                className="flex justify-between items-center text-xs"
              >
                <span
                  className="text-gray-400 truncate w-1/2"
                  title={dept.name}
                >
                  {dept.name}
                </span>
                <span className="text-yellow-500 font-bold">
                  {dept.lowStock} รายการ
                </span>
              </div>
            ) : null
          )}
          {lowStockCount === 0 && (
            <div className="text-center text-xs text-gray-600 py-1">
              - ไม่มีรายการแจ้งเตือน -
            </div>
          )}
        </StatCard>

        <StatCard
          title="Total Parts"
          value={`${totalItemsCount.toLocaleString()} รายการ (${totalStockQty.toLocaleString()} ชิ้น)`}
          valueColor="text-green-400"
          icon={Package}
        >
          {deptList.map((dept: any) => (
            <div
              key={dept.name}
              className="flex justify-between items-center text-xs"
            >
              <span className="text-gray-400 truncate w-1/2" title={dept.name}>
                {dept.name}
              </span>
              <span className="text-green-400 font-mono">
                {dept.totalItems} รายการ ({dept.totalQty} ชิ้น)
              </span>
            </div>
          ))}
        </StatCard>
      </div>
    </div>
  );
};

const ProductCardMobile = ({ item, onAddToCart, currentUser }: any) => {
  const minStock = item.minStock || 0;
  const isLowStock =
    item.quantity > 0 && minStock > 0 && item.quantity <= minStock;
  const isOutOfStock = item.quantity <= 0;
  const canOperate =
    currentUser?.username === "Bank" ||
    currentUser?.role === "super_admin" ||
    currentUser?.allowedActions?.includes("stock_operate");

  return (
    <div className="flex md:hidden items-center gap-3 p-2 bg-[#1E293B] border border-gray-800 rounded-xl active:scale-[0.98] transition-transform">
      <div className="w-16 h-16 shrink-0 bg-gray-800 rounded-lg overflow-hidden relative border border-slate-700/50">
        <img
          src={getOptimizedUrl(item.image) || "https://via.placeholder.com/150"}
          className="w-full h-full object-cover"
          alt=""
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[8px] font-bold text-red-400">
            OUT
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-white truncate leading-tight mb-0.5">
          {item.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1 rounded">
            {item.sku}
          </span>
          <span
            className={`text-[10px] font-bold ${isOutOfStock
              ? "text-red-500"
              : isLowStock
                ? "text-yellow-500"
                : "text-emerald-400"
              }`}
          >
            คงเหลือ: {item.quantity}
          </span>
        </div>
      </div>
      <button
        onClick={() => onAddToCart(item)}
        disabled={isOutOfStock || !canOperate}
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${!isOutOfStock && canOperate
          ? "bg-blue-600 text-white shadow-lg"
          : "bg-gray-800 text-gray-600"
          }`}
      >
        <Plus size={20} strokeWidth={3} />
      </button>
    </div>
  );
};

// @ts-nocheck
const InventoryView = ({
  items,
  onWithdraw,
  onReturnItem,
  cart,
  setCart,
  departments,
  currentUser,
}: any) => {
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedOrigin, setSelectedOrigin] = useState("all");
  const [mode, setMode] = useState("withdraw");

  // Modal States
  const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [qtyInput, setQtyInput] = useState(1);
  const [activeTickets, setActiveTickets] = useState<any[]>([]);
  const [itemMode, setItemMode] = useState<"maintenance" | "general">(
    "maintenance"
  );
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [usageReason, setUsageReason] = useState("");

  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(24);

  // Return States
  const [myHistory, setMyHistory] = useState<any[]>([]);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedLogToReturn, setSelectedLogToReturn] = useState<any>(null);
  const [returnQty, setReturnQty] = useState(1);
  const [historyDateFilter, setHistoryDateFilter] = useState("");

  const totalCartPrice = cart.reduce(
    (sum: number, item: any) => sum + (Number(item.price) || 0) * item.cartQty,
    0
  );
  const totalQty = cart.reduce(
    (sum: number, item: any) => sum + item.cartQty,
    0
  );

  const canOperate =
    currentUser?.username === "Bank" ||
    currentUser?.role === "super_admin" ||
    currentUser?.allowedActions?.includes("stock_operate");

  // Load Active Tickets
  useEffect(() => {
    if (mode === "withdraw") {
      const fetchTickets = async () => {
        try {
          const q = query(
            collection(db, "maintenance_tickets"),
            where("status", "in", ["In_Progress", "Waiting_Part"])
          );
          const snap = await getDocs(q);
          const list = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              machine: data.machine_name,
              issue: data.issue_item,
              department: data.department || "-",
              location: data.area || "-",
            };
          });
          setActiveTickets(list);
        } catch (err) {
          console.error(err);
        }
      };
      fetchTickets();
    }
  }, [mode]);

  // Load Return History
  useEffect(() => {
    if (mode === "return" && currentUser) {
      const unsubscribe = db
        .collection("stock_logs")
        .where("userId", "==", currentUser.id)
        .onSnapshot((snapshot: any) => {
          const allLogs = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
          }));
          const outLogsMap: any = {};
          allLogs.forEach((log: any) => {
            if (log.type === "OUT")
              outLogsMap[log.id] = { ...log, netQty: parseInt(log.quantity) };
          });
          allLogs.forEach((log: any) => {
            if (
              log.type === "IN" &&
              log.isReturn &&
              log.refLogId &&
              outLogsMap[log.refLogId]
            ) {
              outLogsMap[log.refLogId].netQty -= parseInt(log.quantity);
            }
          });
          const activeLogs = Object.values(outLogsMap).filter(
            (log: any) => log.netQty > 0
          );
          activeLogs.sort(
            (a: any, b: any) =>
              (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
          );
          setMyHistory(activeLogs);
        });
      return () => unsubscribe();
    }
  }, [mode, currentUser]);

  const filteredItems = items
    .filter((i: any) => {
      const matchesSearch =
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.sku.toLowerCase().includes(search.toLowerCase());
      const matchesDept =
        selectedDept === "all" ? true : i.department === selectedDept;
      const matchesOrigin =
        selectedOrigin === "all"
          ? true
          : selectedOrigin === "import"
            ? i.isImport
            : !i.isImport;
      return matchesSearch && matchesDept && matchesOrigin;
    })
    .sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true }));

  const visibleItems = filteredItems.slice(0, displayLimit);

  const confirmAddToCart = () => {
    if (!selectedItem) return;
    if (qtyInput > selectedItem.quantity)
      return alert(`เบิกเกินสต็อกที่มี (${selectedItem.quantity} ชิ้น)`);
    if (qtyInput < 1) return alert("จำนวนต้องอย่างน้อย 1 ชิ้น");

    let finalTicketId = null,
      finalMachine = "N/A",
      finalReason = "",
      finalDept = selectedItem.department || "-",
      finalLoc = selectedItem.location || "-";

    if (itemMode === "maintenance") {
      if (!selectedTicketId) return alert("กรุณาเลือกใบแจ้งซ่อม");
      const ticket = activeTickets.find((t) => t.id === selectedTicketId);
      finalTicketId = ticket.id;
      finalMachine = ticket.machine;
      finalReason = `${ticket.id} : ${ticket.machine} - ${ticket.issue}`;
      finalDept = ticket.department;
      finalLoc = ticket.location;
    } else {
      if (!usageReason.trim()) return alert("กรุณาระบุเหตุผล");
      finalReason = usageReason;
    }

    setCart([
      ...cart,
      {
        ...selectedItem,
        cartQty: Number(qtyInput),
        jobType: itemMode === "maintenance" ? "Maintenance" : "General",
        refTicketId: finalTicketId,
        refMachine: finalMachine,
        reason: finalReason,
        refDept: finalDept,
        refLoc: finalLoc,
        uiLabel: finalReason,
      },
    ]);
    setIsQtyModalOpen(false);
    setSelectedItem(null);
  };

  const updateCartQty = (idx: number, change: number) => {
    const newCart = [...cart];
    const newQty = newCart[idx].cartQty + change;
    if (newQty > newCart[idx].quantity) return;
    newCart[idx].cartQty = Math.max(1, newQty);
    setCart(newCart);
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col bg-[#0F172A] custom-scrollbar relative z-0">
      <div className="p-4 md:p-6 flex flex-col gap-4 md:gap-6 min-h-full">
        <div className="flex-none">
          <div className="inline-flex p-1.5 bg-[#1F1F23] border border-gray-800 rounded-2xl gap-1 shadow-sm">
            <button
              onClick={() => setMode("withdraw")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${mode === "withdraw"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
                }`}
            >
              เบิกอะไหล่
            </button>
            <button
              onClick={() => setMode("return")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${mode === "return"
                ? "bg-orange-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
                }`}
            >
              คืนอะไหล่
            </button>
          </div>
        </div>

        {mode === "withdraw" ? (
          <>
            {/* Header Desktop */}
            <div className="hidden md:flex items-center justify-between gap-4 animate-in fade-in">
              <div className="flex flex-1 gap-2 max-w-2xl">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="ค้นหาอะไหล่..."
                    value={search}
                    onChange={(e: any) => setSearch(e.target.value)}
                    className="w-full bg-[#1F1F23] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <select
                  value={selectedOrigin}
                  onChange={(e: any) => setSelectedOrigin(e.target.value)}
                  className="w-40 bg-[#1F1F23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="all">ทุกแหล่ง</option>
                  <option value="local">ในประเทศ</option>
                  <option value="import">นำเข้า</option>
                </select>
                <select
                  value={selectedDept}
                  onChange={(e: any) => setSelectedDept(e.target.value)}
                  className="w-48 bg-[#1F1F23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="all">ทุกแผนก</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative pl-2 pb-1">
                <button
                  onClick={() => setIsCartModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-lg flex items-center justify-center shrink-0"
                >
                  <ShoppingCart size={20} />
                </button>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0F1115] shadow-sm">
                    {cart.length}
                  </span>
                )}
              </div>
            </div>

            {/* Header Mobile */}
            <div className="flex md:hidden items-center gap-2 animate-in fade-in">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="ค้นหาอะไหล่..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 bg-[#1F1F23] border border-gray-700 rounded-xl pl-9 pr-2 text-xs text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {/* ✅ เพิ่ม Dropdown แผนกสำหรับมือถือ */}
              <select
                value={selectedDept}
                onChange={(e: any) => setSelectedDept(e.target.value)}
                className="w-24 h-11 bg-[#1F1F23] border border-gray-800 rounded-xl px-2 text-[10px] font-bold text-slate-300 outline-none focus:border-blue-500 transition-all shrink-0"
              >
                <option value="all">ทุกแผนก</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsCartModalOpen(true)}
                className="relative h-11 w-11 shrink-0 bg-blue-600 text-white rounded-xl shadow-lg flex items-center justify-center active:scale-90 transition-transform"
              >
                <ShoppingCart size={20} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0F1115]">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>

            {/* Product Lists */}
            <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-6">
              {visibleItems.map((item: any) => (
                <ProductCardCompact
                  key={item.id}
                  item={item}
                  onAddToCart={(itm: any) => {
                    setSelectedItem(itm);
                    setQtyInput(1);
                    setIsQtyModalOpen(true);
                  }}
                  currentUser={currentUser}
                />
              ))}
            </div>
            <div className="flex md:hidden grid grid-cols-2 gap-x-4 gap-y-2 pb-6">
              {visibleItems.map((item: any) => (
                <ProductCardMobile
                  key={item.id}
                  item={item}
                  onAddToCart={(itm: any) => {
                    setSelectedItem(itm);
                    setQtyInput(1);
                    setIsQtyModalOpen(true);
                  }}
                  currentUser={currentUser}
                />
              ))}
            </div>

            {/* ✅ ส่วนที่เพิ่ม: ปุ่มแสดงเพิ่มเติม */}
            {filteredItems.length > displayLimit && (
              <div className="flex justify-center mt-4 mb-20">
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 24)}
                  className="px-8 py-2.5 bg-[#1F1F23] hover:bg-gray-800 text-slate-400 text-xs font-bold rounded-xl border border-gray-800 transition-all flex items-center gap-2 shadow-lg"
                >
                  <ChevronDown size={14} />
                  แสดงเพิ่มเติม...
                </button>
              </div>
            )}
          </>
        ) : (
          /* --- RETURN MODE --- */
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              <input
                type="date"
                value={historyDateFilter}
                onChange={(e) => setHistoryDateFilter(e.target.value)}
                className="bg-[#1F1F23] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
              />
              {!historyDateFilter && (
                <span className="text-[10px] text-emerald-500 font-bold uppercase">
                  Showing All Pending Items
                </span>
              )}
            </div>
            <div className="bg-[#1F1F23] border border-gray-800 rounded-xl overflow-x-auto shadow-lg">
              <table className="w-full text-left text-sm text-gray-400 table-fixed min-w-[800px] md:min-w-full">
                <thead className="bg-[#000000] text-gray-200 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3 w-1/5 text-left">DATE</th>
                    <th className="px-4 py-3 w-1/5 text-left">PART NAME</th>
                    <th className="px-4 py-3 w-1/5 text-left">QTY (Net)</th>
                    <th className="px-4 py-3 w-1/5 text-left">REASON</th>
                    <th className="px-4 py-3 w-1/5 text-left">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-[#0F1115]">
                  {myHistory
                    .filter((log) => {
                      if (!historyDateFilter) return true;
                      const logDate = log.timestamp?.toDate
                        ? log.timestamp.toDate()
                        : new Date(log.timestamp);
                      return (
                        logDate.toLocaleDateString("en-CA") ===
                        historyDateFilter
                      );
                    })
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-slate-400 text-xs text-left">
                          {log.timestamp?.toDate
                            ? log.timestamp.toDate().toLocaleDateString("th-TH")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-white text-xs font-medium text-left truncate">
                          {log.partName}
                        </td>
                        <td className="px-4 py-3 text-orange-400 font-bold text-left font-mono">
                          {log.netQty}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs truncate text-left">
                          {log.reason}
                        </td>
                        <td className="px-4 py-3 text-left">
                          <button
                            onClick={() => {
                              setSelectedLogToReturn(log);
                              setReturnQty(1);
                              setReturnModalOpen(true);
                            }}
                            className="w-24 bg-orange-600 hover:bg-orange-500 text-white h-7 rounded text-[10px] font-bold shadow-md shadow-orange-900/20"
                          >
                            คืนของ
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {myHistory.length === 0 && (
                <div className="p-10 text-center text-gray-600 text-xs italic">
                  ไม่พบรายการค้างคืน
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      {isQtyModalOpen && mode === "withdraw" && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <h3 className="text-white font-bold text-center mb-1">
              {(selectedItem as any)?.name}
            </h3>
            <p className="text-center text-gray-400 text-xs mb-4">
              {(selectedItem as any)?.sku}
            </p>
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setQtyInput(Math.max(1, qtyInput - 1))}
                className="w-10 h-10 bg-gray-700 rounded-lg text-white font-bold text-xl"
              >
                -
              </button>
              <input
                type="number"
                value={qtyInput}
                onChange={(e) => {
                  let val = parseInt(e.target.value);
                  if (val > selectedItem.quantity) val = selectedItem.quantity;
                  setQtyInput(isNaN(val) ? 0 : val);
                }}
                onBlur={() => {
                  if (qtyInput < 1) setQtyInput(1);
                }}
                className="w-20 bg-transparent text-center text-2xl text-white font-bold outline-none"
              />
              <button
                onClick={() =>
                  setQtyInput(
                    Math.min((selectedItem as any).quantity, qtyInput + 1)
                  )
                }
                className="w-10 h-10 bg-blue-600 rounded-lg text-white font-bold text-xl"
              >
                +
              </button>
            </div>
            <div className="bg-[#0F1115] p-3 rounded-xl border border-gray-800 mb-4">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setItemMode("maintenance")}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${itemMode === "maintenance"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400"
                    }`}
                >
                  🔧 งานซ่อม
                </button>
                <button
                  onClick={() => setItemMode("general")}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${itemMode === "general"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-800 text-gray-400"
                    }`}
                >
                  📝 ทั่วไป
                </button>
              </div>
              {itemMode === "maintenance" ? (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <label className="text-[10px] text-blue-400 mb-1 block font-bold">
                    เลือกใบงาน (กำลังซ่อม) *
                  </label>
                  <select
                    className="w-full bg-[#1E293B] border border-slate-600 text-white text-xs rounded-lg p-2 outline-none"
                    value={selectedTicketId}
                    onChange={(e) => setSelectedTicketId(e.target.value)}
                  >
                    <option value="">-- กรุณาเลือก --</option>
                    {activeTickets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id} : {t.machine} - {t.issue}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <label className="text-[10px] text-orange-400 mb-1 block font-bold">
                    ระบุเหตุผล *
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[#1E293B] border border-slate-600 text-white text-xs rounded-lg p-2 outline-none"
                    placeholder="เช่น ใช้ใน Office..."
                    value={usageReason}
                    onChange={(e) => setUsageReason(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsQtyModalOpen(false)}
                className="py-2 bg-gray-700 text-white rounded font-bold text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmAddToCart}
                className="py-2 bg-blue-600 text-white rounded font-bold text-sm shadow-lg"
              >
                ใส่ตะกร้า
              </button>
            </div>
          </div>
        </div>
      )}

      {isCartModalOpen && mode === "withdraw" && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsCartModalOpen(false)}
            ></div>
            <div className="relative transform overflow-hidden rounded-2xl bg-[#1F1F23] text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-gray-800/50">
              <div className="bg-[#1F1F23] px-6 py-4 border-b border-gray-800 flex items-center justify-between sticky top-0 z-10">
                <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <ShoppingCart className="w-6 h-6 text-green-500" />
                  </div>
                  ยืนยันรายการเบิก
                </h2>
                <button
                  onClick={() => setIsCartModalOpen(false)}
                  className="text-gray-400 hover:text-white p-2 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="px-6 py-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <ShoppingCart size={48} className="mb-4 text-gray-600" />
                    <p className="text-lg">ตะกร้าว่างเปล่า</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#27272A]/80 rounded-xl border border-gray-800/50 hover:border-gray-700 transition-all"
                      >
                        <div className="flex items-start gap-4 mb-4 sm:mb-0 flex-1">
                          {/* ✅ เพิ่มรูปจัตุรัสพร้อมพิกัดในตะกร้า */}
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-black shrink-0 border border-gray-700">
                            <img
                              src={item.image}
                              className="w-full h-full object-cover"
                              style={{
                                objectPosition: `${item.imagePositionX || 50}% ${item.imagePositionY || 50}%`,
                                width: `${(item.imageScale || 1) * 100}%`,
                                height: `${(item.imageScale || 1) * 100}%`,
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-medium text-lg text-white truncate">
                              {item.name}
                            </h4>
                            <div className="mt-2 text-xs p-1.5 bg-black/20 rounded border border-gray-700/50 inline-block text-slate-300">
                              {item.uiLabel}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-5">
                          <div className="flex items-center bg-[#1F1F23] rounded-lg border border-gray-700">
                            <button
                              onClick={() => updateCartQty(idx, -1)}
                              disabled={item.cartQty <= 1}
                              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-l-lg disabled:opacity-30"
                            >
                              <Minus size={18} />
                            </button>
                            <div className="w-12 text-center font-mono text-lg font-medium text-white border-x border-gray-700 py-1">
                              {item.cartQty}
                            </div>
                            <button
                              onClick={() => updateCartQty(idx, 1)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-r-lg"
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                          <button
                            onClick={() =>
                              setCart(
                                cart.filter((_: any, i: number) => i !== idx)
                              )
                            }
                            className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-[#1F1F23] px-6 py-4 border-t border-gray-800 sticky bottom-0">
                <div className="flex justify-between items-center mb-4 bg-[#16181C] p-3 rounded-xl border border-gray-800">
                  <div className="text-sm text-gray-400">
                    รวมทั้งหมด{" "}
                    <span className="text-white font-bold">{totalQty}</span>{" "}
                    รายการ
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-0.5">
                      มูลค่ารวม (Total)
                    </p>
                    <p className="text-2xl font-bold text-green-400 leading-none">
                      ฿{totalCartPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    onClick={() => setIsCartModalOpen(false)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition-colors font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => {
                      onWithdraw(cart);
                      setIsCartModalOpen(false);
                    }}
                    disabled={cart.length === 0}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold shadow-lg disabled:opacity-50"
                  >
                    <CheckCircle size={20} /> ยืนยันการเบิก
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal (คงเดิม) */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <RefreshCw size={20} className="text-orange-500" /> คืนอะไหล่
            </h3>
            <div className="bg-[#0F1115] p-3 rounded-xl border border-gray-800 mb-4 space-y-2">
              <div className="text-white text-sm font-medium">
                {selectedLogToReturn?.partName}
              </div>
              <div className="flex justify-between">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold">ที่เบิกไป</label>
                  <div className="text-orange-400 text-sm font-bold">{selectedLogToReturn?.netQty}</div>
                </div>
                <div className="text-right">
                  <label className="text-[10px] text-gray-500 uppercase font-bold">Ticket ID</label>
                  <div className="text-blue-400 text-xs font-mono font-bold">{selectedLogToReturn?.refTicketId || "-"}</div>
                </div>
              </div>
            </div>
            <div className="mb-6">
              <label className="text-[10px] text-blue-400 mb-1 block font-bold">ระบุจำนวนคืน *</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setReturnQty(Math.max(1, returnQty - 1))} className="w-10 h-10 bg-gray-700 rounded-lg text-white font-bold text-xl">-</button>
                <input type="number" className="flex-1 h-10 bg-[#1E293B] border border-slate-600 text-white text-center rounded-lg outline-none font-bold" value={returnQty} onChange={(e) => setReturnQty(Math.floor(Number(e.target.value)))} />
                <button onClick={() => setReturnQty(Math.min(selectedLogToReturn?.netQty || 1, returnQty + 1))} className="w-10 h-10 bg-blue-600 rounded-lg text-white font-bold text-xl">+</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setReturnModalOpen(false)} className="py-2.5 bg-gray-700 text-white rounded-xl font-bold text-sm">ยกเลิก</button>
              <button onClick={() => onReturnItem(selectedLogToReturn, returnQty, () => setReturnModalOpen(false))} className="py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-900/20">ยืนยันคืน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ✅ Component ใหม่: Dropdown แบบพิมพ์ค้นหาได้ (Searchable)
const SearchableSelect = ({ options, value, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = React.useRef<any>(null);

  // ปิด Dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // หา Label ของค่าที่เลือกอยู่เพื่อมาแสดงใน Input
  const selectedLabel =
    options.find((opt: any) => opt.value === value)?.label || "";

  // กรองรายการตามที่พิมพ์
  const filteredOptions = options.filter((opt: any) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className="w-full bg-[#0B1120] border border-gray-700 rounded-lg flex items-center px-3 h-[42px] cursor-pointer focus-within:border-blue-500 transition-colors"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearchTerm("");
        }}
      >
        <Search size={14} className="text-gray-500 mr-2 shrink-0" />
        <input
          type="text"
          className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-gray-500 cursor-pointer"
          placeholder={selectedLabel || placeholder}
          value={isOpen ? searchTerm : selectedLabel || ""}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <ChevronDown size={14} className="text-gray-500 ml-2 shrink-0" />
      </div>

      {/* รายการที่เด้งลงมา */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-[#1F1F23] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt: any) => (
              <div
                key={opt.value}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors ${value === opt.value
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-xs text-gray-500 text-center">
              ไม่พบรายชื่อ
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AnalyticsView = ({
  items,
  suppliers,
  currentUser,
  onConfirmPassword,
  subTab,
}: any) => {
  // --- States for Filters ---
  const [startDate, setStartDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [endDate, setEndDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );

  // Filter States
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedOrigin, setSelectedOrigin] = useState("all");
  const [selectedPart, setSelectedPart] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("all");

  // --- States for Data ---
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [deadStockList, setDeadStockList] = useState<any[]>([]);
  const [lowStockList, setLowStockList] = useState<any[]>([]);

  const [usersList, setUsersList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // ✅ States for Editing Reason
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // ✅ Access Control: Check Manage Permission
  const canManage =
    currentUser?.username === "Bank" ||
    currentUser?.role === "super_admin" ||
    currentUser?.allowedActions?.includes("stock_manage");

  // --- Sorting ---
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: string;
  } | null>(null);

  // --- Helpers ---
  const getSafeNum = (v: any) => {
    if (v === undefined || v === null || v === "") return 0;
    if (typeof v === "number") return v;
    const n = parseFloat(String(v).replace(/,/g, "").replace(/\s/g, ""));
    return isNaN(n) ? 0 : n;
  };

  const getSafeDate = (ts: any) => {
    try {
      if (!ts) return "-";
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return isNaN(d.getTime())
        ? "-"
        : d.toLocaleString("th-TH", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
    } catch (e) {
      return "-";
    }
  };

  // --- 1. ฟังก์ชันโหลดข้อมูล User และคัดกรองเฉพาะ "ช่าง" ---
  useEffect(() => {
    const unsubUser = db
      .collection("User")
      .onSnapshot((snap) => {
        // ดึงข้อมูลดิบมาก่อน
        const allData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // กรองเอาเฉพาะ "ช่าง" (คนที่มีสิทธิ์ stock_operate หรือเป็น Admin)
        const technicians = allData.filter((u: any) => {
          return (
            u.username === "Bank" ||
            u.role === "Admin" ||
            u.role === "super_admin" ||
            (u.allowedActions && u.allowedActions.includes("stock_operate"))
          );
        });

        setUsersList(technicians);
      });

    const unsubSup = db
      .collection("suppliers")
      .onSnapshot((snap) =>
        setSuppliersList(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      );

    setHasSearched(false);
    setHistoryLogs([]);
    setDeadStockList([]);
    setLowStockList([]);
    setSortConfig(null);
    setSelectedPart("");
    setSelectedSupplier("all");
    setSelectedOrigin("all");
    setEditingId(null);

    return () => {
      unsubUser();
      unsubSup();
    };
  }, [subTab]);

  useEffect(() => {
    if (subTab === "supplier") setSelectedSupplier("all");
  }, [selectedOrigin, subTab]);

  // ✅ Update Reason Function
  const handleUpdateReason = async (logId: string) => {
    if (!canManage) return alert("⛔️ คุณไม่มีสิทธิ์แก้ไขข้อมูล");
    try {
      setIsProcessing(true);
      await updateDoc(doc(db, "stock_logs", logId), {
        reason: editValue,
      });
      setEditingId(null);
      await handleSearch();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteLog = (logId: string, partName: string) => {
    onConfirmPassword(
      "ยืนยันการลบประวัติ (Admin)",
      `⚠️ คำเตือน: คุณกำลังจะลบประวัติของ "${partName}"\nการลบนี้จะลบแค่ "Log" เท่านั้น (จำนวนสต็อกจริงจะไม่เปลี่ยน)\n\nยืนยันที่จะลบหรือไม่?`,
      async () => {
        try {
          setIsProcessing(true);
          await deleteDoc(doc(db, "stock_logs", logId));
          await handleSearch();
          alert("✅ ลบข้อมูลเรียบร้อยแล้ว");
        } catch (error: any) {
          console.error("Delete Error:", error);
          alert("เกิดข้อผิดพลาด: " + error.message);
        } finally {
          setIsProcessing(false);
        }
      }
    );
  };

  // --- Summary Calculations ---
  const historySummary = useMemo(() => {
    const dataList =
      subTab === "deadstock"
        ? deadStockList
        : subTab === "lowstock"
          ? lowStockList
          : historyLogs;
    return dataList.reduce(
      (acc, item) => {
        acc.count++;
        let qty = 0,
          val = 0;
        if (subTab === "deadstock" || subTab === "lowstock") {
          qty = getSafeNum(item.quantity);
          val = getSafeNum(item.quantity) * getSafeNum(item.price);
        } else if (subTab === "supplier") {
          qty = getSafeNum(item.quantity);
          val = getSafeNum(item.totalValue);
        } else {
          qty =
            item.netQty !== undefined
              ? getSafeNum(item.netQty)
              : getSafeNum(item.quantity);
          val =
            item.netTotalValue !== undefined
              ? getSafeNum(item.netTotalValue)
              : getSafeNum(item.totalValue);
        }
        acc.qty += Math.abs(qty);
        acc.value += val;
        return acc;
      },
      { count: 0, qty: 0, value: 0 }
    );
  }, [historyLogs, deadStockList, lowStockList, subTab]);

  const handleSort = (key: string) => {
    let direction = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    let data =
      subTab === "deadstock"
        ? [...deadStockList]
        : subTab === "lowstock"
          ? [...lowStockList]
          : [...historyLogs];
    if (sortConfig !== null) {
      data.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        if (
          [
            "quantity",
            "totalValue",
            "netQty",
            "netTotalValue",
            "minStock",
          ].includes(sortConfig.key)
        ) {
          aValue = getSafeNum(aValue);
          bValue = getSafeNum(bValue);
        }
        if (["timestamp", "updatedAt"].includes(sortConfig.key)) {
          aValue = aValue?.toDate ? aValue.toDate() : new Date(aValue || 0);
          bValue = bValue?.toDate ? bValue.toDate() : new Date(bValue || 0);
        }
        return aValue < bValue
          ? sortConfig.direction === "ascending"
            ? -1
            : 1
          : sortConfig.direction === "ascending"
            ? 1
            : -1;
      });
    }
    return data;
  };
  const sortedData = useMemo(
    () => getSortedData(),
    [historyLogs, deadStockList, lowStockList, sortConfig]
  );

  const handleExportExcel = () => {
    try {
      if (typeof XLSX === "undefined")
        return alert("Error: ไม่พบ Library 'xlsx-js-style'");

      if (
        (subTab === "deadstock" && deadStockList.length === 0) ||
        (subTab === "lowstock" && lowStockList.length === 0) ||
        (subTab !== "deadstock" &&
          subTab !== "lowstock" &&
          historyLogs.length === 0)
      ) {
        return alert("ไม่พบข้อมูลที่จะ Export");
      }

      let dataToExport: any[] = [];
      let fileName = "Export";

      const safeDateStr = (ts: any) => {
        try {
          if (!ts) return "-";
          const d = ts.toDate ? ts.toDate() : new Date(ts);
          return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-CA");
        } catch (e) {
          return "-";
        }
      };

      const safeTimeStr = (ts: any) => {
        try {
          if (!ts) return "-";
          const d = ts.toDate ? ts.toDate() : new Date(ts);
          return isNaN(d.getTime()) ? "-" : d.toLocaleTimeString("th-TH");
        } catch (e) {
          return "-";
        }
      };

      if (subTab === "deadstock") {
        dataToExport = deadStockList.map((item) => ({
          PartName: item.name,
          SKU: item.sku,
          Department: item.department || "-",
          Location: item.location || "-",
          LastActivity: safeDateStr(item.updatedAt),
          StockBalance: getSafeNum(item.quantity),
          UnitPrice: getSafeNum(item.price),
          TotalValue: getSafeNum(item.quantity) * getSafeNum(item.price),
          Origin: item.isImport ? "Import" : "Local",
        }));
        fileName = `DeadStock_${startDate}_${endDate}`;
      } else if (subTab === "lowstock") {
        dataToExport = lowStockList.map((item) => ({
          PartName: item.name,
          SKU: item.sku,
          Department: item.department || "-",
          Location: item.location || "-",
          OnHand: getSafeNum(item.quantity),
          MinStock: getSafeNum(item.minStock),
          UnitPrice: getSafeNum(item.price),
          Origin: item.isImport ? "Import" : "Local",
          Status: "LOW STOCK",
        }));
        fileName = `LowStock_${new Date().toLocaleDateString("en-CA")}`;
      } else if (subTab === "supplier") {
        dataToExport = historyLogs.map((log) => {
          const d = log.timestamp?.toDate
            ? log.timestamp.toDate()
            : new Date(log.timestamp);
          return {
            Date: safeDateStr(log.timestamp),
            Time: safeTimeStr(log.timestamp),
            Year: isNaN(d.getTime()) ? "-" : d.getFullYear(),
            Month: isNaN(d.getTime()) ? "-" : d.getMonth() + 1,
            Supplier: log.supplier,
            PartName: log.partName,
            SKU: log.sku,
            Quantity: getSafeNum(log.quantity),
            UnitPrice: getSafeNum(log.price),
            TotalValue: getSafeNum(log.totalValue),
            ReceivedBy: log.userName,
            Origin: log.isImport ? "Import" : "Local",
            Reason: log.reason || "-",
          };
        });
        fileName = `Supplier_Report_${startDate}_${endDate}`;
      } else {
        dataToExport = historyLogs.map((log) => {
          const masterItem = items.find((i: any) => i.id === log.partId) || {};
          const isEntry =
            String(log.type || "")
              .trim()
              .toUpperCase() === "IN";
          const d = log.timestamp?.toDate
            ? log.timestamp.toDate()
            : new Date(log.timestamp);
          const finalDept = isEntry
            ? "-"
            : log.ticketDept && log.ticketDept !== "-"
              ? log.ticketDept
              : masterItem.department || "-";
          let excelReason = log.reason || "-";
          if (log.jobType === "Maintenance") {
            if (excelReason.includes(" : "))
              excelReason = excelReason.split(" : ")[1];
            if (
              log.refMachine &&
              excelReason.startsWith(`${log.refMachine} - `)
            )
              excelReason = excelReason.replace(`${log.refMachine} - `, "");
            else if (excelReason.includes(" - "))
              excelReason = excelReason.substring(
                excelReason.indexOf(" - ") + 3
              );
          }
          let finalJobType = log.jobType || "General";
          if (isEntry) {
            const dbJobType = String(log.jobType || "")
              .toLowerCase()
              .replace(/\s/g, "");
            finalJobType = [
              "addpart",
              "newpart",
              "addstock",
              "newitem",
              "initial",
            ].includes(dbJobType)
              ? "AddPart"
              : "Restock";
          }
          return {
            Date: safeDateStr(log.timestamp),
            Time: safeTimeStr(log.timestamp),
            Year: isNaN(d.getTime()) ? "-" : d.getFullYear(),
            Month: isNaN(d.getTime()) ? "-" : d.getMonth() + 1,
            Type: log.type,
            PartName: log.partName,
            SKU: log.sku,
            Department: finalDept,
            Location:
              log.ticketLoc && log.ticketLoc !== "-"
                ? log.ticketLoc
                : masterItem.location || "-",
            Qty:
              log.netQty !== undefined
                ? getSafeNum(log.netQty)
                : getSafeNum(log.quantity),
            UnitPrice: getSafeNum(log.price),
            TotalValue:
              log.netTotalValue !== undefined
                ? getSafeNum(log.netTotalValue)
                : getSafeNum(log.totalValue),
            JobType: finalJobType,
            Machine: log.refMachine || "-",
            TicketID: log.refTicketId || "-",
            Reason: excelReason,
            User: log.userName,
            Supplier: masterItem.supplier || "-",
            Origin: log.isImport ? "Import" : "Local",
          };
        });
        fileName = `${subTab}_${startDate}_${endDate}`;
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      ws["!cols"] = Array(
        dataToExport.length > 0 ? Object.keys(dataToExport[0]).length : 0
      ).fill({ wch: 25 });
      if (ws["!ref"]) ws["!autofilter"] = { ref: ws["!ref"] };
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "StockData");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" });
      const s2ab = (s: any) => {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
        return buf;
      };
      const blob = new Blob([s2ab(wbout)], {
        type: "application/octet-stream",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleSearch = async () => {
    setIsProcessing(true);
    setHasSearched(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (subTab === "lowstock") {
        setLowStockList(
          items.filter(
            (i: any) => i.minStock > 0 && getSafeNum(i.quantity) <= i.minStock
          )
        );
        setIsProcessing(false);
        return;
      }
      const logSnap = await db
        .collection("stock_logs")
        .where("timestamp", ">=", start)
        .where("timestamp", "<=", end)
        .orderBy("timestamp", "desc")
        .get();
      const rawLogs = logSnap.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (subTab === "deadstock") {
        const activePartIds = new Set();
        rawLogs.forEach((log: any) => {
          if (log.type === "OUT") activePartIds.add(log.partId);
        });
        setDeadStockList(
          items.filter((item: any) => {
            if (activePartIds.has(item.id)) return false;
            if (getSafeNum(item.quantity) <= 0) return false;
            const isImp =
              String(item.isImport).toLowerCase() === "true" ||
              item.isImport === true;
            if (selectedOrigin === "import" && !isImp) return false;
            if (selectedOrigin === "local" && isImp) return false;
            return true;
          })
        );
      } else if (subTab === "supplier") {
        const enrichedLogs = rawLogs.map((log: any) => {
          const masterItem = items.find((i: any) => i.id === log.partId);
          return {
            ...log,
            supplier: masterItem?.supplier || log.supplier || "-",
          };
        });
        setHistoryLogs(
          enrichedLogs.filter((log: any) => {
            const isImp =
              String(log.isImport).toLowerCase() === "true" ||
              log.isImport === true;
            const originMatch =
              selectedOrigin === "all"
                ? true
                : selectedOrigin === "import"
                  ? isImp
                  : !isImp;
            const supplierMatch =
              selectedSupplier === "all"
                ? true
                : log.supplier === selectedSupplier;
            return (
              log.type === "IN" && !log.isReturn && supplierMatch && originMatch
            );
          })
        );
      } else {
        const outLogsMap: any = {};
        const otherLogs: any[] = [];
        const returnLogs: any[] = [];
        rawLogs.forEach((log: any) => {
          const qty = getSafeNum(log.quantity);
          const val = getSafeNum(log.totalValue);
          if (log.type === "OUT") {
            outLogsMap[log.id] = { ...log, netQty: qty, netTotalValue: val };
          } else if (log.type === "IN" && log.isReturn) {
            returnLogs.push({ ...log, quantity: qty });
          } else {
            if (subTab === "database")
              otherLogs.push({ ...log, netQty: qty, netTotalValue: val });
          }
        });
        returnLogs.forEach((retLog: any) => {
          if (retLog.refLogId && outLogsMap[retLog.refLogId]) {
            const parent = outLogsMap[retLog.refLogId];
            parent.netQty -= retLog.quantity;
            const price =
              getSafeNum(parent.price) ||
              (parent.netQty > 0
                ? parent.netTotalValue / (parent.netQty + retLog.quantity)
                : 0);
            parent.netTotalValue = parent.netQty * price;
          }
        });
        const combinedLogs = [...Object.values(outLogsMap), ...otherLogs];
        const filteredList = combinedLogs.filter((log: any) => {
          const userMatch =
            selectedUser === "all"
              ? true
              : (log.userName || "") === selectedUser;
          const isImp =
            String(log.isImport).toLowerCase() === "true" ||
            log.isImport === true;
          const originMatch =
            selectedOrigin === "all"
              ? true
              : selectedOrigin === "import"
                ? isImp
                : !isImp;
          let partMatch = true;
          if (subTab === "parts" && selectedPart && selectedPart !== "all") {
            partMatch = log.partName
              ?.toLowerCase()
              .includes(selectedPart.toLowerCase());
          }
          if (log.netQty <= 0) return false;
          if (subTab === "database") return partMatch;
          return userMatch && originMatch && partMatch;
        });
        filteredList.sort(
          (a: any, b: any) => b.timestamp.seconds - a.timestamp.seconds
        );
        setHistoryLogs(filteredList);
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    }
    setIsProcessing(false);
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortConfig?.key !== colKey)
      return <ArrowUpDown size={12} className="text-slate-600 opacity-50" />;
    return sortConfig.direction === "ascending" ? (
      <ArrowUpDown
        size={12}
        className="text-blue-400 rotate-180 transition-transform"
      />
    ) : (
      <ArrowUpDown size={12} className="text-blue-400" />
    );
  };

  const StatsCards = () => (
    <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
      <div className="flex flex-col justify-center items-center h-[36px] px-3 bg-[#0F1115] border border-gray-700 rounded-lg min-w-[70px]">
        <span className="text-[9px] text-gray-400 uppercase">
          {subTab === "deadstock" || subTab === "lowstock" ? "Items" : "Trans."}
        </span>
        <span className="text-xs font-bold text-white leading-none">
          {historySummary.count.toLocaleString()}
        </span>
      </div>
      <div className="flex flex-col justify-center items-center h-[36px] px-3 bg-[#0F1115] border border-gray-700 rounded-lg min-w-[70px]">
        <span className="text-[9px] text-gray-400 uppercase">Qty</span>
        <span className="text-xs font-bold text-orange-400 leading-none">
          {historySummary.qty.toLocaleString()}
        </span>
      </div>
      <div className="flex flex-col justify-center items-center h-[36px] px-3 bg-[#0F1115] border border-green-500/30 rounded-lg min-w-[90px] relative overflow-hidden">
        <div className="absolute inset-0 bg-green-500/10"></div>
        <span className="text-[9px] text-green-400 uppercase relative z-10">
          Value
        </span>
        <span className="text-xs font-bold text-green-400 leading-none relative z-10">
          ฿{historySummary.value.toLocaleString()}
        </span>
      </div>
    </div>
  );

  // ✅ New Helper Component: Reason Cell with Specific Restriction Logic
  const ReasonCell = ({ row }: { row: any }) => {
    const isEditing = editingId === row.id;
    const displayValue = row.reason || "-";

    // 🚩🚩🚩 เงื่อนไขแก้ไข: ต้องมีสิทธิ์จัดการสินค้า และต้องเป็นรายการขาเข้า (IN) ที่ไม่ใช่การคืนของ 🚩🚩🚩
    const canEditThisRow = canManage && row.type === "IN" && !row.isReturn;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input
            className="flex-1 bg-[#0F172A] border border-blue-500 rounded px-2 py-1 text-[10px] text-white outline-none"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleUpdateReason(row.id)}
          />
          <button
            onClick={() => handleUpdateReason(row.id)}
            className="text-green-500 hover:text-green-400"
          >
            <CheckCircle size={14} />
          </button>
          <button
            onClick={() => setEditingId(null)}
            className="text-red-500 hover:text-red-400"
          >
            <X size={14} />
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between group/reason">
        <span className="truncate" title={displayValue}>
          {displayValue}
        </span>
        {canEditThisRow && (
          <button
            onClick={() => {
              setEditingId(row.id);
              setEditValue(row.reason || "");
            }}
            className="opacity-0 group-hover/reason:opacity-100 text-blue-400 hover:text-blue-300 p-1 transition-opacity"
          >
            <Edit3 size={12} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full bg-[#0F172A] text-white overflow-hidden animate-in fade-in duration-300 flex-col">
      {subTab === "database" && (
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#0F172A] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1E293B] rounded-lg p-1 border border-slate-700">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-white outline-none px-2 cursor-pointer"
              />
              <span className="text-slate-500 text-xs">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-white outline-none px-2 cursor-pointer"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
            >
              {isProcessing ? (
                <RefreshCw className="animate-spin" size={14} />
              ) : (
                <Search size={14} />
              )}{" "}
              ค้นหา
            </button>
            <button
              onClick={handleExportExcel}
              disabled={historyLogs.length === 0}
              className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
          </div>
          {hasSearched && <StatsCards />}
        </div>
      )}

      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        {subTab !== "database" && (
          <div className="flex flex-col gap-4 h-full">
            <div className="bg-[#1E293B] p-3 rounded-xl border border-slate-700 shadow-sm flex flex-wrap items-center gap-3">
              {subTab === "issued" && (
                <div className="flex items-center gap-2 bg-[#0F1115] rounded-lg px-3 py-1.5 border border-slate-700">
                  <User size={14} className="text-slate-400 shrink-0" />
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="bg-transparent text-xs text-white outline-none w-[140px] cursor-pointer"
                  >
                    <option value="all" className="bg-[#1E293B]">
                      All Technicians
                    </option>
                    {usersList.map((u: any) => (
                      <option
                        key={u.id}
                        value={u.fullname || u.username}
                        className="bg-[#1E293B]"
                      >
                        {u.fullname || u.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {subTab === "parts" && (
                <div className="flex items-center gap-2 bg-[#0F1115] rounded-lg px-3 py-1.5 border border-slate-700 relative group min-w-[200px]">
                  <Box size={14} className="text-slate-400 shrink-0" />
                  <input
                    list="part-options"
                    type="text"
                    placeholder="Type part name..."
                    value={selectedPart}
                    onChange={(e) => setSelectedPart(e.target.value)}
                    className="bg-transparent text-xs text-white outline-none w-full placeholder:text-slate-600"
                  />
                  <datalist id="part-options">
                    <option value="all">All Parts</option>
                    {items.map((item: any) => (
                      <option key={item.id} value={item.name} />
                    ))}
                  </datalist>
                  {selectedPart && (
                    <button
                      onClick={() => setSelectedPart("")}
                      className="text-slate-600 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}
              {subTab === "supplier" && (
                <div className="flex items-center gap-2 bg-[#0F1115] rounded-lg px-3 py-1.5 border border-slate-700">
                  <Truck size={14} className="text-slate-400 shrink-0" />
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="bg-transparent text-xs text-white outline-none w-[140px] cursor-pointer"
                  >
                    <option value="all" className="bg-[#1E293B]">
                      All Suppliers
                    </option>
                    {suppliersList.map((s: any) => (
                      <option
                        key={s.id}
                        value={s.name}
                        className="bg-[#1E293B]"
                      >
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {subTab !== "lowstock" && (
                <>
                  <div className="flex items-center gap-2 bg-[#0F1115] rounded-lg px-3 py-1.5 border border-slate-700">
                    <Globe size={14} className="text-slate-400 shrink-0" />
                    <select
                      value={selectedOrigin}
                      onChange={(e) => setSelectedOrigin(e.target.value)}
                      className="bg-transparent text-xs text-white outline-none w-[90px] cursor-pointer"
                    >
                      <option value="all" className="bg-[#1E293B]">
                        All Origins
                      </option>
                      <option value="local" className="bg-[#1E293B]">
                        Local
                      </option>
                      <option value="import" className="bg-[#1E293B]">
                        Import
                      </option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 bg-[#0F1115] rounded-lg px-3 py-1.5 border border-slate-700">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-xs text-white outline-none cursor-pointer w-[90px]"
                    />
                    <span className="text-slate-500 text-xs">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent text-xs text-white outline-none cursor-pointer w-[90px]"
                    />
                  </div>
                </>
              )}
              <button
                onClick={handleSearch}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Search size={14} />
                )}{" "}
                Search
              </button>
              <button
                onClick={handleExportExcel}
                disabled={
                  (!hasSearched && subTab !== "lowstock") ||
                  (subTab === "deadstock" && deadStockList.length === 0) ||
                  (subTab === "lowstock" && lowStockList.length === 0)
                }
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95 ml-auto"
              >
                <FileSpreadsheet size={14} /> Export Excel
              </button>
              {hasSearched && <StatsCards />}
            </div>

            <div className="flex-1 bg-[#1E293B]/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-lg mt-4">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead className="bg-[#020617] sticky top-0 z-10 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                    <tr>
                      {subTab === "supplier" ? (
                        <>
                          <th
                            onClick={() => handleSort("supplier")}
                            className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Supplier <SortIcon colKey="supplier" />
                          </th>
                          <th
                            onClick={() => handleSort("partName")}
                            className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Part Name <SortIcon colKey="partName" />
                          </th>
                          <th
                            onClick={() => handleSort("quantity")}
                            className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Quantity <SortIcon colKey="quantity" />
                          </th>
                          <th
                            onClick={() => handleSort("userName")}
                            className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Received By <SortIcon colKey="userName" />
                          </th>
                          <th
                            onClick={() => handleSort("timestamp")}
                            className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Date <SortIcon colKey="timestamp" />
                          </th>
                          <th
                            onClick={() => handleSort("totalValue")}
                            className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Value <SortIcon colKey="totalValue" />
                          </th>
                          <th
                            onClick={() => handleSort("reason")}
                            className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Reason <SortIcon colKey="reason" />
                          </th>
                        </>
                      ) : subTab === "parts" ? (
                        <>
                          <th
                            onClick={() => handleSort("partName")}
                            className="p-3 text-left w-[16.6%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Part Name <SortIcon colKey="partName" />
                          </th>
                          <th
                            onClick={() => handleSort("quantity")}
                            className="p-3 text-left w-[16.6%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Net Qty <SortIcon colKey="quantity" />
                          </th>
                          <th
                            onClick={() => handleSort("reason")}
                            className="p-3 text-left w-[16.6%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Reason <SortIcon colKey="reason" />
                          </th>
                          <th
                            onClick={() => handleSort("userName")}
                            className="p-3 text-left w-[16.6%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Issued By <SortIcon colKey="userName" />
                          </th>
                          <th
                            onClick={() => handleSort("timestamp")}
                            className="p-3 text-left w-[16.6%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Issue Date <SortIcon colKey="timestamp" />
                          </th>
                          <th
                            onClick={() => handleSort("totalValue")}
                            className="p-3 text-left w-[16.6%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Net Value <SortIcon colKey="totalValue" />
                          </th>
                        </>
                      ) : subTab === "deadstock" ? (
                        <>
                          <th
                            onClick={() => handleSort("name")}
                            className="p-3 text-left w-[25%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Part Name <SortIcon colKey="name" />
                          </th>
                          <th className="p-3 text-left w-[25%] truncate">
                            Last Issue
                          </th>
                          <th
                            onClick={() => handleSort("quantity")}
                            className="p-3 text-left w-[25%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Stock Balance <SortIcon colKey="quantity" />
                          </th>
                          <th
                            onClick={() => handleSort("totalValue")}
                            className="p-3 text-left w-[25%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Total Value <SortIcon colKey="totalValue" />
                          </th>
                        </>
                      ) : subTab === "lowstock" ? (
                        <>
                          <th
                            onClick={() => handleSort("name")}
                            className="p-3 text-left w-[25%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Part Name <SortIcon colKey="name" />
                          </th>
                          <th
                            onClick={() => handleSort("quantity")}
                            className="p-3 text-left w-[25%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            On Hand <SortIcon colKey="quantity" />
                          </th>
                          <th
                            onClick={() => handleSort("minStock")}
                            className="p-3 text-left w-[25%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Min Stock <SortIcon colKey="minStock" />
                          </th>
                          <th className="p-3 text-left w-[25%] truncate">
                            Status
                          </th>
                        </>
                      ) : (
                        <>
                          <th
                            onClick={() => handleSort("userName")}
                            className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Technician <SortIcon colKey="userName" />
                          </th>
                          <th
                            onClick={() => handleSort("partName")}
                            className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Part Name <SortIcon colKey="partName" />
                          </th>
                          <th
                            onClick={() => handleSort("quantity")}
                            className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Net Qty <SortIcon colKey="quantity" />
                          </th>
                          <th
                            onClick={() => handleSort("reason")}
                            className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Reason <SortIcon colKey="reason" />
                          </th>
                          <th
                            onClick={() => handleSort("timestamp")}
                            className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Date <SortIcon colKey="timestamp" />
                          </th>
                          <th
                            onClick={() => handleSort("totalValue")}
                            className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                          >
                            Net Value <SortIcon colKey="totalValue" />
                          </th>
                          <th className="p-3 text-left w-[14.28%] truncate">
                            Origin
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {!hasSearched && subTab !== "lowstock" ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-20 text-slate-600"
                        >
                          Please select filters and press "Search"
                        </td>
                      </tr>
                    ) : sortedData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-20 text-slate-600"
                        >
                          No records found.
                        </td>
                      </tr>
                    ) : (
                      sortedData.map((row: any, idx: number) => (
                        <tr
                          key={row.id || idx}
                          className="hover:bg-slate-800/50 transition-colors"
                        >
                          {subTab === "supplier" ? (
                            <>
                              <td className="p-3 text-left font-bold text-white truncate">
                                {row.supplier}
                              </td>
                              <td className="p-3 text-left text-blue-400 truncate">
                                {row.partName}
                              </td>
                              <td className="p-3 text-left font-mono font-bold truncate text-green-400">
                                +{Number(row.quantity)}
                              </td>
                              <td className="p-3 text-left text-slate-300 truncate">
                                {row.userName}
                              </td>
                              <td className="p-3 text-left text-slate-400 truncate">
                                {new Date(
                                  row.timestamp?.toDate
                                    ? row.timestamp.toDate()
                                    : row.timestamp
                                ).toLocaleString("th-TH")}
                              </td>
                              <td className="p-3 text-left font-mono text-green-400 font-bold truncate">
                                ฿{Number(row.totalValue || 0).toLocaleString()}
                              </td>
                              <td className="p-3 text-left text-slate-300 truncate font-medium">
                                <ReasonCell row={row} />
                              </td>
                            </>
                          ) : subTab === "parts" ? (
                            <>
                              <td className="p-3 text-left text-blue-400 truncate">
                                {row.partName}
                              </td>
                              <td className="p-3 text-left font-mono font-bold truncate text-orange-400">
                                {row.netQty}
                              </td>
                              <td className="p-3 text-left text-slate-300 truncate font-medium">
                                <ReasonCell row={row} />
                              </td>
                              <td className="p-3 text-left font-bold text-white truncate">
                                {row.userName}
                              </td>
                              <td className="p-3 text-left text-slate-400 truncate">
                                {new Date(
                                  row.timestamp?.toDate
                                    ? row.timestamp.toDate()
                                    : row.timestamp
                                ).toLocaleString("th-TH")}
                              </td>
                              <td className="p-3 text-left font-mono text-green-400 font-bold truncate">
                                ฿
                                {Number(
                                  row.netTotalValue || 0
                                ).toLocaleString()}
                              </td>
                            </>
                          ) : subTab === "deadstock" ? (
                            <>
                              <td className="p-3 text-left text-white font-bold truncate">
                                {row.name}
                              </td>
                              <td className="p-3 text-left text-slate-500 truncate">
                                -
                              </td>
                              <td className="p-3 text-left font-mono text-orange-400 font-bold truncate">
                                {row.quantity}
                              </td>
                              <td className="p-3 text-left font-mono text-green-400 font-bold truncate">
                                ฿{(row.quantity * row.price).toLocaleString()}
                              </td>
                            </>
                          ) : subTab === "lowstock" ? (
                            <>
                              <td className="p-3 text-left text-white font-bold truncate">
                                {row.name}
                              </td>
                              <td className="p-3 text-left font-mono text-red-500 font-bold truncate">
                                {row.quantity}
                              </td>
                              <td className="p-3 text-left font-mono text-slate-400 truncate">
                                {row.minStock}
                              </td>
                              <td className="p-3 text-left">
                                <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-[9px] font-bold border border-red-500/50">
                                  LOW STOCK
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-3 text-left font-bold text-white truncate">
                                {row.userName}
                              </td>
                              <td className="p-3 text-left text-blue-400 truncate">
                                {row.partName}
                              </td>
                              <td className="p-3 text-left font-mono font-bold truncate text-orange-400">
                                {row.netQty}
                              </td>
                              <td className="p-3 text-left text-slate-300 truncate font-medium">
                                <ReasonCell row={row} />
                              </td>
                              <td className="p-3 text-left text-slate-400 truncate">
                                {new Date(
                                  row.timestamp?.toDate
                                    ? row.timestamp.toDate()
                                    : row.timestamp
                                ).toLocaleString("th-TH")}
                              </td>
                              <td className="p-3 text-left font-mono text-green-400 font-bold truncate">
                                ฿
                                {Number(
                                  row.netTotalValue || 0
                                ).toLocaleString()}
                              </td>
                              <td className="p-3 text-left truncate">
                                <span
                                  className={`px-2 py-0.5 rounded text-[9px] border ${row.isImport
                                    ? "border-purple-500/30 text-purple-400 bg-purple-500/10"
                                    : "border-gray-500/30 text-gray-400 bg-gray-500/10"
                                    }`}
                                >
                                  {row.isImport ? "IMPORT" : "LOCAL"}
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {subTab === "database" && (
          <div className="flex-1 bg-[#1E293B]/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-lg">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-[#020617] sticky top-0 z-10 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                  <tr>
                    <th
                      onClick={() => handleSort("timestamp")}
                      className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-1">
                        Timestamp <SortIcon colKey="timestamp" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("type")}
                      className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-1">
                        Type <SortIcon colKey="type" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("partName")}
                      className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-1">
                        Part Name <SortIcon colKey="partName" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("quantity")}
                      className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-1">
                        Qty <SortIcon colKey="quantity" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("userName")}
                      className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-1">
                        User <SortIcon colKey="userName" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("reason")}
                      className="p-3 text-left w-[14.28%] truncate cursor-pointer hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-1">
                        Reason <SortIcon colKey="reason" />
                      </div>
                    </th>
                    <th className="p-3 text-left w-[14.28%] truncate">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs">
                  {sortedData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-20 text-slate-600"
                      >
                        No records.
                      </td>
                    </tr>
                  ) : (
                    sortedData.map((row: any, idx: number) => (
                      <tr
                        key={row.id || idx}
                        className="hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="p-3 text-left text-slate-400 truncate">
                          {new Date(
                            row.timestamp?.toDate
                              ? row.timestamp.toDate()
                              : row.timestamp
                          ).toLocaleString()}
                        </td>
                        <td className="p-3 text-left">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.type === "OUT"
                              ? "bg-orange-500/20 text-orange-400"
                              : row.type === "IN"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-blue-500/20 text-blue-400"
                              }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="p-3 text-left text-white truncate">
                          {row.partName}
                        </td>
                        <td
                          className={`p-3 text-left font-mono font-bold truncate ${row.type === "OUT"
                            ? "text-orange-400"
                            : "text-green-400"
                            }`}
                        >
                          {row.type === "OUT" ? "-" : "+"}
                          {getSafeNum(
                            row.netQty !== undefined ? row.netQty : row.quantity
                          )}
                        </td>
                        <td className="p-3 text-left text-slate-300 truncate">
                          {row.userName}
                        </td>
                        <td className="p-3 text-left text-slate-300 truncate font-medium">
                          <ReasonCell row={row} />
                        </td>
                        <td className="p-3 text-left">
                          <button
                            onClick={() =>
                              handleDeleteLog(row.id, row.partName)
                            }
                            className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-1.5 rounded transition-colors group"
                            title="ลบประวัติ"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export function StockSettingsSidebar({
  activeTab,
  onTabChange,
  onBack,
  onToggle,
  isOpen,
}: any) {
  const tabs = [
    { id: "suppliers", label: "จัดการ Suppliers", icon: Truck },
    { id: "departments", label: "จัดการแผนก (Stock)", icon: Layers },
  ];

  return (
    <div
      className={`flex flex-col h-full bg-[#0F172A] text-white relative overflow-hidden shadow-2xl transition-all duration-300 z-50 shrink-0 ${isOpen ? "w-72" : "w-[70px]"
        }`}
    >
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>

      <div
        className={`shrink-0 z-10 relative transition-all ${isOpen ? "p-6" : "p-2 pt-4 flex flex-col items-center"
          }`}
      >
        {/* ✅ ปุ่ม Toggle: Fixed Position */}
        <button
          onClick={onToggle}
          className="absolute top-6 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer rounded-lg p-2 hover:bg-white/10 z-20"
        >
          <PanelLeft size={20} />
        </button>

        {isOpen && (
          <div className="animate-in fade-in duration-300">
            <button
              onClick={onBack}
              className="flex items-center gap-3 text-slate-400 hover:text-white transition-all group w-full mb-8 cursor-pointer pr-8"
            >
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 group-hover:bg-blue-600 group-hover:border-blue-500 shadow-lg transition-all group-hover:scale-110">
                <ChevronLeft size={20} />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-blue-300 leading-none mb-0.5">
                  Back to
                </span>
                <span className="text-sm font-black tracking-wide text-slate-300 group-hover:text-white leading-none">
                  STOCK
                </span>
              </div>
            </button>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                  Configuration
                </p>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight leading-none">
                SETTINGS
              </h2>
              <div className="h-1.5 w-16 bg-gradient-to-r from-slate-600 to-slate-400 mt-4 rounded-full"></div>
            </div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar z-10 pb-32 animate-in fade-in">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`w-full group relative flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all duration-300 cursor-pointer ${isActive
                  ? "bg-blue-600 border-blue-500 text-white shadow-lg translate-x-1"
                  : "bg-[#1E293B]/50 border-transparent text-slate-400 hover:bg-[#1E293B] hover:border-slate-600 hover:text-white"
                  }`}
              >
                <div
                  className={`rounded-lg transition-transform duration-300 group-hover:scale-[1.2] ${isActive
                    ? "bg-white/20 p-1.5"
                    : "bg-black/20 group-hover:bg-black/40 p-1.5"
                    }`}
                >
                  <t.icon
                    size={18}
                    className={isActive ? "animate-pulse" : ""}
                  />
                </div>
                <span className="font-bold text-sm block flex-1 text-left truncate">
                  {t.label}
                </span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]"></div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- 2. Main View (Maintenance Table Layout + Dark Modal) ---
const SettingsView = ({
  subTab,
  suppliers,
  departments,
  onAddSupplier,
  onDeleteSupplier,
  onAddDepartment,
  onDeleteDepartment,
  currentUser,
}: any) => {
  const [newItemName, setNewItemName] = useState("");
  const [isImport, setIsImport] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal States
  const [showGuard, setShowGuard] = useState(false);
  const [guardMessage, setGuardMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<() => void>(() => { });

  const activeTabInfo =
    subTab === "suppliers"
      ? { label: "จัดการ Suppliers", icon: Truck }
      : { label: "จัดการแผนก", icon: Layers };

  const items = subTab === "suppliers" ? suppliers : departments;

  const filteredItems = items.filter((item: any) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!newItemName.trim()) return alert("กรุณากรอกข้อมูล");

    const action = () => {
      if (subTab === "suppliers") {
        onAddSupplier(newItemName, isImport);
      } else {
        onAddDepartment(newItemName);
      }
      setNewItemName("");
      setIsImport(false);
    };

    setGuardMessage(`ยืนยันการเพิ่ม: "${newItemName}"`);
    setPendingAction(() => action);
    setShowGuard(true);
  };

  const handleDelete = (item: any) => {
    const action = () => {
      if (subTab === "suppliers") {
        onDeleteSupplier(item.id);
      } else {
        onDeleteDepartment(item.id);
      }
    };

    setGuardMessage(
      `ยืนยันการลบ: "${item.name}"\n(การกระทำนี้ไม่สามารถกู้คืนได้)`
    );
    setPendingAction(() => action);
    setShowGuard(true);
  };

  return (
    <div className="flex-1 h-full overflow-hidden relative flex flex-col bg-[#0F172A] animate-in fade-in duration-300">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header Section */}
      <div className="px-6 pt-6 pb-2 z-10 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-900/20 flex items-center justify-center text-white border border-blue-400/20">
            {React.createElement(activeTabInfo.icon, { size: 20 })}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">
              {activeTabInfo.label}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold bg-slate-800/50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50 uppercase tracking-wider">
                Master Data
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 pb-6 pt-0 flex-1 flex flex-col overflow-hidden z-10 w-full max-w-[1600px]">
        <div className="bg-slate-900/60 backdrop-blur-md p-3 rounded-xl border border-slate-800/60 flex flex-wrap gap-3 items-center justify-between mb-4 shadow-xl shrink-0">
          <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto flex-1">
            <div className="flex-1 min-w-[250px]">
              <input
                className="w-full bg-[#0B1121] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none h-[34px] placeholder-slate-600"
                placeholder={`ระบุชื่อ ${activeTabInfo.label}...`}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>

            {subTab === "suppliers" && (
              <button
                onClick={() => setIsImport(!isImport)}
                className={`h-[34px] px-3 rounded-lg flex items-center gap-1.5 border transition-all ${isImport
                  ? "bg-blue-500/10 border-blue-500 text-blue-400"
                  : "bg-[#0B1121] border-slate-700 text-slate-500 hover:text-slate-300"
                  }`}
                title="ระบุว่าเป็น Supplier นำเข้า"
              >
                <div
                  className={`w-3 h-3 rounded-full border ${isImport
                    ? "bg-blue-500 border-blue-500"
                    : "border-slate-500"
                    }`}
                ></div>
                <span className="text-[10px] font-bold whitespace-nowrap uppercase">
                  {isImport ? "IMPORT" : "LOCAL"}
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

        {/* Table Section */}
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
                      className={`px-4 py-2 border-b border-slate-800 ${subTab === "suppliers" ? "w-[67%]" : "w-[82%]"
                        }`}
                    >
                      Name
                    </th>
                    {subTab === "suppliers" && (
                      <th className="px-4 py-2 w-[15%] text-center border-b border-slate-800">
                        Type
                      </th>
                    )}
                    <th className="px-4 py-2 w-[10%] text-center border-b border-slate-800">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-12 text-center text-xs text-slate-600"
                      >
                        No data found
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item: any, idx: number) => (
                      <tr key={item.id} className="hover:bg-blue-600/5 group">
                        <td className="px-4 py-1.5 text-center font-mono">
                          {(idx + 1).toString().padStart(2, "0")}
                        </td>
                        <td className="px-4 py-1.5 text-slate-300 group-hover:text-white truncate">
                          <div className="flex items-center gap-2">
                            <span>{item.name}</span>
                          </div>
                        </td>
                        {subTab === "suppliers" && (
                          <td className="px-4 py-1.5 text-center">
                            <span
                              className={`px-1.5 rounded font-mono font-bold text-[10px] ${item.isImport
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-green-500/10 text-green-400 border border-green-500/20"
                                }`}
                            >
                              {item.isImport ? "IMPORT" : "LOCAL"}
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-[#0B1121] px-4 py-1.5 border-t border-slate-800 flex justify-between items-center text-[9px] text-slate-600 uppercase font-bold tracking-widest shrink-0">
            <span>
              DB: <span className="text-green-500">Online</span>
            </span>
            <span>
              Count:{" "}
              <span className="text-slate-300">{filteredItems.length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Helper Modal Call */}
      <ConfirmActionModal
        isOpen={showGuard}
        onClose={() => setShowGuard(false)}
        onConfirm={pendingAction}
        title="ยืนยันการทำรายการ"
        message={guardMessage}
        currentUser={currentUser}
      />
    </div>
  );
};

const AddStockModal = ({
  isOpen,
  onClose,
  item,
  onConfirm,
  suppliers = [],
}: any) => {
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(item?.price || 0);
  const [supplier, setSupplier] = useState(item?.supplier || "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Dropdown States
  const [showSupplierList, setShowSupplierList] = useState(false);
  const supplierRef = useRef<HTMLDivElement>(null);

  // Debug: เช็คข้อมูล
  useEffect(() => {
    if (isOpen) {
      console.log("📦 ข้อมูล Suppliers ที่ได้รับ:", suppliers);
    }
  }, [isOpen, suppliers]);

  // Reset ค่าเมื่อเปิด Modal
  useEffect(() => {
    if (isOpen && item) {
      setQty(1);
      setPrice(item.price || 0);
      setSupplier(item.supplier || "");
      setNote("");
      setShowSupplierList(false);
    }
  }, [isOpen, item]);

  // ปิด Dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (supplierRef.current && !supplierRef.current.contains(event.target)) {
        setShowSupplierList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [supplierRef]);

  if (!isOpen || !item) return null;

  const handleSubmit = async () => {
    if (qty <= 0) return alert("จำนวนต้องมากกว่า 0");
    if (!supplier || !supplier.trim())
      return alert("กรุณาระบุชื่อร้านค้า/ผู้จำหน่าย");

    setSubmitting(true);
    try {
      await onConfirm(item, qty, Number(price), supplier, note);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error adding stock");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSuppliers = (suppliers || []).filter((s: any) => {
    const sName = s?.name || "";
    const search = supplier || "";
    return sName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#020617]/80 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Card Container 
          🔥 แก้ไข: ลบ overflow-hidden ออก และเปลี่ยนเป็น overflow-visible 
      */}
      <div className="bg-[#0F172A] w-full max-w-md rounded-3xl border border-slate-800 shadow-2xl shadow-black/50 flex flex-col relative h-auto max-h-[90vh] overflow-visible">
        {/* --- 1. Product Header --- */}
        <div className="p-6 pb-4 flex gap-5 items-center relative z-10 shrink-0">
          <div className="w-20 h-20 bg-[#1E293B] rounded-2xl border border-slate-700/50 p-1 shrink-0 shadow-lg shadow-blue-900/10">
            <img
              src={item.image || "https://via.placeholder.com/150"}
              alt={item.name}
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-cyan-500/10 text-cyan-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-cyan-500/20">
                {item.sku || "NO SKU"}
              </span>
            </div>
            <h3 className="text-white font-bold text-lg leading-tight truncate mb-1">
              {item.name}
            </h3>
            <p className="text-slate-400 text-xs flex items-center gap-2">
              <Box size={12} /> {item.department || "General"}
              <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
              <span>
                คงเหลือ:{" "}
                <span className="text-emerald-400 font-bold font-mono text-sm">
                  {item.quantity}
                </span>
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white flex items-center justify-center transition-all z-20"
          >
            <X size={18} />
          </button>
        </div>

        {/* --- 2. Input Form --- 
            🔥 แก้ไข: เปลี่ยน overflow-y-auto เป็น overflow-visible เพื่อให้ลูกเด้งทะลุได้
            หากหน้าจอยาวเกินไป ให้ใช้ padding bottom แทนการตัดจบ
        */}
        <div className="px-6 py-2 space-y-5 flex-1 overflow-visible">
          {/* Quantity */}
          <div className="bg-[#1E293B]/50 p-4 rounded-2xl border border-slate-800/50">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></div>
                จำนวนที่จะเพิ่ม
              </label>
              <span className="text-[10px] text-slate-500">
                หน่วย: {item.unit || "PCS"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-12 h-12 rounded-xl bg-[#0F172A] border border-slate-700 hover:border-emerald-500/50 hover:text-emerald-400 text-slate-400 flex items-center justify-center transition-all active:scale-95"
              >
                <Minus size={20} />
              </button>
              <div className="flex-1 h-12 bg-[#0F172A] border border-slate-700 rounded-xl flex items-center justify-center relative overflow-hidden focus-within:border-emerald-500 transition-colors">
                <input
                  type="number"
                  className="w-full h-full bg-transparent text-center text-2xl font-bold text-white outline-none z-10 font-mono"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                />
              </div>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-12 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 flex items-center justify-center transition-all active:scale-95"
              >
                <Plus size={24} />
              </button>
            </div>
          </div>

          {/* Supplier Dropdown */}
          <div className="space-y-1.5 relative" ref={supplierRef}>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 pl-1">
              <Truck size={14} className="text-violet-400" /> ผู้จำหน่าย
              (Supplier)
            </label>
            <div className="relative group">
              <input
                type="text"
                className="w-full h-12 bg-[#1E293B] border border-slate-700 rounded-xl px-4 text-white text-sm outline-none focus:border-violet-500 transition-all placeholder-slate-600 shadow-sm"
                placeholder="พิมพ์ชื่อร้าน หรือเลือกจากรายการ..."
                value={supplier}
                onChange={(e) => {
                  setSupplier(e.target.value);
                  setShowSupplierList(true);
                }}
                onFocus={() => setShowSupplierList(true)}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-violet-400 transition-colors">
                <ChevronDown size={16} />
              </div>
            </div>

            {/* Dropdown List 
                🔥 แก้ไข: เพิ่ม z-index ให้สูงขึ้น และใช้ absolute พ่นออกมา
            */}
            {showSupplierList && (
              <div className="absolute top-full left-0 w-full mt-1 bg-[#1E293B] border border-slate-700 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-h-48 overflow-y-auto custom-scrollbar z-[100] animate-in fade-in slide-in-from-top-2 duration-150">
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((s: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSupplier(s.name);
                        setShowSupplierList(false);
                      }}
                      className="px-4 py-3 text-sm text-slate-300 hover:bg-violet-600 hover:text-white cursor-pointer border-b border-slate-800 last:border-0 transition-colors flex justify-between items-center"
                    >
                      <span>{s.name}</span>
                      {s.isImport && (
                        <span className="text-[9px] bg-black/30 px-1.5 py-0.5 rounded text-violet-300">
                          IMPORT
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500 text-center italic cursor-default">
                    {suppliers.length === 0
                      ? "ยังไม่มีข้อมูล Supplier ในระบบ"
                      : "ไม่พบชื่อร้าน (กดบันทึกเพื่อใช้ชื่อนี้)"}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row 3: Price & Note */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 pl-1">
                <Tag size={14} className="text-orange-400" /> ต้นทุน/หน่วย
              </label>
              <div className="relative h-12 bg-[#1E293B] border border-slate-700 rounded-xl overflow-hidden focus-within:border-orange-500 transition-colors">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  ฿
                </span>
                <input
                  type="number"
                  className="w-full h-full bg-transparent pl-8 pr-4 text-white text-right font-mono text-base outline-none"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 pl-1">
                <FileText size={14} className="text-blue-400" /> หมายเหตุ
              </label>
              <div className="relative h-12 bg-[#1E293B] border border-slate-700 rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors">
                <input
                  type="text"
                  className="w-full h-full bg-transparent px-4 text-white text-sm outline-none"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- 3. Footer --- */}
        <div className="p-6 pt-4 shrink-0 overflow-visible relative z-0">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-900/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {submitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <span className="uppercase tracking-widest text-xs">
                  Confirm Stock In
                </span>
                <CheckCircle size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// NEW ManagementView (With Excel Import/Export)
// ==========================================
const ManagementView = ({
  items,
  onOpenAddStock,
  onAddStockDirectly,
  onDeletePart,
  onEditPart,
  departments,
  suppliers,
  currentUser,
  onOpenAudit,
}: any) => {
  const [localSearch, setLocalSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedOrigin, setSelectedOrigin] = useState("all");
  const [displayLimit, setDisplayLimit] = useState(24);

  // State สำหรับการ Import ไฟล์
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------
  // 📥 ฟังก์ชัน 1: ดาวน์โหลดแบบฟอร์ม (Template)
  // ---------------------------------------------
  const handleDownloadTemplate = () => {
    try {
      // ข้อมูลตัวอย่างในไฟล์ Excel
      const templateData = [
        {
          Name: "สว่านไฟฟ้า (ตัวอย่าง)",
          SKU: "TOOL-001",
          Category: departments[0]?.name || "General",
          Supplier: suppliers[0]?.name || "Store A",
          Quantity: 10,
          Price: 1500,
          MinStock: 5,
          IsImport: "FALSE",
        },
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);

      // จัดความกว้างคอลัมน์
      ws["!cols"] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");

      // สร้างไฟล์และสั่งดาวน์โหลด
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Stock_Import_Template.xlsx";
      link.click();
    } catch (e) {
      alert("ไม่สามารถดาวน์โหลดได้ กรุณาลองใหม่");
    }
  };

  // ---------------------------------------------
  // 📥 ฟังก์ชัน 2: นำเข้าไฟล์ Excel (Import Logic)
  // ---------------------------------------------
  const handleProcessImportExcel = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    // รีเซ็ตค่า input เพื่อให้เลือกไฟล์เดิมซ้ำได้
    setTimeout(() => {
      e.target.value = "";
    }, 100);

    const reader = new FileReader();
    reader.onload = async (evt: any) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const sheetName = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);

        if (data.length === 0) return alert("ไฟล์ Excel ว่างเปล่า!");

        // เตรียมข้อมูลเช็คความถูกต้อง
        const validDepts = new Set(departments.map((d: any) => d.name));
        const existSKUs = new Set(items.map((i: any) => i.sku?.toLowerCase()));
        const existNames = new Set(
          items.map((i: any) => i.name?.toLowerCase())
        );

        let errors: string[] = [];
        let skusInFile = new Set();

        // วนลูปตรวจสอบทีละแถว
        data.forEach((row: any, idx: number) => {
          const r = idx + 2;
          const sku = String(row.SKU || "").trim();
          const name = String(row.Name || "").trim();

          if (!name || !sku) errors.push(`แถว ${r}: ขาดชื่อสินค้า หรือ SKU`);

          if (
            existSKUs.has(sku.toLowerCase()) ||
            skusInFile.has(sku.toLowerCase())
          ) {
            errors.push(`แถว ${r}: SKU '${sku}' มีแล้วในระบบ หรือซ้ำในไฟล์`);
          }

          if (existNames.has(name.toLowerCase())) {
            errors.push(`แถว ${r}: ชื่อสินค้า '${name}' มีแล้วในระบบ`);
          }

          if (!validDepts.has(row.Category)) {
            errors.push(`แถว ${r}: หมวดหมู่ '${row.Category}' ไม่มีในระบบ`);
          }

          const impVal = String(row.IsImport).toUpperCase();
          if (!["TRUE", "FALSE"].includes(impVal)) {
            errors.push(`แถว ${r}: IsImport ต้องเป็น TRUE หรือ FALSE`);
          }

          skusInFile.add(sku.toLowerCase());
        });

        if (errors.length > 0) {
          return alert(
            `⛔ พบข้อผิดพลาด (ยกเลิกการนำเข้า):\n\n${errors
              .slice(0, 10)
              .join("\n")}\n...`
          );
        }

        if (
          !confirm(
            `ตรวจสอบผ่าน ✅\nยืนยันนำเข้าสินค้าใหม่ ${data.length} รายการ?`
          )
        )
          return;

        setIsProcessing(true);
        const batch = writeBatch(db); // ใช้ Batch เขียนทีเดียว

        data.forEach((row: any) => {
          const newRef = doc(collection(db, "spare_parts"));
          const rowData = {
            name: String(row.Name).trim(),
            sku: String(row.SKU).trim(),
            quantity: Number(row.Quantity) || 0,
            price: Number(row.Price) || 0,
            minStock: Number(row.MinStock) || 0,
            unit: "pcs",
            department: row.Category,
            supplier: row.Supplier || "",
            isImport: String(row.IsImport).toUpperCase() === "TRUE",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            image: null,
          };
          batch.set(newRef, rowData);
        });

        await batch.commit();
        alert("✅ นำเข้าข้อมูลสำเร็จ!");
      } catch (err: any) {
        console.error(err);
        alert("เกิดข้อผิดพลาด: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Filter Items Logic (คงเดิม)
  const filteredItems = items
    .filter((item: any) => {
      const matchesSearch =
        item.name.toLowerCase().includes(localSearch.toLowerCase()) ||
        (item.sku &&
          item.sku.toLowerCase().includes(localSearch.toLowerCase()));
      const matchesDept =
        selectedDept === "all" ? true : item.department === selectedDept;
      return matchesSearch && matchesDept;
    })
    .sort((a: any, b: any) =>
      (a.sku || "").localeCompare(b.sku || "", undefined, { numeric: true })
    );

  return (
    <div className="flex-1 p-6 overflow-hidden flex flex-col relative animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
        {/* Search Bar */}
        <div className="flex flex-1 gap-2 w-full md:max-w-2xl">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              size={18}
            />
            <input
              type="text"
              placeholder="ค้นหาอะไหล่..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-[#1F1F23] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none"
            />
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-[#1F1F23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
          >
            <option value="all">ทุกแผนก</option>
            {departments.map((d: any) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons Group */}
        <div className="flex gap-2">
          {/* ปุ่ม Check Stock เดิม */}
          <button
            onClick={onOpenAudit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold transition-all active:scale-95"
          >
            <CheckSquare size={18} /> Check Stock
          </button>

          {/* ✅ ปุ่มดาวน์โหลดเทมเพลต (ใหม่) */}
          <button
            onClick={handleDownloadTemplate}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
            title="ดาวน์โหลดแบบฟอร์ม Excel"
          >
            <FileSpreadsheet size={16} /> แบบฟอร์ม
          </button>

          {/* ✅ ปุ่ม Import Excel (ใหม่) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold disabled:opacity-50 transition-all active:scale-95"
          >
            {isProcessing ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <UploadCloud size={18} />
            )}
            Import
          </button>

          {/* ปุ่ม Add Manual เดิม */}
          <button
            onClick={onOpenAddStock}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-all active:scale-95"
            title="เพิ่มสินค้าทีละรายการ"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredItems.slice(0, displayLimit).map((item: any) => (
            <ProductCardAdminCompact
              key={item.id}
              item={item}
              onDelete={onDeletePart}
              onEdit={onEditPart}
              currentUser={currentUser}
              onAddStock={(itm: any) => onAddStockDirectly(itm)}
            />
          ))}
        </div>

        {filteredItems.length > displayLimit && (
          <div className="flex justify-center mt-6 mb-10">
            <button
              onClick={() => setDisplayLimit((prev) => prev + 24)}
              className="px-6 py-2 bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 text-sm"
            >
              แสดงเพิ่มเติม...
            </button>
          </div>
        )}
      </div>

      {/* ✅ Input File ที่ซ่อนอยู่ (สำหรับ Import) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleProcessImportExcel}
        accept=".xlsx, .xls"
        className="hidden"
      />
    </div>
  );
};

const AuditView = ({ items, departments, onBack, currentUser }: any) => {
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [historyData, setHistoryData] = useState<any>({});
  const [deptClosingInfo, setDeptClosingInfo] = useState<any>({});

  const ADMIN_PIN = "1234";
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth() + 1;
  const currentMonthKey = `${currentYear}-${String(currentMonthIndex).padStart(
    2,
    "0"
  )}`;

  const monthsEng = [
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
  const currentMonthName = monthsEng[currentDate.getMonth()];

  useEffect(() => {
    const fetchYearlyHistory = async () => {
      try {
        const historyMap: any = {};
        const closingInfoMap: any = {};

        const lastYearDecKey = `${currentYear - 1}-12`;
        const bfSnap = await getDocs(
          query(
            collection(db, "monthly_closings"),
            where("monthKey", "==", lastYearDecKey)
          )
        );
        if (!bfSnap.empty) {
          const data = bfSnap.docs[0].data();
          const map: any = {};
          data.items.forEach((i: any) => (map[i.id] = i.quantity));
          historyMap["B/F"] = map;
        }

        const yearSnap = await getDocs(
          query(
            collection(db, "monthly_closings"),
            where("monthKey", ">=", `${currentYear}-01`),
            where("monthKey", "<=", `${currentYear}-12`)
          )
        );

        yearSnap.forEach((doc) => {
          const data = doc.data();
          const map: any = {};
          data.items.forEach((i: any) => (map[i.id] = i.quantity));
          historyMap[data.monthKey] = map;
          closingInfoMap[data.monthKey] = data.deptClosings || {};
        });

        setHistoryData(historyMap);
        setDeptClosingInfo(closingInfoMap);
      } catch (err) {
        console.error("Fetch History Error", err);
      }
    };
    fetchYearlyHistory();
  }, [currentYear, currentMonthKey]);

  const filteredItems = items
    .filter((i: any) => {
      if (selectedDept === "" || selectedDept === "all") return false;
      const matchesDept = i.department === selectedDept;
      const matchesSearch =
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.sku && i.sku.toLowerCase().includes(search.toLowerCase()));
      return matchesDept && matchesSearch;
    })
    .sort((a: any, b: any) =>
      (a.sku || "").localeCompare(b.sku || "", undefined, { numeric: true })
    );

  const handleCheckStock = async () => {
    if (!selectedDept) return alert("❌ กรุณาเลือกแผนก");
    if (!confirm(`📦 ยืนยันบันทึกสต็อกแผนก "${selectedDept}" ?`)) return;
    const pin = prompt("🔒 Admin PIN:");
    if (pin !== ADMIN_PIN) return alert("❌ PIN ผิด!");

    setIsSaving(true);
    try {
      const docRef = doc(db, "monthly_closings", currentMonthKey);
      const docSnap = await getDoc(docRef);
      const newSnapshots = filteredItems.map((item: any) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        department: item.department,
      }));

      let finalItems = [];
      let currentDeptClosings = {};
      if (docSnap.exists()) {
        const data = docSnap.data();
        finalItems = (data.items || []).filter(
          (i: any) => i.department !== selectedDept
        );
        finalItems = [...finalItems, ...newSnapshots];
        currentDeptClosings = data.deptClosings || {};
      } else {
        finalItems = newSnapshots;
      }

      const updatedDeptClosings = {
        ...currentDeptClosings,
        [selectedDept]: {
          closedBy: currentUser?.fullname || "Admin",
          closedAt: new Date().toLocaleString("th-TH", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      };

      await setDoc(docRef, {
        monthKey: currentMonthKey,
        monthLabel: `${currentMonthName}-${currentYear}`,
        items: finalItems,
        deptClosings: updatedDeptClosings,
        closedAt: serverTimestamp(),
      });

      const newMap: any = {};
      finalItems.forEach((i: any) => (newMap[i.id] = i.quantity));
      setHistoryData((prev: any) => ({ ...prev, [currentMonthKey]: newMap }));
      setDeptClosingInfo((prev: any) => ({
        ...prev,
        [currentMonthKey]: updatedDeptClosings,
      }));
      alert(`✅ บันทึกสต็อกแผนก ${selectedDept} เรียบร้อย!`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUncheck = async () => {
    if (!selectedDept) return alert("❌ กรุณาเลือกแผนก");
    if (!confirm(`🔓 ยืนยันยกเลิกการเช็คสต็อกของแผนก "${selectedDept}"?`))
      return;
    const pin = prompt("🔒 Enter Admin PIN:");
    if (pin !== ADMIN_PIN) return alert("❌ PIN ผิด!");

    setIsSaving(true);
    try {
      const docRef = doc(db, "monthly_closings", currentMonthKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const remainingItems = (data.items || []).filter(
          (i: any) => i.department !== selectedDept
        );
        const remainingClosings = { ...(data.deptClosings || {}) };
        delete remainingClosings[selectedDept];

        if (remainingItems.length === 0) {
          await deleteDoc(docRef);
          setHistoryData((prev: any) => {
            const n = { ...prev };
            delete n[currentMonthKey];
            return n;
          });
          setDeptClosingInfo((prev: any) => {
            const n = { ...prev };
            delete n[currentMonthKey];
            return n;
          });
        } else {
          await setDoc(docRef, {
            ...data,
            items: remainingItems,
            deptClosings: remainingClosings,
          });
          const newMap: any = {};
          remainingItems.forEach((i: any) => (newMap[i.id] = i.quantity));
          setHistoryData((prev: any) => ({
            ...prev,
            [currentMonthKey]: newMap,
          }));
          setDeptClosingInfo((prev: any) => ({
            ...prev,
            [currentMonthKey]: remainingClosings,
          }));
        }
        alert(`✅ Uncheck แผนก ${selectedDept} สำเร็จ!`);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Export Excel (หัวข้อ & Balance เขียวพาสเทล + เส้นตารางรอบทิศ + ชิดซ้าย)
  const handleExportExcel = () => {
    try {
      const activeMonths: any[] = [];
      if (historyData["B/F"])
        activeMonths.push({ key: "B/F", label: `B/F (${currentYear - 1})` });
      for (let i = 1; i <= 12; i++) {
        const key = `${currentYear}-${String(i).padStart(2, "0")}`;
        if (deptClosingInfo[key] && deptClosingInfo[key][selectedDept])
          activeMonths.push({ key, label: monthsEng[i - 1] });
      }

      const dataToExport = filteredItems.map((item: any) => {
        const row: any = { SKU: item.sku, PartName: item.name };
        activeMonths.forEach((col) => {
          const qty = historyData[col.key]
            ? historyData[col.key][item.id]
            : undefined;
          row[col.label] = qty === 0 || qty === undefined ? "-" : qty;
        });
        row["BALANCE"] = item.quantity === 0 ? "-" : item.quantity;
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();

      const wscols = [
        { wch: 15 },
        { wch: 45 },
        ...activeMonths.map(() => ({ wch: 15 })),
        { wch: 15 },
      ];
      ws["!cols"] = wscols;

      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      const pastelGreen = { rgb: "E2EFDA" };
      // เส้นตารางแบบบาง (Thin Border)
      const borderStyle = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[addr]) continue;

          ws[addr].s = {
            alignment: { horizontal: "left", vertical: "center" },
            font: { name: "Calibri", sz: 11 },
            border: borderStyle,
          };

          if (R === 0 || (C === range.e.c && R > 0)) {
            ws[addr].s.fill = { fgColor: pastelGreen };
            ws[addr].s.font.bold = true;
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "AuditData");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Audit_${selectedDept}_${currentYear}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const isCurrentDeptClosed = !!(
    deptClosingInfo[currentMonthKey] &&
    deptClosingInfo[currentMonthKey][selectedDept]
  );

  return (
    <div className="flex-1 p-4 overflow-hidden flex flex-col bg-[#0F172A] animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-4 border-b border-slate-700/50 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckSquare className="text-emerald-500" size={20} />
              Yearly Audit ({currentYear})
            </h2>
            <p className="text-[10px] text-slate-400">
              Period:{" "}
              <span className="text-emerald-400 font-bold">
                {currentMonthName} {currentYear}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="bg-green-700 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          {isCurrentDeptClosed ? (
            <button
              onClick={handleUncheck}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <X size={14} />
              )}{" "}
              Uncheck
            </button>
          ) : (
            <button
              onClick={handleCheckStock}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <CheckCircle size={14} />
              )}{" "}
              Check Stock
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-3">
        <div className="relative w-[300px]">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
            size={14}
          />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-[#1E293B] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="bg-[#1E293B] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none w-[150px]"
        >
          <option value="">-- Select Dept --</option>
          {departments.map((d: any) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table Area */}
      <div className="flex-1 border border-slate-700/50 rounded-lg overflow-auto bg-[#1E293B] shadow-xl">
        <div className="custom-scrollbar w-auto min-w-0">
          <table className="text-left border-collapse whitespace-nowrap table-fixed">
            <thead className="bg-[#020617] sticky top-0 z-50 text-[10px] uppercase text-slate-400 font-bold tracking-widest border-b border-slate-700">
              <tr>
                <th className="px-3 py-2 w-[80px] border-r border-slate-700/50 text-left">
                  SKU
                </th>
                <th className="px-3 py-2 w-[300px] border-r border-slate-700/50 text-left">
                  PART NAME
                </th>
                {historyData["B/F"] && (
                  <th className="px-3 py-2 w-[100px] text-amber-400 border-r border-slate-700/50 font-black text-left">
                    B/F ({currentYear - 1})
                  </th>
                )}
                {[...Array(12)].map((_, i) => {
                  const key = `${currentYear}-${String(i + 1).padStart(
                    2,
                    "0"
                  )}`;
                  const info = deptClosingInfo[key]
                    ? deptClosingInfo[key][selectedDept]
                    : null;
                  if (info) {
                    return (
                      <th
                        key={key}
                        className="px-3 py-2 w-[110px] text-white border-r border-slate-700/50 relative group cursor-pointer text-left overflow-visible"
                      >
                        <div className="flex items-center gap-1">
                          {monthsEng[i]}{" "}
                          <Info size={10} className="text-slate-500" />
                        </div>

                        {/* ✅ Tooltip ปรับแก้ให้ลอยเด่น ไม่โดนตัดขอบ */}
                        <div className="absolute hidden group-hover:flex flex-col top-full left-0 mt-1 w-56 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[9999] pointer-events-none normal-case tracking-normal animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                              <UserCheck
                                size={14}
                                className="text-emerald-500"
                              />
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-500 font-bold leading-none uppercase">
                                Checked By
                              </p>
                              <p className="text-[11px] text-emerald-400 font-black">
                                {info.closedBy}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg">
                              <Calendar size={14} className="text-blue-500" />
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-500 font-bold leading-none uppercase">
                                Date/Time
                              </p>
                              <p className="text-[10px] text-slate-300 font-medium">
                                {info.closedAt}
                              </p>
                            </div>
                          </div>
                        </div>
                      </th>
                    );
                  }
                  return null;
                })}
                <th className="px-3 py-2 w-[100px] text-emerald-400 font-black text-left">
                  BALANCE
                </th>
                <th className="px-3 py-2 w-auto"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-700/50">
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={20}
                    className="px-6 py-10 text-center text-slate-500 text-xs italic"
                  >
                    {selectedDept === ""
                      ? "กรุณาเลือกแผนกเพื่อตรวจสอบ"
                      : "ไม่พบข้อมูลในแผนกนี้"}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item: any) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-3 py-1 font-mono text-[10px] text-slate-400 border-r border-slate-700/50 text-left">
                      {item.sku}
                    </td>
                    <td className="px-3 py-1 text-[11px] text-slate-200 truncate border-r border-slate-700/50 text-left">
                      {item.name}
                    </td>
                    {historyData["B/F"] && (
                      <td className="px-3 py-1 text-amber-400 font-bold border-r border-slate-700/50 text-left">
                        {historyData["B/F"][item.id] || "-"}
                      </td>
                    )}
                    {[...Array(12)].map((_, i) => {
                      const key = `${currentYear}-${String(i + 1).padStart(
                        2,
                        "0"
                      )}`;
                      if (
                        deptClosingInfo[key] &&
                        deptClosingInfo[key][selectedDept]
                      ) {
                        const qty = historyData[key]
                          ? historyData[key][item.id]
                          : undefined;
                        return (
                          <td
                            key={key}
                            className="px-3 py-1 font-bold text-white border-r border-slate-700/50 text-left"
                          >
                            {qty !== undefined && qty !== 0 ? qty : "-"}
                          </td>
                        );
                      }
                      return null;
                    })}
                    <td className="px-3 py-1 font-bold text-emerald-400 text-left">
                      {item.quantity !== 0 ? item.quantity : "-"}
                    </td>
                    <td className="w-auto"></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export function StockAnalyticsSidebar({
  activeTab,
  onTabChange,
  onBack,
  onToggle,
  isOpen,
}: any) {
  const menuItems = [
    {
      id: "issued",
      label: "ประวัติการเบิกช่าง",
      icon: History,
      color: "text-blue-400",
    },
    {
      id: "parts",
      label: "ประวัติการเบิกอะไหล่",
      icon: Box,
      color: "text-indigo-400",
    },
    {
      id: "supplier",
      label: "ประวัติการนำเข้าอะไหล่",
      icon: Truck,
      color: "text-purple-400",
    },
    {
      id: "deadstock",
      label: "สินค้า Dead Stock",
      icon: AlertTriangle,
      color: "text-amber-400",
    },
    {
      id: "lowstock",
      label: "สินค้าใกล้หมด (Low)",
      icon: Package,
      color: "text-rose-400",
    },
    {
      id: "database",
      label: "จัดการฐานข้อมูล",
      icon: Database,
      color: "text-red-400",
    },
  ];

  return (
    <div
      className={`flex flex-col h-full bg-[#0F172A] text-white relative overflow-hidden shadow-2xl transition-all duration-300 z-50 shrink-0 ${isOpen ? "w-72" : "w-[70px]"
        }`}
    >
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>

      <div
        className={`shrink-0 z-10 relative transition-all ${isOpen ? "p-6" : "p-2 pt-4 flex flex-col items-center"
          }`}
      >
        {/* ✅ ปุ่ม Toggle: Fixed Position */}
        <button
          onClick={onToggle}
          className="absolute top-6 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer rounded-lg p-2 hover:bg-white/10 z-20"
        >
          <PanelLeft size={20} />
        </button>

        {isOpen && (
          <div className="animate-in fade-in duration-300">
            <button
              onClick={onBack}
              className="flex items-center gap-3 text-slate-400 hover:text-white transition-all group w-full mb-8 cursor-pointer pr-8"
            >
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 group-hover:bg-blue-600 group-hover:border-blue-500 shadow-lg transition-all group-hover:scale-110">
                <ChevronLeft size={20} />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-blue-300">
                  Back
                </span>
                <span className="text-sm font-black tracking-wide">STOCK</span>
              </div>
            </button>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                  Analytics
                </p>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight leading-none">
                REPORTS
              </h2>
              <div className="h-1.5 w-16 bg-gradient-to-r from-slate-600 to-slate-800 mt-4 rounded-full"></div>
            </div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto custom-scrollbar z-10 pb-32 animate-in fade-in">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full group relative flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all duration-300 cursor-pointer ${isActive
                  ? "bg-slate-700 border-slate-600 text-white shadow-lg translate-x-1"
                  : "bg-[#1E293B]/50 border-transparent text-slate-400 hover:bg-[#1E293B] hover:border-slate-600 hover:text-white"
                  }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-[1.2] ${isActive ? "bg-black/20" : "bg-transparent"
                    }`}
                >
                  <item.icon
                    size={18}
                    className={
                      isActive
                        ? item.color
                        : "text-slate-500 group-hover:text-slate-300"
                    }
                  />
                </div>
                <span className="font-bold text-xs block flex-1 text-left truncate">
                  {item.label}
                </span>
                {isActive && (
                  <div
                    className={`w-1.5 h-1.5 rounded-full bg-${item.color.split("-")[1]
                      }-400 shadow-[0_0_5px_currentColor]`}
                  ></div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// สไตล์มาตรฐาน
const inputStyle =
  "w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors focus:ring-1 focus:ring-blue-500/20 disabled:bg-[#1E293B] disabled:text-slate-400 disabled:border-slate-700/50 disabled:cursor-not-allowed";
const selectStyle =
  "w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-500 transition-colors relative z-10 focus:ring-1 focus:ring-blue-500/20 disabled:bg-[#1E293B] disabled:text-slate-400 disabled:border-slate-700/50";
const labelStyle =
  "text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-wide ml-1";

interface CreateStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "new" | "edit" | "add_stock";
  partData?: any;
  suppliers: any[];
  departments: any[];
  currentUser: any;
}

export function CreateStockModal({
  isOpen,
  onClose,
  mode,
  partData,
  suppliers,
  departments,
  currentUser,
}: any) {
  // --- 1. State ข้อมูลหลัก (เพิ่ม X, Y และ Scale) ---
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    minStock: 0,
    price: "" as any,
    supplierId: "",
    departmentId: "",
    isImport: false,
    imageUrl: null as string | null,
    imagePositionX: 50, // ✅ พิกัดซ้าย-ขวา
    imagePositionY: 50, // ✅ พิกัดบน-ล่าง
    imageScale: 1, // ✅ ระดับการซูม (เริ่มที่ 1 เพื่อไม่ให้เห็นขอบดำ)
    initialQty: "" as any,
    quantity: 0,
    remarks: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 2. State สำหรับระบบ Drag ---
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

  // สไตล์ CSS เดิมของพี่
  const labelStyle =
    "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  const inputStyle =
    "w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-600";
  const selectStyle =
    "w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 appearance-none cursor-pointer";

  useEffect(() => {
    if (isOpen) {
      if ((mode === "edit" || mode === "add_stock") && partData) {
        setFormData({
          name: partData.name || "",
          sku: partData.sku || "",
          minStock: partData.minStock || 0,
          price: partData.price || 0,
          supplierId: partData.supplier || "",
          departmentId: partData.department || "",
          isImport: partData.isImport || false,
          imageUrl: partData.image || null,
          imagePositionX: partData.imagePositionX || 50,
          imagePositionY: partData.imagePositionY || 50,
          imageScale: partData.imageScale || 1,
          initialQty: mode === "add_stock" ? "" : 0,
          quantity: partData.quantity || 0,
          remarks: "",
        });
      } else {
        setFormData({
          name: "",
          sku: "",
          minStock: 0,
          price: "",
          supplierId: "",
          departmentId: "",
          isImport: false,
          imageUrl: null,
          imagePositionX: 50,
          imagePositionY: 50,
          imageScale: 1,
          initialQty: "",
          quantity: 0,
          remarks: "",
        });
      }
      setImageFile(null);
    }
  }, [isOpen, mode, partData]);

  // --- 3. Logic การลากรูป 4 ทิศทาง ---
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode === "add_stock" || !formData.imageUrl) return;
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setStartX(clientX);
    setStartY(clientY);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || mode === "add_stock") return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    setFormData((prev) => {
      // หารด้วยค่าซูมเพื่อให้ความเร็วในการลากคงที่
      const moveSpeed = 2 * prev.imageScale;
      return {
        ...prev,
        imagePositionX: Math.max(
          0,
          Math.min(100, prev.imagePositionX - deltaX / moveSpeed)
        ),
        imagePositionY: Math.max(
          0,
          Math.min(100, prev.imagePositionY - deltaY / moveSpeed)
        ),
      };
    });
    setStartX(clientX);
    setStartY(clientY);
  };

  const handleMouseUp = () => setIsDragging(false);

  // ฟังก์ชันลบรูป
  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("ต้องการลบรูปภาพนี้ใช่หรือไม่?")) {
      setFormData((prev) => ({
        ...prev,
        imageUrl: null,
        imagePositionX: 50,
        imagePositionY: 50,
        imageScale: 1,
      }));
      setImageFile(null);
    }
  };

  const handleUpload = async (file: File) => {
    const cloudName = "dmqcyeu9a";
    const uploadPreset = "Stock_preset";
    const options = {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      const fd = new FormData();
      fd.append("file", compressedFile);
      fd.append("upload_preset", uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: fd }
      );
      const data = await res.json();
      return data.secure_url;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mode === "add_stock") return;
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData((prev) => ({
          ...prev,
          imageUrl: ev.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      let finalImageUrl = formData.imageUrl;
      if (imageFile) {
        const url = await handleUpload(imageFile);
        if (url) finalImageUrl = url;
      }

      const timestamp = Timestamp.now();
      const finalMinStock =
        formData.minStock === "" ? 0 : Number(formData.minStock);
      const finalPrice = Number(formData.price);
      const finalInitialQty = Number(formData.initialQty);

      // Data Payload ที่จะส่งไป Firebase (รวมค่า X, Y, Scale)
      const dataPayload = {
        name: formData.name,
        sku: formData.sku,
        unit: "pcs",
        minStock: finalMinStock,
        price: finalPrice,
        supplier: formData.supplierId,
        department: formData.departmentId,
        isImport: formData.isImport,
        image: finalImageUrl,
        imagePositionX: formData.imagePositionX, // ✅
        imagePositionY: formData.imagePositionY, // ✅
        imageScale: formData.imageScale, // ✅
        updatedAt: timestamp,
      };

      if (mode === "new") {
        const docRef = await addDoc(collection(db, "spare_parts"), {
          ...dataPayload,
          quantity: finalInitialQty,
          createdAt: timestamp,
        });
        if (finalInitialQty > 0) {
          await addDoc(collection(db, "stock_logs"), {
            type: "IN",
            partId: docRef.id,
            partName: formData.name,
            sku: formData.sku,
            quantity: finalInitialQty,
            price: finalPrice,
            totalValue: finalInitialQty * finalPrice,
            supplier: formData.supplierId,
            jobType: "AddPart",
            reason: formData.remarks || "-",
            userId: currentUser?.id || "admin",
            userName: currentUser?.fullname || "Admin",
            timestamp: timestamp,
            isImport: formData.isImport,
          });
        }
        alert("✅ เพิ่มสินค้าเรียบร้อย");
      } else if (mode === "edit" && partData) {
        await updateDoc(doc(db, "spare_parts", partData.id), {
          ...dataPayload,
          quantity: Number(formData.quantity),
        });
        alert("✅ แก้ไขข้อมูลเรียบร้อย");
      } else if (mode === "add_stock" && partData) {
        await updateDoc(doc(db, "spare_parts", partData.id), {
          quantity: increment(finalInitialQty),
          updatedAt: timestamp,
        });
        await addDoc(collection(db, "stock_logs"), {
          type: "IN",
          partId: partData.id,
          partName: partData.name,
          sku: partData.sku,
          quantity: finalInitialQty,
          price: Number(partData.price),
          totalValue: finalInitialQty * Number(partData.price),
          supplier: formData.supplierId || partData.supplier,
          reason: formData.remarks || "Add Stock",
          userId: currentUser?.id || "admin",
          userName: currentUser?.fullname || "Admin",
          timestamp: timestamp,
          isImport: partData.isImport,
        });
        alert("✅ เติมสต็อกเรียบร้อย");
      }
      onClose();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    if (mode === "add_stock") return suppliers;
    return suppliers.filter((s) => !!s.isImport === formData.isImport);
  }, [suppliers, formData.isImport, mode]);

  const isFormValid = useMemo(() => {
    if (mode === "add_stock")
      return formData.initialQty !== "" && Number(formData.initialQty) > 0;
    const basicValid =
      formData.name.trim() !== "" &&
      formData.sku.trim() !== "" &&
      formData.departmentId !== "" &&
      formData.supplierId !== "" &&
      formData.price !== "" &&
      Number(formData.price) >= 0;
    if (mode === "new")
      return (
        basicValid &&
        formData.initialQty !== "" &&
        Number(formData.initialQty) >= 0
      );
    return basicValid;
  }, [formData, mode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[#1E293B] rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-[#1E293B] rounded-t-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${mode === "new" ? "bg-green-500" : "bg-blue-500"
                }`}
            ></div>
            {mode === "new"
              ? "เพิ่มสินค้าใหม่"
              : mode === "edit"
                ? "แก้ไขข้อมูลสินค้า"
                : "เติมสต็อกด่วน"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700/50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="stockForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-8">
              {/* Image Editor Section */}
              <div className="shrink-0 flex flex-col items-center gap-4">
                <span className={labelStyle}>รูปภาพ (ลากขยับได้)</span>
                <div
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleMouseDown}
                  onTouchMove={handleMouseMove}
                  onTouchEnd={handleMouseUp}
                  className={`relative w-48 h-48 bg-[#0F172A] border-2 border-dashed rounded-2xl flex items-center justify-center overflow-hidden shadow-inner transition-all ${mode === "add_stock"
                    ? "border-slate-700 cursor-default"
                    : "border-slate-600 cursor-move group"
                    }`}
                >
                  {formData.imageUrl ? (
                    <>
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        draggable={false}
                        className="pointer-events-none transition-none"
                        style={{
                          // ✅ ใช้ width/height แทน Scale เพื่อให้ลากได้จริง
                          width: `${formData.imageScale * 100}%`,
                          height: `${formData.imageScale * 100}%`,
                          objectFit: "cover",
                          objectPosition: `${formData.imagePositionX}% ${formData.imagePositionY}%`,
                        }}
                      />
                      {mode !== "add_stock" && (
                        <div className="absolute top-2 right-2 flex gap-1 pointer-events-auto">
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="p-1.5 bg-red-500/90 text-white rounded-lg hover:bg-red-600 shadow-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1.5 bg-blue-500/90 text-white rounded-lg hover:bg-blue-600 shadow-lg"
                          >
                            <Camera size={14} />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center text-slate-500 hover:text-blue-400 cursor-pointer w-full h-full"
                    >
                      <UploadCloud size={32} className="mb-2" />
                      <span className="text-[10px] font-bold">ADD PHOTO</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Zoom Controller (ล็อคขั้นต่ำที่ 1) */}
                {formData.imageUrl && mode !== "add_stock" && (
                  <div className="w-full bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <ZoomOut size={12} className="text-slate-500" />
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">
                        Zoom: {(formData.imageScale * 100).toFixed(0)}%
                      </span>
                      <ZoomIn size={12} className="text-slate-500" />
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.01"
                      value={formData.imageScale}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          imageScale: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* General Info (Right) */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelStyle}>
                      ชื่อสินค้า <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className={inputStyle}
                      disabled={mode === "add_stock"}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>
                      รหัส (SKU) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                      className={inputStyle}
                      disabled={mode === "add_stock"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className={labelStyle}>
                      หมวดหมู่ <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          departmentId: e.target.value,
                        })
                      }
                      className={selectStyle}
                      disabled={mode === "add_stock"}
                    >
                      <option value="">-- ระบุ --</option>
                      {departments.map((dept: any) => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-[32px] text-slate-500 pointer-events-none"
                    />
                  </div>
                  <div className="relative">
                    <label className={labelStyle}>
                      Supplier <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.supplierId}
                      onChange={(e) =>
                        setFormData({ ...formData, supplierId: e.target.value })
                      }
                      className={selectStyle}
                      disabled={mode === "add_stock"}
                    >
                      <option value="">-- ระบุ --</option>
                      {filteredSuppliers.map((sup: any) => (
                        <option key={sup.id} value={sup.name}>
                          {sup.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-[32px] text-slate-500 pointer-events-none"
                    />
                    <div className="mt-2 pl-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (mode === "add_stock") return;
                          setFormData({
                            ...formData,
                            isImport: !formData.isImport,
                            supplierId: "",
                          });
                        }}
                        className="flex items-center gap-2 group"
                      >
                        {formData.isImport ? (
                          <CheckSquare size={16} className="text-blue-500" />
                        ) : (
                          <Square size={16} className="text-slate-600" />
                        )}
                        <span
                          className={`text-xs ${formData.isImport
                            ? "text-blue-400 font-bold"
                            : "text-slate-400"
                            }`}
                        >
                          สินค้านำเข้า (Import)
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700/50"></div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelStyle}>ราคา/หน่วย *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className={inputStyle}
                  disabled={mode === "add_stock"}
                />
              </div>
              <div>
                <label className={labelStyle}>
                  {mode === "add_stock" ? "คงเหลือปัจจุบัน" : "Min. Stock"}
                </label>
                <input
                  type="number"
                  value={
                    mode === "add_stock" ? formData.quantity : formData.minStock
                  }
                  onChange={(e) =>
                    setFormData({ ...formData, minStock: e.target.value })
                  }
                  className={inputStyle}
                  disabled={mode === "add_stock"}
                />
              </div>
              <div>
                <label className={labelStyle}>
                  {mode === "new"
                    ? "จำนวนแรกเข้า"
                    : mode === "add_stock"
                      ? "จำนวนที่เพิ่ม"
                      : "จำนวนคงเหลือ"}
                </label>
                <input
                  type="number"
                  value={
                    mode === "edit" ? formData.quantity : formData.initialQty
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      [mode === "edit" ? "quantity" : "initialQty"]:
                        e.target.value,
                    })
                  }
                  className={inputStyle}
                />
              </div>
            </div>

            {mode === "add_stock" && (
              <div>
                <label className={labelStyle}>หมายเหตุ</label>
                <input
                  className={inputStyle}
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                />
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700 bg-[#1E293B] rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 font-bold hover:bg-slate-700"
            disabled={isSubmitting}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className={`px-10 py-2.5 rounded-xl font-bold text-white flex items-center gap-2 active:scale-95 transition-all ${isSubmitting || !isFormValid
              ? "bg-slate-700"
              : "bg-blue-600 shadow-lg"
              }`}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StockModule({
  currentUser,
  activeTab,
  settingsTab,
  analyticsTab,
  onExit,
}: any) {
  const currentView = activeTab || "overview";

  // --- 1. State ข้อมูลหลัก ---
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isAuditMode, setIsAuditMode] = useState(false);

  // --- 2. State สำหรับ Modal ต่างๆ ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"new" | "edit" | "add_stock">(
    "new"
  );
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedRestockItem, setSelectedRestockItem] = useState(null);
  const [selectedPart, setSelectedPart] = useState<any>(null);

  // --- 3. State สำหรับถามรหัสผ่าน (Confirm Password Modal) ---
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    onConfirm: () => void;
    title: string;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🛡️ เช็คสิทธิ์การเข้าถึง
  const isOwner = currentUser?.username === "Bank";
  const userPermissions = currentUser?.allowedActions || [];
  const canAccessInventory =
    isOwner || userPermissions.includes("stock_operate");
  const canAccessManagement =
    isOwner || userPermissions.includes("stock_manage");
  const canAccessSettings =
    isOwner || userPermissions.includes("stock_settings");

  // --- 4. โหลดข้อมูล Realtime จาก Firebase ---
  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, "spare_parts"), (s) => {
      setItems(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubSup = onSnapshot(collection(db, "suppliers"), (s) => {
      setSuppliers(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubDept = onSnapshot(collection(db, "departments"), (s) =>
      setDepartments(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      unsubItems();
      unsubSup();
      unsubDept();
    };
  }, []);

  // --- 5. Handlers: การจัดการสินค้า (Management) ---
  const handleOpenAddStock = () => {
    setSelectedPart(null);
    setModalMode("new");
    setIsModalOpen(true);
  };
  const handleEditPart = (item: any) => {
    setSelectedPart(item);
    setModalMode("edit");
    setIsModalOpen(true);
  };
  const handleOpenRestock = (item: any) => {
    setSelectedRestockItem(item);
    setIsRestockModalOpen(true);
  };
  const handleDeletePart = (id: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: "ยืนยันการลบสินค้า",
      message: `คุณต้องการลบ "${name}" ใช่หรือไม่? ไม่สามารถกู้คืนได้`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "spare_parts", id));
          alert("✅ ลบสินค้าเรียบร้อย");
        } catch (e: any) {
          alert(e.message);
        }
      },
    });
  };

  const handleWithdraw = async (cartItems: any[]) => {
    try {
      const batch = writeBatch(db);
      const ts = serverTimestamp(); // ใช้สำหรับ Field ปกติ
      const now = new Date(); // ✅ ใช้สำหรับข้อมูลใน Array

      cartItems.forEach((item) => {
        // 1. ลดจำนวนอะไหล่ในสต็อก
        batch.update(doc(db, "spare_parts", item.id), {
          quantity: increment(-item.cartQty),
          updatedAt: ts,
        });

        // 2. บันทึกประวัติการเบิก (Log)
        batch.set(doc(collection(db, "stock_logs")), {
          type: "OUT",
          partId: item.id,
          partName: item.name,
          sku: item.sku || "-",
          quantity: item.cartQty,
          price: Number(item.price) || 0,
          totalValue: (Number(item.price) || 0) * item.cartQty,
          jobType: item.jobType,
          refTicketId: item.refTicketId,
          refMachine: item.refMachine || "-",
          reason: item.reason,
          userId: currentUser.id,
          userName: currentUser.fullname || currentUser.username,
          timestamp: ts,
          isImport: !!item.isImport,
        });

        // 3. ✅ อัปเดตข้อมูลเข้าใบแจ้งซ่อม
        if (item.jobType === "Maintenance" && item.refTicketId) {
          const ticketRef = doc(db, "maintenance_tickets", item.refTicketId);
          batch.update(ticketRef, {
            used_parts: arrayUnion({
              partId: item.id,
              name: item.name,
              sku: item.sku || "-",
              qty: item.cartQty,
              price: Number(item.price) || 0,
              withdrawDate: now, // ✅ เปลี่ยนจาก ts เป็น now เพื่อแก้ Error
              withdrawnBy: currentUser.fullname || currentUser.username,
            }),
            updatedAt: ts,
          });
        }
      });

      await batch.commit();
      alert("✅ เบิกสินค้าและส่งข้อมูลเข้าใบแจ้งซ่อมเรียบร้อย");
      setCart([]);
    } catch (e: any) {
      console.error(e);
      alert("Withdraw Error: " + e.message);
    }
  };

  const handleReturnItem = (log: any, qty: number, onSuccess: () => void) => {
    setConfirmState({
      isOpen: true,
      title: "ยืนยันการคืนอะไหล่",
      message: `คุณกำลังจะคืน "${log.partName}" จำนวน ${qty} ชิ้น\nกรุณากรอกรหัสผ่านเพื่อยืนยัน`,
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          const ts = serverTimestamp();
          batch.update(doc(db, "spare_parts", log.partId), {
            quantity: increment(qty),
            updatedAt: ts,
          });
          batch.set(doc(collection(db, "stock_logs")), {
            type: "IN",
            isReturn: true,
            refLogId: log.id,
            partId: log.partId,
            partName: log.partName,
            sku: log.sku || "-",
            quantity: qty,
            price: Number(log.price || 0),
            totalValue: Number(log.price || 0) * qty,
            userId: currentUser.id,
            userName: currentUser.fullname || currentUser.username,
            timestamp: ts,
            isImport: !!log.isImport,
            reason: `คืนของจากรายการ: ${log.reason || "-"}`,
            // ✅ เพิ่มบรรทัดนี้ เพื่อส่งเลข Ticket ไปหักลบยอดในหน้าปิดงานครับ
            refTicketId: log.refTicketId || null,
          });
          await batch.commit();
          alert("✅ คืนสินค้าสำเร็จ");
          onSuccess(); // ปิด Modal ในหน้า InventoryView
        } catch (e: any) {
          alert("Return Error: " + e.message);
        }
      },
    });
  };

  const handleAddSupplier = async (name: string, isImport: boolean) => {
    try {
      await addDoc(collection(db, "suppliers"), { name, isImport });
      alert("✅ เพิ่ม Supplier เรียบร้อย");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      await deleteDoc(doc(db, "suppliers", id));
      alert("✅ ลบ Supplier เรียบร้อย");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddDepartment = async (name: string) => {
    try {
      await addDoc(collection(db, "departments"), { name });
      alert("✅ เพิ่มแผนกเรียบร้อย");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      await deleteDoc(doc(db, "departments", id));
      alert("✅ ลบแผนกเรียบร้อย");
    } catch (e: any) {
      alert(e.message);
    }
  };

  // --- 8. Render Logic: เลือกว่าจะแสดงหน้าไหน ---
  return (
    <div className="flex flex-col h-full bg-[#0F172A] text-white relative">
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {/* ✅ MOBILE HEADER (Premium Style) */}
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
                <Box className="text-slate-400" size={20} />
                Stock Parts
              </h1>
              <span className="text-[10px] text-slate-400 mt-1">
                {activeTab === "overview" && "ภาพรวมคลังสินค้า"}
                {activeTab === "inventory" && "คลังอะไหล่ (เบิก/คืน)"}
                {activeTab === "management" && "จัดการรายการสต็อก"}
                {activeTab === "analytics" && "รายงานและสถิติ"}
                {activeTab === "settings" && "ตั้งค่าระบบคลัง"}
                {!activeTab && "ระบบคลังอะไหล่"}
              </span>
            </div>
          </div>
        </div>
        {/* หน้า 1: Overview */}
        {currentView === "overview" && <OverviewPage items={items} />}

        {/* หน้า 2: Inventory (เบิก/คืน) */}
        {currentView === "inventory" &&
          (canAccessInventory ? (
            <InventoryView
              items={items}
              currentUser={currentUser}
              cart={cart}
              setCart={setCart}
              departments={departments}
              onWithdraw={handleWithdraw}
              onReturnItem={handleReturnItem}
            />
          ) : (
            <AccessDeniedMessage message="ไม่มีสิทธิ์เข้าถึงหน้าเบิก/คืน" />
          ))}

        {/* หน้า 3: Management (จัดการสต็อก) */}
        {currentView === "management" &&
          (canAccessManagement ? (
            isAuditMode ? (
              <AuditView
                items={items}
                departments={departments}
                onBack={() => setIsAuditMode(false)}
                currentUser={currentUser}
              />
            ) : (
              <ManagementView
                items={items}
                departments={departments}
                suppliers={suppliers}
                currentUser={currentUser}
                onOpenAddStock={handleOpenAddStock}
                onEditPart={handleEditPart}
                onDeletePart={handleDeletePart}
                onAddStockDirectly={handleOpenRestock}
                onOpenAudit={() => setIsAuditMode(true)}
              />
            )
          ) : (
            <AccessDeniedMessage message="ไม่มีสิทธิ์จัดการสต็อก" />
          ))}

        {/* หน้า 4: Analytics (รายงาน) */}
        {currentView === "analytics" && (
          <AnalyticsView
            items={items}
            suppliers={suppliers}
            currentUser={currentUser}
            subTab={analyticsTab}
            onConfirmPassword={(t: any, m: any, a: any) =>
              setConfirmState({
                isOpen: true,
                title: t,
                message: m,
                onConfirm: a,
              })
            }
          />
        )}

        {/* หน้า 5: Settings (ตั้งค่า) */}
        {currentView === "settings" &&
          (canAccessSettings ? (
            <SettingsView
              subTab={settingsTab}
              suppliers={suppliers}
              departments={departments}
              currentUser={currentUser}
              onAddSupplier={handleAddSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onAddDepartment={handleAddDepartment}
              onDeleteDepartment={handleDeleteDepartment}
            />
          ) : (
            <AccessDeniedMessage message="ไม่มีสิทธิ์เข้าถึงการตั้งค่า" />
          ))}
      </div>

      {/* --- Global Modals --- */}
      <CreateStockModal
        isOpen={isModalOpen}
        mode={modalMode}
        partData={selectedPart}
        suppliers={suppliers}
        departments={departments}
        currentUser={currentUser}
        onClose={() => setIsModalOpen(false)}
      />

      <AddStockModal
        isOpen={isRestockModalOpen}
        item={selectedRestockItem}
        suppliers={suppliers}
        onClose={() => setIsRestockModalOpen(false)}
        onConfirm={async (itm: any, q: any, p: any, s: any, n: any) => {
          const ts = Timestamp.now();
          await updateDoc(doc(db, "spare_parts", itm.id), {
            quantity: increment(q),
            price: p,
            supplier: s,
            updatedAt: ts,
          });
          await addDoc(collection(db, "stock_logs"), {
            type: "IN",
            partId: itm.id,
            partName: itm.name,
            sku: itm.sku,
            quantity: q,
            price: p,
            totalValue: p * q,
            supplier: s,
            reason: n,
            userId: currentUser.id,
            userName: currentUser.fullname,
            timestamp: ts,
            isImport: !!itm.isImport,
          });
          alert("✅ เติมสต็อกสำเร็จ");
        }}
      />

      {/* ✅ Modal ถามรหัสผ่าน (Dark Theme) */}
      {confirmState && (
        <ConfirmActionModal
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          currentUser={currentUser}
          onConfirm={confirmState.onConfirm}
          onClose={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
// ==========================================
// ✅ MAIN COMPONENT: StockApp (ตัวจริงที่รันหน้าเว็บ)
// ==========================================
export default function StockApp({
  currentUser,
  activeTab,
  settingsTab,
  analyticsTab,
  onExit,
}: any) {
  const currentView = activeTab || "overview";

  // --- 1. ประกาศ State (ถังเก็บข้อมูล) ---
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);

  // ✅ ถังเก็บ Suppliers (ต้องวางตรงนี้!)
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [departments, setDepartments] = useState<any[]>([]);

  // State สำหรับ Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"new" | "edit" | "add_stock">(
    "new"
  );
  const [selectedPart, setSelectedPart] = useState<any>(null);

  // State สำหรับหน้าต่างเติมสต็อก (Restock)
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedRestockItem, setSelectedRestockItem] = useState(null);

  // Confirm Modal
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    onConfirm: () => void;
    title: string;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Permissions
  const canAccessSettings =
    currentUser?.username === "Bank" ||
    currentUser?.role === "super_admin" ||
    currentUser?.allowedActions?.includes("stock_settings");

  // --- 2. โหลดข้อมูลจาก Database (useEffect) ---
  useEffect(() => {
    // 2.1 ดึงสินค้า
    const unsubItems = onSnapshot(collection(db, "spare_parts"), (s) => {
      setItems(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // 2.2 ✅ ดึง Suppliers (แบบมี Log เช็คให้พี่ดู)
    const unsubSup = onSnapshot(collection(db, "suppliers"), (s) => {
      const data = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      console.log("🔥 STOCK APP ได้ข้อมูลมาแล้ว:", data); // ดูบรรทัดนี้ใน Console
      setSuppliers(data);
    });

    // 2.3 ดึงแผนก
    const unsubDept = onSnapshot(collection(db, "departments"), (s) =>
      setDepartments(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubItems();
      unsubSup();
      unsubDept();
    };
  }, []);

  // --- 3. Handlers (ฟังก์ชันทำงาน) ---

  const handleOpenAddStock = () => {
    setSelectedPart(null);
    setModalMode("new");
    setIsModalOpen(true);
  };

  const handleEditPart = (item: any) => {
    setSelectedPart(item);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  // เปิดหน้าต่างเติมของ
  const handleOpenRestock = (item: any) => {
    setSelectedRestockItem(item);
    setIsRestockModalOpen(true);
  };

  // ลบสินค้า
  const handleDeletePart = (id: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: "ลบสินค้า",
      message: `ยืนยันการลบสินค้า: "${name}"?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "spare_parts", id));
        } catch (e: any) {
          alert("Error: " + e.message);
        }
      },
    });
  };

  // --- 4. Render หน้าจอ ---
  return (
    <div className="flex flex-col h-full bg-[#0F172A] text-white relative">
      {/* Mobile Header */}
      <div className="bg-[#1E293B] border-b border-slate-700 px-4 py-3 flex items-center justify-between shrink-0 z-30 shadow-md md:hidden">
        {/* ... Header Content ... */}
        <h1 className="text-lg font-bold">Stock Inventory</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {currentView === "overview" && <OverviewPage items={items} />}

        {currentView === "inventory" && (
          <InventoryView
            items={items}
            currentUser={currentUser}
            cart={cart}
            setCart={setCart}
            departments={departments}
            onWithdraw={handleWithdraw}
            onReturnItem={handleReturnItem}
          />
        )}

        {currentView === "management" && (
          <ManagementView
            items={items}
            currentUser={currentUser}
            onOpenAddStock={handleOpenAddStock}
            onAddStockDirectly={handleOpenRestock}
            onDeletePart={handleDeletePart}
            onEditPart={handleEditPart}
            onImportClick={() => fileInputRef.current?.click()}
            departments={departments}
            // ✅✅✅ จุดสำคัญ: ส่ง Suppliers ลงไปให้ลูกใช้ ✅✅✅
            suppliers={suppliers}
            userRole={currentUser.role}
            onConfirmPassword={(title: string, msg: string, action: any) => {
              setConfirmState({
                isOpen: true,
                title,
                message: msg,
                onConfirm: action,
              });
            }}
          />
        )}

        {/* ... Analytics & Settings Views ... */}
        {currentView === "analytics" && (
          <AnalyticsView
            items={items}
            suppliers={suppliers}
            currentUser={currentUser}
            subTab={analyticsTab}
            onConfirmPassword={() => { }}
          />
        )}
        {currentView === "settings" && canAccessSettings && (
          <SettingsView
            subTab={settingsTab}
            suppliers={suppliers}
            departments={departments}
            onAddSupplier={() => { }}
            onDeleteSupplier={() => { }}
            onAddDepartment={() => { }}
            onDeleteDepartment={() => { }}
            currentUser={currentUser}
          />
        )}
      </div>

      {/* --- MODALS --- */}
      {isModalOpen && (
        <CreateStockModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          mode={modalMode}
          partData={selectedPart}
          suppliers={suppliers}
          departments={departments}
          currentUser={currentUser}
        />
      )}

      {/* ✅ Modal เติมสต็อก */}
      {isRestockModalOpen && (
        <AddStockModal
          isOpen={isRestockModalOpen}
          onClose={() => setIsRestockModalOpen(false)}
          item={selectedRestockItem}
          // ✅ ส่งฟังก์ชันบันทึกตัวแม่ลงไป
          onConfirm={handleAddStockDirectly}
          // ✅ ส่งข้อมูลร้านค้าลงไป
          suppliers={suppliers}
        />
      )}

      {confirmState && (
        <ConfirmActionModal
          isOpen={confirmState.isOpen}
          onClose={() => setConfirmState(null)}
          onConfirm={confirmState.onConfirm}
          title={confirmState.title}
          message={confirmState.message}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}




















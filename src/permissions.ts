// src/permissions.ts

export const ALL_PERMISSIONS = [
  // --- Daily Check (ตรวจเครื่อง) ---
  { id: "daily_record", label: "บันทึกผลตรวจ (Inspect)", app: "Daily Check" },
  { id: "daily_verify", label: "ผู้ตรวจสอบ (Audit)", app: "Daily Check" },
  { id: "daily_delete", label: "ลบประวัติการตรวจ", app: "Daily Check" },
  {
    id: "daily_select_date",
    label: "เลือกวันที่ตรวจ (ย้อนหลัง/ล่วงหน้า)",
    app: "Daily Check",
  },
  {
    id: "daily_settings",
    label: "เข้าหน้าตั้งค่า (Settings)",
    app: "Daily Check",
  },

  // --- Maintenance (แจ้งซ่อม) ---
  { id: "mt_request", label: "แจ้งซ่อม (Request)", app: "Maintenance" },
  { id: "mt_accept", label: "รับงานซ่อม (Start)", app: "Maintenance" },
  { id: "mt_close", label: "ปิดงานซ่อม (Close)", app: "Maintenance" },
  { id: "mt_verify", label: "ตรวจรับงาน (Verify)", app: "Maintenance" },
  { id: "mt_approve", label: "อนุมัติจบงาน (Approve)", app: "Maintenance" },
  { id: "mt_delete", label: "ลบใบงาน (Delete)", app: "Maintenance" },
  { id: "mt_edit", label: "แก้ไขใบแจ้งซ่อม", app: "Maintenance" },
  {
    id: "mt_settings",
    label: "เข้าหน้าตั้งค่า (Settings)",
    app: "Maintenance",
  },

  // --- Stock (สต็อก) ---
  {
    id: "stock_operate",
    label: "เบิก / คืน ของ (Operate)",
    app: "Stock Parts",
  },
  { id: "stock_manage", label: "จัดการสินค้า (Add/Edit)", app: "Stock Parts" },
  { id: "stock_settings", label: "ตั้งค่า Supplier/แผนก", app: "Stock Parts" },

  // --- Main System ---
  {
    id: "main_manage_users",
    label: "จัดการ User (เพิ่ม/ลบ/แก้สิทธิ์)",
    app: "System",
  },
];

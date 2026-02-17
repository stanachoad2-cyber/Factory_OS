import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  Search,
  Key,
  X,
  Save,
  Check,
  UserCog,
} from "lucide-react";
import { ALL_PERMISSIONS } from "./permissions";

// ==========================================
// 1. HELPER: Confirm Password Modal (คงเดิม)
// ==========================================
function ConfirmPasswordGuard({
  isOpen,
  onClose,
  onConfirm,
  userPass,
  message,
}: any) {
  const [inputPass, setInputPass] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputPass("");
      setError(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (inputPass === userPass) {
      onConfirm();
      onClose();
    } else {
      setError(true);
      setInputPass("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1F1F23] w-full max-w-xs p-6 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="text-center mb-4">
          <div className="w-10 h-10 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Key size={20} />
          </div>
          <h3 className="text-base font-bold text-white">ยืนยันรหัสผ่าน</h3>
          <p className="text-xs text-slate-400 mt-1">{message}</p>
        </div>
        <input
          type="password"
          autoFocus
          value={inputPass}
          onChange={(e) => {
            setInputPass(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          className={`w-full bg-[#0F1115] border ${
            error ? "border-red-500" : "border-slate-700 focus:border-blue-500"
          } rounded-lg px-3 py-2 text-center text-white text-sm outline-none transition-all mb-4`}
          placeholder="Password"
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-bold text-xs"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. HELPER: Create User Modal (คงเดิม)
// ==========================================
function CreateUserModal({ onClose, existingUsers }: any) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [fullname, setFullname] = useState("");

  const handleCreate = async () => {
    if (!u || !p || !fullname) return alert("กรุณากรอกข้อมูลให้ครบ");
    if (u.toLowerCase() === "bank") return alert("ห้ามใช้ชื่อ Bank");
    if (
      existingUsers.some(
        (x: any) => x.username.toLowerCase() === u.toLowerCase()
      )
    )
      return alert("Username นี้มีอยู่แล้ว");

    try {
      await addDoc(collection(db, "User"), {
        username: u,
        pass: p,
        fullname,
        role: "User", // Default role
        allowedActions: [],
        created_at: serverTimestamp(),
      });
      alert("✅ เพิ่มผู้ใช้งานแล้ว");
      onClose();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-[#1E293B] w-full max-w-sm rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700 bg-[#16181C] flex justify-between items-center">
          <span className="text-sm font-bold text-white">New User</span>
          <button onClick={onClose}>
            <X size={16} className="text-slate-500 hover:text-white" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <input
            className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
            placeholder="Name (e.g. Somchai)"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
              value={u}
              onChange={(e) => setU(e.target.value)}
              placeholder="Username"
            />
            <input
              className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
              value={p}
              onChange={(e) => setP(e.target.value)}
              placeholder="Password"
            />
          </div>
          <button
            onClick={handleCreate}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg mt-2 text-sm"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. HELPER: Edit Permissions Modal (คงเดิม)
// ==========================================
function EditPermissionsModal({ targetUser, currentUser, onClose }: any) {
  const [selectedActions, setSelectedActions] = useState<string[]>(
    targetUser.allowedActions || []
  );
  const [fullname, setFullname] = useState(targetUser.fullname || "");
  const [pass, setPass] = useState("");
  const [showGuard, setShowGuard] = useState(false);

  const groupedPerms = (ALL_PERMISSIONS || []).reduce((acc: any, curr: any) => {
    if (!acc[curr.app]) acc[curr.app] = [];
    acc[curr.app].push(curr);
    return acc;
  }, {});

  const toggleAction = (id: string) => {
    setSelectedActions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const executeSave = async () => {
    try {
      const payload: any = { allowedActions: selectedActions, fullname };
      if (pass.trim()) payload.pass = pass;
      await updateDoc(doc(db, "User", targetUser.id), payload);
      alert("✅ บันทึกเรียบร้อย");
      onClose();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-[#1F1F23] w-full max-w-4xl h-[85vh] rounded-2xl border border-slate-600 shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-700 bg-[#16181C] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <UserCog className="text-blue-500" size={20} />
            <span className="text-base font-bold text-white">
              Edit User:{" "}
              <span className="text-blue-400">{targetUser.username}</span>
            </span>
          </div>
          <button onClick={onClose}>
            <X size={20} className="text-slate-500 hover:text-white" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Profile */}
          <div className="w-[280px] bg-[#16181C] border-r border-slate-700 p-6 flex flex-col space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">
                Fullname
              </label>
              <input
                className="w-full bg-[#0F1115] border border-slate-700 p-2 rounded text-white text-sm outline-none focus:border-blue-500"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">
                Change Password
              </label>
              <input
                className="w-full bg-[#0F1115] border border-slate-700 p-2 rounded text-white text-sm outline-none focus:border-blue-500 placeholder-slate-600"
                placeholder="Leave blank to keep current"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </div>
            <div className="mt-auto pt-6 border-t border-slate-700">
              <div className="text-[10px] text-slate-500">USER ID</div>
              <div className="text-xs font-mono text-slate-400 truncate">
                {targetUser.id}
              </div>
            </div>
          </div>

          {/* Right Panel: Permissions */}
          <div className="flex-1 bg-[#1F1F23] p-6 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Access Control
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setSelectedActions(
                      (ALL_PERMISSIONS || []).map((p: any) => p.id)
                    )
                  }
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-bold"
                >
                  All
                </button>
                <span className="text-slate-600">|</span>
                <button
                  onClick={() => setSelectedActions([])}
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                >
                  None
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                {Object.keys(groupedPerms).map((appName) => (
                  <div key={appName}>
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-700 pb-1">
                      {appName}
                    </h5>
                    <div className="space-y-1">
                      {groupedPerms[appName].map((perm: any) => {
                        const isChecked = selectedActions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-1.5 rounded-md transition-colors select-none group"
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                isChecked
                                  ? "bg-blue-500 border-blue-500"
                                  : "border-slate-600 bg-slate-800"
                              }`}
                            >
                              {isChecked && (
                                <Check
                                  size={10}
                                  className="text-white stroke-[4]"
                                />
                              )}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isChecked}
                              onChange={() => toggleAction(perm.id)}
                            />
                            <span
                              className={`text-xs ${
                                isChecked
                                  ? "text-white"
                                  : "text-slate-400 group-hover:text-slate-300"
                              }`}
                            >
                              {perm.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowGuard(true)}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>
      </div>

      <ConfirmPasswordGuard
        isOpen={showGuard}
        onClose={() => setShowGuard(false)}
        onConfirm={executeSave}
        userPass={currentUser.pass}
        message={`ยืนยันการแก้ไขสิทธิ์ของ ${targetUser.username}`}
      />
    </div>
  );
}

// ==========================================
// 4. MAIN PAGE: SETTINGS PAGE (Maintenance Style Clone)
// ==========================================
export default function SettingsPage({ onClose, currentUser }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddMode, setIsAddMode] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [deleteGuard, setDeleteGuard] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  }>({
    isOpen: false,
    id: "",
    name: "",
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "User"), (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      usersData.sort((a: any, b: any) => {
        if (a.username === "Bank") return -1;
        if (b.username === "Bank") return 1;
        return a.username.localeCompare(b.username);
      });
      setUsers(usersData);
    });
    return () => unsub();
  }, []);

  const executeDeleteUser = async () => {
    if (deleteGuard.id) {
      try {
        await deleteDoc(doc(db, "User", deleteGuard.id));
      } catch (e: any) {
        alert("Error: " + e.message);
      }
      setDeleteGuard({ isOpen: false, id: "", name: "" });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.fullname || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 h-full overflow-hidden relative flex flex-col bg-[#0F172A] animate-in fade-in duration-300">
      {/* Background Blob Effect */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* --- Header Section --- */}
      <div className="px-6 pt-6 pb-2 z-10 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-900/20 flex items-center justify-center text-white border border-blue-400/20">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">
              จัดการผู้ใช้งาน
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold bg-slate-800/50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50 uppercase tracking-wider">
                SYSTEM CONFIG
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Action Bar --- */}
      <div className="px-6 pb-6 pt-0 flex-1 flex flex-col overflow-hidden z-10 w-full max-w-[1600px]">
        <div className="bg-slate-900/60 backdrop-blur-md p-3 rounded-xl border border-slate-800/60 flex flex-wrap gap-3 items-center justify-between mb-4 shadow-xl shrink-0">
          <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto flex-1">
            {/* Search Box */}
            <div className="flex-1 min-w-[250px] relative">
              <Search
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                className="w-full bg-[#0B1121] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none h-[34px] placeholder-slate-600 focus:border-blue-500"
                placeholder="Search Users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Add Button */}
            <button
              onClick={() => setIsAddMode(true)}
              className="h-[34px] px-4 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all hover:scale-105 shadow-lg shadow-blue-900/20"
            >
              <UserPlus size={14} strokeWidth={3} />
              <span>NEW USER</span>
            </button>
          </div>
        </div>

        {/* --- Table Section --- */}
        <div className="border border-slate-800/60 rounded-xl overflow-hidden bg-slate-900/60 backdrop-blur-md flex-1 flex flex-col shadow-2xl">
          <div className="overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto custom-scrollbar flex-1">
              <table className="w-full text-left text-xs text-slate-400 table-fixed">
                <thead className="bg-[#0B1121] text-slate-300 font-bold uppercase text-[15px] sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-[8%] text-center border-b border-slate-800">
                      No.
                    </th>
                    <th className="px-4 py-3 w-[30%] border-b border-slate-800">
                      Username
                    </th>
                    <th className="px-4 py-3 w-[40%] border-b border-slate-800">
                      Fullname
                    </th>
                    <th className="px-4 py-3 w-[10%] text-center border-b border-slate-800">
                      Action
                    </th>
                    <th className="px-4 py-3 w-[10%] text-center border-b border-slate-800">
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-xs text-slate-600"
                      >
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, idx) => (
                      <tr
                        key={u.id}
                        className="hover:bg-blue-600/5 group transition-colors"
                      >
                        {/* No. */}
                        <td className="px-4 py-2 text-center font-mono">
                          {(idx + 1).toString().padStart(2, "0")}
                        </td>

                        {/* Username */}
                        <td className="px-4 py-2 font-bold text-white truncate">
                          <div className="flex items-center gap-2">
                            {u.username}
                            {u.username === "Bank" && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold uppercase">
                                OWNER
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Fullname */}
                        <td className="px-4 py-2 text-slate-300 truncate">
                          {u.fullname || "-"}
                        </td>

                        {/* Action (Edit Permissions) */}
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingUser(u);
                            }}
                            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded transition-all inline-flex items-center justify-center"
                            title="แก้ไขสิทธิ์"
                          >
                            <UserCog size={16} />
                          </button>
                        </td>

                        {/* Delete */}
                        <td className="px-4 py-2 text-center">
                          {u.username !== "Bank" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteGuard({
                                  isOpen: true,
                                  id: u.id,
                                  name: u.username,
                                });
                              }}
                              className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded transition-all opacity-0 group-hover:opacity-100 inline-flex items-center justify-center"
                              title="ลบผู้ใช้"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <div className="w-8 h-8"></div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Status */}
          <div className="bg-[#0B1121] px-4 py-1.5 border-t border-slate-800 flex justify-between items-center text-[9px] text-slate-600 uppercase font-bold tracking-widest shrink-0">
            <span>
              SYSTEM: <span className="text-green-500">Secure</span>
            </span>
            <span>
              Total Users:{" "}
              <span className="text-slate-300">{filteredUsers.length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAddMode && (
        <CreateUserModal
          onClose={() => setIsAddMode(false)}
          existingUsers={users}
        />
      )}

      {editingUser && (
        <EditPermissionsModal
          targetUser={editingUser}
          currentUser={currentUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      <ConfirmPasswordGuard
        isOpen={deleteGuard.isOpen}
        onClose={() => setDeleteGuard({ isOpen: false, id: "", name: "" })}
        onConfirm={executeDeleteUser}
        userPass={currentUser.pass}
        message={`ยืนยันการลบผู้ใช้ "${deleteGuard.name}"`}
      />
    </div>
  );
}

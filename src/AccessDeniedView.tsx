import React from "react";
import { Lock } from "lucide-react";

interface AccessDeniedViewProps {
  message?: string;
  permission?: string;
}

export default function AccessDeniedView({
  message = "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
  permission,
}: AccessDeniedViewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] w-full text-slate-400 p-4">
      <div className="flex flex-col items-center p-8 border border-slate-700/50 rounded-2xl bg-[#1E293B]/50 shadow-xl max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
        <Lock size={64} className="mb-6 opacity-20 text-slate-500 animate-pulse" />
        <h2 className="text-xl font-bold text-slate-500 mb-2 uppercase tracking-widest">
          ACCESS DENIED
        </h2>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          {message}
        </p>
        {permission && (
          <span className="text-[10px] text-slate-500 font-mono bg-black/20 px-2.5 py-1 rounded border border-slate-700/30">
            (Need '{permission}' permission)
          </span>
        )}
      </div>
    </div>
  );
}

"use client";

import { useUser } from "@clerk/nextjs";
import { ShieldCheck } from "lucide-react";

export default function SuperAdminBadge() {
  const { user, isLoaded } = useUser();
  
  // This is a client-side check for UI only.
  // Security is enforced on the server via ADMIN_USER_IDS env var.
  const adminIds = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  const isAdmin = isLoaded && user && adminIds.includes(user.id);

  if (!isAdmin) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 group relative">
      <ShieldCheck className="w-3.5 h-3.5" />
      <span className="text-[10px] font-bold uppercase tracking-wider">SuperAdmin Access</span>
      
      {/* Tooltip */}
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-black border border-white/10 rounded-lg text-[9px] text-white/40 leading-tight opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
        You are in developer mode. Payment gates and waitlists are bypassed for your account.
      </div>
    </div>
  );
}

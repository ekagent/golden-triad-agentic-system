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
    <div className="eyebrow" style={{ 
      gap: '6px', 
      padding: '4px 10px',
      background: 'rgba(15, 111, 79, 0.08)',
      borderColor: 'rgba(15, 111, 79, 0.2)',
      position: 'relative',
      cursor: 'default'
    }}>
      <ShieldCheck size={12} strokeWidth={2.5} />
      <span style={{ fontSize: '10px', fontWeight: '700' }}>SuperAdmin</span>
    </div>
  );

}

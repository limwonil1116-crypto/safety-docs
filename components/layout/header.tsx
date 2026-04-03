"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
      style={{ background: "#1e3a5f" }}>
      <div className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#60a5fa">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
        </svg>
        <span className="text-white font-semibold text-sm">안전관리 시스템</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="text-white opacity-80">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: "#2563eb", color: "white" }}>
          임
        </div>
      </div>
    </header>
  );
}
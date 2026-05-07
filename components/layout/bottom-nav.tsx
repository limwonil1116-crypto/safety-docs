"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function BottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const taskCategory = pathname.startsWith("/tasks") ? (searchParams.get("category") || "CONTRACTOR") : "CONTRACTOR";
  const isContractorActive = pathname.startsWith("/tasks") && taskCategory === "CONTRACTOR";
  const isSelfActive = pathname.startsWith("/tasks") && taskCategory === "SELF";

  const navItems = [
    {
      key: "tasks-contractor",
      href: "/tasks?category=CONTRACTOR",
      label: "도급(용역)",
      isActive: isContractorActive,
      activeColor: "#16a34a",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      ),
    },
    {
      key: "tasks-self",
      href: "/tasks?category=SELF",
      label: "자체진단",
      isActive: isSelfActive,
      activeColor: "#2563eb",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
        </svg>
      ),
    },
    {
      key: "approvals",
      href: "/approvals",
      label: "결재현황",
      isActive: pathname.startsWith("/approvals"),
      activeColor: "#2563eb",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 11 12 14 22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      ),
    },
    {
      key: "tbm",
      href: "/tbm",
      label: "TBM",
      isActive: pathname.startsWith("/tbm"),
      activeColor: "#2563eb",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      key: "overview",
      href: "/overview",
      label: "현황",
      isActive: pathname.startsWith("/overview"),
      activeColor: "#2563eb",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
      ),
    },
    {
      key: "notifications",
      href: "/notifications",
      label: "알림",
      isActive: pathname.startsWith("/notifications"),
      activeColor: "#2563eb",
      badge: unreadCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ),
    },
    {
      key: "mypage",
      href: "/mypage",
      label: "나",
      isActive: pathname.startsWith("/mypage"),
      activeColor: "#2563eb",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
      {navItems.map((item) => (
        <Link key={item.key} href={item.href}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative"
          style={{ color: item.isActive ? item.activeColor : "#9ca3af" }}>
          {/* 상단 액티브 인디케이터 */}
          {item.isActive && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
              style={{ background: item.activeColor }} />
          )}
          <div className="relative">
            {item.icon}
            {"badge" in item && (item as any).badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {(item as any).badge > 99 ? "99+" : (item as any).badge}
              </span>
            )}
          </div>
          <span className="text-[9px] font-medium leading-tight">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function BottomNav() {
  return <Suspense fallback={null}><BottomNavInner /></Suspense>;
}

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

  // tasks 페이지에서 category 파라미터 확인
  const taskCategory = pathname.startsWith("/tasks") ? (searchParams.get("category") || "CONTRACTOR") : null;

  // 도급사업(용역) 선택 시 네비 라벨
  const tasksLabel = taskCategory === "SELF" ? "자체진단" : "도급(용역)";
  const tasksSubHref = taskCategory === "SELF" ? "/tasks?category=CONTRACTOR" : "/tasks?category=SELF";
  const tasksSubLabel = taskCategory === "SELF" ? "도급(용역)" : "자체진단";

  const navItems = [
    {
      href: "/tasks?category=CONTRACTOR",
      label: "과업",
      dynamicLabel: pathname.startsWith("/tasks") ? tasksLabel : "도급(용역)",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ),
    },
    {
      href: "/approvals",
      label: "결재현황",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 11 12 14 22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      ),
    },
    {
      href: "/tbm",
      label: "TBM",
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
      href: "/overview",
      label: "현황",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
      ),
    },
    {
      href: "/notifications",
      label: "알림",
      badge: unreadCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ),
    },
    {
      href: "/mypage",
      label: "나",
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
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const isTasksActive = item.href === "/tasks" && isActive;
        const label = (item as any).dynamicLabel || item.label;

        return (
          <div key={item.href} className="flex-1 flex flex-col items-center justify-center relative">
            {/* tasks 탭: 도급/자체 스위치 탭 표시 */}
            {isTasksActive && (
              <Link href={tasksSubHref}
                className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] px-2 py-0.5 rounded-full border font-medium"
                style={{ background: taskCategory === "SELF" ? "#dcfce7" : "#dbeafe", color: taskCategory === "SELF" ? "#16a34a" : "#2563eb", borderColor: taskCategory === "SELF" ? "#86efac" : "#93c5fd" }}>
                {tasksSubLabel} 전환
              </Link>
            )}
            <Link href={item.href}
              className="flex flex-col items-center justify-center py-2 gap-1 w-full relative"
              style={{ color: isActive ? "#2563eb" : "#9ca3af" }}>
              <div className="relative">
                {item.icon}
                {"badge" in item && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

export default function BottomNav() {
  return <Suspense fallback={null}><BottomNavInner /></Suspense>;
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Header from "@/components/layout/header";

export default function TbmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navItems = [
    {
      href: "/tbm",
      label: "TBM",
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
    },
    {
      href: "/mypage",
      label: "나",
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
    },
  ];
  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <Header />
      <main className="pt-14 pb-16">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/tbm" && pathname.startsWith("/tbm"));
          return (
            <Link key={item.href} href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-1"
              style={{ color: isActive ? "#2563eb" : "#9ca3af" }}>
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

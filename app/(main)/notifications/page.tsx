"use client";
import React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  targetDocumentId: string | null;
  isRead: boolean;
  sentAt: string;
  readAt: string | null;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactElement; color: string; bg: string }> = {
  APPROVED: {
    color: "text-green-600",
    bg: "bg-green-50",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
  REJECTED: {
    color: "text-red-500",
    bg: "bg-red-50",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
  },
  APPROVAL_REQUESTED: {
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
  MY_TURN: {
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  PDF_READY: {
    color: "text-purple-600",
    bg: "bg-purple-50",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  SYSTEM: {
    color: "text-gray-500",
    bg: "bg-gray-50",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.SYSTEM;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [list, setList] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setList(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setList((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) { console.error(e); }
    finally { setMarkingAll(false); }
  };

  const handleClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await fetch(`/api/notifications/${notification.id}`, { method: "PATCH" });
      setList((prev) =>
        prev.map((n) => n.id === notification.id ? { ...n, isRead: true } : n)
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    if (notification.targetDocumentId) {
      router.push(`/approvals/${notification.targetDocumentId}`);
    }
  };

  const filtered = filter === "unread" ? list.filter((n) => !n.isRead) : list;

  const grouped: Record<string, NotificationItem[]> = {};
  filtered.forEach((n) => {
    const date = new Date(n.sentAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let key: string;
    if (date.toDateString() === today.toDateString()) key = "오늘";
    else if (date.toDateString() === yesterday.toDateString()) key = "어제";
    else key = date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(n);
  });

  return (
    <div className="pb-20">
      {/* 헤더 */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-900">알림</h1>
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white font-medium">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAll} disabled={markingAll}
              className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 font-medium">
              {markingAll ? "처리 중..." : "모두 읽음"}
            </button>
          )}
        </div>

        {/* 탭 필터 */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {[
            { key: "all", label: "전체" },
            { key: "unread", label: `읽지 않음${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key as "all" | "unread")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1">
                  <div className="h-3.5 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 opacity-40">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p className="text-sm font-medium">
            {filter === "unread" ? "읽지 않은 알림이 없습니다" : "알림이 없습니다"}
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              {/* 날짜 구분선 */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium shrink-0">{dateLabel}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="space-y-2">
                {items.map((notification) => {
                  const config = getConfig(notification.type);
                  const hasLink = !!notification.targetDocumentId;

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleClick(notification)}
                      className={`relative bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                        notification.isRead
                          ? "border-gray-100 opacity-70"
                          : "border-blue-100 cursor-pointer hover:border-blue-300 hover:shadow-md"
                      } ${hasLink ? "cursor-pointer" : ""}`}
                    >
                      {/* 읽지 않은 dot */}
                      {!notification.isRead && (
                        <div className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-blue-500" />
                      )}

                      <div className="flex items-start gap-3">
                        {/* 아이콘 */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}>
                          {config.icon}
                        </div>

                        {/* 내용 */}
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className={`text-sm font-medium leading-tight ${
                              notification.isRead ? "text-gray-600" : "text-gray-900"
                            }`}>
                              {notification.title}
                            </p>
                          </div>
                          {notification.body && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-1.5">
                              {notification.body}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{timeAgo(notification.sentAt)}</span>
                            {hasLink && (
                              <span className="text-xs text-blue-500 flex items-center gap-0.5">
                                상세 보기
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="9 18 15 12 9 6"/>
                                </svg>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

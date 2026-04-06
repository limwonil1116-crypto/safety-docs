"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_SHORT, DocumentType } from "@/types";

interface ApprovalDoc {
  id: string;
  document_type: DocumentType;
  status: string;
  task_name: string;
  contractor_company_name?: string;
  writer_name?: string;
  current_approver_name?: string;
  submitted_at?: string;
  updated_at: string;
  is_my_turn: boolean;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  SUBMITTED: { bg: "bg-blue-100",  text: "text-blue-600",  label: "제출완료" },
  IN_REVIEW: { bg: "bg-amber-100", text: "text-amber-600", label: "검토중" },
  APPROVED:  { bg: "bg-green-100", text: "text-green-600", label: "검토완료" },
  REJECTED:  { bg: "bg-red-100",   text: "text-red-600",   label: "반려" },
};

const TABS = [
  { key: "ALL",                label: "전체" },
  { key: "SAFETY_WORK_PERMIT", label: "붙임1" },
  { key: "CONFINED_SPACE",     label: "붙임2" },
  { key: "HOLIDAY_WORK",       label: "붙임3" },
  { key: "POWER_OUTAGE",       label: "붙임4" },
];

const DATE_FILTERS = [
  { key: "ALL",        label: "오늘" },
  { key: "THIS_WEEK",  label: "이번 주" },
  { key: "THIS_MONTH", label: "이번 달" },
];

export default function ApprovalsPage() {
  const [docs, setDocs] = useState<ApprovalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [myTurnCount, setMyTurnCount] = useState(0);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.set("type", activeTab);
      if (dateFilter !== "ALL") params.set("date", dateFilter);
      if (search) params.set("keyword", search);

      const res = await fetch(`/api/approvals?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "불러오기 실패");
      setDocs(data.documents ?? []);
      setTypeCounts(data.typeCounts ?? {});
      setMyTurnCount(data.myTurnCount ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateFilter, search]);

  useEffect(() => {
    const timer = setTimeout(fetchApprovals, 300);
    return () => clearTimeout(timer);
  }, [fetchApprovals]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
    }).replace(/\. /g, ".").replace(/\.$/, "");
  };

  return (
    <div>
      {/* 상단 헤더 */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-gray-900">승인 목록</h1>
          {myTurnCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-600">
              내 차례 {myTurnCount}건
            </span>
          )}
        </div>
        {/* 날짜 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setDateFilter(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                dateFilter === f.key ? "text-white" : "bg-gray-100 text-gray-600"
              }`}
              style={dateFilter === f.key ? { background: "#2563eb" } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-200 flex overflow-x-auto">
        {TABS.map((tab) => {
          const count = tab.key === "ALL"
            ? (typeCounts.ALL ?? 0)
            : (typeCounts[tab.key] ?? 0);
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 검색 */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="과업명, 업체명, 작성자 검색"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 목록 */}
      <div className="px-4 pb-4 space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">{error}</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-50">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-sm">해당 문서가 없습니다</p>
          </div>
        ) : (
          docs.map((doc) => {
            const style = STATUS_STYLE[doc.status] ?? STATUS_STYLE.SUBMITTED;
            const typeShort = DOCUMENT_TYPE_SHORT[doc.document_type] ?? doc.document_type;
            const typeLabel = DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type;
            const isMyTurn = doc.is_my_turn === true || String(doc.is_my_turn) === "true";
            return (
              <Link key={doc.id} href={`/approvals/${doc.id}`}>
                <div className={`bg-white rounded-2xl p-4 shadow-sm border transition-shadow hover:shadow-md ${
                  isMyTurn ? "border-blue-200" : "border-gray-100"
                }`}>
                  {isMyTurn && (
                    <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-blue-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse inline-block"/>
                      내 차례입니다
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                        {typeShort}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{doc.task_name}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{typeLabel}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                    {doc.contractor_company_name && <span>{doc.contractor_company_name}</span>}
                    {doc.contractor_company_name && <span>·</span>}
                    <span>작성자: {doc.writer_name}</span>
                    {doc.submitted_at && (
                      <>
                        <span>·</span>
                        <span>{formatDate(doc.submitted_at)}</span>
                      </>
                    )}
                  </div>
                  {doc.current_approver_name && (
                    <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      현재 검토자: {doc.current_approver_name}
                    </div>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
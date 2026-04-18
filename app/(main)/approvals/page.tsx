"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_SHORT, DocumentType } from "@/types";

interface ApprovalDoc {
  id: string;
  document_type: DocumentType;
  status: string;
  current_approval_order?: number;
  task_name: string;
  contractor_company_name?: string;
  writer_name?: string;
  current_approver_name?: string;
  submitted_at?: string;
  updated_at: string;
  is_my_turn: boolean;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:           { bg: "bg-gray-100",   text: "text-gray-500",   label: "작성중" },
  SUBMITTED:       { bg: "bg-blue-100",   text: "text-blue-600",   label: "제출완료" },
  IN_REVIEW:       { bg: "bg-amber-100",  text: "text-amber-600",  label: "검토중" },
  IN_REVIEW_FINAL: { bg: "bg-orange-100", text: "text-orange-600", label: "최종결재 진행중" },
  APPROVED:        { bg: "bg-green-100",  text: "text-green-600",  label: "승인완료" },
  REJECTED:        { bg: "bg-red-100",    text: "text-red-600",    label: "반려" },
};

function getStatusKey(doc: ApprovalDoc): string {
  if (doc.status === "IN_REVIEW" && doc.current_approval_order === 2) return "IN_REVIEW_FINAL";
  return doc.status;
}

// ✅ 4번: 법정서류 제목으로 탭 변경
const TABS = [
  { key: "ALL",                label: "전체" },
  { key: "SAFETY_WORK_PERMIT", label: "안전작업허가서" },
  { key: "CONFINED_SPACE",     label: "밀폐공간작업허가서" },
  { key: "HOLIDAY_WORK",       label: "휴일작업신청서" },
  { key: "POWER_OUTAGE",       label: "정전작업허가서" },
];

const DATE_FILTERS = [
  { key: "ALL",        label: "전체" },
  { key: "THIS_WEEK",  label: "이번 주" },
  { key: "THIS_MONTH", label: "이번 달" },
];

function ApprovalStepFlow({ doc }: { doc: ApprovalDoc }) {
  const step1 = doc.status !== "DRAFT" ? "done" : "active";

  let step2: "done" | "active" | "pending" | "rejected" = "pending";
  let step3: "done" | "active" | "pending" | "rejected" = "pending";

  if (doc.status === "SUBMITTED") {
    step2 = "active";
  } else if (doc.status === "IN_REVIEW") {
    if (doc.current_approval_order === 1) {
      step2 = "active";
    } else if (doc.current_approval_order === 2) {
      step2 = "done";
      step3 = "active";
    }
  } else if (doc.status === "APPROVED") {
    step2 = "done";
    step3 = "done";
  } else if (doc.status === "REJECTED") {
    step2 = "rejected";
  }

  const stepColor = (s: "done" | "active" | "pending" | "rejected") => {
    if (s === "done")     return { bg: "#2563eb", icon: "white" };
    if (s === "active")   return { bg: "#f59e0b", icon: "white" };
    if (s === "rejected") return { bg: "#dc2626", icon: "white" };
    return { bg: "#e5e7eb", icon: "#9ca3af" };
  };

  const c1 = stepColor(step1);
  const c2 = stepColor(step2);
  const c3 = stepColor(step3);
  const line1Color = step1 === "done" ? "#2563eb" : "#e5e7eb";
  const line2Color = step2 === "done" ? "#2563eb" : "#e5e7eb";

  return (
    <div className="flex items-center gap-1 mt-2.5">
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: c1.bg }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c1.icon} strokeWidth="2.5" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <span className="text-[9px] text-gray-500 font-medium">신청</span>
      </div>

      <div className="flex-1 h-0.5 mb-3.5 rounded" style={{ backgroundColor: line1Color }} />

      <div className="flex flex-col items-center gap-0.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center relative"
          style={{ backgroundColor: c2.bg, boxShadow: step2 === "active" ? `0 0 0 3px ${c2.bg}44` : undefined }}>
          {step2 === "rejected" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c2.icon} strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c2.icon} strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="7"/>
              <line x1="21" y1="21" x2="15.65" y2="15.65"/>
            </svg>
          )}
          {step2 === "active" && (
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white animate-pulse" />
          )}
        </div>
        <span className="text-[9px] text-gray-500 font-medium">검토</span>
      </div>

      <div className="flex-1 h-0.5 mb-3.5 rounded" style={{ backgroundColor: line2Color }} />

      <div className="flex flex-col items-center gap-0.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center relative"
          style={{ backgroundColor: c3.bg, boxShadow: step3 === "active" ? `0 0 0 3px ${c3.bg}44` : undefined }}>
          {step3 === "done" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c3.icon} strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10" strokeWidth="2.5"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c3.icon} strokeWidth="2" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          )}
          {step3 === "active" && (
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white animate-pulse" />
          )}
        </div>
        <span className="text-[9px] text-gray-500 font-medium">허가</span>
      </div>

      {doc.current_approver_name && (
        <div className="ml-2 text-[10px] text-amber-600 font-medium shrink-0 max-w-[70px] truncate">
          {doc.current_approver_name}
        </div>
      )}
    </div>
  );
}

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
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.set("type", activeTab);
      if (dateFilter !== "ALL") params.set("date", dateFilter);
      if (search) params.set("keyword", search);
      const res = await fetch(`/api/approvals?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "데이터 오류");
      setDocs(data.documents ?? []);
      setTypeCounts(data.typeCounts ?? {});
      setMyTurnCount(data.myTurnCount ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
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
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-gray-900">결재현황</h1>
          {myTurnCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-600">
              내 차례 {myTurnCount}건
            </span>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {DATE_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setDateFilter(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                dateFilter === f.key ? "text-white" : "bg-gray-100 text-gray-600"
              }`}
              style={dateFilter === f.key ? { background: "#2563eb" } : {}}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ✅ 4번: 법정서류 이름 탭 */}
      <div className="bg-white border-b border-gray-200 flex overflow-x-auto">
        {TABS.map((tab) => {
          const count = tab.key === "ALL" ? (typeCounts.ALL ?? 0) : (typeCounts[tab.key] ?? 0);
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-700"
              }`}>
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="용역명, 업체명으로 검색하세요"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

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
            <p className="text-sm">결재 목록이 없습니다</p>
          </div>
        ) : (
          docs.map((doc) => {
            const statusKey = getStatusKey(doc);
            const style = STATUS_STYLE[statusKey] ?? STATUS_STYLE.SUBMITTED;
            const typeShort = DOCUMENT_TYPE_SHORT[doc.document_type] ?? doc.document_type;
            const typeLabel = DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type;
            const isMyTurn = doc.is_my_turn === true || String(doc.is_my_turn) === "true";
            return (
              <Link key={doc.id} href={
                doc.status === "DRAFT"
                  ? `/tasks/${(doc as any).task_id ?? ""}`
                  : `/approvals/${doc.id}`
              }>
                <div className={`bg-white rounded-2xl p-4 shadow-sm border transition-shadow hover:shadow-md ${
                  isMyTurn ? "border-blue-200" :
                  doc.status === "DRAFT" ? "border-dashed border-gray-200" :
                  "border-gray-100"
                }`}>
                  {doc.status === "DRAFT" && (
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      작성 중 - 용역 페이지에서 이어서 작성
                    </div>
                  )}
                  {isMyTurn && (
                    <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-blue-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse inline-block"/>
                      내 결재 차례입니다
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{typeShort}</span>
                      <span className="text-sm font-semibold text-gray-900">{doc.task_name}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-1 ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{typeLabel}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                    {doc.contractor_company_name && <span>{doc.contractor_company_name}</span>}
                    {doc.contractor_company_name && <span>·</span>}
                    <span>작성자: {doc.writer_name}</span>
                    {doc.submitted_at && <><span>·</span><span>{formatDate(doc.submitted_at)}</span></>}
                  </div>
                  {doc.status !== "DRAFT" && <ApprovalStepFlow doc={doc} />}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

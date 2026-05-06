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
  task_description?: string;
  contractor_company_name?: string;
  writer_name?: string;
  current_approver_name?: string;
  submitted_at?: string;
  updated_at: string;
  is_my_turn: boolean;
}

const getTaskCategory = (desc?: string): "CONTRACTOR" | "SELF" => {
  try { return JSON.parse(desc || "{}").category === "SELF" ? "SELF" : "CONTRACTOR"; } catch { return "CONTRACTOR"; }
};


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
  const isConfined = doc.document_type === "CONFINED_SPACE";
  type StepStatus = "done" | "active" | "pending" | "rejected";

  const stepColor = (s: StepStatus) => {
    if (s === "done")     return { bg: "#2563eb", icon: "white" };
    if (s === "active")   return { bg: "#f59e0b", icon: "white" };
    if (s === "rejected") return { bg: "#dc2626", icon: "white" };
    return { bg: "#e5e7eb", icon: "#9ca3af" };
  };

  const StepDot = ({ s, label, type }: { s: StepStatus; label: string; type: "doc"|"search"|"shield" }) => {
    const c = stepColor(s);
    const icons: Record<string, React.ReactElement> = {
      doc: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
      search: s === "rejected"
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="15.65" y2="15.65"/></svg>,
      shield: s === "done"
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    };
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-7 h-7 rounded-full flex items-center justify-center relative"
          style={{ backgroundColor: c.bg, boxShadow: s === "active" ? `0 0 0 3px ${c.bg}44` : undefined }}>
          {icons[type]}
          {s === "active" && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-white animate-pulse" />}
        </div>
        <span className="text-[8px] text-gray-500 font-medium text-center leading-tight whitespace-nowrap">{label}</span>
      </div>
    );
  };

  const Line = ({ active }: { active: boolean }) => (
    <div className="flex-1 h-0.5 mb-3.5 rounded" style={{ backgroundColor: active ? "#2563eb" : "#e5e7eb" }} />
  );

  if (isConfined) {
    // 밀폐공간 5단계: 신청→감시인→계획확인→측정→이행확인
    const ord = doc.current_approval_order ?? 0;
    const st = doc.status;
    const s0: StepStatus = st !== "DRAFT" ? "done" : "active";
    const s1: StepStatus = st === "SUBMITTED" ? "active" : ord >= 1 ? (st === "REJECTED" && ord === 1 ? "rejected" : ord === 1 && st === "IN_REVIEW" ? "active" : "done") : "pending";
    const s2: StepStatus = ord === 2 && st === "IN_REVIEW" ? "active" : ord > 2 || st === "APPROVED" ? "done" : "pending";
    const s3: StepStatus = ord === 3 && st === "IN_REVIEW" ? "active" : ord > 3 || st === "APPROVED" ? "done" : "pending";
    const s4: StepStatus = ord === 4 && st === "IN_REVIEW" ? "active" : st === "APPROVED" ? "done" : "pending";
    return (
      <div className="flex items-center gap-0.5 mt-2.5">
        <StepDot s={s0} label="신청" type="doc" />
        <Line active={s1 === "done" || s1 === "active"} />
        <StepDot s={s1} label="감시인" type="search" />
        <Line active={s2 === "done" || s2 === "active"} />
        <StepDot s={s2} label="계획확인" type="shield" />
        <Line active={s3 === "done" || s3 === "active"} />
        <StepDot s={s3} label="측정" type="search" />
        <Line active={s4 === "done" || s4 === "active"} />
        <StepDot s={s4} label="이행확인" type="shield" />
        {doc.current_approver_name && (
          <div className="ml-1 text-[9px] text-amber-600 font-medium shrink-0 max-w-[50px] truncate">{doc.current_approver_name}</div>
        )}
      </div>
    );
  }

  // 일반 3단계
  const step1: StepStatus = doc.status !== "DRAFT" ? "done" : "active";
  let step2: StepStatus = "pending";
  let step3: StepStatus = "pending";
  if (doc.status === "SUBMITTED") { step2 = "active"; }
  else if (doc.status === "IN_REVIEW") {
    if (doc.current_approval_order === 1) step2 = "active";
    else if (doc.current_approval_order === 2) { step2 = "done"; step3 = "active"; }
  } else if (doc.status === "APPROVED") { step2 = "done"; step3 = "done"; }
  else if (doc.status === "REJECTED") { step2 = "rejected"; }

  const isSafetyPermit = doc.document_type === "SAFETY_WORK_PERMIT";
  return (
    <div className="flex items-center gap-1 mt-2.5">
      <StepDot s={step1} label="신청" type="doc" />
      <Line active={step2 === "done" || step2 === "active"} />
      <StepDot s={step2} label={isSafetyPermit ? "계획확인" : "검토"} type="search" />
      <Line active={step3 === "done" || step3 === "active"} />
      <StepDot s={step3} label={isSafetyPermit ? "이행확인" : "허가"} type="shield" />
      {doc.current_approver_name && (
        <div className="ml-2 text-[10px] text-amber-600 font-medium shrink-0 max-w-[70px] truncate">{doc.current_approver_name}</div>
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
  const [categoryFilter, setCategoryFilter] = useState<"ALL"|"CONTRACTOR"|"SELF">("ALL");
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

  const filteredDocs = docs.filter(doc => {
    if (categoryFilter !== "ALL") {
      const cat = getTaskCategory((doc as any).task_description);
      if (cat !== categoryFilter) return false;
    }
    return true;
  });

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
          <div className="w-px h-4 bg-gray-200 mx-0.5 self-center" />
          {(["ALL","CONTRACTOR","SELF"] as const).map(f => (
            <button key={f} onClick={() => setCategoryFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === f
                  ? f === "SELF" ? "bg-green-600 text-white" : f === "CONTRACTOR" ? "bg-blue-600 text-white" : "bg-gray-700 text-white"
                  : f === "SELF" ? "text-green-600 border border-green-200 bg-white" : f === "CONTRACTOR" ? "text-blue-600 border border-blue-200 bg-white" : "bg-gray-100 text-gray-600"
              }`}>
              {f === "ALL" ? "전체" : f === "CONTRACTOR" ? "[용역]" : "[자체진단]"}
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
          filteredDocs.map((doc) => {
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
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold mr-1 shrink-0 ${getTaskCategory((doc as any).task_description) === "SELF" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {getTaskCategory((doc as any).task_description) === "SELF" ? "[자체진단]" : "[용역]"}
                      </span>
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

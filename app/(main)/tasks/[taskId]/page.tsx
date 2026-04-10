"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_SHORT, DocumentType } from "@/types";

interface TaskDetail {
  id: string;
  name: string;
  contractorCompanyName?: string;
  startDate?: string;
  endDate?: string;
  status: string;
}

interface ApprovalLineSummary {
  approvalOrder: number;
  approverName?: string;
  approverOrg?: string;
  stepStatus: string;
}

interface DocumentItem {
  id: string;
  taskId: string;
  documentType: DocumentType;
  status: string;
  currentApprovalOrder?: number;
  writerName?: string;
  submittedAt?: string;
  currentApproverName?: string;
  approvalLines?: ApprovalLineSummary[];
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:              { bg: "bg-gray-100",   text: "text-gray-600",   label: "작성중" },
  SUBMITTED:          { bg: "bg-blue-100",   text: "text-blue-600",   label: "제출완료" },
  IN_REVIEW:          { bg: "bg-amber-100",  text: "text-amber-600",  label: "검토중" },
  IN_REVIEW_FINAL:    { bg: "bg-orange-100", text: "text-orange-600", label: "최종검토 진행중" },
  APPROVED:           { bg: "bg-green-100",  text: "text-green-600",  label: "승인완료" },
  REJECTED:           { bg: "bg-red-100",    text: "text-red-600",    label: "반려" },
};

function getStatusKey(doc: DocumentItem): string {
  if (doc.status === "IN_REVIEW" && doc.currentApprovalOrder === 2) {
    return "IN_REVIEW_FINAL";
  }
  return doc.status;
}

const TABS = [
  { key: "ALL",                label: "전체" },
  { key: "SAFETY_WORK_PERMIT", label: "붙임1" },
  { key: "CONFINED_SPACE",     label: "붙임2" },
  { key: "HOLIDAY_WORK",       label: "붙임3" },
  { key: "POWER_OUTAGE",       label: "붙임4" },
];

const DOC_TYPES = [
  { key: "SAFETY_WORK_PERMIT", label: "붙임1", desc: "안전작업허가서" },
  { key: "CONFINED_SPACE",     label: "붙임2", desc: "밀폐공간작업허가서" },
  { key: "HOLIDAY_WORK",       label: "붙임3", desc: "휴일작업 신청서" },
  { key: "POWER_OUTAGE",       label: "붙임4", desc: "정전작업 허가서" },
];

function CreateDocumentModal({
  taskId,
  onClose,
  onCreated,
}: {
  taskId: string;
  onClose: () => void;
  onCreated: (docId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!selected) { setError("서류 종류를 선택해주세요."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, documentType: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");
      onCreated(data.document.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">서류 양식 작성</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="space-y-2 mb-5">
          {DOC_TYPES.map((type) => (
            <button
              key={type.key}
              onClick={() => setSelected(type.key)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                selected === type.key ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                selected === type.key ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {type.label}
              </span>
              <span className={`text-sm font-medium ${selected === type.key ? "text-blue-700" : "text-gray-700"}`}>
                {type.desc}
              </span>
              {selected === type.key && (
                <svg className="ml-auto text-blue-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={loading || !selected}
          className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50"
          style={{ background: "#2563eb" }}
        >
          {loading ? "작성 중..." : "서류 작성 시작"}
        </button>
      </div>
    </div>
  );
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [docList, setDocList] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancelApproval = async (docId: string) => {
    if (!confirm("결재를 취소하고 작성중 상태로 되돌리시겠습니까?\n(결재라인이 초기화됩니다)")) return;
    setCancellingId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");
      alert("결재가 취소되었습니다. 서류를 다시 작성할 수 있습니다.");
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "취소에 실패했습니다.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleDeleteDocument = async (docId: string, docType: string) => {
    if (!confirm(`"${docType}" 서류를 삭제하시겠습니까?\n\n삭제된 서류는 복구할 수 없습니다.`)) return;
    try {
      const res = await fetch(`/api/documents/${docId}/delete`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "삭제 실패");
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "데이터 오류");
      setTask(data.task);
      setDocList(data.documents);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = activeTab === "ALL" ? docList : docList.filter((d) => d.documentType === activeTab);

  const formatPeriod = () => {
    if (!task) return "";
    const fmt = (d: string) => new Date(d).toLocaleDateString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit"
    }).replace(/\. /g, ".").replace(/\.$/, "");
    const start = task.startDate ? fmt(task.startDate) : "";
    const end = task.endDate ? fmt(task.endDate) : "";
    if (start && end) return `${start} ~ ${end}`;
    if (start) return `${start} ~`;
    return "";
  };

  if (loading) {
    return (
      <div>
        <div className="px-4 pt-4 pb-3 animate-pulse" style={{ background: "#1e3a5f" }}>
          <div className="h-4 bg-blue-800 rounded w-20 mb-3" />
          <div className="h-5 bg-blue-800 rounded w-3/4 mb-2" />
          <div className="h-3 bg-blue-900 rounded w-1/2" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center py-12 text-red-500 text-sm">
        {error}
        <button onClick={fetchData} className="block mx-auto mt-3 text-blue-500 underline text-xs">다시 시도</button>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 pt-4 pb-3" style={{ background: "#1e3a5f" }}>
        <Link href="/tasks" className="flex items-center gap-1 text-blue-300 text-sm mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          용역 목록
        </Link>
        <h2 className="text-white font-bold text-base">{task?.name}</h2>
        {task?.contractorCompanyName && <p className="text-blue-200 text-xs mt-0.5">{task.contractorCompanyName}</p>}
        {formatPeriod() && <p className="text-blue-300 text-xs mt-0.5">{formatPeriod()}</p>}
      </div>

      <div className="bg-white border-b border-gray-200 flex overflow-x-auto">
        {TABS.map((tab) => {
          const count = tab.key === "ALL" ? docList.length : docList.filter((d) => d.documentType === tab.key).length;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
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

      <div className="p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-50">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-sm">작성된 서류가 없습니다</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 text-blue-500 text-sm underline">
              서류 작성하기
            </button>
          </div>
        ) : (
          filtered.map((doc) => {
            const statusKey = getStatusKey(doc);
            const style = STATUS_STYLE[statusKey] ?? STATUS_STYLE.DRAFT;
            const typeShort = DOCUMENT_TYPE_SHORT[doc.documentType] ?? doc.documentType;
            const typeLabel = DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType;
            const canEdit = doc.status === "DRAFT" || doc.status === "REJECTED";

            return (
              <div key={doc.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{typeShort}</span>
                    <span className="text-sm font-medium text-gray-900">{typeLabel}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  {doc.writerName && <span>작성자: {doc.writerName}</span>}
                  {doc.submittedAt && <span>제출: {doc.submittedAt}</span>}
                  {doc.currentApproverName && (
                    <span className="flex items-center gap-0.5 text-amber-600">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                      현재 결재자: {doc.currentApproverName}
                    </span>
                  )}
                </div>

                {/* 결재 단계 표시 - 1단계(신청자) / 2단계 / 3단계 */}
                {doc.approvalLines && doc.approvalLines.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {/* 1단계: 신청자 (작성자) */}
                    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
                      doc.status !== "DRAFT" ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"
                    }`}>
                      <span className="font-medium">1단계</span>
                      <span>{doc.writerName ?? "신청자"}</span>
                      {doc.status !== "DRAFT" && <span>✓</span>}
                    </div>
                    {/* 2단계 이상: approvalLines */}
                    {doc.approvalLines.map((line) => {
                      const isDone = line.stepStatus === "APPROVED";
                      const isActive = line.stepStatus === "WAITING";
                      const isRejected = line.stepStatus === "REJECTED";
                      return (
                        <div key={line.approvalOrder}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
                            isDone     ? "bg-green-50 text-green-600" :
                            isActive   ? "bg-amber-50 text-amber-600" :
                            isRejected ? "bg-red-50 text-red-500" :
                            "bg-gray-50 text-gray-400"
                          }`}>
                          <span className="font-medium">{line.approvalOrder + 1}단계</span>
                          <span>{line.approverName ?? "미정"}</span>
                          {line.approverOrg && <span className="opacity-60">· {line.approverOrg}</span>}
                          {isDone     && <span>✓</span>}
                          {isActive   && <span className="animate-pulse">●</span>}
                          {isRejected && <span>✗</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  {/* 상세보기 버튼 - /approvals/[documentId] 로 이동 (올바른 경로) */}
                  <button
                    onClick={() => router.push(`/approvals/${doc.id}`)}
                    className="flex-1 text-center py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    상세 보기
                  </button>
                  {/* 편집 버튼 - DRAFT/REJECTED만 */}
                  {canEdit && (
                    <Link
                      href={`/tasks/${taskId}/documents/${doc.id}/edit`}
                      className="flex-1 text-center py-2 rounded-xl text-sm font-medium text-white"
                      style={{ background: doc.status === "REJECTED" ? "#dc2626" : "#2563eb" }}
                    >
                      {doc.status === "REJECTED" ? "재작성" : "이어서 작성"}
                    </Link>
                  )}
                  {/* 결재 취소 버튼 - DRAFT/REJECTED 제외 전부 */}
                  {!canEdit && doc.status !== "DRAFT" && (
                    <button
                      onClick={() => handleCancelApproval(doc.id)}
                      disabled={cancellingId === doc.id}
                      className="flex-1 py-2 rounded-xl text-sm font-medium border-2 border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                    >
                      {cancellingId === doc.id ? "취소중..." : "결재 취소"}
                    </button>
                  )}
                  {/* 삭제 버튼 - DRAFT만 */}
                  {doc.status === "DRAFT" && (
                    <button
                      onClick={() => handleDeleteDocument(doc.id, DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType)}
                      className="px-3 py-2 rounded-xl text-sm font-medium border-2 border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{ background: "#2563eb" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {showCreate && (
        <CreateDocumentModal
          taskId={taskId}
          onClose={() => setShowCreate(false)}
          onCreated={(docId) => {
            setShowCreate(false);
            router.push(`/tasks/${taskId}/documents/${docId}/edit`);
          }}
        />
      )}
    </div>
  );
}

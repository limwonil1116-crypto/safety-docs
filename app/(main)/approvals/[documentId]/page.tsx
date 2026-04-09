"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_SHORT, DocumentType } from "@/types";

interface DocumentDetail {
  id: string;
  taskId: string;
  documentType: DocumentType;
  status: string;
  formDataJson: Record<string, unknown>;
  submittedAt?: string;
  createdBy: string;
  currentApproverUserId?: string;
  currentApprovalOrder?: number;
}

interface ApprovalLine {
  id: string;
  approvalOrder: number;
  approvalRole: string;
  stepStatus: string;
  approverName?: string;
  approverOrg?: string;
  approverUserId?: string;
  actedAt?: string;
  comment?: string;
  signatureData?: string;
}

interface UserItem {
  id: string;
  name: string;
  organization?: string;
  employeeNo?: string;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  SUBMITTED:       { bg: "bg-blue-100",   text: "text-blue-600",   label: "제출완료" },
  IN_REVIEW:       { bg: "bg-amber-100",  text: "text-amber-600",  label: "검토중" },
  IN_REVIEW_FINAL: { bg: "bg-orange-100", text: "text-orange-600", label: "최종결재 진행중" },
  APPROVED:        { bg: "bg-green-100",  text: "text-green-600",  label: "승인완료" },
  REJECTED:        { bg: "bg-red-100",    text: "text-red-600",    label: "반려" },
  DRAFT:           { bg: "bg-gray-100",   text: "text-gray-600",   label: "작성중" },
};

function getStatusKey(doc: DocumentDetail): string {
  if (doc.status === "IN_REVIEW" && doc.currentApprovalOrder === 2) return "IN_REVIEW_FINAL";
  return doc.status;
}

const STEP_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:  { bg: "bg-gray-100",  text: "text-gray-500",  label: "대기" },
  WAITING:  { bg: "bg-amber-100", text: "text-amber-600", label: "검토중" },
  APPROVED: { bg: "bg-green-100", text: "text-green-600", label: "승인" },
  REJECTED: { bg: "bg-red-100",   text: "text-red-600",   label: "반려" },
  SKIPPED:  { bg: "bg-gray-100",  text: "text-gray-400",  label: "생략" },
};

const ROLE_LABELS: Record<string, Record<number, string>> = {
  SAFETY_WORK_PERMIT: { 1: "최종검토자", 2: "최종허가자" },
  CONFINED_SPACE:     { 1: "허가자",     2: "확인자" },
  HOLIDAY_WORK:       { 1: "검토자",     2: "승인자" },
  POWER_OUTAGE:       { 1: "허가자",     2: "확인자" },
};

const FINAL_ROLE_LABELS: Record<string, string> = {
  SAFETY_WORK_PERMIT: "최종허가자",
  CONFINED_SPACE:     "확인자",
  HOLIDAY_WORK:       "승인자",
  POWER_OUTAGE:       "확인자",
};

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="text-gray-400 w-24 flex-shrink-0 text-sm">{label}</span>
      <span className="text-gray-900 text-sm">{value}</span>
    </div>
  );
}

// 최종허가자 지정 모달
function FinalApproverModal({
  documentId,
  documentType,
  onClose,
  onAssigned,
}: {
  documentId: string;
  documentType: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const finalRoleLabel = FINAL_ROLE_LABELS[documentType] ?? "최종허가자";

  useEffect(() => {
    const q = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";
    fetch(`/api/users?krcOnly=true${q}`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []));
  }, [keyword]);

  const handleAssign = async () => {
    if (!selected) { setError("결재자를 선택해주세요."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/approval-lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalApproverUserId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");
      onAssigned();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-10 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">{finalRoleLabel} 지정</h2>
          <button onClick={onClose} className="text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 mb-4 text-xs text-amber-700">
          검토가 완료되었습니다. 최종 결재권자를 지정해주세요.
        </div>
        <div className={`p-3 rounded-xl border-2 mb-4 ${selected ? "border-green-400 bg-green-50" : "border-dashed border-gray-300"}`}>
          <div className="text-xs text-gray-500 mb-1">{finalRoleLabel} <span className="text-red-500">*</span></div>
          {selected ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-900">{selected.name}</span>
                <span className="text-xs text-gray-500 ml-2">{selected.organization}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-red-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">아래 목록에서 선택하세요</p>
          )}
        </div>
        <div className="relative mb-2">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            placeholder="이름으로 검색"
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
          {users.filter((u) => u.id !== selected?.id).map((u) => (
            <button key={u.id} onClick={() => setSelected(u)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-green-400 hover:bg-green-50 transition-colors text-left">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm shrink-0">
                {u.name[0]}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{u.name}</div>
                <div className="text-xs text-gray-500">{u.organization}{u.employeeNo ? ` · ${u.employeeNo}` : ""}</div>
              </div>
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button onClick={handleAssign} disabled={loading || !selected}
          className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50"
          style={{ background: "#16a34a" }}>
          {loading ? "지정 중.." : `${finalRoleLabel} 지정하기`}
        </button>
      </div>
    </div>
  );
}

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [approvalLines, setApprovalLines] = useState<ApprovalLine[]>([]);
  const [taskName, setTaskName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [myApprovalOrder, setMyApprovalOrder] = useState(0);
  const [myUserId, setMyUserId] = useState("");
  const [myRole, setMyRole] = useState("");
  const [activeTab, setActiveTab] = useState("내용");
  const [comment, setComment] = useState("");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showSign, setShowSign] = useState(false);
  const [showFinalApprover, setShowFinalApprover] = useState(false);
  const [pendingAction, setPendingAction] = useState<"APPROVE" | "REJECT" | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [docRes, linesRes] = await Promise.all([
        fetch(`/api/documents/${documentId}`),
        fetch(`/api/documents/${documentId}/approval-lines`),
      ]);
      const docData = await docRes.json();
      const linesData = await linesRes.json();
      if (!docRes.ok) throw new Error(docData.error || "데이터 오류");
      const docObj = docData.document;
      setDoc(docObj);
      const lines = linesData.approvalLines ?? [];
      setApprovalLines(lines);

      const taskRes = await fetch(`/api/tasks/${docObj.taskId}`);
      const taskData = await taskRes.json();
      if (taskRes.ok) setTaskName(taskData.task?.name ?? "");

      const meRes = await fetch("/api/users/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        const myId = meData.user?.id;
        setMyUserId(myId);
        setMyRole(meData.user?.role ?? "");
        setIsMyTurn(docObj.currentApproverUserId === myId);
        const myLine = lines.find((l: ApprovalLine & { approverUserId?: string }) => l.approverUserId === myId);
        setMyApprovalOrder(myLine?.approvalOrder ?? 0);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 결재 취소
  const handleCancelApproval = async () => {
    if (!confirm("결재를 취소하고 재작성 상태로 되돌리시겠습니까?\n(결재선이 초기화됩니다)")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");
      alert("결재가 취소되었습니다. 과업 페이지에서 재작성할 수 있습니다.");
      router.back();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "취소에 실패했습니다.");
    } finally {
      setCancelling(false);
    }
  };

  const initCanvas = () => {
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#1e3a5f";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
    }, 100);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
        y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height),
      };
    }
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    isDrawing.current = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    if (action === "REJECT" && !comment.trim()) {
      alert("반려 의견을 입력해주세요.");
      return;
    }
    setPendingAction(action);
    setShowRejectConfirm(false);
    setShowApproveConfirm(false);
    setShowSign(true);
    initCanvas();
  };

  const handleSubmitWithSign = async () => {
    if (!pendingAction) return;
    setProcessing(true);
    try {
      // 서명 데이터 추출
      const canvas = canvasRef.current;
      const signatureData = canvas ? canvas.toDataURL("image/png") : null;

      const res = await fetch(`/api/documents/${documentId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pendingAction,
          comment: comment.trim() || null,
          signatureData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");
      setShowSign(false);
      if (data.action === "NEED_FINAL_APPROVER") {
        setShowFinalApprover(true);
      } else if (data.action === "APPROVED") {
        alert("최종 승인이 완료되었습니다!");
        router.push("/approvals");
      } else {
        alert("처리되었습니다.");
        router.push("/approvals");
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "서버 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="h-10 bg-gray-100 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="p-4 text-center py-12 text-red-500 text-sm">
        {error || "문서를 찾을 수 없습니다."}
        <button onClick={fetchData} className="block mx-auto mt-3 text-blue-500 underline text-xs">다시 시도</button>
      </div>
    );
  }

  const fd = doc.formDataJson;
  const statusKey = getStatusKey(doc);
  const typeShort = DOCUMENT_TYPE_SHORT[doc.documentType] ?? doc.documentType;
  const typeLabel = DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType;
  const statusStyle = STATUS_STYLE[statusKey] ?? STATUS_STYLE.SUBMITTED;
  const roleLabels = ROLE_LABELS[doc.documentType] ?? {};
  const rw = (fd.riskWorkTypes ?? {}) as Record<string, boolean>;
  const rf = (fd.riskFactors ?? {}) as Record<string, boolean>;

  const riskItems = [
    rw.highPlace ? "고소작업" : "",
    rw.waterWork ? "수중/수변" : "",
    rw.confinedSpace ? "밀폐공간" : "",
    rw.powerOutage ? "정전작업" : "",
    rw.fireWork ? "화기작업" : "",
  ].filter(Boolean);

  const factorItems = [
    rf.narrowAccess ? "협소한 접근로" : "",
    rf.slippery ? "미끄러운 지반" : "",
    rf.steepSlope ? "급경사면" : "",
    rf.waterHazard ? "수변위험" : "",
    rf.rockfall ? "낙석위험" : "",
    rf.noRailing ? "안전난간 미설치" : "",
    rf.suffocation ? "산소결핍" : "",
    rf.electrocution ? "감전위험" : "",
    rf.fire ? "화재위험" : "",
  ].filter(Boolean);

  // 결재취소 가능 여부: 작성자 본인 OR 공사직원(REVIEWER/FINAL_APPROVER/ADMIN)
  const isOwner = myUserId && doc.createdBy &&
    String(doc.createdBy).toLowerCase() === String(myUserId).toLowerCase();
  const isStaff = ["REVIEWER", "FINAL_APPROVER", "ADMIN"].includes(myRole);
  const canCancel = doc.status !== "DRAFT" && (isOwner || isStaff);

  return (
    <div className="pb-32">
      {/* 헤더 */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <Link href="/approvals" className="flex items-center gap-1 text-gray-400 text-sm mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          승인 목록
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{typeShort}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
          {isMyTurn && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium animate-pulse">
              내 차례
            </span>
          )}
        </div>
        <h2 className="text-base font-bold text-gray-900">{taskName}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{typeLabel}</p>
        {doc.submittedAt && (
          <p className="text-xs text-gray-400 mt-0.5">
            제출일 {new Date(doc.submittedAt).toLocaleDateString("ko-KR")}
          </p>
        )}
      </div>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-200 flex">
        {["내용", "결재현황"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {activeTab === "내용" && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">기본정보</h3>
              <div className="space-y-2">
                <Field label="신청일" value={fd.requestDate as string} />
                <Field label="작업예정일" value={fd.workDate as string} />
                <Field label="작업시간" value={`${fd.workStartTime ?? ""} ~ ${fd.workEndTime ?? ""}`} />
                <Field label="공사명" value={fd.projectName as string} />
                <Field label="업체명" value={fd.applicantCompany as string} />
                <Field label="신청자" value={fd.applicantName as string} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">작업정보</h3>
              <div className="space-y-2">
                <Field label="작업장소" value={fd.workLocation as string} />
                <Field label="작업내용" value={fd.workContent as string} />
                <Field label="작업원 명단" value={fd.participants as string} />
              </div>
            </div>

            {(riskItems.length > 0 || factorItems.length > 0) && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">위험작업 / 위험요소</h3>
                {riskItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {riskItems.map((l) => (
                      <span key={l} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg">⚠ {l}</span>
                    ))}
                  </div>
                )}
                {factorItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {factorItems.map((l) => (
                      <span key={l} className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-lg">{l}</span>
                    ))}
                  </div>
                )}
                <div className="space-y-2 mt-2">
                  <Field label="위험요약" value={fd.riskSummary as string} />
                  <Field label="재해유형" value={fd.disasterType as string} />
                </div>
              </div>
            )}

            {fd.specialNotes && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-2">특이사항</h3>
                <p className="text-sm text-gray-700">{fd.specialNotes as string}</p>
              </div>
            )}

            {/* 서명 표시 - 신청인 + 승인 완료된 결재선만 표시 */}
            {(fd.signatureData || approvalLines.some((l) => l.signatureData && l.stepStatus === "APPROVED")) && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">서명</h3>
                <div className="space-y-3">
                  {/* 신청인 서명 */}
                  {fd.signatureData && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">신청인 서명</p>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <img src={fd.signatureData as string} alt="신청인 서명" className="w-full max-h-24 object-contain bg-white" />
                      </div>
                    </div>
                  )}
                  {/* 결재자 서명 - APPROVED 상태인 라인만 표시 */}
                  {approvalLines
                    .filter((l) => l.stepStatus === "APPROVED" && l.signatureData)
                    .map((line) => {
                      const roleLabel = line.approvalRole === "FINAL_APPROVER"
                        ? (FINAL_ROLE_LABELS[doc.documentType] ?? "최종허가자")
                        : (ROLE_LABELS[doc.documentType]?.[line.approvalOrder] ?? `${line.approvalOrder}단계 검토자`);
                      return (
                        <div key={line.id}>
                          <p className="text-xs text-gray-500 mb-1">{roleLabel} ({line.approverName}) 서명</p>
                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <img src={line.signatureData!} alt={`${roleLabel} 서명`} className="w-full max-h-24 object-contain bg-white" />
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            )}

            {isMyTurn && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse inline-block"/>
                  검토 의견 입력
                </h3>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="검토 의견을 입력하세요 (반려 시 필수)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}
          </>
        )}

        {activeTab === "결재현황" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">결재선</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-16 text-xs text-gray-500 shrink-0">신청인</div>
                <div className="flex-1 flex items-center justify-between p-2.5 rounded-xl bg-green-50">
                  <span className="text-sm font-medium text-gray-900">
                    {(fd.applicantName as string) || "작성자"}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">제출완료</span>
                </div>
              </div>
              {approvalLines.map((line) => {
                const stepStyle = STEP_STYLE[line.stepStatus] ?? STEP_STYLE.PENDING;
                const roleLabel = line.approvalRole === "FINAL_APPROVER"
                  ? (FINAL_ROLE_LABELS[doc.documentType] ?? "최종허가자")
                  : (roleLabels[line.approvalOrder] ?? `${line.approvalOrder}단계`);
                return (
                  <div key={line.id} className="flex items-start gap-3">
                    <div className="w-16 text-xs text-gray-500 shrink-0 pt-2.5">{roleLabel}</div>
                    <div className={`flex-1 p-2.5 rounded-xl ${stepStyle.bg}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{line.approverName}</span>
                          {line.approverOrg && <span className="text-xs text-gray-500 ml-1.5">{line.approverOrg}</span>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stepStyle.text}`}>{stepStyle.label}</span>
                      </div>
                      {line.comment && (
                        <div className="mt-1.5 text-xs text-gray-600 bg-white/60 rounded-lg p-2">💬 {line.comment}</div>
                      )}
                      {line.actedAt && (
                        <div className="mt-1 text-xs text-gray-400">{new Date(line.actedAt).toLocaleDateString("ko-KR")}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 하단 버튼 영역 */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-2">
        {/* 결재 취소 버튼 (작성자 or ADMIN, DRAFT 제외) */}
        {canCancel && (
          <button
            onClick={handleCancelApproval}
            disabled={cancelling}
            className="w-full py-2.5 rounded-xl text-sm font-medium border-2 border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            {cancelling ? "취소 중.." : "결재 취소 (재작성)"}
          </button>
        )}

        {/* 승인/반려 버튼 (내 차례일 때) */}
        {isMyTurn && (
          <div className="flex gap-3">
            <button onClick={() => setShowRejectConfirm(true)}
              className="flex-1 py-3 rounded-xl border-2 border-red-200 text-sm font-medium text-red-600">
              반려
            </button>
            <button onClick={() => setShowApproveConfirm(true)}
              className="flex-1 py-3 rounded-xl text-white text-sm font-medium"
              style={{ background: "#16a34a" }}>
              {doc.currentApprovalOrder === 1 ? "검토완료 (최종허가자 지정)" : "최종 승인"}
            </button>
          </div>
        )}
      </div>

      {/* 반려 확인 */}
      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-2">반려하시겠습니까?</h3>
            <p className="text-sm text-gray-500 mb-4">반려 처리 후 작성자에게 알림이 발송됩니다.</p>
            {!comment.trim() && <p className="text-xs text-red-500 mb-3">반려 의견(검토의견)을 먼저 입력해주세요.</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowRejectConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">취소</button>
              <button onClick={() => handleAction("REJECT")} disabled={!comment.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
                style={{ background: "#dc2626" }}>반려</button>
            </div>
          </div>
        </div>
      )}

      {/* 승인 확인 */}
      {showApproveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              {doc.currentApprovalOrder === 1 ? "검토완료 후 최종허가자를 지정합니다" : "최종 승인하시겠습니까?"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {doc.currentApprovalOrder === 1 ? "서명 후 최종허가자를 지정합니다." : "최종 승인 후 되돌릴 수 없습니다."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowApproveConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">취소</button>
              <button onClick={() => handleAction("APPROVE")}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: "#16a34a" }}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 서명 */}
      {showSign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-10">
            <h2 className="text-base font-bold text-gray-900 mb-1">
              {pendingAction === "APPROVE" ? "승인 서명" : "반려 서명"}
            </h2>
            <p className="text-xs text-gray-500 mb-4">서명 후 처리가 완료됩니다</p>
            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden mb-3 bg-white">
              <canvas ref={canvasRef} width={600} height={160} className="w-full touch-none"
                style={{ cursor: "crosshair" }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
              />
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={clearCanvas} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">서명 지우기</button>
              <button onClick={() => setShowSign(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">취소</button>
            </div>
            <button onClick={handleSubmitWithSign} disabled={processing}
              className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50"
              style={{ background: pendingAction === "APPROVE" ? "#16a34a" : "#dc2626" }}>
              {processing ? "처리 중.." : pendingAction === "APPROVE" ? "승인 완료" : "반려 완료"}
            </button>
          </div>
        </div>
      )}

      {/* 최종허가자 지정 */}
      {showFinalApprover && doc && (
        <FinalApproverModal
          documentId={documentId}
          documentType={doc.documentType}
          onClose={() => setShowFinalApprover(false)}
          onAssigned={() => {
            setShowFinalApprover(false);
            alert("최종허가자가 지정되었습니다! 알림이 발송됩니다.");
            router.push("/approvals");
          }}
        />
      )}
    </div>
  );
}

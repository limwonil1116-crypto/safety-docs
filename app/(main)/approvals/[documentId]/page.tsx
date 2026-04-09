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
  SUBMITTED:       { bg: "bg-blue-100",   text: "text-blue-600",   label: "?쒖텧?꾨즺" },
  IN_REVIEW:       { bg: "bg-amber-100",  text: "text-amber-600",  label: "寃?좎쨷" },
  IN_REVIEW_FINAL: { bg: "bg-orange-100", text: "text-orange-600", label: "理쒖쥌寃곗옱 吏꾪뻾以? },
  APPROVED:        { bg: "bg-green-100",  text: "text-green-600",  label: "?뱀씤?꾨즺" },
  REJECTED:        { bg: "bg-red-100",    text: "text-red-600",    label: "諛섎젮" },
  DRAFT:           { bg: "bg-gray-100",   text: "text-gray-600",   label: "?묒꽦以? },
};

function getStatusKey(doc: DocumentDetail): string {
  if (doc.status === "IN_REVIEW" && doc.currentApprovalOrder === 2) return "IN_REVIEW_FINAL";
  return doc.status;
}

const STEP_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:  { bg: "bg-gray-100",  text: "text-gray-500",  label: "?湲? },
  WAITING:  { bg: "bg-amber-100", text: "text-amber-600", label: "寃?좎쨷" },
  APPROVED: { bg: "bg-green-100", text: "text-green-600", label: "?뱀씤" },
  REJECTED: { bg: "bg-red-100",   text: "text-red-600",   label: "諛섎젮" },
  SKIPPED:  { bg: "bg-gray-100",  text: "text-gray-400",  label: "?앸왂" },
};

const ROLE_LABELS: Record<string, Record<number, string>> = {
  SAFETY_WORK_PERMIT: { 1: "理쒖쥌寃?좎옄", 2: "理쒖쥌?덇??? },
  CONFINED_SPACE:     { 1: "?덇???,     2: "?뺤씤?? },
  HOLIDAY_WORK:       { 1: "寃?좎옄",     2: "?뱀씤?? },
  POWER_OUTAGE:       { 1: "?덇???,     2: "?뺤씤?? },
};

const FINAL_ROLE_LABELS: Record<string, string> = {
  SAFETY_WORK_PERMIT: "理쒖쥌?덇???,
  CONFINED_SPACE:     "?뺤씤??,
  HOLIDAY_WORK:       "?뱀씤??,
  POWER_OUTAGE:       "?뺤씤??,
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

// 理쒖쥌?덇???吏??紐⑤떖
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

  const finalRoleLabel = FINAL_ROLE_LABELS[documentType] ?? "理쒖쥌?덇???;

  useEffect(() => {
    const q = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";
    fetch(`/api/users?krcOnly=true${q}`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []));
  }, [keyword]);

  const handleAssign = async () => {
    if (!selected) { setError("寃곗옱?먮? ?좏깮?댁＜?몄슂."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/approval-lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalApproverUserId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "?ㅻ쪟 諛쒖깮");
      onAssigned();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-10 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">{finalRoleLabel} 吏??/h2>
          <button onClick={onClose} className="text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 mb-4 text-xs text-amber-700">
          寃?좉? ?꾨즺?섏뿀?듬땲?? 理쒖쥌 寃곗옱沅뚯옄瑜?吏?뺥빐二쇱꽭??
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
            <p className="text-xs text-gray-400">?꾨옒 紐⑸줉?먯꽌 ?좏깮?섏꽭??/p>
          )}
        </div>
        <div className="relative mb-2">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            placeholder="?대쫫?쇰줈 寃??
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
                <div className="text-xs text-gray-500">{u.organization}{u.employeeNo ? ` 쨌 ${u.employeeNo}` : ""}</div>
              </div>
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button onClick={handleAssign} disabled={loading || !selected}
          className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50"
          style={{ background: "#16a34a" }}>
          {loading ? "吏??以?." : `${finalRoleLabel} 吏?뺥븯湲?}
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
  const [activeTab, setActiveTab] = useState("?댁슜");
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
      if (!docRes.ok) throw new Error(docData.error || "?곗씠???ㅻ쪟");
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
      setError(e instanceof Error ? e.message : "?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 寃곗옱 痍⑥냼
  const handleCancelApproval = async () => {
    if (!confirm("寃곗옱瑜?痍⑥냼?섍퀬 ?ъ옉???곹깭濡??섎룎由ъ떆寃좎뒿?덇퉴?\n(寃곗옱?좎씠 珥덇린?붾맗?덈떎)")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "?ㅻ쪟 諛쒖깮");
      alert("寃곗옱媛 痍⑥냼?섏뿀?듬땲?? 怨쇱뾽 ?섏씠吏?먯꽌 ?ъ옉?깊븷 ???덉뒿?덈떎.");
      router.back();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "痍⑥냼???ㅽ뙣?덉뒿?덈떎.");
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
      alert("諛섎젮 ?섍껄???낅젰?댁＜?몄슂.");
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
      // ?쒕챸 ?곗씠??異붿텧
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
      if (!res.ok) throw new Error(data.error || "?ㅻ쪟 諛쒖깮");
      setShowSign(false);
      if (data.action === "NEED_FINAL_APPROVER") {
        setShowFinalApprover(true);
      } else if (data.action === "APPROVED") {
        alert("理쒖쥌 ?뱀씤???꾨즺?섏뿀?듬땲??");
        router.push("/approvals");
      } else {
        alert("泥섎━?섏뿀?듬땲??");
        router.push("/approvals");
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.");
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
        {error || "臾몄꽌瑜?李얠쓣 ???놁뒿?덈떎."}
        <button onClick={fetchData} className="block mx-auto mt-3 text-blue-500 underline text-xs">?ㅼ떆 ?쒕룄</button>
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
    rw.highPlace ? "怨좎냼?묒뾽" : "",
    rw.waterWork ? "?섏쨷/?섎?" : "",
    rw.confinedSpace ? "諛?먭났媛? : "",
    rw.powerOutage ? "?뺤쟾?묒뾽" : "",
    rw.fireWork ? "?붽린?묒뾽" : "",
  ].filter(Boolean);

  const factorItems = [
    rf.narrowAccess ? "?묒냼???묎렐濡? : "",
    rf.slippery ? "誘몃걚?ъ슫 吏諛? : "",
    rf.steepSlope ? "湲됯꼍?щ㈃" : "",
    rf.waterHazard ? "?섎??꾪뿕" : "",
    rf.rockfall ? "?숈꽍?꾪뿕" : "",
    rf.noRailing ? "?덉쟾?쒓컙 誘몄꽕移? : "",
    rf.suffocation ? "?곗냼寃고븤" : "",
    rf.electrocution ? "媛먯쟾?꾪뿕" : "",
    rf.fire ? "?붿옱?꾪뿕" : "",
  ].filter(Boolean);

  // 寃곗옱痍⑥냼 媛???щ?: ?묒꽦??蹂몄씤 OR 怨듭궗吏곸썝(REVIEWER/FINAL_APPROVER/ADMIN)
  const isOwner = myUserId && doc.createdBy &&
    String(doc.createdBy).toLowerCase() === String(myUserId).toLowerCase();
  const isStaff = ["REVIEWER", "FINAL_APPROVER", "ADMIN"].includes(myRole);
  const canCancel = doc.status !== "DRAFT" && (isOwner || isStaff);

  return (
    <div className="pb-32">
      {/* ?ㅻ뜑 */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <Link href="/approvals" className="flex items-center gap-1 text-gray-400 text-sm mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          ?뱀씤 紐⑸줉
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{typeShort}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
          {isMyTurn && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium animate-pulse">
              ??李⑤?
            </span>
          )}
        </div>
        <h2 className="text-base font-bold text-gray-900">{taskName}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{typeLabel}</p>
        {doc.submittedAt && (
          <p className="text-xs text-gray-400 mt-0.5">
            ?쒖텧??{new Date(doc.submittedAt).toLocaleDateString("ko-KR")}
          </p>
        )}
      </div>

      {/* ??*/}
      <div className="bg-white border-b border-gray-200 flex">
        {["?댁슜", "寃곗옱?꾪솴"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {activeTab === "?댁슜" && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">湲곕낯?뺣낫</h3>
              <div className="space-y-2">
                <Field label="?좎껌?? value={fd.requestDate as string} />
                <Field label="?묒뾽?덉젙?? value={fd.workDate as string} />
                <Field label="?묒뾽?쒓컙" value={`${fd.workStartTime ?? ""} ~ ${fd.workEndTime ?? ""}`} />
                <Field label="怨듭궗紐? value={fd.projectName as string} />
                <Field label="?낆껜紐? value={fd.applicantCompany as string} />
                <Field label="?좎껌?? value={fd.applicantName as string} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">?묒뾽?뺣낫</h3>
              <div className="space-y-2">
                <Field label="?묒뾽?μ냼" value={fd.workLocation as string} />
                <Field label="?묒뾽?댁슜" value={fd.workContent as string} />
                <Field label="?묒뾽??紐낅떒" value={fd.participants as string} />
              </div>
            </div>

            {(riskItems.length > 0 || factorItems.length > 0) && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">?꾪뿕?묒뾽 / ?꾪뿕?붿냼</h3>
                {riskItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {riskItems.map((l) => (
                      <span key={l} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg">??{l}</span>
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
                  <Field label="?꾪뿕?붿빟" value={fd.riskSummary as string} />
                  <Field label="?ы빐?좏삎" value={fd.disasterType as string} />
                </div>
              </div>
            )}

            {fd.specialNotes && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-2">?뱀씠?ы빆</h3>
                <p className="text-sm text-gray-700">{fd.specialNotes as string}</p>
              </div>
            )}

            {/* ?쒕챸 ?쒖떆 - ?좎껌??+ ?뱀씤 ?꾨즺??寃곗옱?좊쭔 ?쒖떆 */}
            {(fd.signatureData || approvalLines.some((l) => l.signatureData && l.stepStatus === "APPROVED")) && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">?쒕챸</h3>
                <div className="space-y-3">

                  {fd.signatureData && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">?좎껌???쒕챸</p>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <img src={fd.signatureData as string} alt="?좎껌???쒕챸" className="w-full max-h-24 object-contain bg-white" />
                      </div>
                    </div>
                  )}
                  {/* 寃곗옱???쒕챸 - APPROVED ?곹깭???쇱씤留??쒖떆 */}
                  {approvalLines
                    .filter((l) => l.stepStatus === "APPROVED" && l.signatureData)
                    .map((line) => {
                      const roleLabel = line.approvalRole === "FINAL_APPROVER"
                        ? (FINAL_ROLE_LABELS[doc.documentType] ?? "理쒖쥌?덇???)
                        : (ROLE_LABELS[doc.documentType]?.[line.approvalOrder] ?? `${line.approvalOrder}?④퀎 寃?좎옄`);
                      return (
                        <div key={line.id}>
                          <p className="text-xs text-gray-500 mb-1">{roleLabel} ({line.approverName}) ?쒕챸</p>
                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <img src={line.signatureData!} alt={`${roleLabel} ?쒕챸`} className="w-full max-h-24 object-contain bg-white" />
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
                  寃???섍껄 ?낅젰
                </h3>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="寃???섍껄???낅젰?섏꽭??(諛섎젮 ???꾩닔)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}
          </>
        )}

        {activeTab === "寃곗옱?꾪솴" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">寃곗옱??/h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-16 text-xs text-gray-500 shrink-0">?좎껌??/div>
                <div className="flex-1 flex items-center justify-between p-2.5 rounded-xl bg-green-50">
                  <span className="text-sm font-medium text-gray-900">
                    {(fd.applicantName as string) || "?묒꽦??}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">?쒖텧?꾨즺</span>
                </div>
              </div>
              {approvalLines.map((line) => {
                const stepStyle = STEP_STYLE[line.stepStatus] ?? STEP_STYLE.PENDING;
                const roleLabel = line.approvalRole === "FINAL_APPROVER"
                  ? (FINAL_ROLE_LABELS[doc.documentType] ?? "理쒖쥌?덇???)
                  : (roleLabels[line.approvalOrder] ?? `${line.approvalOrder}?④퀎`);
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
                        <div className="mt-1.5 text-xs text-gray-600 bg-white/60 rounded-lg p-2">?뮠 {line.comment}</div>
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

      {/* ?섎떒 踰꾪듉 ?곸뿭 */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-2">
        {/* 寃곗옱 痍⑥냼 踰꾪듉 (?묒꽦??or ADMIN, DRAFT ?쒖쇅) */}
        {canCancel && (
          <button
            onClick={handleCancelApproval}
            disabled={cancelling}
            className="w-full py-2.5 rounded-xl text-sm font-medium border-2 border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            {cancelling ? "痍⑥냼 以?." : "寃곗옱 痍⑥냼 (?ъ옉??"}
          </button>
        )}

        {/* ?뱀씤/諛섎젮 踰꾪듉 (??李⑤????? */}
        {isMyTurn && (
          <div className="flex gap-3">
            <button onClick={() => setShowRejectConfirm(true)}
              className="flex-1 py-3 rounded-xl border-2 border-red-200 text-sm font-medium text-red-600">
              諛섎젮
            </button>
            <button onClick={() => setShowApproveConfirm(true)}
              className="flex-1 py-3 rounded-xl text-white text-sm font-medium"
              style={{ background: "#16a34a" }}>
              {doc.currentApprovalOrder === 1 ? "寃?좎셿猷?(理쒖쥌?덇???吏??" : "理쒖쥌 ?뱀씤"}
            </button>
          </div>
        )}
      </div>

      {/* 諛섎젮 ?뺤씤 */}
      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-2">諛섎젮?섏떆寃좎뒿?덇퉴?</h3>
            <p className="text-sm text-gray-500 mb-4">諛섎젮 泥섎━ ???묒꽦?먯뿉寃??뚮┝??諛쒖넚?⑸땲??</p>
            {!comment.trim() && <p className="text-xs text-red-500 mb-3">諛섎젮 ?섍껄(寃?좎쓽寃???癒쇱? ?낅젰?댁＜?몄슂.</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowRejectConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">痍⑥냼</button>
              <button onClick={() => handleAction("REJECT")} disabled={!comment.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
                style={{ background: "#dc2626" }}>諛섎젮</button>
            </div>
          </div>
        </div>
      )}

      {/* ?뱀씤 ?뺤씤 */}
      {showApproveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              {doc.currentApprovalOrder === 1 ? "寃?좎셿猷???理쒖쥌?덇??먮? 吏?뺥빀?덈떎" : "理쒖쥌 ?뱀씤?섏떆寃좎뒿?덇퉴?"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {doc.currentApprovalOrder === 1 ? "?쒕챸 ??理쒖쥌?덇??먮? 吏?뺥빀?덈떎." : "理쒖쥌 ?뱀씤 ???섎룎由????놁뒿?덈떎."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowApproveConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">痍⑥냼</button>
              <button onClick={() => handleAction("APPROVE")}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: "#16a34a" }}>?뺤씤</button>
            </div>
          </div>
        </div>
      )}

      {/* ?쒕챸 */}
      {showSign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-10">
            <h2 className="text-base font-bold text-gray-900 mb-1">
              {pendingAction === "APPROVE" ? "?뱀씤 ?쒕챸" : "諛섎젮 ?쒕챸"}
            </h2>
            <p className="text-xs text-gray-500 mb-4">?쒕챸 ??泥섎━媛 ?꾨즺?⑸땲??/p>
            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden mb-3 bg-white">
              <canvas ref={canvasRef} width={600} height={160} className="w-full touch-none"
                style={{ cursor: "crosshair" }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
              />
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={clearCanvas} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">?쒕챸 吏?곌린</button>
              <button onClick={() => setShowSign(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">痍⑥냼</button>
            </div>
            <button onClick={handleSubmitWithSign} disabled={processing}
              className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50"
              style={{ background: pendingAction === "APPROVE" ? "#16a34a" : "#dc2626" }}>
              {processing ? "泥섎━ 以?." : pendingAction === "APPROVE" ? "?뱀씤 ?꾨즺" : "諛섎젮 ?꾨즺"}
            </button>
          </div>
        </div>
      )}

      {/* 理쒖쥌?덇???吏??*/}
      {showFinalApprover && doc && (
        <FinalApproverModal
          documentId={documentId}
          documentType={doc.documentType}
          onClose={() => setShowFinalApprover(false)}
          onAssigned={() => {
            setShowFinalApprover(false);
            alert("理쒖쥌?덇??먭? 吏?뺣릺?덉뒿?덈떎! ?뚮┝??諛쒖넚?⑸땲??");
            router.push("/approvals");
          }}
        />
      )}
    </div>
  );
}

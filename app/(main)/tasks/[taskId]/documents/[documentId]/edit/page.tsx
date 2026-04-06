"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

// ─── 타입 ───────────────────────────────────────────
interface UserItem {
  id: string;
  name: string;
  organization?: string;
  role: string;
  employeeNo?: string;
}

interface PrevDoc {
  id: string;
  formDataJson: Record<string, unknown>;
  createdAt: string;
  submittedAt?: string;
}

// ─── 이전 작성내용 불러오기 모달 ──────────────────────
function PrevDocsModal({
  documentId,
  onSelect,
  onClose,
}: {
  documentId: string;
  onSelect: (fd: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [list, setList] = useState<PrevDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/documents/${documentId}/previous`)
      .then((r) => r.json())
      .then((d) => { setList(d.previousDocs ?? []); setLoading(false); });
  }, [documentId]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-10 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">이전 작성내용 불러오기</h2>
          <button onClick={onClose} className="text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">불러오는 중...</div>
        ) : list.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">이전 작성내용이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {list.map((doc) => {
              const fd = doc.formDataJson as Record<string, unknown>;
              const date = new Date(doc.createdAt).toLocaleDateString("ko-KR");
              return (
                <button
                  key={doc.id}
                  onClick={() => { onSelect(fd); onClose(); }}
                  className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900">
                    {(fd.projectName as string) || "제목 없음"}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {(fd.workLocation as string) || ""} · {date}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 결재선 + 서명 모달 ────────────────────────────────
function ApprovalSignModal({
  documentId,
  documentType,
  onClose,
  onSubmitted,
}: {
  documentId: string;
  documentType: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [step, setStep] = useState<"approver" | "sign">("approver");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [reviewer, setReviewer] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const ROLE_LABELS: Record<string, { step2: string }> = {
    SAFETY_WORK_PERMIT: { step2: "최종검토자" },
    CONFINED_SPACE:     { step2: "허가자" },
    HOLIDAY_WORK:       { step2: "검토자" },
    POWER_OUTAGE:       { step2: "허가자" },
  };
  const roleLabel = ROLE_LABELS[documentType] ?? { step2: "검토자" };

  useEffect(() => {
    const q = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";
    fetch(`/api/users?krcOnly=true${q}`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []));
  }, [keyword]);

  useEffect(() => {
    if (step === "sign") {
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
    }
  }, [step]);

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

  const handleSubmit = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL("image/png");
    if (!reviewer) { setError("검토자를 지정해주세요."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/approval-lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerUserId: reviewer.id, signatureData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "제출 실패");
      onSubmitted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => u.id !== reviewer?.id);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {step === "approver" ? "검토자 지정" : "서명"}
          </h2>
          <button onClick={onClose} className="text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {step === "approver" ? (
          <div className="p-5 pb-10">
            <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">
              ℹ️ 검토자를 지정하면 검토자가 검토 후 최종허가자를 직접 지정합니다.
            </div>
            <div className={`p-3 rounded-xl border-2 mb-4 ${reviewer ? "border-blue-400 bg-blue-50" : "border-dashed border-gray-300"}`}>
              <div className="text-xs text-gray-500 mb-1">{roleLabel.step2} <span className="text-red-500">*</span></div>
              {reviewer ? (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{reviewer.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{reviewer.organization}</span>
                  </div>
                  <button onClick={() => setReviewer(null)} className="text-gray-400 hover:text-red-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-400">아래 목록에서 검토자를 선택하세요</p>
              )}
            </div>
            <div className="relative mb-2">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="이름으로 검색"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto mb-4">
              {filteredUsers.map((u) => (
                <button key={u.id} onClick={() => setReviewer(u)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                    {u.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{u.name}</div>
                    <div className="text-xs text-gray-500">{u.organization}{u.employeeNo ? ` · ${u.employeeNo}` : ""}</div>
                  </div>
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">검색 결과가 없습니다.</div>
              )}
            </div>
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <button
              onClick={() => { if (!reviewer) { setError("검토자를 선택해주세요."); return; } setError(""); setStep("sign"); }}
              disabled={!reviewer}
              className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50"
              style={{ background: "#2563eb" }}
            >
              다음 - 서명하기
            </button>
          </div>
        ) : (
          <div className="p-5 pb-10">
            <p className="text-sm text-gray-600 mb-4">아래 서명란에 서명해주세요.</p>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>{roleLabel.step2}</span>
                <span className="font-medium text-gray-900">{reviewer?.name} ({reviewer?.organization})</span>
              </div>
              <div className="mt-1 text-gray-400">※ 최종허가자는 검토자가 검토 후 지정합니다.</div>
            </div>
            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden mb-3 bg-white">
              <canvas ref={canvasRef} width={600} height={200} className="w-full touch-none"
                style={{ cursor: "crosshair" }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
              />
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={clearCanvas} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">다시 서명</button>
              <button onClick={() => setStep("approver")} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">이전으로</button>
            </div>
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50"
              style={{ background: "#2563eb" }}>
              {submitting ? "제출 중..." : "서명 완료 및 제출"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 메인 편집 페이지 ──────────────────────────────────
export default function DocumentEditPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;
  const documentId = params.documentId as string;

  const [taskName, setTaskName] = useState("");
  const [documentType, setDocumentType] = useState("SAFETY_WORK_PERMIT");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPrev, setShowPrev] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    requestDate: new Date().toISOString().split("T")[0],
    workDate: "",
    workStartTime: "09:00",
    workEndTime: "18:00",
    projectName: "",
    applicantCompany: "",
    applicantTitle: "",
    applicantName: "",
    workLocation: "",
    workContent: "",
    participants: "",
    riskHighPlace: false,
    riskWaterWork: false,
    riskConfinedSpace: false,
    riskPowerOutage: false,
    riskFireWork: false,
    riskOther: false,
    factorNarrowAccess: false,
    factorSlippery: false,
    factorSteepSlope: false,
    factorWaterHazard: false,
    factorRockfall: false,
    factorNoRailing: false,
    factorSuffocation: false,
    factorElectrocution: false,
    factorFire: false,
    riskSummary: "",
    disasterType: "",
    specialNotes: "",
  });

  const applyFormData = (fd: Record<string, unknown>) => {
    setForm((prev) => ({
      ...prev,
      requestDate: (fd.requestDate as string) ?? prev.requestDate,
      workDate: (fd.workDate as string) ?? "",
      workStartTime: (fd.workStartTime as string) ?? "09:00",
      workEndTime: (fd.workEndTime as string) ?? "18:00",
      projectName: (fd.projectName as string) ?? "",
      applicantCompany: (fd.applicantCompany as string) ?? "",
      applicantTitle: (fd.applicantTitle as string) ?? "",
      applicantName: (fd.applicantName as string) ?? "",
      workLocation: (fd.workLocation as string) ?? "",
      workContent: (fd.workContent as string) ?? "",
      participants: (fd.participants as string) ?? "",
      riskHighPlace: (fd.riskWorkTypes as Record<string, boolean>)?.highPlace ?? false,
      riskWaterWork: (fd.riskWorkTypes as Record<string, boolean>)?.waterWork ?? false,
      riskConfinedSpace: (fd.riskWorkTypes as Record<string, boolean>)?.confinedSpace ?? false,
      riskPowerOutage: (fd.riskWorkTypes as Record<string, boolean>)?.powerOutage ?? false,
      riskFireWork: (fd.riskWorkTypes as Record<string, boolean>)?.fireWork ?? false,
      riskOther: (fd.riskWorkTypes as Record<string, boolean>)?.other ?? false,
      factorNarrowAccess: (fd.riskFactors as Record<string, boolean>)?.narrowAccess ?? false,
      factorSlippery: (fd.riskFactors as Record<string, boolean>)?.slippery ?? false,
      factorSteepSlope: (fd.riskFactors as Record<string, boolean>)?.steepSlope ?? false,
      factorWaterHazard: (fd.riskFactors as Record<string, boolean>)?.waterHazard ?? false,
      factorRockfall: (fd.riskFactors as Record<string, boolean>)?.rockfall ?? false,
      factorNoRailing: (fd.riskFactors as Record<string, boolean>)?.noRailing ?? false,
      factorSuffocation: (fd.riskFactors as Record<string, boolean>)?.suffocation ?? false,
      factorElectrocution: (fd.riskFactors as Record<string, boolean>)?.electrocution ?? false,
      factorFire: (fd.riskFactors as Record<string, boolean>)?.fire ?? false,
      riskSummary: (fd.riskSummary as string) ?? "",
      disasterType: (fd.disasterType as string) ?? "",
      specialNotes: (fd.specialNotes as string) ?? "",
    }));
  };

  const fetchDocument = useCallback(async () => {
    try {
      const [docRes, taskRes] = await Promise.all([
        fetch(`/api/documents/${documentId}`),
        fetch(`/api/tasks/${taskId}`),
      ]);
      const docData = await docRes.json();
      const taskData = await taskRes.json();
      if (taskRes.ok) setTaskName(taskData.task?.name ?? "");
      if (docRes.ok) {
        setDocumentType(docData.document.documentType);
        applyFormData(docData.document.formDataJson ?? {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [documentId, taskId]);

  useEffect(() => { fetchDocument(); }, [fetchDocument]);

  const buildFormDataJson = () => ({
    requestDate: form.requestDate,
    workDate: form.workDate,
    workStartTime: form.workStartTime,
    workEndTime: form.workEndTime,
    projectName: form.projectName,
    applicantCompany: form.applicantCompany,
    applicantTitle: form.applicantTitle,
    applicantName: form.applicantName,
    workLocation: form.workLocation,
    workContent: form.workContent,
    participants: form.participants,
    riskWorkTypes: {
      highPlace: form.riskHighPlace,
      waterWork: form.riskWaterWork,
      confinedSpace: form.riskConfinedSpace,
      powerOutage: form.riskPowerOutage,
      fireWork: form.riskFireWork,
      other: form.riskOther,
    },
    riskFactors: {
      narrowAccess: form.factorNarrowAccess,
      slippery: form.factorSlippery,
      steepSlope: form.factorSteepSlope,
      waterHazard: form.factorWaterHazard,
      rockfall: form.factorRockfall,
      noRailing: form.factorNoRailing,
      suffocation: form.factorSuffocation,
      electrocution: form.factorElectrocution,
      fire: form.factorFire,
    },
    riskSummary: form.riskSummary,
    disasterType: form.disasterType,
    specialNotes: form.specialNotes,
  });

  const handleChange = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => handleSave(true), 3000);
  };

  const handleSave = async (silent = false) => {
    if (!silent) setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formDataJson: buildFormDataJson() }),
      });
      if (res.ok) {
        const now = new Date();
        setLastSaved(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")} 저장됨`);
      }
    } catch (e) { console.error(e); }
    finally { if (!silent) setSaving(false); }
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

  return (
    <div className="pb-24">
      {/* 상단 헤더 */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/tasks/${taskId}`} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <span className="text-xs text-gray-500">{taskName}</span>
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">안전작업허가서</h2>
          <div className="flex items-center gap-2">
            {lastSaved && <span className="text-xs text-gray-400">{lastSaved}</span>}
            <button onClick={() => setShowPrev(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              이전내용 불러오기
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 섹션1: 기본정보 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>1</span>
            기본정보
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">신청일 <span className="text-red-500">*</span></label>
                <input type="date" value={form.requestDate}
                  onChange={(e) => handleChange("requestDate", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">작업예정일 <span className="text-red-500">*</span></label>
                <input type="date" value={form.workDate}
                  onChange={(e) => handleChange("workDate", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">작업 시작 시간 <span className="text-red-500">*</span></label>
                <input type="time" value={form.workStartTime}
                  onChange={(e) => handleChange("workStartTime", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">작업 종료 시간 <span className="text-red-500">*</span></label>
                <input type="time" value={form.workEndTime}
                  onChange={(e) => handleChange("workEndTime", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">과업명</label>
              <input type="text" value={form.projectName}
                onChange={(e) => handleChange("projectName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">업체명</label>
                <input type="text" value={form.applicantCompany}
                  onChange={(e) => handleChange("applicantCompany", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">신청자 성명 <span className="text-red-500">*</span></label>
                <input type="text" value={form.applicantName}
                  onChange={(e) => handleChange("applicantName", e.target.value)}
                  placeholder="성명 입력"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* 섹션2: 작업정보 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>2</span>
            작업정보
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">작업장소 <span className="text-red-500">*</span></label>
              <input type="text" value={form.workLocation}
                onChange={(e) => handleChange("workLocation", e.target.value)}
                placeholder="작업 장소를 입력하세요"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">작업내용 <span className="text-red-500">*</span></label>
              <textarea value={form.workContent}
                onChange={(e) => handleChange("workContent", e.target.value)}
                placeholder="작업 내용을 입력하세요"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">작업원 명단</label>
              <textarea value={form.participants}
                onChange={(e) => handleChange("participants", e.target.value)}
                placeholder="작업원 이름을 입력하세요 (쉼표로 구분)"
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
        </div>

        {/* 섹션3: 위험작업 확인 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>3</span>
            위험작업 확인
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "riskHighPlace",    label: "2.0m 이상 고소작업" },
              { key: "riskWaterWork",    label: "수상/수중 작업" },
              { key: "riskConfinedSpace",label: "밀폐공간작업" },
              { key: "riskPowerOutage",  label: "정전작업" },
              { key: "riskFireWork",     label: "화기작업" },
              { key: "riskOther",        label: "기타" },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 p-2 rounded-xl border border-gray-100 cursor-pointer hover:bg-blue-50">
                <input type="checkbox"
                  checked={(form as Record<string, unknown>)[item.key] as boolean}
                  onChange={(e) => handleChange(item.key, e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600" />
                <span className="text-xs text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 섹션4: 위험요소 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>4</span>
            위험요소
          </h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { key: "factorNarrowAccess", label: "접근통로 협소" },
              { key: "factorSlippery",     label: "미끄러운 바닥" },
              { key: "factorSteepSlope",   label: "급경사면" },
              { key: "factorWaterHazard",  label: "침수·홍수·파도" },
              { key: "factorRockfall",     label: "낙석·사면붕괴" },
              { key: "factorNoRailing",    label: "안전 난간없음" },
              { key: "factorSuffocation",  label: "질식·산소결핍·유해가스" },
              { key: "factorElectrocution",label: "감전·전기위험" },
              { key: "factorFire",         label: "화재·폭발·위험물" },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 p-2 rounded-xl border border-gray-100 cursor-pointer hover:bg-amber-50">
                <input type="checkbox"
                  checked={(form as Record<string, unknown>)[item.key] as boolean}
                  onChange={(e) => handleChange(item.key, e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600" />
                <span className="text-xs text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">위험요소 개선계획</label>
              <textarea value={form.riskSummary}
                onChange={(e) => handleChange("riskSummary", e.target.value)}
                placeholder="위험요소 개선계획을 입력하세요"
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">재해형태</label>
              <input type="text" value={form.disasterType}
                onChange={(e) => handleChange("disasterType", e.target.value)}
                placeholder="예) 추락, 감전"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* 섹션5: 특이사항 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>5</span>
            특이사항
          </h3>
          <textarea value={form.specialNotes}
            onChange={(e) => handleChange("specialNotes", e.target.value)}
            placeholder="특이사항을 입력하세요"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3">
        <button onClick={() => handleSave(false)} disabled={saving}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-60">
          {saving ? "저장 중..." : "임시저장"}
        </button>
        <button onClick={() => setShowApproval(true)}
          className="flex-1 py-3 rounded-xl text-white text-sm font-medium"
          style={{ background: "#2563eb" }}>
          검토자 지정 및 제출
        </button>
      </div>

      {showPrev && (
        <PrevDocsModal documentId={documentId} onSelect={applyFormData} onClose={() => setShowPrev(false)} />
      )}

      {showApproval && (
        <ApprovalSignModal
          documentId={documentId}
          documentType={documentType}
          onClose={() => setShowApproval(false)}
          onSubmitted={() => {
            setShowApproval(false);
            alert("제출이 완료되었습니다! 검토자에게 알림이 전송되었습니다.");
            router.push(`/tasks/${taskId}`);
          }}
        />
      )}
    </div>
  );
}
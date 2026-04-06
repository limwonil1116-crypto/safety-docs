"use client";

import { useState, useEffect, useCallback, JSX } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_SHORT, DocumentType } from "@/types";

interface DocumentDetail {
  id: string;
  taskId: string;
  documentType: DocumentType;
  status: string;
  formDataJson: Record<string, unknown>;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface ApprovalLine {
  id: string;
  approvalOrder: number;
  approvalRole: string;
  stepStatus: string;
  approverName?: string;
  approverOrg?: string;
  actedAt?: string;
  comment?: string;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:     { bg: "bg-gray-100",  text: "text-gray-600",  label: "작성중" },
  SUBMITTED: { bg: "bg-blue-100",  text: "text-blue-600",  label: "제출완료" },
  IN_REVIEW: { bg: "bg-amber-100", text: "text-amber-600", label: "검토중" },
  APPROVED:  { bg: "bg-green-100", text: "text-green-600", label: "검토완료" },
  REJECTED:  { bg: "bg-red-100",   text: "text-red-600",   label: "반려" },
};

const STEP_STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:  { bg: "bg-gray-100",  text: "text-gray-500",  label: "대기" },
  WAITING:  { bg: "bg-blue-100",  text: "text-blue-600",  label: "검토중" },
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

function str(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function Field({ label, value }: { label: string; value?: string | null }): JSX.Element {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-900">{value || "-"}</div>
    </div>
  );
}

export default function DocumentDetailPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const documentId = params.documentId as string;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [approvalLines, setApprovalLines] = useState<ApprovalLine[]>([]);
  const [taskName, setTaskName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [docRes, linesRes, taskRes] = await Promise.all([
        fetch(`/api/documents/${documentId}`),
        fetch(`/api/documents/${documentId}/approval-lines`),
        fetch(`/api/tasks/${taskId}`),
      ]);
      const docData = await docRes.json();
      const linesData = await linesRes.json();
      const taskData = await taskRes.json();
      if (!docRes.ok) throw new Error(docData.error || "문서 조회 실패");
      setDoc(docData.document);
      setApprovalLines(linesData.approvalLines ?? []);
      if (taskRes.ok) setTaskName(taskData.task?.name ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [documentId, taskId]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        <button onClick={fetchData} className="block mx-auto mt-3 text-blue-500 underline text-xs">
          다시 시도
        </button>
      </div>
    );
  }

  const fd = doc.formDataJson;
  const typeShort = DOCUMENT_TYPE_SHORT[doc.documentType] ?? doc.documentType;
  const typeLabel = DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType;
  const statusStyle = STATUS_STYLE[doc.status] ?? STATUS_STYLE.DRAFT;
  const roleLabels = ROLE_LABELS[doc.documentType] ?? {};
  const rw = (fd.riskWorkTypes ?? {}) as Record<string, boolean>;
  const rf = (fd.riskFactors ?? {}) as Record<string, boolean>;

  const riskItems: string[] = [
    rw.highPlace ? "2.0m 이상 고소작업" : "",
    rw.waterWork ? "수상/수중 작업" : "",
    rw.confinedSpace ? "밀폐공간작업" : "",
    rw.powerOutage ? "정전작업" : "",
    rw.fireWork ? "화기작업" : "",
  ].filter((v) => v !== "");

  const factorItems: string[] = [
    rf.narrowAccess ? "접근통로 협소" : "",
    rf.slippery ? "미끄러운 바닥" : "",
    rf.steepSlope ? "급경사면" : "",
    rf.waterHazard ? "침수·홍수·파도" : "",
    rf.rockfall ? "낙석·사면붕괴" : "",
    rf.noRailing ? "안전 난간없음" : "",
    rf.suffocation ? "질식·산소결핍·유해가스" : "",
    rf.electrocution ? "감전·전기위험" : "",
    rf.fire ? "화재·폭발·위험물" : "",
  ].filter((v) => v !== "");

  return (
    <div className="pb-10">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/tasks/${taskId}`} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="text-xs text-gray-500">{taskName}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{typeShort}</span>
            <h2 className="text-base font-bold text-gray-900">{typeLabel}</h2>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">결재 현황</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-16 text-xs text-gray-500 shrink-0">신청인</div>
              <div className="flex-1 flex items-center justify-between p-2.5 rounded-xl bg-green-50">
                <span className="text-sm font-medium text-gray-900">{str(fd.applicantName) || "작성자"}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">제출완료</span>
              </div>
            </div>
            {approvalLines.map((line) => {
              const stepStyle = STEP_STATUS_STYLE[line.stepStatus] ?? STEP_STATUS_STYLE.PENDING;
              const roleLabel = roleLabels[line.approvalOrder] ?? `${line.approvalOrder}단계`;
              return (
                <div key={line.id} className="flex items-start gap-3">
                  <div className="w-16 text-xs text-gray-500 shrink-0 pt-2.5">{roleLabel}</div>
                  <div className={`flex-1 p-2.5 rounded-xl ${stepStyle.bg}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{line.approverName}</span>
                        {line.approverOrg && <span className="text-xs text-gray-500 ml-1.5">{line.approverOrg}</span>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stepStyle.bg} ${stepStyle.text}`}>
                        {stepStyle.label}
                      </span>
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

        {doc.status === "REJECTED" && doc.rejectionReason && (
          <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
            <h3 className="text-sm font-bold text-red-700 mb-2">반려 사유</h3>
            <p className="text-sm text-red-600">{doc.rejectionReason}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>1</span>
            기본정보
          </h3>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="신청일" value={str(fd.requestDate)} />
              <Field label="작업예정일" value={str(fd.workDate)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="작업 시작" value={str(fd.workStartTime)} />
              <Field label="작업 종료" value={str(fd.workEndTime)} />
            </div>
            <Field label="과업명" value={str(fd.projectName)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="업체명" value={str(fd.applicantCompany)} />
              <Field label="신청자" value={str(fd.applicantName)} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>2</span>
            작업정보
          </h3>
          <div className="space-y-2.5">
            <Field label="작업장소" value={str(fd.workLocation)} />
            <Field label="작업내용" value={str(fd.workContent)} />
            <Field label="작업원 명단" value={str(fd.participants)} />
          </div>
        </div>

        {(riskItems.length > 0 || factorItems.length > 0) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>3</span>
              위험작업 / 위험요소
            </h3>
            {riskItems.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {riskItems.map((label) => (
                  <span key={label} className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-medium">⚠️ {label}</span>
                ))}
              </div>
            )}
            {factorItems.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {factorItems.map((label) => (
                  <span key={label} className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 font-medium">{label}</span>
                ))}
              </div>
            )}
            <div className="space-y-2 mt-2">
              <Field label="위험요소 개선계획" value={str(fd.riskSummary)} />
              <Field label="재해형태" value={str(fd.disasterType)} />
            </div>
          </div>
        )}

{str(fd.specialNotes) !== "" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>4</span>
              특이사항
            </h3>
            <p className="text-sm text-gray-700">{str(fd.specialNotes)}</p>
          </div>
        )}

        {str(fd.signatureData) !== "" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">신청자 서명</h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <img src={str(fd.signatureData)} alt="신청자 서명" className="w-full max-h-32 object-contain bg-white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

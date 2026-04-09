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
  signatureData?: string;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:     { bg: "bg-gray-100",   text: "text-gray-600",   label: "작성중" },
  SUBMITTED: { bg: "bg-blue-100",   text: "text-blue-600",   label: "제출완료" },
  IN_REVIEW: { bg: "bg-amber-100",  text: "text-amber-600",  label: "검토중" },
  APPROVED:  { bg: "bg-green-100",  text: "text-green-600",  label: "승인완료" },
  REJECTED:  { bg: "bg-red-100",    text: "text-red-600",    label: "반려" },
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

const FINAL_ROLE_LABELS: Record<string, string> = {
  SAFETY_WORK_PERMIT: "최종허가자",
  CONFINED_SPACE:     "확인자",
  HOLIDAY_WORK:       "승인자",
  POWER_OUTAGE:       "확인자",
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
  const [pdfLoading, setPdfLoading] = useState(false);

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
      if (!docRes.ok) throw new Error(docData.error || "데이터 오류");
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

  // PDF blob 생성 후 새 탭 미리보기
  const handlePdfPreview = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/pdf?download=true`);
      if (!res.ok) throw new Error("PDF 생성 실패");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setPdfLoading(false);
    }
  };

  // PDF 다운로드
  const handlePdfDownload = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/pdf?download=true`);
      if (!res.ok) throw new Error("PDF 생성 실패");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const typeLabel = doc ? (DOCUMENT_TYPE_LABELS[doc.documentType] ?? "서류") : "서류";
      a.download = `${typeLabel}_${documentId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setPdfLoading(false);
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
  const typeShort = DOCUMENT_TYPE_SHORT[doc.documentType] ?? doc.documentType;
  const typeLabel = DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType;
  const statusStyle = STATUS_STYLE[doc.status] ?? STATUS_STYLE.DRAFT;
  const roleLabels = ROLE_LABELS[doc.documentType] ?? {};

  const rw = (fd.riskWorkTypes ?? {}) as Record<string, boolean>;
  const rf = (fd.riskFactors ?? {}) as Record<string, boolean>;

  const riskItems: string[] = [
    rw.highPlace     ? "2.0m 이상 고소작업" : "",
    rw.waterWork     ? "수상/수변 작업" : "",
    rw.confinedSpace ? "밀폐공간 작업" : "",
    rw.powerOutage   ? "정전작업" : "",
    rw.fireWork      ? "화기작업" : "",
  ].filter(Boolean);

  const factorItems: string[] = [
    rf.narrowAccess  ? "진출입로 협소" : "",
    rf.slippery      ? "미끄러운 지반" : "",
    rf.steepSlope    ? "급경사면" : "",
    rf.waterHazard   ? "파랑·유수위험" : "",
    rf.rockfall      ? "낙석위험" : "",
    rf.noRailing     ? "안전난간 미설치" : "",
    rf.suffocation   ? "질식·화재·폭발" : "",
    rf.electrocution ? "감전위험" : "",
    rf.fire          ? "화재·폭발위험" : "",
  ].filter(Boolean);

  const applicantStatusLabel = doc.status === "DRAFT" ? "작성중" : "제출완료";
  const applicantStatusStyle = doc.status === "DRAFT" ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-600";
  const isApproved = doc.status === "APPROVED";

  return (
    <div className="pb-10">
      {/* 헤더 */}
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

        {/* PDF 버튼 - APPROVED 시 */}
        {isApproved && (
          <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="text-sm font-bold text-green-700">최종 승인 완료 — 법정서류 PDF</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePdfPreview}
                disabled={pdfLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-green-300 bg-white text-green-700 text-sm font-medium hover:bg-green-50 disabled:opacity-50 transition-colors"
              >
                {pdfLoading ? (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
                {pdfLoading ? "생성 중..." : "미리보기"}
              </button>
              <button
                onClick={handlePdfDownload}
                disabled={pdfLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-colors"
                style={{ background: "#16a34a" }}
              >
                {pdfLoading ? (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                )}
                {pdfLoading ? "생성 중..." : "다운로드"}
              </button>
            </div>
          </div>
        )}

        {/* 결재 현황 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">결재 현황</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-16 text-xs text-gray-500 shrink-0">신청인</div>
              <div className="flex-1 flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                <span className="text-sm font-medium text-gray-900">{str(fd.applicantName) || "작성자"}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${applicantStatusStyle}`}>{applicantStatusLabel}</span>
              </div>
            </div>
            {approvalLines.map((line) => {
              const stepStyle = STEP_STATUS_STYLE[line.stepStatus] ?? STEP_STATUS_STYLE.PENDING;
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
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stepStyle.bg} ${stepStyle.text}`}>{stepStyle.label}</span>
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

        {/* 반려 사유 */}
        {doc.status === "REJECTED" && doc.rejectionReason && (
          <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
            <h3 className="text-sm font-bold text-red-700 mb-2">반려 사유</h3>
            <p className="text-sm text-red-600">{doc.rejectionReason}</p>
          </div>
        )}

        {/* 기본정보 */}
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
            <Field label="공사명" value={str(fd.projectName)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="업체명" value={str(fd.applicantCompany)} />
              <Field label="신청자" value={str(fd.applicantName)} />
            </div>
          </div>
        </div>

        {/* 작업정보 */}
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

        {/* 위험공종/위험요인 */}
        {(riskItems.length > 0 || factorItems.length > 0) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>3</span>
              위험공종 / 위험요인
            </h3>
            {riskItems.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {riskItems.map((label) => (
                  <span key={label} className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-medium">⚠ {label}</span>
                ))}
              </div>
            )}
            {factorItems.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {factorItems.map((label) => (
                  <span key={label} className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 font-medium">{label}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 서명 */}
        {(str(fd.signatureData) !== "" || approvalLines.some((l) => l.signatureData && l.stepStatus === "APPROVED")) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">서명</h3>
            <div className="space-y-3">
              {str(fd.signatureData) !== "" && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">신청인 서명</p>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <img src={str(fd.signatureData)} alt="신청인 서명" className="w-full max-h-24 object-contain bg-white" />
                  </div>
                </div>
              )}
              {approvalLines
                .filter((l) => l.stepStatus === "APPROVED" && l.signatureData)
                .map((line) => {
                  const roleLabel = line.approvalRole === "FINAL_APPROVER"
                    ? (FINAL_ROLE_LABELS[doc.documentType] ?? "최종허가자")
                    : (roleLabels[line.approvalOrder] ?? `${line.approvalOrder}단계`);
                  return (
                    <div key={line.id}>
                      <p className="text-xs text-gray-500 mb-1">{roleLabel} ({line.approverName}) 서명</p>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <img src={line.signatureData!} alt={`${roleLabel} 서명`} className="w-full max-h-24 object-contain bg-white" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

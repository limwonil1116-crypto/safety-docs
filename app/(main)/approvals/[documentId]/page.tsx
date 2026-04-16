"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_SHORT, DocumentType } from "@/types";

interface DocumentDetail {
  id: string; taskId: string; documentType: DocumentType; status: string;
  formDataJson: Record<string, unknown>; submittedAt?: string;
  createdBy: string; currentApproverUserId?: string; currentApprovalOrder?: number;
  // 위치 정보
  workLatitude?: number | null;
  workLongitude?: number | null;
  workAddress?: string | null;
}
interface ApprovalLine {
  id: string; approvalOrder: number; approvalRole: string; stepStatus: string;
  approverName?: string; approverOrg?: string; approverUserId?: string;
  actedAt?: string; comment?: string; signatureData?: string;
}
interface UserItem { id: string; name: string; organization?: string; employeeNo?: string; }
interface Attachment {
  id: string; fileName: string; fileUrl: string; fileSize: number | null;
  mimeType: string | null; attachmentType: string; description: string | null;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  SUBMITTED:       { bg: "bg-blue-100",   text: "text-blue-600",   label: "제출완료" },
  IN_REVIEW:       { bg: "bg-amber-100",  text: "text-amber-600",  label: "검토중" },
  IN_REVIEW_FINAL: { bg: "bg-orange-100", text: "text-orange-600", label: "최종결재 진행중" },
  APPROVED:        { bg: "bg-green-100",  text: "text-green-600",  label: "승인완료" },
  REJECTED:        { bg: "bg-red-100",    text: "text-red-600",    label: "반려" },
  DRAFT:           { bg: "bg-gray-100",   text: "text-gray-600",   label: "작성중" },
};
const ROLE_LABELS: Record<string, Record<number, string>> = {
  SAFETY_WORK_PERMIT: { 1: "최종 검토자", 2: "최종 허가자" },
  CONFINED_SPACE:     { 1: "허가자",     2: "확인자" },
  HOLIDAY_WORK:       { 1: "검토자",     2: "승인자" },
  POWER_OUTAGE:       { 1: "허가자",     2: "확인자" },
};
const FINAL_ROLE_LABELS: Record<string, string> = {
  SAFETY_WORK_PERMIT: "최종 허가자",
  CONFINED_SPACE:     "확인자",
  HOLIDAY_WORK:       "승인자",
  POWER_OUTAGE:       "확인자",
};

function getStatusKey(doc: DocumentDetail): string {
  if (doc.status === "IN_REVIEW" && doc.currentApprovalOrder === 2) return "IN_REVIEW_FINAL";
  return doc.status;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="text-gray-400 w-24 flex-shrink-0 text-sm">{label}</span>
      <span className="text-gray-900 text-sm">{value}</span>
    </div>
  );
}

// ── 카카오맵 미리보기 - 정적 이미지 + 지도열기 링크 ─────────────────
function LocationMapPreview({ lat, lng, address }: { lat: number; lng: number; address?: string | null }) {
  const mapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(address || "작업장소")},${lat},${lng}`;
  // 카카오 WCONGNAMUL 좌표계 변환 (WGS84 → WCONGNAMUL)
  const toWCONG = (wgsLng: number, wgsLat: number) => {
    const RE = 6371.00877; const GRID = 5.0; const SLAT1 = 30.0; const SLAT2 = 60.0;
    const OLON = 126.0; const OLAT = 38.0; const XO = 43; const YO = 136;
    const DEGRAD = Math.PI / 180.0;
    const re = RE / GRID; const slat1 = SLAT1 * DEGRAD; const slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD; const olat = OLAT * DEGRAD;
    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5); sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5); ro = re * sf / Math.pow(ro, sn);
    let ra = Math.tan(Math.PI * 0.25 + wgsLat * DEGRAD * 0.5); ra = re * sf / Math.pow(ra, sn);
    let theta = wgsLng * DEGRAD - olon; if (theta > Math.PI) theta -= 2.0 * Math.PI; if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;
    return { x: Math.floor(ra * Math.sin(theta) + XO + 0.5), y: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5) };
  };
  const wc = toWCONG(lng, lat);
  const staticUrl = `https://map.kakao.com/staticmap/image?crs=WCONGNAMUL&center=${wc.x},${wc.y}&level=4&w=600&h=200&markers=1,${wc.x},${wc.y}&mode=normal`;

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="truncate max-w-[220px]">{address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}</span>
        </div>
        <a href={mapUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-500 shrink-0 ml-2 font-medium">지도열기 →</a>
      </div>
      <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="block relative bg-gray-100" style={{ height: "200px" }}>
        <img
          src={staticUrl}
          alt="작업장소 지도"
          className="w-full h-full object-cover"
          onError={e => {
            const t = e.target as HTMLImageElement;
            t.style.display = "none";
            const p = t.parentElement;
            if (p) p.innerHTML = `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f3f4f6;gap:8px;cursor:pointer"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span style="font-size:12px;color:#6b7280">${address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}</span><span style="font-size:11px;color:#2563eb;font-weight:600">탭하여 카카오맵에서 보기</span></div>`;
          }}
        />
      </a>
    </div>
  );
}

function AttachmentViewer({ documentId, canAdd = false }: { documentId: string; canAdd?: boolean }) {
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [docFiles, setDocFiles] = useState<Attachment[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/attachments`);
      const data = await res.json();
      const all: Attachment[] = data.attachments ?? [];
      setPhotos(all.filter(a => a.attachmentType === "PHOTO"));
      setDocFiles(all.filter(a => a.attachmentType === "DOCUMENT"));
    } catch {}
  }, [documentId]);

  useEffect(() => { fetchAttachments(); }, [fetchAttachments]);

  const uploadPhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) { alert("이미지 파일만 가능합니다."); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("attachmentType", "PHOTO"); fd.append("sortOrder", String(photos.length));
      const res = await fetch(`/api/documents/${documentId}/attachments`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotos(prev => [...prev, data.attachment]);
    } catch (e) { alert(`업로드 실패: ${e instanceof Error ? e.message : "오류"}`); }
    finally { setUploading(false); }
  };

  const formatSize = (size: number | null) => {
    if (!size) return "";
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)}KB`;
    return `${(size / 1024 / 1024).toFixed(1)}MB`;
  };

  const hasAny = photos.length > 0 || docFiles.length > 0;
  if (!hasAny && !canAdd) return null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
        첨부 파일 {(photos.length + docFiles.length) > 0 && <span className="text-xs text-gray-400 font-normal">({photos.length + docFiles.length}개)</span>}
      </h3>
      {photos.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">📷 사진 {photos.length}장</p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map(photo => (
              <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer active:opacity-80" onClick={() => setPreviewUrl(photo.fileUrl)}>
                <img src={photo.fileUrl} alt={photo.fileName} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
      {docFiles.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-2">📄 문서 {docFiles.length}개</p>
          <div className="space-y-2">
            {docFiles.map(doc => {
              const isPdf = doc.mimeType === "application/pdf";
              const isExcel = doc.mimeType?.includes("excel") || doc.mimeType?.includes("spreadsheet");
              return (
                <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${isPdf ? "bg-red-500" : isExcel ? "bg-green-600" : "bg-blue-500"}`}>
                    {isPdf ? "PDF" : isExcel ? "XLS" : "DOC"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate">{doc.fileName}</p>
                    <p className="text-xs text-gray-400">{formatSize(doc.fileSize)}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
      {canAdd && (
        <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100">
          <button onClick={() => cameraRef.current?.click()} disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            카메라
          </button>
          <button onClick={() => galleryRef.current?.click()} disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            갤러리
          </button>
        </div>
      )}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { Array.from(e.target.files ?? []).forEach(f => uploadPhoto(f)); e.target.value = ""; }} />
      {previewUrl && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center" onClick={() => setPreviewUrl(null)}>
          <button className="absolute top-4 right-4 text-white p-2 z-10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <img src={previewUrl} alt="미리보기" className="max-w-full max-h-[85vh] object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function StepIcon({ type, status }: { type: "submit" | "review" | "approve"; status: "done" | "active" | "pending" | "rejected" }) {
  const colors = { done: { bg: "#2563eb", stroke: "white" }, active: { bg: "#f59e0b", stroke: "white" }, rejected: { bg: "#dc2626", stroke: "white" }, pending: { bg: "#e5e7eb", stroke: "#9ca3af" } };
  const c = colors[status];
  const icons = {
    submit: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    review: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    approve: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>{status === "done" && <polyline points="9 12 11 14 15 10" strokeWidth="2.5"/>}{status === "rejected" && <><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></>}</svg>,
  };
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: c.bg, boxShadow: status === "active" ? `0 0 0 3px ${c.bg}33` : undefined }}>
        {icons[type]}
      </div>
      {status === "active" && <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
    </div>
  );
}

function ApprovalFlow({ doc, approvalLines, writerName }: { doc: DocumentDetail; approvalLines: ApprovalLine[]; writerName: string }) {
  const isSubmitted = doc.status !== "DRAFT";
  const line1 = approvalLines.find(l => l.approvalOrder === 1);
  const line2 = approvalLines.find(l => l.approvalOrder === 2);
  const getStepStatus = (line?: ApprovalLine): "done" | "active" | "pending" | "rejected" => {
    if (!line) return "pending";
    if (line.stepStatus === "APPROVED") return "done";
    if (line.stepStatus === "REJECTED") return "rejected";
    if (line.stepStatus === "WAITING") return "active";
    return "pending";
  };
  const roleLabels = ROLE_LABELS[doc.documentType] ?? {};
  const finalLabel = FINAL_ROLE_LABELS[doc.documentType] ?? "최종 허가자";
  const steps = [
    { icon: <StepIcon type="submit" status={isSubmitted ? "done" : "active"} />, label: "신청자", name: writerName, status: isSubmitted ? "done" : "active" },
    ...(line1 ? [{ icon: <StepIcon type="review" status={getStepStatus(line1)} />, label: roleLabels[1] ?? "검토자", name: line1.approverName ?? "", comment: line1.comment, actedAt: line1.actedAt, status: getStepStatus(line1) }] : []),
    ...(line2 ? [{ icon: <StepIcon type="approve" status={getStepStatus(line2)} />, label: line2.approvalRole === "FINAL_APPROVER" ? finalLabel : (roleLabels[2] ?? "허가자"), name: line2.approverName ?? "", comment: line2.comment, actedAt: line2.actedAt, status: getStepStatus(line2) }] : []),
  ] as Array<{ icon: React.ReactNode; label: string; name: string; comment?: string; actedAt?: string; status: string }>;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-4">결재 흐름</h3>
      <div className="flex items-start justify-around mb-4 relative">
        <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-gray-200 z-0" />
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col items-center gap-1 z-10 flex-1">
            {step.icon}
            <span className="text-[10px] font-semibold text-gray-500 text-center mt-1">{step.label}</span>
            <span className="text-[10px] text-gray-700 text-center font-medium truncate max-w-[70px]">{step.name}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2 mt-3 border-t border-gray-100 pt-3">
        {steps.map((step, i) => (
          <div key={i} className={`flex items-start gap-3 p-2.5 rounded-xl ${step.status === "done" ? "bg-green-50" : step.status === "active" ? "bg-amber-50" : step.status === "rejected" ? "bg-red-50" : "bg-gray-50"}`}>
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${step.status === "done" ? "bg-green-500" : step.status === "active" ? "bg-amber-400 animate-pulse" : step.status === "rejected" ? "bg-red-500" : "bg-gray-300"}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-700">{step.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${step.status === "done" ? "bg-green-100 text-green-600" : step.status === "active" ? "bg-amber-100 text-amber-600" : step.status === "rejected" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}>
                  {step.status === "done" ? "완료" : step.status === "active" ? "진행중" : step.status === "rejected" ? "반려" : "대기"}
                </span>
              </div>
              <span className="text-xs text-gray-600">{step.name}</span>
              {step.comment && <div className="mt-1 text-xs text-gray-500 bg-white/70 rounded-lg px-2 py-1">💬 {step.comment}</div>}
              {step.actedAt && <span className="text-[10px] text-gray-400 mt-0.5 block">{new Date(step.actedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalApproverModal({ documentId, documentType, onClose, onAssigned }: { documentId: string; documentType: string; onClose: () => void; onAssigned: () => void }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const finalRoleLabel = FINAL_ROLE_LABELS[documentType] ?? "최종 허가자";
  useEffect(() => {
    const q = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";
    fetch(`/api/users?krcOnly=true${q}`).then(r => r.json()).then(d => setUsers(d.users ?? []));
  }, [keyword]);
  const handleAssign = async () => {
    if (!selected) { setError("결재자를 선택해주세요."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/approval-lines`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalApproverUserId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");
      onAssigned();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "오류가 발생했습니다."); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-24 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">{finalRoleLabel} 지정</h2>
          <button onClick={onClose} className="text-gray-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 mb-4 text-xs text-amber-700">검토가 완료됐습니다. 최종 결재자를 지정해주세요.</div>
        <div className={`p-3 rounded-xl border-2 mb-4 ${selected ? "border-green-400 bg-green-50" : "border-dashed border-gray-300"}`}>
          <div className="text-xs text-gray-500 mb-1">{finalRoleLabel} <span className="text-red-500">*</span></div>
          {selected ? (
            <div className="flex items-center justify-between">
              <div><span className="text-sm font-medium text-gray-900">{selected.name}</span><span className="text-xs text-gray-500 ml-2">{selected.organization}</span></div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-red-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          ) : <p className="text-xs text-gray-400">아래 목록에서 선택해주세요</p>}
        </div>
        <div className="relative mb-2">
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="이름으로 검색"
            className="w-full pl-3 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
          {users.filter(u => u.id !== selected?.id).map(u => (
            <button key={u.id} onClick={() => setSelected(u)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-green-400 hover:bg-green-50 text-left">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm shrink-0">{u.name[0]}</div>
              <div><div className="text-sm font-medium text-gray-900">{u.name}</div><div className="text-xs text-gray-500">{u.organization}{u.employeeNo ? ` · ${u.employeeNo}` : ""}</div></div>
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button onClick={handleAssign} disabled={loading || !selected}
          className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50" style={{ background: "#16a34a" }}>
          {loading ? "지정 중..." : `${finalRoleLabel} 지정하기`}
        </button>
      </div>
    </div>
  );
}

function PdfButtons({ documentId }: { documentId: string }) {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const handlePreview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/pdf?force=true`);
      if (!res.ok) { const data = await res.json().catch(() => ({})); alert(`PDF 생성 실패: ${data.error || res.statusText}`); return; }
      const contentType = res.headers.get("Content-Type") || "";
      if (contentType.includes("application/pdf")) {
        const blob = await res.blob(); const url = URL.createObjectURL(blob);
        window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else {
        const data = await res.json();
        if (data.url) window.open(data.url, "_blank");
        else alert(`PDF 생성 실패: ${data.error || "알 수 없는 오류"}`);
      }
    } catch (e) { console.error(e); alert("PDF 미리보기 중 오류가 발생했습니다."); }
    finally { setLoading(false); }
  };
  const handleDownload = () => {
    setDownloading(true);
    const a = document.createElement("a"); a.href = `/api/documents/${documentId}/pdf?download=true`;
    a.target = "_blank"; a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 2000);
  };
  return (
    <div className="flex gap-2">
      <button onClick={handlePreview} disabled={loading}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-blue-200 text-blue-600 text-sm font-medium hover:bg-blue-50 disabled:opacity-50 active:bg-blue-100">
        {loading ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
        {loading ? "생성 중..." : "미리보기"}
      </button>
      <button onClick={handleDownload} disabled={downloading}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-green-200 text-green-600 text-sm font-medium hover:bg-green-50 disabled:opacity-50 active:bg-green-100">
        {downloading ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
        {downloading ? "다운로드 중..." : "PDF 다운로드"}
      </button>
    </div>
  );
}

function DocumentContent({ doc, fd, approvalLines }: { doc: DocumentDetail; fd: Record<string, unknown>; approvalLines: ApprovalLine[] }) {
  const workPeriod = fd.workStartDate && fd.workEndDate ? `${fd.workStartDate} ~ ${fd.workEndDate}` : (fd.workDate as string) || "";
  const highPlaceItems: string[] = Array.isArray(fd.riskHighPlaceItems) ? fd.riskHighPlaceItems as string[] : [];
  const waterWorkItems: string[] = Array.isArray(fd.riskWaterWorkItems) ? fd.riskWaterWorkItems as string[] : [];

  // 작업장소: formData의 workLocation 또는 facilityLocation
  const workLocation = (fd.workLocation ?? fd.facilityLocation) as string | undefined;

  const riskTypesSummary = [
    fd.riskHighPlace && `고소작업${highPlaceItems.length ? ": " + highPlaceItems.join(", ") : ""}${fd.riskHighPlaceDetail ? (highPlaceItems.length ? ", " : ": ") + fd.riskHighPlaceDetail : ""}`,
    fd.riskWaterWork && `수중작업${waterWorkItems.length ? ": " + waterWorkItems.join(", ") : ""}${fd.riskWaterWorkDetail ? (waterWorkItems.length ? ", " : ": ") + fd.riskWaterWorkDetail : ""}`,
    fd.riskConfinedSpace && `밀폐공간${fd.riskConfinedSpaceDetail ? ": " + fd.riskConfinedSpaceDetail : ""}`,
    fd.riskPowerOutage && `정전작업${fd.riskPowerOutageDetail ? ": " + fd.riskPowerOutageDetail : ""}`,
    fd.riskFireWork && `화기작업${fd.riskFireWorkDetail ? ": " + fd.riskFireWorkDetail : ""}`,
    fd.riskOther && `기타${fd.riskOtherDetail ? ": " + fd.riskOtherDetail : ""}`,
  ].filter(Boolean) as string[];

  const factorLabels: Record<string, string> = {
    factorNarrowAccess: "접근통로 협소", factorSlippery: "미끄러움",
    factorSteepSlope: "급경사", factorWaterHazard: "익수·유수",
    factorRockfall: "낙석·굴러떨어짐", factorNoRailing: "안전 난간재",
    factorLadderNoGuard: "사다리 안전잠금장치", factorSuffocation: "질식·산소결핍·유해가스",
    factorElectricFire: "감전·전기화재요인", factorSparkFire: "불꽃·불티에 의한 화재",
    factorOther: `기타${fd.factorOtherDetail ? "(" + fd.factorOtherDetail + ")" : ""}`,
  };
  const checkedFactors = Object.entries(factorLabels).filter(([key]) => !!(fd as any)[key]).map(([, label]) => label);

  const isForm1 = doc.documentType === "SAFETY_WORK_PERMIT";
  const isForm2 = doc.documentType === "CONFINED_SPACE";
  const isForm3 = doc.documentType === "HOLIDAY_WORK";
  const isForm4 = doc.documentType === "POWER_OUTAGE";

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">기본정보</h3>
        <div className="space-y-2">
          <Field label="신청일" value={(fd.requestDate as string) || (fd.reportDate as string)} />
          <Field label="작업기간" value={workPeriod} />
          <Field label="작업시간" value={fd.workStartTime && fd.workEndTime ? `${fd.workStartTime} ~ ${fd.workEndTime}` : null} />
          <Field label="용역명" value={(fd.projectName ?? fd.serviceName) as string} />
          <Field label="업체명" value={fd.applicantCompany as string} />
          <Field label="직책" value={fd.applicantTitle as string} />
          <Field label="신청자" value={fd.applicantName as string} />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">작업정보</h3>
        <div className="space-y-2">
          {/* 작업장소 텍스트 */}
          <Field label="작업장소" value={workLocation} />
          {/* 지도 프레임 - 위도/경도가 있을 때만 표시 */}
          {doc.workLatitude && doc.workLongitude && (
            <LocationMapPreview
              lat={doc.workLatitude}
              lng={doc.workLongitude}
              address={doc.workAddress || workLocation}
            />
          )}
          <Field label="작업내용" value={(fd.workContent ?? fd.workContents) as string} />
          <Field label="작업원 명단" value={fd.participants as string} />
          <Field label="입장자 명단" value={fd.entryList as string} />
        </div>
      </div>

      {isForm1 && riskTypesSummary.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">위험공종 확인내용</h3>
          <div className="space-y-1.5">
            {riskTypesSummary.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span className="text-sm text-gray-800">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isForm1 && checkedFactors.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">발생하는 위험요소</h3>
          <div className="flex flex-wrap gap-2">
            {checkedFactors.map((f, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{f}</span>
            ))}
          </div>
        </div>
      )}

      {isForm1 && Array.isArray(fd.riskRows) && (fd.riskRows as any[]).some(r => r.riskFactor || r.improvement) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">위험요소 · 개선대책</h3>
          <div className="space-y-2">
            {(fd.riskRows as any[]).filter(r => r.riskFactor || r.improvement).map((row, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                {row.riskFactor && <div><span className="text-gray-500">위험요소:</span> <span className="text-gray-800">{row.riskFactor}</span></div>}
                {row.improvement && <div><span className="text-gray-500">개선대책:</span> <span className="text-gray-800">{row.improvement}</span></div>}
                {row.disasterType && <div><span className="text-gray-500">재해형태:</span> <span className="text-gray-800">{row.disasterType}</span></div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {(isForm2 || isForm4) && Array.isArray(fd.safetyChecks) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">안전조치 이행사항</h3>
          <div className="space-y-1.5">
            {(fd.safetyChecks as any[]).filter(c => c.applicable === "해당").map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span className="text-gray-800">{item.label}</span>
                {item.result && <span className="text-gray-500 ml-1">({item.result})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {isForm3 && Array.isArray(fd.participants) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">작업 참여자</h3>
          <div className="space-y-1.5">
            {(fd.participants as any[]).map((p, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="text-gray-400 w-24 shrink-0">{p.role}</span>
                <span className="text-gray-900">{p.name} {p.phone ? `(${p.phone})` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(isForm2 || isForm4) && fd.specialMeasures && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-2">특별조치 필요사항</h3>
          <p className="text-sm text-gray-800">{fd.specialMeasures as string}</p>
        </div>
      )}

      {(fd.reviewOpinion || fd.reviewResult) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">안전감독 검토의견</h3>
          <div className="space-y-2">
            {fd.reviewOpinion && (
              <div>
                <p className="text-xs text-gray-500 mb-1">검토의견</p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2">{fd.reviewOpinion as string}</p>
              </div>
            )}
            {fd.reviewResult && (
              <div>
                <p className="text-xs text-gray-500 mb-1">조치결과</p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2">{fd.reviewResult as string}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {(fd.signatureData || approvalLines.some(l => l.signatureData && l.stepStatus === "APPROVED")) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">서명</h3>
          <div className="space-y-2">
            {typeof fd.signatureData === "string" && fd.signatureData && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex border-b border-gray-100 bg-gray-50">
                  <span className="text-xs font-medium text-gray-600 px-3 py-2 w-24 border-r border-gray-200">신청자</span>
                  <span className="text-xs text-gray-500 px-3 py-2">{fd.applicantName as string || ""}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 px-3 py-2 w-24 border-r border-gray-200 shrink-0">(서명)</span>
                  <div className="px-3 py-2">
                    <img src={fd.signatureData as string} alt="신청자 서명" className="h-12 object-contain" />
                  </div>
                </div>
              </div>
            )}
            {approvalLines.filter(l => l.stepStatus === "APPROVED" && l.signatureData).map(line => {
              const roleLabel = line.approvalRole === "FINAL_APPROVER"
                ? (FINAL_ROLE_LABELS[doc.documentType] ?? "최종 허가자")
                : (ROLE_LABELS[doc.documentType]?.[line.approvalOrder] ?? `${line.approvalOrder}단계`);
              return (
                <div key={line.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex border-b border-gray-100 bg-gray-50">
                    <span className="text-xs font-medium text-gray-600 px-3 py-2 w-24 border-r border-gray-200">{roleLabel}</span>
                    <span className="text-xs text-gray-500 px-3 py-2">{line.approverName}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-400 px-3 py-2 w-24 border-r border-gray-200 shrink-0">(서명)</span>
                    <div className="px-3 py-2">
                      <img src={line.signatureData!} alt={`${roleLabel} 서명`} className="h-12 object-contain" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
  const [writerName, setWriterName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [myUserId, setMyUserId] = useState("");
  const [myRole, setMyRole] = useState("");
  const [activeTab, setActiveTab] = useState("내용");
  const [reviewOpinion, setReviewOpinion] = useState("");
  const [reviewResult, setReviewResult] = useState("");
  const [step1ApproverName, setStep1ApproverName] = useState("");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showSign, setShowSign] = useState(false);
  const [showFinalApprover, setShowFinalApprover] = useState(false);
  const [pendingAction, setPendingAction] = useState<"APPROVE" | "REJECT" | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const signModalRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
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

      const line1 = lines.find((l: ApprovalLine) => l.approvalOrder === 1);
      if (line1?.approverName) setStep1ApproverName(line1.approverName);

      const fd = docObj.formDataJson ?? {};
      if (fd.reviewOpinion) setReviewOpinion(fd.reviewOpinion as string);
      if (fd.reviewResult) setReviewResult(fd.reviewResult as string);

      const taskRes = await fetch(`/api/tasks/${docObj.taskId}`);
      const taskData = await taskRes.json();
      if (taskRes.ok) setTaskName(taskData.task?.name ?? "");
      const meRes = await fetch("/api/users/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        const myId = meData.user?.id;
        setMyUserId(myId); setMyRole(meData.user?.role ?? ""); setWriterName(meData.user?.name ?? "");
        setIsMyTurn(docObj.currentApproverUserId === myId);
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "오류가 발생했습니다."); }
    finally { setLoading(false); }
  }, [documentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (showSign) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed"; document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%"; document.body.style.overflow = "hidden";
      return () => {
        document.body.style.position = ""; document.body.style.top = "";
        document.body.style.width = ""; document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [showSign]);

  const handleCancelApproval = async () => {
    if (!confirm("결재를 취소하고 작성중 상태로 되돌리시겠습니까?\n(결재선이 초기화됩니다)")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");
      alert("결재가 취소됐습니다. 과업 페이지에서 다시 작성할 수 있습니다.");
      router.back();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "취소에 실패했습니다."); }
    finally { setCancelling(false); }
  };

  const initCanvas = () => {
    setTimeout(() => {
      const canvas = canvasRef.current; if (!canvas) return;
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#1e3a5f"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    }, 100);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) return { x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width), y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height) };
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => { const canvas = canvasRef.current; if (!canvas) return; e.preventDefault(); e.stopPropagation(); isDrawing.current = true; const ctx = canvas.getContext("2d"); if (!ctx) return; const pos = getPos(e, canvas); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
  const draw = (e: React.MouseEvent | React.TouchEvent) => { if (!isDrawing.current) return; const canvas = canvasRef.current; if (!canvas) return; e.preventDefault(); e.stopPropagation(); const ctx = canvas.getContext("2d"); if (!ctx) return; const pos = getPos(e, canvas); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
  const endDraw = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); isDrawing.current = false; };
  const clearCanvas = () => { const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); };

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    if (action === "REJECT" && !reviewOpinion.trim()) { alert("반려 사유를 검토의견에 입력해주세요."); return; }
    setPendingAction(action); setShowRejectConfirm(false); setShowApproveConfirm(false);
    setShowSign(true); initCanvas();
  };

  const handleSubmitWithSign = async () => {
    if (!pendingAction) return;
    setProcessing(true);
    try {
      const canvas = canvasRef.current;
      const signatureData = canvas ? canvas.toDataURL("image/png") : null;
      const res = await fetch(`/api/documents/${documentId}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pendingAction,
          comment: reviewOpinion.trim() || null,
          reviewResult: reviewResult.trim() || null,
          signatureData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");
      setShowSign(false);
      if (data.action === "NEED_FINAL_APPROVER") { setShowFinalApprover(true); }
      else if (data.action === "APPROVED") { alert("최종 승인이 완료됐습니다."); router.push("/approvals"); }
      else { alert("처리됐습니다."); router.push("/approvals"); }
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "오류가 발생했습니다."); }
    finally { setProcessing(false); }
  };

  if (loading) return <div className="p-4 space-y-4">{[1,2,3].map(i => (<div key={i} className="bg-white rounded-2xl p-4 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/3 mb-3"/><div className="h-10 bg-gray-100 rounded w-full"/></div>))}</div>;
  if (error || !doc) return <div className="p-4 text-center py-12 text-red-500 text-sm">{error || "문서를 찾을 수 없습니다."}<button onClick={fetchData} className="block mx-auto mt-3 text-blue-500 underline text-xs">다시 시도</button></div>;

  const fd = doc.formDataJson;
  const statusKey = getStatusKey(doc);
  const typeShort = DOCUMENT_TYPE_SHORT[doc.documentType] ?? doc.documentType;
  const typeLabel = DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType;
  const statusStyle = STATUS_STYLE[statusKey] ?? STATUS_STYLE.SUBMITTED;
  const isOwner = myUserId && doc.createdBy && String(doc.createdBy).toLowerCase() === String(myUserId).toLowerCase();
  const isStaff = ["REVIEWER", "FINAL_APPROVER", "ADMIN"].includes(myRole);
  const canCancel = doc.status !== "DRAFT" && (isOwner || isStaff);
  const isApproved = doc.status === "APPROVED";

  const reviewGuideText = doc.currentApprovalOrder === 2
    ? `💡 ${step1ApproverName || "1단계 검토자"}(검토자)가 작성한 내용입니다. 확인하여 최종 결재하시면 됩니다.`
    : null;

  const ReviewInputSection = () => (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse inline-block"/>
        {doc.currentApprovalOrder === 1 ? "검토 의견 입력" : "검토의견 확인 및 수정"}
      </h3>
      {reviewGuideText && (
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-3">{reviewGuideText}</p>
      )}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            검토의견 {doc.currentApprovalOrder === 1 && <span className="text-red-500 text-xs">(반려 시 필수)</span>}
          </label>
          <textarea value={reviewOpinion} onChange={e => setReviewOpinion(e.target.value)}
            placeholder="검토 의견을 입력해주세요 (반려 시 필수)"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">조치결과</label>
          <textarea value={reviewResult} onChange={e => setReviewResult(e.target.value)}
            placeholder="조치결과를 입력해주세요"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900" />
        </div>
      </div>
    </div>
  );

  // ── 결재취소 버튼 (공통 컴포넌트) ──
  const CancelButton = () => canCancel ? (
    <button onClick={handleCancelApproval} disabled={cancelling}
      className="w-full py-2.5 rounded-xl text-sm font-medium border-2 border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50">
      {cancelling ? "취소 중..." : "결재 취소 (작성중으로)"}
    </button>
  ) : null;

  return (
    <div className="pb-40">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <Link href="/approvals" className="flex items-center gap-1 text-gray-400 text-sm mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          결재 목록
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{typeShort}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
          {isMyTurn && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium animate-pulse">내 차례</span>}
        </div>
        <h2 className="text-base font-bold text-gray-900">{taskName}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{typeLabel}</p>
        {doc.submittedAt && <p className="text-xs text-gray-400 mt-0.5">제출일: {new Date(doc.submittedAt).toLocaleDateString("ko-KR")}</p>}
      </div>

      <div className="bg-white border-b border-gray-200 flex">
        {["내용", "결재현황"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {activeTab === "내용" && (
          <>
            <DocumentContent doc={doc} fd={fd} approvalLines={approvalLines} />
            <AttachmentViewer documentId={documentId} canAdd={isApproved} />
            {isApproved && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  허가서 PDF
                </h3>
                <PdfButtons documentId={documentId} />
              </div>
            )}
            {isMyTurn && <ReviewInputSection />}
            {/* 내용 탭에서도 결재취소 버튼 표시 */}
            <CancelButton />
          </>
        )}

        {activeTab === "결재현황" && (
          <>
            <ApprovalFlow doc={doc} approvalLines={approvalLines} writerName={(fd.applicantName as string) || writerName} />
            <AttachmentViewer documentId={documentId} canAdd={isApproved} />
            {isApproved && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  허가서 PDF
                </h3>
                <PdfButtons documentId={documentId} />
              </div>
            )}
            {isMyTurn && <ReviewInputSection />}
            {/* 결재현황 탭에서도 결재취소 버튼 표시 */}
            <CancelButton />
          </>
        )}
      </div>

      {/* 하단 고정 버튼 - 결재 액션만 (결재취소는 각 탭 내용에 포함) */}
      {isMyTurn && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-3 pb-4">
          <div className="flex gap-3">
            <button onClick={() => setShowRejectConfirm(true)} className="flex-1 py-3 rounded-xl border-2 border-red-200 text-sm font-medium text-red-600">반려</button>
            <button onClick={() => setShowApproveConfirm(true)} className="flex-1 py-3 rounded-xl text-white text-sm font-medium" style={{ background: "#16a34a" }}>
              {doc.currentApprovalOrder === 1 ? "검토완료" : "최종 승인"}
            </button>
          </div>
        </div>
      )}

      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-2">반려하시겠습니까?</h3>
            <p className="text-sm text-gray-500 mb-4">반려 처리 후 작성자에게 알림이 전송됩니다.</p>
            {!reviewOpinion.trim() && <p className="text-xs text-red-500 mb-3">반려 사유(검토의견)를 먼저 입력해주세요.</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowRejectConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">취소</button>
              <button onClick={() => handleAction("REJECT")} disabled={!reviewOpinion.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40" style={{ background: "#dc2626" }}>반려</button>
            </div>
          </div>
        </div>
      )}

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
              <button onClick={() => handleAction("APPROVE")} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: "#16a34a" }}>확인</button>
            </div>
          </div>
        </div>
      )}

      {showSign && (
        <div ref={signModalRef} className="fixed inset-0 bg-black/50 z-50 flex items-end" style={{ touchAction: "none" }} onTouchMove={e => e.preventDefault()}>
          <div className="bg-white w-full rounded-t-3xl" style={{ paddingBottom: "env(safe-area-inset-bottom, 20px)", maxHeight: "80vh", overflowY: "auto" }}>
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-base font-bold text-gray-900 mb-1">{pendingAction === "APPROVE" ? "승인 서명" : "반려 서명"}</h2>
              <p className="text-xs text-gray-500">서명 후 처리가 완료됩니다.</p>
            </div>
            <div className="px-6 py-3">
              <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-white relative">
                <div className="absolute top-2 left-3 text-xs text-gray-300 pointer-events-none">여기에 서명해주세요</div>
                <canvas ref={canvasRef} width={600} height={180} className="w-full"
                  style={{ cursor: "crosshair", touchAction: "none", display: "block" }}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              </div>
            </div>
            <div className="px-6 pb-24 space-y-2">
              <div className="flex gap-2">
                <button onClick={clearCanvas} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium">서명 지우기</button>
                <button onClick={() => setShowSign(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium">취소</button>
              </div>
              <button onClick={handleSubmitWithSign} disabled={processing}
                className="w-full py-3.5 rounded-xl text-white font-medium text-sm disabled:opacity-50"
                style={{ background: pendingAction === "APPROVE" ? "#16a34a" : "#dc2626" }}>
                {processing ? "처리 중..." : pendingAction === "APPROVE" ? "✓ 승인 완료" : "반려 완료"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinalApprover && doc && (
        <FinalApproverModal documentId={documentId} documentType={doc.documentType}
          onClose={() => setShowFinalApprover(false)}
          onAssigned={() => { setShowFinalApprover(false); alert("최종허가자가 지정됐습니다. 알림이 전송됩니다."); router.push("/approvals"); }} />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_SHORT, DocumentType } from "@/types";

interface DocumentDetail {
  id: string; taskId: string; documentType: DocumentType; status: string;
  formDataJson: Record<string, unknown>; submittedAt?: string;
  createdBy: string; currentApproverUserId?: string; currentApprovalOrder?: number;
  workLatitude?: number | null; workLongitude?: number | null; workAddress?: string | null;
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
  SAFETY_WORK_PERMIT: { 1: "(계획확인)허가자", 2: "(이행확인)확인자" },
  CONFINED_SPACE:     { 1: "감시인", 2: "(계획확인)허가자", 3: "측정담당자", 4: "(이행확인)확인자" },
  HOLIDAY_WORK:       { 1: "검토자", 2: "승인자" },
  POWER_OUTAGE:       { 1: "(계획확인)허가자", 2: "(이행확인)확인자" },
};
const CONFINED_STEP_DESC: Record<number, string> = {
  1: "감시인 서명",
  2: "특별조치 입력 및 (계획확인) 허가자 서명",
  3: "측정결과 입력",
  4: "(이행확인) 확인자 최종 서명",
};
const FINAL_ROLE_LABELS: Record<string, string> = {
  SAFETY_WORK_PERMIT: "(이행확인)확인자",
  CONFINED_SPACE:     "(이행확인)확인자",
  HOLIDAY_WORK:       "승인자",
  POWER_OUTAGE:       "(이행확인)확인자",
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
      <span className="text-gray-900 text-sm font-medium">{value}</span>
    </div>
  );
}
function LocationMapPreview({ lat, lng, address }: { lat: number; lng: number; address?: string | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(address || "작업장소")},${lat},${lng}`;
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || !window.kakao?.maps) return;
      window.kakao.maps.load(() => {
        if (!mapRef.current) return;
        const center = new window.kakao.maps.LatLng(lat, lng);
        const map = new window.kakao.maps.Map(mapRef.current, { center, level: 4, draggable: false, scrollwheel: false, disableDoubleClick: true });
        new window.kakao.maps.Marker({ position: center, map });
      });
    };
    if (window.kakao?.maps) { initMap(); }
    else {
      const existing = document.getElementById("kakao-map-script");
      if (existing) { const check = setInterval(() => { if (window.kakao?.maps) { clearInterval(check); initMap(); } }, 200); return () => clearInterval(check); }
      const script = document.createElement("script");
      script.id = "kakao-map-script";
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`;
      script.onload = () => window.kakao.maps.load(initMap);
      document.head.appendChild(script);
    }
  }, [lat, lng, address]);
  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
      <div className="flex items-center justify-end px-3 py-1.5 bg-gray-50 border-b border-gray-100">
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 font-medium">지도열기 →</a>
      </div>
      <div ref={mapRef} style={{ width: "100%", height: "200px" }}>
        <div className="w-full h-full flex items-center justify-center bg-gray-50"><p className="text-xs text-gray-400">지도 로딩 중...</p></div>
      </div>
    </div>
  );
}
function PhotoViewer({ documentId }: { documentId: string }) {
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/documents/${documentId}/attachments`).then(r => r.json()).then(data => {
      setPhotos((data.attachments ?? []).filter((a: Attachment) => a.attachmentType === "PHOTO"));
    }).catch(() => {});
  }, [documentId]);
  if (photos.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-3">첨부 사진 <span className="text-xs text-gray-400 font-normal">({photos.length}장)</span></h3>
      <div className="grid grid-cols-3 gap-2">
        {photos.map(photo => (
          <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer active:opacity-80" onClick={() => setPreviewUrl(photo.fileUrl)}>
            <img src={photo.fileUrl} alt={photo.fileName} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      {previewUrl && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center" onClick={() => setPreviewUrl(null)}>
          <button className="absolute top-4 right-4 text-white p-2 z-10"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          <img src={previewUrl} alt="미리보기" className="max-w-full max-h-[85vh] object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
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
  const formatSize = (size: number | null) => { if (!size) return ""; if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)}KB`; return `${(size / 1024 / 1024).toFixed(1)}MB`; };
  const hasAny = photos.length > 0 || docFiles.length > 0;
  if (!hasAny && !canAdd) return null;
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-3">첨부 파일 {(photos.length + docFiles.length) > 0 && <span className="text-xs text-gray-400 font-normal">({photos.length + docFiles.length}개)</span>}</h3>
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
                <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-blue-50 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${isPdf ? "bg-red-500" : isExcel ? "bg-green-600" : "bg-blue-500"}`}>{isPdf ? "PDF" : isExcel ? "XLS" : "DOC"}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm text-gray-800 font-medium truncate">{doc.fileName}</p><p className="text-xs text-gray-400">{formatSize(doc.fileSize)}</p></div>
                </a>
              );
            })}
          </div>
        </div>
      )}
      {canAdd && (
        <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100">
          <button onClick={() => cameraRef.current?.click()} disabled={uploading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">카메라</button>
          <button onClick={() => galleryRef.current?.click()} disabled={uploading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">갤러리</button>
        </div>
      )}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { Array.from(e.target.files ?? []).forEach(f => uploadPhoto(f)); e.target.value = ""; }} />
      {previewUrl && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center" onClick={() => setPreviewUrl(null)}>
          <button className="absolute top-4 right-4 text-white p-2 z-10"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
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
    submit: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    review: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    approve: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>{status === "done" && <polyline points="9 12 11 14 15 10" strokeWidth="2.5"/>}{status === "rejected" && <><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></>}</svg>,
  };
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: c.bg, boxShadow: status === "active" ? `0 0 0 3px ${c.bg}33` : undefined }}>{icons[type]}</div>
      {status === "active" && <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
    </div>
  );
}
function ApprovalFlow({ doc, approvalLines, writerName, applicantSignature }: { doc: DocumentDetail; approvalLines: ApprovalLine[]; writerName: string; applicantSignature?: string }) {
  const isSubmitted = doc.status !== "DRAFT";
  const isConfined = doc.documentType === "CONFINED_SPACE";
  const getStepStatus = (line?: ApprovalLine): "done" | "active" | "pending" | "rejected" => {
    if (!line) return "pending";
    if (line.stepStatus === "APPROVED") return "done";
    if (line.stepStatus === "REJECTED") return "rejected";
    if (line.stepStatus === "WAITING") return "active";
    return "pending";
  };
  const roleLabels = ROLE_LABELS[doc.documentType] ?? {};
  const finalLabel = FINAL_ROLE_LABELS[doc.documentType] ?? "최종 허가자";
  const fd = doc.formDataJson ?? {};
  let steps: Array<{ icon: React.ReactNode; label: string; name: string; comment?: string; actedAt?: string; signatureData?: string; status: string }>;
  if (isConfined) {
    const lineMap = Object.fromEntries(approvalLines.map(l => [l.approvalOrder, l]));
    const mkStep = (order: number, label: string, type: "submit" | "review" | "approve", name: string) => {
      const line = lineMap[order];
      const status = line ? getStepStatus(line) : "pending";
      return { icon: <StepIcon type={type} status={status} />, label, name: line?.approverName ?? name, comment: line?.comment, actedAt: line?.actedAt, signatureData: line?.signatureData, status };
    };
    steps = [
      { icon: <StepIcon type="submit" status={isSubmitted ? "done" : "active"} />, label: "신청자", name: writerName, signatureData: isSubmitted ? applicantSignature : undefined, status: isSubmitted ? "done" : "active" },
      mkStep(1, "감시인", "review", (fd.monitorName as string) || ""),
      mkStep(2, "(계획확인)허가자", "approve", ""),
      mkStep(3, "측정담당자", "review", (fd.measurerName as string) || ""),
      mkStep(4, "(이행확인)확인자", "approve", ""),
    ];
  } else {
    const line1 = approvalLines.find(l => l.approvalOrder === 1);
    const line2 = approvalLines.find(l => l.approvalOrder === 2);
    steps = [
      { icon: <StepIcon type="submit" status={isSubmitted ? "done" : "active"} />, label: "신청자", name: writerName, signatureData: isSubmitted ? applicantSignature : undefined, status: isSubmitted ? "done" : "active" },
      ...(line1 ? [{ icon: <StepIcon type="review" status={getStepStatus(line1)} />, label: roleLabels[1] ?? "검토자", name: line1.approverName ?? "", comment: line1.comment, actedAt: line1.actedAt, signatureData: line1.signatureData, status: getStepStatus(line1) }] : []),
      ...(line2 ? [{ icon: <StepIcon type="approve" status={getStepStatus(line2)} />, label: line2.approvalRole === "FINAL_APPROVER" ? finalLabel : (roleLabels[2] ?? "허가자"), name: line2.approverName ?? "", comment: line2.comment, actedAt: line2.actedAt, signatureData: line2.signatureData, status: getStepStatus(line2) }] : []),
    ];
  }
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
              {step.signatureData && <div className="mt-1.5 border border-gray-200 rounded-lg overflow-hidden bg-white inline-block"><img src={step.signatureData} alt="서명" className="h-10 object-contain px-2" /></div>}
              {step.comment && <div className="mt-1 text-xs text-gray-500 bg-white/70 rounded-lg px-2 py-1">💬 {step.comment}</div>}
              {step.actedAt && <span className="text-[10px] text-gray-400 mt-0.5 block">{new Date(step.actedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function ConfinedNextModal({ documentId, action, onClose, onAssigned }: { documentId: string; action: "PLAN_APPROVER" | "FINAL_CONFIRMER"; onClose: () => void; onAssigned: () => void }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const label = action === "PLAN_APPROVER" ? "(계획확인) 허가자" : "(이행확인) 확인자";
  const nextOrder = action === "PLAN_APPROVER" ? 2 : 4;
  const nextTitle = action === "PLAN_APPROVER" ? "밀폐공간 작업허가 - (계획확인) 허가자 서명 요청" : "밀폐공간 작업허가 - (이행확인) 최종 확인 요청";
  useEffect(() => { const q = keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""; fetch(`/api/users?krcOnly=true${q}`).then(r => r.json()).then(d => setUsers(d.users ?? [])); }, [keyword]);
  const handleAssign = async () => {
    if (!selected) { setError("결재자를 선택해주세요."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/approval-lines`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nextApproverUserId: selected.id, nextOrder, nextRole: "FINAL_APPROVER", nextTitle }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");
      onAssigned();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "오류가 발생했습니다."); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-24 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h2 className="text-base font-bold text-gray-900">{label} 지정</h2><button onClick={onClose} className="text-gray-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">{label}를 지정해주세요.</div>
        <div className={`p-3 rounded-xl border-2 mb-4 ${selected ? "border-blue-400 bg-blue-50" : "border-dashed border-gray-300"}`}>
          {selected ? (<div className="flex items-center justify-between"><div><span className="text-sm font-medium text-gray-900">{selected.name}</span><span className="text-xs text-gray-500 ml-2">{selected.organization}</span></div><button onClick={() => setSelected(null)} className="text-gray-400 hover:text-red-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>) : <p className="text-xs text-gray-400">아래 목록에서 선택해주세요</p>}
        </div>
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="이름으로 검색" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
        <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
          {users.filter(u => u.id !== selected?.id).map(u => (
            <button key={u.id} onClick={() => setSelected(u)} className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-blue-400 hover:bg-blue-50 text-left">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">{u.name[0]}</div>
              <div><div className="text-sm font-medium text-gray-900">{u.name}</div><div className="text-xs text-gray-500">{u.organization}</div></div>
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button onClick={handleAssign} disabled={loading || !selected} className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50" style={{ background: "#2563eb" }}>{loading ? "지정 중..." : `${label} 지정하기`}</button>
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
  useEffect(() => { const q = keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""; fetch(`/api/users?krcOnly=true${q}`).then(r => r.json()).then(d => setUsers(d.users ?? [])); }, [keyword]);
  const handleAssign = async () => {
    if (!selected) { setError("결재자를 선택해주세요."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/approval-lines`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ finalApproverUserId: selected.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");
      onAssigned();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "오류가 발생했습니다."); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-24 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h2 className="text-base font-bold text-gray-900">{finalRoleLabel} 지정</h2><button onClick={onClose} className="text-gray-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <div className="bg-amber-50 rounded-xl p-3 mb-4 text-xs text-amber-700">검토가 완료됩니다. 최종 결재자를 지정해주세요.</div>
        <div className={`p-3 rounded-xl border-2 mb-4 ${selected ? "border-green-400 bg-green-50" : "border-dashed border-gray-300"}`}>
          <div className="text-xs text-gray-500 mb-1">{finalRoleLabel} <span className="text-red-500">*</span></div>
          {selected ? (<div className="flex items-center justify-between"><div><span className="text-sm font-medium text-gray-900">{selected.name}</span><span className="text-xs text-gray-500 ml-2">{selected.organization}</span></div><button onClick={() => setSelected(null)} className="text-gray-400 hover:text-red-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>) : <p className="text-xs text-gray-400">아래 목록에서 선택해주세요</p>}
        </div>
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="이름으로 검색" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
        <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
          {users.filter(u => u.id !== selected?.id).map(u => (
            <button key={u.id} onClick={() => setSelected(u)} className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-green-400 hover:bg-green-50 text-left">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm shrink-0">{u.name[0]}</div>
              <div><div className="text-sm font-medium text-gray-900">{u.name}</div><div className="text-xs text-gray-500">{u.organization}{u.employeeNo ? ` · ${u.employeeNo}` : ""}</div></div>
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button onClick={handleAssign} disabled={loading || !selected} className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50" style={{ background: "#16a34a" }}>{loading ? "지정 중..." : `${finalRoleLabel} 지정하기`}</button>
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
      if (contentType.includes("application/pdf")) { const blob = await res.blob(); const url = URL.createObjectURL(blob); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 10000); }
      else { const data = await res.json(); if (data.url) window.open(data.url, "_blank"); else alert(`PDF 생성 실패: ${data.error || "알 수 없는 오류"}`); }
    } catch (e) { console.error(e); alert("PDF 미리보기 중 오류가 발생했습니다."); }
    finally { setLoading(false); }
  };
  const handleDownload = () => {
    setDownloading(true);
    const a = document.createElement("a"); a.href = `/api/documents/${documentId}/pdf?download=true`; a.target = "_blank"; a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 2000);
  };
  return (
    <div className="flex gap-2">
      <button onClick={handlePreview} disabled={loading} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-blue-200 text-blue-600 text-sm font-medium hover:bg-blue-50 disabled:opacity-50 active:bg-blue-100">
        {loading ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
        {loading ? "생성 중..." : "미리보기"}
      </button>
      <button onClick={handleDownload} disabled={downloading} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-green-200 text-green-600 text-sm font-medium hover:bg-green-50 disabled:opacity-50 active:bg-green-100">
        {downloading ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
        {downloading ? "다운로드 중..." : "PDF 다운로드"}
      </button>
    </div>
  );
}
function DocumentContent({ doc, fd, approvalLines }: { doc: DocumentDetail; fd: Record<string, unknown>; approvalLines: ApprovalLine[] }) {
  const workPeriod = fd.workStartDate && fd.workEndDate ? `${fd.workStartDate} ~ ${fd.workEndDate}` : (fd.workDate as string) || "";
  const highPlaceItems: string[] = Array.isArray(fd.riskHighPlaceItems) ? fd.riskHighPlaceItems as string[] : [];
  const waterWorkItems: string[] = Array.isArray(fd.riskWaterWorkItems) ? fd.riskWaterWorkItems as string[] : [];
  const workAddress = doc.workAddress as string | undefined;
  const workLocationRaw = (fd.workLocation ?? fd.facilityLocation) as string | undefined;
  const workLocation = workAddress || workLocationRaw;
  const riskTypesSummary = [
    fd.riskHighPlace && `고소작업${highPlaceItems.length ? ": " + highPlaceItems.join(", ") : ""}${fd.riskHighPlaceDetail ? (highPlaceItems.length ? ", " : ": ") + fd.riskHighPlaceDetail : ""}`,
    fd.riskWaterWork && `수상·수중작업${waterWorkItems.length ? ": " + waterWorkItems.join(", ") : ""}${fd.riskWaterWorkDetail ? (waterWorkItems.length ? ", " : ": ") + fd.riskWaterWorkDetail : ""}`,
    fd.riskConfinedSpace && `밀폐공간${fd.riskConfinedSpaceDetail ? ": " + fd.riskConfinedSpaceDetail : ""}`,
    fd.riskPowerOutage && `정전작업${fd.riskPowerOutageDetail ? ": " + fd.riskPowerOutageDetail : ""}`,
    fd.riskFireWork && `화기작업${fd.riskFireWorkDetail ? ": " + fd.riskFireWorkDetail : ""}`,
    fd.riskOther && `기타${fd.riskOtherDetail ? ": " + fd.riskOtherDetail : ""}`,
  ].filter(Boolean) as string[];
  const factorLabels: Record<string, string> = {
    factorNarrowAccess: "접근통로 협소", factorSlippery: "미끄러운 지반", factorSteepSlope: "급경사면", factorWaterHazard: "익수·유수",
    factorRockfall: "낙석·굴러떨어짐", factorNoRailing: "안전 난간재", factorLadderNoGuard: "사다리 안전잠금장치", factorSuffocation: "질식·산소결핍·유해가스",
    factorElectricFire: "감전·전기화재요인", factorSparkFire: "불꽃·불티에 의한 화재", factorOther: `기타${fd.factorOtherDetail ? "(" + fd.factorOtherDetail + ")" : ""}`,
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
          {isForm3 && <Field label="시공사업체" value={fd.contractorCompany as string} />}
          {isForm3 && (fd.contractPeriodStart || fd.contractPeriodEnd) && <Field label="용역기간" value={`${fd.contractPeriodStart || ""} ~ ${fd.contractPeriodEnd || ""}`} />}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">작업정보</h3>
        <div className="space-y-2">
          <Field label="작업장소" value={workLocation} />
          {doc.workLatitude && doc.workLongitude && <LocationMapPreview lat={doc.workLatitude} lng={doc.workLongitude} address={doc.workAddress || workLocation} />}
          <Field label="작업내용" value={(fd.workContent ?? fd.workContents) as string} />
          {!Array.isArray(fd.participants) && fd.participants && <Field label="작업참여자" value={fd.participants as string} />}
          <Field label="입장자 명단" value={fd.entryList as string} />
          {isForm3 && <Field label="시설물명" value={fd.facilityName as string} />}
          {isForm3 && <Field label="시설 관리자" value={fd.facilityManager as string} />}
          {isForm3 && <Field label="관리자 직급" value={fd.facilityManagerGrade as string} />}
          {isForm3 && <Field label="작업위치" value={fd.workPosition as string} />}
          {isForm2 && <Field label="감시인" value={fd.monitorName as string} />}
          {isForm2 && <Field label="측정담당자" value={fd.measurerName as string} />}
          {isForm2 && <Field label="화기작업 필요" value={fd.needFireWork as string} />}
          {isForm2 && <Field label="내연기관 사용" value={fd.useInternalEngine as string} />}
          {isForm4 && <Field label="밀폐공간작업" value={fd.needConfinedSpace as string} />}
          {isForm4 && <Field label="화기작업 필요" value={fd.needFireWork as string} />}
        </div>
      </div>
      {isForm1 && riskTypesSummary.length > 0 && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">위험공종 체크사항</h3><div className="space-y-1.5">{riskTypesSummary.map((item, i) => (<div key={i} className="flex items-start gap-2"><div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center shrink-0 mt-0.5"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div><span className="text-sm text-gray-800">{item}</span></div>))}</div></div>}
      {isForm1 && checkedFactors.length > 0 && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">발생하는 위험요소</h3><div className="flex flex-wrap gap-2">{checkedFactors.map((f, i) => (<span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{f}</span>))}</div></div>}
      {isForm1 && Array.isArray(fd.riskRows) && (fd.riskRows as any[]).some(r => r.riskFactor || r.improvement) && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">위험요소 · 개선대책</h3><div className="space-y-2">{(fd.riskRows as any[]).filter(r => r.riskFactor || r.improvement).map((row, i) => (<div key={i} className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">{row.riskFactor && <div><span className="text-gray-500">위험요소:</span> <span className="text-gray-800">{row.riskFactor}</span></div>}{row.improvement && <div><span className="text-gray-500">개선대책:</span> <span className="text-gray-800">{row.improvement}</span></div>}{row.disasterType && <div><span className="text-gray-500">재해형태:</span> <span className="text-gray-800">{row.disasterType}</span></div>}</div>))}</div></div>}
      {(isForm2 || isForm4) && Array.isArray(fd.safetyChecks) && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">안전조치 이행사항</h3><div className="space-y-1.5">{(fd.safetyChecks as any[]).map((item, i) => (<div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-gray-50"><div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${item.applicable === "해당" ? "bg-blue-600" : "bg-gray-200"}`}>{item.applicable === "해당" && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}</div><span className={`flex-1 ${item.applicable === "해당" ? "text-gray-800 font-medium" : "text-gray-400"}`}>{item.label}</span>{item.applicable && <span className={`text-xs px-1.5 py-0.5 rounded ${item.applicable === "해당" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"}`}>{item.applicable}</span>}{item.result && <span className="text-gray-500 text-xs">→ {item.result}</span>}</div>))}</div></div>}
      {isForm4 && Array.isArray(fd.inspectionItems) && (fd.inspectionItems as any[]).some(i => i.equipment) && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">기기 확인 결과</h3><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-gray-50"><th className="text-left px-2 py-1.5 text-gray-600 font-medium">점검기기</th><th className="text-left px-2 py-1.5 text-gray-600 font-medium">차단확인자</th><th className="text-left px-2 py-1.5 text-gray-600 font-medium">전기담당자</th><th className="text-left px-2 py-1.5 text-gray-600 font-medium">현장정비</th></tr></thead><tbody>{(fd.inspectionItems as any[]).filter(i => i.equipment).map((item, i) => (<tr key={i} className="border-t border-gray-100"><td className="px-2 py-1.5 text-gray-800">{item.equipment}</td><td className="px-2 py-1.5 text-gray-800">{item.cutoffConfirmer}</td><td className="px-2 py-1.5 text-gray-800">{item.electrician}</td><td className="px-2 py-1.5 text-gray-800">{item.siteRepair}</td></tr>))}</tbody></table></div></div>}
      {isForm3 && Array.isArray(fd.participants) && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">작업 참여자</h3><div className="space-y-1.5">{(fd.participants as any[]).map((p, i) => (<div key={i} className="flex gap-3 text-sm"><span className="text-gray-400 w-28 shrink-0">{p.role}</span><span className="text-gray-900">{p.name} {p.phone ? `(${p.phone})` : ""}</span></div>))}</div></div>}
      {isForm3 && (fd.riskFactors || fd.improvementMeasures) && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">위험요소 및 개선대책</h3><div className="space-y-2">{fd.riskFactors && <Field label="위험요소" value={fd.riskFactors as string} />}{fd.improvementMeasures && <Field label="개선대책" value={fd.improvementMeasures as string} />}</div></div>}
      {(isForm2 || isForm4) && fd.specialMeasures && doc.currentApprovalOrder !== 1 && doc.status !== "SUBMITTED" && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-2">특별조치 필요사항</h3><p className="text-sm text-gray-800">{fd.specialMeasures as string}</p></div>}
      {(fd.reviewOpinion || fd.reviewResult) && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">안전관리자 검토의견</h3><div className="space-y-2">{fd.reviewOpinion && <div><p className="text-xs text-gray-500 mb-1">검토의견</p><p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2">{fd.reviewOpinion as string}</p></div>}{fd.reviewResult && <div><p className="text-xs text-gray-500 mb-1">조치결과</p><p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2">{fd.reviewResult as string}</p></div>}</div></div>}
      {(fd.signatureData || approvalLines.some(l => l.signatureData && l.stepStatus === "APPROVED")) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">서명</h3>
          <div className="space-y-2">
            {typeof fd.signatureData === "string" && fd.signatureData && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex border-b border-gray-100 bg-gray-50"><span className="text-xs font-medium text-gray-600 px-3 py-2 w-24 border-r border-gray-200">신청자</span><span className="text-xs text-gray-500 px-3 py-2">{fd.applicantName as string || ""}</span></div>
                <div className="flex items-center"><span className="text-xs text-gray-400 px-3 py-2 w-24 border-r border-gray-200 shrink-0">(서명)</span><div className="px-3 py-2"><img src={fd.signatureData as string} alt="신청자 서명" className="h-12 object-contain" /></div></div>
              </div>
            )}
            {approvalLines.filter(l => l.stepStatus === "APPROVED" && l.signatureData).map(line => {
              const roleLabel = doc.documentType === "CONFINED_SPACE"
                ? (line.approvalOrder === 2 ? "(계획확인)허가자" : line.approvalOrder === 4 ? "(이행확인)확인자" : ROLE_LABELS["CONFINED_SPACE"]?.[line.approvalOrder] ?? `${line.approvalOrder}단계`)
                : line.approvalRole === "FINAL_APPROVER" ? (FINAL_ROLE_LABELS[doc.documentType] ?? "최종 허가자") : (ROLE_LABELS[doc.documentType]?.[line.approvalOrder] ?? `${line.approvalOrder}단계`);
              return (
                <div key={line.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex border-b border-gray-100 bg-gray-50"><span className="text-xs font-medium text-gray-600 px-3 py-2 w-24 border-r border-gray-200">{roleLabel}</span><span className="text-xs text-gray-500 px-3 py-2">{line.approverName}</span></div>
                  <div className="flex items-center"><span className="text-xs text-gray-400 px-3 py-2 w-24 border-r border-gray-200 shrink-0">(서명)</span><div className="px-3 py-2"><img src={line.signatureData!} alt={`${roleLabel} 서명`} className="h-12 object-contain" /></div></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GasRowInput({ row, idx, onChange }: { row: any; idx: number; onChange: (idx: number, field: string, value: string) => void }) {
  const composing = useRef(false);

  const NumSpinner = ({ field, value, min, max, label }: { field: string; value: string; min: number; max: number; label: string }) => {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { if (ref.current) ref.current.value = value; }, []);
    const step = (dir: number) => {
      const cur = parseInt(ref.current?.value || "0") || 0;
      const next = Math.min(max, Math.max(min, cur + dir));
      if (ref.current) ref.current.value = String(next);
      onChange(idx, field, String(next));
    };
    return (
      <div className="flex flex-col items-center">
        <button type="button" onClick={() => step(1)}
          className="w-8 h-7 rounded-t-lg bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-blue-100 active:bg-blue-200">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <input ref={ref} type="number" min={min} max={max} defaultValue={value}
          onChange={e => { if (!composing.current) onChange(idx, field, e.target.value); }}
          onBlur={e => onChange(idx, field, e.target.value)}
          className="w-12 py-1.5 text-sm border-x border-gray-300 text-center text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
        <button type="button" onClick={() => step(-1)}
          className="w-8 h-7 rounded-b-lg bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-blue-100 active:bg-blue-200">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <span className="text-xs text-gray-500 mt-1">{label}</span>
      </div>
    );
  };

  const GasField = ({ field, label, unit, placeholder }: { field: string; label: string; unit: string; placeholder?: string }) => {
    const ref = useRef<HTMLInputElement>(null);
    const comp = useRef(false);
    useEffect(() => { if (ref.current) ref.current.value = row[field] || ""; }, []);
    return (
      <div className="flex flex-col">
        <label className="text-[10px] text-gray-500 mb-0.5">{label}</label>
        <div className="flex items-center gap-0.5">
          <input ref={ref} type="text" defaultValue={row[field] || ""}
            onCompositionStart={() => { comp.current = true; }}
            onCompositionEnd={e => { comp.current = false; onChange(idx, field, (e.target as HTMLInputElement).value); }}
            onChange={e => { if (!comp.current) onChange(idx, field, e.target.value); }}
            onBlur={e => onChange(idx, field, e.target.value)}
            placeholder={placeholder || ""}
            className="w-full px-2 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
          <span className="text-xs text-gray-500 shrink-0 ml-0.5">{unit}</span>
        </div>
      </div>
    );
  };

  const MeasurerField = ({ field, value }: { field: string; value: string }) => {
    const ref = useRef<HTMLInputElement>(null);
    const comp = useRef(false);
    useEffect(() => { if (ref.current) ref.current.value = value || ""; }, []);
    return (
      <input ref={ref} type="text" defaultValue={value || ""}
        onCompositionStart={() => { comp.current = true; }}
        onCompositionEnd={e => { comp.current = false; onChange(idx, field, (e.target as HTMLInputElement).value); }}
        onChange={e => { if (!comp.current) onChange(idx, field, e.target.value); }}
        onBlur={e => onChange(idx, field, e.target.value)}
        className="w-full px-2 py-2 text-xs text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
    );
  };

  return (
    <div className="border border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50">
      {/* ?닌됲뀋 + ??볦퍢 */}
      <div className="flex items-start gap-3">
        <span className="text-base font-bold text-gray-900 w-8 shrink-0 pt-2">{row.time}</span>
        <div className="flex gap-4">
          <NumSpinner field="hour" value={row.hour || ""} min={0} max={23} label="시" />
          <NumSpinner field="minute" value={row.minute || ""} min={0} max={59} label="분" />
        </div>
      </div>
      {/* 가스 농도 개별 입력 */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">측정 농도</p>
        <div className="grid grid-cols-2 gap-2">
          <GasField field="o2"  label="산소 O₂"      unit="%" placeholder="18~23.5" onCommit={v => onChange(idx, "o2",  v)} />
          <GasField field="co2" label="이산화탄소 CO₂" unit="%" placeholder="1.5미만"  onCommit={v => onChange(idx, "co2", v)} />
          <GasField field="h2s" label="황화수소 H₂S"   unit="ppm" placeholder="10미만" onCommit={v => onChange(idx, "h2s", v)} />
          <GasField field="co"  label="일산화탄소 CO"  unit="ppm" placeholder="30미만" onCommit={v => onChange(idx, "co",  v)} />
          <GasField field="ex"  label="폭발하한 EX"    unit="%" placeholder="10미만"   onCommit={v => onChange(idx, "ex",  v)} />
        </div>
      </div>
      {/* 측정자 + 인원 */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">측정자</label>
          <MeasurerField field="measurer" value={row.measurer || ""} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">??놁삢(筌?</label>
          <input type="number" min="0" defaultValue={row.entryCount || ""}
            onChange={e => onChange(idx, "entryCount", e.target.value)}
            className="w-full px-2 py-2 text-xs text-gray-900 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">??곸삢(筌?</label>
          <input type="number" min="0" defaultValue={row.exitCount || ""}
            onChange={e => onChange(idx, "exitCount", e.target.value)}
            className="w-full px-2 py-2 text-xs text-gray-900 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
        </div>
      </div>
    </div>
  );
}

function GasMeasureInput({ rows, onChange }: { rows: any[]; onChange: (rows: any[]) => void }) {
  const update = (idx: number, field: string, value: string) =>
    onChange(rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
        ?怨몄젟??륂뒄: O??18~23.5%) CO??1.5%沃섎챶彛? H?愿?10ppm沃섎챶彛? CO(30ppm沃섎챶彛? EX(10%沃섎챶彛?
      </p>
      {rows.map((row, idx) => (
        <GasRowInput key={idx} row={row} idx={idx} onChange={update} />
      ))}
    </div>
  );
}

    const isConfinedSpace = doc.documentType === "CONFINED_SPACE";
  const confinedOrder = doc.currentApprovalOrder ?? 0;

  const ReviewInputSection = () => {
    // 獄쎛?癒?궗揶???ｍ롨퉪?UI
    if (isConfinedSpace) {
      const stepDesc = CONFINED_STEP_DESC[confinedOrder] ?? "";
      return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
          <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse inline-block"/>
            {stepDesc}
          </h3>
          {confinedOrder === 1 && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">감시인으로서 작업 계획을 확인하고 서명해주세요.</p>
          )}
          {confinedOrder === 2 && (
            <div className="space-y-2">
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">특별조치 필요사항을 입력 후 서명해주세요.</p>
              <AiSpecialMeasuresButton doc={doc} onGenerated={setSpecialMeasuresInput} />
              <SpecialMeasuresInput value={specialMeasuresInput} onChange={setSpecialMeasuresInput} />
            </div>
          )}
          {confinedOrder === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">산소 및 유해가스 농도 측정결과를 입력해주세요.</p>
              <GasMeasureInput rows={gasMeasureRowsInput.length > 0 ? gasMeasureRowsInput : DEFAULT_GAS_ROWS} onChange={setGasMeasureRowsInput} />
            </div>
          )}
          {confinedOrder === 4 && (
            <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">측정결과를 최종 확인하고 서명해주세요.</p>
          )}
        </div>
      );
    }

    // ??곗뺘 ?얜챷苑?
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse inline-block"/>
          {doc.currentApprovalOrder === 1 ? "검토 의견 입력" : "검토의견 확인 및 설정"}
        </h3>
        {reviewGuideText && <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-3">{reviewGuideText}</p>}
        <div className="space-y-3">
          <div>
            {doc.currentApprovalOrder === 1 && (
              <AiSpecialMeasuresButton doc={doc} onGenerated={(v) => {
                if (reviewOpinionRef.current) reviewOpinionRef.current.value = v;
                setReviewOpinion(v);
              }} label="AI 검토의견 초안" />
            )}
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              검토의견 {doc.currentApprovalOrder === 1 && <span className="text-red-500 text-xs">(반려 시 필수)</span>}
            </label>
            <textarea
              key={`opinion-${dataKey}`}
              ref={reviewOpinionRef}
              defaultValue={reviewOpinion}
              placeholder="검토 의견을 입력해주세요 (반려 시 필수)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">鈺곌퀣?귛칰怨뚮궢</label>
            <textarea
              key={`result-${dataKey}`}
              ref={reviewResultRef}
              defaultValue={reviewResult}
              placeholder="鈺곌퀣?귛칰怨뚮궢????낆젾??곻폒?紐꾩뒄"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900" />
          </div>
        </div>
      </div>
    );
  };

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
          {isMyTurn && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium animate-pulse">??筌△뫀?</span>}
        </div>
        <h2 className="text-base font-bold text-gray-900">{taskName}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{typeLabel}</p>
        {doc.submittedAt && <p className="text-xs text-gray-400 mt-0.5">제출일: {new Date(doc.submittedAt).toLocaleDateString("ko-KR")}</p>}
      </div>

      {/* 탭 - 내용 / 결재현황 */}
      <div className="bg-white border-b border-gray-200 flex">
        {["내용", "결재현황"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* 내용 탭: 모든 입력내용 + 첨부파일 + PDF (승인완료시) */}
        {activeTab === "내용" && (
          <>
            <DocumentContent doc={doc} fd={fd} approvalLines={approvalLines} />
            <AttachmentViewer documentId={documentId} canAdd={false} />
            {isApproved && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  ?????PDF
                </h3>
                <PdfButtons documentId={documentId} />
              </div>
            )}
            {isMyTurn && <ReviewInputSection />}
            <CancelButton />
          </>
        )}

        {/* 결재현황 탭 - 결재흐름 + 특별조치 + 사진 */}
        {activeTab === "결재현황" && (
          <>
            <ApprovalFlow doc={doc} approvalLines={approvalLines} writerName={(fd.applicantName as string) || writerName} applicantSignature={(fd.signatureData as string) || undefined} />
            {(doc.documentType === "CONFINED_SPACE" || doc.documentType === "POWER_OUTAGE") && fd.specialMeasures && doc.currentApprovalOrder !== 1 && doc.status !== "SUBMITTED" && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-2">특별조치 필요사항</h3>
                <p className="text-sm text-gray-800">{fd.specialMeasures as string}</p>
              </div>
            )}
            <PhotoViewer documentId={documentId} />
            {isMyTurn && <ReviewInputSection />}
            <CancelButton />
          </>
        )}
      </div>

      {/* 하단 고정 버튼 - 결재 액션 */}
      {isMyTurn && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-3 pb-4">
          {/* 밀폐공간 3단계: 서명 없이 측정결과만 제출 */}
          {isConfinedSpace && confinedOrder === 3 ? (
            <button onClick={async () => {
              const gasRows = gasMeasureRowsInput.length > 0 ? gasMeasureRowsInput : DEFAULT_GAS_ROWS;
              setProcessing(true);
              try {
                const res = await fetch(`/api/documents/${documentId}/approve`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "APPROVE", signatureData: null, gasMeasureRows: gasRows }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "오류 발생");
                if (data.action === "NEED_FINAL_CONFIRMER") {
                  setConfinedNextAction("FINAL_CONFIRMER");
                  setShowConfinedNextModal(true);
                } else {
                  alert("결재가 취소됩니다. 문서탭에서 다시 작성할 수 있습니다.");
                  router.push("/approvals");
                }
              } catch (e: unknown) { alert(e instanceof Error ? e.message : "취소에 실패했습니다."); }
              finally { setProcessing(false); }
            }} disabled={processing}
              className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ background: "#16a34a" }}>
              {processing ? "취소 중..." : "📊 측정결과 제출 및 이행확인자 지정"}
            </button>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => {
                  const opinion = (reviewOpinionRef.current?.value ?? "").trim();
                  const result = (reviewResultRef.current?.value ?? "").trim();
                  setPendingOpinion(opinion);
                  setPendingResult(result);
                  setReviewOpinion(opinion);
                  setReviewResult(result);
                  setShowRejectConfirm(true);
                }} className="flex-1 py-3 rounded-xl border-2 border-red-200 text-sm font-medium text-red-600">반려</button>
              <button onClick={() => {
                  const opinion = (reviewOpinionRef.current?.value ?? "").trim();
                  const result = (reviewResultRef.current?.value ?? "").trim();
                  setPendingOpinion(opinion);
                  setPendingResult(result);
                  setReviewOpinion(opinion);
                  setReviewResult(result);
                  setShowApproveConfirm(true);
                }} className="flex-1 py-3 rounded-xl text-white text-sm font-medium" style={{ background: "#16a34a" }}>
                {isConfinedSpace
                  ? confinedOrder === 1 ? "감시인 서명" : confinedOrder === 2 ? "(계획확인) 서명" : "(이행확인) 최종 서명"
                  : doc.currentApprovalOrder === 1 ? "검토완료" : "최종 승인"}
              </button>
            </div>
          )}
        </div>
      )}

      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-2">반려하시겠습니까?</h3>
            <p className="text-sm text-gray-500 mb-4">반려 처리 후 신청인에게 알림이 전송됩니다.</p>
            {!(reviewOpinionRef.current?.value ?? reviewOpinion).trim() && <p className="text-xs text-red-500 mb-3">반려 사유(검토의견)를 먼저 입력해주세요.</p>}
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
              {isConfinedSpace
                ? confinedOrder === 1 ? "감시인 서명 후 (계획확인)허가자를 지정합니다"
                  : confinedOrder === 2 ? "(계획확인) 허가자 서명을 완료합니다"
                  : "(이행확인) 최종 서명을 완료합니다"
                : doc.currentApprovalOrder === 1 ? "검토완료 후 최종허가자에게 지정됩니다" : "최종 승인하시겠습니까?"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {isConfinedSpace
                ? "서명 후 다음 단계가 진행됩니다."
                : doc.currentApprovalOrder === 1 ? "서명 후 최종허가자를 지정합니다." : "최종 승인 후 되돌릴 수 없습니다."}
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
                <div className="absolute top-2 left-3 text-xs text-gray-300 pointer-events-none">아래에 서명해주세요</div>
                <canvas ref={canvasRef} width={600} height={180} className="w-full"
                  style={{ cursor: "crosshair", touchAction: "none", display: "block" }}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              </div>
            </div>
            <div className="px-6 pb-24 space-y-2">
              <div className="flex gap-2">
                <button onClick={clearCanvas} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium">서명 지우기</button>
                <button onClick={() => setShowSign(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium">?띯뫁??/button>
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
          onAssigned={() => { setShowFinalApprover(false); alert("최종허가자가 지정됩니다. 알림이 전송됩니다."); router.push("/approvals"); }} />
      )}

      {/* 밀폐공간 다음단계 지정 모달 */}
      {showConfinedNextModal && confinedNextAction && doc && (
        <ConfinedNextModal
          documentId={documentId}
          action={confinedNextAction}
          onClose={() => setShowConfinedNextModal(false)}
          onAssigned={() => {
            setShowConfinedNextModal(false);
            const msg = confinedNextAction === "PLAN_APPROVER"
              ? "(계획확인) 허가자가 지정됩니다."
              : "(이행확인) 확인자가 지정됩니다.";
            alert(msg);
            router.push("/approvals");
          }}
        />
      )}
    </div>
  );
}

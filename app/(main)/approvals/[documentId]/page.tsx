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
  SUBMITTED:       { bg: "bg-blue-100",   text: "text-blue-600",   label: "?œì¶œ?„ë£Œ" },
  IN_REVIEW:       { bg: "bg-amber-100",  text: "text-amber-600",  label: "ê²€? ì¤‘" },
  IN_REVIEW_FINAL: { bg: "bg-orange-100", text: "text-orange-600", label: "ìµœì¢…ê²°ì¬ ì§„í–‰ì¤? },
  APPROVED:        { bg: "bg-green-100",  text: "text-green-600",  label: "?¹ì¸?„ë£Œ" },
  REJECTED:        { bg: "bg-red-100",    text: "text-red-600",    label: "ë°˜ë ¤" },
  DRAFT:           { bg: "bg-gray-100",   text: "text-gray-600",   label: "?‘ì„±ì¤? },
};
const ROLE_LABELS: Record<string, Record<number, string>> = {
  SAFETY_WORK_PERMIT: { 1: "(ê³„íš?•ì¸)?ˆê???, 2: "(?´í–‰?•ì¸)?•ì¸??, 3: "(?´í–‰?•ì¸)?•ì¸?? },
  CONFINED_SPACE:     { 1: "ê°ì‹œ??, 2: "(ê³„íš?•ì¸)?ˆê???, 3: "ì¸¡ì •?´ë‹¹??, 4: "(?´í–‰?•ì¸)?•ì¸?? },
  HOLIDAY_WORK:       { 1: "ê²€? ì", 2: "?¹ì¸?? },
  POWER_OUTAGE:       { 1: "(ê³„íš?•ì¸)?ˆê???, 2: "(?´í–‰?•ì¸)?•ì¸?? },
};
const CONFINED_STEP_DESC: Record<number, string> = {
  1: "ê°ì‹œ???œëª…",
  2: "?¹ë³„ì¡°ì¹˜ ?…ë ¥ ë°?(ê³„íš?•ì¸) ?ˆê????œëª…",
  3: "ì¸¡ì •ê²°ê³¼ ?…ë ¥",
  4: "(?´í–‰?•ì¸) ?•ì¸??ìµœì¢… ?œëª…",
};
const FINAL_ROLE_LABELS: Record<string, string> = {
  SAFETY_WORK_PERMIT: "(?´í–‰?•ì¸)?•ì¸??,
  CONFINED_SPACE:     "(?´í–‰?•ì¸)?•ì¸??,
  HOLIDAY_WORK:       "?¹ì¸??,
  POWER_OUTAGE:       "(?´í–‰?•ì¸)?•ì¸??,
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
  const mapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(address || "?‘ì—…?¥ì†Œ")},${lat},${lng}`;
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
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 font-medium">ì§€?„ì—´ê¸???/a>
      </div>
      <div ref={mapRef} style={{ width: "100%", height: "200px" }}>
        <div className="w-full h-full flex items-center justify-center bg-gray-50"><p className="text-xs text-gray-400">ì§€??ë¡œë”© ì¤?..</p></div>
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
      <h3 className="text-sm font-bold text-gray-900 mb-3">ì²¨ë? ?¬ì§„ <span className="text-xs text-gray-400 font-normal">({photos.length}??</span></h3>
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
          <img src={previewUrl} alt="ë¯¸ë¦¬ë³´ê¸°" className="max-w-full max-h-[85vh] object-contain" onClick={e => e.stopPropagation()} />
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
    if (!file.type.startsWith("image/")) { alert("?´ë?ì§€ ?Œì¼ë§?ê°€?¥í•©?ˆë‹¤."); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("attachmentType", "PHOTO"); fd.append("sortOrder", String(photos.length));
      const res = await fetch(`/api/documents/${documentId}/attachments`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotos(prev => [...prev, data.attachment]);
    } catch (e) { alert(`?…ë¡œ???¤íŒ¨: ${e instanceof Error ? e.message : "?¤ë¥˜"}`); }
    finally { setUploading(false); }
  };
  const formatSize = (size: number | null) => { if (!size) return ""; if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)}KB`; return `${(size / 1024 / 1024).toFixed(1)}MB`; };
  const hasAny = photos.length > 0 || docFiles.length > 0;
  if (!hasAny && !canAdd) return null;
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-3">ì²¨ë? ?Œì¼ {(photos.length + docFiles.length) > 0 && <span className="text-xs text-gray-400 font-normal">({photos.length + docFiles.length}ê°?</span>}</h3>
      {photos.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">?“· ?¬ì§„ {photos.length}??/p>
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
          <p className="text-xs text-gray-400 mb-2">?“„ ë¬¸ì„œ {docFiles.length}ê°?/p>
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
          <button onClick={() => cameraRef.current?.click()} disabled={uploading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">ì¹´ë©”??/button>
          <button onClick={() => galleryRef.current?.click()} disabled={uploading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">ê°¤ëŸ¬ë¦?/button>
        </div>
      )}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { Array.from(e.target.files ?? []).forEach(f => uploadPhoto(f)); e.target.value = ""; }} />
      {previewUrl && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center" onClick={() => setPreviewUrl(null)}>
          <button className="absolute top-4 right-4 text-white p-2 z-10"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          <img src={previewUrl} alt="ë¯¸ë¦¬ë³´ê¸°" className="max-w-full max-h-[85vh] object-contain" onClick={e => e.stopPropagation()} />
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
  const finalLabel = FINAL_ROLE_LABELS[doc.documentType] ?? "ìµœì¢… ?ˆê???;
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
      { icon: <StepIcon type="submit" status={isSubmitted ? "done" : "active"} />, label: "? ì²­??, name: writerName, signatureData: isSubmitted ? applicantSignature : undefined, status: isSubmitted ? "done" : "active" },
      mkStep(1, "ê°ì‹œ??, "review", (fd.monitorName as string) || ""),
      mkStep(2, "(ê³„íš?•ì¸)?ˆê???, "approve", ""),
      mkStep(3, "ì¸¡ì •?´ë‹¹??, "review", (fd.measurerName as string) || ""),
      mkStep(4, "(?´í–‰?•ì¸)?•ì¸??, "approve", ""),
    ];
  } else if (doc.documentType === "POWER_OUTAGE") {
    const lineMap = Object.fromEntries(approvalLines.map(l => [l.approvalOrder, l]));
    const mkStepP = (order: number, label: string, type: "submit" | "review" | "approve", name: string) => {
      const line = lineMap[order];
      const status = line ? getStepStatus(line) : "pending";
      return { icon: <StepIcon type={type} status={status} />, label, name: line?.approverName ?? name, comment: line?.comment, actedAt: line?.actedAt, signatureData: line?.signatureData, status };
    };
    steps = [
      { icon: <StepIcon type="submit" status={isSubmitted ? "done" : "active"} />, label: "? ì²­??, name: writerName, signatureData: isSubmitted ? applicantSignature : undefined, status: isSubmitted ? "done" : "active" },
      mkStepP(1, "ê³„íš?•ì¸?ˆê???, "approve", ""),
      mkStepP(2, "?ê??•ì¸?‘ì„±??, "review", (fd.inspectionWriterName as string) || ""),
      mkStepP(3, "?´í–‰?•ì¸?•ì¸??, "approve", ""),
    ];
  } else {
    const line1 = approvalLines.find(l => l.approvalOrder === 1);
    const line2 = approvalLines.find(l => l.approvalOrder === 2);
    steps = [
      { icon: <StepIcon type="submit" status={isSubmitted ? "done" : "active"} />, label: "? ì²­??, name: writerName, signatureData: isSubmitted ? applicantSignature : undefined, status: isSubmitted ? "done" : "active" },
      ...(line1 ? [{ icon: <StepIcon type={doc.documentType === "SAFETY_WORK_PERMIT" ? "approve" : "review"} status={getStepStatus(line1)} />, label: roleLabels[1] ?? "(ê³„íš?•ì¸)?ˆê???, name: line1.approverName ?? "", comment: line1.comment, actedAt: line1.actedAt, signatureData: line1.signatureData, status: getStepStatus(line1) }] : []),
      ...(line2 ? [{ icon: <StepIcon type="approve" status={getStepStatus(line2)} />, label: line2.approvalRole === "FINAL_APPROVER" ? finalLabel : (roleLabels[2] ?? "(?´í–‰?•ì¸)?•ì¸??), name: line2.approverName ?? "", comment: line2.comment, actedAt: line2.actedAt, signatureData: line2.signatureData, status: getStepStatus(line2) }] : []),
    ];
  }
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-4">ê²°ì¬ ?ë¦„</h3>
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
                  {step.status === "done" ? "?„ë£Œ" : step.status === "active" ? "ì§„í–‰ì¤? : step.status === "rejected" ? "ë°˜ë ¤" : "?€ê¸?}
                </span>
              </div>
              <span className="text-xs text-gray-600">{step.name}</span>
              {step.signatureData && <div className="mt-1.5 border border-gray-200 rounded-lg overflow-hidden bg-white inline-block"><img src={step.signatureData} alt="?œëª…" className="h-10 object-contain px-2" /></div>}
              {step.actedAt && <span className="text-[10px] text-gray-400 mt-0.5 block">{new Date(step.actedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function ConfinedNextModal({ documentId, action, onClose, onAssigned, nextOrderOverride }: { documentId: string; action: "PLAN_APPROVER" | "FINAL_CONFIRMER"; onClose: () => void; onAssigned: () => void; nextOrderOverride?: number }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const label = action === "PLAN_APPROVER" ? "(ê³„íš?•ì¸) ?ˆê??? : "(?´í–‰?•ì¸) ?•ì¸??;
  const nextOrder = nextOrderOverride ?? (action === "PLAN_APPROVER" ? 2 : 4);
  const nextTitle = action === "PLAN_APPROVER" ? "ë°€?ê³µê°??‘ì—…?ˆê? - (ê³„íš?•ì¸) ?ˆê????œëª… ?”ì²­" : "ë°€?ê³µê°??‘ì—…?ˆê? - (?´í–‰?•ì¸) ìµœì¢… ?•ì¸ ?”ì²­";
  useEffect(() => { const q = keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""; fetch(`/api/users?krcOnly=true&role=FINAL_APPROVER${q}`).then(r => r.json()).then(d => setUsers(d.users ?? [])); }, [keyword]);
  const handleAssign = async () => {
    if (!selected) { setError("ê²°ì¬?ë? ? íƒ?´ì£¼?¸ìš”."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/approval-lines`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nextApproverUserId: selected.id, nextOrder, nextRole: "FINAL_APPROVER", nextTitle }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "?¤ë¥˜ ë°œìƒ");
      onAssigned();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤."); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-24 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h2 className="text-base font-bold text-gray-900">{label} ì§€??/h2><button onClick={onClose} className="text-gray-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">{label}ë¥?ì§€?•í•´ì£¼ì„¸??</div>
        <div className={`p-3 rounded-xl border-2 mb-4 ${selected ? "border-blue-400 bg-blue-50" : "border-dashed border-gray-300"}`}>
          {selected ? (<div className="flex items-center justify-between"><div><span className="text-sm font-medium text-gray-900">{selected.name}</span><span className="text-xs text-gray-500 ml-2">{selected.organization}</span></div><button onClick={() => setSelected(null)} className="text-gray-400 hover:text-red-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>) : <p className="text-xs text-gray-400">?„ë˜ ëª©ë¡?ì„œ ? íƒ?´ì£¼?¸ìš”</p>}
        </div>
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="?´ë¦„?¼ë¡œ ê²€?? className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
        <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
          {users.filter(u => u.id !== selected?.id).map(u => (
            <button key={u.id} onClick={() => setSelected(u)} className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-blue-400 hover:bg-blue-50 text-left">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">{u.name[0]}</div>
              <div><div className="text-sm font-medium text-gray-900">{u.name}</div><div className="text-xs text-gray-500">{u.organization}</div></div>
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button onClick={handleAssign} disabled={loading || !selected} className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50" style={{ background: "#2563eb" }}>{loading ? "ì§€??ì¤?.." : `${label} ì§€?•í•˜ê¸?}</button>
      </div>
    </div>
  );
}
function FinalApproverModal({ documentId, documentType, isFirstStep = false, onClose, onAssigned }: { documentId: string; documentType: string; isFirstStep?: boolean; onClose: () => void; onAssigned: () => void }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const finalRoleLabel = documentType === "SAFETY_WORK_PERMIT"
    ? (isFirstStep ? "(ê³„íš?•ì¸)?ˆê??? : "(?´í–‰?•ì¸)?•ì¸??)
    : (FINAL_ROLE_LABELS[documentType] ?? "ìµœì¢… ?ˆê???);
  const needFinalApprover = documentType !== "HOLIDAY_WORK";
    useEffect(() => { const q = keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""; fetch(`/api/users?krcOnly=true${q}`).then(r => r.json()).then(d => setUsers(d.users ?? [])); }, [keyword]);
  const handleAssign = async () => {
    if (!selected) { setError("ê²°ì¬?ë? ? íƒ?´ì£¼?¸ìš”."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/approval-lines`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ finalApproverUserId: selected.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "?¤ë¥˜ ë°œìƒ");
      onAssigned();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤."); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-24 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h2 className="text-base font-bold text-gray-900">{finalRoleLabel} ì§€??/h2><button onClick={onClose} className="text-gray-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <div className="hidden rounded-xl p-3 mb-4 text-xs text-amber-700">{isFirstStep && documentType === "SAFETY_WORK_PERMIT" ? "? ì²­?œê? ?œì¶œ?˜ì—ˆ?µë‹ˆ?? (ê³„íš?•ì¸)?ˆê??ë? ì§€?•í•´ì£¼ì„¸??" : ""}</div>
        <div className={`p-3 rounded-xl border-2 mb-4 ${selected ? "border-green-400 bg-green-50" : "border-dashed border-gray-300"}`}>
          <div className="text-xs text-gray-500 mb-1">{finalRoleLabel} <span className="text-red-500">*</span></div>
          {selected ? (<div className="flex items-center justify-between"><div><span className="text-sm font-medium text-gray-900">{selected.name}</span><span className="text-xs text-gray-500 ml-2">{selected.organization}</span></div><button onClick={() => setSelected(null)} className="text-gray-400 hover:text-red-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>) : <p className="text-xs text-gray-400">?„ë˜ ëª©ë¡?ì„œ ? íƒ?´ì£¼?¸ìš”</p>}
        </div>
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="?´ë¦„?¼ë¡œ ê²€?? className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
        <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
          {users.filter(u => u.id !== selected?.id).map(u => (
            <button key={u.id} onClick={() => setSelected(u)} className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-green-400 hover:bg-green-50 text-left">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm shrink-0">{u.name[0]}</div>
              <div><div className="text-sm font-medium text-gray-900">{u.name}</div><div className="text-xs text-gray-500">{u.organization}{u.employeeNo ? ` Â· ${u.employeeNo}` : ""}</div></div>
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button onClick={handleAssign} disabled={loading || !selected} className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50" style={{ background: "#16a34a" }}>{loading ? "ì§€??ì¤?.." : `${finalRoleLabel} ì§€?•í•˜ê¸?}</button>
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
      if (!res.ok) { const data = await res.json().catch(() => ({})); alert(`PDF ?ì„± ?¤íŒ¨: ${data.error || res.statusText}`); return; }
      const contentType = res.headers.get("Content-Type") || "";
      if (contentType.includes("application/pdf")) { const blob = await res.blob(); const url = URL.createObjectURL(blob); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 10000); }
      else { const data = await res.json(); if (data.url) window.open(data.url, "_blank"); else alert(`PDF ?ì„± ?¤íŒ¨: ${data.error || "?????†ëŠ” ?¤ë¥˜"}`); }
    } catch (e) { console.error(e); alert("PDF ë¯¸ë¦¬ë³´ê¸° ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤."); }
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
        {loading ? "?ì„± ì¤?.." : "ë¯¸ë¦¬ë³´ê¸°"}
      </button>
      <button onClick={handleDownload} disabled={downloading} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-green-200 text-green-600 text-sm font-medium hover:bg-green-50 disabled:opacity-50 active:bg-green-100">
        {downloading ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
        {downloading ? "?¤ìš´ë¡œë“œ ì¤?.." : "PDF ?¤ìš´ë¡œë“œ"}
      </button>
    </div>
  );
}
function DocumentContent({ doc, fd, approvalLines }: { doc: DocumentDetail; fd: Record<string, unknown>; approvalLines: ApprovalLine[]; activeTab?: string | undefined }) {
  const workPeriod = fd.workStartDate && fd.workEndDate ? `${fd.workStartDate} ~ ${fd.workEndDate}` : (fd.workDate as string) || "";
  const highPlaceItems: string[] = Array.isArray(fd.riskHighPlaceItems) ? fd.riskHighPlaceItems as string[] : [];
  const waterWorkItems: string[] = Array.isArray(fd.riskWaterWorkItems) ? fd.riskWaterWorkItems as string[] : [];
  const workAddress = doc.workAddress as string | undefined;
  const workLocationRaw = (fd.workLocation ?? fd.facilityLocation) as string | undefined;
  const workLocation = workAddress || workLocationRaw;
  const riskTypesSummary = [
    fd.riskHighPlace && `ê³ ì†Œ?‘ì—…${highPlaceItems.length ? ": " + highPlaceItems.join(", ") : ""}${fd.riskHighPlaceDetail ? (highPlaceItems.length ? ", " : ": ") + fd.riskHighPlaceDetail : ""}`,
    fd.riskWaterWork && `?˜ìƒÂ·?˜ì¤‘?‘ì—…${waterWorkItems.length ? ": " + waterWorkItems.join(", ") : ""}${fd.riskWaterWorkDetail ? (waterWorkItems.length ? ", " : ": ") + fd.riskWaterWorkDetail : ""}`,
    fd.riskConfinedSpace && `ë°€?ê³µê°?{fd.riskConfinedSpaceDetail ? ": " + fd.riskConfinedSpaceDetail : ""}`,
    fd.riskPowerOutage && `?•ì „?‘ì—…${fd.riskPowerOutageDetail ? ": " + fd.riskPowerOutageDetail : ""}`,
    fd.riskFireWork && `?”ê¸°?‘ì—…${fd.riskFireWorkDetail ? ": " + fd.riskFireWorkDetail : ""}`,
    fd.riskOther && `ê¸°í?${fd.riskOtherDetail ? ": " + fd.riskOtherDetail : ""}`,
  ].filter(Boolean) as string[];
  const factorLabels: Record<string, string> = {
    factorNarrowAccess: "ì§„ì¶œ?…ë¡œ ?‘ì†Œ", factorSlippery: "ë¯¸ëŒ?¬ì§‘(?´ë¼ê¸? ?µê¸°)", factorSteepSlope: "ê¸‰ê²½??, factorWaterHazard: "?Œë‘?§ìœ ?˜â€§ìˆ˜??,
    factorRockfall: "?™ì„?§í† ?¬ë¶•ê´?, factorNoRailing: "?œê°„ ë¯¸ì„¤ì¹?, factorLadderNoGuard: "?¬ë‹¤ë¦¬â€§ë°©?¸ìš¸ ë¯¸ì„¤ì¹?, factorSuffocation: "ì§ˆì‹Â·?”ì¬Â·??°œ",
    factorElectricFire: "ê°ì „Â·?„ê¸°ë¶ˆê½ƒ ?”ì¬", factorSparkFire: "?¤íŒŒ?? ?”ì—¼???˜í•œ ?”ì¬", factorOther: `ê¸°í?${fd.factorOtherDetail ? "(" + fd.factorOtherDetail + ")" : ""}`,
  };
  const checkedFactors = Object.entries(factorLabels).filter(([key]) => !!(fd as any)[key]).map(([, label]) => label);
  const isForm1 = doc.documentType === "SAFETY_WORK_PERMIT";
  const isForm2 = doc.documentType === "CONFINED_SPACE";
  const isForm3 = doc.documentType === "HOLIDAY_WORK";
  const isForm4 = doc.documentType === "POWER_OUTAGE";
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">ê¸°ë³¸?•ë³´</h3>
        <div className="space-y-2">
          <Field label="? ì²­?? value={(fd.requestDate as string) || (fd.reportDate as string)} />
          <Field label="?‘ì—…ê¸°ê°„" value={workPeriod} />
          <Field label="?‘ì—…?œê°„" value={fd.workStartTime && fd.workEndTime ? `${fd.workStartTime} ~ ${fd.workEndTime}` : null} />
          <Field label="?©ì—­ëª? value={(fd.projectName ?? fd.serviceName) as string} />
          <Field label="?…ì²´ëª? value={fd.applicantCompany as string} />
          <Field label="ì§ì±…" value={fd.applicantTitle as string} />
          <Field label="? ì²­?? value={fd.applicantName as string} />
          {isForm3 && <Field label="?œê³µ?¬ì—…ì²? value={fd.contractorCompany as string} />}
          {isForm3 && (fd.contractPeriodStart || fd.contractPeriodEnd) && <Field label="?©ì—­ê¸°ê°„" value={`${fd.contractPeriodStart || ""} ~ ${fd.contractPeriodEnd || ""}`} />}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">?‘ì—…?•ë³´</h3>
        <div className="space-y-2">
          <Field label="?‘ì—…?¥ì†Œ" value={workLocation} />
          {doc.workLatitude && doc.workLongitude && <LocationMapPreview lat={doc.workLatitude} lng={doc.workLongitude} address={doc.workAddress || workLocation} />}
          <Field label="?‘ì—…?´ìš©" value={(fd.workContent ?? fd.workContents) as string} />
          {!Array.isArray(fd.participants) && fd.participants && <Field label="?‘ì—…ì°¸ì—¬?? value={fd.participants as string} />}
          <Field label="?…ì¥??ëª…ë‹¨" value={fd.entryList as string} />
          {(isForm1 || isForm2 || isForm4) && fd.facilityName && <Field label="?œì„¤ë¬¼ëª…" value={fd.facilityName as string} />}
          {isForm3 && <Field label="?œì„¤ë¬¼ëª…" value={fd.facilityName as string} />}
          {isForm3 && <Field label="?œì„¤ ê´€ë¦¬ì" value={fd.facilityManager as string} />}
          {isForm3 && <Field label="ê´€ë¦¬ì ì§ê¸‰" value={fd.facilityManagerGrade as string} />}
          {isForm3 && <Field label="?‘ì—…?„ì¹˜" value={fd.workPosition as string} />}
          {isForm2 && <Field label="ê°ì‹œ?? value={fd.monitorName as string} />}
          {isForm2 && <Field label="ì¸¡ì •?´ë‹¹?? value={fd.measurerName as string} />}
          {isForm2 && <Field label="?”ê¸°?‘ì—… ?„ìš”" value={fd.needFireWork as string} />}
          {isForm2 && <Field label="?´ì—°ê¸°ê? ?¬ìš©" value={fd.useInternalEngine as string} />}
          {isForm4 && <Field label="ë°€?ê³µê°„ì‘?? value={fd.needConfinedSpace as string} />}
          {isForm4 && <Field label="?”ê¸°?‘ì—… ?„ìš”" value={fd.needFireWork as string} />}
        </div>
      </div>
      {isForm1 && riskTypesSummary.length > 0 && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">?„í—˜ê³µì¢… ì²´í¬?¬í•­</h3><div className="space-y-1.5">{riskTypesSummary.map((item, i) => (<div key={i} className="flex items-start gap-2"><div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center shrink-0 mt-0.5"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div><span className="text-sm text-gray-800">{item}</span></div>))}</div></div>}
      {isForm1 && checkedFactors.length > 0 && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">ë°œìƒ?˜ëŠ” ?„í—˜?”ì†Œ</h3><div className="flex flex-wrap gap-2">{checkedFactors.map((f, i) => (<span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{f}</span>))}</div></div>}
      {isForm1 && Array.isArray(fd.riskRows) && fd.riskRows.length > 0 && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">?„í—˜?”ì†Œ Â· ê°œì„ ?€ì±?/h3><div className="space-y-2">{(fd.riskRows as any[]).map((row, i) => (<div key={i} className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">{row.riskFactor && <div><span className="text-gray-500">?„í—˜?”ì†Œ:</span> <span className="text-gray-800">{row.riskFactor}</span></div>}{row.improvement && <div><span className="text-gray-500">ê°œì„ ?€ì±?</span> <span className="text-gray-800">{row.improvement}</span></div>}{row.disasterType && <div><span className="text-gray-500">?¬í•´?•íƒœ:</span> <span className="text-gray-800">{row.disasterType}</span></div>}</div>))}</div></div>}
      {isForm2 && Array.isArray(fd.gasMeasureRows) && (fd.gasMeasureRows as any[]).length > 0 && (() => {
        const PHASE_ORDER = ["?‘ì—… ??, "?‘ì—… ì¤?1ì°?", "?‘ì—… ì¤?2ì°?"];
        const rows = PHASE_ORDER.map(phase => (fd.gasMeasureRows as any[]).find((r: any) => r.phase === phase)).filter(Boolean);
        if (rows.length === 0) return null;
        const checkGas = (field: string, val: string) => {
          const n = parseFloat(val);
          if (!val || isNaN(n)) return "empty";
          if (field === "o2") return n >= 18 && n <= 23.5 ? "ok" : "danger";
          if (field === "co2") return n <= 1.5 ? "ok" : "danger";
          if (field === "h2s") return n <= 10 ? "ok" : "danger";
          if (field === "co") return n <= 30 ? "ok" : "danger";
          if (field === "ex") return n <= 10 ? "ok" : "danger";
          return "ok";
        };
        return (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">?°ì†Œ ë°?? í•´ê°€???ë„ ì¸¡ì •ê²°ê³¼</h3>
            <p className="text-[10px] text-gray-400 mb-3">ê¸°ì?ê°? O??18~23.5%) CO????.5%) H?‚S(??0ppm) CO(??0ppm) EX(??0%)</p>
            <div className="space-y-3">
              {rows.map((row: any, i: number) => {
                const gasFields = [
                  {label:"O??%)", field:"o2", value:row.o2},
                  {label:"CO??%)", field:"co2", value:row.co2},
                  {label:"H?‚S(ppm)", field:"h2s", value:row.h2s},
                  {label:"CO(ppm)", field:"co", value:row.co},
                  {label:"EX(%)", field:"ex", value:row.ex},
                ].filter(g => g.value);
                const allOk = gasFields.every(g => checkGas(g.field, g.value) !== "danger");
                const hasDanger = gasFields.some(g => checkGas(g.field, g.value) === "danger");
                return (
                  <div key={i} className={`rounded-xl p-3 border ${hasDanger ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{row.phase || `${i+1}??}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hasDanger ? "bg-red-100 text-red-700" : allOk && gasFields.length > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {hasDanger ? "???„í—˜" : allOk && gasFields.length > 0 ? "???‘í˜¸" : "ì¸¡ì •??}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {gasFields.map((g, j) => {
                        const st = checkGas(g.field, g.value);
                        return (
                          <div key={j} className={`rounded-lg p-1.5 text-center ${st === "danger" ? "bg-red-100" : "bg-white border border-gray-100"}`}>
                            <div className="text-[9px] text-gray-500">{g.label}</div>
                            <div className={`text-xs font-bold ${st === "danger" ? "text-red-600" : "text-gray-900"}`}>{g.value}</div>
                            <div className={`text-[9px] ${st === "danger" ? "text-red-500" : "text-green-600"}`}>{st === "danger" ? "?„í—˜" : "?‘í˜¸"}</div>
                          </div>
                        );
                      })}
                    </div>
                    {row.measurer && <p className="text-[10px] text-gray-500 mt-1">ì¸¡ì •?? {row.measurer} {row.hour !== undefined ? `${row.hour}??${row.minute || 0}ë¶? : ""}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

{(isForm2 || isForm4) && Array.isArray(fd.safetyChecks) && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">?ˆì „ì¡°ì¹˜ ?´í–‰?¬í•­</h3>
                  <div className="space-y-1">
                    <div className="grid grid-cols-12 gap-1 px-2 py-1 bg-gray-100 rounded-lg mb-1">
                      <div className="col-span-6 text-xs font-medium text-gray-600">?•ì¸??ª©</div>
                      <div className="col-span-3 text-xs font-medium text-gray-600 text-center">?´ë‹¹?¬ë?</div>
                      <div className="col-span-3 text-xs font-medium text-gray-600 text-center">?•ì¸ê²°ê³¼</div>
                    </div>
                    {(fd.safetyChecks as any[]).map((item, idx2) => {
                      const isBold = item.label?.startsWith("\u25cf") || item.label?.startsWith("\u2605");
                      const displayLabel = item.label?.replace(/^[\u25cf\u2605]/, "") || item.label;
                      const isHaedan = item.applicable === "\ud574??;
                      return (
                        <div key={idx2} className={`grid grid-cols-12 gap-1 items-center border rounded-lg px-2 py-1 ${isBold ? "bg-blue-50 border-blue-100" : "border-gray-100"}`}>
                          <div className={`col-span-6 text-xs leading-tight ${isBold ? "font-bold text-gray-900" : "text-gray-700"}`}>{displayLabel}</div>
                          <div className="col-span-3 text-center">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isHaedan ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                              {isHaedan ? "\ud574?? : "\ud574?¹ì—†??}
                            </span>
                          </div>
                          <div className="col-span-3 text-center">
                            {isHaedan ? (
                              <span className="text-[10px] text-green-700 font-medium">{item.result || "\uc870ì¹˜ì™„ë£?}</span>
                            ) : (
                              <span className="text-[10px] text-gray-400">-</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
      {isForm4 && Array.isArray(fd.inspectionItems) && (fd.inspectionItems as any[]).some(i => i.equipment) && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">ê¸°ê¸° ?•ì¸ ê²°ê³¼</h3><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-gray-50"><th className="text-left px-2 py-1.5 text-gray-600 font-medium">?ê?ê¸°ê¸°</th><th className="text-left px-2 py-1.5 text-gray-600 font-medium">ì°¨ë‹¨?•ì¸??/th><th className="text-left px-2 py-1.5 text-gray-600 font-medium">?„ê¸°?´ë‹¹??/th><th className="text-left px-2 py-1.5 text-gray-600 font-medium">?„ì¥?•ë¹„</th></tr></thead><tbody>{(fd.inspectionItems as any[]).filter(i => i.equipment).map((item, i) => (<tr key={i} className="border-t border-gray-100"><td className="px-2 py-1.5 text-gray-800">{item.equipment}</td><td className="px-2 py-1.5 text-gray-800">{item.cutoffConfirmer}</td><td className="px-2 py-1.5 text-gray-800">{item.electrician}</td><td className="px-2 py-1.5 text-gray-800">{item.siteRepair}</td></tr>))}</tbody></table></div></div>}
      {isForm3 && Array.isArray(fd.participants) && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">?‘ì—… ì°¸ì—¬??/h3><div className="space-y-1.5">{(fd.participants as any[]).map((p, i) => (<div key={i} className="flex gap-3 text-sm"><span className="text-gray-400 w-28 shrink-0">{p.role}</span><span className="text-gray-900">{p.name} {p.phone ? `(${p.phone})` : ""}</span></div>))}</div></div>}
      {isForm3 && (fd.riskFactors || fd.improvementMeasures) && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">?„í—˜?”ì†Œ ë°?ê°œì„ ?€ì±?/h3><div className="space-y-2">{fd.riskFactors && <Field label="?„í—˜?”ì†Œ" value={fd.riskFactors as string} />}{fd.improvementMeasures && <Field label="ê°œì„ ?€ì±? value={fd.improvementMeasures as string} />}</div></div>}
      {(isForm2 || isForm4) && fd.specialMeasures && doc.currentApprovalOrder !== 1 && doc.status !== "SUBMITTED" && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-2">?¹ë³„ì¡°ì¹˜ ?„ìš”?¬í•­</h3><p className="text-sm text-gray-800">{fd.specialMeasures as string}</p></div>}
      {(fd.reviewOpinion || fd.reviewResult) && <div className="bg-white rounded-2xl p-4 shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">ê²€? ì˜ê²?/h3><div className="space-y-2">{fd.reviewOpinion && <div><p className="text-xs text-gray-500 mb-1">ê²€? ì˜ê²?/p><p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2">{fd.reviewOpinion as string}</p></div>}{fd.reviewResult && <div><p className="text-xs text-gray-500 mb-1">ì¡°ì¹˜ê²°ê³¼</p><p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2">{fd.reviewResult as string}</p></div>}</div></div>}
      {(fd.signatureData || approvalLines.some(l => l.signatureData && l.stepStatus === "APPROVED")) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">?œëª…</h3>
          <div className="space-y-2">
            {typeof fd.signatureData === "string" && fd.signatureData && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex border-b border-gray-100 bg-gray-50"><span className="text-xs font-medium text-gray-600 px-3 py-2 w-24 border-r border-gray-200">? ì²­??/span><span className="text-xs text-gray-500 px-3 py-2">{fd.applicantName as string || ""}</span></div>
                <div className="flex items-center"><span className="text-xs text-gray-400 px-3 py-2 w-24 border-r border-gray-200 shrink-0">(?œëª…)</span><div className="px-3 py-2"><img src={fd.signatureData as string} alt="? ì²­???œëª…" className="h-12 object-contain" /></div></div>
              </div>
            )}
            {approvalLines.filter(l => l.stepStatus === "APPROVED" && l.signatureData).map(line => {
              const roleLabel = doc.documentType === "CONFINED_SPACE"
                ? (line.approvalOrder === 2 ? "(ê³„íš?•ì¸)?ˆê??? : line.approvalOrder === 4 ? "(?´í–‰?•ì¸)?•ì¸?? : ROLE_LABELS["CONFINED_SPACE"]?.[line.approvalOrder] ?? `${line.approvalOrder}?¨ê³„`)
                : line.approvalRole === "FINAL_APPROVER" ? (FINAL_ROLE_LABELS[doc.documentType] ?? "ìµœì¢… ?ˆê???) : (ROLE_LABELS[doc.documentType]?.[line.approvalOrder] ?? `${line.approvalOrder}?¨ê³„`);
              return (
                <div key={line.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex border-b border-gray-100 bg-gray-50"><span className="text-xs font-medium text-gray-600 px-3 py-2 w-24 border-r border-gray-200">{roleLabel}</span><span className="text-xs text-gray-500 px-3 py-2">{line.approverName}</span></div>
                  <div className="flex items-center"><span className="text-xs text-gray-400 px-3 py-2 w-24 border-r border-gray-200 shrink-0">(?œëª…)</span><div className="px-3 py-2"><img src={line.signatureData!} alt={`${roleLabel} ?œëª…`} className="h-12 object-contain" /></div></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const DEFAULT_GAS_ROWS = [
  { time: "??, hour: "", minute: "", o2: "", co2: "", h2s: "", co: "", ex: "", measurer: "", entryCount: "", exitCount: "" },
  { time: "ì¤?, hour: "", minute: "", o2: "", co2: "", h2s: "", co: "", ex: "", measurer: "", entryCount: "", exitCount: "" },
  { time: "ì¤?, hour: "", minute: "", o2: "", co2: "", h2s: "", co: "", ex: "", measurer: "", entryCount: "", exitCount: "" },
];

function GasRowInput({ rowIndex, initialRow, onRowChange, onSave, phase }: { rowIndex: number; initialRow: any; onRowChange: (idx: number, field: string, value: string) => void; onSave?: () => Promise<boolean | void>; phase?: string }) {
    const [saved, setSaved] = useState(() => {
      // phaseê°€ ?´ë? ?€?¥ëœ ê°’ì¸ì§€ ?•ì¸ (o2, co, h2s ì¤??˜ë‚˜?¼ë„ ?ˆìœ¼ë©??€?¥ëœ ê²?
      return !!(initialRow.o2 || initialRow.co || initialRow.h2s || initialRow.co2 || initialRow.ex);
    });
    useEffect(() => {
      if (initialRow.o2 || initialRow.co || initialRow.h2s || initialRow.co2 || initialRow.ex) {
        setSaved(true);
        setValues({
          hour: initialRow.hour || "", minute: initialRow.minute || "",
          o2: initialRow.o2 || "", co2: initialRow.co2 || "",
          h2s: initialRow.h2s || "", co: initialRow.co || "",
          ex: initialRow.ex || "", measurer: initialRow.measurer || "",
          entryCount: initialRow.entryCount || "", exitCount: initialRow.exitCount || "",
        });

      }
    }, [initialRow.o2, initialRow.co, initialRow.h2s]);
    const [values, setValues] = useState<Record<string,string>>({
      hour: initialRow.hour || "", minute: initialRow.minute || "",
      o2: initialRow.o2 || "", co2: initialRow.co2 || "",
      h2s: initialRow.h2s || "", co: initialRow.co || "",
      ex: initialRow.ex || "", measurer: initialRow.measurer || "",
      entryCount: initialRow.entryCount || "", exitCount: initialRow.exitCount || "",
    });
    const valRef = useRef<Record<string,string>>(values);
    useEffect(() => {
      const newValues = {
        hour: initialRow.hour || "", minute: initialRow.minute || "",
        o2: initialRow.o2 || "", co2: initialRow.co2 || "",
        h2s: initialRow.h2s || "", co: initialRow.co || "",
        ex: initialRow.ex || "", measurer: initialRow.measurer || "",
        entryCount: initialRow.entryCount || "", exitCount: initialRow.exitCount || "",
      };
      setValues(newValues);
      valRef.current = newValues;
    }, [initialRow.o2, initialRow.co2, initialRow.h2s, initialRow.co, initialRow.ex, initialRow.measurer]);

    const GAS_LIMITS = [
      {f:"o2",  label:"?°ì†Œ O??,               unit:"%",   ph:"18~23.5", min:18, max:23.5},
      {f:"co2", label:"?´ì‚°?”íƒ„??CO??, unit:"%",   ph:"1.5ë¯¸ë§Œ", max:1.5},
      {f:"h2s", label:"?©í™”?˜ì†Œ H?‚S",       unit:"ppm", ph:"10ë¯¸ë§Œ",  max:10},
      {f:"co",  label:"?¼ì‚°?”íƒ„??CO",       unit:"ppm", ph:"30ë¯¸ë§Œ",  max:30},
      {f:"ex",  label:"??°œ?˜í•œ EX",             unit:"%",   ph:"10ë¯¸ë§Œ",  max:10},
    ] as const;

    const getStatus = (f: string, val: string) => {
      const num = parseFloat(val);
      if (!val || isNaN(num)) return "empty";
      const limit = GAS_LIMITS.find(g => g.f === f);
      if (!limit) return "ok";
      if ("min" in limit && num < limit.min) return "danger";
      if ("max" in limit && num > limit.max) return "danger";
      return "ok";
    };

    const handleChange = (f: string, v: string) => {
      valRef.current = { ...valRef.current, [f]: v };
      setValues({ ...valRef.current });
      onRowChange(rowIndex, f, v);
    };

    const numStep = (f: string, delta: number) => {
      const cur = parseInt(valRef.current[f] || "0", 10) || 0;
      const next = Math.max(0, cur + delta);
      handleChange(f, String(next));
    };

    if (saved) {
      return (
        <div className="bg-green-50 rounded-xl p-3 border border-green-200 flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs font-bold text-blue-600">{phase}</span>
            <span className="text-xs text-gray-600">ì¸¡ì •?? {values.measurer}</span>
            {values.o2 && <span className="text-xs text-gray-700">O??{values.o2}%</span>}
            {values.co && <span className="text-xs text-gray-700">CO:{values.co}ppm</span>}
            {values.h2s && <span className="text-xs text-gray-700">H?‚S:{values.h2s}ppm</span>}
            <span className="text-[10px] font-semibold text-green-700">???€?¥ì™„ë£?/span>
          </div>
          <button onClick={() => setSaved(false)} className="text-xs text-blue-500 px-2 py-1 rounded border border-blue-200 shrink-0">?˜ì •?˜ê¸°</button>
        </div>
      );
    }
    return (
      <div className="bg-gray-50 rounded-xl p-3 space-y-3 border border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-700 w-6 shrink-0">{initialRow.time}</span>
          <div className="flex gap-4">
            {(["hour","minute"] as const).map(f => (
              <div key={f} className="flex flex-col items-center gap-0.5">
                <button type="button" onMouseDown={e=>{e.preventDefault(); numStep(f,1);}} className="w-8 h-7 flex items-center justify-center rounded-t-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-500 text-xs select-none">??/button>
                <input type="number" min="0" value={values[f]} onChange={e => handleChange(f, e.target.value)} className="w-12 h-8 text-center text-sm text-gray-900 border-x border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <button type="button" onMouseDown={e=>{e.preventDefault(); numStep(f,-1);}} className="w-8 h-7 flex items-center justify-center rounded-b-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-500 text-xs select-none">??/button>
                <span className="text-xs text-gray-500">{f==="hour"?"??:"ë¶?}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">ì¸¡ì • ?ë„</p>
          <div className="grid grid-cols-2 gap-2">
            {GAS_LIMITS.map(({f,label,unit,ph}) => {
              const status = getStatus(f, values[f]);
              const isDanger = status === "danger";
              return (
                <div key={f} className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-gray-500">{label} ({unit})</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={values[f]}
                      placeholder={ph}
                      onChange={e => handleChange(f, e.target.value)}
                      className={`w-full px-2 py-1.5 text-sm text-gray-900 border rounded-lg focus:outline-none focus:ring-1 bg-white placeholder:text-gray-300 ${
                        isDanger
                          ? "border-red-400 focus:ring-red-400 bg-red-50"
                          : status === "ok"
                          ? "border-green-400 focus:ring-green-400 bg-green-50"
                          : "border-gray-200 focus:ring-blue-400"
                      }`}
                    />
                    {isDanger && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 text-[10px] font-bold">??/span>
                    )}
                    {status === "ok" && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500 text-[10px]">??/span>
                    )}
                  </div>
                  {isDanger && (
                    <p className="text-[9px] text-red-500 font-medium">??ê¸°ì?ì´ˆê³¼! ?‘ì—…ì¤‘ì? ?„ìš”</p>
                  )}
                  {status === "ok" && (
                    <p className="text-[9px] text-green-600">???•ìƒë²”ìœ„</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            {f:"measurer",   label:"ì¸¡ì •??,  type:"text"},
            {f:"entryCount", label:"?…ì¥(ëª?", type:"number"},
            {f:"exitCount",  label:"?´ì¥(ëª?", type:"number"},
          ] as const).map(({f,label,type}) => (
            <div key={f}>
              <label className="text-xs text-gray-500 mb-1 block">{label}</label>
              <input type={type} min={type==="number"?"0":undefined} value={values[f]} onChange={e => handleChange(f, e.target.value)} className="w-full px-2 py-2 text-xs text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
            </div>
          ))}
        </div>
      {onSave && phase && (
        <button onClick={async () => { onSave?.(); setSaved(true); }}
          className="w-full py-2 mt-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700">
          [{phase}] ?„ì‹œ?€??ë°??¤ì‹œê°„ë³´ê³?
        </button>
      )}
      </div>
    );
  }
  function GasMeasureInput({ rows, onChange, documentId, onSaved }: { rows: any[]; onChange: (rows: any[]) => void; documentId?: string; onSaved?: (phase: string, row: any) => void }) {
    const rowsRef = useRef<any[]>(rows.map(r => ({...r})));
    const savedRowsRef = useRef<Record<string, any>>({});
    const PHASES = ["\uc791\uc5c5 \uc804", "\uc791\uc5c5 \uc911(1\ucc28)", "\uc791\uc5c5 \uc911(2\ucc28)"];
    const handleFieldChange = useCallback((idx: number, field: string, value: string) => {
      rowsRef.current = rowsRef.current.map((r, i) => i === idx ? { ...r, [field]: value } : r);
      onChange([...rowsRef.current]);
    }, [onChange]);
    const handleSave = async (idx: number) => {
      const phase = PHASES[idx];
      const row = rowsRef.current[idx];
      if (!row || !documentId) return;
      // ê¸°ì¡´ ?€?¥ëœ ê°?ê°€?¸ì˜¤ê¸?
      const existingRes = await fetch(`/api/documents/${documentId}`);
      const existingData = await existingRes.json();
      const existing = Array.isArray(existingData.document?.formDataJson?.gasMeasureRows)
        ? existingData.document.formDataJson.gasMeasureRows : [];
      const tagged = { ...row, phase };
      const merged = [...existing.filter((r: any) => r.phase !== phase), tagged];
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formDataJson: { ...existingData.document?.formDataJson, gasMeasureRows: merged }, gasMeasureRowsOnly: true }),
      });
      if (res.ok) {
        savedRowsRef.current[phase] = tagged;
        alert(`[${phase}] ?€???„ë£Œ!`); window.location.reload();
        if (onSaved) onSaved(phase, tagged);
        return true;
      } else {
        alert("?€???¤íŒ¨.");
      }
    };
    return (
      <div className="space-y-3">
        <p className="text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <span className="font-medium text-blue-700">ê¸°ì?ê°?</span>
          <span className="text-blue-600"> O??18~23.5%) CO??1.5%?´í•˜) H?‚S(10ppm?´í•˜) CO(30ppm?´í•˜) EX(10%?´í•˜)</span>
        </p>
        {rowsRef.current.map((row, idx) => (
          <GasRowInput key={`${idx}-${row.o2}-${row.measurer}`} rowIndex={idx} initialRow={row} onRowChange={handleFieldChange}
            phase={PHASES[idx]}
            onSave={documentId ? () => handleSave(idx) : undefined} />
        ))}
      </div>
    );
  }
function AiSpecialMeasuresButton({ doc, onGenerated, label = "AI ?¹ë³„ì¡°ì¹˜ ì´ˆì•ˆ ?ì„±" }: {
  doc: DocumentDetail;
  onGenerated: (v: string) => void;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleGenerate = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/ai/special-measures", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // ê²€? ì˜ê²¬ìš©?€ ??ƒ specialMeasures ?ìŠ¤??ë°˜í™˜?˜ë„ë¡??€??ê³ ì •
        body: JSON.stringify({ documentType: "REVIEW_OPINION", formData: doc.formDataJson, originalType: doc.documentType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI ?ì„± ?¤ë¥˜");
      const result = data.specialMeasures || data.riskFactors || data.text || "";
      if (!result) throw new Error("AI ?‘ë‹µ??ë¹„ì–´?ˆìŠµ?ˆë‹¤.");
      onGenerated(result);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤."); }
    finally { setLoading(false); }
  };
  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
        style={{ background: loading ? "#6b7280" : "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
        {loading ? "AI ì´ˆì•ˆ ?ì„± ì¤?.." : `??${label}`}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function SpecialMeasuresInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (ref.current) ref.current.value = value; }, []);
  return (
    <textarea ref={ref} defaultValue={value}
      onChange={e => onChange(e.target.value)}
      onBlur={e => onChange(e.target.value)}
      placeholder="?¹ë³„ì¡°ì¹˜ ?„ìš”?¬í•­???…ë ¥?´ì£¼?¸ìš”" rows={4}
      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
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
  const [activeTab, setActiveTab] = useState("?´ìš©");
  const [reviewOpinion, setReviewOpinion] = useState("");
  const [reviewResult, setReviewResult] = useState("");
  const reviewOpinionRef = useRef<HTMLTextAreaElement>(null);
  const reviewResultRef = useRef<HTMLTextAreaElement>(null);
  const [dataKey, setDataKey] = useState(0);
  const [step1ApproverName, setStep1ApproverName] = useState("");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showSign, setShowSign] = useState(false);
  const [showFinalApprover, setShowFinalApprover] = useState(false);
  const [showConfinedNextModal, setShowConfinedNextModal] = useState(false);
  const [showPowerNextModal, setShowPowerNextModal] = useState(false);
  const [powerNextAction, setPowerNextAction] = useState("");
  const [confinedNextAction, setConfinedNextAction] = useState<"PLAN_APPROVER"|"FINAL_CONFIRMER"|null>(null);
  const [specialMeasuresInput, setSpecialMeasuresInput] = useState("");
  const inspectionItemsRef = useRef<any[]>([]);
  const [gasMeasureRowsInput, setGasMeasureRowsInput] = useState<any[]>([]);
  const [gasRowsLoaded, setGasRowsLoaded] = useState(false);
  const gasMeasureRef = useRef<any[]>([]);
  // gasMeasureRows: doc ë¡œë“œ ??ì´ˆê¸°??
  useEffect(() => {
    if (!doc) return;
    const rows = (doc.formDataJson as any)?.gasMeasureRows;
    const mn = (doc.formDataJson as any)?.measurerName || "";
    if (Array.isArray(rows) && rows.length > 0) {
      setGasMeasureRowsInput(rows.map((r: any) => ({ ...r, measurer: r.measurer || mn })));
      setGasRowsLoaded(true);
    } else if (mn) {
      setGasMeasureRowsInput([]);
      setGasRowsLoaded(true);
    }
  }, [doc?.id]);
  const [pendingAction, setPendingAction] = useState<"APPROVE"|"REJECT"|null>(null);
  const [pendingOpinion, setPendingOpinion] = useState("");
  const [pendingResult, setPendingResult] = useState("");
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
      if (!docRes.ok) throw new Error(docData.error || "?°ì´???¤ë¥˜");
      const docObj = docData.document;
      setDoc(docObj);
      const lines = linesData.approvalLines ?? [];
      setApprovalLines(lines);
      const line1 = lines.find((l: ApprovalLine) => l.approvalOrder === 1);
      if (line1?.approverName) setStep1ApproverName(line1.approverName);
      const fd = docObj.formDataJson ?? {};
      const line1Data = lines.find((l: ApprovalLine) => l.approvalOrder === 1);
      const initialOpinion = (line1Data?.comment || fd.reviewOpinion || "") as string;
      const initialResult = (fd.reviewResult || "") as string;
      setReviewOpinion(initialOpinion);
      setReviewResult(initialResult);
      setDataKey(prev => prev + 1);
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
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤."); }
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
    if (!confirm("ê²°ì¬ë¥?ì·¨ì†Œ?˜ê³  ?‘ì„±ì¤??íƒœë¡??˜ëŒë¦¬ì‹œê² ìŠµ?ˆê¹Œ?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "?¤ë¥˜ ë°œìƒ");
      alert("ê²°ì¬ê°€ ì·¨ì†Œ?©ë‹ˆ?? ë¬¸ì„œ??—???¤ì‹œ ?‘ì„±?????ˆìŠµ?ˆë‹¤.");
      router.back();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "ì·¨ì†Œ???¤íŒ¨?ˆìŠµ?ˆë‹¤."); }
    finally { setCancelling(false); }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) return { x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width), y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height) };
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => { const canvas = canvasRef.current; if (!canvas) return; e.preventDefault(); isDrawing.current = true; const ctx = canvas.getContext("2d"); if (!ctx) return; const pos = getPos(e, canvas); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
  const draw = (e: React.MouseEvent | React.TouchEvent) => { if (!isDrawing.current) return; const canvas = canvasRef.current; if (!canvas) return; e.preventDefault(); const ctx = canvas.getContext("2d"); if (!ctx) return; const pos = getPos(e, canvas); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
  const endDraw = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); isDrawing.current = false; };
  const clearCanvas = () => { const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); };
  const initCanvas = () => { setTimeout(() => { const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = "#1e3a5f"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; }, 100); };

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    const opinionVal = (reviewOpinionRef.current?.value ?? reviewOpinion).trim();
    const resultVal = (reviewResultRef.current?.value ?? reviewResult).trim();
    if (action === "REJECT" && !opinionVal) { alert("ë°˜ë ¤ ?¬ìœ ë¥?ê²€? ì˜ê²¬ë????…ë ¥?´ì£¼?¸ìš”."); return; }
    setPendingOpinion(opinionVal); setPendingResult(resultVal);
    setReviewOpinion(opinionVal); setReviewResult(resultVal);
    setPendingAction(action); setShowRejectConfirm(false); setShowApproveConfirm(false);
    setShowSign(true); initCanvas();
  };

  const handleSubmitWithSign = async () => {
    if (!pendingAction) return;
    setProcessing(true);
    try {
      const canvas = canvasRef.current;
      const signatureData = canvas ? canvas.toDataURL("image/png") : null;
      const extraBody: Record<string, unknown> = {};
      const isConfinedSpace = doc?.documentType === "CONFINED_SPACE";
      const confinedOrder = doc?.currentApprovalOrder ?? 0;
      if (isConfinedSpace && confinedOrder === 2 && specialMeasuresInput) extraBody.specialMeasures = specialMeasuresInput;
      if (isConfinedSpace && confinedOrder === 3) extraBody.gasMeasureRows = gasMeasureRef.current.length > 0 ? gasMeasureRef.current : (gasMeasureRowsInput.length > 0 ? gasMeasureRowsInput.map((r: any) => ({ ...r, measurer: r.measurer || (fd.measurerName as string) || "" })) : DEFAULT_GAS_ROWS);
      const res = await fetch(`/api/documents/${documentId}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pendingAction, comment: pendingOpinion || null, reviewResult: pendingResult || null, signatureData, inspectionItems: inspectionItemsRef.current.length > 0 ? inspectionItemsRef.current : undefined, ...extraBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "?¤ë¥˜ ë°œìƒ");
      setShowSign(false);
      if (data.action === "NEED_FINAL_APPROVER") { setShowFinalApprover(true); }
      else if (data.action === "NEED_PLAN_APPROVER") { setConfinedNextAction("PLAN_APPROVER"); setShowConfinedNextModal(true); }
      else if (data.action === "NEED_MEASUREMENT") { alert("(ê³„íš?•ì¸) ?œëª…???„ë£Œ?©ë‹ˆ??"); router.push("/approvals"); }
      else if (data.action === "NEED_FINAL_CONFIRMER") { setConfinedNextAction("FINAL_CONFIRMER"); setShowConfinedNextModal(true); }
      else if (data.action === "NEED_FINAL_CONFIRMER_POWER") { setShowPowerNextModal(true); }
      else if (data.action === "NEED_INSPECTION_WRITER") { alert("?ê??•ì¸?‘ì„±?ë? ì§€?•í•´ì£¼ì„¸??"); router.push("/approvals"); }
      else if (data.action === "APPROVED") { alert("ìµœì¢… ?¹ì¸???„ë£Œ?©ë‹ˆ??"); router.push("/approvals"); }
      else { alert("ì²˜ë¦¬?©ë‹ˆ??"); router.push("/approvals"); }
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤."); }
    finally { setProcessing(false); }
  };

  if (loading) return <div className="p-4 space-y-4">{[1,2,3].map(i => (<div key={i} className="bg-white rounded-2xl p-4 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/3 mb-3"/><div className="h-10 bg-gray-100 rounded w-full"/></div>))}</div>;
  if (error || !doc) return <div className="p-4 text-center py-12 text-red-500 text-sm">{error || "ë¬¸ì„œë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤."}<button onClick={fetchData} className="block mx-auto mt-3 text-blue-500 underline text-xs">?¤ì‹œ ?œë„</button></div>;

  const fd = (doc.formDataJson ?? {}) as Record<string, unknown>;
  const statusKey = getStatusKey(doc);
  const typeShort = DOCUMENT_TYPE_SHORT[doc.documentType] ?? doc.documentType;
  const typeLabel = DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType;
  const statusStyle = STATUS_STYLE[statusKey] ?? STATUS_STYLE.SUBMITTED;
  const isOwner = myUserId && doc.createdBy && String(doc.createdBy).toLowerCase() === String(myUserId).toLowerCase();
  const isStaff = ["REVIEWER", "FINAL_APPROVER", "ADMIN"].includes(myRole);
  const canCancel = doc.status !== "DRAFT" && (isOwner || isStaff);
  const isApproved = doc.status === "APPROVED";
  const isConfinedSpace = doc.documentType === "CONFINED_SPACE";
  const confinedOrder = doc.currentApprovalOrder ?? 0;
  const step1ApproverNameVal = step1ApproverName;
  const reviewGuideText = doc.currentApprovalOrder === 2 ? `?’¡ ${step1ApproverNameVal || "1?¨ê³„ ê²€? ì"}(ê²€? ì)ê°€ ?‘ì„±???´ìš©???•ì¸?˜ì—¬ ìµœì¢… ê²°ì¬?´ì£¼?¸ìš”.` : null;

  const ReviewInputSection = () => {
    // ë°€?ê³µê°??¨ê³„ë³?UI
    const isConfinedSpace = doc?.documentType === "CONFINED_SPACE";
    const confinedOrder = doc?.currentApprovalOrder ?? 0;
    if (isConfinedSpace) {
      const stepDesc = CONFINED_STEP_DESC[confinedOrder] ?? "";
      return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
          <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse inline-block"/>
            {stepDesc}
          </h3>
          {confinedOrder === 1 && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">ê°ì‹œ?¸ìœ¼ë¡œì„œ ?‘ì—… ê³„íš???•ì¸?˜ê³  ?œëª…?´ì£¼?¸ìš”.</p>
          )}
          {confinedOrder === 2 && (
            <div className="space-y-2">
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">?¹ë³„ì¡°ì¹˜ ?„ìš”?¬í•­???…ë ¥ ???œëª…?´ì£¼?¸ìš”.</p>
              <AiSpecialMeasuresButton doc={doc} onGenerated={setSpecialMeasuresInput} />
              <SpecialMeasuresInput value={specialMeasuresInput} onChange={setSpecialMeasuresInput} />
            </div>
          )}
          {confinedOrder === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">?°ì†Œ ë°?? í•´ê°€???ë„ ì¸¡ì •ê²°ê³¼ë¥??…ë ¥?´ì£¼?¸ìš”.</p>
              {gasRowsLoaded && <GasMeasureInput key={gasMeasureRowsInput.map((r:any)=>r.phase).join(",")}
                rows={(() => {
                  const mn = (fd.measurerName as string) || "";
                  if (gasMeasureRowsInput.length > 0) {
                    return gasMeasureRowsInput.map((r: any) => ({ ...r, measurer: r.measurer || mn }));
                  }
                  return DEFAULT_GAS_ROWS.map((r: any) => ({ ...r, measurer: mn }));
                })()}
                onChange={(rows) => { gasMeasureRef.current = rows; }}
              documentId={documentId}
                onSaved={(phase, savedRow) => {
                  setGasMeasureRowsInput(prev => {
                    const existing = prev.filter((r: any) => r.phase !== phase);
                    return [...existing, { ...savedRow, phase }];
                  });
                }}
              />}
            </div>
          )}
          {confinedOrder === 4 && (
            <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">ì¸¡ì •ê²°ê³¼ë¥?ìµœì¢… ?•ì¸?˜ê³  ?œëª…?´ì£¼?¸ìš”.</p>
          )}
        </div>
      );
    }

    const isPowerOutage = doc?.documentType === "POWER_OUTAGE";
    const powerOrder = doc?.currentApprovalOrder ?? 0;
    if (isPowerOutage) {
      return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
          <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse inline-block"/>
            {powerOrder === 1 ? "ê³„íš?•ì¸?ˆê???- ?¹ë³„ì¡°ì¹˜ ?…ë ¥" : powerOrder === 2 ? "?ê??•ì¸ê²°ê³¼ ?‘ì„±??- ?ê?ê²°ê³¼ ?…ë ¥" : "?´í–‰?•ì¸?•ì¸??- ìµœì¢… ?œëª…"}
          </h3>
          {powerOrder === 1 && (
            <div className="space-y-2">
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">?¹ë³„ì¡°ì¹˜ ?„ìš”?¬í•­???…ë ¥?˜ê³  ?œëª…?˜ì„¸??</p>
              <AiSpecialMeasuresButton doc={doc} onGenerated={setSpecialMeasuresInput} />
              <SpecialMeasuresInput value={specialMeasuresInput} onChange={setSpecialMeasuresInput} />
            </div>
          )}
          {powerOrder === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">?ê?ê¸°ê¸°, ì°¨ë‹¨?•ì¸?? ?„ê¸°?´ë‹¹?? ?„ì¥?•ë¹„ë¥??…ë ¥?˜ê³  ?œëª…?˜ì„¸??</p>
              <div className="grid grid-cols-4 gap-1 px-2 py-1.5 bg-gray-100 rounded-lg mb-2">
                {["?ê?ê¸°ê¸°", "ì°¨ë‹¨?•ì¸??, "?„ê¸°?´ë‹¹??, "?„ì¥?•ë¹„"].map(h => <div key={h} className="text-xs font-medium text-gray-600 text-center">{h}</div>)}
              </div>
              {((fd.inspectionItems as any[]) || [{ equipment:"", cutoffConfirmer:"", electrician:"", siteRepair:"" }]).map((item: any, idx: number) => (
                <div key={idx} className="grid grid-cols-4 gap-1">
                  {(["equipment","cutoffConfirmer","electrician","siteRepair"] as const).map(f => (
                    <input key={f} type="text" defaultValue={item[f]||""}
                      onChange={e => { const cur = inspectionItemsRef.current.length ? inspectionItemsRef.current : ((fd.inspectionItems as any[])||[{}]); inspectionItemsRef.current = cur.map((r:any,i:number)=>i===idx?{...r,[f]:e.target.value}:r); }}
                      className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  ))}
                </div>
              ))}
            </div>
          )}
          {powerOrder === 3 && <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">?•ì „?‘ì—…???„ë£Œ?˜ì—ˆ?Œì„ ?•ì¸?˜ê³  ?œëª…?˜ì„¸??</p>}
        </div>
      );
    }

    // ê²€? ì˜ê²??…ë ¥ ?¹ì…˜
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse inline-block"/>
          {doc.currentApprovalOrder === 1 ? (doc.documentType === "SAFETY_WORK_PERMIT" ? "(ê³„íš?•ì¸) ê²€? ì˜ê²??…ë ¥" : "ê²€???˜ê²¬ ?…ë ¥") : (doc.documentType === "SAFETY_WORK_PERMIT" ? "(?´í–‰?•ì¸) ê²€? ì˜ê²??•ì¸" : "ê²€? ì˜ê²??•ì¸ ë°??¤ì •")}
        </h3>
        {reviewGuideText && <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-3">{reviewGuideText}</p>}
        <div className="space-y-3">
          <div>
            {doc.currentApprovalOrder === 1 && (
              <AiSpecialMeasuresButton doc={doc} onGenerated={(v) => {
                if (reviewOpinionRef.current) reviewOpinionRef.current.value = v;
                setReviewOpinion(v);
              }} label="AI ê²€? ì˜ê²?ì´ˆì•ˆ" />
            )}
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              ê²€? ì˜ê²?{doc.currentApprovalOrder === 1 && <span className="text-red-500 text-xs">(ë°˜ë ¤ ???„ìˆ˜)</span>}
            </label>
            <textarea
              key={`opinion-${dataKey}`}
              ref={reviewOpinionRef}
              defaultValue={reviewOpinion}
              placeholder="ê²€???˜ê²¬???…ë ¥?´ì£¼?¸ìš” (ë°˜ë ¤ ???„ìˆ˜)"
              rows={6}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y text-gray-900 min-h-[120px]" />
            <button onClick={async () => {
              const opinion = reviewOpinionRef.current?.value ?? "";
              const result = reviewResultRef.current?.value ?? "";
              try {
                await fetch(`/api/documents/${documentId}`, { method: "PATCH", headers: {"Content-Type":"application/json"},
                  body: JSON.stringify({ formDataJson: { ...doc.formDataJson, reviewOpinion: opinion, reviewResult: result } }) });
                setReviewOpinion(opinion);
                alert("?„ì‹œ?€?¥ë˜?ˆìŠµ?ˆë‹¤.");
              } catch { alert("?€?¥ì‹¤??); }
            }} className="mt-2 w-full py-2 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              ê²€? ì˜ê²??„ì‹œ?€??
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">ì¡°ì¹˜ê²°ê³¼</label>
            <textarea
              key={`result-${dataKey}`}
              ref={reviewResultRef}
              defaultValue={reviewResult || "?´ìƒ?†ìŒ"}
              placeholder="ì¡°ì¹˜ê²°ê³¼ë¥??…ë ¥?´ì£¼?¸ìš”"
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
      {cancelling ? "ì·¨ì†Œ ì¤?.." : "ê²°ì¬ ì·¨ì†Œ (?‘ì„±ì¤‘ìœ¼ë¡?"}
    </button>
  ) : null;

  return (
    <div className="pb-40">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <Link href="/approvals" className="flex items-center gap-1 text-gray-400 text-sm mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          ê²°ì¬ ëª©ë¡
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{typeShort}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
          {isMyTurn && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium animate-pulse">ì§€ê¸?ê²°ì¬ ì°¨ë ˆ?…ë‹ˆ??/span>}
        </div>
        <h2 className="text-base font-bold text-gray-900">{taskName}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{typeLabel}</p>
        {doc.submittedAt && <p className="text-xs text-gray-400 mt-0.5">?œì¶œ?? {new Date(doc.submittedAt).toLocaleDateString("ko-KR")}</p>}
      </div>

      {/* ??- ?´ìš© / ê²°ì¬?„í™© */}
      <div className="bg-white border-b border-gray-200 flex">
        {["?´ìš©", "ê²°ì¬?„í™©"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* ?´ìš© ?? ëª¨ë“  ?…ë ¥?´ìš© + ì²¨ë??Œì¼ + PDF (?¹ì¸?„ë£Œ?? */}
        {activeTab === "?´ìš©" && (
          <>
            <DocumentContent doc={doc} fd={fd} approvalLines={approvalLines} activeTab={activeTab} />
            <AttachmentViewer documentId={documentId} canAdd={false} />
            {isApproved && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  ?ˆì „?‘ì—…?ˆê???PDF
                </h3>
                <PdfButtons documentId={documentId} />
              </div>
            )}
            {isMyTurn && (activeTab as string) !== "ê²°ì¬?„í™©" && <ReviewInputSection />}
            <CancelButton />
          </>
        )}

        {/* ê²°ì¬?„í™© ??- ê²°ì¬?ë¦„ + ?¹ë³„ì¡°ì¹˜ + ?¬ì§„ */}
        {activeTab === "ê²°ì¬?„í™©" && (
          <>
            <ApprovalFlow doc={doc} approvalLines={approvalLines} writerName={(fd.applicantName as string) || writerName} applicantSignature={(fd.signatureData as string) || undefined} />
            {(doc.documentType === "CONFINED_SPACE" || doc.documentType === "POWER_OUTAGE") && fd.specialMeasures && doc.currentApprovalOrder !== 1 && doc.status !== "SUBMITTED" && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-2">?¹ë³„ì¡°ì¹˜ ?„ìš”?¬í•­</h3>
                <p className="text-sm text-gray-800">{fd.specialMeasures as string}</p>
              </div>
            )}
            <PhotoViewer documentId={documentId} />
            {isMyTurn && (activeTab as string) !== "ê²°ì¬?„í™©" && <ReviewInputSection />}
            <CancelButton />
          </>
        )}
      </div>

      {/* ?˜ë‹¨ ê³ ì • ë²„íŠ¼ - ê²°ì¬ ?¡ì…˜ */}
      {isMyTurn && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-3 pb-4">
          {/* ë°€?ê³µê°?3?¨ê³„: ?œëª… ?†ì´ ì¸¡ì •ê²°ê³¼ë§??œì¶œ */}
          {isConfinedSpace && confinedOrder === 3 ? (
            <button onClick={async () => {
              const gasRows = gasMeasureRef.current.length > 0 ? gasMeasureRef.current : (gasMeasureRowsInput.length > 0 ? gasMeasureRowsInput : DEFAULT_GAS_ROWS);
              setProcessing(true);
              try {
                const res = await fetch(`/api/documents/${documentId}/approve`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "APPROVE", signatureData: null, gasMeasureRows: gasRows }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "?¤ë¥˜ ë°œìƒ");
                if (data.action === "NEED_FINAL_CONFIRMER") {
                  setConfinedNextAction("FINAL_CONFIRMER");
                  setShowConfinedNextModal(true);
                } else {
                  alert("ê²°ì¬ê°€ ì·¨ì†Œ?©ë‹ˆ?? ë¬¸ì„œ??—???¤ì‹œ ?‘ì„±?????ˆìŠµ?ˆë‹¤.");
                  router.push("/approvals");
                }
              } catch (e: unknown) { alert(e instanceof Error ? e.message : "ì·¨ì†Œ???¤íŒ¨?ˆìŠµ?ˆë‹¤."); }
              finally { setProcessing(false); }
            }} disabled={processing}
              className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ background: "#16a34a" }}>
              {processing ? "ì·¨ì†Œ ì¤?.." : "?“Š ì¸¡ì •ê²°ê³¼ ?œì¶œ ë°??´í–‰?•ì¸??ì§€??}
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
                }} className="flex-1 py-3 rounded-xl border-2 border-red-200 text-sm font-medium text-red-600">ë°˜ë ¤</button>
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
                  ? confinedOrder === 1 ? "ê°ì‹œ???œëª…" : confinedOrder === 2 ? "(ê³„íš?•ì¸) ?œëª…" : "(?´í–‰?•ì¸) ìµœì¢… ?œëª…"
                  : doc.currentApprovalOrder === 1 ? (doc.documentType === "SAFETY_WORK_PERMIT" ? "(ê³„íš?•ì¸) ê²€? ì™„ë£? : "ê²€? ì™„ë£?) : "ìµœì¢… ?¹ì¸"}
              </button>
            </div>
          )}
        </div>
      )}

      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-2">ë°˜ë ¤?˜ì‹œê² ìŠµ?ˆê¹Œ?</h3>
            <p className="text-sm text-gray-500 mb-4">ë°˜ë ¤ ì²˜ë¦¬ ??? ì²­?¸ì—ê²??Œë¦¼???„ì†¡?©ë‹ˆ??</p>
            {!(reviewOpinionRef.current?.value ?? reviewOpinion).trim() && <p className="text-xs text-red-500 mb-3">ë°˜ë ¤ ?¬ìœ (ê²€? ì˜ê²?ë¥?ë¨¼ì? ?…ë ¥?´ì£¼?¸ìš”.</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowRejectConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">ì·¨ì†Œ</button>
              <button onClick={() => handleAction("REJECT")} disabled={!reviewOpinion.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40" style={{ background: "#dc2626" }}>ë°˜ë ¤</button>
            </div>
          </div>
        </div>
      )}

      {showApproveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              {isConfinedSpace
                ? confinedOrder === 1 ? "ê°ì‹œ???œëª… ??(ê³„íš?•ì¸)?ˆê??ë? ì§€?•í•©?ˆë‹¤"
                  : confinedOrder === 2 ? "(ê³„íš?•ì¸) ?ˆê????œëª…???„ë£Œ?©ë‹ˆ??
                  : "(?´í–‰?•ì¸) ìµœì¢… ?œëª…???„ë£Œ?©ë‹ˆ??
                : doc.currentApprovalOrder === 1 ? "?œëª… ?„ë£Œ ?? ?´í–‰?•ì¸?•ì¸?ë? ì§€?•í•©?ˆë‹¤" : "ìµœì¢… ?¹ì¸?˜ì‹œê² ìŠµ?ˆê¹Œ?"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {isConfinedSpace
                ? "?œëª… ???¤ìŒ ?¨ê³„ê°€ ì§„í–‰?©ë‹ˆ??"
                : doc.currentApprovalOrder === 1 ? "?¹ì¸?ë? ì§€?•í•´ì£¼ì„¸??" : "?¹ì¸?˜ì‹œê² ìŠµ?ˆê¹Œ?"}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowApproveConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">ì·¨ì†Œ</button>
              <button onClick={() => handleAction("APPROVE")} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: "#16a34a" }}>?•ì¸</button>
            </div>
          </div>
        </div>
      )}

      {showSign && (
        <div ref={signModalRef} className="fixed inset-0 bg-black/50 z-50 flex items-end" style={{ touchAction: "none" }} onTouchMove={e => e.preventDefault()}>
          <div className="bg-white w-full rounded-t-3xl" style={{ paddingBottom: "env(safe-area-inset-bottom, 20px)", maxHeight: "80vh", overflowY: "auto" }}>
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-base font-bold text-gray-900 mb-1">{pendingAction === "APPROVE" ? "?¹ì¸ ?œëª…" : "ë°˜ë ¤ ?œëª…"}</h2>
              <p className="text-xs text-gray-500">?œëª… ??ì²˜ë¦¬ê°€ ?„ë£Œ?©ë‹ˆ??</p>
            </div>
            <div className="px-6 py-3">
              <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-white relative">
                <div className="absolute top-2 left-3 text-xs text-gray-300 pointer-events-none">?„ë˜???œëª…?´ì£¼?¸ìš”</div>
                <canvas ref={canvasRef} width={600} height={180} className="w-full"
                  style={{ cursor: "crosshair", touchAction: "none", display: "block" }}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              </div>
            </div>
            <div className="px-6 pb-24 space-y-2">
              <div className="flex gap-2">
                <button onClick={clearCanvas} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium">?œëª… ì§€?°ê¸°</button>
                <button onClick={() => setShowSign(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium">ì·¨ì†Œ</button>
              </div>
              <button onClick={handleSubmitWithSign} disabled={processing}
                className="w-full py-3.5 rounded-xl text-white font-medium text-sm disabled:opacity-50"
                style={{ background: pendingAction === "APPROVE" ? "#16a34a" : "#dc2626" }}>
                {processing ? "ì²˜ë¦¬ ì¤?.." : pendingAction === "APPROVE" ? "???¹ì¸ ?„ë£Œ" : "ë°˜ë ¤ ?„ë£Œ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinalApprover && doc && (
        <FinalApproverModal
          documentId={documentId}
          documentType={doc.documentType}
          isFirstStep={doc.documentType !== "SAFETY_WORK_PERMIT" || !(doc.currentApprovalOrder && doc.currentApprovalOrder >= 1)}
          onClose={() => setShowFinalApprover(false)}
          onAssigned={() => {
            setShowFinalApprover(false);
            if (doc.documentType === "SAFETY_WORK_PERMIT") {
              const isFirst = !(doc.currentApprovalOrder && doc.currentApprovalOrder >= 1);
              alert(isFirst ? "(ê³„íš?•ì¸)?ˆê??ê? ì§€?•ë˜?ˆìŠµ?ˆë‹¤." : "(?´í–‰?•ì¸)?•ì¸?ê? ì§€?•ë˜?ˆìŠµ?ˆë‹¤.");
            } else {
              alert("ìµœì¢…?ˆê??ê? ì§€?•ë˜?ˆìŠµ?ˆë‹¤.");
            }
            router.push("/approvals");
          }}
        />
      )}

      {/* ë°€?ê³µê°??¤ìŒ?¨ê³„ ì§€??ëª¨ë‹¬ */}
      {showPowerNextModal && doc && (
        <ConfinedNextModal
          documentId={documentId}
          action="FINAL_CONFIRMER"
          {...{nextOrderOverride: 3} as any}
          onClose={() => setShowPowerNextModal(false)}
          onAssigned={() => { setShowPowerNextModal(false); router.refresh(); window.location.reload(); }}
        />
      )}
      {showConfinedNextModal && confinedNextAction && doc && (
        <ConfinedNextModal
          documentId={documentId}
          action={confinedNextAction}
          onClose={() => setShowConfinedNextModal(false)}
          onAssigned={() => {
            setShowConfinedNextModal(false);
            const msg = confinedNextAction === "PLAN_APPROVER"
              ? "(ê³„íš?•ì¸) ?ˆê??ê? ì§€?•ë©?ˆë‹¤."
              : "(?´í–‰?•ì¸) ?•ì¸?ê? ì§€?•ë©?ˆë‹¤.";
            alert(msg);
            router.push("/approvals");
          }}
        />
      )}
    </div>
  );
}

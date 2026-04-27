"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_SHORT, DocumentType } from "@/types";

interface DocumentDetail {
  id: string; taskId: string; documentType: DocumentType; status: string;
  formDataJson: Record<string, unknown>; submittedAt?: string;
  createdBy: string; currentApproverUserId?: string; currentApprovalOrder?: number;
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
  SUBMITTED:       { bg: "bg-blue-100",   text: "text-blue-600",   label: "?쒖텧?꾨즺" },
  IN_REVIEW:       { bg: "bg-amber-100",  text: "text-amber-600",  label: "寃?좎쨷" },
  IN_REVIEW_FINAL: { bg: "bg-orange-100", text: "text-orange-600", label: "理쒖쥌寃곗옱 吏꾪뻾以? },
  APPROVED:        { bg: "bg-green-100",  text: "text-green-600",  label: "?뱀씤?꾨즺" },
  REJECTED:        { bg: "bg-red-100",    text: "text-red-600",    label: "諛섎젮" },
  DRAFT:           { bg: "bg-gray-100",   text: "text-gray-600",   label: "?묒꽦以? },
};
const ROLE_LABELS: Record<string, Record<number, string>> = {
  SAFETY_WORK_PERMIT: { 1: "理쒖쥌 寃?좎옄", 2: "理쒖쥌 ?덇??? },
  CONFINED_SPACE:     { 1: "媛먯떆??, 2: "(怨꾪쉷?뺤씤)?덇???, 3: "痢≪젙?대떦??, 4: "(?댄뻾?뺤씤)?뺤씤?? },
  HOLIDAY_WORK:       { 1: "寃?좎옄",     2: "?뱀씤?? },
  POWER_OUTAGE:       { 1: "?덇???,     2: "?뺤씤?? },
};
// 諛?먭났媛??④퀎蹂??≪뀡 ?ㅻ챸
const CONFINED_STEP_DESC: Record<number, string> = {
  1: "媛먯떆???쒕챸",
  2: "?밸퀎議곗튂 ?낅젰 諛?(怨꾪쉷?뺤씤) ?덇????쒕챸",
  3: "痢≪젙寃곌낵 ?낅젰",
  4: "(?댄뻾?뺤씤) ?뺤씤??理쒖쥌 ?쒕챸",
};
const FINAL_ROLE_LABELS: Record<string, string> = {
  SAFETY_WORK_PERMIT: "理쒖쥌 ?덇???,
  CONFINED_SPACE:     "?뺤씤??,
  HOLIDAY_WORK:       "?뱀씤??,
  POWER_OUTAGE:       "?뺤씤??,
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

// ??5踰? 吏??二쇱냼 寃??湲??
function LocationMapPreview({ lat, lng, address }: { lat: number; lng: number; address?: string | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(address || "?묒뾽?μ냼")},${lat},${lng}`;

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || !window.kakao?.maps) return;
      window.kakao.maps.load(() => {
        if (!mapRef.current) return;
        const center = new window.kakao.maps.LatLng(lat, lng);
        const map = new window.kakao.maps.Map(mapRef.current, { center, level: 4, draggable: false, scrollwheel: false, disableDoubleClick: true });
        const marker = new window.kakao.maps.Marker({ position: center, map });
        // ??infowindow ?쒓굅 - 留덉빱 ??二쇱냼 ?띿뒪??遺덊븘??
      });
    };
    if (window.kakao?.maps) { initMap(); }
    else {
      const existing = document.getElementById("kakao-map-script");
      if (existing) {
        const check = setInterval(() => { if (window.kakao?.maps) { clearInterval(check); initMap(); } }, 200);
        return () => clearInterval(check);
      }
      const script = document.createElement("script");
      script.id = "kakao-map-script";
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`;
      script.onload = () => window.kakao.maps.load(initMap);
      document.head.appendChild(script);
    }
  }, [lat, lng, address]);

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
      {/* ??二쇱냼 諛뺤뒪 ?쒓굅 - ?묒뾽?μ냼 Field?먯꽌留??쒖떆 */}
      <div className="flex items-center justify-end px-3 py-1.5 bg-gray-50 border-b border-gray-100">
        <a href={mapUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-500 font-medium">吏?꾩뿴湲???/a>
      </div>
      <div ref={mapRef} style={{ width: "100%", height: "200px" }}>
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          <p className="text-xs text-gray-400">吏??濡쒕뵫 以?..</p>
        </div>
      </div>
    </div>
  );
}

// ??3踰? 寃곗옱?꾪솴 ??뿉?쒕뒗 ?ъ쭊 泥⑤?留?(PDF/臾몄꽌?뚯씪 ?쒖쇅), canAdd ?쒓굅
function PhotoViewer({ documentId }: { documentId: string }) {
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/documents/${documentId}/attachments`)
      .then(r => r.json())
      .then(data => {
        const all: Attachment[] = data.attachments ?? [];
        setPhotos(all.filter(a => a.attachmentType === "PHOTO"));
      })
      .catch(() => {});
  }, [documentId]);

  if (photos.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
        泥⑤? ?ъ쭊 <span className="text-xs text-gray-400 font-normal">({photos.length}??</span>
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {photos.map(photo => (
          <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer active:opacity-80"
            onClick={() => setPreviewUrl(photo.fileUrl)}>
            <img src={photo.fileUrl} alt={photo.fileName} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      {previewUrl && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center" onClick={() => setPreviewUrl(null)}>
          <button className="absolute top-4 right-4 text-white p-2 z-10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <img src={previewUrl} alt="誘몃━蹂닿린" className="max-w-full max-h-[85vh] object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

// ?댁슜??슜 ?꾩껜 泥⑤??뚯씪 酉곗뼱 (?ъ쭊+臾몄꽌)
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
    if (!file.type.startsWith("image/")) { alert("?대?吏 ?뚯씪留?媛?ν빀?덈떎."); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("attachmentType", "PHOTO"); fd.append("sortOrder", String(photos.length));
      const res = await fetch(`/api/documents/${documentId}/attachments`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotos(prev => [...prev, data.attachment]);
    } catch (e) { alert(`?낅줈???ㅽ뙣: ${e instanceof Error ? e.message : "?ㅻ쪟"}`); }
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
        泥⑤? ?뚯씪 {(photos.length + docFiles.length) > 0 && <span className="text-xs text-gray-400 font-normal">({photos.length + docFiles.length}媛?</span>}
      </h3>
      {photos.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">?벜 ?ъ쭊 {photos.length}??/p>
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
          <p className="text-xs text-gray-400 mb-2">?뱞 臾몄꽌 {docFiles.length}媛?/p>
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
            移대찓??
          </button>
          <button onClick={() => galleryRef.current?.click()} disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            媛ㅻ윭由?
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
          <img src={previewUrl} alt="誘몃━蹂닿린" className="max-w-full max-h-[85vh] object-contain" onClick={e => e.stopPropagation()} />
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
  const finalLabel = FINAL_ROLE_LABELS[doc.documentType] ?? "理쒖쥌 ?덇???;

  // 諛?먭났媛? 5?④퀎 怨좎젙 ?쒖떆 (寃곗옱?좎뿉 ?놁뼱???덉젙 ?④퀎 ?쒖떆)
  const fd = doc.formDataJson ?? {};
  let steps: Array<{ icon: React.ReactNode; label: string; name: string; comment?: string; actedAt?: string; signatureData?: string; status: string }>;

  if (isConfined) {
    const lineMap = Object.fromEntries(approvalLines.map(l => [l.approvalOrder, l]));
    const mkStep = (order: number, label: string, type: "submit"|"review"|"approve", name: string) => {
      const line = lineMap[order];
      const status = line ? getStepStatus(line) : (isSubmitted && order === 0 ? "done" : "pending");
      return { icon: <StepIcon type={type} status={status} />, label, name: line?.approverName ?? name, comment: line?.comment, actedAt: line?.actedAt, signatureData: line?.signatureData, status };
    };
    steps = [
      { icon: <StepIcon type="submit" status={isSubmitted ? "done" : "active"} />, label: "?좎껌??, name: writerName, signatureData: isSubmitted ? applicantSignature : undefined, status: isSubmitted ? "done" : "active" },
      mkStep(1, "媛먯떆??, "review", (fd.monitorName as string) || ""),
      mkStep(2, "(怨꾪쉷?뺤씤)?덇???, "approve", ""),
      mkStep(3, "痢≪젙?대떦??, "review", (fd.measurerName as string) || ""),
      mkStep(4, "(?댄뻾?뺤씤)?뺤씤??, "approve", ""),
    ];
  } else {
    const line1 = approvalLines.find(l => l.approvalOrder === 1);
    const line2 = approvalLines.find(l => l.approvalOrder === 2);
    steps = [
      { icon: <StepIcon type="submit" status={isSubmitted ? "done" : "active"} />, label: "?좎껌??, name: writerName, signatureData: isSubmitted ? applicantSignature : undefined, status: isSubmitted ? "done" : "active" },
      ...(line1 ? [{ icon: <StepIcon type="review" status={getStepStatus(line1)} />, label: roleLabels[1] ?? "寃?좎옄", name: line1.approverName ?? "", comment: line1.comment, actedAt: line1.actedAt, signatureData: line1.signatureData, status: getStepStatus(line1) }] : []),
      ...(line2 ? [{ icon: <StepIcon type="approve" status={getStepStatus(line2)} />, label: line2.approvalRole === "FINAL_APPROVER" ? finalLabel : (roleLabels[2] ?? "?덇???), name: line2.approverName ?? "", comment: line2.comment, actedAt: line2.actedAt, signatureData: line2.signatureData, status: getStepStatus(line2) }] : []),
    ];
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-4">寃곗옱 ?먮쫫</h3>
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
                  {step.status === "done" ? "?꾨즺" : step.status === "active" ? "吏꾪뻾以? : step.status === "rejected" ? "諛섎젮" : "?湲?}
                </span>
              </div>
              <span className="text-xs text-gray-600">{step.name}</span>
              {step.signatureData && (
                <div className="mt-1.5 border border-gray-200 rounded-lg overflow-hidden bg-white inline-block">
                  <img src={step.signatureData} alt="?쒕챸" className="h-10 object-contain px-2" />
                </div>
              )}
              {step.comment && <div className="mt-1 text-xs text-gray-500 bg-white/70 rounded-lg px-2 py-1">?뮠 {step.comment}</div>}
              {step.actedAt && <span className="text-[10px] text-gray-400 mt-0.5 block">{new Date(step.actedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// 諛?먭났媛??ㅼ쓬?④퀎 寃곗옱??吏??紐⑤떖
function ConfinedNextModal({ documentId, action, onClose, onAssigned }: {
  documentId: string;
  action: "PLAN_APPROVER" | "FINAL_CONFIRMER";
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const label = action === "PLAN_APPROVER" ? "(怨꾪쉷?뺤씤) ?덇??? : "(?댄뻾?뺤씤) ?뺤씤??;
  const nextOrder = action === "PLAN_APPROVER" ? 2 : 4;
  const nextTitle = action === "PLAN_APPROVER"
    ? "諛?먭났媛??묒뾽?덇? - (怨꾪쉷?뺤씤) ?덇????쒕챸 ?붿껌"
    : "諛?먭났媛??묒뾽?덇? - (?댄뻾?뺤씤) 理쒖쥌 ?뺤씤 ?붿껌";

  useEffect(() => {
    const q = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";
    fetch(`/api/users?krcOnly=true${q}`).then(r => r.json()).then(d => setUsers(d.users ?? []));
  }, [keyword]);

  const handleAssign = async () => {
    if (!selected) { setError("寃곗옱?먮? ?좏깮?댁＜?몄슂."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/approval-lines`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextApproverUserId: selected.id,
          nextOrder,
          nextRole: "FINAL_APPROVER",
          nextTitle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "?ㅻ쪟 諛쒖깮");
      onAssigned();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-24 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">{label} 吏??/h2>
          <button onClick={onClose} className="text-gray-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">{label}瑜?吏?뺥빐二쇱꽭??</div>
        <div className={`p-3 rounded-xl border-2 mb-4 ${selected ? "border-blue-400 bg-blue-50" : "border-dashed border-gray-300"}`}>
          {selected ? (
            <div className="flex items-center justify-between">
              <div><span className="text-sm font-medium text-gray-900">{selected.name}</span><span className="text-xs text-gray-500 ml-2">{selected.organization}</span></div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-red-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          ) : <p className="text-xs text-gray-400">?꾨옒 紐⑸줉?먯꽌 ?좏깮?댁＜?몄슂</p>}
        </div>
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="?대쫫?쇰줈 寃??
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
        <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
          {users.filter(u => u.id !== selected?.id).map(u => (
            <button key={u.id} onClick={() => setSelected(u)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-blue-400 hover:bg-blue-50 text-left">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">{u.name[0]}</div>
              <div><div className="text-sm font-medium text-gray-900">{u.name}</div><div className="text-xs text-gray-500">{u.organization}</div></div>
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button onClick={handleAssign} disabled={loading || !selected}
          className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50" style={{ background: "#2563eb" }}>
          {loading ? "吏??以?.." : `${label} 吏?뺥븯湲?}
        </button>
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
  const finalRoleLabel = FINAL_ROLE_LABELS[documentType] ?? "理쒖쥌 ?덇???;
  useEffect(() => {
    const q = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";
    fetch(`/api/users?krcOnly=true${q}`).then(r => r.json()).then(d => setUsers(d.users ?? []));
  }, [keyword]);
  const handleAssign = async () => {
    if (!selected) { setError("寃곗옱?먮? ?좏깮?댁＜?몄슂."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/approval-lines`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalApproverUserId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "?ㅻ쪟 諛쒖깮");
      onAssigned();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎."); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-24 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">{finalRoleLabel} 吏??/h2>
          <button onClick={onClose} className="text-gray-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 mb-4 text-xs text-amber-700">寃?좉? ?꾨즺?⑸땲?? 理쒖쥌 寃곗옱?먮? 吏?뺥빐二쇱꽭??</div>
        <div className={`p-3 rounded-xl border-2 mb-4 ${selected ? "border-green-400 bg-green-50" : "border-dashed border-gray-300"}`}>
          <div className="text-xs text-gray-500 mb-1">{finalRoleLabel} <span className="text-red-500">*</span></div>
          {selected ? (
            <div className="flex items-center justify-between">
              <div><span className="text-sm font-medium text-gray-900">{selected.name}</span><span className="text-xs text-gray-500 ml-2">{selected.organization}</span></div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-red-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          ) : <p className="text-xs text-gray-400">?꾨옒 紐⑸줉?먯꽌 ?좏깮?댁＜?몄슂</p>}
        </div>
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="?대쫫?쇰줈 寃??
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
        <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
          {users.filter(u => u.id !== selected?.id).map(u => (
            <button key={u.id} onClick={() => setSelected(u)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-green-400 hover:bg-green-50 text-left">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm shrink-0">{u.name[0]}</div>
              <div><div className="text-sm font-medium text-gray-900">{u.name}</div><div className="text-xs text-gray-500">{u.organization}{u.employeeNo ? ` 쨌 ${u.employeeNo}` : ""}</div></div>
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button onClick={handleAssign} disabled={loading || !selected}
          className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50" style={{ background: "#16a34a" }}>
          {loading ? "吏??以?.." : `${finalRoleLabel} 吏?뺥븯湲?}
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
      if (!res.ok) { const data = await res.json().catch(() => ({})); alert(`PDF ?앹꽦 ?ㅽ뙣: ${data.error || res.statusText}`); return; }
      const contentType = res.headers.get("Content-Type") || "";
      if (contentType.includes("application/pdf")) {
        const blob = await res.blob(); const url = URL.createObjectURL(blob);
        window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else {
        const data = await res.json();
        if (data.url) window.open(data.url, "_blank");
        else alert(`PDF ?앹꽦 ?ㅽ뙣: ${data.error || "?????녿뒗 ?ㅻ쪟"}`);
      }
    } catch (e) { console.error(e); alert("PDF 誘몃━蹂닿린 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎."); }
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
        {loading ? "?앹꽦 以?.." : "誘몃━蹂닿린"}
      </button>
      <button onClick={handleDownload} disabled={downloading}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-green-200 text-green-600 text-sm font-medium hover:bg-green-50 disabled:opacity-50 active:bg-green-100">
        {downloading ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
        {downloading ? "?ㅼ슫濡쒕뱶 以?.." : "PDF ?ㅼ슫濡쒕뱶"}
      </button>
    </div>
  );
}

// ??2踰? 遺숈엫1~4 ?낅젰?댁슜 ?꾩껜 ?쒖떆
function DocumentContent({ doc, fd, approvalLines }: { doc: DocumentDetail; fd: Record<string, unknown>; approvalLines: ApprovalLine[] }) {
  const workPeriod = fd.workStartDate && fd.workEndDate
    ? `${fd.workStartDate} ~ ${fd.workEndDate}`
    : (fd.workDate as string) || "";
  const highPlaceItems: string[] = Array.isArray(fd.riskHighPlaceItems) ? fd.riskHighPlaceItems as string[] : [];
  const waterWorkItems: string[] = Array.isArray(fd.riskWaterWorkItems) ? fd.riskWaterWorkItems as string[] : [];
  // ??2踰? ?묒뾽?μ냼??workAddress(吏???좏깮 二쇱냼) ?곗꽑, ?놁쑝硫?吏곸젒?낅젰媛??ъ슜
  const workAddress = doc.workAddress as string | undefined;
  const workLocationRaw = (fd.workLocation ?? fd.facilityLocation) as string | undefined;
  // 醫뚰몴媛믪씠 ?꾨땶 ?ㅼ젣 二쇱냼 ?쒖떆 (workAddress媛 ?덉쑝硫??곗꽑)
  const workLocation = workAddress || workLocationRaw;

  const riskTypesSummary = [
    fd.riskHighPlace && `怨좎냼?묒뾽${highPlaceItems.length ? ": " + highPlaceItems.join(", ") : ""}${fd.riskHighPlaceDetail ? (highPlaceItems.length ? ", " : ": ") + fd.riskHighPlaceDetail : ""}`,
    fd.riskWaterWork && `?섏긽쨌?섏쨷?묒뾽${waterWorkItems.length ? ": " + waterWorkItems.join(", ") : ""}${fd.riskWaterWorkDetail ? (waterWorkItems.length ? ", " : ": ") + fd.riskWaterWorkDetail : ""}`,
    fd.riskConfinedSpace && `諛?먭났媛?{fd.riskConfinedSpaceDetail ? ": " + fd.riskConfinedSpaceDetail : ""}`,
    fd.riskPowerOutage && `?뺤쟾?묒뾽${fd.riskPowerOutageDetail ? ": " + fd.riskPowerOutageDetail : ""}`,
    fd.riskFireWork && `?붽린?묒뾽${fd.riskFireWorkDetail ? ": " + fd.riskFireWorkDetail : ""}`,
    fd.riskOther && `湲고?${fd.riskOtherDetail ? ": " + fd.riskOtherDetail : ""}`,
  ].filter(Boolean) as string[];

  const factorLabels: Record<string, string> = {
    factorNarrowAccess: "?묎렐?듬줈 ?묒냼", factorSlippery: "誘몃걚?ъ슫 吏諛?,
    factorSteepSlope: "湲됯꼍?щ㈃", factorWaterHazard: "?듭닔쨌?좎닔",
    factorRockfall: "?숈꽍쨌援대윭?⑥뼱吏?, factorNoRailing: "?덉쟾 ?쒓컙??,
    factorLadderNoGuard: "?щ떎由??덉쟾?좉툑?μ튂", factorSuffocation: "吏덉떇쨌?곗냼寃고븤쨌?좏빐媛??,
    factorElectricFire: "媛먯쟾쨌?꾧린?붿옱?붿씤", factorSparkFire: "遺덇퐙쨌遺덊떚???섑븳 ?붿옱",
    factorOther: `湲고?${fd.factorOtherDetail ? "(" + fd.factorOtherDetail + ")" : ""}`,
  };
  const checkedFactors = Object.entries(factorLabels).filter(([key]) => !!(fd as any)[key]).map(([, label]) => label);

  const isForm1 = doc.documentType === "SAFETY_WORK_PERMIT";
  const isForm2 = doc.documentType === "CONFINED_SPACE";
  const isForm3 = doc.documentType === "HOLIDAY_WORK";
  const isForm4 = doc.documentType === "POWER_OUTAGE";

  return (
    <div className="space-y-4">
      {/* 湲곕낯?뺣낫 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">湲곕낯?뺣낫</h3>
        <div className="space-y-2">
          <Field label="?좎껌?? value={(fd.requestDate as string) || (fd.reportDate as string)} />
          <Field label="?묒뾽湲곌컙" value={workPeriod} />
          <Field label="?묒뾽?쒓컙" value={fd.workStartTime && fd.workEndTime ? `${fd.workStartTime} ~ ${fd.workEndTime}` : null} />
          <Field label="?⑹뿭紐? value={(fd.projectName ?? fd.serviceName) as string} />
          <Field label="?낆껜紐? value={fd.applicantCompany as string} />
          <Field label="吏곸콉" value={fd.applicantTitle as string} />
          <Field label="?좎껌?? value={fd.applicantName as string} />
          {/* 遺숈엫3 ?꾩슜 */}
          {isForm3 && <Field label="?쒓났?ъ뾽泥? value={fd.contractorCompany as string} />}
          {isForm3 && (fd.contractPeriodStart || fd.contractPeriodEnd) && (
            <Field label="?⑹뿭湲곌컙" value={`${fd.contractPeriodStart || ""} ~ ${fd.contractPeriodEnd || ""}`} />
          )}
        </div>
      </div>

      {/* ?묒뾽?뺣낫 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">?묒뾽?뺣낫</h3>
        <div className="space-y-2">
          <Field label="?묒뾽?μ냼" value={workLocation} />
          {doc.workLatitude && doc.workLongitude && (
            <LocationMapPreview lat={doc.workLatitude} lng={doc.workLongitude} address={doc.workAddress || workLocation} />
          )}
          <Field label="?묒뾽?댁슜" value={(fd.workContent ?? fd.workContents) as string} />
          {!Array.isArray(fd.participants) && fd.participants && <Field label="?묒뾽李몄뿬?? value={fd.participants as string} />}
          <Field label="?낆옣??紐낅떒" value={fd.entryList as string} />
          {/* 遺숈엫3 ?꾩슜 */}
          {isForm3 && <Field label="?쒖꽕臾쇰챸" value={fd.facilityName as string} />}
          {isForm3 && <Field label="?쒖꽕 愿由ъ옄" value={fd.facilityManager as string} />}
          {isForm3 && <Field label="愿由ъ옄 吏곴툒" value={fd.facilityManagerGrade as string} />}
          {isForm3 && <Field label="?묒뾽?꾩튂" value={fd.workPosition as string} />}
          {/* 遺숈엫2 媛먯떆??痢≪젙?대떦??*/}
          {isForm2 && <Field label="媛먯떆?? value={fd.monitorName as string} />}
          {isForm2 && <Field label="痢≪젙?대떦?? value={fd.measurerName as string} />}
          {/* 遺숈엫2/4 ?덇? 議곌굔 */}
          {isForm2 && <Field label="?붽린?묒뾽 ?꾩슂" value={fd.needFireWork as string} />}
          {isForm2 && <Field label="?댁뿰湲곌? ?ъ슜" value={fd.useInternalEngine as string} />}
          {isForm4 && <Field label="諛?먭났媛꾩옉?? value={fd.needConfinedSpace as string} />}
          {isForm4 && <Field label="?붽린?묒뾽 ?꾩슂" value={fd.needFireWork as string} />}
        </div>
      </div>

      {/* 遺숈엫1: ?꾪뿕怨듭쥌 泥댄겕 */}
      {isForm1 && riskTypesSummary.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">?꾪뿕怨듭쥌 泥댄겕?ы빆</h3>
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

      {/* 遺숈엫1: 諛쒖깮?꾪뿕?붿냼 */}
      {isForm1 && checkedFactors.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">諛쒖깮?섎뒗 ?꾪뿕?붿냼</h3>
          <div className="flex flex-wrap gap-2">
            {checkedFactors.map((f, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{f}</span>
            ))}
          </div>
        </div>
      )}

      {/* 遺숈엫1: ?꾪뿕?붿냼/媛쒖꽑?梨?*/}
      {isForm1 && Array.isArray(fd.riskRows) && (fd.riskRows as any[]).some(r => r.riskFactor || r.improvement) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">?꾪뿕?붿냼 쨌 媛쒖꽑?梨?/h3>
          <div className="space-y-2">
            {(fd.riskRows as any[]).filter(r => r.riskFactor || r.improvement).map((row, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                {row.riskFactor && <div><span className="text-gray-500">?꾪뿕?붿냼:</span> <span className="text-gray-800">{row.riskFactor}</span></div>}
                {row.improvement && <div><span className="text-gray-500">媛쒖꽑?梨?</span> <span className="text-gray-800">{row.improvement}</span></div>}
                {row.disasterType && <div><span className="text-gray-500">?ы빐?뺥깭:</span> <span className="text-gray-800">{row.disasterType}</span></div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 遺숈엫2/4: ?덉쟾議곗튂 ?댄뻾?ы빆 */}
      {(isForm2 || isForm4) && Array.isArray(fd.safetyChecks) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">?덉쟾議곗튂 ?댄뻾?ы빆</h3>
          <div className="space-y-1.5">
            {(fd.safetyChecks as any[]).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-gray-50">
                <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${item.applicable === "?대떦" ? "bg-blue-600" : "bg-gray-200"}`}>
                  {item.applicable === "?대떦" && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span className={`flex-1 ${item.applicable === "?대떦" ? "text-gray-800 font-medium" : "text-gray-400"}`}>{item.label}</span>
                {item.applicable && <span className={`text-xs px-1.5 py-0.5 rounded ${item.applicable === "?대떦" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"}`}>{item.applicable}</span>}
                {item.result && <span className="text-gray-500 text-xs">??{item.result}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 遺숈엫4: 湲곌린 ?뺤씤 寃곌낵 */}
      {isForm4 && Array.isArray(fd.inspectionItems) && (fd.inspectionItems as any[]).some(i => i.equipment) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">湲곌린 ?뺤씤 寃곌낵</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">?먭?湲곌린</th>
                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">李⑤떒?뺤씤??/th>
                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">?꾧린?대떦??/th>
                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">?꾩옣?뺣퉬</th>
                </tr>
              </thead>
              <tbody>
                {(fd.inspectionItems as any[]).filter(i => i.equipment).map((item, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-2 py-1.5 text-gray-800">{item.equipment}</td>
                    <td className="px-2 py-1.5 text-gray-800">{item.cutoffConfirmer}</td>
                    <td className="px-2 py-1.5 text-gray-800">{item.electrician}</td>
                    <td className="px-2 py-1.5 text-gray-800">{item.siteRepair}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 遺숈엫3: ?묒뾽 李몄뿬??*/}
      {isForm3 && Array.isArray(fd.participants) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">?묒뾽 李몄뿬??/h3>
          <div className="space-y-1.5">
            {(fd.participants as any[]).map((p, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="text-gray-400 w-28 shrink-0">{p.role}</span>
                <span className="text-gray-900">{p.name} {p.phone ? `(${p.phone})` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 遺숈엫3: ?꾪뿕?붿냼/媛쒖꽑?梨?*/}
      {isForm3 && (fd.riskFactors || fd.improvementMeasures) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">?꾪뿕?붿냼 諛?媛쒖꽑?梨?/h3>
          <div className="space-y-2">
            {fd.riskFactors && <Field label="?꾪뿕?붿냼" value={fd.riskFactors as string} />}
            {fd.improvementMeasures && <Field label="媛쒖꽑?梨? value={fd.improvementMeasures as string} />}
          </div>
        </div>
      )}

      {/* 遺숈엫2/4: ?밸퀎議곗튂 - 2?④퀎(?덇???/3?④퀎(?뺤씤???먯꽌留??쒖떆 */}
      {(isForm2 || isForm4) && fd.specialMeasures && doc.currentApprovalOrder !== 1 && doc.status !== "SUBMITTED" && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-2">?밸퀎議곗튂 ?꾩슂?ы빆</h3>
          <p className="text-sm text-gray-800">{fd.specialMeasures as string}</p>
        </div>
      )}

      {/* 寃?좎쓽寃?*/}
      {(fd.reviewOpinion || fd.reviewResult) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">?덉쟾愿由ъ옄 寃?좎쓽寃?/h3>
          <div className="space-y-2">
            {fd.reviewOpinion && (
              <div>
                <p className="text-xs text-gray-500 mb-1">寃?좎쓽寃?/p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2">{fd.reviewOpinion as string}</p>
              </div>
            )}
            {fd.reviewResult && (
              <div>
                <p className="text-xs text-gray-500 mb-1">議곗튂寃곌낵</p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2">{fd.reviewResult as string}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ?쒕챸 */}
      {(fd.signatureData || approvalLines.some(l => l.signatureData && l.stepStatus === "APPROVED")) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">?쒕챸</h3>
          <div className="space-y-2">
            {typeof fd.signatureData === "string" && fd.signatureData && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex border-b border-gray-100 bg-gray-50">
                  <span className="text-xs font-medium text-gray-600 px-3 py-2 w-24 border-r border-gray-200">?좎껌??/span>
                  <span className="text-xs text-gray-500 px-3 py-2">{fd.applicantName as string || ""}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 px-3 py-2 w-24 border-r border-gray-200 shrink-0">(?쒕챸)</span>
                  <div className="px-3 py-2">
                    <img src={fd.signatureData as string} alt="?좎껌???쒕챸" className="h-12 object-contain" />
                  </div>
                </div>
              </div>
            )}
            {approvalLines.filter(l => l.stepStatus === "APPROVED" && l.signatureData).map(line => {
              const roleLabel = doc.documentType === "CONFINED_SPACE"
                ? (line.approvalOrder === 2 ? "(怨꾪쉷?뺤씤)?덇??? : line.approvalOrder === 4 ? "(?댄뻾?뺤씤)?뺤씤?? : ROLE_LABELS["CONFINED_SPACE"]?.[line.approvalOrder] ?? `${line.approvalOrder}?④퀎`)
                : line.approvalRole === "FINAL_APPROVER" ? (FINAL_ROLE_LABELS[doc.documentType] ?? "理쒖쥌 ?덇???) : (ROLE_LABELS[doc.documentType]?.[line.approvalOrder] ?? `${line.approvalOrder}?④퀎`);
              return (
                <div key={line.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex border-b border-gray-100 bg-gray-50">
                    <span className="text-xs font-medium text-gray-600 px-3 py-2 w-24 border-r border-gray-200">{roleLabel}</span>
                    <span className="text-xs text-gray-500 px-3 py-2">{line.approverName}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-400 px-3 py-2 w-24 border-r border-gray-200 shrink-0">(?쒕챸)</span>
                    <div className="px-3 py-2">
                      <img src={line.signatureData!} alt={`${roleLabel} ?쒕챸`} className="h-12 object-contain" />
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
  const [activeTab, setActiveTab] = useState("?댁슜");
  const [reviewOpinion, setReviewOpinion] = useState("");
  const [reviewResult, setReviewResult] = useState("");
  // ??IME 踰꾧렇 ?닿껐: textarea ref濡?吏곸젒 DOM ?묎렐
  const reviewOpinionRef = useRef<HTMLTextAreaElement>(null);
  const reviewResultRef = useRef<HTMLTextAreaElement>(null);
  // ???곗씠??濡쒕뱶 ?꾨즺 ??textarea remount??key
  const [dataKey, setDataKey] = useState(0);

  // ??dataKey 蹂寃???textarea remount ??ref 珥덇린??
  useEffect(() => {
    if (dataKey > 0 && reviewOpinionRef.current) {
      reviewOpinionRef.current.value = reviewOpinion;
    }
    if (dataKey > 0 && reviewResultRef.current) {
      reviewResultRef.current.value = reviewResult;
    }
  }, [dataKey]);
  const [step1ApproverName, setStep1ApproverName] = useState("");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showSign, setShowSign] = useState(false);
  const [showFinalApprover, setShowFinalApprover] = useState(false);
  // 諛?먭났媛?5?④퀎 ?꾩슜
  const [showConfinedNextModal, setShowConfinedNextModal] = useState(false);
  const [confinedNextAction, setConfinedNextAction] = useState<"PLAN_APPROVER"|"FINAL_CONFIRMER"|null>(null);
  const [specialMeasuresInput, setSpecialMeasuresInput] = useState("");
  const [gasMeasureRowsInput, setGasMeasureRowsInput] = useState<any[]>([]);
  const [pendingAction, setPendingAction] = useState<"APPROVE" | "REJECT" | null>(null);
  // ???쒕챸 紐⑤떖 ?닿린 ??textarea 媛믪쓣 誘몃━ ???(ref??紐⑤떖 ?ㅽ뵂 ??null ?????덉쓬)
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
      if (!docRes.ok) throw new Error(docData.error || "?곗씠???ㅻ쪟");
      const docObj = docData.document;
      setDoc(docObj);
      const lines = linesData.approvalLines ?? [];
      setApprovalLines(lines);
      const line1 = lines.find((l: ApprovalLine) => l.approvalOrder === 1);
      if (line1?.approverName) setStep1ApproverName(line1.approverName);
      const fd = docObj.formDataJson ?? {};
      // ??2?④퀎 寃?좎옄媛 ?묒꽦??comment瑜?3?④퀎?먯꽌???쒖떆
      // ?곗꽑?쒖쐞: line1.comment(寃곗옱????κ컪) > formDataJson.reviewOpinion
      const line1Data = lines.find((l: ApprovalLine) => l.approvalOrder === 1);
      const initialOpinion = (line1Data?.comment || fd.reviewOpinion || "") as string;
      const initialResult = (fd.reviewResult || "") as string;
      setReviewOpinion(initialOpinion);
      setReviewResult(initialResult);
      // ??dataKey瑜?諛붽퓭??textarea瑜?remount ??defaultValue ?ъ쟻??
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
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎."); }
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
    if (!confirm("寃곗옱瑜?痍⑥냼?섍퀬 ?묒꽦以??곹깭濡??섎룎由ъ떆寃좎뒿?덇퉴?\n(寃곗옱?좎씠 ??젣?⑸땲??")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "?ㅻ쪟 諛쒖깮");
      alert("寃곗옱媛 痍⑥냼?⑸땲?? 臾몄꽌??뿉???ㅼ떆 ?묒꽦?????덉뒿?덈떎.");
      router.back();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "痍⑥냼???ㅽ뙣?덉뒿?덈떎."); }
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
    // ???쒕챸 紐⑤떖 ?닿린 ?꾩뿉 ref?먯꽌 媛믪쓣 ?쎌뼱 蹂꾨룄 state?????
    // (?쒕챸 紐⑤떖???대━硫?ReviewInputSection??媛?ㅼ졇 ref媛 null ?????덉쓬)
    const opinionVal = (reviewOpinionRef.current?.value ?? reviewOpinion).trim();
    const resultVal = (reviewResultRef.current?.value ?? reviewResult).trim();
    if (action === "REJECT" && !opinionVal) { 
      alert("諛섎젮 ?ъ쑀瑜?寃?좎쓽寃щ????낅젰?댁＜?몄슂."); return; 
    }
    setPendingOpinion(opinionVal);
    setPendingResult(resultVal);
    setReviewOpinion(opinionVal);
    setReviewResult(resultVal);
    setPendingAction(action); setShowRejectConfirm(false); setShowApproveConfirm(false);
    setShowSign(true); initCanvas();
  };

  const handleSubmitWithSign = async () => {
    if (!pendingAction) return;
    setProcessing(true);
    try {
      const canvas = canvasRef.current;
      const signatureData = canvas ? canvas.toDataURL("image/png") : null;
      const isConfined = doc?.documentType === "CONFINED_SPACE";
      const confinedOrder = doc?.currentApprovalOrder ?? 0;
      const extraBody: Record<string, unknown> = {};
      // 諛?먭났媛?3?④퀎: ?밸퀎議곗튂 ?꾩슂?ы빆 ?ы븿
      if (isConfined && confinedOrder === 2 && specialMeasuresInput) {
        extraBody.specialMeasures = specialMeasuresInput;
      }
      // 諛?먭났媛?4?④퀎: 痢≪젙寃곌낵 ?ы븿
      if (isConfined && confinedOrder === 3 && gasMeasureRowsInput.length > 0) {
        extraBody.gasMeasureRows = gasMeasureRowsInput;
      }
      const res = await fetch(`/api/documents/${documentId}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: pendingAction, 
          comment: pendingOpinion || null, 
          reviewResult: pendingResult || null, 
          signatureData,
          ...extraBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "?ㅻ쪟 諛쒖깮");
      setShowSign(false);
      if (data.action === "NEED_FINAL_APPROVER") {
        setShowFinalApprover(true);
      } else if (data.action === "NEED_PLAN_APPROVER") {
        // 諛?먭났媛?2?④퀎: 媛먯떆???쒕챸 ?꾨즺 ??(怨꾪쉷?뺤씤)?덇???吏??
        setConfinedNextAction("PLAN_APPROVER");
        setShowConfinedNextModal(true);
      } else if (data.action === "NEED_MEASUREMENT") {
        // 諛?먭났媛?3?④퀎: 痢≪젙?대떦?먯뿉寃??섏뼱媛?
        alert("(怨꾪쉷?뺤씤) ?쒕챸???꾨즺?⑸땲?? 痢≪젙?대떦?먯뿉寃?痢≪젙寃곌낵 ?낅젰???붿껌?⑸땲??");
        router.push("/approvals");
      } else if (data.action === "NEED_FINAL_CONFIRMER") {
        // 諛?먭났媛?4?④퀎: 痢≪젙寃곌낵 ?낅젰 ?꾨즺 ??(?댄뻾?뺤씤)?뺤씤??吏??
        setConfinedNextAction("FINAL_CONFIRMER");
        setShowConfinedNextModal(true);
      } else if (data.action === "APPROVED") {
        alert("理쒖쥌 ?뱀씤???꾨즺?⑸땲??");
        router.push("/approvals");
      } else {
        alert("泥섎━?⑸땲??");
        router.push("/approvals");
      }
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎."); }
    finally { setProcessing(false); }
  };

  if (loading) return <div className="p-4 space-y-4">{[1,2,3].map(i => (<div key={i} className="bg-white rounded-2xl p-4 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/3 mb-3"/><div className="h-10 bg-gray-100 rounded w-full"/></div>))}</div>;
  if (error || !doc) return <div className="p-4 text-center py-12 text-red-500 text-sm">{error || "臾몄꽌瑜?李얠쓣 ???놁뒿?덈떎."}<button onClick={fetchData} className="block mx-auto mt-3 text-blue-500 underline text-xs">?ㅼ떆 ?쒕룄</button></div>;

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
    ? `?뮕 ${step1ApproverName || "1?④퀎 寃?좎옄"}(寃?좎옄)媛 ?묒꽦???댁슜???뺤씤?섏뿬 理쒖쥌 寃곗옱?댁＜?몄슂.`
    : null;




// AI ?밸퀎議곗튂 珥덉븞 ?앹꽦 踰꾪듉
function AiSpecialMeasuresButton({ doc, onGenerated, label = "AI ?밸퀎議곗튂 珥덉븞 ?앹꽦" }: {
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: doc.documentType,
          formData: doc.formDataJson,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI ?앹꽦 ?ㅻ쪟");
      onGenerated(data.specialMeasures);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.");
    } finally { setLoading(false); }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-all"
        style={{ background: loading ? "#6b7280" : "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
        {loading ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            AI 珥덉븞 ?앹꽦 以?..
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            ??{label}
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ?밸퀎議곗튂 ?꾩슂?ы빆 ?낅젰 - IME 踰꾧렇 ?꾩쟾 ?닿껐 (composition ?대깽???쒖슜)
function SpecialMeasuresInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);

  useEffect(() => {
    if (ref.current) ref.current.value = value;
  }, []);

  return (
    <textarea
      ref={ref}
      defaultValue={value}
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={e => {
        composing.current = false;
        onChange((e.target as HTMLTextAreaElement).value);
      }}
      onChange={e => {
        if (!composing.current) onChange(e.target.value);
      }}
      onBlur={e => onChange(e.target.value)}
      placeholder="?밸퀎議곗튂 ?꾩슂?ы빆???낅젰?댁＜?몄슂"
      rows={4}
      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
  );
}

// 痢≪젙寃곌낵 ?낅젰 而댄룷?뚰듃 - uncontrolled + 媛쒕퀎 ?띾룄 ?낅젰移?+ ?ㅽ뵾??
const DEFAULT_GAS_ROWS = [
  { time: "전",  hour: "", minute: "", o2: "", co2: "", h2s: "", co: "", ex: "", measurer: "", entryCount: "", exitCount: "" },
  { time: "중*", hour: "", minute: "", o2: "", co2: "", h2s: "", co: "", ex: "", measurer: "", entryCount: "", exitCount: "" },
  { time: "후",  hour: "", minute: "", o2: "", co2: "", h2s: "", co: "", ex: "", measurer: "", entryCount: "", exitCount: "" },
];

// 시/분 스피너 - 외부 컴포넌트 (팅김 방지)
function NumSpinner({ initialValue, min, max, label, onCommit }: { initialValue: string; min: number; max: number; label: string; onCommit: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.value = initialValue; }, []);
  const step = (dir: number) => {
    const cur = parseInt(ref.current?.value || "0") || 0;
    const next = Math.min(max, Math.max(min, cur + dir));
    if (ref.current) ref.current.value = String(next);
    onCommit(String(next));
  };
  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={() => step(1)} className="w-10 h-8 rounded-t-lg bg-gray-100 border border-gray-300 flex items-center justify-center hover:bg-blue-100">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
      </button>
      <input ref={ref} type="number" min={min} max={max} defaultValue={initialValue}
        onChange={e => onCommit(e.target.value)} onBlur={e => onCommit(e.target.value)}
        className="w-14 py-2 text-base border-x border-gray-300 text-center text-gray-900 font-medium focus:outline-none bg-white" />
      <button type="button" onClick={() => step(-1)} className="w-10 h-8 rounded-b-lg bg-gray-100 border border-gray-300 flex items-center justify-center hover:bg-blue-100">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  );
}
function GasValueInput({ initialValue, label, unit, placeholder, onCommit }: { initialValue: string; label: string; unit: string; placeholder?: string; onCommit: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.value = initialValue || ""; }, []);
  return (
    <div className="flex flex-col">
      <label className="text-[10px] text-gray-500 mb-0.5">{label}</label>
      <div className="flex items-center gap-0.5">
        <input ref={ref} type="text" defaultValue={initialValue || ""}
          onChange={e => onCommit(e.target.value)} onBlur={e => onCommit(e.target.value)}
          placeholder={placeholder || ""}
          className="w-full px-2 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
        <span className="text-xs text-gray-500 shrink-0 ml-0.5">{unit}</span>
      </div>
    </div>
  );
}
function GasTextInput({ initialValue, onCommit, className }: { initialValue: string; onCommit: (v: string) => void; className?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.value = initialValue || ""; }, []);
  return (
    <input ref={ref} type="text" defaultValue={initialValue || ""}
      onChange={e => onCommit(e.target.value)} onBlur={e => onCommit(e.target.value)}
      className={className || "w-full px-2 py-2 text-xs text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"} />
  );
}
function GasRowInput({ row, idx, onChange }: { row: any; idx: number; onChange: (idx: number, field: string, value: string) => void }) {
  return (
    <div className="border border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50">
      <div className="flex items-start gap-3">
        <span className="text-base font-bold text-gray-900 w-8 shrink-0 pt-4">{row.time}</span>
        <div className="flex gap-4">
          <NumSpinner initialValue={row.hour || ""} min={0} max={23} label="시" onCommit={v => onChange(idx, "hour", v)} />
          <NumSpinner initialValue={row.minute || ""} min={0} max={59} label="분" onCommit={v => onChange(idx, "minute", v)} />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">측정 농도</p>
        <div className="grid grid-cols-2 gap-2">
          <GasValueInput initialValue={row.o2||""} label="산소 O₂" unit="%" placeholder="18~23.5" onCommit={v=>onChange(idx,"o2",v)} />
          <GasValueInput initialValue={row.co2||""} label="이산화탄소 CO₂" unit="%" placeholder="1.5미만" onCommit={v=>onChange(idx,"co2",v)} />
          <GasValueInput initialValue={row.h2s||""} label="황화수소 H₂S" unit="ppm" placeholder="10미만" onCommit={v=>onChange(idx,"h2s",v)} />
          <GasValueInput initialValue={row.co||""} label="일산화탄소 CO" unit="ppm" placeholder="30미만" onCommit={v=>onChange(idx,"co",v)} />
          <GasValueInput initialValue={row.ex||""} label="폭발하한 EX" unit="%" placeholder="10미만" onCommit={v=>onChange(idx,"ex",v)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><label className="text-xs text-gray-500 mb-1 block">측정자</label><GasTextInput initialValue={row.measurer||""} onCommit={v=>onChange(idx,"measurer",v)} /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">입장(명)</label><GasTextInput initialValue={row.entryCount||""} onCommit={v=>onChange(idx,"entryCount",v)} className="w-full px-2 py-2 text-xs text-gray-900 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">퇴장(명)</label><GasTextInput initialValue={row.exitCount||""} onCommit={v=>onChange(idx,"exitCount",v)} className="w-full px-2 py-2 text-xs text-gray-900 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" /></div>
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
        ?곸젙?섏튂: O??18~23.5%) CO??1.5%誘몃쭔) H?괪(10ppm誘몃쭔) CO(30ppm誘몃쭔) EX(10%誘몃쭔)
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
    // 諛?먭났媛??④퀎蹂?UI
    if (isConfinedSpace) {
      const stepDesc = CONFINED_STEP_DESC[confinedOrder] ?? "";
      return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
          <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse inline-block"/>
            {stepDesc}
          </h3>
          {confinedOrder === 1 && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">媛먯떆?몄쑝濡쒖꽌 ?묒뾽 怨꾪쉷???뺤씤?섍퀬 ?쒕챸?댁＜?몄슂.</p>
          )}
          {confinedOrder === 2 && (
            <div className="space-y-2">
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">?밸퀎議곗튂 ?꾩슂?ы빆???낅젰 ???쒕챸?댁＜?몄슂.</p>
              <AiSpecialMeasuresButton doc={doc} onGenerated={setSpecialMeasuresInput} />
              <SpecialMeasuresInput value={specialMeasuresInput} onChange={setSpecialMeasuresInput} />
            </div>
          )}
          {confinedOrder === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">?곗냼 諛??좏빐媛???띾룄 痢≪젙寃곌낵瑜??낅젰?댁＜?몄슂.</p>
              <GasMeasureInput rows={gasMeasureRowsInput.length > 0 ? gasMeasureRowsInput : DEFAULT_GAS_ROWS} onChange={setGasMeasureRowsInput} />
            </div>
          )}
          {confinedOrder === 4 && (
            <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">痢≪젙寃곌낵瑜?理쒖쥌 ?뺤씤?섍퀬 ?쒕챸?댁＜?몄슂.</p>
          )}
        </div>
      );
    }

    // ?쇰컲 臾몄꽌
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse inline-block"/>
          {doc.currentApprovalOrder === 1 ? "寃???섍껄 ?낅젰" : "寃?좎쓽寃??뺤씤 諛??ㅼ젙"}
        </h3>
        {reviewGuideText && <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-3">{reviewGuideText}</p>}
        <div className="space-y-3">
          <div>
            {doc.currentApprovalOrder === 1 && (
              <AiSpecialMeasuresButton doc={doc} onGenerated={(v) => {
                if (reviewOpinionRef.current) reviewOpinionRef.current.value = v;
                setReviewOpinion(v);
              }} label="AI 寃?좎쓽寃?珥덉븞" />
            )}
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              寃?좎쓽寃?{doc.currentApprovalOrder === 1 && <span className="text-red-500 text-xs">(諛섎젮 ???꾩닔)</span>}
            </label>
            <textarea
              key={`opinion-${dataKey}`}
              ref={reviewOpinionRef}
              defaultValue={reviewOpinion}
              placeholder="寃???섍껄???낅젰?댁＜?몄슂 (諛섎젮 ???꾩닔)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">議곗튂寃곌낵</label>
            <textarea
              key={`result-${dataKey}`}
              ref={reviewResultRef}
              defaultValue={reviewResult}
              placeholder="議곗튂寃곌낵瑜??낅젰?댁＜?몄슂"
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
      {cancelling ? "痍⑥냼 以?.." : "寃곗옱 痍⑥냼 (?묒꽦以묒쑝濡?"}
    </button>
  ) : null;

  return (
    <div className="pb-40">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <Link href="/approvals" className="flex items-center gap-1 text-gray-400 text-sm mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          寃곗옱 紐⑸줉
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{typeShort}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
          {isMyTurn && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium animate-pulse">??李⑤?</span>}
        </div>
        <h2 className="text-base font-bold text-gray-900">{taskName}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{typeLabel}</p>
        {doc.submittedAt && <p className="text-xs text-gray-400 mt-0.5">?쒖텧?? {new Date(doc.submittedAt).toLocaleDateString("ko-KR")}</p>}
      </div>

      {/* ????- ?댁슜 / 寃곗옱?꾪솴 */}
      <div className="bg-white border-b border-gray-200 flex">
        {["?댁슜", "寃곗옱?꾪솴"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* ???댁슜 ?? 紐⑤뱺 ?낅젰?댁슜 + 泥⑤??뚯씪 + PDF (?뱀씤?꾨즺?? */}
        {activeTab === "?댁슜" && (
          <>
            <DocumentContent doc={doc} fd={fd} approvalLines={approvalLines} />
            <AttachmentViewer documentId={documentId} canAdd={false} />
            {isApproved && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  ?덇???PDF
                </h3>
                <PdfButtons documentId={documentId} />
              </div>
            )}
            {isMyTurn && <ReviewInputSection />}
            <CancelButton />
          </>
        )}

        {/* ??3踰? 寃곗옱?꾪솴 ??- 寃곗옱?먮쫫 + ?밸퀎議곗튂(2/3?④퀎) + ?ъ쭊 */}
        {activeTab === "寃곗옱?꾪솴" && (
          <>
            <ApprovalFlow doc={doc} approvalLines={approvalLines} writerName={(fd.applicantName as string) || writerName} applicantSignature={(fd.signatureData as string) || undefined} />
            {(doc.documentType === "CONFINED_SPACE" || doc.documentType === "POWER_OUTAGE") && fd.specialMeasures && doc.currentApprovalOrder !== 1 && doc.status !== "SUBMITTED" && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-2">?밸퀎議곗튂 ?꾩슂?ы빆</h3>
                <p className="text-sm text-gray-800">{fd.specialMeasures as string}</p>
              </div>
            )}
            <PhotoViewer documentId={documentId} />
            {isMyTurn && <ReviewInputSection />}
            <CancelButton />
          </>
        )}
      </div>

      {/* ?섎떒 怨좎젙 踰꾪듉 - 寃곗옱 ?≪뀡 */}
      {isMyTurn && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-3 pb-4">
          {/* 諛?먭났媛?3?④퀎(痢≪젙?대떦??: ?쒕챸 ?놁씠 痢≪젙寃곌낵留??쒖텧 */}
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
                if (!res.ok) throw new Error(data.error || "?ㅻ쪟 諛쒖깮");
                if (data.action === "NEED_FINAL_CONFIRMER") {
                  setConfinedNextAction("FINAL_CONFIRMER");
                  setShowConfinedNextModal(true);
                } else {
                  alert("痢≪젙寃곌낵媛 ?쒖텧?먯뒿?덈떎.");
                  router.push("/approvals");
                }
              } catch (e: unknown) { alert(e instanceof Error ? e.message : "?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎."); }
              finally { setProcessing(false); }
            }} disabled={processing}
              className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ background: "#16a34a" }}>
              {processing ? "?쒖텧 以?.." : "?뱤 痢≪젙寃곌낵 ?쒖텧 諛??댄뻾?뺤씤??吏??}
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
                }} className="flex-1 py-3 rounded-xl border-2 border-red-200 text-sm font-medium text-red-600">諛섎젮</button>
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
                  ? confinedOrder === 1 ? "媛먯떆???쒕챸" : confinedOrder === 2 ? "(怨꾪쉷?뺤씤) ?쒕챸" : "(?댄뻾?뺤씤) 理쒖쥌 ?쒕챸"
                  : doc.currentApprovalOrder === 1 ? "寃?좎셿猷? : "理쒖쥌 ?뱀씤"}
              </button>
            </div>
          )}
        </div>
      )}

      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-2">諛섎젮?섏떆寃좎뒿?덇퉴?</h3>
            <p className="text-sm text-gray-500 mb-4">諛섎젮 泥섎━ ???좎껌?몄뿉寃??뚮┝???꾩넚?⑸땲??</p>
            {!(reviewOpinionRef.current?.value ?? reviewOpinion).trim() && <p className="text-xs text-red-500 mb-3">諛섎젮 ?ъ쑀(寃?좎쓽寃?瑜?癒쇱? ?낅젰?댁＜?몄슂.</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowRejectConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">痍⑥냼</button>
              <button onClick={() => handleAction("REJECT")} disabled={!reviewOpinion.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40" style={{ background: "#dc2626" }}>諛섎젮</button>
            </div>
          </div>
        </div>
      )}

      {showApproveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              {isConfinedSpace
                ? confinedOrder === 1 ? "媛먯떆???쒕챸 ??(怨꾪쉷?뺤씤)?덇??먮? 吏?뺥빀?덈떎"
                  : confinedOrder === 2 ? "(怨꾪쉷?뺤씤) ?덇????쒕챸???꾨즺?⑸땲??
                  : "(?댄뻾?뺤씤) 理쒖쥌 ?쒕챸???꾨즺?⑸땲??
                : doc.currentApprovalOrder === 1 ? "寃?좎셿猷???理쒖쥌?덇??먯뿉寃?吏?뺣맗?덈떎" : "理쒖쥌 ?뱀씤?섏떆寃좎뒿?덇퉴?"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {isConfinedSpace
                ? "?쒕챸 ???ㅼ쓬 ?④퀎媛 吏꾪뻾?⑸땲??"
                : doc.currentApprovalOrder === 1 ? "?쒕챸 ??理쒖쥌?덇??먮? 吏?뺥빀?덈떎." : "理쒖쥌 ?뱀씤 ???섎룎由????놁뒿?덈떎."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowApproveConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">痍⑥냼</button>
              <button onClick={() => handleAction("APPROVE")} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: "#16a34a" }}>?뺤씤</button>
            </div>
          </div>
        </div>
      )}

      {showSign && (
        <div ref={signModalRef} className="fixed inset-0 bg-black/50 z-50 flex items-end" style={{ touchAction: "none" }} onTouchMove={e => e.preventDefault()}>
          <div className="bg-white w-full rounded-t-3xl" style={{ paddingBottom: "env(safe-area-inset-bottom, 20px)", maxHeight: "80vh", overflowY: "auto" }}>
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-base font-bold text-gray-900 mb-1">{pendingAction === "APPROVE" ? "?뱀씤 ?쒕챸" : "諛섎젮 ?쒕챸"}</h2>
              <p className="text-xs text-gray-500">?쒕챸 ??泥섎━媛 ?꾨즺?⑸땲??</p>
            </div>
            <div className="px-6 py-3">
              <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-white relative">
                <div className="absolute top-2 left-3 text-xs text-gray-300 pointer-events-none">?꾨옒???쒕챸?댁＜?몄슂</div>
                <canvas ref={canvasRef} width={600} height={180} className="w-full"
                  style={{ cursor: "crosshair", touchAction: "none", display: "block" }}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              </div>
            </div>
            <div className="px-6 pb-24 space-y-2">
              <div className="flex gap-2">
                <button onClick={clearCanvas} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium">?쒕챸 吏?곌린</button>
                <button onClick={() => setShowSign(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium">痍⑥냼</button>
              </div>
              <button onClick={handleSubmitWithSign} disabled={processing}
                className="w-full py-3.5 rounded-xl text-white font-medium text-sm disabled:opacity-50"
                style={{ background: pendingAction === "APPROVE" ? "#16a34a" : "#dc2626" }}>
                {processing ? "泥섎━ 以?.." : pendingAction === "APPROVE" ? "???뱀씤 ?꾨즺" : "諛섎젮 ?꾨즺"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinalApprover && doc && (
        <FinalApproverModal documentId={documentId} documentType={doc.documentType}
          onClose={() => setShowFinalApprover(false)}
          onAssigned={() => { setShowFinalApprover(false); alert("理쒖쥌?덇??먭? 吏?뺣맗?덈떎. ?뚮┝???꾩넚?⑸땲??"); router.push("/approvals"); }} />
      )}

      {/* 諛?먭났媛??ㅼ쓬?④퀎 吏??紐⑤떖 */}
      {showConfinedNextModal && confinedNextAction && doc && (
        <ConfinedNextModal
          documentId={documentId}
          action={confinedNextAction}
          onClose={() => setShowConfinedNextModal(false)}
          onAssigned={() => {
            setShowConfinedNextModal(false);
            const msg = confinedNextAction === "PLAN_APPROVER"
              ? "(怨꾪쉷?뺤씤) ?덇??먭? 吏?뺣맗?덈떎."
              : "(?댄뻾?뺤씤) ?뺤씤?먭? 吏?뺣맗?덈떎.";
            alert(msg);
            router.push("/approvals");
          }}
        />
      )}
    </div>
  );
}

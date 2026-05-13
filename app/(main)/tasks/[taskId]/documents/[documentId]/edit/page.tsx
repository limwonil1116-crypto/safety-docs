"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface UserItem { id: string; name: string; organization?: string; role: string; employeeNo?: string; }
interface PrevDoc { id: string; formDataJson: Record<string, unknown>; createdAt: string; }
interface Attachment {
  id: string; fileName: string; fileUrl: string; fileSize: number | null;
  mimeType: string | null; attachmentType: string; description: string | null;
}
interface RiskAssessRow {
  workType: string; riskFactor: string; riskLevel: string;
  currentMeasure: string; residualRisk: string; additionalMeasure: string;
}
declare global { interface Window { kakao: any; daum: any; } }

const DOC_TYPE_INFO: Record<string, { title: string; short: string; approverLabel: string; confirmerLabel: string }> = {
  SAFETY_WORK_PERMIT: { title: "안전작업허가서",    short: "붙임 1", approverLabel: "(계획확인)허가자", confirmerLabel: "(이행확인)확인자" },
  CONFINED_SPACE:     { title: "밀폐공간작업허가서", short: "붙임2", approverLabel: "허가자",    confirmerLabel: "확인자" },
  HOLIDAY_WORK:       { title: "휴일작업신청서",     short: "붙임3", approverLabel: "검토자",    confirmerLabel: "승인자" },
  POWER_OUTAGE:       { title: "정전작업허가서",     short: "붙임4", approverLabel: "허가자",    confirmerLabel: "확인자" },
};

const inputClass = "w-full px-3 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none";
const textareaClass = "w-full px-3 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none";
const dateInputClass = "w-full px-3 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const timeInputClass = "w-full px-3 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

// 위험공종 관련작업(장소) 항목 목록
const HIGH_PLACE_ITEMS = ["저수지 여수로·취수탑", "방조제 배수갑문", "양·배수장 건축물"];
const WATER_WORK_ITEMS = ["저수지 상류사면·물넘이·감세공", "방조제 제방사면·배수갑문", "양·배수장 유입·토출수로"];

const defaultRiskAssessRow: RiskAssessRow = {
  workType: "", riskFactor: "", riskLevel: "중",
  currentMeasure: "", residualRisk: "하", additionalMeasure: "",
};
const levelColors: Record<string, string> = {
  "상": "bg-red-100 text-red-700 border-red-200",
  "중": "bg-amber-100 text-amber-700 border-amber-200",
  "하": "bg-green-100 text-green-700 border-green-200",
};

function RiskAssessTable({ rows, onChange }: { rows: RiskAssessRow[]; onChange: (rows: RiskAssessRow[]) => void }) {
  const update = (idx: number, field: keyof RiskAssessRow, value: string) =>
    onChange(rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-1 px-2 py-1.5 bg-gray-100 rounded-lg text-[10px] font-medium text-gray-600">
        <div className="col-span-2">작업내용</div>
        <div className="col-span-2">잠재위험인자</div>
        <div className="col-span-1 text-center">위험도</div>
        <div className="col-span-3">현재 안전조치</div>
        <div className="col-span-1 text-center">잔여도</div>
        <div className="col-span-2">추가 조치</div>
        <div className="col-span-1"></div>
      </div>
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-1 items-start border border-gray-100 rounded-xl p-2">
          {(["workType","riskFactor","currentMeasure","additionalMeasure"] as (keyof RiskAssessRow)[]).map((field) => {
            const placeholders: Record<string, string> = { workType: "작업내용", riskFactor: "위험인자", currentMeasure: "현재조치", additionalMeasure: "추가조치" };
            const colSpans: Record<string, string> = { workType: "col-span-2", riskFactor: "col-span-2", currentMeasure: "col-span-3", additionalMeasure: "col-span-2" };
            return (
              <textarea key={field} value={row[field]} onChange={e => update(idx, field, e.target.value)}
                rows={2} placeholder={placeholders[field]}
                className={`${colSpans[field]} px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-900 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500`} />
            );
          })}
          <div className="col-span-1">
            <select value={row.riskLevel} onChange={e => update(idx, "riskLevel", e.target.value)}
              className={`w-full px-1 py-2 border rounded-lg text-xs font-bold text-center focus:outline-none ${levelColors[row.riskLevel] || ""}`}>
              {["상","중","하"].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <select value={row.residualRisk} onChange={e => update(idx, "residualRisk", e.target.value)}
              className={`w-full px-1 py-2 border rounded-lg text-xs font-bold text-center focus:outline-none ${levelColors[row.residualRisk] || ""}`}>
              {["상","중","하"].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <button onClick={() => { if (rows.length > 1) onChange(rows.filter((_, i) => i !== idx)); }}
            disabled={rows.length <= 1}
            className="col-span-1 flex items-center justify-center text-gray-300 hover:text-red-400 disabled:opacity-20 pt-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ))}
      <button onClick={() => onChange([...rows, { ...defaultRiskAssessRow }])}
        className="w-full py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        행 추가
      </button>
    </div>
  );
}

function RiskAssessSection({ documentId, riskAssessRows, onChangeRows }: {
  documentId: string; riskAssessRows: RiskAssessRow[]; onChangeRows: (rows: RiskAssessRow[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [docFiles, setDocFiles] = useState<Attachment[]>([]);

  useEffect(() => {
    fetch(`/api/documents/${documentId}/attachments?type=DOCUMENT`)
      .then(r => r.json())
      .then(d => setDocFiles((d.attachments ?? []).filter((a: Attachment) => a.description === "위험성평가표")))
      .catch(() => {});
  }, [documentId]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("attachmentType", "DOCUMENT"); fd.append("description", "위험성평가표");
      const res = await fetch(`/api/documents/${documentId}/attachments`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocFiles(prev => [...prev, data.attachment]);
      alert("파일이 업로드됐습니다!");
    } catch (e) { alert(`업로드 실패: ${e instanceof Error ? e.message : "오류"}`); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("파일을 삭제하시겠습니까?")) return;
    await fetch(`/api/documents/${documentId}/attachments?attachmentId=${id}`, { method: "DELETE" });
    setDocFiles(prev => prev.filter(f => f.id !== id));
  };


  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">위험성평가표 (붙임 1)</h3>
        <span className="text-xs text-gray-400">{docFiles.length}개 첨부</span>
      </div>
      <div className="text-xs p-3 rounded-xl bg-blue-50 text-blue-700 mb-3">
        위험성평가표 (PDF 또는 이미지)를 체비하세요.
      </div>
      <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden"
        onChange={e => { const f=e.target.files?.[0]; if(f) handleFileUpload(f); e.target.value=""; }} />
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 mb-3"
        onClick={() => fileInputRef.current?.click()}>
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <span className="text-sm">업로드 중...</span>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 font-medium">탭하여 파일 선택</p>
            <p className="text-xs text-gray-400 mt-1">PDF / 이미지 (최대 20MB)</p>
          </>
        )}
      </div>
      {docFiles.length > 0 && (
        <div className="space-y-2">
          {docFiles.map(f => (
            <div key={f.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs text-gray-700 flex-1 truncate">{f.fileName}</span>
              <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs px-2 py-1 rounded-lg bg-blue-50">보기</a>
              <button onClick={() => handleDelete(f.id)} className="text-gray-400 hover:text-red-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// AI 위험요소 자동생성
function AiRiskRowsButton({ form, onChange, onSave }: { form: Form1; onChange: (k: string, v: unknown) => void; onSave?: () => void }) {
  const [loading, setLoading] = useState(false);
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const riskItems: string[] = [];
      if (form.riskHighPlace) riskItems.push("고소작업(2m이상)");
      if (form.riskWaterWork) riskItems.push("수상·수중작업");
      if (form.riskConfinedSpace) riskItems.push("밀폐공간작업");
      if (form.riskPowerOutage) riskItems.push("정전작업");
      if (form.riskFireWork) riskItems.push("화기작업");
      const fl: Record<string,string> = {
        factorNarrowAccess:"진출입로 협소", factorSlippery:"미끌러집(이끼기, 습기)",
        factorSteepSlope:"급경사", factorWaterHazard:"파랑‧유수‧수심",
        factorRockfall:"낙석‧토사붕괴", factorNoRailing:"난간 미설치",
        factorLadderNoGuard:"사다리‧방호울 미설치",
        factorSuffocation:"질식·화재·폭발",
        factorElectricFire:"감전·전기불꽃 화재", factorSparkFire:"스파크, 화염에 의한 화재",
      };
      const checked = Object.entries(fl).filter(([k]) => !!(form as any)[k]).map(([,v]) => v);
      // 서버 API 통해 Gemini 호출 (서버사이드 GEMINI_API_KEY 사용)
      const res = await fetch("/api/ai/risk-rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workContent: form.workContent, workLocation: form.workLocation, riskItems, checkedFactors: checked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 오류");
      // 서버에서 파싱된 rows 직접 사용
      if (!res.ok) throw new Error(data.error || "AI 오류");
      const rows = data.rows;
      if (Array.isArray(rows))
        onChange("riskRows", rows.map((r: any) => ({ riskFactor: r.riskFactor||"", improvement: r.improvement||"", disasterType: r.disasterType||"" })));
        // AI 생성 후 즉시 저장
        setTimeout(() => onSave?.(), 100);
    } catch (e: any) { alert("AI 오류: " + (e.message||"오류")); }
    finally { setLoading(false); }
  };
  return (
    <button onClick={handleGenerate} disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-xl text-sm font-medium text-white disabled:opacity-50"
      style={{ background: loading ? "#6b7280" : "linear-gradient(135deg,#7c3aed,#2563eb)" }}>
      {loading ? "AI 생성 중..." : "AI 위험요소·개선대책·재해형태 자동생성"}
    </button>
  );
}


function PhotoAttachSection({ documentId, canAdd = true }: { documentId: string; canAdd?: boolean }) {
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [beforePhotos, setBeforePhotos] = useState<Attachment[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"normal" | "improve">("normal");
  const [showPicker, setShowPicker] = useState<null | "normal" | "before" | "after">(null);
  const [editImg, setEditImg] = useState<{ src: string; file: File; desc?: string } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const pendingDesc = useRef<string | undefined>(undefined);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/attachments?type=PHOTO`);
      const data = await res.json();
      const all: Attachment[] = data.attachments ?? [];
      setPhotos(all.filter((p: any) => !p.description?.startsWith("조치전:") && !p.description?.startsWith("조치후:")));
      setBeforePhotos(all.filter((p: any) => p.description?.startsWith("조치전:")));
      setAfterPhotos(all.filter((p: any) => p.description?.startsWith("조치후:")));
    } catch {}
  }, [documentId]);
  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const uploadPhoto = async (file: File, descPrefix?: string) => {
    if (!file.type.startsWith("image/")) { alert("이미지 파일만 가능합니다."); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("attachmentType", "PHOTO"); fd.append("sortOrder", String(photos.length));
      if (descPrefix) fd.append("description", descPrefix);
      const res = await fetch(`/api/documents/${documentId}/attachments`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchPhotos();
    } catch (e) { alert(`업로드 실패: ${e instanceof Error ? e.message : "오류"}`); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("사진을 삭제하시겠습니까?")) return;
    await fetch(`/api/documents/${documentId}/attachments?attachmentId=${id}`, { method: "DELETE" });
    fetchPhotos();
  };

  const openPicker = (target: "normal" | "before" | "after") => setShowPicker(target);

  const handleFileSelected = (file: File) => {
    const url = URL.createObjectURL(file);
    setEditImg({ src: url, file, desc: pendingDesc.current });
    setRotation(0); setScale(1);
  };

  const handleEditSave = () => {
    if (!editImg) return;
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.onload = () => {
      const rad = rotation * Math.PI / 180;
      const sin = Math.abs(Math.sin(rad)); const cos = Math.abs(Math.cos(rad));
      const w = img.width * scale; const h = img.height * scale;
      canvas.width = Math.round(w * cos + h * sin);
      canvas.height = Math.round(w * sin + h * cos);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad); ctx.scale(scale, scale);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], editImg.file.name, { type: "image/jpeg" });
        await uploadPhoto(file, editImg.desc);
        setEditImg(null);
      }, "image/jpeg", 0.92);
    };
    img.src = editImg.src;
  };

  const PhotoGrid = ({ items }: { items: Attachment[] }) => (
    <div className="grid grid-cols-3 gap-2 mb-3">
      {items.map(photo => (
        <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <img src={photo.fileUrl} alt={photo.fileName} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewUrl(photo.fileUrl)} />
          {canAdd && (
            <button onClick={() => handleDelete(photo.id)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );

  const AddBtn = ({ target, color }: { target: "normal"|"before"|"after"; color: string }) => (
    <button onClick={() => openPicker(target)} disabled={uploading}
      className={`w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2
        ${color === "orange" ? "border-orange-300 text-orange-500 hover:bg-orange-50" : color === "green" ? "border-green-300 text-green-600 hover:bg-green-50" : "border-blue-300 text-blue-500 hover:bg-blue-50"}`}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      {uploading ? "업로드 중..." : "사진 추가"}
    </button>
  );

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">개선대책 확인자료 (사진)</h3>
        <span className="text-xs text-gray-400">{photos.length + beforePhotos.length + afterPhotos.length}장</span>
      </div>
      {canAdd && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode("normal")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${mode==="normal"?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200"}`}>
            현장사진
          </button>
          <button onClick={() => setMode("improve")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${mode==="improve"?"bg-orange-500 text-white border-orange-500":"bg-white text-gray-600 border-gray-200"}`}>
            개선사항 (조치전·후)
          </button>
        </div>
      )}
      {mode === "normal" ? (
        <>
          <PhotoGrid items={photos} />
          {canAdd && <AddBtn target="normal" color="blue" />}
          {photos.length === 0 && !canAdd && <p className="text-center py-6 text-gray-400 text-sm">등록된 사진이 없습니다.</p>}
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-orange-500 mb-2">■ 조치 전</p>
            <PhotoGrid items={beforePhotos} />
            {canAdd && <AddBtn target="before" color="orange" />}
          </div>
          <div className="border-t border-dashed border-gray-200 pt-4">
            <p className="text-xs font-semibold text-green-600 mb-2">■ 조치 후</p>
            <PhotoGrid items={afterPhotos} />
            {canAdd && <AddBtn target="after" color="green" />}
          </div>
        </div>
      )}

      {/* 숨겼진 input */}
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f=e.target.files?.[0]; if(f) handleFileSelected(f); e.target.value=""; }} />
      <input ref={galRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f=e.target.files?.[0]; if(f) handleFileSelected(f); e.target.value=""; }} />

      {/* 카메라/갤러리 선택 팝업 */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end justify-center" onClick={() => setShowPicker(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-gray-900 mb-4 text-center">
              {showPicker === "before" ? "조치 전 사진" : showPicker === "after" ? "조치 후 사진" : "현장사진"} 첨부
            </p>
            <div className="flex gap-3 mb-3">
              <button onClick={() => {
                pendingDesc.current = showPicker==="before" ? "조치전:" : showPicker==="after" ? "조치후:" : undefined;
                setShowPicker(null);
                setTimeout(() => camRef.current?.click(), 100);
              }} className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span className="text-sm font-semibold">카메라</span>
              </button>
              <button onClick={() => {
                pendingDesc.current = showPicker==="before" ? "조치전:" : showPicker==="after" ? "조치후:" : undefined;
                setShowPicker(null);
                setTimeout(() => galRef.current?.click(), 100);
              }} className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span className="text-sm font-semibold">갤러리</span>
              </button>
            </div>
            <button onClick={() => setShowPicker(null)} className="w-full py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm">취소</button>
          </div>
        </div>
      )}

      {/* 사진 편집기 (회전/확대축소) */}
      {editImg && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-black">
            <button onClick={() => setEditImg(null)} className="text-white text-sm px-4 py-2 rounded-xl border border-white/30">취소</button>
            <p className="text-white text-sm font-semibold">사진 편집</p>
            <button onClick={handleEditSave} disabled={uploading}
              className="text-white text-sm px-4 py-2 rounded-xl bg-blue-600 disabled:opacity-50">
              {uploading ? "저장 중..." : "저장"}
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <img src={editImg.src} alt="편집"
              style={{ transform: `rotate(${rotation}deg) scale(${scale})`, maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transition: "transform 0.2s" }} />
          </div>
          <div className="bg-black px-4 py-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-white/70 text-xs w-8">회전</span>
              <button onClick={() => setRotation(r => r - 90)} className="w-11 h-11 rounded-full bg-white/20 text-white text-xl flex items-center justify-center">↺</button>
              <div className="flex-1 text-center text-white text-sm">{rotation}°</div>
              <button onClick={() => setRotation(r => r + 90)} className="w-11 h-11 rounded-full bg-white/20 text-white text-xl flex items-center justify-center">↻</button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/70 text-xs w-8">크기</span>
              <button onClick={() => setScale(s => Math.max(0.3, parseFloat((s-0.1).toFixed(1))))} className="w-11 h-11 rounded-full bg-white/20 text-white text-xl font-bold flex items-center justify-center">−</button>
              <input type="range" min="30" max="200" value={Math.round(scale*100)}
                onChange={e => setScale(parseInt(e.target.value)/100)}
                className="flex-1 accent-blue-500" />
              <button onClick={() => setScale(s => Math.min(2, parseFloat((s+0.1).toFixed(1))))} className="w-11 h-11 rounded-full bg-white/20 text-white text-xl font-bold flex items-center justify-center">+</button>
            </div>
            <div className="flex items-center justify-between text-white/60 text-xs px-1">
              <span>{Math.round(scale*100)}%</span>
              <button onClick={() => { setRotation(0); setScale(1); }} className="text-white/60 underline">원본으로</button>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="미리보기" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 text-white" onClick={() => setPreviewUrl(null)}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#2563eb" }}>{num}</span>
      {title}
    </h3>
  );
}
function FormInput({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
function LocationField({ workLatitude, onOpenLocation }: {
  workLatitude: number | null; workAddress: string; onOpenLocation: () => void; onClearLocation: () => void;
}) {
  return (
    <div>
      <button onClick={onOpenLocation}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${workLatitude ? "border-blue-400 bg-blue-50 text-blue-600" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        {workLatitude ? "위치 선택됨 (위치 변경)" : "지도에서 위치 선택 (GPS 자동설정)"}
      </button>
    </div>
  );
}
function WorkPeriodField({ startDate, endDate, startTime, endTime, onChangeStartDate, onChangeEndDate, onChangeStartTime, onChangeEndTime }: {
  startDate: string; endDate: string; startTime: string; endTime: string;
  onChangeStartDate: (v: string) => void; onChangeEndDate: (v: string) => void;
  onChangeStartTime: (v: string) => void; onChangeEndTime: (v: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="작업 시작일" required><input type="date" value={startDate} onChange={e => onChangeStartDate(e.target.value)} className={dateInputClass} style={{ colorScheme: "light" }} /></FormInput>
        <FormInput label="작업 종료일" required><input type="date" value={endDate} min={startDate} onChange={e => onChangeEndDate(e.target.value)} className={dateInputClass} style={{ colorScheme: "light" }} /></FormInput>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="작업 시작 시간" required><input type="time" value={startTime} onChange={e => onChangeStartTime(e.target.value)} className={timeInputClass} style={{ colorScheme: "light" }} /></FormInput>
        <FormInput label="작업 종료 시간" required><input type="time" value={endTime} onChange={e => onChangeEndTime(e.target.value)} className={timeInputClass} style={{ colorScheme: "light" }} /></FormInput>
      </div>
      {startDate && (
        <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700">
          📅 작업수행기간: {startDate} {startTime} ~ {endDate || startDate} {endTime}
        </div>
      )}
    </>
  );
}

interface SafetyCheckItem { label: string; applicable: string; result: string; }
function SafetyCheckTable({ items, onChange }: { items: SafetyCheckItem[]; onChange: (updated: SafetyCheckItem[]) => void }) {
  const update = (idx: number, field: keyof SafetyCheckItem, value: string) =>
    onChange(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  // 초기 마운트시 디폴트값 설정 (해당없음)
  const initialized = items.map(item => ({
    ...item,
    applicable: item.applicable || "해당없음",
  }));

  return (
    <div>
      {/* 헤더 */}
      <div className="grid grid-cols-12 gap-1 px-2 py-1.5 bg-gray-100 rounded-lg mb-1">
        <div className="col-span-5 text-xs font-medium text-gray-600">확인항목</div>
        <div className="col-span-3 text-xs font-medium text-gray-600 text-center">해당여부</div>
        <div className="col-span-4 text-xs font-medium text-gray-600 text-center">확인결과</div>
      </div>
      <div className="space-y-1">
        {initialized.map((item, idx) => {
          const isBold = item.label.startsWith("★");
          const displayLabel = item.label.replace(/^★/, "");
          const isHaedan = item.applicable === "해당";
          return (
            <div key={idx} className={`grid grid-cols-12 gap-1 items-center border rounded-xl px-2 py-1.5 ${isBold ? "bg-blue-50 border-blue-100" : "border-gray-100"}`}>
              <div className={`col-span-5 text-xs leading-tight ${isBold ? "font-bold text-gray-900" : "text-gray-700"}`}>{displayLabel}</div>
              <div className="col-span-3 flex gap-1">
                {["해당", "해당없음"].map(opt => (
                  <button key={opt} type="button"
                    onClick={() => {
                      const newItems = items.map((itm, i) => {
                        if (i !== idx) return itm;
                        const newApplicable = opt;
                        const newResult = opt === "해당"
                          ? (itm.result && itm.result !== "해당없음" ? itm.result : "조치완료")
                          : "해당없음";
                        return { ...itm, applicable: newApplicable, result: newResult };
                      });
                      onChange(newItems);
                    }}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                      (item.applicable || "해당없음") === opt
                        ? opt === "해당" ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-500 border-gray-500 text-white"
                        : "bg-white border-gray-200 text-gray-500"
                    }`}>
                    {opt === "해당없음" ? "없음" : opt}
                  </button>
                ))}
              </div>
              <div className="col-span-4">
                {isHaedan ? (
                  <input
                    type="text"
                    value={item.result === "해당없음" ? "조치완료" : (item.result || "조치완료")}
                    onChange={e => update(idx, "result", e.target.value)}
                    className="w-full px-2 py-1 border border-blue-200 rounded-lg text-[10px] text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                ) : (
                  <div className="text-[10px] text-gray-400 text-center">-</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrevDocsModal({ documentId, onSelect, onClose }: { documentId: string; onSelect: (fd: Record<string, unknown>) => void; onClose: () => void; }) {
  const [list, setList] = useState<PrevDoc[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/documents/${documentId}/previous`).then(r => r.json()).then(d => { setList(d.previousDocs ?? []); setLoading(false); });
  }, [documentId]);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-10 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">이전 문서 불러오기</h2>
          <button onClick={onClose} className="text-gray-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        {loading ? <div className="text-center py-8 text-gray-400 text-sm">불러오는 중...</div>
          : list.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm">이전 문서가 없습니다.</div>
          : <div className="space-y-2">{list.map(doc => {
              const fd = doc.formDataJson as Record<string, unknown>;
              return (
                <button key={doc.id} onClick={() => { onSelect(fd); onClose(); }}
                  className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50">
                  <div className="text-sm font-medium text-gray-900">{(fd.projectName as string) || (fd.serviceName as string) || "제목 없음"}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{(fd.workLocation as string) || ""} · {new Date(doc.createdAt).toLocaleDateString("ko-KR")}</div>
                </button>
              );
            })}</div>}
      </div>
    </div>
  );
}

function LocationPickerModal({ initialAddress, initialLat, initialLng, onConfirm, onClose }: {
  initialAddress: string; initialLat: number | null; initialLng: number | null;
  onConfirm: (address: string, lat: number, lng: number) => void; onClose: () => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [address, setAddress] = useState(initialAddress);
  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);
  const [gpsLoading, setGpsLoading] = useState(false);
  // ✅ 클로저 문제 해결: setAddress를 ref로 저장
  const setAddressRef = useRef(setAddress);
  const setLatRef = useRef(setLat);
  const setLngRef = useRef(setLng);
  useEffect(() => { setAddressRef.current = setAddress; setLatRef.current = setLat; setLngRef.current = setLng; });

  useEffect(() => {
    const initMap = () => { window.kakao.maps.load(() => setMapLoaded(true)); };
    if (window.kakao?.maps?.services) { setMapLoaded(true); return; }
    if (window.kakao?.maps) { initMap(); return; }
    const existing = document.getElementById("kakao-map-script");
    if (existing) { const check = setInterval(() => { if (window.kakao?.maps?.services) { setMapLoaded(true); clearInterval(check); } else if (window.kakao?.maps) { initMap(); clearInterval(check); } }, 200); return; }
    const script = document.createElement("script");
    script.id = "kakao-map-script";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services`;
    script.onload = initMap; document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.kakao?.maps) return;
    // ✅ 1번: GPS 없을 때 기본 위치를 대한민국 중심(서울)으로, GPS 응답 후 이동
    const defaultLat = lat ?? 36.5, defaultLng = lng ?? 127.5;
    const center = new window.kakao.maps.LatLng(defaultLat, defaultLng);
    const map = new window.kakao.maps.Map(mapRef.current, { center, level: lat ? 5 : 13 });
    mapInstanceRef.current = map;
    const marker = new window.kakao.maps.Marker({ position: center, map });
    markerRef.current = marker;
    if (!initialLat && !initialLng && navigator.geolocation) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition((pos) => {
        const gLat = pos.coords.latitude; const gLng = pos.coords.longitude;
        setLat(gLat); setLng(gLng);
        const ll = new window.kakao.maps.LatLng(gLat, gLng);
        map.setCenter(ll); map.setLevel(3); marker.setPosition(ll); // GPS 위치 확대
        if (window.kakao.maps.services) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.coord2Address(gLng, gLat, (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const addr = result[0].road_address
                ? result[0].road_address.address_name
                : result[0].address.address_name;
              setAddressRef.current(addr);
            }
          });
        }
        setGpsLoading(false);
      }, (err) => { setGpsLoading(false); console.warn("GPS 실패:", err.message); }, { timeout: 8000, enableHighAccuracy: true });
    }
    window.kakao.maps.event.addListener(map, "click", (mouseEvent: any) => {
      const latlng = mouseEvent.latLng; marker.setPosition(latlng);
      const newLat = latlng.getLat(); const newLng = latlng.getLng();
      // ✅ ref 사용으로 클로저 문제 해결
      setLatRef.current(newLat); setLngRef.current(newLng);
      if (!window.kakao.maps.services) { return; }
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(newLng, newLat, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const addr = result[0].road_address
            ? result[0].road_address.address_name
            : result[0].address.address_name;
          // ✅ ref로 최신 setter 호출 → 상단 input 주소 업데이트
          setAddressRef.current(addr);
        }
      });
    });
  }, [mapLoaded]);

  const handleAddressSearch = () => {
    const load = () => { new window.daum.Postcode({ oncomplete: (data: any) => {
      const addr = data.roadAddress || data.jibunAddress; setAddress(addr);
      const gc = new window.kakao.maps.services.Geocoder();
      gc.addressSearch(addr, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const nLat = parseFloat(result[0].y); const nLng = parseFloat(result[0].x);
          setLat(nLat); setLng(nLng);
          const ll = new window.kakao.maps.LatLng(nLat, nLng);
          mapInstanceRef.current?.setCenter(ll); markerRef.current?.setPosition(ll);
        }
      });
    }}).open(); };
    if (window.daum?.Postcode) load();
    else { const s = document.createElement("script"); s.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"; s.onload = load; document.head.appendChild(s); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">작업 위치 지정</h2>
          <button onClick={onClose} className="text-gray-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div className="p-5 pb-28 space-y-4">
          <div className="flex gap-2">
            <input type="text" value={address} readOnly className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-700" />
            <button onClick={handleAddressSearch} className="px-4 py-2.5 rounded-xl text-white text-sm font-medium" style={{ background: "#2563eb" }}>주소 검색</button>
          </div>
          {gpsLoading && (
            <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-600 flex items-center gap-2">
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              현재 위치를 가져오는 중...
            </div>
          )}
          <div className="rounded-2xl overflow-hidden border border-gray-200">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">📍 지도를 탭하면 위치 지정 · 마커 위에 주소가 표시됩니다</div>
            <div ref={mapRef} style={{ width: "100%", height: "280px" }}>
              {!mapLoaded && <div className="w-full h-full flex items-center justify-center bg-gray-50"><p className="text-sm text-gray-400">지도 로딩 중...</p></div>}
            </div>
          </div>
          {lat && lng && address && !address.match(/^[0-9]/) && (
            <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-900 font-medium flex items-center gap-2 border border-gray-200">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {address}
            </div>
          )}
          <button onClick={() => { if (lat && lng) onConfirm(address, lat, lng); }} disabled={!lat || !lng}
            className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-40" style={{ background: "#2563eb" }}>
            ✓ 위치로 설정
          </button>
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}


// 사용자 선택 모달 (감시인/측정담당자 지정용)
function UserPickerModal({ title, onSelect, onClose }: {
  title: string;
  onSelect: (user: { id: string; name: string; organization?: string }) => void;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";
    fetch(`/api/users?krcOnly=false${q}`)
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [keyword]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-5 pb-24 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={keyword} onChange={e => setKeyword(e.target.value)}
            placeholder="이름 또는 소속 검색"
            className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {loading ? (
            <div className="text-center py-8 text-sm text-gray-400">불러오는 중...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">검색 결과가 없습니다.</div>
          ) : users.map(u => (
            <button key={u.id} onClick={() => onSelect(u)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-400 hover:bg-blue-50 text-left active:bg-blue-100">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                {u.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{u.name}</div>
                {u.organization && <div className="text-xs text-gray-400 truncate">{u.organization}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApprovalSignModal({ documentId, documentType, measurerUserId, onClose, onSubmitted }: {
  documentId: string; documentType: string; measurerUserId?: string; onClose: () => void; onSubmitted: () => void;
}) {
  const [step, setStep] = useState<"approver" | "sign">("approver");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [reviewer, setReviewer] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const isConfinedModal = documentType === "CONFINED_SPACE";
  const info = DOC_TYPE_INFO[documentType] ?? DOC_TYPE_INFO.SAFETY_WORK_PERMIT;

  useEffect(() => {
    const q = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";
    fetch(`/api/users?krcOnly=true${q}`).then(r => r.json()).then(d => setUsers(d.users ?? []));
  }, [keyword]);

  useEffect(() => {
    if (step === "sign") {
      setTimeout(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext("2d"); if (!ctx) return;
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#1e3a5f"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      }, 100);
    }
  }, [step]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) return { x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width), y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height) };
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => { const canvas = canvasRef.current; if (!canvas) return; e.preventDefault(); isDrawing.current = true; const ctx = canvas.getContext("2d"); if (!ctx) return; const pos = getPos(e, canvas); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
  const draw = (e: React.MouseEvent | React.TouchEvent) => { if (!isDrawing.current) return; const canvas = canvasRef.current; if (!canvas) return; e.preventDefault(); const ctx = canvas.getContext("2d"); if (!ctx) return; const pos = getPos(e, canvas); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
  const endDraw = () => { isDrawing.current = false; };
  const clearCanvas = () => { const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); };

  const handleSubmit = async () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const signatureData = canvas.toDataURL("image/png");
    if (!reviewer) { setError(info.approverLabel + "를 선택해주세요."); return; }
    setSubmitting(true); setError("");
    try {
      const isConfined = documentType === "CONFINED_SPACE";
      const submitBody: Record<string, unknown> = { signatureData };
      if (isConfined) {
        submitBody.monitorUserId = reviewer.id;
        if (measurerUserId) submitBody.measurerUserId = measurerUserId;
      } else {
        submitBody.reviewerUserId = reviewer.id;
      }
      const res = await fetch(`/api/documents/${documentId}/approval-lines`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitBody),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "제출 실패"); }
      onSubmitted();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "오류가 발생했습니다."); }
    finally { setSubmitting(false); }
  };


  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{step === "approver" ? `결재자 지정(${info.approverLabel})` : "서명"}</h2>
          <button onClick={onClose} className="text-gray-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        {step === "approver" ? (
          <div className="p-5 pb-24">
            <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">{`${info.approverLabel}에게 결재 요청이 전송됩니다.`}</div>
            <div className={`p-3 rounded-xl border-2 mb-4 ${reviewer ? "border-blue-400 bg-blue-50" : "border-dashed border-gray-300"}`}>
              <div className="text-xs text-gray-500 mb-1">{info.approverLabel} <span className="text-red-500">*</span></div>
              {reviewer ? (
                <div className="flex items-center justify-between">
                  <div><span className="text-sm font-medium text-gray-900">{reviewer.name}</span><span className="text-xs text-gray-500 ml-2">{reviewer.organization}</span></div>
                  <button onClick={() => setReviewer(null)} className="text-gray-400 hover:text-red-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
              ) : <p className="text-xs text-gray-400">아래 목록에서 선택해주세요</p>}
            </div>
            <div className="relative mb-2">
              <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="이름으로 검색"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto mb-4">
              {users.filter(u => u.id !== reviewer?.id).map(u => (
                <button key={u.id} onClick={() => setReviewer(u)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-blue-400 hover:bg-blue-50 text-left">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">{u.name[0]}</div>
                  <div><div className="text-sm font-medium text-gray-900">{u.name}</div><div className="text-xs text-gray-500">{u.organization}</div></div>
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <button onClick={() => { if (!reviewer) { setError(info.approverLabel + "를 선택해주세요."); return; } setError(""); setStep("sign"); }}
              disabled={!reviewer} className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50" style={{ background: "#2563eb" }}>
              다음 - 서명하기
            </button>
          </div>
        ) : (
          <div className="p-5 pb-24">
            <p className="text-sm text-gray-600 mb-4">아래에 서명해주세요.</p>
            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden mb-3 bg-white">
              <canvas ref={canvasRef} width={600} height={200} className="w-full touch-none" style={{ cursor: "crosshair", touchAction: "none" }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={clearCanvas} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">서명 지우기</button>
              <button onClick={() => setStep("approver")} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">이전으로</button>
            </div>
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50" style={{ background: "#2563eb" }}>
              {submitting ? "제출 중..." : "서명 완료 및 제출"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Form 타입 정의 =====
interface RiskRow { riskFactor: string; improvement: string; disasterType: string; }
interface Form1 {
  requestDate: string; workStartDate: string; workEndDate: string; workStartTime: string; workEndTime: string;
  projectName: string; applicantCompany: string; applicantTitle: string; applicantName: string;
  workLocation: string; workContent: string; participants: string; facilityName: string;
  riskHighPlace: boolean; riskHighPlaceDetail: string; riskHighPlaceItems: string[];
  riskWaterWork: boolean; riskWaterWorkDetail: string; riskWaterWorkItems: string[];
  riskConfinedSpace: boolean; riskConfinedSpaceDetail: string;
  riskPowerOutage: boolean; riskPowerOutageDetail: string;
  riskFireWork: boolean; riskFireWorkDetail: string;
  riskOther: boolean; riskOtherDetail: string;
  factorNarrowAccess: boolean; factorSlippery: boolean; factorSteepSlope: boolean; factorWaterHazard: boolean;
  factorRockfall: boolean; factorNoRailing: boolean; factorLadderNoGuard: boolean; factorSuffocation: boolean;
  factorElectricFire: boolean; factorSparkFire: boolean; factorOther: boolean; factorOtherDetail: string;
  riskRows: RiskRow[]; reviewOpinion: string; reviewResult: string;
  riskAssessRows: RiskAssessRow[];
}
const defaultForm1: Form1 = {
  requestDate: new Date().toISOString().split("T")[0],
  workStartDate: "", workEndDate: "", workStartTime: "09:00", workEndTime: "18:00",
  projectName: "", applicantCompany: "", applicantTitle: "", applicantName: "",
  workLocation: "", workContent: "", participants: "", facilityName: "",
  riskHighPlace: false, riskHighPlaceDetail: "", riskHighPlaceItems: [],
  riskWaterWork: false, riskWaterWorkDetail: "", riskWaterWorkItems: [],
  riskConfinedSpace: false, riskConfinedSpaceDetail: "",
  riskPowerOutage: false, riskPowerOutageDetail: "",
  riskFireWork: false, riskFireWorkDetail: "",
  riskOther: false, riskOtherDetail: "",
  factorNarrowAccess: false, factorSlippery: false, factorSteepSlope: false, factorWaterHazard: false,
  factorRockfall: false, factorNoRailing: false, factorLadderNoGuard: false, factorSuffocation: false,
  factorElectricFire: false, factorSparkFire: false, factorOther: false, factorOtherDetail: "",
  riskRows: [
    { riskFactor: "", improvement: "", disasterType: "" },
    { riskFactor: "", improvement: "", disasterType: "" },
    { riskFactor: "", improvement: "", disasterType: "" },
  ], reviewOpinion: "", reviewResult: "",
  riskAssessRows: [{ ...defaultRiskAssessRow }],
};

function toggleArrItem(field: string, item: string, currentArr: string[], onChange: (k: string, v: unknown) => void) {
  const exists = currentArr.includes(item);
  onChange(field, exists ? currentArr.filter(i => i !== item) : [...currentArr, item]);
}

function Form1Fields({ form, onChange, onSave, workLatitude, workAddress, onOpenLocation, onClearLocation, taskName, documentId }: {
  form: Form1; onChange: (k: string, v: unknown) => void; onSave?: () => void;
  workLatitude: number | null; workAddress: string; onOpenLocation: () => void; onClearLocation: () => void;
  taskName: string; documentId: string;
}) {
  const updateRow = (idx: number, f: keyof RiskRow, v: string) =>
    onChange("riskRows", form.riskRows.map((r, i) => i === idx ? { ...r, [f]: v } : r));

  const factors = [
    { key: "factorNarrowAccess", label: "진출입로 협소" },
    { key: "factorSlippery", label: "미끌러집(이끼기, 습기)" },
    { key: "factorSteepSlope", label: "급경사" },
    { key: "factorWaterHazard", label: "파랑‧유수‧수심" },
    { key: "factorRockfall", label: "낙석‧토사붕괴" },
    { key: "factorNoRailing", label: "난간 미설치" },
    { key: "factorLadderNoGuard", label: "사다리‧방호울 미설치" },
    { key: "factorSuffocation", label: "질식·화재·폭발" },
    { key: "factorElectricFire", label: "감전·전기불꽃 화재" },
    { key: "factorSparkFire", label: "스파크, 화염에 의한 화재" },
    { key: "factorOther", label: "기타" },
  ];

  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={1} title="작업허가 신청개요" />
        <div className="space-y-3">
          <FormInput label="신청일" required>
            <input type="date" value={form.requestDate} onChange={e => onChange("requestDate", e.target.value)} className={dateInputClass} style={{ colorScheme: "light" }} />
          </FormInput>
          <WorkPeriodField
            startDate={form.workStartDate} endDate={form.workEndDate}
            startTime={form.workStartTime} endTime={form.workEndTime}
            onChangeStartDate={v => onChange("workStartDate", v)} onChangeEndDate={v => onChange("workEndDate", v)}
            onChangeStartTime={v => onChange("workStartTime", v)} onChangeEndTime={v => onChange("workEndTime", v)}
          />
          <FormInput label="용역명">
            <input type="text" value={taskName} readOnly className="w-full px-3 py-3 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-600" />
          </FormInput>
          <div className="grid grid-cols-3 gap-2">
            <FormInput label="업체명"><input type="text" value={form.applicantCompany} onChange={e => onChange("applicantCompany", e.target.value)} className={inputClass} /></FormInput>
            <FormInput label="직책"><input type="text" value={form.applicantTitle} onChange={e => onChange("applicantTitle", e.target.value)} className={inputClass} /></FormInput>
            <FormInput label="성명" required><input type="text" value={form.applicantName} onChange={e => onChange("applicantName", e.target.value)} className={inputClass} /></FormInput>
          </div>
          <FormInput label="작업장소" required>
            <input type="text" value={form.workLocation} onChange={e => onChange("workLocation", e.target.value)} className={inputClass + " mb-1.5"} />
            <LocationField workLatitude={workLatitude} workAddress={workAddress} onOpenLocation={onOpenLocation} onClearLocation={onClearLocation} />
          </FormInput>
          <FormInput label="시설물명"><input type="text" value={form.facilityName||""} onChange={e => onChange("facilityName", e.target.value)} className={inputClass} placeholder="시설물명을 입력하세요" /></FormInput>
          <FormInput label="작업 내용" required><textarea value={form.workContent} onChange={e => onChange("workContent", e.target.value)} rows={3} className={textareaClass} /></FormInput>
          <FormInput label="작업참여자"><textarea value={form.participants} onChange={e => onChange("participants", e.target.value)} rows={2} className={textareaClass} /></FormInput>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={2} title="위험공종 체크 (해당 항목 체크)" />
        <div className="space-y-3">
          <div>
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={!!form.riskHighPlace} onChange={e => onChange("riskHighPlace", e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-gray-300" />
              <span className="text-sm font-medium text-gray-700">2.0m 이상 고소작업</span>
            </label>
            {form.riskHighPlace && (
              <div className="ml-6 mt-2 bg-blue-50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs text-blue-600 font-medium mb-1">📍 관련작업(장소) 선택:</p>
                {HIGH_PLACE_ITEMS.map(item => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={(form.riskHighPlaceItems || []).includes(item)}
                      onChange={() => toggleArrItem("riskHighPlaceItems", item, form.riskHighPlaceItems || [], onChange)}
                      className="w-3.5 h-3.5 rounded text-blue-600 border-gray-300" />
                    <span className="text-xs text-gray-700">{item}</span>
                  </label>
                ))}
                <input type="text" value={form.riskHighPlaceDetail || ""} onChange={e => onChange("riskHighPlaceDetail", e.target.value)}
                  placeholder="기타 직접 입력..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 mt-1" />
              </div>
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={!!form.riskWaterWork} onChange={e => onChange("riskWaterWork", e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-gray-300" />
              <span className="text-sm font-medium text-gray-700">수상 또는 수변작업</span>
            </label>
            {form.riskWaterWork && (
              <div className="ml-6 mt-2 bg-blue-50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs text-blue-600 font-medium mb-1">📍 관련작업(장소) 선택:</p>
                {WATER_WORK_ITEMS.map(item => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={(form.riskWaterWorkItems || []).includes(item)}
                      onChange={() => toggleArrItem("riskWaterWorkItems", item, form.riskWaterWorkItems || [], onChange)}
                      className="w-3.5 h-3.5 rounded text-blue-600 border-gray-300" />
                    <span className="text-xs text-gray-700">{item}</span>
                  </label>
                ))}
                <input type="text" value={form.riskWaterWorkDetail || ""} onChange={e => onChange("riskWaterWorkDetail", e.target.value)}
                  placeholder="기타 직접 입력..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 mt-1" />
              </div>
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={!!form.riskConfinedSpace} onChange={e => onChange("riskConfinedSpace", e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-gray-300" />
              <span className="text-sm font-medium text-gray-700">밀폐공간(협소포함)작업</span>
            </label>
            {form.riskConfinedSpace && (
              <input type="text" value={form.riskConfinedSpaceDetail || ""} onChange={e => onChange("riskConfinedSpaceDetail", e.target.value)}
                placeholder="관련작업(장소) 입력..." className={"ml-6 mt-1 " + inputClass} />
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={!!form.riskPowerOutage} onChange={e => onChange("riskPowerOutage", e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-gray-300" />
              <span className="text-sm font-medium text-gray-700">정전작업</span>
            </label>
            {form.riskPowerOutage && (
              <input type="text" value={form.riskPowerOutageDetail || ""} onChange={e => onChange("riskPowerOutageDetail", e.target.value)}
                placeholder="관련작업(장소) 입력..." className={"ml-6 mt-1 " + inputClass} />
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={!!form.riskFireWork} onChange={e => onChange("riskFireWork", e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-gray-300" />
              <span className="text-sm font-medium text-gray-700">화기작업</span>
            </label>
            {form.riskFireWork && (
              <input type="text" value={form.riskFireWorkDetail || ""} onChange={e => onChange("riskFireWorkDetail", e.target.value)}
                placeholder="관련작업(장소) 입력..." className={"ml-6 mt-1 " + inputClass} />
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={!!form.riskOther} onChange={e => onChange("riskOther", e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-gray-300" />
              <span className="text-sm font-medium text-gray-700">기타(별지에 별기재)</span>
            </label>
            {form.riskOther && (
              <input type="text" value={form.riskOtherDetail || ""} onChange={e => onChange("riskOtherDetail", e.target.value)}
                placeholder="기타 내용 입력..." className={"ml-6 mt-1 " + inputClass} />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={3} title="발생하는 위험요소 (해당 항목 체크)" />
        <div className="grid grid-cols-2 gap-1">
          {factors.map(item => (
            <label key={item.key} className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={!!(form as any)[item.key]} onChange={e => onChange(item.key, e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-gray-300" />
              <span className="text-xs text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>
        {form.factorOther && (
          <input type="text" value={form.factorOtherDetail} onChange={e => onChange("factorOtherDetail", e.target.value)}
            placeholder="기타 위험요소 입력" className={inputClass + " mt-2"} />
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={4} title="위험요소 · 개선대책 · 재해형태" />
        <AiRiskRowsButton form={form} onChange={onChange} onSave={onSave} />
        <div className="grid grid-cols-12 gap-1 px-2 py-1.5 bg-gray-100 rounded-lg mb-2">
          <div className="col-span-5 text-xs font-medium text-gray-600">위험요소</div>
          <div className="col-span-4 text-xs font-medium text-gray-600">개선대책</div>
          <div className="col-span-2 text-xs font-medium text-gray-600">재해형태</div>
          <div className="col-span-1"></div>
        </div>
        <div className="space-y-2 mb-3">
          {form.riskRows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-1 items-start">
              <textarea value={row.riskFactor} onChange={e => updateRow(idx, "riskFactor", e.target.value)} rows={2}
                className="col-span-5 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <textarea value={row.improvement} onChange={e => updateRow(idx, "improvement", e.target.value)} rows={2}
                className="col-span-4 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <input type="text" value={row.disasterType} onChange={e => updateRow(idx, "disasterType", e.target.value)}
                className="col-span-2 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <button onClick={() => { if (form.riskRows.length > 1) onChange("riskRows", form.riskRows.filter((_, i) => i !== idx)); }}
                disabled={form.riskRows.length <= 1}
                className="col-span-1 flex items-center justify-center text-gray-300 hover:text-red-400 disabled:opacity-20 pt-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => onChange("riskRows", [...form.riskRows, { riskFactor: "", improvement: "", disasterType: "" }])}
          className="w-full py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          행 추가
        </button>
      </div>

      <RiskAssessSection documentId={documentId} riskAssessRows={form.riskAssessRows || [{ ...defaultRiskAssessRow }]} onChangeRows={rows => onChange("riskAssessRows", rows)} />
      <PhotoAttachSection documentId={documentId} canAdd={true} />
    </>
  );
}

// ===== 붙임2/3/4 Forms =====
const CONFINED_CHECKS: SafetyCheckItem[] = [
  { label: "안전담당자지정 및 감시인 배치", applicable: "해당없음", result: "" },
  { label: "밸브차단, 맹판설치, 불활성가스 치환, 용기세정", applicable: "해당없음", result: "" },
  { label: "●측정자의 자격조건 확인", applicable: "해당없음", result: "" },
  { label: "산소농도 및 유해가스농도 (계속)측정", applicable: "해당없음", result: "" },
  { label: "환기시설 설치", applicable: "해당없음", result: "" },
  { label: "전화 및 무선기기 구비", applicable: "해당없음", result: "" },
  { label: "방폭형 전기기계기구의 사용", applicable: "해당없음", result: "" },
  { label: "소화기 비치", applicable: "해당없음", result: "" },
  { label: "●관계자외 출입차단 금지 조치", applicable: "해당없음", result: "" },
  { label: "공기공급식 호흡용보호구, 보호복, 보호장갑 등 비치", applicable: "해당없음", result: "" },
  { label: "대피용 기구 및 응급구조장비 구비", applicable: "해당없음", result: "" },
  { label: "작업 전 안전교육 실시(TBM 등)", applicable: "해당없음", result: "" },
  { label: "●특별교육 이수", applicable: "해당없음", result: "" },
];
interface GasMeasureRow { time: string; hour: string; minute: string; substances: string; measurer: string; entryCount: string; exitCount: string; }
interface Form2 {
  requestDate: string; workStartDate: string; workEndDate: string; workStartTime: string; workEndTime: string;
  serviceName: string; applicantCompany: string; applicantTitle: string; applicantName: string;
  workLocation: string; workContent: string; entryList: string; facilityName: string;
  needFireWork: string; useInternalEngine: string; safetyChecks: SafetyCheckItem[];
  gasMeasureRows: GasMeasureRow[]; specialMeasures: string;
  monitorName: string; monitorUserId: string;
  measurerName: string; measurerUserId: string;
}
const defaultGasMeasureRows: GasMeasureRow[] = [
  { time: "전", hour: "", minute: "", substances: "", measurer: "", entryCount: "", exitCount: "" },
  { time: "중*", hour: "", minute: "", substances: "", measurer: "", entryCount: "", exitCount: "" },
  { time: "후", hour: "", minute: "", substances: "", measurer: "", entryCount: "", exitCount: "" },
];
const defaultForm2: Form2 = {
  requestDate: new Date().toISOString().split("T")[0], workStartDate: "", workEndDate: "", workStartTime: "09:00", workEndTime: "18:00",
  serviceName: "", applicantCompany: "", applicantTitle: "", applicantName: "", workLocation: "", workContent: "", entryList: "", facilityName: "",
  needFireWork: "", useInternalEngine: "", safetyChecks: CONFINED_CHECKS.map(c => ({ ...c })),
  gasMeasureRows: defaultGasMeasureRows.map(r => ({ ...r })), specialMeasures: "",
  monitorName: "", monitorUserId: "", measurerName: "", measurerUserId: "",
};

// 밀폐공간 감시인/측정담당자 선택 컴포넌트
function ConfinedPersonPicker({ form, onChange }: {
  form: Form2;
  onChange: (k: string, v: unknown) => void;
}) {
  const [showMonitorPicker, setShowMonitorPicker] = useState(false);
  const [showMeasurerPicker, setShowMeasurerPicker] = useState(false);

  return (
    <>
      <div className="bg-blue-50 rounded-xl p-3 space-y-3">
        <p className="text-xs font-semibold text-blue-700">👤 감시인 및 측정담당자 지정</p>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">감시인 <span className="text-red-500">*</span></label>
          <button onClick={() => setShowMonitorPicker(true)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${form.monitorUserId ? "border-blue-400 bg-white text-gray-900" : "border-gray-300 bg-white text-gray-400"}`}>
            <span>{form.monitorName || "감시인 선택"}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">측정담당자 <span className="text-red-500">*</span></label>
          <button onClick={() => setShowMeasurerPicker(true)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${form.measurerUserId ? "border-blue-400 bg-white text-gray-900" : "border-gray-300 bg-white text-gray-400"}`}>
            <span>{form.measurerName || "측정담당자 선택"}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
      {showMonitorPicker && (
        <UserPickerModal title="감시인 선택"
          onSelect={u => { onChange("monitorName", u.name); onChange("monitorUserId", u.id); setShowMonitorPicker(false); }}
          onClose={() => setShowMonitorPicker(false)} />
      )}
      {showMeasurerPicker && (
        <UserPickerModal title="측정담당자 선택"
          onSelect={u => { onChange("measurerName", u.name); onChange("measurerUserId", u.id); setShowMeasurerPicker(false); }}
          onClose={() => setShowMeasurerPicker(false)} />
      )}
    </>
  );
}

function Form2Fields({ form, onChange, workLatitude, workAddress, onOpenLocation, onClearLocation, taskName, documentId }: {
  form: Form2; onChange: (k: string, v: unknown) => void;
  workLatitude: number | null; workAddress: string; onOpenLocation: () => void; onClearLocation: () => void;
  taskName: string; documentId: string;
}) {
  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={1} title="기본정보" />
        <div className="space-y-3">
          <FormInput label="신청일" required><input type="date" value={form.requestDate} onChange={e => onChange("requestDate", e.target.value)} className={dateInputClass} style={{ colorScheme: "light" }} /></FormInput>
          <WorkPeriodField startDate={form.workStartDate} endDate={form.workEndDate} startTime={form.workStartTime} endTime={form.workEndTime}
            onChangeStartDate={v => onChange("workStartDate", v)} onChangeEndDate={v => onChange("workEndDate", v)}
            onChangeStartTime={v => onChange("workStartTime", v)} onChangeEndTime={v => onChange("workEndTime", v)} />
          <FormInput label="용역명"><input type="text" value={taskName} readOnly className="w-full px-3 py-3 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-600" /></FormInput>
          <div className="grid grid-cols-3 gap-2">
            <FormInput label="업체명"><input type="text" value={form.applicantCompany} onChange={e => onChange("applicantCompany", e.target.value)} className={inputClass} /></FormInput>
            <FormInput label="직책"><input type="text" value={form.applicantTitle} onChange={e => onChange("applicantTitle", e.target.value)} className={inputClass} /></FormInput>
            <FormInput label="성명" required><input type="text" value={form.applicantName} onChange={e => onChange("applicantName", e.target.value)} className={inputClass} /></FormInput>
          </div>
          <FormInput label="작업 장소" required>
            <input type="text" value={form.workLocation} onChange={e => onChange("workLocation", e.target.value)} className={inputClass + " mb-1.5"} />
            <LocationField workLatitude={workLatitude} workAddress={workAddress} onOpenLocation={onOpenLocation} onClearLocation={onClearLocation} />
          </FormInput>
          <FormInput label="시설물명"><input type="text" value={form.facilityName||""} onChange={e => onChange("facilityName", e.target.value)} className={inputClass} placeholder="시설물명을 입력하세요" /></FormInput>
          <FormInput label="작업 내용" required><textarea value={form.workContent} onChange={e => onChange("workContent", e.target.value)} rows={3} className={textareaClass} /></FormInput>
          <FormInput label="출입자 명단"><textarea value={form.entryList} onChange={e => onChange("entryList", e.target.value)} rows={2} className={textareaClass} /></FormInput>
          <ConfinedPersonPicker form={form} onChange={onChange} />
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={2} title="허가 조건" />
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">화기작업 허가 필요여부</label>
            <div className="flex gap-4">{["필요", "불필요"].map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="needFireWork2" value={opt} checked={form.needFireWork === opt} onChange={() => onChange("needFireWork", opt)} className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">내연기관(발전기 등) 사용여부</label>
            <div className="flex gap-4">{["사용", "미사용"].map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="useInternalEngine2" value={opt} checked={form.useInternalEngine === opt} onChange={() => onChange("useInternalEngine", opt)} className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={3} title="안전조치 요구사항" />
        <SafetyCheckTable items={form.safetyChecks} onChange={updated => onChange("safetyChecks", updated)} />
      </div>
      {/* 측정결과/특별조치는 결재 단계에서 입력 - 신청 단계 숨김 */}
      <PhotoAttachSection documentId={documentId} canAdd={true} />
    </>
  );
}

interface Participant3 { role: string; name: string; phone: string; }
interface Form3 {
  requestDate: string; workStartDate: string; workEndDate: string; workStartTime: string; workEndTime: string;
  serviceName: string; contractorCompany: string; contractPeriodStart: string; contractPeriodEnd: string;
  facilityName: string; facilityLocation: string; facilityAddress: string; facilityManager: string; facilityManagerGrade: string;
  workPosition: string; workContents: string; participants: Participant3[];
  riskFactors: string; improvementMeasures: string; reviewOpinion: string; reviewResult: string;
  applicantName: string; applicantOrg: string;
}
const defaultForm3: Form3 = {
  requestDate: new Date().toISOString().split("T")[0], workStartDate: "", workEndDate: "", workStartTime: "09:00", workEndTime: "18:00",
  serviceName: "", contractorCompany: "", contractPeriodStart: "", contractPeriodEnd: "",
  facilityName: "", facilityLocation: "", facilityAddress: "", facilityManager: "", facilityManagerGrade: "",
  workPosition: "", workContents: "",
  participants: [{ role: "안전보건관리책임자", name: "", phone: "" }, { role: "현장참여직원", name: "", phone: "" }, { role: "시설관리자", name: "", phone: "" }],
  riskFactors: "", improvementMeasures: "", reviewOpinion: "", reviewResult: "", applicantName: "", applicantOrg: "",
};
function Form3Fields({ form, onChange, workLatitude, workAddress, onOpenLocation, onClearLocation, taskName, documentId }: {
  form: Form3; onChange: (k: string, v: unknown) => void;
  workLatitude: number | null; workAddress: string; onOpenLocation: () => void; onClearLocation: () => void;
  taskName: string; documentId: string;
}) {
  const updateP = (idx: number, f: keyof Participant3, v: string) =>
    onChange("participants", form.participants.map((p, i) => i === idx ? { ...p, [f]: v } : p));
  const [aiLoading, setAiLoading] = useState(false);
  const handleAiRisk = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/risk-rows", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workContent: form.workContents || "",
          workLocation: (form as any).facilityAddress || form.facilityLocation || form.workPosition || "",
          riskItems: [],
          checkedFactors: [],
        }),
      });
      const data = await res.json();
      // risk-rows API는 rows 배열 반환 - 텍스트로 변환
      if (Array.isArray(data.rows) && data.rows.length > 0) {
        const risks = data.rows.map((r: any, i: number) => (i+1) + ". " + (r.riskFactor || "")).join("\n");
        const measures = data.rows.map((r: any, i: number) => (i+1) + ". " + (r.improvement || "")).join("\n");
        onChange("riskFactors", risks);
        onChange("improvementMeasures", measures);
      }
    } catch (e) { console.error("AI error:", e); alert("AI 생성 실패"); }
    finally { setAiLoading(false); }
  };
  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={1} title="용역 개요" />
        <div className="space-y-3">
          <FormInput label="신고일" required><input type="date" value={form.requestDate} onChange={e => onChange("requestDate", e.target.value)} className={dateInputClass} style={{ colorScheme: "light" }} /></FormInput>
          <WorkPeriodField startDate={form.workStartDate} endDate={form.workEndDate} startTime={form.workStartTime} endTime={form.workEndTime}
            onChangeStartDate={v => onChange("workStartDate", v)} onChangeEndDate={v => onChange("workEndDate", v)}
            onChangeStartTime={v => onChange("workStartTime", v)} onChangeEndTime={v => onChange("workEndTime", v)} />
          <FormInput label="용역명" required><input type="text" value={taskName} readOnly className="w-full px-3 py-3 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-600" /></FormInput>
          <FormInput label="시공사업체명"><input type="text" value={form.contractorCompany} onChange={e => onChange("contractorCompany", e.target.value)} className={inputClass} placeholder="예) (주)한국건설" /></FormInput>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="용역기간 시작"><input type="date" value={form.contractPeriodStart} onChange={e => onChange("contractPeriodStart", e.target.value)} className={dateInputClass} style={{ colorScheme: "light" }} /></FormInput>
            <FormInput label="용역기간 종료"><input type="date" value={form.contractPeriodEnd} onChange={e => onChange("contractPeriodEnd", e.target.value)} className={dateInputClass} style={{ colorScheme: "light" }} /></FormInput>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={2} title="휴일작업 개요" />
        <div className="space-y-3">
          <FormInput label="작업대상 시설물" required>
            <input type="text" value={form.facilityName} onChange={e => onChange("facilityName", e.target.value)} className={inputClass} placeholder="예) OO저수지" />
          </FormInput>
          <FormInput label="시설물 위치 (상세주소)">
            <input type="text" value={form.facilityLocation || ""} onChange={e => onChange("facilityLocation", e.target.value)} className={inputClass + " mb-1.5"} placeholder="지도에서 선택하면 자동입력" />
            <LocationField workLatitude={workLatitude} workAddress={workAddress} onOpenLocation={onOpenLocation} onClearLocation={onClearLocation} />
          </FormInput>
          <FormInput label="시설 관리자">
            <input type="text" value={form.facilityManager} onChange={e => onChange("facilityManager", e.target.value)} className={inputClass} placeholder="예) OO지사 OO급 홍길동" />
          </FormInput>
          <FormInput label="작업위치">
            <input type="text" value={form.workPosition} onChange={e => onChange("workPosition", e.target.value)} className={inputClass} placeholder="예) 여수로" />
          </FormInput>
          <FormInput label="작업공종">
            <textarea value={form.workContents} onChange={e => onChange("workContents", e.target.value)} rows={3} className={textareaClass} placeholder={"예) 방수로 옹벽 재료조사감세공 제원 및 외관조사"} />
          </FormInput>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={3} title="휴일작업 참여자" />
        <div className="space-y-2 mb-3">
          {form.participants.map((p, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <select value={p.role} onChange={e => updateP(idx, "role", e.target.value)} className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-700 bg-white focus:outline-none">
                  <option>안전보건관리책임자</option><option>참여기술인</option><option>현장인부</option>
                </select>
                {idx >= 1 && <button onClick={() => onChange("participants", form.participants.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormInput label="성명"><input type="text" value={p.name} onChange={e => updateP(idx, "name", e.target.value)} className={inputClass} /></FormInput>
                <FormInput label="연락체"><input type="tel" value={p.phone} onChange={e => updateP(idx, "phone", e.target.value)} placeholder="010-0000-0000" className={inputClass} /></FormInput>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => onChange("participants", [...form.participants, { role: "참여기술인", name: "", phone: "" }])}
          className="w-full py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>참여자 추가
        </button>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={4} title="위험요소 및 개선대유" />
        <div className="space-y-3">
          <button onClick={handleAiRisk} disabled={aiLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}>
            {aiLoading ? "AI 생성 중..." : "✨ AI 위험요소/개선대유 자동 작성"}
          </button>
          <FormInput label="위험요소 (위험성 평가 결과 요약)">
            <textarea value={form.riskFactors} onChange={e => onChange("riskFactors", e.target.value)} rows={3} className={textareaClass} placeholder="예) 1. 급류부 조사시 미끄러짐 2. 고소작업 중 추락 3. 장비 협착 위험" />
          </FormInput>
          <FormInput label="개선대유 (개선대유 결과 요약)">
            <textarea value={form.improvementMeasures} onChange={e => onChange("improvementMeasures", e.target.value)} rows={3} className={textareaClass} placeholder="예) 1. 안전난간에 안전로프 설치 2. 안전모·안전벨트 착용 3. 신호수 배치" />
          </FormInput>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={5} title="신청자 정보" />
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="신청자 성명" required><input type="text" value={form.applicantName} onChange={e => onChange("applicantName", e.target.value)} className={inputClass} /></FormInput>
          <FormInput label="소속"><input type="text" value={form.applicantOrg} onChange={e => onChange("applicantOrg", e.target.value)} className={inputClass} /></FormInput>
        </div>
      </div>
      <PhotoAttachSection documentId={documentId} canAdd={true} />
    </>
  );
}


const POWER_CHECKS = [
  { label: "회로차단 안전차단 확인", applicable: "해당없음", result: "" },
  { label: "비상차단장치 확인", applicable: "해당없음", result: "" },
  { label: "잠금조치", applicable: "해당없음", result: "" },
  { label: "작업차단 장치", applicable: "해당없음", result: "" },
  { label: "차단장치 감시", applicable: "해당없음", result: "" },
  { label: "잔류전압 제거", applicable: "해당없음", result: "" },
  { label: "접지선으로 접지 확인", applicable: "해당없음", result: "" },
  { label: "작업범위 보호판 설치", applicable: "해당없음", result: "" },
  { label: "당일 안전차단 확인", applicable: "해당없음", result: "" },
];
interface InspectionItem { equipment: string; cutoffConfirmer: string; electrician: string; siteRepair: string; }
interface Form4 {
  requestDate: string; workStartDate: string; workEndDate: string; workStartTime: string; workEndTime: string;
  serviceName: string; applicantCompany: string; applicantTitle: string; applicantName: string;
  workLocation: string; workContent: string; entryList: string; facilityName: string;
  needConfinedSpace: string; needFireWork: string; safetyChecks: SafetyCheckItem[];
  inspectionItems: InspectionItem[]; specialMeasures: string;
}
const defaultForm4: Form4 = {
  requestDate: new Date().toISOString().split("T")[0], workStartDate: "", workEndDate: "", workStartTime: "09:00", workEndTime: "18:00",
  serviceName: "", applicantCompany: "", applicantTitle: "", applicantName: "", workLocation: "", workContent: "", entryList: "", facilityName: "",
  needConfinedSpace: "", needFireWork: "", safetyChecks: POWER_CHECKS.map(c => ({ ...c })),
  inspectionItems: [{ equipment: "", cutoffConfirmer: "", electrician: "", siteRepair: "" }], specialMeasures: "",
};

function Form4Fields({ form, onChange, workLatitude, workAddress, onOpenLocation, onClearLocation, taskName, documentId }: {
  form: Form4; onChange: (k: string, v: unknown) => void;
  workLatitude: number | null; workAddress: string; onOpenLocation: () => void; onClearLocation: () => void;
  taskName: string; documentId: string;
}) {
  const updateInsp = (idx: number, f: keyof InspectionItem, v: string) =>
    onChange("inspectionItems", form.inspectionItems.map((m, i) => i === idx ? { ...m, [f]: v } : m));
  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={1} title="기본정보" />
        <div className="space-y-3">
          <FormInput label="신청일" required><input type="date" value={form.requestDate} onChange={e => onChange("requestDate", e.target.value)} className={dateInputClass} style={{ colorScheme: "light" }} /></FormInput>
          <WorkPeriodField startDate={form.workStartDate} endDate={form.workEndDate} startTime={form.workStartTime} endTime={form.workEndTime}
            onChangeStartDate={v => onChange("workStartDate", v)} onChangeEndDate={v => onChange("workEndDate", v)}
            onChangeStartTime={v => onChange("workStartTime", v)} onChangeEndTime={v => onChange("workEndTime", v)} />
          <FormInput label="용역명"><input type="text" value={taskName} readOnly className="w-full px-3 py-3 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-600" /></FormInput>
          <div className="grid grid-cols-3 gap-2">
            <FormInput label="업체명"><input type="text" value={form.applicantCompany} onChange={e => onChange("applicantCompany", e.target.value)} className={inputClass} /></FormInput>
            <FormInput label="직책"><input type="text" value={form.applicantTitle} onChange={e => onChange("applicantTitle", e.target.value)} className={inputClass} /></FormInput>
            <FormInput label="성명" required><input type="text" value={form.applicantName} onChange={e => onChange("applicantName", e.target.value)} className={inputClass} /></FormInput>
          </div>
          <FormInput label="작업 장소" required>
            <input type="text" value={form.workLocation} onChange={e => onChange("workLocation", e.target.value)} className={inputClass + " mb-1.5"} />
            <LocationField workLatitude={workLatitude} workAddress={workAddress} onOpenLocation={onOpenLocation} onClearLocation={onClearLocation} />
          </FormInput>
          <FormInput label="시설물명"><input type="text" value={form.facilityName||""} onChange={e => onChange("facilityName", e.target.value)} className={inputClass} placeholder="시설물명을 입력해주세요" /></FormInput>
          <FormInput label="작업 내용" required><textarea value={form.workContent} onChange={e => onChange("workContent", e.target.value)} rows={3} className={textareaClass} /></FormInput>
          <FormInput label="출입자 명단"><textarea value={form.entryList} onChange={e => onChange("entryList", e.target.value)} rows={2} className={textareaClass} /></FormInput>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={2} title="허가 조건" />
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">밀폐공간작업 허가 필요여부</label>
            <div className="flex gap-4">{["필요", "불필요"].map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="needConfinedSpace4" value={opt} checked={form.needConfinedSpace === opt} onChange={() => onChange("needConfinedSpace", opt)} className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">화기작업 허가 필요여부</label>
            <div className="flex gap-4">{["필요", "불필요"].map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="needFireWork4" value={opt} checked={form.needFireWork === opt} onChange={() => onChange("needFireWork", opt)} className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={3} title="안전조치 이행사항" />
        <SafetyCheckTable items={form.safetyChecks} onChange={updated => onChange("safetyChecks", updated)} />
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={4} title="점검 확인 결과" />
        <div className="grid grid-cols-4 gap-1 px-2 py-1.5 bg-gray-100 rounded-lg mb-2">
          {["점검기기", "차단확인자", "전기담당자", "현장정비"].map(h => (
            <div key={h} className="text-xs font-medium text-gray-600 text-center">{h}</div>
          ))}
        </div>
        <div className="space-y-2 mb-3">
          {form.inspectionItems.map((item, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-1 items-center">
              {(["equipment", "cutoffConfirmer", "electrician", "siteRepair"] as (keyof InspectionItem)[]).map(f => (
                <input key={f} type="text" value={item[f]} onChange={e => updateInsp(idx, f, e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
              ))}
            </div>
          ))}
        </div>
        <button onClick={() => onChange("inspectionItems", [...form.inspectionItems, { equipment: "", cutoffConfirmer: "", electrician: "", siteRepair: "" }])}
          className="w-full py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          행 추가
        </button>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={5} title="특별조치 필요사항" />
        <textarea value={form.specialMeasures} onChange={e => onChange("specialMeasures", e.target.value)} rows={3} className={textareaClass} placeholder="계획확인 허가자가 작성하는 항목입니다" />
      </div>
      <PhotoAttachSection documentId={documentId} canAdd={true} />
    </>
  );
}

function buildFormData(dt: string, f1: Form1, f2: Form2, f3: Form3, f4: Form4) {
  if (dt === "SAFETY_WORK_PERMIT") return { ...f1 };
  if (dt === "CONFINED_SPACE")     return { ...f2 };
  if (dt === "HOLIDAY_WORK")       return { ...f3 };
  if (dt === "POWER_OUTAGE")       return { ...f4 };
  return {};
}
function migrateFormData(fd: Record<string, unknown>): Record<string, unknown> {
  const result = { ...fd };
  if (fd.workDate && !fd.workStartDate) { result.workStartDate = fd.workDate; result.workEndDate = fd.workDate; }
  return result;
}

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
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [workLatitude, setWorkLatitude] = useState<number | null>(null);
  const [workLongitude, setWorkLongitude] = useState<number | null>(null);
  const [workAddress, setWorkAddress] = useState("");
  const [form1, setForm1] = useState<Form1>(defaultForm1);
  const [form2, setForm2] = useState<Form2>(defaultForm2);
  const [form3, setForm3] = useState<Form3>(defaultForm3);
  const [form4, setForm4] = useState<Form4>(defaultForm4);

  const scheduleAutoSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => handleSave(true), 500);
  };
  const handleSave = async (silent = false) => {
    if (!silent) setSaving(true);
    try {
      const formDataJson = buildFormData(documentType, form1, form2, form3, form4);
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formDataJson, workLatitude, workLongitude, workAddress }),
      });
      if (res.ok) {
        const now = new Date();
        setLastSaved(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")} 저장됨`);
      }
    } catch (e) { console.error(e); }
    finally { if (!silent) setSaving(false); }
  };


  const handleChange1 = (k: string, v: unknown) => { setForm1(p => ({ ...p, [k]: v })); scheduleAutoSave(); };
  const handleChange2 = (k: string, v: unknown) => { setForm2(p => ({ ...p, [k]: v })); scheduleAutoSave(); };
  const handleChange3 = (k: string, v: unknown) => { setForm3(p => ({ ...p, [k]: v })); scheduleAutoSave(); };
  const handleChange4 = (k: string, v: unknown) => { setForm4(p => ({ ...p, [k]: v })); scheduleAutoSave(); };

  const fetchDocument = useCallback(async () => {
    try {
      const [docRes, taskRes] = await Promise.all([fetch(`/api/documents/${documentId}`), fetch(`/api/tasks/${taskId}`)]);
      const docData = await docRes.json();
      const taskData = await taskRes.json();
      if (taskRes.ok) {
        const task = taskData.task;
        setTaskName(task?.name ?? "");
        // Form3(휴일작업)에 task 기본정보 자동입력
        if (docData.document?.documentType === "HOLIDAY_WORK") {
          setForm3(p => ({
            ...p,
            contractorCompany: p.contractorCompany || task?.contractorCompanyName || task?.contractorName || "",
            contractPeriodStart: p.contractPeriodStart || task?.startDate?.split("T")[0] || "",
            contractPeriodEnd: p.contractPeriodEnd || task?.endDate?.split("T")[0] || "",
            serviceName: p.serviceName || task?.name || "",
          }));
        }
      }
      if (docRes.ok) {
        const doc = docData.document;
        setDocumentType(doc.documentType);
        const fd = migrateFormData(doc.formDataJson ?? {});
        if (Object.keys(fd).length > 0) {
          if (doc.documentType === "SAFETY_WORK_PERMIT") setForm1(p => ({ ...p, ...fd } as Form1));
          else if (doc.documentType === "CONFINED_SPACE") setForm2(p => ({ ...p, ...fd } as Form2));
          else if (doc.documentType === "HOLIDAY_WORK")   setForm3(p => ({ ...p, ...fd } as Form3));
          else if (doc.documentType === "POWER_OUTAGE")   setForm4(p => ({ ...p, ...fd } as Form4));
        }
        if (doc.workLatitude)  setWorkLatitude(doc.workLatitude);
        if (doc.workLongitude) setWorkLongitude(doc.workLongitude);
        if (doc.workAddress)   setWorkAddress(doc.workAddress);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [documentId, taskId]);

  useEffect(() => { fetchDocument(); }, [fetchDocument]);

  const handleLocationConfirm = (addr: string, lat: number, lng: number) => {
    setWorkAddress(addr); setWorkLatitude(lat); setWorkLongitude(lng);
    setShowLocationPicker(false);
    // 위치 선택 시 작업장소 input에 주소 자동 채우기
    if (documentType === "SAFETY_WORK_PERMIT") setForm1(p => ({ ...p, workLocation: addr }));
    else if (documentType === "CONFINED_SPACE") setForm2(p => ({ ...p, workLocation: addr }));
    else if (documentType === "HOLIDAY_WORK")   setForm3(p => ({ ...p, facilityLocation: addr, facilityAddress: addr }));
    else if (documentType === "POWER_OUTAGE")   setForm4(p => ({ ...p, workLocation: addr }));
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const baseFormData = buildFormData(documentType, form1, form2, form3, form4);
      // 클로저 버그 수정: 최신 addr을 formData에 직접 주입
      const formDataJson = {
        ...baseFormData,
        ...(documentType === "HOLIDAY_WORK" ? { facilityLocation: addr } : { workLocation: addr }),
      };
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formDataJson, workLatitude: lat, workLongitude: lng, workAddress: addr }),
      });
      const now = new Date();
      setLastSaved(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")} 저장됨`);
    }, 300);
  };

  const isConfinedModal = documentType === "CONFINED_SPACE";
  const info = DOC_TYPE_INFO[documentType] ?? DOC_TYPE_INFO.SAFETY_WORK_PERMIT;
  const locProps = {
    workLatitude, workAddress,
    onOpenLocation: () => setShowLocationPicker(true),
    onClearLocation: () => { setWorkLatitude(null); setWorkLongitude(null); setWorkAddress(""); },
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1,2,3].map(i => (
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
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/tasks/${taskId}`} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <span className="text-xs text-gray-500">{taskName}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{info.short}</span>
            <h2 className="text-base font-bold text-gray-900">{info.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {lastSaved && <span className="text-xs text-gray-400">{lastSaved}</span>}
            <button onClick={() => setShowPrev(true)} className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">이전 불러오기</button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {documentType === "SAFETY_WORK_PERMIT" && <Form1Fields form={form1} onChange={handleChange1} onSave={() => handleSave(true)} {...locProps} taskName={taskName} documentId={documentId} />}
        {documentType === "CONFINED_SPACE"     && <Form2Fields form={form2} onChange={handleChange2} {...locProps} taskName={taskName} documentId={documentId} />}
        {documentType === "HOLIDAY_WORK"       && <Form3Fields form={form3} onChange={handleChange3} {...locProps} taskName={taskName} documentId={documentId} />}
        {documentType === "POWER_OUTAGE"       && <Form4Fields form={form4} onChange={handleChange4} {...locProps} taskName={taskName} documentId={documentId} />}
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3">
        <button onClick={() => handleSave(false)} disabled={saving}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-60">
          {saving ? "저장 중..." : "임시저장"}
        </button>
        <button onClick={async () => { await handleSave(true); setShowApproval(true); }}
          className="flex-1 py-3 rounded-xl text-white text-sm font-medium" style={{ background: "#2563eb" }}>
          결재자 지정 및 제출
        </button>
      </div>

      {showPrev && (
        <PrevDocsModal documentId={documentId} onSelect={(fd) => {
          const migrated = migrateFormData(fd);
          if (documentType === "SAFETY_WORK_PERMIT") setForm1(p => ({ ...p, ...migrated } as Form1));
          else if (documentType === "CONFINED_SPACE") setForm2(p => ({ ...p, ...migrated } as Form2));
          else if (documentType === "HOLIDAY_WORK")   setForm3(p => ({ ...p, ...migrated } as Form3));
          else if (documentType === "POWER_OUTAGE")   setForm4(p => ({ ...p, ...migrated } as Form4));
        }} onClose={() => setShowPrev(false)} />
      )}
      {showLocationPicker && (
        <LocationPickerModal initialAddress={workAddress} initialLat={workLatitude} initialLng={workLongitude}
          onConfirm={handleLocationConfirm} onClose={() => setShowLocationPicker(false)} />
      )}
      {showApproval && (
        <ApprovalSignModal documentId={documentId} documentType={documentType}
          measurerUserId={documentType === "CONFINED_SPACE" ? (form2.measurerUserId || undefined) : undefined}
          onClose={() => setShowApproval(false)}
          onSubmitted={() => {
            setShowApproval(false);
            alert("제출이 완료됐습니다. 결재자에게 알림이 전송됩니다.");
            router.push(`/tasks/${taskId}`);
          }} />
      )}
    </div>
  );
}

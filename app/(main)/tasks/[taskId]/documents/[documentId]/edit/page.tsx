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
  SAFETY_WORK_PERMIT: { title: "안전작업허가서",    short: "붙임1", approverLabel: "최종검토자", confirmerLabel: "최종허가자" },
  CONFINED_SPACE:     { title: "밀폐공간작업허가서", short: "붙임2", approverLabel: "허가자",    confirmerLabel: "확인자" },
  HOLIDAY_WORK:       { title: "휴일작업신청서",     short: "붙임3", approverLabel: "검토자",    confirmerLabel: "승인자" },
  POWER_OUTAGE:       { title: "정전작업허가서",     short: "붙임4", approverLabel: "허가자",    confirmerLabel: "확인자" },
};

const inputClass = "w-full px-3 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none";
const textareaClass = "w-full px-3 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none";
const dateInputClass = "w-full px-3 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const timeInputClass = "w-full px-3 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

// 위험공종 관련작업(장소) 항목 목록
const HIGH_PLACE_ITEMS = ["저수지 여수로 침수탑", "방조제 제방시면 배수갑문", "제방 비탈면 제체"];
const WATER_WORK_ITEMS = ["저수지 여수로 침수탑", "방조제 제방시면 배수갑문", "배수개선 양수장·배수장"];

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
  const [activeTab, setActiveTab] = useState<"table" | "excel" | "file">("table");
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

  const openFilePicker = (accept: string) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = accept;
    input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) handleFileUpload(file); };
    input.click();
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white">✅</span>
        위험성평가표(붙임1)
      </h3>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {[{ key:"table",label:"직접 입력"},{key:"excel",label:"Excel"},{key:"file",label:"PDF/이미지"}].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === "table" && <RiskAssessTable rows={riskAssessRows} onChange={onChangeRows} />}
      {(activeTab === "excel" || activeTab === "file") && (
        <div className="space-y-3">
          <div className={`text-xs p-3 rounded-xl ${activeTab === "excel" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
            {activeTab === "excel" ? "📗 Excel 파일(.xlsx, .xls)을 업로드하세요." : "📄 PDF 또는 이미지 파일을 업로드하세요."}
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50"
            onClick={() => openFilePicker(activeTab === "excel" ? ".xlsx,.xls" : ".pdf,image/*")}>
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                <span className="text-sm">업로드 중...</span>
              </div>
            ) : (
              <><p className="text-sm text-gray-600 font-medium">파일을 탭하여 선택</p><p className="text-xs text-gray-400 mt-1">최대 20MB</p></>
            )}
          </div>
          {docFiles.length > 0 && (
            <div className="space-y-2">
              {docFiles.map(f => (
                <div key={f.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-700 flex-1 truncate">{f.fileName}</span>
                  <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs">보기</a>
                  <button onClick={() => handleDelete(f.id)} className="text-gray-400 hover:text-red-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PhotoAttachSection({ documentId, canAdd = true }: { documentId: string; canAdd?: boolean }) {
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/attachments?type=PHOTO`);
      const data = await res.json();
      setPhotos(data.attachments ?? []);
    } catch {}
  }, [documentId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

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

  const handleDelete = async (id: string) => {
    if (!confirm("사진을 삭제하시겠습니까?")) return;
    await fetch(`/api/documents/${documentId}/attachments?attachmentId=${id}`, { method: "DELETE" });
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white">📷</span>
          개선대책 확인자료 (사진)
        </h3>
        <span className="text-xs text-gray-400">{photos.length}장</span>
      </div>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {photos.map(photo => (
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
      )}
      {canAdd && (
        <div className="flex gap-2">
          <button onClick={() => cameraRef.current?.click()} disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 active:bg-gray-100">
            {uploading ? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
            카메라
          </button>
          <button onClick={() => galleryRef.current?.click()} disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 active:bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            갤러리
          </button>
        </div>
      )}
      {photos.length === 0 && !canAdd && <div className="text-center py-6 text-gray-400 text-sm">등록된 사진이 없습니다.</div>}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { Array.from(e.target.files ?? []).forEach(f => uploadPhoto(f)); e.target.value = ""; }} />
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
        {workLatitude ? "📍 위치 변경" : "📍 지도에서 위치 지정(GPS 자동감지)"}
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
  const OPTS = ["점검않음", "조치완료", "해당없음"];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-1 px-2 py-1.5 bg-gray-100 rounded-lg">
        <div className="col-span-5 text-xs font-medium text-gray-600">확인항목</div>
        <div className="col-span-3 text-xs font-medium text-gray-600 text-center">해당여부</div>
        <div className="col-span-4 text-xs font-medium text-gray-600 text-center">확인결과</div>
      </div>
      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-1 items-center border border-gray-100 rounded-xl p-2">
          <div className="col-span-5 text-xs text-gray-700 leading-tight">{item.label}</div>
          <div className="col-span-3 flex flex-col gap-1 items-start pl-1">
            {["해당", "해당없음"].map(opt => (
              <label key={opt} className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name={`applicable_${idx}`} value={opt} checked={item.applicable === opt}
                  onChange={() => update(idx, "applicable", opt)} className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-gray-600">{opt}</span>
              </label>
            ))}
          </div>
          <div className="col-span-4">
            {item.applicable === "해당" ? (
              <select value={OPTS.includes(item.result) ? item.result : (item.result ? "직접입력" : "")}
                onChange={e => { if (e.target.value !== "직접입력") update(idx, "result", e.target.value); else update(idx, "result", ""); }}
                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">선택</option>
                {OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                <option value="직접입력">직접입력</option>
              </select>
            ) : <div className="text-xs text-gray-300 text-center">-</div>}
          </div>
        </div>
      ))}
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
    // 이미 로드된 경우
    if (window.kakao?.maps?.services) { setMapLoaded(true); return; }
    if (window.kakao?.maps) { 
      window.kakao.maps.load(() => setMapLoaded(true)); 
      return; 
    }
    const existing = document.getElementById("kakao-map-script");
    if (existing) { 
      const check = setInterval(() => { 
        if (window.kakao?.maps?.services) { setMapLoaded(true); clearInterval(check); } 
        else if (window.kakao?.maps) { 
          window.kakao.maps.load(() => { setMapLoaded(true); clearInterval(check); }); 
        } 
      }, 200); 
      return; 
    }
    const script = document.createElement("script");
    script.id = "kakao-map-script";
    // ✅ autoload=false 필수 (Next.js에서 document.write 차단)
    // libraries=services 포함하여 역지오코딩 사용 가능
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services`;
    script.onload = () => {
      // kakao.maps.load() 콜백 안에서만 services 사용 가능
      window.kakao.maps.load(() => {
        setMapLoaded(true);
      });
    };
    document.head.appendChild(script);
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

function ApprovalSignModal({ documentId, documentType, onClose, onSubmitted }: {
  documentId: string; documentType: string; onClose: () => void; onSubmitted: () => void;
}) {
  const [step, setStep] = useState<"approver" | "sign">("approver");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [reviewer, setReviewer] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
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
      const res = await fetch(`/api/documents/${documentId}/approval-lines`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerUserId: reviewer.id, signatureData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류 발생");
      onSubmitted();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "제출에 실패했습니다."); }
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
  workLocation: string; workContent: string; participants: string;
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
  workLocation: "", workContent: "", participants: "",
  riskHighPlace: false, riskHighPlaceDetail: "", riskHighPlaceItems: [],
  riskWaterWork: false, riskWaterWorkDetail: "", riskWaterWorkItems: [],
  riskConfinedSpace: false, riskConfinedSpaceDetail: "",
  riskPowerOutage: false, riskPowerOutageDetail: "",
  riskFireWork: false, riskFireWorkDetail: "",
  riskOther: false, riskOtherDetail: "",
  factorNarrowAccess: false, factorSlippery: false, factorSteepSlope: false, factorWaterHazard: false,
  factorRockfall: false, factorNoRailing: false, factorLadderNoGuard: false, factorSuffocation: false,
  factorElectricFire: false, factorSparkFire: false, factorOther: false, factorOtherDetail: "",
  riskRows: [{ riskFactor: "", improvement: "", disasterType: "" }], reviewOpinion: "", reviewResult: "",
  riskAssessRows: [{ ...defaultRiskAssessRow }],
};

function toggleArrItem(field: string, item: string, currentArr: string[], onChange: (k: string, v: unknown) => void) {
  const exists = currentArr.includes(item);
  onChange(field, exists ? currentArr.filter(i => i !== item) : [...currentArr, item]);
}

function Form1Fields({ form, onChange, workLatitude, workAddress, onOpenLocation, onClearLocation, taskName, documentId }: {
  form: Form1; onChange: (k: string, v: unknown) => void;
  workLatitude: number | null; workAddress: string; onOpenLocation: () => void; onClearLocation: () => void;
  taskName: string; documentId: string;
}) {
  const updateRow = (idx: number, f: keyof RiskRow, v: string) =>
    onChange("riskRows", form.riskRows.map((r, i) => i === idx ? { ...r, [f]: v } : r));

  const factors = [
    { key: "factorNarrowAccess", label: "접근통로 협소" },
    { key: "factorSlippery", label: "미끄러움(빙판, 물기)" },
    { key: "factorSteepSlope", label: "급경사" },
    { key: "factorWaterHazard", label: "익수·유수·유수" },
    { key: "factorRockfall", label: "낙석·굴러떨어짐" },
    { key: "factorNoRailing", label: "안전 난간재" },
    { key: "factorLadderNoGuard", label: "사다리 안전잠금장치" },
    { key: "factorSuffocation", label: "질식·산소결핍·유해가스" },
    { key: "factorElectricFire", label: "감전·전기화재요인" },
    { key: "factorSparkFire", label: "불꽃·불티에 의한 화재" },
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
              <span className="text-sm font-medium text-gray-700">수상 또는 수중작업</span>
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
  { label: "안전담당자 지정 및 감독자 배치 여부", applicable: "", result: "" },
  { label: "환기설비, 환기팬, 산소농도, 유해물질 점검완료", applicable: "", result: "" },
  { label: "관련기관의 안전정보 확인", applicable: "", result: "" },
  { label: "배수로확인 및 잠금밸브 점검", applicable: "", result: "" },
  { label: "구명로프 설치", applicable: "", result: "" },
  { label: "안전모 및 안전장비 이용", applicable: "", result: "" },
  { label: "작업중간에 전기안전장치 사용", applicable: "", result: "" },
  { label: "긴급연락처 공지", applicable: "", result: "" },
  { label: "대피장소 및 대피경로 여부 확인", applicable: "", result: "" },
  { label: "긴급대응팀 비상대기 및 긴급서명 설치", applicable: "", result: "" },
  { label: "환기장치 및 안전교육 실시", applicable: "", result: "" },
  { label: "작업 전 안전교육실시 (TBM 등)", applicable: "", result: "" },
  { label: "작업복장 이용", applicable: "", result: "" },
];
interface Form2 {
  requestDate: string; workStartDate: string; workEndDate: string; workStartTime: string; workEndTime: string;
  serviceName: string; applicantCompany: string; applicantTitle: string; applicantName: string;
  workLocation: string; workContent: string; entryList: string;
  needFireWork: string; useInternalEngine: string; safetyChecks: SafetyCheckItem[]; specialMeasures: string;
}
const defaultForm2: Form2 = {
  requestDate: new Date().toISOString().split("T")[0], workStartDate: "", workEndDate: "", workStartTime: "09:00", workEndTime: "18:00",
  serviceName: "", applicantCompany: "", applicantTitle: "", applicantName: "", workLocation: "", workContent: "", entryList: "",
  needFireWork: "", useInternalEngine: "", safetyChecks: CONFINED_CHECKS.map(c => ({ ...c })), specialMeasures: "",
};
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
          <FormInput label="작업 내용" required><textarea value={form.workContent} onChange={e => onChange("workContent", e.target.value)} rows={3} className={textareaClass} /></FormInput>
          <FormInput label="입장자 명단"><textarea value={form.entryList} onChange={e => onChange("entryList", e.target.value)} rows={2} className={textareaClass} /></FormInput>
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
        <SectionHeader num={3} title="안전조치 이행사항" />
        <SafetyCheckTable items={form.safetyChecks} onChange={updated => onChange("safetyChecks", updated)} />
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={4} title="특별조치 필요사항" />
        <textarea value={form.specialMeasures} onChange={e => onChange("specialMeasures", e.target.value)} rows={3} className={textareaClass} />
      </div>
      <PhotoAttachSection documentId={documentId} canAdd={true} />
    </>
  );
}

interface Participant3 { role: string; name: string; phone: string; }
interface Form3 {
  requestDate: string; workStartDate: string; workEndDate: string; workStartTime: string; workEndTime: string;
  serviceName: string; contractorCompany: string; contractPeriodStart: string; contractPeriodEnd: string;
  facilityName: string; facilityLocation: string; facilityManager: string; facilityManagerGrade: string;
  workPosition: string; workContents: string; participants: Participant3[];
  riskFactors: string; improvementMeasures: string; reviewOpinion: string; reviewResult: string;
  applicantName: string; applicantOrg: string;
}
const defaultForm3: Form3 = {
  requestDate: new Date().toISOString().split("T")[0], workStartDate: "", workEndDate: "", workStartTime: "09:00", workEndTime: "18:00",
  serviceName: "", contractorCompany: "", contractPeriodStart: "", contractPeriodEnd: "",
  facilityName: "", facilityLocation: "", facilityManager: "", facilityManagerGrade: "",
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
          <FormInput label="시공사업체명"><input type="text" value={form.contractorCompany} onChange={e => onChange("contractorCompany", e.target.value)} className={inputClass} /></FormInput>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="용역기간 시작"><input type="date" value={form.contractPeriodStart} onChange={e => onChange("contractPeriodStart", e.target.value)} className={dateInputClass} style={{ colorScheme: "light" }} /></FormInput>
            <FormInput label="용역기간 종료"><input type="date" value={form.contractPeriodEnd} onChange={e => onChange("contractPeriodEnd", e.target.value)} className={dateInputClass} style={{ colorScheme: "light" }} /></FormInput>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={2} title="휴일작업 개요" />
        <div className="space-y-3">
          <FormInput label="작업대상 시설물" required><input type="text" value={form.facilityName} onChange={e => onChange("facilityName", e.target.value)} className={inputClass} /></FormInput>
          <FormInput label="시설물 위치">
            <input type="text" value={form.facilityLocation} onChange={e => onChange("facilityLocation", e.target.value)} className={inputClass + " mb-1.5"} />
            <LocationField workLatitude={workLatitude} workAddress={workAddress} onOpenLocation={onOpenLocation} onClearLocation={onClearLocation} />
          </FormInput>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="시설 관리자"><input type="text" value={form.facilityManager} onChange={e => onChange("facilityManager", e.target.value)} className={inputClass} /></FormInput>
            <FormInput label="관리자 직급"><input type="text" value={form.facilityManagerGrade} onChange={e => onChange("facilityManagerGrade", e.target.value)} className={inputClass} /></FormInput>
          </div>
          <FormInput label="작업위치"><input type="text" value={form.workPosition} onChange={e => onChange("workPosition", e.target.value)} className={inputClass} /></FormInput>
          <FormInput label="작업공종"><textarea value={form.workContents} onChange={e => onChange("workContents", e.target.value)} rows={3} className={textareaClass} /></FormInput>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={3} title="휴일작업 참여자" />
        <div className="space-y-2 mb-3">
          {form.participants.map((p, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <select value={p.role} onChange={e => updateP(idx, "role", e.target.value)} className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-700 bg-white focus:outline-none">
                  <option>안전보건관리책임자</option><option>현장참여직원</option><option>시설관리자</option>
                </select>
                {idx >= 1 && <button onClick={() => onChange("participants", form.participants.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormInput label="성명"><input type="text" value={p.name} onChange={e => updateP(idx, "name", e.target.value)} className={inputClass} /></FormInput>
                <FormInput label="연락처"><input type="tel" value={p.phone} onChange={e => updateP(idx, "phone", e.target.value)} placeholder="010-0000-0000" className={inputClass} /></FormInput>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => onChange("participants", [...form.participants, { role: "현장참여직원", name: "", phone: "" }])}
          className="w-full py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>참여자 추가
        </button>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={4} title="위험요소 및 개선대책" />
        <div className="space-y-3">
          <FormInput label="위험요소"><textarea value={form.riskFactors} onChange={e => onChange("riskFactors", e.target.value)} rows={2} className={textareaClass} /></FormInput>
          <FormInput label="개선대책"><textarea value={form.improvementMeasures} onChange={e => onChange("improvementMeasures", e.target.value)} rows={2} className={textareaClass} /></FormInput>
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

const POWER_CHECKS: SafetyCheckItem[] = [
  { label: "전로차단 안전장치 확인", applicable: "", result: "" },
  { label: "변압기차단기 확인", applicable: "", result: "" },
  { label: "잠금조치", applicable: "", result: "" },
  { label: "접지설비 차단", applicable: "", result: "" },
  { label: "차단여부 감시", applicable: "", result: "" },
  { label: "잔여전기 방전", applicable: "", result: "" },
  { label: "검전기로 방전여부 확인", applicable: "", result: "" },
  { label: "활선작업 규정대로 설치", applicable: "", result: "" },
  { label: "현장 안전장치 확인", applicable: "", result: "" },
];
interface InspectionItem { equipment: string; cutoffConfirmer: string; electrician: string; siteRepair: string; }
interface Form4 {
  requestDate: string; workStartDate: string; workEndDate: string; workStartTime: string; workEndTime: string;
  serviceName: string; applicantCompany: string; applicantTitle: string; applicantName: string;
  workLocation: string; workContent: string; entryList: string;
  needConfinedSpace: string; needFireWork: string; safetyChecks: SafetyCheckItem[];
  inspectionItems: InspectionItem[]; specialMeasures: string;
}
const defaultForm4: Form4 = {
  requestDate: new Date().toISOString().split("T")[0], workStartDate: "", workEndDate: "", workStartTime: "09:00", workEndTime: "18:00",
  serviceName: "", applicantCompany: "", applicantTitle: "", applicantName: "", workLocation: "", workContent: "", entryList: "",
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
          <FormInput label="작업 내용" required><textarea value={form.workContent} onChange={e => onChange("workContent", e.target.value)} rows={3} className={textareaClass} /></FormInput>
          <FormInput label="입장자 명단"><textarea value={form.entryList} onChange={e => onChange("entryList", e.target.value)} rows={2} className={textareaClass} /></FormInput>
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
        <SectionHeader num={4} title="기기 확인 결과" />
        <div className="grid grid-cols-4 gap-1 px-2 py-1.5 bg-gray-100 rounded-lg mb-2">
          {["기기기관", "차단확인자", "전기담당자", "현장수리"].map(h => (
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
        <textarea value={form.specialMeasures} onChange={e => onChange("specialMeasures", e.target.value)} rows={3} className={textareaClass} />
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
    autoSaveTimer.current = setTimeout(() => handleSave(true), 3000);
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
      if (taskRes.ok) setTaskName(taskData.task?.name ?? "");
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

  const handleLocationConfirm = (addr: string, lat: number, lng: number) => {
    setWorkAddress(addr); setWorkLatitude(lat); setWorkLongitude(lng);
    setShowLocationPicker(false);
    // 위치 선택 시 작업장소 input에 주소 자동 채우기
    if (documentType === "SAFETY_WORK_PERMIT") setForm1(p => ({ ...p, workLocation: addr }));
    else if (documentType === "CONFINED_SPACE") setForm2(p => ({ ...p, workLocation: addr }));
    else if (documentType === "HOLIDAY_WORK")   setForm3(p => ({ ...p, facilityLocation: addr }));
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
        {documentType === "SAFETY_WORK_PERMIT" && <Form1Fields form={form1} onChange={handleChange1} {...locProps} taskName={taskName} documentId={documentId} />}
        {documentType === "CONFINED_SPACE"     && <Form2Fields form={form2} onChange={handleChange2} {...locProps} taskName={taskName} documentId={documentId} />}
        {documentType === "HOLIDAY_WORK"       && <Form3Fields form={form3} onChange={handleChange3} {...locProps} taskName={taskName} documentId={documentId} />}
        {documentType === "POWER_OUTAGE"       && <Form4Fields form={form4} onChange={handleChange4} {...locProps} taskName={taskName} documentId={documentId} />}
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3">
        <button onClick={() => handleSave(false)} disabled={saving}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-60">
          {saving ? "저장 중..." : "임시저장"}
        </button>
        <button onClick={() => setShowApproval(true)}
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

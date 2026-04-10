"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface UserItem { id: string; name: string; organization?: string; role: string; employeeNo?: string; }
interface PrevDoc { id: string; formDataJson: Record<string, unknown>; createdAt: string; }
declare global { interface Window { kakao: any; daum: any; } }

const DOC_TYPE_INFO: Record<string, { title: string; short: string; approverLabel: string; confirmerLabel: string }> = {
  SAFETY_WORK_PERMIT: { title: "안전작업허가서",    short: "붙임1", approverLabel: "최종검토자", confirmerLabel: "최종허가자" },
  CONFINED_SPACE:     { title: "밀폐공간작업허가서", short: "붙임2", approverLabel: "허가자",    confirmerLabel: "확인자" },
  HOLIDAY_WORK:       { title: "휴일작업신청서",     short: "붙임3", approverLabel: "검토자",    confirmerLabel: "승인자" },
  POWER_OUTAGE:       { title: "정전작업허가서",     short: "붙임4", approverLabel: "허가자",    confirmerLabel: "확인자" },
};

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
    const center = new window.kakao.maps.LatLng(lat ?? 36.4618, lng ?? 126.6422);
    const map = new window.kakao.maps.Map(mapRef.current, { center, level: 5 });
    mapInstanceRef.current = map;
    const marker = new window.kakao.maps.Marker({ position: center, map });
    markerRef.current = marker;
    window.kakao.maps.event.addListener(map, "click", (mouseEvent: any) => {
      const latlng = mouseEvent.latLng;
      marker.setPosition(latlng);
      const newLat = latlng.getLat(); const newLng = latlng.getLng();
      setLat(newLat); setLng(newLng);
      if (!window.kakao.maps.services) { setAddress(`${newLat.toFixed(5)}, ${newLng.toFixed(5)}`); return; }
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(newLng, newLat, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK)
          setAddress(result[0].road_address ? result[0].road_address.address_name : result[0].address.address_name);
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
        <div className="p-5 pb-10 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">주소 검색</label>
            <div className="flex gap-2">
              <input type="text" value={address} readOnly className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-700" />
              <button onClick={handleAddressSearch} className="px-4 py-2.5 rounded-xl text-white text-sm font-medium" style={{ background: "#2563eb" }}>주소 검색</button>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-gray-200">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">지도를 클릭하면 위치를 직접 지정할 수 있습니다</div>
            <div ref={mapRef} style={{ width: "100%", height: "280px" }}>
              {!mapLoaded && <div className="w-full h-full flex items-center justify-center bg-gray-50"><p className="text-sm text-gray-400">지도 로딩 중...</p></div>}
            </div>
          </div>
          {lat && lng && (
            <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {address || "위치 선택됨"} ({lat.toFixed(5)}, {lng.toFixed(5)})
            </div>
          )}
          <button onClick={() => { if (lat && lng) onConfirm(address, lat, lng); }} disabled={!lat || !lng}
            className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-40" style={{ background: "#2563eb" }}>
            이 위치로 설정
          </button>
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
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return; e.preventDefault();
    isDrawing.current = true; const ctx = canvas.getContext("2d"); if (!ctx) return;
    const pos = getPos(e, canvas); ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return; const canvas = canvasRef.current; if (!canvas) return; e.preventDefault();
    const ctx = canvas.getContext("2d"); if (!ctx) return; const pos = getPos(e, canvas); ctx.lineTo(pos.x, pos.y); ctx.stroke();
  };
  const endDraw = () => { isDrawing.current = false; };
  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  };
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
          <h2 className="text-base font-bold text-gray-900">{step === "approver" ? `결재자 지정 (${info.approverLabel})` : "서명"}</h2>
          <button onClick={onClose} className="text-gray-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        {step === "approver" ? (
          <div className="p-5 pb-10">
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
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="이름으로 검색"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto mb-4">
              {users.filter(u => u.id !== reviewer?.id).map(u => (
                <button key={u.id} onClick={() => setReviewer(u)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-blue-400 hover:bg-blue-50 text-left">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">{u.name[0]}</div>
                  <div><div className="text-sm font-medium text-gray-900">{u.name}</div><div className="text-xs text-gray-500">{u.organization}{u.employeeNo ? ` · ${u.employeeNo}` : ""}</div></div>
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
          <div className="p-5 pb-10">
            <p className="text-sm text-gray-600 mb-4">아래에 서명해주세요.</p>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-600">
              <div className="flex justify-between"><span>{info.approverLabel}</span><span className="font-medium text-gray-900">{reviewer?.name} ({reviewer?.organization})</span></div>
            </div>
            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden mb-3 bg-white">
              <canvas ref={canvasRef} width={600} height={200} className="w-full touch-none" style={{ cursor: "crosshair" }}
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
      <label className="block text-xs text-gray-500 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}
const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const textareaClass = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none";

function LocationField({ workLatitude, workAddress, onOpenLocation, onClearLocation }: {
  workLatitude: number | null; workAddress: string; onOpenLocation: () => void; onClearLocation: () => void;
}) {
  return (
    <div>
      <button onClick={onOpenLocation}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-colors ${workLatitude ? "border-blue-400 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        {workLatitude ? "위치 변경" : "📍 지도에서 위치 지정"}
      </button>
      {workLatitude && workAddress && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-600">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          <span className="truncate">{workAddress}</span>
          <button onClick={onClearLocation} className="shrink-0 text-gray-400 hover:text-red-500 ml-1">✕</button>
        </div>
      )}
    </div>
  );
}

interface SafetyCheckItem { label: string; applicable: string; result: string; }
function SafetyCheckTable({ items, onChange }: { items: SafetyCheckItem[]; onChange: (updated: SafetyCheckItem[]) => void }) {
  const update = (idx: number, field: keyof SafetyCheckItem, value: string) =>
    onChange(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  const OPTS = ["이상없음", "조치완료", "해당없음"];
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
                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
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

// ===== 작업기간 공통 컴포넌트 =====
function WorkPeriodField({ startDate, endDate, startTime, endTime, onChangeStartDate, onChangeEndDate, onChangeStartTime, onChangeEndTime }: {
  startDate: string; endDate: string; startTime: string; endTime: string;
  onChangeStartDate: (v: string) => void; onChangeEndDate: (v: string) => void;
  onChangeStartTime: (v: string) => void; onChangeEndTime: (v: string) => void;
}) {
  return (
    <>
      {/* 작업기간: 시작일 ~ 종료일 */}
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="작업 시작일" required>
          <input type="date" value={startDate} onChange={e => onChangeStartDate(e.target.value)} className={inputClass} />
        </FormInput>
        <FormInput label="작업 종료일" required>
          <input type="date" value={endDate} min={startDate} onChange={e => onChangeEndDate(e.target.value)} className={inputClass} />
        </FormInput>
      </div>
      {/* 작업시간: 시작시간 ~ 종료시간 */}
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="작업 시작 시간" required>
          <input type="time" value={startTime} onChange={e => onChangeStartTime(e.target.value)} className={inputClass} />
        </FormInput>
        <FormInput label="작업 종료 시간" required>
          <input type="time" value={endTime} onChange={e => onChangeEndTime(e.target.value)} className={inputClass} />
        </FormInput>
      </div>
      {/* 기간 미리보기 */}
      {startDate && (
        <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700">
          📅 작업수행기간: {startDate} {startTime} ~ {endDate || startDate} {endTime}
        </div>
      )}
    </>
  );
}

interface RiskRow { riskFactor: string; improvement: string; disasterType: string; }
interface Form1 {
  requestDate: string;
  workStartDate: string; workEndDate: string;        // ← 기간으로 변경
  workStartTime: string; workEndTime: string;
  projectName: string; applicantCompany: string; applicantTitle: string; applicantName: string;
  workLocation: string; workContent: string; participants: string;
  riskHighPlace: boolean; riskHighPlaceDetail: string; riskWaterWork: boolean; riskWaterWorkDetail: string;
  riskConfinedSpace: boolean; riskPowerOutage: boolean; riskFireWork: boolean; riskOther: boolean; riskOtherDetail: string;
  factorNarrowAccess: boolean; factorSlippery: boolean; factorSteepSlope: boolean; factorWaterHazard: boolean;
  factorRockfall: boolean; factorNoRailing: boolean; factorLadderNoGuard: boolean; factorSuffocation: boolean;
  factorElectricFire: boolean; factorSparkFire: boolean; factorOther: boolean; factorOtherDetail: string;
  riskRows: RiskRow[]; reviewOpinion: string; reviewResult: string;
}
const defaultForm1: Form1 = {
  requestDate: new Date().toISOString().split("T")[0],
  workStartDate: "", workEndDate: "",
  workStartTime: "09:00", workEndTime: "18:00",
  projectName: "", applicantCompany: "", applicantTitle: "", applicantName: "", workLocation: "", workContent: "", participants: "",
  riskHighPlace: false, riskHighPlaceDetail: "", riskWaterWork: false, riskWaterWorkDetail: "",
  riskConfinedSpace: false, riskPowerOutage: false, riskFireWork: false, riskOther: false, riskOtherDetail: "",
  factorNarrowAccess: false, factorSlippery: false, factorSteepSlope: false, factorWaterHazard: false,
  factorRockfall: false, factorNoRailing: false, factorLadderNoGuard: false, factorSuffocation: false,
  factorElectricFire: false, factorSparkFire: false, factorOther: false, factorOtherDetail: "",
  riskRows: [{ riskFactor: "", improvement: "", disasterType: "" }], reviewOpinion: "", reviewResult: "",
};

function Form1Fields({ form, onChange, workLatitude, workAddress, onOpenLocation, onClearLocation, taskName }: {
  form: Form1; onChange: (k: string, v: unknown) => void;
  workLatitude: number | null; workAddress: string; onOpenLocation: () => void; onClearLocation: () => void; taskName: string;
}) {
  const updateRow = (idx: number, f: keyof RiskRow, v: string) =>
    onChange("riskRows", form.riskRows.map((r, i) => i === idx ? { ...r, [f]: v } : r));
  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={1} title="작업허가 신청개요" />
        <div className="space-y-3">
          <FormInput label="신청일" required>
            <input type="date" value={form.requestDate} onChange={e => onChange("requestDate", e.target.value)} className={inputClass} />
          </FormInput>
          <WorkPeriodField
            startDate={form.workStartDate} endDate={form.workEndDate}
            startTime={form.workStartTime} endTime={form.workEndTime}
            onChangeStartDate={v => onChange("workStartDate", v)}
            onChangeEndDate={v => onChange("workEndDate", v)}
            onChangeStartTime={v => onChange("workStartTime", v)}
            onChangeEndTime={v => onChange("workEndTime", v)}
          />
          <FormInput label="용역명"><input type="text" value={taskName} readOnly className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-600" /></FormInput>
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
          <FormInput label="작업자명단"><textarea value={form.participants} onChange={e => onChange("participants", e.target.value)} rows={2} className={textareaClass} /></FormInput>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={2} title="위험요소 · 개선대책 · 재해형태" />
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
                className="col-span-5 px-2 py-1.5 border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <textarea value={row.improvement} onChange={e => updateRow(idx, "improvement", e.target.value)} rows={2}
                className="col-span-4 px-2 py-1.5 border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <input type="text" value={row.disasterType} onChange={e => updateRow(idx, "disasterType", e.target.value)}
                className="col-span-2 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
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
    </>
  );
}

const CONFINED_CHECKS: SafetyCheckItem[] = [
  { label: "안전담당자 지정 및 감독여부 검토", applicable: "", result: "" },
  { label: "출입금지, 출입허가, 경고표지, 표지판설치, 구급용구", applicable: "", result: "" },
  { label: "공기의 적정상태 확인", applicable: "", result: "" },
  { label: "산소농도 및 유해가스 측정", applicable: "", result: "" },
  { label: "환기시설 설치", applicable: "", result: "" },
  { label: "안전모 및 안전장구 착용", applicable: "", result: "" },
  { label: "작업자간의 전기안전장비 사용", applicable: "", result: "" },
  { label: "비상연락 지정", applicable: "", result: "" },
  { label: "감시인 및 구조훈련 여부 검토", applicable: "", result: "" },
  { label: "비상구 유도등 및 비상조명 설치", applicable: "", result: "" },
  { label: "인양장비 및 탈출수단 수가", applicable: "", result: "" },
  { label: "작업 전 안전교육 실시 (TBM 등)", applicable: "", result: "" },
  { label: "작업복장 착용", applicable: "", result: "" },
];

interface Form2 {
  requestDate: string;
  workStartDate: string; workEndDate: string;
  workStartTime: string; workEndTime: string;
  serviceName: string; applicantCompany: string; applicantTitle: string; applicantName: string;
  workLocation: string; workContent: string; entryList: string;
  needFireWork: string; useInternalEngine: string; safetyChecks: SafetyCheckItem[]; specialMeasures: string;
}
const defaultForm2: Form2 = {
  requestDate: new Date().toISOString().split("T")[0],
  workStartDate: "", workEndDate: "",
  workStartTime: "09:00", workEndTime: "18:00",
  serviceName: "", applicantCompany: "", applicantTitle: "", applicantName: "",
  workLocation: "", workContent: "", entryList: "", needFireWork: "", useInternalEngine: "",
  safetyChecks: CONFINED_CHECKS.map(c => ({ ...c })), specialMeasures: "",
};

function Form2Fields({ form, onChange, workLatitude, workAddress, onOpenLocation, onClearLocation, taskName }: {
  form: Form2; onChange: (k: string, v: unknown) => void;
  workLatitude: number | null; workAddress: string; onOpenLocation: () => void; onClearLocation: () => void; taskName: string;
}) {
  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={1} title="기본정보" />
        <div className="space-y-3">
          <FormInput label="신청일" required>
            <input type="date" value={form.requestDate} onChange={e => onChange("requestDate", e.target.value)} className={inputClass} />
          </FormInput>
          <WorkPeriodField
            startDate={form.workStartDate} endDate={form.workEndDate}
            startTime={form.workStartTime} endTime={form.workEndTime}
            onChangeStartDate={v => onChange("workStartDate", v)}
            onChangeEndDate={v => onChange("workEndDate", v)}
            onChangeStartTime={v => onChange("workStartTime", v)}
            onChangeEndTime={v => onChange("workEndTime", v)}
          />
          <FormInput label="용역명"><input type="text" value={taskName} readOnly className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-600" /></FormInput>
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
          <FormInput label="출입자 명단"><textarea value={form.entryList} onChange={e => onChange("entryList", e.target.value)} rows={2} className={textareaClass} /></FormInput>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={2} title="허가 조건" />
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-2">화기작업 허가 필요여부</label>
            <div className="flex gap-4">{["필요", "불필요"].map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="needFireWork2" value={opt} checked={form.needFireWork === opt} onChange={() => onChange("needFireWork", opt)} className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-2">내연기관(양수기) 등 사용여부</label>
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
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={4} title="특별조치 필요사항" />
        <textarea value={form.specialMeasures} onChange={e => onChange("specialMeasures", e.target.value)} rows={3} className={textareaClass} />
      </div>
    </>
  );
}

interface Participant3 { role: string; name: string; phone: string; }
interface Form3 {
  requestDate: string;
  workStartDate: string; workEndDate: string;
  workStartTime: string; workEndTime: string;
  serviceName: string; contractorCompany: string; contractPeriodStart: string; contractPeriodEnd: string;
  facilityName: string; facilityLocation: string; facilityManager: string; facilityManagerGrade: string;
  workPosition: string; workContents: string; participants: Participant3[];
  riskFactors: string; improvementMeasures: string; reviewOpinion: string; reviewResult: string;
  applicantName: string; applicantOrg: string;
}
const defaultForm3: Form3 = {
  requestDate: new Date().toISOString().split("T")[0],
  workStartDate: "", workEndDate: "",
  workStartTime: "09:00", workEndTime: "18:00",
  serviceName: "", contractorCompany: "", contractPeriodStart: "", contractPeriodEnd: "",
  facilityName: "", facilityLocation: "", facilityManager: "", facilityManagerGrade: "",
  workPosition: "", workContents: "",
  participants: [{ role: "안전보건관리책임자", name: "", phone: "" }, { role: "현장참여인원", name: "", phone: "" }, { role: "시설관리자", name: "", phone: "" }],
  riskFactors: "", improvementMeasures: "", reviewOpinion: "", reviewResult: "", applicantName: "", applicantOrg: "",
};

function Form3Fields({ form, onChange, workLatitude, workAddress, onOpenLocation, onClearLocation, taskName }: {
  form: Form3; onChange: (k: string, v: unknown) => void;
  workLatitude: number | null; workAddress: string; onOpenLocation: () => void; onClearLocation: () => void; taskName: string;
}) {
  const updateP = (idx: number, f: keyof Participant3, v: string) =>
    onChange("participants", form.participants.map((p, i) => i === idx ? { ...p, [f]: v } : p));
  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={1} title="용역 개요" />
        <div className="space-y-3">
          <FormInput label="신고일" required>
            <input type="date" value={form.requestDate} onChange={e => onChange("requestDate", e.target.value)} className={inputClass} />
          </FormInput>
          <WorkPeriodField
            startDate={form.workStartDate} endDate={form.workEndDate}
            startTime={form.workStartTime} endTime={form.workEndTime}
            onChangeStartDate={v => onChange("workStartDate", v)}
            onChangeEndDate={v => onChange("workEndDate", v)}
            onChangeStartTime={v => onChange("workStartTime", v)}
            onChangeEndTime={v => onChange("workEndTime", v)}
          />
          <FormInput label="용역명" required><input type="text" value={taskName} readOnly className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-600" /></FormInput>
          <FormInput label="수급업체명"><input type="text" value={form.contractorCompany} onChange={e => onChange("contractorCompany", e.target.value)} className={inputClass} /></FormInput>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="용역기간 시작"><input type="date" value={form.contractPeriodStart} onChange={e => onChange("contractPeriodStart", e.target.value)} className={inputClass} /></FormInput>
            <FormInput label="용역기간 종료"><input type="date" value={form.contractPeriodEnd} onChange={e => onChange("contractPeriodEnd", e.target.value)} className={inputClass} /></FormInput>
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
                <select value={p.role} onChange={e => updateP(idx, "role", e.target.value)}
                  className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-700 focus:outline-none">
                  <option value="안전보건관리책임자">안전보건관리책임자</option>
                  <option value="현장참여인원">현장참여인원</option>
                  <option value="시설관리자">시설관리자</option>
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
        <button onClick={() => onChange("participants", [...form.participants, { role: "현장참여인원", name: "", phone: "" }])}
          className="w-full py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          참여자 추가
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
        <SectionHeader num={5} title="용역감독원 검토내용" />
        <div className="space-y-3">
          <FormInput label="검토의견"><textarea value={form.reviewOpinion} onChange={e => onChange("reviewOpinion", e.target.value)} rows={2} className={textareaClass} /></FormInput>
          <FormInput label="조치결과"><textarea value={form.reviewResult} onChange={e => onChange("reviewResult", e.target.value)} rows={2} className={textareaClass} /></FormInput>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={6} title="신청자 정보" />
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="신청자 성명" required><input type="text" value={form.applicantName} onChange={e => onChange("applicantName", e.target.value)} className={inputClass} /></FormInput>
          <FormInput label="소속"><input type="text" value={form.applicantOrg} onChange={e => onChange("applicantOrg", e.target.value)} className={inputClass} /></FormInput>
        </div>
      </div>
    </>
  );
}

const POWER_CHECKS: SafetyCheckItem[] = [
  { label: "주 차단 스위치 내림", applicable: "", result: "" },
  { label: "제어차단기 내림", applicable: "", result: "" },
  { label: "잠금장치", applicable: "", result: "" },
  { label: "시험전원 차단", applicable: "", result: "" },
  { label: "차단표지판 부착", applicable: "", result: "" },
  { label: "잔류전하 방전", applicable: "", result: "" },
  { label: "검전기로 충전여부 확인", applicable: "", result: "" },
  { label: "단락접지기구 설치", applicable: "", result: "" },
  { label: "현장 스위치 내림", applicable: "", result: "" },
];
interface InspectionItem { equipment: string; cutoffConfirmer: string; electrician: string; siteRepair: string; }
interface Form4 {
  requestDate: string;
  workStartDate: string; workEndDate: string;
  workStartTime: string; workEndTime: string;
  serviceName: string; applicantCompany: string; applicantTitle: string; applicantName: string;
  workLocation: string; workContent: string; entryList: string;
  needConfinedSpace: string; needFireWork: string; safetyChecks: SafetyCheckItem[];
  inspectionItems: InspectionItem[]; specialMeasures: string;
}
const defaultForm4: Form4 = {
  requestDate: new Date().toISOString().split("T")[0],
  workStartDate: "", workEndDate: "",
  workStartTime: "09:00", workEndTime: "18:00",
  serviceName: "", applicantCompany: "", applicantTitle: "", applicantName: "",
  workLocation: "", workContent: "", entryList: "", needConfinedSpace: "", needFireWork: "",
  safetyChecks: POWER_CHECKS.map(c => ({ ...c })),
  inspectionItems: [{ equipment: "", cutoffConfirmer: "", electrician: "", siteRepair: "" }], specialMeasures: "",
};

function Form4Fields({ form, onChange, workLatitude, workAddress, onOpenLocation, onClearLocation, taskName }: {
  form: Form4; onChange: (k: string, v: unknown) => void;
  workLatitude: number | null; workAddress: string; onOpenLocation: () => void; onClearLocation: () => void; taskName: string;
}) {
  const updateInsp = (idx: number, f: keyof InspectionItem, v: string) =>
    onChange("inspectionItems", form.inspectionItems.map((m, i) => i === idx ? { ...m, [f]: v } : m));
  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={1} title="기본정보" />
        <div className="space-y-3">
          <FormInput label="신청일" required>
            <input type="date" value={form.requestDate} onChange={e => onChange("requestDate", e.target.value)} className={inputClass} />
          </FormInput>
          <WorkPeriodField
            startDate={form.workStartDate} endDate={form.workEndDate}
            startTime={form.workStartTime} endTime={form.workEndTime}
            onChangeStartDate={v => onChange("workStartDate", v)}
            onChangeEndDate={v => onChange("workEndDate", v)}
            onChangeStartTime={v => onChange("workStartTime", v)}
            onChangeEndTime={v => onChange("workEndTime", v)}
          />
          <FormInput label="용역명"><input type="text" value={taskName} readOnly className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-600" /></FormInput>
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
          <FormInput label="출입자 명단"><textarea value={form.entryList} onChange={e => onChange("entryList", e.target.value)} rows={2} className={textareaClass} /></FormInput>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader num={2} title="허가 조건" />
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-2">밀폐공간출입 허가 필요여부</label>
            <div className="flex gap-4">{["필요", "불필요"].map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="needConfinedSpace4" value={opt} checked={form.needConfinedSpace === opt} onChange={() => onChange("needConfinedSpace", opt)} className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-2">화기작업 허가 필요여부</label>
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
        <SectionHeader num={3} title="안전조치 요구사항" />
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
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
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

// 기존 workDate 단일 값을 workStartDate/workEndDate로 마이그레이션
function migrateFormData(fd: Record<string, unknown>): Record<string, unknown> {
  const result = { ...fd };
  if (fd.workDate && !fd.workStartDate) {
    result.workStartDate = fd.workDate;
    result.workEndDate = fd.workDate;
  }
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
        const dtype: string = doc.documentType;
        setDocumentType(dtype);
        const rawFd: Record<string, unknown> = doc.formDataJson ?? {};
        // 기존 workDate → workStartDate/workEndDate 마이그레이션
        const fd = migrateFormData(rawFd);
        if (Object.keys(fd).length > 0) {
          if (dtype === "SAFETY_WORK_PERMIT") setForm1(p => ({ ...p, ...fd } as Form1));
          else if (dtype === "CONFINED_SPACE") setForm2(p => ({ ...p, ...fd } as Form2));
          else if (dtype === "HOLIDAY_WORK")   setForm3(p => ({ ...p, ...fd } as Form3));
          else if (dtype === "POWER_OUTAGE")   setForm4(p => ({ ...p, ...fd } as Form4));
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
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const formDataJson = buildFormData(documentType, form1, form2, form3, form4);
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formDataJson, workLatitude: lat, workLongitude: lng, workAddress: addr }),
      });
      const now = new Date();
      setLastSaved(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")} 저장됨`);
    }, 300);
  };

  const info = DOC_TYPE_INFO[documentType] ?? DOC_TYPE_INFO.SAFETY_WORK_PERMIT;
  const locProps = { workLatitude, workAddress, onOpenLocation: () => setShowLocationPicker(true), onClearLocation: () => { setWorkLatitude(null); setWorkLongitude(null); setWorkAddress(""); } };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1,2,3].map(i => (<div key={i} className="bg-white rounded-2xl p-4 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/3 mb-3" /><div className="h-10 bg-gray-100 rounded w-full" /></div>))}
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
        {documentType === "SAFETY_WORK_PERMIT" && <Form1Fields form={form1} onChange={handleChange1} {...locProps} taskName={taskName} />}
        {documentType === "CONFINED_SPACE"     && <Form2Fields form={form2} onChange={handleChange2} {...locProps} taskName={taskName} />}
        {documentType === "HOLIDAY_WORK"       && <Form3Fields form={form3} onChange={handleChange3} {...locProps} taskName={taskName} />}
        {documentType === "POWER_OUTAGE"       && <Form4Fields form={form4} onChange={handleChange4} {...locProps} taskName={taskName} />}
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
      {showPrev && <PrevDocsModal documentId={documentId} onSelect={(fd) => {
        const migrated = migrateFormData(fd);
        if (documentType === "SAFETY_WORK_PERMIT") setForm1(p => ({ ...p, ...migrated } as Form1));
        else if (documentType === "CONFINED_SPACE") setForm2(p => ({ ...p, ...migrated } as Form2));
        else if (documentType === "HOLIDAY_WORK")   setForm3(p => ({ ...p, ...migrated } as Form3));
        else if (documentType === "POWER_OUTAGE")   setForm4(p => ({ ...p, ...migrated } as Form4));
      }} onClose={() => setShowPrev(false)} />}
      {showLocationPicker && <LocationPickerModal initialAddress={workAddress} initialLat={workLatitude} initialLng={workLongitude} onConfirm={handleLocationConfirm} onClose={() => setShowLocationPicker(false)} />}
      {showApproval && <ApprovalSignModal documentId={documentId} documentType={documentType} onClose={() => setShowApproval(false)} onSubmitted={() => { setShowApproval(false); alert("제출이 완료되었습니다. 결재자에게 알림이 전송됩니다."); router.push(`/tasks/${taskId}`); }} />}
    </div>
  );
}
